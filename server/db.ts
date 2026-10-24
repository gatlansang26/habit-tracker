import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";

type Db = ReturnType<typeof drizzle>;

let dbPromise: Promise<Db> | undefined;

export function getDb(): Promise<Db> {
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    const path = process.env.HABITS_DB ?? "data/habits.db";
    mkdirSync(dirname(path), { recursive: true });
    const instance = drizzle({ connection: { url: "file:" + path } });

    // shortcut: hand-written DDL instead of drizzle-kit migrations, upgrade when the schema changes
    await instance.run(sql`CREATE TABLE IF NOT EXISTS habits (
      id integer PRIMARY KEY AUTOINCREMENT,
      name text NOT NULL,
      created_at text NOT NULL
    )`);
    await instance.run(sql`CREATE TABLE IF NOT EXISTS check_ins (
      habit_id integer NOT NULL,
      date text NOT NULL,
      UNIQUE (habit_id, date)
    )`);

    return instance;
  })();

  return dbPromise;
}
