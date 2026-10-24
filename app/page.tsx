import { HabitList } from "./habit-list";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <HabitList />
    </div>
  );
}
