import { test } from "node:test";
import assert from "node:assert/strict";
import { seasonForDate } from "../seasons.js";
test("calendar uses local northern-hemisphere seasons across every month", () => {
  const expected = [
    "winter",
    "winter",
    "spring",
    "spring",
    "spring",
    "summer",
    "summer",
    "summer",
    "autumn",
    "autumn",
    "autumn",
    "winter",
  ];
  expected.forEach((season, month) =>
    assert.equal(seasonForDate(new Date(2026, month, 15, 12)), season),
  );
  assert.equal(seasonForDate(new Date(2026, 11, 31, 23, 59)), "winter");
  assert.equal(seasonForDate(new Date(2027, 0, 1, 0, 0)), "winter");
});
