import { NextResponse } from "next/server";
import type { ApiError } from "@/contract";
import { deleteHabit } from "@/server/habits";

const ID_PATTERN = /^\d+$/;

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ID_PATTERN.test(id)) {
    return NextResponse.json<ApiError>({ error: "Habit not found" }, { status: 404 });
  }

  const deleted = await deleteHabit(Number(id));
  if (!deleted) {
    return NextResponse.json<ApiError>({ error: "Habit not found" }, { status: 404 });
  }

  return new Response(null, { status: 204 });
}
