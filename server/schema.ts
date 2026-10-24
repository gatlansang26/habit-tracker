import { integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

export const habits = sqliteTable("habits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull(),
});

export const checkIns = sqliteTable(
  "check_ins",
  {
    habitId: integer("habit_id").notNull(),
    date: text("date").notNull(),
  },
  (t) => [unique().on(t.habitId, t.date)],
);
