# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

MicroFlash is a **microlearning-first spaced-repetition app**. The core loop is a **micro-sprint**: 3–10 cards in ~30–90 seconds, surfaced by respectful, user-controlled push notifications. No subscription/monetization is in scope.

`AGENTS.md` holds the full conventions reference (formatting, naming, import grouping). This file covers commands, architecture, and current-state gotchas.

## Design constraint (from AGENTS.md)

**Do not hand-roll UI components or invent visual design.** gluestack-ui is the adopted component library and Radix `slate`/`blue` is the adopted palette — that decision is made, and the point of it is that there is nothing left to design. Compose the vendored primitives in `components/ui/` and use theme tokens; keep screens plainly styled.

The older form of this rule said to avoid design systems entirely until the MVP was done, so that a real one could be adopted later. That adoption is what the current migration is. Reach for a new wrapper component or a raw hex value only when no gluestack primitive and no token covers the case, and say why.

## ⚠️ Current work: the gluestack-ui migration

The `gluestack` branch is migrating the mobile app off hand-rolled `StyleSheet` components onto gluestack-ui v3 + NativeWind, themed from Radix `slate`/`blue` so light and dark both work. `apps/mobile-3` and the throwaway `starter-kit-expo` scaffold are **gone** — the app lives at `apps/mobile` and the package is `@microflash/mobile`, so directory and package name finally agree.

The gluestack component registry is vendored at `apps/mobile/components/ui/<name>/index.tsx` (54 components, no barrel — import deep, e.g. `@/components/ui/box`). Treat it as vendored: `npx gluestack-ui add <component>` should keep working, so keep local edits few and commented.

**The theming bug that stalled the first attempt** — do not reintroduce it. `global.css` once declared `--color-background-*` under a bare `*` selector. In `react-native-css-interop`, `*` registers as a _universal_ variable, and `getVar()` resolves universal vars (bucket 2) **before** the inherited vars (bucket 3) that `GluestackUIProvider` supplies via `<View style={[config[scheme]]}>`. That pinned the background to one ramp in both modes on native, while web looked fine because its provider emits real `:root{}` / `.dark{}` rules that outspecify `*`. Colors belong in `theme/tokens.ts`; if a global CSS var is ever genuinely needed it must be `:root{}` **and** `.dark:root{}`, never `*`. `theme/global-css.test.ts` enforces this.

Color has one source of truth, `theme/tokens.ts`, consumed three ways: `cssVars` → `gluestack-ui-provider/config.ts` (for `className`), `palette` → `theme/navigation.ts` (React Navigation chrome), and `palette` → `theme/use-token.ts` (imperative props). The third exists because `RefreshControl` is **not** cssInterop'd, and React Navigation `screenOptions`, the KaTeX `<style>` string in `CardContent`, and `react-native-markdown-display` all take plain color strings.

Every token change needs `expo start -c` — stale NativeWind CSS caching otherwise reads as a theming bug.

## Commands

```bash
pnpm dev:server        # tsx watch, port 3000
pnpm dev:mobile        # Expo dev server
pnpm dev:desktop       # electron-vite dev

pnpm typecheck         # pnpm -r typecheck (all workspaces)
pnpm lint              # eslint . — only rules-checks apps/server/**
pnpm format            # prettier --write .
pnpm build             # pnpm -r build
```

Testing — root `pnpm test` runs both projects (server + mobile); per-workspace is faster when iterating:

```bash
pnpm --filter @microflash/server test
pnpm --filter @microflash/mobile test

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

On device, `apps/mobile/app/_layout.tsx` registers the iOS notification category with Review/Snooze actions and handles responses — including cold start via `getLastNotificationResponseAsync()`. The **Snooze action calls `abandonSprint()`**, which is what triggers the server-side snooze semantics above.

### FSRS

`apps/server/src/services/fsrs.ts` implements FSRS-4.5 directly (no library). FSRS state is denormalized onto `Card` (stability, difficulty, elapsedDays, scheduledDays, reps, lapses, state, lastReview). `CardState` and `Rating` are re-exported from generated Prisma enums — those enums are the source of truth, don't redefine them.

### Client/server contract

- `packages/shared` — types only, consumed by server and clients.
- `packages/api-client` — platform-agnostic (`fetch`-based) client shared by mobile and desktop. Module-level config via `configureApiClient({ baseUrl, getAuthHeaders })`; `getAuthHeaders` may be async, which is how dev headers and real Clerk `getToken()` both fit.
- Both packages resolve to **`src/*.ts` directly** (`types`/`react-native`/`module` fields), so clients typecheck against source without a build step.
- `apps/mobile/lib/api.ts` configures the client at import time and re-exports everything — mobile code imports from `@/lib/api`, not the package.

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
- Path alias `@/*` → `apps/<app>/src/*` (server) or `apps/mobile/*` (mobile).
- **Server: never use `.js` extensions in imports** — enforced by an ESLint `no-restricted-imports` rule.
- Unused vars must be `_`-prefixed to pass lint.
- Prettier: single quotes, semicolons, trailing commas `all`, width 80.
- `strict: true` everywhere; server compiles to CommonJS.

## Docs are source of truth

`docs/app-overview.md`, `docs/app_concept.md`, `docs/app_screens.md`, `docs/navigation_model.md`, `docs/system_architecture.md`, `docs/sprint-lifecycle-spec.md`.

If code diverges from these, flag it and prefer moving the code toward the docs. Note that `docs/system_architecture.md` describes offline caching/sync and `.apkg` import as owned by the client — these are **not implemented**; the current clients call the API directly.

## Local setup

`LOCAL_DEV.md` has the full walkthrough plus curl smoke tests. Short version: copy both `.env.example` files, `db:push`, then `pnpm dev:server` + `pnpm dev:mobile`. Dev auth is header-based (`DEV_AUTH=1` server-side, `EXPO_PUBLIC_DEV_CLERK_ID` client-side) and auto-creates users on first request.
