import { expect, it } from "vitest";
import { NAME_MAX } from "@/contract";

it("contract NAME_MAX is 100", () => {
  expect(NAME_MAX).toBe(100);
});
