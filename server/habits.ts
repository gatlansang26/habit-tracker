import { eq } from "drizzle-orm";
import { NAME_MAX } from "@/contract";
import type { Habit } from "@/contract";
import { getDb } from "@/server/db";
import { checkIns, habits } from "@/server/schema";
import { computeStreak } from "@/lib/streak";

export function parseName(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (trimmed.length === 0 || trimmed.length > NAME_MAX) return null;
  return trimmed;
}

type HabitRow = { id: number; name: string; createdAt: string };

async function toHabit(row: HabitRow, today: string): Promise<Habit> {
  const db = await getDb();
  const rows = await db.select({ date: checkIns.date }).from(checkIns).where(eq(checkIns.habitId, row.id));
  const dates = rows.map((r) => r.date);
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt,
    currentStreak: computeStreak(dates, today),
    checkedInToday: dates.includes(today),
  };
}

export async function listHabits(today: string): Promise<Habit[]> {
  const db = await getDb();
  const rows = await db.select().from(habits).orderBy(habits.id);
  return Promise.all(rows.map((row) => toHabit(row, today)));
}

export async function createHabit(name: string, today: string): Promise<Habit> {
  const db = await getDb();
  const [row] = await db.insert(habits).values({ name, createdAt: today }).returning();
  return toHabit(row, today);
}

export async function deleteHabit(id: number): Promise<boolean> {
  const db = await getDb();
  await db.delete(checkIns).where(eq(checkIns.habitId, id));
  const result = await db.delete(habits).where(eq(habits.id, id)).returning();
  return result.length > 0;
}

export async function checkIn(id: number, today: string): Promise<Habit | null> {
  const db = await getDb();
  const [row] = await db.select().from(habits).where(eq(habits.id, id));
  if (!row) return null;
  await db.insert(checkIns).values({ habitId: id, date: today }).onConflictDoNothing();
  return toHabit(row, today);
}
