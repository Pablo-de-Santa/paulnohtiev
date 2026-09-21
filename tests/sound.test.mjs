import { test } from "node:test";
import assert from "node:assert/strict";
import { soundMix, seasonalSound } from "../clearing-audio.js";
test("nearby sources are louder and pan according to listener orientation", () => {
  const ear = { x: 0, z: 0 };
  assert(
    soundMix(ear, { x: 1, z: 0 }).gain > soundMix(ear, { x: 12, z: 0 }).gain,
  );
  assert(soundMix(ear, { x: 2, z: 0 }).pan > 0);
  assert(soundMix(ear, { x: 2, z: 0 }, { x: -1, z: 0 }).pan < 0);
  for (const source of [ear, { x: 1e6, z: -1e6 }]) {
    const m = soundMix(ear, source);
    assert(Number.isFinite(m.gain));
    assert(m.gain >= 0 && m.gain <= 1);
    assert(Math.abs(m.pan) <= 0.85);
  }
});
test("seasons have distinct natural sound beds", () => {
  assert(seasonalSound.winter.wind > seasonalSound.summer.wind);
  assert.equal(seasonalSound.winter.insects, 0);
  assert(seasonalSound.autumn.leaves > seasonalSound.winter.leaves);
  assert(seasonalSound.spring.birds < seasonalSound.winter.birds);
});
