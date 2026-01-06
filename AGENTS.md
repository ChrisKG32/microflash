# AGENTS.md - MicroFlash

Guidelines for AI agents working in this codebase.

## Project Overview

MicroFlash is a cross-platform spaced repetition flashcard app (iOS, Android, Web) built with:

- **Client**: React Native + Expo (file-based routing via expo-router)
- **Server**: Express.js + Prisma ORM + PostgreSQL
- **Shared**: Common TypeScript types and utilities

The app uses the FSRS algorithm for intelligent review scheduling and sends push notifications when cards are due.

## Repository Structure

```
microflash/
├── apps/
│   ├── client/          # React Native/Expo (@microflash/client)
│   └── server/          # Express API (@microflash/server)
├── packages/
│   └── shared/          # Shared types (@microflash/shared)
├── jest.config.js       # Root Jest multi-project config
├── jest.config.base.js  # Shared Jest base config
├── eslint.config.js     # Root ESLint flat config (server only)
├── tsconfig.base.json   # Shared TypeScript base config
└── pnpm-workspace.yaml  # pnpm workspace definition
```

## Build, Lint, and Test Commands

### Root-Level (pnpm workspaces)

```bash
pnpm dev:server          # Start server in watch mode (tsx watch)
pnpm dev:client          # Start Expo dev server
pnpm lint                # Run ESLint across all packages
pnpm lint:fix            # Auto-fix ESLint issues
pnpm format              # Format code with Prettier
pnpm format:check        # Check formatting
pnpm typecheck           # TypeScript type checking (all packages)
pnpm build               # Build all packages
pnpm clean               # Remove dist, build, .expo, node_modules
```

### Testing Commands

```bash
pnpm test                # Run all tests (Jest multi-project)
pnpm test:unit           # Run unit tests only (*.test.ts)
pnpm test:integration    # Run integration tests only (*.spec.ts)
pnpm test:watch          # Run tests in watch mode
pnpm test:coverage       # Run tests with coverage report
pnpm test:server         # Run server tests only
```

### Client Commands

```bash
pnpm --filter @microflash/client dev      # Expo dev server
pnpm --filter @microflash/client ios      # iOS simulator
pnpm --filter @microflash/client android  # Android emulator
pnpm --filter @microflash/client web      # Web dev server
pnpm --filter @microflash/client lint     # Expo lint (separate config)
pnpm --filter @microflash/client test     # Client tests (jest-expo)
```

### Server Commands

```bash
pnpm --filter @microflash/server dev         # Start with tsx watch
pnpm --filter @microflash/server build       # Compile TS + copy Prisma + fix imports
pnpm --filter @microflash/server start       # Run compiled dist/index.js
pnpm --filter @microflash/server typecheck   # Type check only
pnpm --filter @microflash/server test        # Run server tests
pnpm --filter @microflash/server db:generate # Generate Prisma client
pnpm --filter @microflash/server db:push     # Push schema to DB
pnpm --filter @microflash/server db:migrate  # Run migrations
pnpm --filter @microflash/server db:studio   # Open Prisma Studio
pnpm --filter @microflash/server db:seed     # Seed database with test data
```

## Code Style Guidelines

### Formatting (Prettier)

- Semicolons required
- Single quotes
- Trailing commas: all
- Print width: 80 chars
- Tab width: 2 spaces
- Arrow parens: always

### TypeScript

- Strict mode enabled across all packages
- **Server compiles to CommonJS** (see `tsconfig.base.json`: `"module": "CommonJS"`)
- Dev uses `tsx watch`, prod runs `node dist/index.js`
- Unused variables allowed if prefixed with `_` (e.g., `_unused`)

### Import Order

1. External packages (react, expo, express)
2. Internal packages (`@microflash/shared`)
3. Path aliases (`@/components`, `@/hooks`)
4. Relative imports (`./utils`, `../types`)

### Naming Conventions

- **Files**: kebab-case (`themed-text.tsx`, `use-theme-color.ts`)
- **Components**: PascalCase (`ThemedText`, `HelloWave`)
- **Functions/Variables**: camelCase (`handlePress`, `isLoading`)
- **Types/Interfaces**: PascalCase (`CardRating`, `ThemedTextProps`)
- **Hooks**: Prefix with `use` (`useThemeColor`, `useColorScheme`)

### React Native / Expo Patterns

- Functional components with TypeScript
- Extend base props for component types:
  ```typescript
  export type ThemedTextProps = TextProps & {
    lightColor?: string;
    darkColor?: string;
  };
  ```
- `StyleSheet.create()` at bottom of file
- Platform-specific files: `*.ios.tsx`, `*.web.ts`
- Path alias `@/*` maps to project root in client

### Express / Server Patterns

- Underscore prefix for unused params: `(_req, res) => {}`
- Environment variables via `process.env`
- CommonJS-style exports (compiled from ESM-style TS)

### Error Handling

- Use try/catch for async operations
- Return appropriate HTTP status codes
- Validate input before processing

## Server Middleware Conventions

### Authentication (`apps/server/src/middlewares/auth.ts`)

- `clerkMiddleware()` - Global middleware attaching Clerk auth state
- `requireAuth` - Returns 401 JSON if not authenticated (API-friendly)
- `requireUser` - Loads Prisma user by `clerkId`, attaches to `req.user`

Usage:

```typescript
router.post(
  '/',
  requireUser,
  asyncHandler(async (req, res) => {
    const user = req.user!; // Guaranteed by middleware
    // ...
  }),
);
```

### Validation (`apps/server/src/middlewares/validate.ts`)

- `validate({ body?, query?, params? })` - Zod schema validation
- Attaches validated data to `req.validated.{body, query, params}`
- Passes Zod errors to global error handler

Usage:

```typescript
router.post('/', validate({ body: createCardSchema }), asyncHandler(handler));
```

### Error Handling (`apps/server/src/middlewares/error-handler.ts`)

- `ApiError` class for throwing errors with status codes
- `asyncHandler()` wrapper for async route handlers
- Global `errorHandler` middleware returns consistent JSON:
  ```typescript
  { error: { code: string, message: string, details?: [...] } }
  ```

### Request Type Augmentation (`apps/server/src/types/express.ts`)

Express Request is extended with:

- `req.user?: User` - Prisma user (from `requireUser`)
- `req.validated?: { body?, query?, params? }` - Validated data (from `validate`)

## Database (Prisma)

### Schema Conventions

- Models: PascalCase (`User`, `Card`, `Deck`)
- Fields: camelCase (`nextReviewDate`, `createdAt`)
- Use `@default(cuid())` for IDs
- Include `createdAt` and `updatedAt` on all models
- Add `@@index` for frequently queried fields

### Prisma Client Generation

**Important**: Prisma client is generated to a non-standard location:

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}
```

- Generated client lives in `apps/server/src/generated/prisma`
- Server code imports from `@/generated/prisma`
- Build process copies generated client to `dist/generated/prisma`
- Post-build script (`scripts/fix-prisma-imports.js`) fixes import paths

After schema changes:

```bash
pnpm --filter @microflash/server db:generate  # Regenerate client
pnpm --filter @microflash/server db:migrate   # Create migration
```

## Testing

### Test Structure

- **Unit tests**: `*.test.ts` - Fast, isolated tests
- **Integration tests**: `*.spec.ts` - Tests with real dependencies (DB, etc.)

### Server Testing (`apps/server`)

- Jest + ts-jest + supertest
- Config: `apps/server/jest.config.js` (extends `jest.config.base.js`)
- Setup: `apps/server/src/testing/setup.ts`
- Uses `.env.test` for test database URL
- Mocking: `jest-mock-extended` for Prisma mocks

### Client Testing (`apps/client`)

- jest-expo + React Native Testing Library
- Config: `apps/client/jest.config.cjs`
- Setup: `apps/client/jest.setup.ts` (mocks for expo-router, reanimated, etc.)
- Special `transformIgnorePatterns` for pnpm hoisted packages

### Running Tests

```bash
pnpm test                         # All tests
pnpm test:unit                    # Unit tests only (*.test.ts)
pnpm test:integration             # Integration tests only (*.spec.ts)
pnpm --filter @microflash/server test  # Server tests only
```

## Client Monorepo Configuration

### Metro Config (`apps/client/metro.config.js`)

Metro is configured for pnpm workspaces:

- `watchFolders` includes monorepo root
- `nodeModulesPaths` resolves local then root node_modules
- `disableHierarchicalLookup` ensures consistent resolution

### ESLint

- Root `eslint.config.js` targets server only (flat config)
- Client uses separate `apps/client/eslint.config.js` (expo lint)

## Key Technical Details

### FSRS Algorithm

- Server-side only calculations
- Card states: NEW, LEARNING, REVIEW, RELEARNING
- Ratings: AGAIN, HARD, GOOD, EASY
- **Status**: Schema fields exist; scheduling logic is stubbed/planned

### Notifications

- **Status**: Routes exist but are stubbed; no scheduler code yet
- Planned: Background job every 15 minutes using `node-cron`
- Planned: Groups cards due within ±7 minute window
- Uses Expo Push Notifications

### Authentication

- Clerk for user auth (server: `@clerk/express`, client: planned)
- `clerkId` stored on User model
- Server middleware: `requireAuth`, `requireUser`

### Constraints

- Subdeck depth: Maximum 2 levels (planned enforcement)
- No offline support (initial version)
- FSRS calculations server-side only

## Environment Requirements

- Node.js >= 20.0.0 (`.nvmrc`: 20.11.0)
- pnpm >= 9.0.0
- PostgreSQL database (`DATABASE_URL` env var)
- Expo CLI for mobile development

## CI/CD

- **Status**: No CI configured yet (only `.github/workflows/.gitkeep` placeholder)
