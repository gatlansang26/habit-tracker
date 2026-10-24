import { expect, it } from "vitest";
import { computeStreak } from "@/lib/streak";

it("no check-ins", () => {
  expect(computeStreak([], "2026-10-24")).toBe(0);
});

it("today only", () => {
  expect(computeStreak(["2026-10-24"], "2026-10-24")).toBe(1);
});

it("yesterday only, today not yet", () => {
  expect(computeStreak(["2026-10-23"], "2026-10-24")).toBe(1);
});

it("today + 3 previous days", () => {
  expect(
    computeStreak(
      ["2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24"],
      "2026-10-24"
    )
  ).toBe(4);
});

it("gap resets", () => {
  expect(
    computeStreak(
      ["2026-10-19", "2026-10-20", "2026-10-22", "2026-10-23", "2026-10-24"],
      "2026-10-24"
    )
  ).toBe(3);
});

it("last check-in 2 days ago", () => {
  expect(computeStreak(["2026-10-22"], "2026-10-24")).toBe(0);
});

it("duplicates count once", () => {
  expect(computeStreak(["2026-10-24", "2026-10-24", "2026-10-23"], "2026-10-24")).toBe(2);
});

it("unsorted input", () => {
  expect(computeStreak(["2026-10-24", "2026-10-22", "2026-10-23"], "2026-10-24")).toBe(3);
});

it("month boundary", () => {
  expect(computeStreak(["2026-01-31", "2026-02-01"], "2026-02-01")).toBe(2);
});

it("year boundary", () => {
  expect(computeStreak(["2025-12-31", "2026-01-01"], "2026-01-01")).toBe(2);
});

it("leap day", () => {
  expect(computeStreak(["2028-02-28", "2028-02-29", "2028-03-01"], "2028-03-01")).toBe(3);
});
