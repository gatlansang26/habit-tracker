// Shared API contract. Frontend and backend both build against this file; don't change it without the advisor.

export type Habit = {
  id: number;
  name: string;
  createdAt: string; // "YYYY-MM-DD"
  currentStreak: number;
  checkedInToday: boolean;
};

export type ApiError = { error: string };

export const NAME_MAX = 100;

export interface HabitsApi {
  list(): Promise<Habit[]>; // oldest first
  create(name: string): Promise<Habit>; // throws Error(apiError.error) on 400
  remove(id: number): Promise<void>; // throws on 404
  checkIn(id: number): Promise<Habit>; // throws on 404; repeat is fine
}
