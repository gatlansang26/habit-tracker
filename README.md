# Habit tracker

A small personal Next.js app for tracking daily habits and streaks.

## Setup

```
pnpm install
pnpm dev
```

## Tests

```
pnpm test
pnpm test:e2e
pnpm lint
pnpm build
```

## Database

Data is stored in a local SQLite file at `data/habits.db` (gitignored). Tests and Playwright
use the `HABITS_DB` environment variable to point at their own database file instead.
