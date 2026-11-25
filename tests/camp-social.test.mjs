import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "../vendor/three.module.min.js";
import { createOdieBehavior, odieActionPose, odieCommands } from "../src/clearing/odie-actions.js";
import { campGreeting, interview } from "../src/clearing/camp-dialogue.js";
test("Odie tricks remain finite and crouching returns smoothly to walking height", () => {
  for (const name of odieCommands) {
    let previous = odieActionPose(name, 0);
    for (let age = 0.02; age <= 5; age += 0.02) {
      const pose = odieActionPose(name, age);
      assert(Object.values(pose).every(Number.isFinite));
      assert(Math.abs(pose.crouch - previous.crouch) < 0.07);
      previous = pose;
    }
    assert(Math.abs(odieActionPose(name, 5).crouch) < 0.001);
  }
  assert.equal(odieActionPose("spin", 4).yaw, 2 * Math.PI);
  assert.equal(odieActionPose("roll over", 4).roll, 2 * Math.PI);
});
function createTestDog() {
  const world = new THREE.Group(),
    dog = new THREE.Group(),
    dogBody = new THREE.Group(),
    dogHead = new THREE.Group(),
    dogTail = new THREE.Group(),
    treat = new THREE.Group();
  world.add(dog, treat);
  dog.add(dogBody);
  dogBody.add(dogHead, dogTail);
  const odie = createOdieBehavior(world, {
    dog, dogBody, dogHead, dogTail, legs: [], treat,
  });
  return { world, odie, dog, dogHead, dogTail, treat };
}

test("a visible biscuit leads Odie to the food even when ambient motion is paused", () => {
  const { world, odie, dog, dogHead, treat } = createTestDog();
  const initialDog = dog.position.clone();
  const camera = new THREE.PerspectiveCamera(62, 1, 0.08, 200);
  camera.position.set(2.1, 1.7, 6.9);
  camera.lookAt(dog.position.x, 0.65, dog.position.z);
  world.userData.visitorPosition = camera.position;

  assert(odie.offerTreat(camera));
  assert(treat.visible);
  assert(treat.position.distanceTo(camera.position) < 0.9);
  const initialTreat = treat.position.clone();
  let followed = false, ate = false;
  for (let frame = 0; frame < 180; frame++) {
    odie.update(0, 1 / 60);
    if (treat.visible && treat.position.distanceTo(initialTreat) > 0.4 && dog.position.distanceTo(initialDog) > 0.3)
      followed = true;
    if (treat.visible && dogHead.rotation.x > 0.7 && treat.scale.x < 0.6)
      ate = true;
  }
  assert(followed, "Odie moves toward the biscuit as it leaves the visitor");
  assert(ate, "Odie lowers his head and eats the biscuit");
  assert(!treat.visible);
  assert(dog.position.distanceTo(initialDog) < 0.03, "Odie returns to his patrol");
});
test("Odie eases from a run to a walk and dips his head to release the ball", () => {
  const { world, odie, dog, dogHead } = createTestDog();
  const drop = new THREE.Vector3(8.4, 0, dog.position.z);
  world.userData.dogAction = {
    target: drop,
    lookAt: drop,
    stopDistance: 0.65,
    speed: 2.85,
    approachDistance: 1.8,
  };
  const step = 1 / 60;
  let peakSpeed = 0, walkingSpeedNearDrop = 0;
  for (let frame = 0; frame < 300; frame++) {
    const start = dog.position.x;
    odie.update(0, step);
    const speed = (dog.position.x - start) / step;
    if (frame === 0) assert(speed > 0 && speed < 0.15);
    peakSpeed = Math.max(peakSpeed, speed);
    if (drop.x - dog.position.x < 0.83)
      walkingSpeedNearDrop = Math.max(walkingSpeedNearDrop, speed);
  }
  assert(peakSpeed > 2.4);
  assert(walkingSpeedNearDrop > 0.4 && walkingSpeedNearDrop < 0.85);
  assert(Math.abs(drop.x - dog.position.x - 0.65) < 0.01);
  const arrival = dog.position.x;
  world.userData.dogAction = { lookAt: drop, drop: true };
  for (let frame = 0; frame < 30; frame++) odie.update(0, step);
  assert.equal(dog.position.x, arrival);
  assert(dogHead.rotation.x > 0.65);
});

test("a held ball makes Odie wag without interrupting his position", () => {
  const { world, odie, dog, dogTail } = createTestDog();
  const start = dog.position.clone();
  world.userData.dogBallInterest = {
    target: new THREE.Vector3(0, 1.5, 7),
    level: 0.58,
  };
  const angles = [];
  for (let frame = 0; frame < 60; frame++) {
    odie.update(0, 1 / 60);
    angles.push(dogTail.rotation.y);
  }
  assert(Math.min(...angles) < -0.5 && Math.max(...angles) > 0.5);
  assert(dog.position.distanceTo(start) < 0.001);
  world.userData.dogBallInterest = null;
  for (let frame = 0; frame < 60; frame++) odie.update(0, 1 / 60);
  assert(Math.abs(dogTail.rotation.y) < 0.02);
});

test("Paul greets with stars only at night and frozen pond only in winter", () => {
  for (const season of ["winter", "spring", "summer", "autumn"])
    for (let hour = 6; hour < 19; hour++)
      for (let i = 0; i < 7; i++) {
        const text = campGreeting(hour, season, i);
        assert(!/aurora|shooting star/i.test(text));
        if (season !== "winter") assert(!/frozen|scarf/.test(text));
      }
  assert.match(campGreeting(23, "winter", 5), /aurora/);
  assert.equal(Object.keys(interview).length, 6);
});
