# AGENTS.md — MicroFlash

Guidelines for agentic coding in this repo (product + code conventions).

## Important Agent Instructions

Never hand-roll UI components or invent visual design. **gluestack-ui v3 is the adopted component library** and **Radix `slate` + `blue` is the adopted palette**; both decisions are settled, and the whole point is that there is nothing left for you to design.

- Compose the vendored primitives in `apps/mobile/components/ui/` (import deep: `@/components/ui/box`). Do not write a wrapper when a primitive fits.
- Use theme tokens, never raw hex. `bg-background-0`, `text-typography-500`, `border-outline-100`, `bg-primary-500`. For values that can't take a `className` — React Navigation `screenOptions`, `RefreshControl`, WebView HTML — use `useToken()` from `@/theme/use-token`.
- Keep screens plainly styled. Minimal still applies to layout and ornamentation; it no longer means "avoid the component library".

This supersedes the earlier instruction to avoid design systems until the MVP was finished — that rule existed so a real system could be adopted later without unpicking bespoke styling, and adopting gluestack is that step. If you genuinely need a new wrapper or a literal color, say why in the PR.

## Product context (read docs first)

MicroFlash is a **microlearning-first SRS** app:

- Core loop: **micro-sprints** (3–10 cards, ~30–90 seconds)
- Priority-aware selection (deck + card priority)
- Respectful, user-controlled notifications (quiet hours, cooldowns ≥2h, max/day, snooze semantics)
- **No subscription** (completely free; monetization not in scope)

Source-of-truth specs:

- `docs/app-overview.md` — product summary + tech overview
- `docs/app_concept.md` — concept brief, MVP scope, risks
- `docs/app_screens.md` — screen inventory + states
- `docs/navigation_model.md` — navigation structure + flows

If implementation diverges from docs, flag it and prefer updating code toward docs.

---

## Repo layout (pnpm workspaces)

- `apps/mobile` — React Native + Expo (expo-router)
- `apps/desktop` — Electron + React (electron-vite)
- `apps/server` — Express + Prisma + PostgreSQL
- `packages/api-client` — shared API client and the types it returns

## Requirements

- Node.js 22.13 (see `.nvmrc`)
- pnpm >= 9

---

## Commands (root)

```bash
pnpm dev:server        # Start server (tsx watch)
pnpm dev:mobile        # Start Expo dev server
pnpm dev:desktop       # Start Electron app

pnpm build             # Build all workspaces
pnpm typecheck         # Typecheck all workspaces

pnpm lint              # ESLint (server files)
pnpm lint:fix
pnpm format            # Prettier write
pnpm format:check

pnpm test              # Jest (multi-project: server + client)
pnpm test:watch
pnpm test:coverage
pnpm test:unit         # *.test.ts only
pnpm test:integration  # *.spec.ts only
```

### Workspace commands

```bash
# Server
pnpm --filter @microflash/server dev
pnpm --filter @microflash/server build
pnpm --filter @microflash/server typecheck
pnpm --filter @microflash/server test
pnpm --filter @microflash/server db:generate
pnpm --filter @microflash/server db:migrate
pnpm --filter @microflash/server db:push
pnpm --filter @microflash/server db:seed
pnpm --filter @microflash/server db:studio

# Mobile
pnpm --filter @microflash/mobile dev
pnpm --filter @microflash/mobile ios
pnpm --filter @microflash/mobile android
pnpm --filter @microflash/mobile web
pnpm --filter @microflash/mobile lint
pnpm --filter @microflash/mobile test
```

---

## Testing (Jest)

Jest is **multi-project** (`jest.config.js` references server + mobile configs).

Tests are colocated with source:

- Unit: `*.test.ts` / `*.test.tsx`
- Integration: `*.spec.ts` / `*.spec.tsx`

### Run a single test file

```bash
# Server (path relative to apps/server)
pnpm --filter @microflash/server test -- --runTestsByPath src/routes/decks.test.ts

# Mobile (path relative to apps/mobile)
pnpm --filter @microflash/mobile test -- --runTestsByPath components/themed-text.test.tsx

# From root (select project explicitly)
pnpm test -- --selectProjects server --runTestsByPath apps/server/src/routes/decks.test.ts
pnpm test -- --selectProjects mobile --runTestsByPath apps/mobile/components/themed-text.test.tsx
```

### Run tests by name

```bash
pnpm --filter @microflash/server test -- -t "creates a deck"
pnpm --filter @microflash/mobile test -- -t "renders correctly"
```

---

## Formatting & lint (enforced)

### Prettier (`.prettierrc.json`)

- Semicolons required
- Single quotes
- Trailing commas: all
- Print width: 80
- Tab width: 2
- Arrow parens: always

### ESLint

- Root `eslint.config.js` targets server files; mobile uses `expo lint`.
- Unused vars allowed only if prefixed with `_` (e.g. `_unused`).
- **Server:** do not use `.js` extensions in imports.

### TypeScript

- `strict: true` across packages.
- Server builds to CommonJS.

---

## Import conventions

Preferred grouping:

1. External packages
2. Workspace packages (`@microflash/shared`)
3. Path aliases (`@/...`)
4. Relative imports

Path aliases:

- Server: `@/*` → `apps/server/src/*`
- Mobile: `@/*` → `apps/mobile/*`

---

## Naming conventions

- Files: kebab-case (`due-cards.ts`, `notification-orchestrator.ts`)
- Components: PascalCase
- Functions/vars: camelCase
- Types/interfaces: PascalCase
- Hooks: `useXyz`
- Expo Router routes: follow router conventions (`app/(tabs)/index.tsx`, `app/deck/[id].tsx`)

---

## Server patterns (Express + Prisma)

### Auth (`apps/server/src/middlewares/auth.ts`)

- `requireAuth` — 401 if not authenticated
- `requireUser` — loads Prisma user, attaches `req.user`

Dev shortcut: `DEV_AUTH=1` allows `x-dev-clerk-id` header bypass.

### Validation (`apps/server/src/middlewares/validate.ts`)

- Use Zod schemas: `validate({ body?, query?, params? })`
- Parsed data on `req.validated.{body,query,params}`

### Error handling (`apps/server/src/middlewares/error-handler.ts`)

- Throw `ApiError(statusCode, code, message)` for expected failures
- Wrap async routes with `asyncHandler()`
- Response shape: `{ error: { code, message, details? } }`

### Prisma

- Client generated to `apps/server/src/generated/prisma`
- Import: `import { prisma } from '@/lib/prisma'`
- After schema changes: `db:generate` then `db:migrate`

---

## Mobile patterns (Expo + expo-router)

- Functional components with TypeScript
- No `StyleSheet` — compose the vendored gluestack primitives in
  `apps/mobile/components/ui/` and style with `className` tokens. ESLint
  enforces this for `app/**` and `components/**`.
- Repeated compositions live in `apps/mobile/components/ui-app/`
  (`screen-state`, `labeled-slider`, `settings-list`) and
  `apps/mobile/components/card/` (`card-editor-form`). Reach for one of these
  before writing a screen-local helper.
- File-based routing in `apps/mobile/app/**`
- Notifications via `expo-notifications` (bootstrap in `app/_layout.tsx`)

---

## Dev environment

See `.env.example` files in `apps/server` and `apps/mobile`.

- Server: `DEV_AUTH=1` + header `x-dev-clerk-id`
- Mobile: `EXPO_PUBLIC_DEV_CLERK_ID`

---

## Cursor / Copilot rules

No `.cursor/rules/`, `.cursorrules`, or `.github/copilot-instructions.md` found.
