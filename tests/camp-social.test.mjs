import test from "node:test";
import assert from "node:assert/strict";
import { odieActionPose, odieCommands } from "../odie-actions.js";
import { campGreeting, interview } from "../camp-dialogue.js";
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
