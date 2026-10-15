import assert from "node:assert/strict";
import test from "node:test";
import { berlinToday, fourWeeks, isMonday, mondayOf } from "./weeks.ts";

test("Donnerstag fällt auf den Montag derselben Woche", () => {
  const thursday = new Date("2026-10-15T12:00:00Z");
  assert.equal(berlinToday(thursday), "2026-10-15");
  assert.equal(mondayOf("2026-10-15"), "2026-10-12");
  assert.equal(isMonday("2026-10-12"), true);
  assert.equal(isMonday("2026-10-15"), false);
});

test("Sonntag gehört zur laufenden Woche", () => {
  assert.equal(mondayOf("2026-10-18"), "2026-10-12");
});

test("kurz nach Mitternacht in Berlin beginnt die neue Woche", () => {
  const justAfterMonday = new Date("2026-10-11T22:30:00Z");
  assert.equal(berlinToday(justAfterMonday), "2026-10-12");
  const weeks = fourWeeks(justAfterMonday);
  assert.deepEqual(
    weeks.map((week) => week.start),
    ["2026-10-12", "2026-10-19", "2026-10-26", "2026-11-02"],
  );
  assert.equal(weeks[0]?.label, "Diese Woche");
  assert.equal(weeks[1]?.label, "Nächste Woche");
});
