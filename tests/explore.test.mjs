import { test } from "node:test";
import assert from "node:assert/strict";
import { canWalkAt } from "../explore-controls.js";
test("walking stays in the clearing and outside pond, cabin walls, fire and trunks", () => {
  assert(canWalkAt(0, 7));
  assert(!canWalkAt(12, 7));
  assert(!canWalkAt(0, -10));
  assert(!canWalkAt(-7, 4.5));
  assert(canWalkAt(6, -5));
  assert(!canWalkAt(5.8, -3.3));
  assert(canWalkAt(5.8, -3.3, [], true));
  assert(!canWalkAt(3.4, -5, [], true));
  assert(!canWalkAt(6, -6.6, [], true));
  assert(!canWalkAt(4.1, 2.8));
  assert(!canWalkAt(1.5, -0.35));
  assert(!canWalkAt(2, 7, [{ x: 2, z: 7, radius: 0.5 }]));
  assert(canWalkAt(0, 7, [{ x: 2, z: 7, radius: 0.5 }]));
});
