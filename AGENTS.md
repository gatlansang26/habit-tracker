<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Habit tracker rules

- Spec: `docs/superpowers/specs/2026-10-24-habit-tracker-design.md`. Plan: `docs/superpowers/plans/2026-10-24-habit-tracker.md`.
- No `src/` folder: code lives in `app/`, `lib/`, `server/`; `@/` maps to the repo root.
- The contract is `contract.ts` plus the spec's endpoint table. Don't edit it.
- Never push. Commit to your own branch only.
- Tests and Playwright use the `HABITS_DB` env var for their own database file. No `.env` files.
- `pnpm test` (Vitest, `**/*.test.ts`), `pnpm test:e2e` (Playwright), `pnpm lint`, `pnpm build`.
