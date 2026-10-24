import type { ApiError, Habit, HabitsApi } from "@/contract";

async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json()) as ApiError;
    throw new Error(body.error);
  }
  return res.json() as Promise<T>;
}

export const httpApi: HabitsApi = {
  async list() {
    const res = await fetch("/api/habits");
    return parse<Habit[]>(res);
  },

  async create(name) {
    const res = await fetch("/api/habits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    return parse<Habit>(res);
  },

  async remove(id) {
    const res = await fetch(`/api/habits/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = (await res.json()) as ApiError;
      throw new Error(body.error);
    }
  },

  async checkIn(id) {
    const res = await fetch(`/api/habits/${id}/check-ins`, { method: "POST" });
    return parse<Habit>(res);
  },
};
