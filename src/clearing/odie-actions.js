import * as THREE from "../../vendor/three.module.min.js";
import { odiePose } from "./clearing-layout.js";
import { fetchGroundAt, findFetchDrop, planFetchRoute } from "./fetch-terrain.js";

export const odieCommands = [
  "sit",
  "lie down",
  "speak",
  "roll over",
  "spin",
  "treat",
];
// Smooth entry/exit envelopes keep tricks independent from the walking clock.
export function odieActionPose(command, age, duration = 5) {
  const smooth = (v) => {
    const x = Math.max(0, Math.min(1, v));
    return x * x * (3 - 2 * x);
  };
  const blend = smooth(age / 0.5) * smooth((duration - age) / 0.6);
  const cycle = smooth((age - 0.6) / 2.5);
  return {
    crouch:
      (command === "sit"
        ? 0.28
        : ["lie down", "roll over"].includes(command)
          ? 0.55
          : 0) * blend,
    roll: command === "roll over" ? cycle * Math.PI * 2 : 0,
    yaw: command === "spin" ? cycle * Math.PI * 2 : 0,
    hop:
      command === "speak" ? Math.max(0, Math.sin(age * 9)) * 0.07 * blend : 0,
    blend,
  };
}

const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const turnBetween = (from, to) =>
  Math.atan2(Math.sin(to - from), Math.cos(to - from));
const acceleration = 5.5;
const braking = 6.5;

export function createOdieBehavior(
  world,
  { dog, dogBody, dogHead, dogTail, legs, treat },
) {
  const initial = odiePose(0);
  dog.position.set(initial.x, initial.y, initial.z);
  dog.rotation.y = initial.yaw;
  const up = new THREE.Vector3(0, 1, 0);
  const handOffset = new THREE.Vector3(0, -0.19, -0.78);
  const patrolTarget = new THREE.Vector3();
  const biscuitHeight = 0.045;
  const handTime = 0.32,
    flightTime = 0.64,
    eatTime = 0.8;
  const eatDistance = 0.43;
  let food = null;
  let dogTime = 0,
    heading = initial.yaw,
    gait = 0,
    moveSpeed = 0,
    gaitSpeed = 0,
    tailPhase = 0,
    tailSwing = 0;
  let returnToPatrol = false,
    currentCommand = null,
    commandAge = 0;
  let route = null,
    waypointIndex = 0,
    routeGoal = null,
    routeDoorOpen = false,
    routeDelay = 0;

  function showTreatInHand(camera) {
    handOffset.x = -Math.min(0.28, camera.aspect * 0.22);
    camera.localToWorld(treat.position.copy(handOffset));
    camera.getWorldQuaternion(treat.quaternion);
    treat.rotateX(0.65);
  }

  function offerTreat(camera) {
    const forward = camera.getWorldDirection(new THREE.Vector3());
    for (const angle of [0, 0.7, -0.7, 1.4, -1.4]) {
      const direction = forward.clone().applyAxisAngle(up, angle);
      const point = findFetchDrop(camera.position, direction, world);
      if (!point || distance(dog.position, point) < 0.76) continue;
      if (!planFetchRoute(dog.position, point, world)) continue;
      showTreatInHand(camera);
      world.userData.dogCommand = null;
      food = { camera, point, origin: treat.position.clone(), age: 0, eating: null };
      treat.scale.setScalar(1);
      treat.visible = true;
      return true;
    }
    return false;
  }

  function cancelTreat() {
    food = null;
    treat.visible = false;
  }

  function updateTreat(step) {
    if (!food) return null;
    const { camera, point, origin } = food;
    const age = food.age;
    food.age += step;
    if (age < handTime) {
      showTreatInHand(camera);
      origin.copy(treat.position);
      return { lookAt: treat.position };
    }
    const flight = Math.min((age - handTime) / flightTime, 1);
    treat.position.lerpVectors(origin, point, flight);
    treat.position.y += Math.sin(flight * Math.PI) * 0.38 + flight * biscuitHeight;
    treat.rotation.set(Math.sin(flight * Math.PI) * 1.8, flight * 2, 0);
    if (flight === 1 && distance(dog.position, point) < eatDistance + 0.025)
      food.eating = (food.eating ?? 0) + step;
    if (food.eating !== null) {
      if (food.eating >= eatTime) {
        cancelTreat();
        return null;
      }
      treat.scale.setScalar(
        1 - THREE.MathUtils.smoothstep(food.eating, 0.34, 0.68),
      );
      return { lookAt: treat.position, eating: food.eating };
    }
    if (age > 10) {
      cancelTreat();
      return null;
    }
    return {
      target: point,
      lookAt: treat.position,
      speed: 2.65,
      stopDistance: eatDistance,
    };
  }

  function moveToward(target, speed, stopDistance, step, approachDistance = 0.65) {
    const remaining = distance(dog.position, target) - stopDistance;
    if (!step || remaining <= 0.001) return null;
    routeDelay -= step;
    const doorOpen = world.userData.cabin?.userData.doorOpen;
    if (
      !routeGoal ||
      doorOpen !== routeDoorOpen ||
      (routeDelay <= 0 &&
        (!route || waypointIndex >= route.length || distance(routeGoal, target) > 0.4))
    ) {
      route = planFetchRoute(dog.position, target, world);
      routeGoal = { x: target.x, z: target.z };
      routeDoorOpen = doorOpen;
      waypointIndex = 0;
      routeDelay = route ? 0.14 : 0.55;
    }
    const waypoint = route?.[waypointIndex];
    if (!waypoint) return null;
    const dx = waypoint.x - dog.position.x,
      dz = waypoint.z - dog.position.z;
    const leg = Math.hypot(dx, dz);
    if (leg < 0.001) {
      waypointIndex++;
      return null;
    }
    const direction = Math.atan2(dx, dz);
    const nextWaypoint = route[waypointIndex + 1];
    const turnSpeed =
      speed * Math.max(0.22, Math.cos(turnBetween(heading, direction) * 0.65));
    let targetSpeed = turnSpeed;
    if (nextWaypoint) {
      const following = Math.atan2(
        nextWaypoint.x - waypoint.x,
        nextWaypoint.z - waypoint.z,
      );
      const cornerSpeed =
        speed * Math.max(0.25, Math.cos(turnBetween(direction, following)));
      targetSpeed = Math.min(
        turnSpeed,
        Math.sqrt(cornerSpeed ** 2 + 2 * braking * leg),
      );
    } else {
      const blend = THREE.MathUtils.smoothstep(remaining, 0.14, approachDistance);
      const approachSpeed = THREE.MathUtils.lerp(Math.min(speed, 0.65), speed, blend);
      targetSpeed = Math.min(turnSpeed, approachSpeed, Math.sqrt(2 * braking * remaining));
    }
    moveSpeed = THREE.MathUtils.clamp(
      targetSpeed,
      moveSpeed - braking * step,
      moveSpeed + acceleration * step,
    );
    const stride = Math.min(leg, step * moveSpeed, nextWaypoint ? Infinity : remaining);
    if (leg - stride < 0.001) waypointIndex++;
    if (!stride) return null;
    dog.position.x += (dx / leg) * stride;
    dog.position.z += (dz / leg) * stride;
    return direction;
  }

  function update(ambientStep, step) {
    const { visitorPosition, dogMenu, dogCommand, dogAction, dogBallInterest } =
      world.userData;
    const treatAction = updateTreat(step);
    if (dogCommand !== currentCommand) {
      currentCommand = dogCommand;
      commandAge = 0;
    }
    const performing = dogCommand && commandAge < dogCommand.duration;
    const trick = performing
      ? odieActionPose(dogCommand.name, commandAge, dogCommand.duration)
      : null;
    commandAge += step;

    const action = dogMenu || performing
      ? { lookAt: visitorPosition }
      : treatAction || dogAction;
    const previousX = dog.position.x,
      previousZ = dog.position.z;
    let direction = heading,
      walking = false,
      crouch = trick?.crouch ?? 0;
    const stopDistance = action?.stopDistance ?? 0.25;
    if (action) {
      if (action.target) {
        const moved = moveToward(
          action.target,
          action.speed ?? 3.4,
          stopDistance,
          step,
          action.approachDistance,
        );
        if (moved !== null) {
          direction = moved;
          walking = true;
          returnToPatrol = true;
        }
      }
      if (
        action.sit &&
        (!action.target || distance(dog.position, action.target) <= stopDistance + 0.03)
      )
        crouch = 0.28;
      if (action.eating !== undefined) crouch = 0.22;
      const look = action.lookAt || action.target;
      if (look && !walking && distance(dog.position, look) > 0.015)
        direction = Math.atan2(look.x - dog.position.x, look.z - dog.position.z);
    } else if (returnToPatrol) {
      const patrol = odiePose(dogTime);
      if (distance(dog.position, patrol) <= 0.018) {
        returnToPatrol = false;
        routeGoal = null;
      } else {
        patrolTarget.set(patrol.x, 0, patrol.z);
        const moved = moveToward(patrolTarget, 1.7, 0, step);
        if (moved !== null) direction = moved;
        walking = moved !== null;
      }
    } else {
      const next = odiePose(dogTime + ambientStep);
      if (!visitorPosition || distance(visitorPosition, next) > 1) {
        dogTime += ambientStep;
        dog.position.x = next.x;
        dog.position.z = next.z;
        direction = next.yaw;
        walking = ambientStep > 0;
      }
    }

    if (!walking) moveSpeed = Math.max(0, moveSpeed - braking * step);
    const travel = Math.hypot(
      dog.position.x - previousX,
      dog.position.z - previousZ,
    );
    gait += travel * 7.8;
    gaitSpeed = THREE.MathUtils.damp(gaitSpeed, step ? travel / step : 0, 10, step);
    const strideBlend = Math.min(1, Math.sqrt(gaitSpeed / 2.8));
    const ground = fetchGroundAt(dog.position.x, dog.position.z);
    dog.position.y = ground +
      (1 - Math.cos(gait * 2)) * 0.026 * strideBlend +
      (trick?.hop ?? action?.hop ?? 0);
    heading += turnBetween(heading, direction) * (1 - Math.exp(-10 * step));
    dog.rotation.y = heading + (trick?.yaw ?? 0);
    dogBody.rotation.z = (trick?.roll ?? 0) + Math.sin(gait) * 0.042 * strideBlend;
    dog.scale.y = THREE.MathUtils.damp(dog.scale.y, 1 - crouch, 8, step);

    const ballLook = dogBallInterest?.target;
    const followsBall = !performing && ballLook && distance(dog.position, ballLook) < 9;
    const look = action?.lookAt || (followsBall ? ballLook : null);
    let nod = 0;
    if (action?.eating !== undefined) {
      nod = 0.92 + Math.sin(action.eating * 28) * 0.12;
    } else if (action?.pickup || action?.drop) {
      nod = action.pickup ? 0.82 : 0.72;
    } else if (Number.isFinite(look?.y) && (!walking || followsBall) && !performing) {
      const pitch = Math.atan2(
        look.y - dog.position.y - 0.7 * dog.scale.y,
        distance(dog.position, look),
      );
      nod = THREE.MathUtils.clamp(-pitch * 0.65, -0.55, 0.27);
    }
    dogHead.rotation.x = THREE.MathUtils.damp(dogHead.rotation.x, nod, 10, step);
    let glance = 0;
    if (followsBall && action?.eating === undefined && !action?.pickup && !action?.drop) {
      const aim = Math.atan2(ballLook.x - dog.position.x, ballLook.z - dog.position.z);
      glance = THREE.MathUtils.clamp(turnBetween(heading, aim), -0.5, 0.5);
    }
    dogHead.rotation.y = THREE.MathUtils.damp(dogHead.rotation.y, glance, 8, step);
    const legBlend = 1 - Math.exp(-18 * step);
    legs.forEach((leg, i) => {
      const offset = i === 0 || i === 3 ? 0 : Math.PI;
      const bend = i % 2 === 0 ? -crouch * 0.9 : crouch * 0.3;
      const swing = bend + Math.sin(gait + offset) * 0.46 * strideBlend;
      leg.rotation.x = THREE.MathUtils.lerp(leg.rotation.x, swing, legBlend);
    });
    if (dogTail) {
      const interest = dogBallInterest?.level ?? 0;
      tailPhase += (interest ? step : ambientStep) * (12 + interest * 10);
      const swing = interest ? 0.22 + interest * 0.74 : ambientStep ? 0.09 : 0;
      tailSwing = THREE.MathUtils.damp(tailSwing, swing, 7, step);
      dogTail.rotation.y = Math.sin(tailPhase) * tailSwing;
      dogTail.rotation.x = THREE.MathUtils.damp(dogTail.rotation.x, interest * 0.29, 6, step);
    }
  }

  return { offerTreat, cancelTreat, update };
}
