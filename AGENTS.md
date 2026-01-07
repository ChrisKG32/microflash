# AGENTS.md — MicroFlash

Guidelines for agentic coding in this repo (product + code conventions).

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

- `apps/client` — React Native + Expo (expo-router)
- `apps/server` — Express + Prisma + PostgreSQL
- `packages/shared` — shared TypeScript types/utils

## Requirements

- Node.js 20.x (see `.nvmrc`)
- pnpm >= 9

---

## Commands (root)

```bash
pnpm dev:server        # Start server (tsx watch)
pnpm dev:client        # Start Expo dev server

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

# Client
pnpm --filter @microflash/client dev
pnpm --filter @microflash/client ios
pnpm --filter @microflash/client android
pnpm --filter @microflash/client web
pnpm --filter @microflash/client lint
pnpm --filter @microflash/client test
```

---

## Testing (Jest)

Jest is **multi-project** (`jest.config.js` references server + client configs).

Tests are colocated with source:

- Unit: `*.test.ts` / `*.test.tsx`
- Integration: `*.spec.ts` / `*.spec.tsx`

### Run a single test file

```bash
# Server (path relative to apps/server)
pnpm --filter @microflash/server test -- --runTestsByPath src/routes/decks.test.ts

# Client (path relative to apps/client)
pnpm --filter @microflash/client test -- --runTestsByPath components/ThemedText.test.tsx

# From root (select project explicitly)
pnpm test -- --selectProjects server --runTestsByPath apps/server/src/routes/decks.test.ts
pnpm test -- --selectProjects client --runTestsByPath apps/client/components/ThemedText.test.tsx
```

### Run tests by name

```bash
pnpm --filter @microflash/server test -- -t "creates a deck"
pnpm --filter @microflash/client test -- -t "renders correctly"
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

- Root `eslint.config.js` targets server files; client uses `expo lint`.
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
- Client: `@/*` → `apps/client/*`

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

## Client patterns (Expo + expo-router)

- Functional components with TypeScript
- `StyleSheet.create()` at bottom of file
- File-based routing in `apps/client/app/**`
- Notifications via `expo-notifications` (bootstrap in `app/_layout.tsx`)

---

## Dev environment

See `.env.example` files in `apps/server` and `apps/client`.

- Server: `DEV_AUTH=1` + header `x-dev-clerk-id`
- Client: `EXPO_PUBLIC_DEV_CLERK_ID`

---

## Cursor / Copilot rules

No `.cursor/rules/`, `.cursorrules`, or `.github/copilot-instructions.md` found.
