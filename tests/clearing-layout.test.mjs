import { test } from "node:test";
import assert from "node:assert/strict";
import { odiePose, pondContains, pathPoint } from "../clearing-layout.js";
test("entire Odie loop, including body clearance, stays on land and away from fire", () => {
  for (let t = 0; t < 30; t += 0.01) {
    const p = odiePose(t);
    assert(!pondContains(p.x, p.z, 0.65));
    assert(Math.hypot(p.x - 4.1, p.z - 2.8) > 1.9);
    assert(p.z > 4.1);
  }
});
test("walking path starts at the cabin stair center", () => {
  const p = pathPoint(0);
  assert.equal(p.x, 5.8);
  assert(Math.abs(p.z - (-5.3 + 3.85)) < 0.15);
});
