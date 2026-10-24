import { beforeEach, describe, expect, it, vi } from "vitest";
import { httpApi } from "./http";

function mockResponse(ok: boolean, jsonBody?: unknown) {
  return {
    ok,
    json: vi.fn().mockResolvedValue(jsonBody),
  } as unknown as Response;
}

describe("httpApi", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("list returns parsed JSON on a 2xx response", async () => {
    const habits = [
      { id: 1, name: "Read", createdAt: "2026-01-01", currentStreak: 1, checkedInToday: true },
    ];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse(true, habits)));
    await expect(httpApi.list()).resolves.toEqual(habits);
  });

  it("throws an Error with the ApiError message on a non-2xx response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(mockResponse(false, { error: "Name must be 1-100 characters" })),
    );
    await expect(httpApi.create("")).rejects.toThrow("Name must be 1-100 characters");
  });

  it("remove resolves on 204 without reading a body", async () => {
    const res = mockResponse(true);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(res));
    await expect(httpApi.remove(1)).resolves.toBeUndefined();
    expect(res.json).not.toHaveBeenCalled();
  });
});
