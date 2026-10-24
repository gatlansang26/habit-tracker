# Habit Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A local Next.js habit tracker (add, check in, delete, current streak), built by backend, frontend and test agents in parallel worktrees against a contract committed to `main` first.

**Architecture:** One Next.js App Router app. Route Handlers under `/api/habits` read and write a local SQLite file through Drizzle. A pure `computeStreak` function computes streaks. The page is a client component that talks to the API through a `HabitsApi` interface: an in-memory fake first, real `fetch` after integration.

**Tech Stack:** Next.js 16 (create-next-app recommended defaults: TypeScript, ESLint, Tailwind CSS, App Router, Turbopack, AGENTS.md), pnpm 10.15.0, Node v24.14.0, Drizzle ORM 0.45.x with `@libsql/client` (`drizzle-orm/libsql`), Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-24-habit-tracker-design.md`

## Global Constraints

- No login, no deployment, daily habits only. No rename, no undo, no charts.
- A habit name is trimmed, and must be 1–100 characters after trimming.
- At most one check-in per habit per date. A repeat check-in returns `200` with the same `Habit` and changes nothing.
- "Today" is the server's **local** calendar date as `"YYYY-MM-DD"`, never `toISOString()` (that gives the UTC date, which differs from the local date near midnight in NZ).
- Check-ins are for today only.
- Contract types and endpoints are exactly as in the spec's "API contract" section. Nobody changes `src/contract.ts` after Task 1 without going back to the advisor.
- No `.env`, no secrets. The database path defaults to `data/habits.db`, and the `HABITS_DB` env var overrides it (tests and Playwright only). `data/` is gitignored.
- Validation is hand-written. Don't add a validation library.
- Agents commit to their own branch only. **Nobody pushes.** The advisor merges. Pushing to github.com/gatlansang26/habit-tracker needs the user's approval each time.
- If create-next-app's recommended defaults don't create a `src/` folder, drop the `src/` prefix from every path below. Task 1 records which one it is in `AGENTS.md`.

## Review Focus

1. **Bad request bodies:** non-JSON body, `{}`, `{ name: 42 }` and `{ name: "   " }` all return `400 ApiError`, never a 500. Tested in Task 3.
2. **Bad or stale ids:** `/api/habits/abc`, `/api/habits/1.5` and a deleted id return `404 ApiError`, never a 500. Tested in Task 3.
3. **Name boundaries:** 100 characters after trimming is accepted, 101 is rejected, and `"  Read  "` is stored as `"Read"`. Tested in Task 3.
4. **Local date near midnight:** `toLocalDate(new Date(2026, 9, 25, 0, 30))` must return `"2026-10-25"` (the UTC date would be the 24th in NZ). Tested in Task 3.
5. **Double-clicks and failures in the UI:** buttons are disabled while their request is pending, and an API error shows as text on the page instead of failing silently. Tested in Task 4 (fake) and Task 7 (e2e).

---

## Execution order

```
Task 1 (advisor, main) ──┬── Task 2 test agent    (worktree: test-streak) ─┐
                         ├── Task 3 backend agent (worktree: backend)     ─┼── Task 5 backend green (on backend branch, after merging test-streak)
                         └── Task 4 frontend agent(worktree: frontend)    ─┴── Task 6 frontend swap to real fetch
                                                                               └── Task 7 Playwright (test agent) → Task 8 VS Code run commands (ask user first)
```

Each task ends with a review agent (superpowers:requesting-code-review) before the advisor merges it into `main`. Merge order: 2 → 3+5 → 4+6 → 7 → 8.

---

### Task 1: Scaffold, contract and stubs (advisor, on `main`)

**Files:**
- Create: the create-next-app scaffold, `vitest.config.ts`, `src/contract.ts`, `src/lib/streak.ts` (stub), `src/lib/sanity.test.ts`
- Modify: `.gitignore`, `package.json` (scripts), `AGENTS.md` (append a project section)

**Interfaces:**
- Produces, in `src/contract.ts`:
  ```ts
  export type Habit = { id: number; name: string; createdAt: string; currentStreak: number; checkedInToday: boolean };
  export type ApiError = { error: string };
  export const NAME_MAX = 100;
  export interface HabitsApi {
    list(): Promise<Habit[]>;              // oldest first
    create(name: string): Promise<Habit>;  // throws Error(apiError.error) on 400
    remove(id: number): Promise<void>;     // throws on 404
    checkIn(id: number): Promise<Habit>;   // throws on 404; repeat is fine
  }
  ```
- Produces, in `src/lib/streak.ts`: `export function computeStreak(checkInDates: string[], today: string): number`. The stub throws `new Error("not implemented")`.
- Produces scripts: `pnpm test` (`vitest run`) and `pnpm test:e2e` (`playwright test`).

- [ ] **Step 1:** Scaffold with `pnpm create next-app@latest .` and choose the recommended defaults. If it refuses because `docs/` exists, scaffold into `$TMPDIR/ht` and copy everything except `.git` into the repo.
- [ ] **Step 2:** Add dependencies: `pnpm add drizzle-orm @libsql/client` and `pnpm add -D vitest @playwright/test`, then `pnpm exec playwright install chromium`.
- [ ] **Step 3:** Add `data/`, `.DS_Store`, `.worktrees/`, `test-results/` and `playwright-report/` to `.gitignore`. Add a `vitest.config.ts` that includes only `src/**/*.test.ts` and maps the `@` alias to `src` (Vitest doesn't read tsconfig paths on its own).
- [ ] **Step 4:** Write `src/contract.ts` and the `streak.ts` stub as above. Add `src/lib/sanity.test.ts` asserting `NAME_MAX === 100`.
- [ ] **Step 5:** Verify with `pnpm test && pnpm lint && pnpm build`. Expected: 1 test passes, lint is clean, and the build succeeds.
- [ ] **Step 6:** Append to `AGENTS.md`: "Contract is `src/contract.ts` + spec endpoint table; don't edit it. Never push. Use `HABITS_DB` for test databases."
- [ ] **Step 7:** Commit to `main`: `chore: scaffold Next.js app, contract and streak stub`.

---

### Task 2: Failing streak tests (test agent, worktree `test-streak`)

**Files:**
- Create: `src/lib/streak.test.ts`

**Interfaces:**
- Consumes: `computeStreak(checkInDates: string[], today: string): number` from `@/lib/streak` (still a stub).

- [ ] **Step 1:** Write one `it` per spec edge case, with `today = "2026-10-24"` unless stated:

  | Test name | Input dates | today | Expected |
  |---|---|---|---|
  | no check-ins | `[]` | | 0 |
  | today only | `["2026-10-24"]` | | 1 |
  | yesterday only, today not yet | `["2026-10-23"]` | | 1 |
  | today + 3 previous days | `["2026-10-21","2026-10-22","2026-10-23","2026-10-24"]` | | 4 |
  | gap resets | `["2026-10-19","2026-10-20","2026-10-22","2026-10-23","2026-10-24"]` | | 3 |
  | last check-in 2 days ago | `["2026-10-22"]` | | 0 |
  | duplicates count once | `["2026-10-24","2026-10-24","2026-10-23"]` | | 2 |
  | unsorted input | `["2026-10-24","2026-10-22","2026-10-23"]` | | 3 |
  | month boundary | `["2026-01-31","2026-02-01"]` | `"2026-02-01"` | 2 |
  | year boundary | `["2025-12-31","2026-01-01"]` | `"2026-01-01"` | 2 |
  | leap day | `["2028-02-28","2028-02-29","2028-03-01"]` | `"2028-03-01"` | 3 |

- [ ] **Step 2:** Run `pnpm test src/lib/streak.test.ts`. Expected: every test FAILS with "not implemented".
- [ ] **Step 3:** Commit: `test: failing computeStreak edge-case tests`.

---

### Task 3: Backend API (backend agent, worktree `backend`)

**Files:**
- Create: `src/lib/dates.ts`, `src/lib/dates.test.ts`, `src/server/schema.ts`, `src/server/db.ts`, `src/server/habits.ts`, `src/app/api/habits/route.ts`, `src/app/api/habits/[id]/route.ts`, `src/app/api/habits/[id]/check-ins/route.ts`, `src/server/api.test.ts`
- Modify: `src/lib/streak.ts` (replace the stub)

**Interfaces:**
- Consumes: `Habit`, `ApiError` and `NAME_MAX` from `@/contract`.
- Produces:
  - `toLocalDate(d: Date): string`, giving `"YYYY-MM-DD"` from the local year, month and day.
  - `computeStreak` (real implementation). The test agent's tests aren't on this branch yet; Task 5 brings them in.
  - `getDb()`: lazy singleton. It reads `process.env.HABITS_DB ?? "data/habits.db"`, creates the parent folder, connects with `drizzle({ connection: { url: "file:" + path } })` from `drizzle-orm/libsql`, and runs `CREATE TABLE IF NOT EXISTS` for both tables on first call. Put a comment on that line: `// shortcut: hand-written DDL instead of drizzle-kit migrations, upgrade when the schema changes`.
  - `schema.ts`: `habits` (`id` integer primary key autoincrement, `name` text not null, `created_at` text not null) and `check_ins` (`habit_id` integer not null, `date` text not null, unique on `habit_id` + `date`).
  - `habits.ts`: `parseName(input: unknown): string | null`, `listHabits(today: string): Promise<Habit[]>`, `createHabit(name: string, today: string): Promise<Habit>`, `deleteHabit(id: number): Promise<boolean>`, `checkIn(id: number, today: string): Promise<Habit | null>`. Use `onConflictDoNothing()` for the check-in insert. Delete the habit's check-ins in the same call that deletes the habit.
  - Route handlers: type the context as `{ params: Promise<{ id: string }> }` (Next.js 16 `route.mdx`). Don't use `RouteContext`, because that type only exists after `next typegen`. An id is valid only if it matches `/^\d+$/`; anything else returns 404.

- [ ] **Step 1: Write failing tests.** `dates.test.ts`: `toLocalDate(new Date(2026, 9, 25, 0, 30))` is `"2026-10-25"`, and `toLocalDate(new Date(2026, 0, 5))` is `"2026-01-05"`. `api.test.ts` sets `process.env.HABITS_DB` to a fresh file in `os.tmpdir()` in `beforeAll`, then calls the exported handlers directly with `new Request(...)`:
  - POST `{name:"  Read  "}` → 201, `name:"Read"`, `currentStreak:0`, `checkedInToday:false`, `createdAt` = today.
  - POST with name `"a".repeat(100)` → 201; with `"a".repeat(101)` → 400 `{error}`.
  - POST with a non-JSON body, `{}`, `{name:42}` or `{name:"   "}` → 400 `{error}` each.
  - GET → 200, an array in id order that contains the created habits.
  - check-in → 200 with `checkedInToday:true` and `currentStreak:1`. A second check-in → 200 with the same body.
  - check-in or DELETE on id `"abc"`, `"1.5"` or `"999999"` → 404 `{error}`.
  - DELETE an existing habit → 204. Then GET doesn't include it, and checking it in returns 404.
- [ ] **Step 2:** Run `pnpm test src/server src/lib/dates.test.ts`. Expected: FAIL (modules missing).
- [ ] **Step 3:** Implement the files listed in Interfaces. Each `Habit` gets `currentStreak` from `computeStreak` and `checkedInToday` from whether today's date is among its check-ins.
- [ ] **Step 4:** Run `pnpm test src/server src/lib/dates.test.ts && pnpm lint && pnpm build`. Expected: all pass.
- [ ] **Step 5:** Commit: `feat: habits API with SQLite storage and computeStreak`.

---

### Task 4: Page against a fake API (frontend agent, worktree `frontend`)

**Files:**
- Create: `src/lib/api/fake.ts`, `src/lib/api/fake.test.ts`, `src/lib/api/index.ts`, `src/app/habit-list.tsx`
- Modify: `src/app/page.tsx` (replace the scaffold content)

**Interfaces:**
- Consumes: `Habit`, `HabitsApi` and `NAME_MAX` from `@/contract`.
- Produces: `fakeApi: HabitsApi` (in memory, follows the same rules: trim, 1–100 characters or throw `Error`, repeat check-in is a no-op, `currentStreak` is 1 if checked in today and 0 otherwise). `src/lib/api/index.ts` exports `api: HabitsApi = fakeApi`. That one line is what Task 6 swaps.

- [ ] **Step 1: Write failing tests** in `fake.test.ts`: create trims the name; create rejects `""` and `"a".repeat(101)`; list returns habits oldest first; checking in twice keeps `checkedInToday:true` and `currentStreak:1`; remove followed by checkIn throws.
- [ ] **Step 2:** Run `pnpm test src/lib/api`. Expected: FAIL.
- [ ] **Step 3:** Implement `fakeApi`, then `HabitList` (a `"use client"` component that imports `api`). It shows an add form with an input (`maxLength={NAME_MAX}`, label "Habit name") and an "Add" button, and a list where each row has the name, "🔥 N day streak", a "Check in" button (shows "Done today" and is disabled when `checkedInToday`) and a "Delete" button. After every change it reloads with `api.list()`. Buttons are disabled while their request is pending. A thrown error shows as text in a `role="alert"` element. `page.tsx` renders `<HabitList />`. Style with plain Tailwind.
- [ ] **Step 4:** Run `pnpm test src/lib/api && pnpm lint && pnpm build`. Expected: all pass.
- [ ] **Step 5:** Commit: `feat: habit page against fake API`.

---

### Task 5: Make the streak tests pass (backend agent, `backend` branch)

**Interfaces:** Consumes Task 2's `src/lib/streak.test.ts`. Produces nothing new.

- [ ] **Step 1:** The advisor merges `test-streak` into `main`, then into `backend`.
- [ ] **Step 2:** Run `pnpm test`. If any streak test fails, fix `computeStreak` and don't change the tests. If a test looks wrong, stop and report it to the advisor. The approach: build a `Set` of the dates; start the cursor at today if it's in the set, otherwise at yesterday; count while the cursor is in the set and step back one day using `Date.UTC` arithmetic, so daylight-saving changes can't skip or repeat a day.
- [ ] **Step 3:** Run `pnpm test && pnpm lint && pnpm build`. Expected: all pass.
- [ ] **Step 4:** Commit: `fix: computeStreak passes edge-case tests`. After review, the advisor merges `backend` into `main`.

---

### Task 6: Swap to the real API (frontend agent, `frontend` branch)

**Files:**
- Create: `src/lib/api/http.ts`
- Modify: `src/lib/api/index.ts`

**Interfaces:** Consumes the endpoints from the spec table. Produces `httpApi: HabitsApi`. For non-2xx responses it throws `new Error((await res.json()).error)`. `remove` expects 204 and reads no body.

- [ ] **Step 1:** The advisor merges the updated `main` (with the backend) into `frontend`.
- [ ] **Step 2:** Implement `httpApi` and change `index.ts` to `export const api: HabitsApi = httpApi`. Keep `fakeApi` and its tests.
- [ ] **Step 3:** Run `pnpm test && pnpm lint && pnpm build`, then `pnpm dev` and use `curl` to check that `POST /api/habits` and `GET /api/habits` respond. Expected: tests pass, the build succeeds, and the curl calls return contract-shaped JSON.
- [ ] **Step 4:** Commit: `feat: page uses real habits API`. After review, the advisor merges into `main`.

---

### Task 7: End-to-end tests (test agent, worktree `e2e`)

**Files:**
- Create: `playwright.config.ts`, `e2e/habits.spec.ts`

**Interfaces:** Uses the UI text from Task 4: label "Habit name", buttons "Add", "Check in", "Done today" and "Delete", the "N day streak" text, and `role="alert"`.

- [ ] **Step 1:** Configure `playwright.config.ts`: `testDir: "e2e"`, `baseURL: "http://localhost:3100"`, Chromium only, and `webServer` with command `rm -f data/e2e.db && pnpm build && pnpm start -p 3100`, `env: { HABITS_DB: "data/e2e.db" }` and `url: "http://localhost:3100"`.
- [ ] **Step 2:** Write the tests. Give every habit a unique name (for example with `Date.now()`) so the tests don't depend on run order:
  - add habit: it appears with "0 day streak".
  - check in: the button becomes "Done today" and "1 day streak" shows.
  - double check-in: send a second `POST /api/habits/:id/check-ins` through `request` → 200, and after a reload the page still shows "1 day streak".
  - delete: the row disappears and stays gone after a reload.
  - blank name: submitting "   " shows an alert and adds no row.
- [ ] **Step 3:** Run `pnpm test:e2e`. Expected: 5 passed.
- [ ] **Step 4:** Commit: `test: Playwright end-to-end flows`. After review, the advisor merges into `main`.

---

### Task 8: VS Code run commands (advisor, deferred: ask the user first)

**Files:**
- Create: `.vscode/tasks.json`

- [ ] **Step 1:** Ask the user whether to do this now.
- [ ] **Step 2:** If yes, add these tasks with `"inAgents": true`: "Install" (`pnpm install`, `"runOptions": { "runOn": "worktreeCreated" }`), "Dev server" (`pnpm dev`), "Unit tests" (`pnpm test`), "E2E tests" (`pnpm test:e2e`) and "Lint" (`pnpm lint`).
- [ ] **Step 3:** Open a new worktree and confirm that "Install" runs on its own. Commit: `chore: VS Code run commands`.
