import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/habits/route";
import { DELETE } from "@/app/api/habits/[id]/route";
import { POST as CHECK_IN } from "@/app/api/habits/[id]/check-ins/route";
import { toLocalDate } from "@/lib/dates";

beforeAll(() => {
  const dir = mkdtempSync(join(tmpdir(), "habit-tracker-"));
  process.env.HABITS_DB = join(dir, "habits.db");
});

const today = toLocalDate(new Date());

function postHabits(body: unknown) {
  return POST(
    new Request("http://test/api/habits", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

function withId(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("habits API", () => {
  it("creates a habit, trimming the name", async () => {
    const res = await postHabits({ name: "  Read  " });
    expect(res.status).toBe(201);
    const habit = await res.json();
    expect(habit).toMatchObject({
      name: "Read",
      currentStreak: 0,
      checkedInToday: false,
      createdAt: today,
    });
  });

  it("accepts a 100-char name and rejects 101 chars", async () => {
    const ok = await postHabits({ name: "a".repeat(100) });
    expect(ok.status).toBe(201);

    const tooLong = await postHabits({ name: "a".repeat(101) });
    expect(tooLong.status).toBe(400);
    expect(await tooLong.json()).toHaveProperty("error");
  });

  it("rejects invalid bodies", async () => {
    const nonJson = await postHabits("not json");
    expect(nonJson.status).toBe(400);
    expect(await nonJson.json()).toHaveProperty("error");

    const empty = await postHabits({});
    expect(empty.status).toBe(400);

    const wrongType = await postHabits({ name: 42 });
    expect(wrongType.status).toBe(400);

    const blank = await postHabits({ name: "   " });
    expect(blank.status).toBe(400);
  });

  it("lists habits in id order", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const habits = await res.json();
    expect(Array.isArray(habits)).toBe(true);
    const ids = habits.map((h: { id: number }) => h.id);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
    expect(habits.some((h: { name: string }) => h.name === "Read")).toBe(true);
  });

  it("checks in a habit; a repeat check-in returns the same state", async () => {
    const created = await (await postHabits({ name: "Exercise" })).json();

    const first = await CHECK_IN(new Request("http://test", { method: "POST" }), withId(String(created.id)));
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ checkedInToday: true, currentStreak: 1 });

    const second = await CHECK_IN(new Request("http://test", { method: "POST" }), withId(String(created.id)));
    expect(second.status).toBe(200);
    expect(await second.json()).toMatchObject({ checkedInToday: true, currentStreak: 1 });
  });

  it("404s for invalid or non-existent ids", async () => {
    for (const id of ["abc", "1.5", "999999"]) {
      const checkInRes = await CHECK_IN(new Request("http://test", { method: "POST" }), withId(id));
      expect(checkInRes.status).toBe(404);
      expect(await checkInRes.json()).toHaveProperty("error");

      const deleteRes = await DELETE(new Request("http://test", { method: "DELETE" }), withId(id));
      expect(deleteRes.status).toBe(404);
      expect(await deleteRes.json()).toHaveProperty("error");
    }
  });

  it("404s for a numeric id too large to fit in a JS number", async () => {
    const hugeId = "9".repeat(400);

    const checkInRes = await CHECK_IN(new Request("http://test", { method: "POST" }), withId(hugeId));
    expect(checkInRes.status).toBe(404);
    expect(await checkInRes.json()).toHaveProperty("error");

    const deleteRes = await DELETE(new Request("http://test", { method: "DELETE" }), withId(hugeId));
    expect(deleteRes.status).toBe(404);
    expect(await deleteRes.json()).toHaveProperty("error");
  });

  it("deletes a habit, removing it from the list and its check-ins", async () => {
    const created = await (await postHabits({ name: "Temp" })).json();

    const del = await DELETE(new Request("http://test", { method: "DELETE" }), withId(String(created.id)));
    expect(del.status).toBe(204);

    const listRes = await GET();
    const habits = await listRes.json();
    expect(habits.some((h: { id: number }) => h.id === created.id)).toBe(false);

    const checkInRes = await CHECK_IN(new Request("http://test", { method: "POST" }), withId(String(created.id)));
    expect(checkInRes.status).toBe(404);
  });
});
