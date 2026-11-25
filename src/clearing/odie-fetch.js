import * as THREE from "../../vendor/three.module.min.js";
import { isInsideCabin } from "./cabin.js";
import {
  fetchBallRadius,
  findFetchDrop,
  planFetchRoute,
  planFetchThrow,
} from "./fetch-terrain.js";

const startingSpot = new THREE.Vector3(-0.72, fetchBallRadius, 4.4);
const ballRange = 3.25;

export function createOdieFetch(scene, camera, audio, notify, onPaulHit) {
  const ball = new THREE.Group();
  ball.name = "Odie’s ball";
  const rubber = new THREE.MeshStandardMaterial({
    color: 0xef6337,
    emissive: 0xa72d12,
    emissiveIntensity: 0.25,
    roughness: 0.8,
    flatShading: true,
  });
  const stripe = new THREE.MeshStandardMaterial({ color: 0xffe093 });
  ball.add(new THREE.Mesh(
    new THREE.IcosahedronGeometry(fetchBallRadius, 1),
    rubber,
  ));
  for (const angle of [-0.52, 0.52]) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(fetchBallRadius * 0.895, 0.006, 4, 14),
      stripe,
    );
    ring.position.y = Math.sin(angle) * fetchBallRadius * 0.87;
    ring.rotation.x = Math.PI / 2;
    ball.add(ring);
  }
  ball.rotation.set(0.24, 0, 0.45);
  ball.position.copy(startingSpot);
  scene.add(ball);

  const forward = new THREE.Vector3();
  const handheld = new THREE.Vector3();
  const launch = new THREE.Vector3();
  const launchOffset = new THREE.Vector3();
  const mouth = new THREE.Vector3();
  const dropStart = new THREE.Vector3();
  const pickupPoint = new THREE.Vector3();
  const player = new THREE.Vector3();
  const playerView = new THREE.Vector3();
  const projected = new THREE.Vector3();
  let world, flight, delivery, deliveryFrom, attentionSpot, attentionFrom;
  let state = "unintroduced";
  let heldFor = 0,
    flightAge = 0,
    barkIn = 0,
    barkHop = 0,
    lookingForDelivery = 0,
    phaseAge = 0,
    departureDelay = 0;
  let attentive = false;
  const isGrounded = () => state === "unintroduced" || state === "ground";
  const isFetching = () => !isGrounded() && state !== "held";
  const interest = { target: ball.position, level: 0 };

  function clearDog() {
    if (world) {
      world.userData.dogAction = null;
      world.userData.dogBallInterest = null;
    }
    departureDelay = 0;
    attentive = false;
  }
  function recruitDog() {
    world.userData.cancelDogTreat();
    world.userData.dogCommand = null;
  }
  function setState(next) {
    state = next;
    phaseAge = 0;
    const held = next === "held";
    if (held) heldFor = 0;
    ball.scale.setScalar(held ? 0.75 : 1);
    rubber.depthTest = stripe.depthTest = !held;
    ball.children.forEach((part) => (part.renderOrder = held ? 3 : 0));
  }
  function putOnGround(point) {
    setState("ground");
    ball.position.copy(point);
    ball.position.y += fetchBallRadius;
    ball.rotation.set(0.24, 0, 0.45);
  }
  function holdBall() {
    if (!departureDelay) clearDog();
    setState("held");
    updateHandheld();
  }
  function updateHandheld() {
    const halfHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 0.88;
    const lift = THREE.MathUtils.smoothstep(heldFor, 0, 0.25);
    const handHeight = camera.aspect < 0.75 ? -0.34 : -0.61;
    handheld.set(
      halfHeight * camera.aspect * 0.48,
      halfHeight * THREE.MathUtils.lerp(-1.36, handHeight, lift),
      -0.88,
    );
    ball.position.copy(camera.localToWorld(handheld));
    ball.quaternion.copy(camera.quaternion);
    ball.rotateZ(0.35);
  }
  function targetDog(target, speed, stopDistance, approachDistance) {
    world.userData.dogAction = {
      target, lookAt: target, speed, stopDistance, approachDistance,
    };
  }
  function dogDistance(point) {
    const dog = world.userData.dog.position;
    return Math.hypot(dog.x - point.x, dog.z - point.z);
  }
  function accessible(playerPosition, viewDirection) {
    return findFetchDrop(playerPosition, viewDirection, world, {
      keepInsideCamp: false,
    });
  }
  function getCurrentDrop() {
    return accessible(camera.position, camera.getWorldDirection(forward));
  }
  function newBall() {
    holdBall();
    notify("Looks like this ball got away, Odie. Here’s a new one.");
  }
  function startReturn() {
    setState("returning");
    delivery = deliveryFrom = null;
    lookingForDelivery = 0;
  }

  return {
    get held() {
      return state === "held";
    },
    get busy() {
      return isFetching();
    },
    cancelAttention() {
      if (attentive) clearDog();
    },
    groundAction() {
      if (!isGrounded()) return null;
      const { x, y, z } = ball.position;
      if (Math.hypot(x - camera.position.x, z - camera.position.z) >= ballRange) return null;
      if (isInsideCabin(camera.position) !== isInsideCabin({ x, y: 1.7, z })) return null;
      projected.copy(ball.position).project(camera);
      if (
        Math.abs(projected.x) > 1 || Math.abs(projected.y) > 1 ||
        Math.abs(projected.z) > 1
      )
        return null;
      return {
        id: "ball",
        x,
        y,
        z,
        range: ballRange,
        label: state === "unintroduced" ? "Ask Odie to find the ball" : "Pick up ball",
      };
    },
    selectBall(askOdie = false) {
      if (!isGrounded()) return;
      if (state === "ground" && !askOdie) {
        holdBall();
        notify("");
      } else {
        if (!planFetchRoute(world.userData.dog.position, ball.position, world)) {
          notify("Odie needs a clear path to the ball.");
          return;
        }
        clearDog();
        recruitDog();
        notify("Odie, where’s the ball?");
        setState("chasing");
      }
    },
    squeak() {
      if (state !== "held") return;
      recruitDog();
      audio.event("ball-squeak");
      attentive = true;
      departureDelay = 0;
      barkIn = 0.8;
      barkHop = 0;
      attentionSpot = attentionFrom = null;
    },
    throwBall(power) {
      if (state !== "held") return;
      updateHandheld();
      camera.localToWorld(launch.set(0, -0.22, -0.76));
      const shot = planFetchThrow(launch, camera.getWorldDirection(forward), power, world, {
        playerPosition: camera.position,
      });
      if (shot.blocked) {
        notify("Throw it a little farther so Odie can run!");
        return;
      }
      recruitDog();
      clearDog();
      flight = shot;
      launchOffset.subVectors(ball.position, launch);
      if (!flight.lost && !planFetchRoute(world.userData.dog.position, flight.end, world))
        flight.lost = true;
      flightAge = 0;
      setState("flying");
      notify("");
    },
    drop() {
      if (state !== "held") return;
      const point = getCurrentDrop();
      if (!point) {
        notify("Move to a clear spot to put the ball down.");
        return;
      }
      clearDog();
      updateHandheld();
      dropStart.copy(ball.position);
      dropStart.y = Math.max(dropStart.y, point.y + fetchBallRadius);
      delivery = point;
      setState("dropping");
      notify("");
    },
    leave() {
      if (!world) return;
      clearDog();
      if (state === "held" || isFetching()) {
        const point = accessible(player, playerView);
        putOnGround(point || startingSpot.clone().setY(0));
      }
      flight = delivery = deliveryFrom = null;
    },
    update(activeWorld, dt, active) {
      if (activeWorld !== world) {
        clearDog();
        world = activeWorld;
        if (state === "returning") delivery = deliveryFrom = null;
      }
      if (!active) return;
      camera.updateMatrixWorld();
      player.copy(camera.position);
      camera.getWorldDirection(playerView);
      const data = world.userData;
      const dog = data.dog;
      phaseAge += dt;
      if (departureDelay > 0) {
        departureDelay = Math.max(0, departureDelay - dt);
        if (departureDelay === 0) data.dogAction = null;
      }

      if (state === "held") {
        heldFor += dt;
        updateHandheld();
        interest.level = attentive ? 1 : 0.64;
        data.dogBallInterest = interest;
        if (attentive) {
          if (!attentionFrom || player.distanceTo(attentionFrom) > 0.75) {
            attentionSpot = getCurrentDrop();
            attentionFrom = player.clone();
          }
          const place = attentionSpot || player;
          const stopDistance = attentionSpot ? 0.32 : 1.48;
          data.dogAction = {
            target: place,
            lookAt: ball.position,
            speed: 2.8,
            approachDistance: 1.25,
            stopDistance,
            sit: true,
          };
          if (dogDistance(place) < stopDistance + 0.15) {
            barkIn -= dt;
            if (barkIn <= 0) {
              audio.event("bark", dog.position);
              barkIn = 2.6 + Math.random() * 1.9;
              barkHop = 0.25;
            }
            barkHop = Math.max(0, barkHop - dt);
            data.dogAction.hop = Math.sin((barkHop / 0.25) * Math.PI) * 0.065;
          }
        }
        return;
      }
      if (state === "flying") {
        const previousAge = flightAge;
        flightAge += dt;
        const progress = Math.min(1, flightAge / flight.duration);
        flight.pointAt(progress, ball.position);
        ball.position.addScaledVector(launchOffset, Math.max(0, 1 - flightAge / 0.11));
        ball.rotateX(dt * (progress < 0.65 ? 11 : 4));
        ball.rotateZ(dt * 3);
        if (flight.paulAt !== undefined && previousAge <= flight.paulAt && flightAge > flight.paulAt)
          onPaulHit?.();
        data.dogAction = { lookAt: ball.position };
        if (progress === 1) {
          if (flight.lost) newBall();
          else setState("chasing");
          flight = null;
        }
        return;
      }
      if (state === "chasing") {
        targetDog(ball.position, 3.8, 0.7, 1.2);
        if (dogDistance(ball.position) < 0.73) {
          pickupPoint.copy(ball.position);
          data.dogAction = { lookAt: pickupPoint, pickup: true };
          setState("picking-up");
        }
        return;
      }
      if (state === "picking-up") {
        data.dogMouth.getWorldPosition(mouth);
        ball.position.lerpVectors(
          pickupPoint, mouth, THREE.MathUtils.smoothstep(phaseAge, 0.15, 0.45),
        );
        if (phaseAge >= 0.45) startReturn();
        return;
      }
      if (state === "setting-down") {
        data.dogMouth.getWorldPosition(mouth);
        ball.position.lerpVectors(
          mouth, dropStart, THREE.MathUtils.smoothstep(phaseAge, 0.27, 0.58),
        );
        if (phaseAge >= 0.58) {
          putOnGround(delivery);
          data.dogAction = { lookAt: player };
          departureDelay = 0.85;
          notify("Odie brought the ball back. Pick it up to throw it, or leave it there.");
        }
        return;
      }
      if (state === "dropping") {
        const fall = Math.min(1, phaseAge / 0.32);
        ball.position.lerpVectors(dropStart, delivery, fall);
        ball.position.y = THREE.MathUtils.lerp(dropStart.y, delivery.y + fetchBallRadius, fall * fall);
        const bounce = THREE.MathUtils.clamp((phaseAge - 0.32) / 0.22, 0, 1);
        ball.position.y += Math.sin(Math.PI * bounce) * 0.085;
        if (bounce === 1) putOnGround(delivery);
        return;
      }
      if (state !== "returning") return;
      data.dogMouth.getWorldPosition(ball.position);
      lookingForDelivery -= dt;
      if (lookingForDelivery <= 0 && (!delivery || player.distanceTo(deliveryFrom) > 0.75)) {
        delivery = getCurrentDrop();
        if (delivery && !planFetchRoute(dog.position, delivery, world)) delivery = null;
        if (!delivery && !deliveryFrom)
          notify("Come to a clear spot so Odie can bring you the ball.");
        deliveryFrom = player.clone();
        lookingForDelivery = 0.38;
      }
      if (!delivery) {
        data.dogAction = { lookAt: player };
        return;
      }
      targetDog(delivery, 2.85, 0.57, 1.8);
      if (dogDistance(delivery) < 0.59) {
        dropStart.copy(delivery);
        dropStart.y += fetchBallRadius;
        data.dogAction = { lookAt: delivery, drop: true };
        setState("setting-down");
      }
    },
    dispose() {
      clearDog();
      ball.removeFromParent();
      ball.children.forEach((part) => part.geometry.dispose());
      rubber.dispose();
      stripe.dispose();
    },
  };
}
