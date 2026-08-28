# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

MicroFlash is a **microlearning-first spaced-repetition app**. The core loop is a **micro-sprint**: 3–10 cards in ~30–90 seconds, surfaced by respectful, user-controlled push notifications. No subscription/monetization is in scope.

`AGENTS.md` holds the full conventions reference (formatting, naming, import grouping). This file covers commands, architecture, and current-state gotchas.

## Design constraint (from AGENTS.md)

Do not build design systems or elaborate visual design. Keep UI **extremely minimal** until the MVP is complete, so a real design system can be adopted later.

## ⚠️ Current repo state: the mobile app moved

The `gluestack` branch is mid-migration. The package name and the directory name do **not** match:

| Directory       | Package name         | What it is                                                          |
| --------------- | -------------------- | ------------------------------------------------------------------- |
| `apps/mobile-3` | `@microflash/mobile` | **The real MicroFlash app.** All screens, hooks, tests, API wiring. |
| `apps/mobile`   | `starter-kit-expo`   | A stock gluestack-ui + NativeWind starter kit. No app code yet.     |

Commit `0670e4f` moved the app `apps/mobile` → `apps/mobile-3` and dropped a fresh gluestack starter into `apps/mobile`. Consequences:

- **Edit `apps/mobile-3/` for any app work.** `apps/mobile` is a scaffold to migrate _toward_, not the running app.
- `pnpm dev:mobile` and every `--filter @microflash/mobile` command correctly resolve to `apps/mobile-3`.
- **Root `pnpm test` is broken.** `jest.config.js` still references `<rootDir>/apps/mobile/jest.config.cjs`, which no longer exists (`Error: Can't find a root directory while resolving a config file path`). Run tests per-workspace, or point that path at `apps/mobile-3/jest.config.cjs`.
- Root `tsconfig.json` also still references `apps/mobile` (the starter kit) rather than `apps/mobile-3`.
- `apps/mobile` has no `dev` or `typecheck` script, so `pnpm -r typecheck` silently covers only 6 of 7 workspaces.

Lint and typecheck both pass as of this writing; only the root Jest runner is broken.

## Commands

```bash
pnpm dev:server        # tsx watch, port 3000
pnpm dev:mobile        # Expo dev server (-> apps/mobile-3)
pnpm dev:desktop       # electron-vite dev

pnpm typecheck         # pnpm -r typecheck (skips apps/mobile)
pnpm lint              # eslint . — only rules-checks apps/server/**
pnpm format            # prettier --write .
pnpm build             # pnpm -r build
```

Testing — prefer the per-workspace form while root Jest is broken:

```bash
pnpm --filter @microflash/server test
pnpm --filter @microflash/mobile test          # runs in apps/mobile-3

# single file
pnpm --filter @microflash/server test -- --runTestsByPath src/routes/decks.test.ts
# by name
pnpm --filter @microflash/server test -- -t "creates a deck"
```

Convention: `*.test.ts(x)` = unit, `*.spec.ts(x)` = integration. Tests are colocated with source. Integration specs need a real Postgres (`apps/server/.env.test`) and **self-skip with a warning** when the DB is unreachable — a green run does not prove they executed.

Database (from `apps/server`, or `--filter @microflash/server`):

```bash
pnpm db:push       # sync schema without a migration (fastest local setup)
pnpm db:migrate    # prisma migrate dev
pnpm db:generate   # regenerate client after schema edits
pnpm db:seed       # tsx prisma/seed.ts
pnpm db:studio
```

## Architecture

Five workspaces (`apps/*`, `packages/*`), pnpm + Node 20.11, `node-linker=hoisted`.

### Sprint is the central domain object

Everything routes through sprints, not individual cards. `Sprint` → ordered `SprintCard[]` → `Card`. Read `docs/sprint-lifecycle-spec.md` before touching sprint code — it is the canonical rule set.

State machine: `PENDING → ACTIVE → COMPLETED | ABANDONED`, with sources `HOME` / `DECK` / `PUSH`.

Non-obvious invariants:

- Sprints are created **PENDING** and become **ACTIVE** lazily on first `GET /api/sprints/:id`. That GET is a mutating operation.
- `resumableUntil` = 30 min, extended on every review submission. Expiry triggers **auto-abandon** on next access.
- Abandoning snoozes only **unreviewed** cards, for 2 hours (`Card.snoozedUntil`), so they don't immediately reappear.
- `complete` / `abandon` are idempotent; auto-abandon won't re-snooze.

Constants live in `apps/server/src/services/sprint-service.ts` (`RESUME_WINDOW_MINUTES`, `ABANDON_SNOOZE_MINUTES`, `DEFAULT_SPRINT_SIZE`).

### The push-notification pipeline

An in-process `node-cron` job (`services/scheduler.ts`, every 15 min UTC, guarded against overlapping runs) started from `index.ts` after `listen()`. It delegates to `services/notification-orchestrator.ts`, which is the piece to read first — its header comments the whole 7-step flow.

The ordering matters and is easy to break: the server **creates the sprint first, then sends the push carrying that `sprintId`**, then updates tracking on success and **deletes the orphaned sprint on failure**. Expo errors matching `DeviceNotRegistered` / `InvalidCredentials` / `Invalid Expo push token` cause the user's push token to be cleared.

Supporting services split by concern: `notification-eligibility.ts` (quiet hours, ≥2h cooldown, max/day, "no resumable sprint exists"), `notification-grouping.ts` (payload), `push-notifications.ts` (Expo transport), `due-cards.ts` (±7 min due window, 30 min per-card re-notify floor).

On device, `apps/mobile-3/app/_layout.tsx` registers the iOS notification category with Review/Snooze actions and handles responses — including cold start via `getLastNotificationResponseAsync()`. The **Snooze action calls `abandonSprint()`**, which is what triggers the server-side snooze semantics above.

### FSRS

`apps/server/src/services/fsrs.ts` implements FSRS-4.5 directly (no library). FSRS state is denormalized onto `Card` (stability, difficulty, elapsedDays, scheduledDays, reps, lapses, state, lastReview). `CardState` and `Rating` are re-exported from generated Prisma enums — those enums are the source of truth, don't redefine them.

### Client/server contract

- `packages/shared` — types only, consumed by server and clients.
- `packages/api-client` — platform-agnostic (`fetch`-based) client shared by mobile and desktop. Module-level config via `configureApiClient({ baseUrl, getAuthHeaders })`; `getAuthHeaders` may be async, which is how dev headers and real Clerk `getToken()` both fit.
- Both packages resolve to **`src/*.ts` directly** (`types`/`react-native`/`module` fields), so clients typecheck against source without a build step.
- `apps/mobile-3/lib/api.ts` configures the client at import time and re-exports everything — mobile code imports from `@/lib/api`, not the package.

### Server request pipeline

`src/index.ts` → cors → json → `clerkMiddleware()` → routers under `/api/*` → 404 handler → `errorHandler` (must stay last).

- **Auth** (`middlewares/auth.ts`): `requireAuth` (401) and `requireUser` (loads Prisma user onto `req.user`, auto-creating it). With `DEV_AUTH=1`, Clerk is bypassed entirely — `clerkMiddleware()` becomes a no-op and the `x-dev-clerk-id` header supplies the identity. Clerk is `require`d lazily so it isn't needed at all in dev.
- **Validation** (`middlewares/validate.ts`): Zod via `validate({ body?, query?, params? })`; read results from `req.validated.*`, not the raw request.
- **Errors** (`middlewares/error-handler.ts`): throw `ApiError(status, code, message)`, wrap async handlers in `asyncHandler()`. Response shape is always `{ error: { code, message, details? } }`.
- Prisma client is generated to `src/generated/prisma` (checked into the build via a copy step + `scripts/fix-prisma-imports.js`). Import the singleton: `import { prisma } from '@/lib/prisma'`.

### Desktop

`apps/desktop` — Electron + electron-vite + React 18 + Radix Themes + react-router-dom. Talks to the same server via `@microflash/api-client`. Independent of the mobile stack.

## Conventions worth repeating

- Files kebab-case; components PascalCase; hooks `useXyz`; types PascalCase.
- Path alias `@/*` → `apps/<app>/src/*` (server) or `apps/mobile-3/*` (mobile).
- **Server: never use `.js` extensions in imports** — enforced by an ESLint `no-restricted-imports` rule.
- Unused vars must be `_`-prefixed to pass lint.
- Prettier: single quotes, semicolons, trailing commas `all`, width 80.
- `strict: true` everywhere; server compiles to CommonJS.

## Docs are source of truth

`docs/app-overview.md`, `docs/app_concept.md`, `docs/app_screens.md`, `docs/navigation_model.md`, `docs/system_architecture.md`, `docs/sprint-lifecycle-spec.md`.

If code diverges from these, flag it and prefer moving the code toward the docs. Note that `docs/system_architecture.md` describes offline caching/sync and `.apkg` import as owned by the client — these are **not implemented**; the current clients call the API directly.

## Local setup

`LOCAL_DEV.md` has the full walkthrough plus curl smoke tests. Short version: copy both `.env.example` files, `db:push`, then `pnpm dev:server` + `pnpm dev:mobile`. Dev auth is header-based (`DEV_AUTH=1` server-side, `EXPO_PUBLIC_DEV_CLERK_ID` client-side) and auto-creates users on first request.
