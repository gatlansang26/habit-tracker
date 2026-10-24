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
    return habits;
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
    habits.push(habit);
    return habit;
  },

  async remove(id) {
    const before = habits.length;
    habits = habits.filter((h) => h.id !== id);
    if (habits.length === before) {
      throw new Error("Habit not found");
    }
  },

  async checkIn(id) {
    const habit = habits.find((h) => h.id === id);
    if (!habit) {
      throw new Error("Habit not found");
    }
    // Repeat check-in is a no-op: streak and flag just stay at their checked-in values.
    habit.checkedInToday = true;
    habit.currentStreak = 1;
    return habit;
  },
};
