import { expect, it } from "vitest";
import { toLocalDate } from "@/lib/dates";

it("formats a date-time using local year, month and day", () => {
  expect(toLocalDate(new Date(2026, 9, 25, 0, 30))).toBe("2026-10-25");
});

it("pads single-digit month and day", () => {
  expect(toLocalDate(new Date(2026, 0, 5))).toBe("2026-01-05");
});
