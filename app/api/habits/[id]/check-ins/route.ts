import { NextResponse } from "next/server";
import type { ApiError, Habit } from "@/contract";
import { toLocalDate } from "@/lib/dates";
import { checkIn } from "@/server/habits";

const ID_PATTERN = /^\d+$/;

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ID_PATTERN.test(id) || !Number.isSafeInteger(Number(id))) {
    return NextResponse.json<ApiError>({ error: "Habit not found" }, { status: 404 });
  }

  const habit = await checkIn(Number(id), toLocalDate(new Date()));
  if (!habit) {
    return NextResponse.json<ApiError>({ error: "Habit not found" }, { status: 404 });
  }

  return NextResponse.json<Habit>(habit);
}
