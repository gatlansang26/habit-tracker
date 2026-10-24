import { NextResponse } from "next/server";
import type { ApiError, Habit } from "@/contract";
import { toLocalDate } from "@/lib/dates";
import { createHabit, listHabits, parseName } from "@/server/habits";

export async function GET() {
  const habits = await listHabits(toLocalDate(new Date()));
  return NextResponse.json<Habit[]>(habits);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ApiError>({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const rawName = typeof body === "object" && body !== null ? (body as Record<string, unknown>).name : undefined;
  const name = parseName(rawName);
  if (name === null) {
    return NextResponse.json<ApiError>({ error: "Name must be 1-100 characters" }, { status: 400 });
  }

  const habit = await createHabit(name, toLocalDate(new Date()));
  return NextResponse.json<Habit>(habit, { status: 201 });
}
