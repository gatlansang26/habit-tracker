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

  it("throws a status-based message when a non-2xx response body isn't JSON", async () => {
    const res = {
      ok: false,
      status: 500,
      json: vi.fn().mockRejectedValue(new SyntaxError("Unexpected token")),
    } as unknown as Response;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(res));
    await expect(httpApi.list()).rejects.toThrow("Request failed (500)");
  });

  it("remove resolves on 204 without reading a body", async () => {
    const res = mockResponse(true);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(res));
    await expect(httpApi.remove(1)).resolves.toBeUndefined();
    expect(res.json).not.toHaveBeenCalled();
  });

  it("checkIn posts to /api/habits/:id/check-ins and returns the Habit", async () => {
    const habit = { id: 1, name: "Read", createdAt: "2026-01-01", currentStreak: 1, checkedInToday: true };
    const fetchMock = vi.fn().mockResolvedValue(mockResponse(true, habit));
    vi.stubGlobal("fetch", fetchMock);
    await expect(httpApi.checkIn(1)).resolves.toEqual(habit);
    expect(fetchMock).toHaveBeenCalledWith("/api/habits/1/check-ins", { method: "POST" });
  });
});
