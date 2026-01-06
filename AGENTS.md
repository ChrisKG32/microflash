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
apps/client/     # React Native/Expo (@microflash/client)
apps/server/     # Express API (@microflash/server)
packages/shared/ # Shared types (@microflash/shared)
```

## Build, Lint, and Test Commands

### Root-Level (pnpm workspaces)

```bash
pnpm dev:server          # Start server in watch mode
pnpm dev:client          # Start Expo dev server
pnpm lint                # Run ESLint across all packages
pnpm lint:fix            # Auto-fix ESLint issues
pnpm format              # Format code with Prettier
pnpm format:check        # Check formatting
pnpm type-check          # TypeScript type checking
pnpm build               # Build all packages
pnpm clean               # Remove dist, build, .expo, node_modules
```

### Client Commands

```bash
pnpm --filter @microflash/client dev      # Expo dev server
pnpm --filter @microflash/client ios      # iOS simulator
pnpm --filter @microflash/client android  # Android emulator
pnpm --filter @microflash/client web      # Web dev server
pnpm --filter @microflash/client lint     # Expo lint
```

### Server Commands

```bash
pnpm --filter @microflash/server dev         # Start with tsx watch
pnpm --filter @microflash/server build       # Compile TypeScript
pnpm --filter @microflash/server type-check  # Type check only
pnpm --filter @microflash/server db:generate # Generate Prisma client
pnpm --filter @microflash/server db:push     # Push schema to DB
pnpm --filter @microflash/server db:migrate  # Run migrations
pnpm --filter @microflash/server db:studio   # Open Prisma Studio
```

### Running Tests

Tests not yet configured. When added:

```bash
pnpm test                         # Run all tests
pnpm test -- path/to/file.test.ts # Run single test file
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
- Server uses ESM (`"type": "module"`)
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
- ESM exports

### Error Handling

- Use try/catch for async operations
- Return appropriate HTTP status codes
- Validate input before processing

### Database (Prisma)

- Models: PascalCase (`User`, `Card`, `Deck`)
- Fields: camelCase (`nextReviewDate`, `createdAt`)
- Use `@default(cuid())` for IDs
- Include `createdAt` and `updatedAt` on all models
- Add `@@index` for frequently queried fields

## Key Technical Details

### FSRS Algorithm

- Server-side only calculations
- Card states: NEW, LEARNING, REVIEW, RELEARNING
- Ratings: AGAIN, HARD, GOOD, EASY

### Notifications

- Background job every 15 minutes
- Groups cards due within ±7 minute window
- Uses Expo Push Notifications

### Authentication

- Clerk for user auth
- `clerkId` stored on User model

### Constraints

- Subdeck depth: Maximum 2 levels
- No offline support (initial version)
- FSRS calculations server-side only

## Environment Requirements

- Node.js >= 20.0.0 (`.nvmrc`: 20.11.0)
- pnpm >= 9.0.0
- PostgreSQL database (`DATABASE_URL` env var)
- Expo CLI for mobile development

## GitHub Integration

When you need to fetch GitHub issue details, PR information, or browse related issues:

1. Use the `github-reader` subagent by mentioning `@github-reader` in your message
2. Ask it to return a **concise summary** of requirements, not the full issue body
3. The subagent can read issues, sub-issues, PRs, and comments

Example usage:

```
@github-reader Summarize issue #42 and list any sub-issues or linked issues
```

The GitHub tools are disabled globally to minimize context usage. Only the `github-reader` subagent has access to them.
