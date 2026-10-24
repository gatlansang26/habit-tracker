"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Habit } from "@/contract";
import { NAME_MAX } from "@/contract";
import { api } from "@/lib/api";

export function HabitList() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  // Which habit ids have a request in flight, tracked per id so one habit's
  // pending check-in/delete doesn't re-enable another habit's buttons.
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());

  function startPending(id: number) {
    setPendingIds((prev) => new Set(prev).add(id));
  }

  function stopPending(id: number) {
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  useEffect(() => {
    api.list().then(setHabits).catch(showError);
  }, []);

  // Tab left open overnight keeps yesterday's "Done today"/streak; refresh
  // once the tab becomes visible again so "today" doesn't go stale.
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        api.list().then(setHabits).catch(showError);
      }
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  async function refresh() {
    setHabits(await api.list());
  }

  function showError(err: unknown) {
    setError(err instanceof Error ? err.message : String(err));
  }

  async function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setAdding(true);
    try {
      await api.create(name);
      setName("");
      await refresh();
    } catch (err) {
      showError(err);
    } finally {
      setAdding(false);
    }
  }

  async function handleCheckIn(id: number) {
    setError(null);
    startPending(id);
    try {
      await api.checkIn(id);
      await refresh();
    } catch (err) {
      showError(err);
    } finally {
      stopPending(id);
    }
  }

  async function handleDelete(id: number) {
    setError(null);
    startPending(id);
    try {
      await api.remove(id);
      await refresh();
    } catch (err) {
      showError(err);
    } finally {
      stopPending(id);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 p-6">
      <form onSubmit={handleAdd} className="flex flex-col gap-2">
        <label htmlFor="habit-name" className="text-sm font-medium">
          Habit name
        </label>
        <div className="flex gap-2">
          <input
            id="habit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={NAME_MAX}
            className="flex-1 rounded border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-black"
          />
          <button
            type="submit"
            disabled={adding}
            className="rounded bg-foreground px-4 py-2 text-background disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </form>

      {error && (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      )}

      {habits.length === 0 ? (
        <p>No habits yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {habits.map((habit) => {
            const isPending = pendingIds.has(habit.id);
            const checkInLabel = habit.checkedInToday ? "Done today" : "Check in";
            return (
              <li
                key={habit.id}
                className="flex items-center justify-between gap-2 rounded border border-zinc-200 px-3 py-2 dark:border-zinc-800"
              >
                <span>{habit.name}</span>
                <span>🔥 {habit.currentStreak} day streak</span>
                <button
                  type="button"
                  onClick={() => handleCheckIn(habit.id)}
                  disabled={habit.checkedInToday || isPending}
                  aria-label={`${checkInLabel} ${habit.name}`}
                  className="rounded bg-foreground px-3 py-1 text-background disabled:opacity-50"
                >
                  {checkInLabel}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(habit.id)}
                  disabled={isPending}
                  aria-label={`Delete ${habit.name}`}
                  className="rounded border border-zinc-300 px-3 py-1 disabled:opacity-50 dark:border-zinc-700"
                >
                  Delete
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
