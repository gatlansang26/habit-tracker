import { describe, expect, it } from "vitest";
import { NAME_MAX } from "@/contract";
import { fakeApi } from "./fake";

describe("fakeApi", () => {
  it("create trims the name", async () => {
    const habit = await fakeApi.create("  Read  ");
    expect(habit.name).toBe("Read");
  });

  it("create rejects a blank name and a name over NAME_MAX", async () => {
    await expect(fakeApi.create("")).rejects.toThrow();
    await expect(fakeApi.create("a".repeat(NAME_MAX + 1))).rejects.toThrow();
  });

  it("list returns habits oldest first", async () => {
    const first = await fakeApi.create("First");
    const second = await fakeApi.create("Second");
    const list = await fakeApi.list();
    const firstIndex = list.findIndex((h) => h.id === first.id);
    const secondIndex = list.findIndex((h) => h.id === second.id);
    expect(firstIndex).toBeLessThan(secondIndex);
  });

  it("checking in twice keeps checkedInToday true and currentStreak 1", async () => {
    const habit = await fakeApi.create("Exercise");
    await fakeApi.checkIn(habit.id);
    const result = await fakeApi.checkIn(habit.id);
    expect(result.checkedInToday).toBe(true);
    expect(result.currentStreak).toBe(1);
  });

  it("remove followed by checkIn throws", async () => {
    const habit = await fakeApi.create("Meditate");
    await fakeApi.remove(habit.id);
    await expect(fakeApi.checkIn(habit.id)).rejects.toThrow();
  });
});
