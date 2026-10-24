import { HabitList } from "./habit-list";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <h1 className="mx-auto w-full max-w-md px-6 pt-6 text-xl font-semibold">Habits</h1>
      <HabitList />
    </div>
  );
}
