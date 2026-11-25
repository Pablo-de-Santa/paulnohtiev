import * as THREE from "../../vendor/three.module.min.js";
import { cabinFloor, cabinWalkable, doorPanelBlocks, isInsideCabin } from "./cabin.js";
import { pondContains, seatedPosition } from "./clearing-layout.js";

export const fetchBallRadius = 0.135;

// Odie can visit the first strip of woodland past the player's clearing.
const fetchBounds = { left: -17, right: 17, back: -15, front: 17 };
const playerBounds = { left: -11, right: 11, back: -9, front: 11 };
const dogClearance = 0.22;
const gridStep = 0.4;
const routeColumns = 1 + Math.round((fetchBounds.right - fetchBounds.left) / gridStep);
const routeRows = 1 + Math.round((fetchBounds.front - fetchBounds.back) / gridStep);
const surroundings = new WeakMap();

function within(x, z, bounds) {
  return (
    x >= bounds.left &&
    x <= bounds.right &&
    z >= bounds.back &&
    z <= bounds.front
  );
}

export function fetchGroundAt(x, z) {
  return cabinFloor(x, z);
}

function groundPoint(x, z) {
  return new THREE.Vector3(x, fetchGroundAt(x, z), z);
}

function obstacleCells(obstacles) {
  if (!obstacles) return new Map();
  const existing = surroundings.get(obstacles);
  if (existing) return existing;
  const cells = new Map();
  for (const obstacle of obstacles) {
    const { x, z, radius } = obstacle;
    const reach = radius + dogClearance;
    const firstCol = Math.floor((x - reach) / 2);
    const firstRow = Math.floor((z - reach) / 2);
    const lastCol = Math.floor((x + reach) / 2);
    const lastRow = Math.floor((z + reach) / 2);
    for (let col = firstCol; col <= lastCol; col++)
      for (let row = firstRow; row <= lastRow; row++) {
        const key = `${col}:${row}`;
        if (!cells.has(key)) cells.set(key, []);
        cells.get(key).push(obstacle);
      }
  }
  surroundings.set(obstacles, cells);
  return cells;
}

function dogNavigation(world) {
  const cells = obstacleCells(world?.userData?.treeObstacles);
  const door = world?.userData?.cabin?.userData;
  const clearOfCabin = (x, z) =>
    cabinWalkable(x, z, door?.doorOpen) && !doorPanelBlocks(x, z, door?.doorAngle);
  return (x, z) => {
    if (!within(x, z, fetchBounds) || pondContains(x, z, dogClearance + 0.1))
      return false;
    if (
      Math.hypot(x - 4.1, z - 2.8) < 1.12 ||
      Math.hypot(x - seatedPosition.x, z - seatedPosition.z) < 0.76
    )
      return false;
    const obstacles = cells.get(`${Math.floor(x / 2)}:${Math.floor(z / 2)}`);
    if (
      obstacles?.some((item) =>
        Math.hypot(x - item.x, z - item.z) < item.radius + dogClearance
      )
    )
      return false;
    return (
      clearOfCabin(x, z) &&
      clearOfCabin(x - dogClearance, z) &&
      clearOfCabin(x + dogClearance, z) &&
      clearOfCabin(x, z - dogClearance) &&
      clearOfCabin(x, z + dogClearance)
    );
  };
}

function lineClear(start, end, standable) {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const samples = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.16));
  for (let index = 1; index <= samples; index++) {
    const ratio = index / samples;
    if (!standable(start.x + dx * ratio, start.z + dz * ratio)) return false;
  }
  return true;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

export function planFetchRoute(start, target, world) {
  const standable = dogNavigation(world);
  const goal = groundPoint(target.x, target.z);
  if (!standable(goal.x, goal.z)) return null;
  if (lineClear(start, goal, standable)) return [goal];

  const grid = new Map();
  function cell(col, row) {
    if (col < 0 || col >= routeColumns || row < 0 || row >= routeRows) return null;
    const key = row * routeColumns + col;
    if (!grid.has(key)) {
      const x = fetchBounds.left + col * gridStep;
      const z = fetchBounds.back + row * gridStep;
      grid.set(key, standable(x, z) ? { col, row, x, z, cost: Infinity } : null);
    }
    return grid.get(key);
  }
  function anchor(point) {
    const col = Math.round((point.x - fetchBounds.left) / gridStep);
    const row = Math.round((point.z - fetchBounds.back) / gridStep);
    let closest = null;
    let bestDistance = Infinity;
    for (let x = col - 2; x <= col + 2; x++)
      for (let z = row - 2; z <= row + 2; z++) {
        const candidate = cell(x, z);
        if (!candidate) continue;
        const gap = distance(point, candidate);
        if (gap < bestDistance && lineClear(point, candidate, standable)) {
          closest = candidate;
          bestDistance = gap;
        }
      }
    return closest;
  }

  const first = anchor(start);
  const last = anchor(goal);
  if (!first || !last) return null;
  first.cost = 0;
  first.estimate = distance(first, last);
  const pending = new Set([first]);
  while (pending.size) {
    let current = null;
    for (const node of pending)
      if (!current || node.estimate < current.estimate) current = node;
    if (current === last) break;
    pending.delete(current);
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++) {
        const next = cell(current.col + dx, current.row + dz);
        if (!next || next === current) continue;
        const cost = current.cost + distance(current, next);
        if (cost >= next.cost || !lineClear(current, next, standable)) continue;
        next.cost = cost;
        next.estimate = cost + distance(next, last);
        next.previous = current;
        pending.add(next);
      }
  }
  if (!pending.size) return null;

  const path = [];
  for (let node = last; node; node = node.previous) path.push(node);
  path.reverse().push(goal);
  const waypoints = [];
  let current = start;
  for (let index = 0; index < path.length; ) {
    let next = path.length - 1;
    while (next > index && !lineClear(current, path[next], standable)) next--;
    current = path[next];
    waypoints.push(groundPoint(current.x, current.z));
    index = next + 1;
  }
  return waypoints;
}

export function findFetchDrop(
  playerPosition,
  viewDirection,
  world,
  { keepInsideCamp = true } = {},
) {
  const standable = dogNavigation(world);
  const bounds = keepInsideCamp ? playerBounds : fetchBounds;
  const inside = isInsideCabin(playerPosition);
  const aim = Math.atan2(viewDirection.x, viewDirection.z);
  const offsets = [0, 0.52, -0.52, 1.05, -1.05, 1.57, -1.57, 2.35, -2.35, Math.PI];
  for (const offset of offsets)
    for (const reach of [1.4, 0.9, 0.5]) {
      const x = playerPosition.x + Math.sin(aim + offset) * reach;
      const z = playerPosition.z + Math.cos(aim + offset) * reach;
      if (isInsideCabin({ x, y: 1.7, z }) !== inside) continue;
      if (within(x, z, bounds) && lineClear(playerPosition, { x, z }, standable))
        return groundPoint(x, z);
    }
  const { x, z } = playerPosition;
  return within(x, z, bounds) && standable(x, z) ? groundPoint(x, z) : null;
}

function cabinCollisionTest(world, sideways) {
  const cabin = world?.userData?.cabin;
  if (!cabin) return () => null;
  cabin.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(cabin).expandByScalar(fetchBallRadius);
  const colliders = [];
  cabin.traverseVisible((object) => {
    if (object.isMesh) colliders.push(object);
  });
  const lateral = sideways.clone().multiplyScalar(fetchBallRadius);
  const offsets = [
    new THREE.Vector3(),
    new THREE.Vector3(0, fetchBallRadius, 0),
    new THREE.Vector3(0, -fetchBallRadius, 0),
    lateral,
    lateral.clone().negate(),
  ];
  const direction = new THREE.Vector3();
  const ray = new THREE.Raycaster();
  const segment = new THREE.Box3();
  const intersections = [];
  return (start, end) => {
    segment.setFromPoints([start, end]);
    if (!segment.intersectsBox(bounds)) return null;
    direction.subVectors(end, start);
    const length = direction.length();
    if (!length) return null;
    ray.ray.direction.copy(direction).divideScalar(length);
    ray.far = length;
    let impact = null;
    for (const offset of offsets) {
      ray.ray.origin.copy(start).add(offset);
      intersections.length = 0;
      ray.intersectObjects(colliders, false, intersections);
      const hit = intersections[0];
      if (hit && (!impact || hit.distance < impact.distance)) impact = hit;
    }
    return impact ? { fraction: impact.distance / length, height: impact.point.y } : null;
  };
}

const gravity = 13.5;

function flightPoint({ start, velocity }, time, output = new THREE.Vector3()) {
  output.copy(start).addScaledVector(velocity, time);
  output.y -= (gravity * time ** 2) / 2;
  return output;
}

function assembleFlight(legs, end, lost, paulAt) {
  const duration = legs.reduce((total, leg) => total + leg.duration, 0);
  return {
    end,
    duration,
    lost,
    paulAt,
    pointAt(progress, output = new THREE.Vector3()) {
      if (progress >= 1) return output.copy(end);
      let time = Math.max(0, progress) * duration;
      for (const leg of legs) {
        if (time <= leg.duration) return flightPoint(leg, time, output);
        time -= leg.duration;
      }
      return output.copy(end);
    },
  };
}

function actorBounds(world) {
  const { dog, person } = world?.userData || {};
  const dogBox = dog && new THREE.Box3().setFromObject(dog).expandByScalar(fetchBallRadius);
  // Paul's portrait has transparent pixels around the head and shoulders.
  const paulBox = person && new THREE.Box3(
    new THREE.Vector3(-0.52, 0.2, -0.2),
    new THREE.Vector3(0.52, 2.27, 0.2),
  ).translate(person.getWorldPosition(new THREE.Vector3())).expandByScalar(fetchBallRadius);
  return { dogBox, paulBox };
}

export function planFetchThrow(origin, direction, power, world, { playerPosition } = {}) {
  const aim = new THREE.Vector3().copy(direction).normalize();
  const forward = new THREE.Vector3(aim.x, 0, aim.z);
  if (!forward.lengthSq()) forward.z = -1;
  forward.normalize();
  const { dogBox, paulBox } = actorBounds(world);
  const actorRay = new THREE.Ray();
  const actorHit = new THREE.Vector3();
  const blocked = { blocked: true };
  const cabinHit = cabinCollisionTest(world, new THREE.Vector3(-forward.z, 0, forward.x));
  if (dogBox && playerPosition) {
    actorRay.set(playerPosition, aim);
    const dogAim = actorRay.intersectBox(dogBox, new THREE.Vector3());
    if (dogAim && playerPosition.distanceTo(dogAim) < 22) {
      const paulAim = paulBox && actorRay.intersectBox(paulBox, actorHit);
      const paulIsCloser = paulAim && playerPosition.distanceToSquared(paulAim) <
        playerPosition.distanceToSquared(dogAim);
      if (!paulIsCloser && !cabinHit(playerPosition, dogAim)) return blocked;
    }
  }
  const elevation = THREE.MathUtils.clamp(0.31 + Math.asin(aim.y) * 0.86, -0.92, 1.26);
  const speed = THREE.MathUtils.lerp(4.2, 15.2, THREE.MathUtils.clamp(power, 0, 1));
  const velocity = forward.clone().multiplyScalar(Math.cos(elevation) * speed);
  velocity.y = Math.sin(elevation) * speed;

  const delta = new THREE.Vector3();
  function actorFraction(from, to, bounds) {
    if (!bounds) return Infinity;
    if (bounds.containsPoint(from)) return 0;
    delta.subVectors(to, from);
    const length = delta.length();
    if (!length) return Infinity;
    actorRay.set(from, delta.divideScalar(length));
    if (!actorRay.intersectBox(bounds, actorHit)) return Infinity;
    const fraction = from.distanceTo(actorHit) / length;
    return fraction <= 1 ? fraction : Infinity;
  }
  if (playerPosition) {
    const impact = cabinHit(playerPosition, origin);
    const dogContact = actorFraction(playerPosition, origin, dogBox);
    if (dogContact < (impact?.fraction ?? Infinity)) return blocked;
    if (impact) {
      const eye = new THREE.Vector3().copy(playerPosition);
      const end = new THREE.Vector3().lerpVectors(eye, origin, impact.fraction);
      return {
        end,
        duration: 0.12,
        lost: true,
        pointAt(progress, output = new THREE.Vector3()) {
          return output.lerpVectors(eye, end, THREE.MathUtils.clamp(progress, 0, 1));
        },
      };
    }
  }

  const standable = dogNavigation(world);
  const legs = [];
  let leg = { start: new THREE.Vector3().copy(origin), velocity };
  let groundBounces = 0;
  let totalTime = 0;
  let paulAt;
  const tick = 1 / 65;
  const before = new THREE.Vector3();
  const after = new THREE.Vector3();
  // Each contact starts a new arc with less energy. Cabin and inaccessible
  // terrain contacts end the shot, so they retain the replacement-ball behavior.
  for (let arc = 0; arc < 4; arc++) {
    before.copy(leg.start);
    for (let time = tick; time <= 4; time += tick) {
      flightPoint(leg, time, after);
      const impact = cabinHit(before, after);
      const ground = fetchGroundAt(after.x, after.z) + fetchBallRadius;
      const groundFraction = after.y <= ground
        ? THREE.MathUtils.clamp((before.y - ground) / (before.y - after.y || 1), 0, 1)
        : Infinity;
      const paulFraction = paulAt === undefined ? actorFraction(before, after, paulBox) : Infinity;
      const dogFraction = actorFraction(before, after, dogBox);
      const fraction = Math.min(groundFraction, impact?.fraction ?? Infinity, paulFraction, dogFraction);
      if (fraction === Infinity) {
        before.copy(after);
        continue;
      }
      if (fraction === dogFraction) return blocked;

      const contactTime = time - tick + tick * fraction;
      const end = flightPoint(leg, contactTime);
      leg.duration = contactTime;
      legs.push(leg);
      totalTime += contactTime;
      const verticalSpeed = leg.velocity.y - gravity * contactTime;
      if (fraction === paulFraction) {
        paulAt = totalTime;
        const rebound = leg.velocity.clone().multiplyScalar(-0.3);
        rebound.y = THREE.MathUtils.clamp(-verticalSpeed * 0.15, 0.1, 1.05);
        leg = { start: end, velocity: rebound };
        break;
      }

      const floor = fetchGroundAt(end.x, end.z);
      if (fraction === impact?.fraction) {
        const lost = impact.height > floor + 0.25 || !standable(end.x, end.z);
        return assembleFlight(legs, end, lost, paulAt);
      }
      end.y = floor + fetchBallRadius;
      if (!standable(end.x, end.z)) return assembleFlight(legs, end, true, paulAt);

      const bounceSpeed = -verticalSpeed * (groundBounces === 0 ? 0.43 : 0.4);
      if (groundBounces >= 2 || bounceSpeed < 0.7)
        return assembleFlight(legs, end, false, paulAt);
      const rebound = leg.velocity.clone().multiplyScalar(groundBounces === 0 ? 0.1 : 0.3);
      rebound.y = bounceSpeed;
      leg = { start: end, velocity: rebound };
      groundBounces++;
      break;
    }
  }
  throw new Error("Ball trajectory did not intersect the clearing");
}
