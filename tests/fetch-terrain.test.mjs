import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "../vendor/three.module.min.js";
import { createCabin } from "../src/clearing/cabin.js";
import { pondContains } from "../src/clearing/clearing-layout.js";
import {
  fetchBallRadius,
  findFetchDrop,
  planFetchRoute,
  planFetchThrow,
} from "../src/clearing/fetch-terrain.js";

const point = (x, y, z) => new THREE.Vector3(x, y, z);

test("throws have bounded power and Odie can fetch beyond the clearing", () => {
  const hand = point(10, 1.4, 5);
  const direction = point(1, 0, 0);
  const short = planFetchThrow(hand, direction, 0);
  const medium = planFetchThrow(hand, direction, 0.5);
  const strong = planFetchThrow(hand, direction, 1);
  assert(short.end.x < medium.end.x && medium.end.x < strong.end.x);
  assert.deepEqual(planFetchThrow(hand, direction, 2).end, strong.end);
  assert(medium.end.x > 11);
  assert.equal(medium.end.y, fetchBallRadius);
  assert.equal(medium.lost, false);
  assert(planFetchRoute(point(2, 0, 5), medium.end));
  assert.equal(strong.lost, true);
  assert.equal(planFetchRoute(point(2, 0, 5), strong.end), null);
  assert.deepEqual(medium.pointAt(0), hand);
  assert.deepEqual(medium.pointAt(1), medium.end);
  const heights = Array.from({ length: 201 }, (_, i) => medium.pointAt(i / 200).y);
  const firstLanding = heights.findIndex((y, i) => y < 0.16 && heights[i + 2] > y);
  assert(firstLanding > 0);
  assert(Math.max(...heights.slice(firstLanding)) > fetchBallRadius + 0.16);
});

test("aiming at Odie keeps the ball in hand while a throw at Paul rebounds", () => {
  const world = new THREE.Group();
  const dog = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.98, 0.9));
  dog.position.set(0, 0.49, 2.7);
  world.add(dog);
  world.userData.dog = dog;
  const shotAtOdie = planFetchThrow(point(0, 1.35, 5.2), point(0, -0.3, -1), 0.3, world, {
    playerPosition: point(0, 1.7, 6),
  });
  assert.equal(shotAtOdie.blocked, true);

  const paul = new THREE.Group();
  paul.position.set(1.5, 0, -0.6);
  world.add(paul);
  world.userData.person = paul;
  const shotAtPaul = planFetchThrow(point(1.5, 1.48, 1.94), point(0, 0, -1), 0.24, world);
  assert(shotAtPaul.paulAt > 0);
  const impact = shotAtPaul.pointAt(shotAtPaul.paulAt / shotAtPaul.duration);
  assert(shotAtPaul.end.z > impact.z);
  assert.equal(shotAtPaul.lost, false);
});

test("Odie routes around the pond and brings the ball to the visitor's side", () => {
  let start = point(0, 0, 5);
  const goal = point(-13, 0, 5);
  const route = planFetchRoute(start, goal);
  assert(route?.length > 1);
  assert.deepEqual(route.at(-1), goal);
  for (const destination of route) {
    for (let amount = 0; amount < 1; amount += 0.02) {
      const sample = start.clone().lerp(destination, amount);
      assert.equal(pondContains(sample.x, sample.z), false);
    }
    start = destination;
  }
  assert.equal(planFetchThrow(point(-7, 1.4, 9), point(0, 0, -1), 0.1).lost, true);
  const visitor = point(10.9, 1.7, 5);
  const direction = point(1, 0, 0);
  const inside = findFetchDrop(visitor, direction);
  const inView = findFetchDrop(visitor, direction, null, { keepInsideCamp: false });
  assert(inside.x <= 11);
  assert(inView.x > 11 && inView.distanceTo(point(visitor.x, 0, visitor.z)) < 1.41);
});

test("throws hit the cabin's real roof and a wall in front of the visitor", (t) => {
  const originalDocument = globalThis.document;
  const context = new Proxy({}, { get: () => () => {} });
  globalThis.document = { createElement: () => ({ getContext: () => context }) };
  t.after(() => {
    globalThis.document = originalDocument;
  });
  const world = new THREE.Group();
  const cabin = createCabin(false);
  world.add(cabin);
  world.userData.cabin = cabin;

  const roof = planFetchThrow(point(5.8, 1.4, 7), point(0, 0.75, -1), 0.95, world);
  assert.equal(roof.lost, true);
  assert(roof.end.y > 5.3 && roof.end.z < -3.3 && roof.end.z > -7.7);
  assert.deepEqual(roof.pointAt(1), roof.end);

  const outside = point(5.8, 1.7, -2.9);
  const behindDoor = point(5.8, 1.4, -3.8);
  const clipped = planFetchThrow(behindDoor, point(0, 0, -1), 0.6, world, {
    playerPosition: outside,
  });
  assert.equal(clipped.lost, true);
  assert(clipped.end.z < outside.z && clipped.end.z > behindDoor.z);
});
