# Habit tracker: design

Date: 2026-10-24
Status: approved by the user 2026-10-24

## Intent

This is a personal learning project. The goal is to learn agent orchestration by directing Claude Code subagents (backend, frontend, test) to build a small Next.js app, following the superpowers flow: brainstorming → writing-plans → using-git-worktrees → subagent-driven-development / dispatching-parallel-agents → requesting-code-review.

The app is the vehicle, not the goal. A habit tracker was chosen because:
- streak logic gives the test agent real edge cases to cover;
- an agreed API contract lets the frontend and backend agents work in parallel.

Success means the app works, and the build exercised parallel agents working against a fixed contract, with tests and code review gating each branch.

## Goals

- A working habit tracker that runs locally.
- Backend, frontend and test agents work in parallel in separate git worktrees, coordinated through a contract committed to `main` before they start.
- Streak logic covered by unit tests that the test agent writes before the backend agent implements it.
- End-to-end tests that click through the app.

## Non-goals

- Login, accounts or multiple users. One person, one local database. *(My call: nobody asked for it, and it would add auth work unrelated to orchestration.)*
- Deployment, hosting, mobile app, offline sync.
- Non-daily habits (weekly, "3 times a week"), reminders, notes, history charts, longest-streak stats, editing a habit's name, undoing a check-in. *(Proposed by Claude, confirmed by the user 2026-10-24: renaming and undo can come later.)*
- A custom orchestrator built on the Agent SDK. Rejected earlier in favour of Claude Code subagents.

## Anti-goals

- Agents sharing state (a shared database, a shared file both edit) so that failures can't be traced to one agent's work.
- Anything that sends data off the machine without the user's say-so. Pushing to https://github.com/gatlansang26/habit-tracker needs the user's approval each time.
- Secrets in the repo or in agent context. The design needs none (see Storage).

## Constraints

- Node v24.14.0 and pnpm 10.15.0 are installed (checked 2026-10-24).
- Repo: `~/Projects/habit-tracker`, branch `main`, no commits yet. Repo-local `user.email` is set.
- Work laptop: no client data in this project.

## Approaches considered

### Storage

| Option | Trade-off | Outcome |
|---|---|---|
| SQLite file + Drizzle ORM | Nothing to run; each worktree gets its own database file; the backend agent writes a real API | **Chosen by the user** |
| Supabase (hosted or local) | Generates the basic CRUD API, includes auth. Needs Docker (installed, daemon not running) or a hosted project with keys; agents share one database; backend shrinks to tables, row-level security rules and a streak function | Rejected: the user wants a backend agent with real API work to coordinate |
| SQLite + Prisma | Works, but a separate schema file and a generate step every agent must remember | Not chosen |

### Contract between backend and frontend

| Option | Trade-off | Outcome |
|---|---|---|
| **A. HTTP API** via Route Handlers + shared `contract.ts` | Explicit boundary in separate files; testable from outside the app; more code (fetch, JSON, status codes) | **Chosen by the user** |
| B. Server Functions (`'use server'`) | Less code, but both agents edit one file, the boundary is a function call, and the backend agent's job shrinks | Rejected |
| C. OpenAPI spec + code generation | A generator tool for about five endpoints | Dropped as too heavy |

## Decided

### Stack (user's choices)

- Scaffold with `create-next-app` recommended defaults: TypeScript, ESLint, Tailwind CSS, App Router, Turbopack, `AGENTS.md`.
- Styling: Tailwind CSS.
- Storage: SQLite + Drizzle ORM.
- Tests: Vitest for the streak logic and other units; Playwright for end-to-end. (Next.js docs: Vitest does not support `async` Server Components, so end-to-end tests cover those.)
- Package manager: pnpm.

### Domain rules (proposed by Claude, confirmed by the user 2026-10-24)

- A habit has a name (trimmed, 1–100 characters) and a creation date.
- A check-in marks a habit as done on a calendar date. At most one per habit per date: a second check-in on the same day is accepted and changes nothing.
- "Today" is the local date of the machine running the server. Server and user are the same machine.
- **Current streak** = the number of consecutive days with a check-in, counting back from:
  - today, if the habit is checked in today;
  - yesterday, if today isn't checked in yet. Today not yet checked does not break the streak.
- A missed day (no check-in) ends the streak. If neither today nor yesterday is checked in, the streak is 0.
- Check-ins can only be made for today. No back-filling.

### Streak edge cases the test agent must cover

1. No check-ins → 0.
2. Checked in today only → 1.
3. Checked in yesterday, not yet today → streak still counts (today not yet checked).
4. Checked in today and the previous N consecutive days → N + 1.
5. A gap (missed day) in the middle → only the days after the gap count.
6. Last check-in two or more days ago → 0.
7. Double check-in on the same day → counts once.
8. Dates across a month and a year boundary (31 Jan → 1 Feb, 31 Dec → 1 Jan).

### Streak function

A pure function with no database or clock access, so the test agent can test it in isolation:

```ts
computeStreak(checkInDates: string[], today: string): number
// dates are local calendar dates as "YYYY-MM-DD"; input may be unsorted and contain duplicates
```

### API contract

Committed to `main` before any agent starts, as `contract.ts` (shared types) plus this endpoint list. All bodies are JSON.

```ts
type Habit = {
  id: number;
  name: string;
  createdAt: string;        // "YYYY-MM-DD"
  currentStreak: number;
  checkedInToday: boolean;
};

type ApiError = { error: string };
```

| Method and path | Request body | Success | Errors |
|---|---|---|---|
| `GET /api/habits` | none | `200` `Habit[]`, oldest first | none |
| `POST /api/habits` | `{ name: string }` | `201` `Habit` | `400` `ApiError` if name missing, blank or over 100 chars |
| `DELETE /api/habits/:id` | none | `204` (deletes its check-ins too) | `404` `ApiError` |
| `POST /api/habits/:id/check-ins` | none (always today) | `200` `Habit` (same response whether new or a repeat) | `404` `ApiError` |

Every handler validates its own input, because Next.js docs say to treat Route Handlers as public endpoints. Validation is hand-written (one string field), with no validation library. *(My call.)*

### Storage

- Two tables: `habits` (id, name, created_at) and `check_ins` (habit_id, date, unique on habit_id + date).
- The database file path has a fixed default inside the project (e.g. `data/habits.db`), which is gitignored. No `.env` and no secrets. Each worktree gets its own file automatically.
- Playwright runs against its own database file so test data never touches the dev database. *(My call.)*

### Screens

One page:
- a form to add a habit;
- a list of habits, each showing its name, current streak, a "Check in" button (shown as done when checked in today), and a delete button.

Plain Tailwind styling, nothing elaborate.

### Agent roles and order

| Step | Who | Work |
|---|---|---|
| 1 | User + advisor (main session) | Scaffold the app, commit `contract.ts`, this endpoint list and the streak edge cases to `main` |
| 2 (parallel, one worktree each) | Backend agent | Drizzle schema, Route Handlers, `computeStreak` |
| | Frontend agent | The page, built against an in-memory fake of the API client that returns contract-shaped data |
| | Test agent | Failing Vitest tests for `computeStreak` covering the edge cases above |
| 3 | Backend agent | Makes the streak tests pass |
| | Frontend agent | Swaps the fake for real `fetch` calls |
| 4 | Test agent | Playwright end-to-end tests: add habit, check in, double check-in, delete |
| Each branch | Review agent | Code review before merge (requesting-code-review) |

The advisor (main session) dispatches agents, reviews reports and merges. Agents never push.

## Left to the builder (the plan)

- SQLite driver for Drizzle. Drizzle supports `better-sqlite3`, `libsql` and `node-sqlite` (Context7 `/drizzle-team/drizzle-orm-docs`). Prefer one without a native build step if pnpm's handling of dependency build scripts gets in the way (not verified).
- How migrations run (generated migrations or schema push) and when the database file gets created.
- Folder layout, file names, and where the fake API client lives.
- How the frontend refreshes the list after a change.
- VS Code run commands (`.vscode/tasks.json` with `inAgents: true`): set up after scaffolding, from the real `package.json` scripts. Candidates: install dependencies and create the database when a worktree is created; dev server, tests and lint on the Run button. The user deferred this on 2026-10-24.
- Task size for each agent, review checkpoints, and merge order.
