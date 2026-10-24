import type { Habit, HabitsApi } from "@/contract";
import { NAME_MAX } from "@/contract";

// In-memory store for the frontend to build against before the real API exists.
let habits: Habit[] = [];
let nextId = 1;

function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const fakeApi: HabitsApi = {
  async list() {
    // Copy so callers (and React's reference-equality check) never see the live store.
    return habits.map((h) => ({ ...h }));
  },

  async create(name) {
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > NAME_MAX) {
      throw new Error(`Name must be 1-${NAME_MAX} characters`);
    }
    const habit: Habit = {
      id: nextId++,
      name: trimmed,
      createdAt: todayStr(),
      currentStreak: 0,
      checkedInToday: false,
    };
    habits = [...habits, habit];
    return { ...habit };
  },

  async remove(id) {
    const before = habits.length;
    habits = habits.filter((h) => h.id !== id);
    if (habits.length === before) {
      throw new Error("Habit not found");
    }
  },

  async checkIn(id) {
    const index = habits.findIndex((h) => h.id === id);
    if (index === -1) {
      throw new Error("Habit not found");
    }
    // Repeat check-in is a no-op: streak and flag just stay at their checked-in values.
    const updated: Habit = { ...habits[index], checkedInToday: true, currentStreak: 1 };
    habits = habits.map((h, i) => (i === index ? updated : h));
    return { ...updated };
  },
};
