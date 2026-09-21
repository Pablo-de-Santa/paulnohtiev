import { test } from "node:test";
import assert from "node:assert/strict";
import { localHour, daylightAt } from "../clearing-life.js";
import { cabinWalkable, cabinFloor, doorPanelBlocks } from "../cabin.js";
test("local clock fallback is noon and daylight varies continuously", () => {
  assert.equal(localHour(new Date("invalid")), 12);
  assert.equal(localHour(new Date(2026, 8, 20, 8, 30)), 8.5);
  assert(daylightAt(12) > 0.99);
  assert(daylightAt(0) < 0.01);
  for (let h = 0; h < 24; h += 0.02)
    assert(Math.abs(daylightAt(h + 0.02) - daylightAt(h)) < 0.02);
});
test("open door gives a continuous route up steps into cabin; walls and desk block movement", () => {
  for (let z = -1.1; z > -5.8; z -= 0.025)
    assert(cabinWalkable(5.8, z, true), `blocked z ${z}`);
  assert(!cabinWalkable(5.8, -3.3, false));
  assert(!cabinWalkable(3.4, -5, true));
  assert(!cabinWalkable(6, -6.8, true));
  assert.equal(cabinFloor(5.8, -1.1), 0);
  assert.equal(cabinFloor(5.8, -4), 0.6);
});

test("door panel blocks its closed and swung positions but clears the open passage", () => {
  assert(doorPanelBlocks(5.8, -3.31, 0));
  assert(doorPanelBlocks(5.14, -2.6, -Math.PI / 2));
  assert(!doorPanelBlocks(5.8, -3.31, -Math.PI / 2));
  assert(!doorPanelBlocks(5.8, -5.1, -Math.PI / 2));
  for (let a = 0; a > -1.65; a -= 0.1)
    assert(
      doorPanelBlocks(5.14 + Math.cos(a) * 0.65, -3.31 - Math.sin(a) * 0.65, a),
    );
});

test("indoor actions exclude porch, all exterior walls and above the cabin", async () => {
  const { isInsideCabin } = await import("../cabin.js");
  assert(isInsideCabin({ x: 5.8, y: 2.3, z: -5.1 }));
  for (const p of [
    { x: 5.8, y: 1.7, z: -3.2 },
    { x: 6.2, y: 1.7, z: -8 },
    { x: 3, y: 1.7, z: -5 },
    { x: 8.6, y: 1.7, z: -5 },
    { x: 5.8, y: 5, z: -5 },
  ])
    assert(!isInsideCabin(p));
});
