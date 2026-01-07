# Clerk Auth (Production Ready)

## Title

Clerk auth (Expo client + Express server) + DEV_AUTH fallback

## Goal

Replace dev-only header auth with real Clerk sign-in in production, while preserving local DEV_AUTH for development.

## Scope

- Client: Clerk provider, sign-in UI, authenticated fetch.
- Server: Clerk token verification, user upsert on first auth.

## Acceptance Criteria

- Signed-out users cannot access core app routes.
- Client sends `Authorization: Bearer <token>` in production mode.
- Server verifies Clerk auth and upserts user safely on first authenticated request.
- DEV_AUTH (`x-dev-clerk-id` header) continues to work for local development.
- `/api/me` returns onboarding status and notification preferences.

## Implementation Details

### Client

```typescript
// ClerkProvider wraps app in _layout.tsx
import { ClerkProvider } from '@clerk/expo';

// Authenticated fetch helper
import { useAuth } from '@clerk/expo';

const { getToken } = useAuth();
const token = await getToken();
// Send: Authorization: Bearer <token>
```

### Server

```typescript
// Production: verify Clerk JWT
import { getAuth } from '@clerk/express';

// requireUser middleware:
// 1. Get clerkId from token (prod) or header (dev)
// 2. Upsert user if not exists (safe for first sign-in)
// 3. Attach user to req.user
```

## Subtasks

- [ ] **03.1** Add `@clerk/expo` to client dependencies.
- [ ] **03.2** Wrap app with `ClerkProvider` in root layout.
- [ ] **03.3** Create Sign In screen using Clerk hosted UI.
- [ ] **03.4** Implement `useAuthenticatedFetch` hook that uses `getToken()`.
- [ ] **03.5** Update `lib/api.ts` to use authenticated fetch (with DEV_AUTH fallback).
- [ ] **03.6** Server: update `requireUser` to upsert user on first authenticated request.
- [ ] **03.7** Server: ensure `clerkMiddleware()` is properly configured for production.
- [ ] **03.8** Update `/api/me` to return onboarding status and notification prefs.
- [ ] **03.9** Add environment variables: `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`.
- [ ] **03.10** Test both DEV_AUTH and production Clerk flows.

## Environment Variables

### Client

```bash
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_DEV_CLERK_ID=user_local_dev  # Dev mode only
```

### Server

```bash
CLERK_SECRET_KEY=sk_test_...
DEV_AUTH=1  # Enable dev mode (omit for production)
```

## Dependencies

- Ticket 01 (user fields for onboarding status).

## Estimated Effort

Medium
