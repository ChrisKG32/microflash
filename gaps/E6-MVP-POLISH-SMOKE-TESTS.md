# E6 — MVP Polish + Smoke Tests

## Overview

**Goal:** Stabilize the implemented MVP core loop and prevent regressions by:

- Eliminating known crashers and edge-case bugs
- Making loading/empty/error states consistent across core screens
- Adding lightweight automated smoke coverage plus a repeatable manual smoke checklist

**Effort estimate:** M (2–4 days)

**Dependencies:** E2 (Sprint system), E3 (Navigation + screens), E4 (Notifications MVP), E5 (Authoring + rendering)

---

## Scope Boundaries

### Explicitly IN scope

- Core screens polish: Home, Decks List, Deck Detail, Card Editor, Sprint Review, Sprint Complete, Notification Controls
- Push tap navigation correctness (deep link to sprint with Home as safe back target)
- Sprint lifecycle correctness (resume window, auto-abandon, snooze semantics)
- Harden API client behaviors (especially 204 No Content responses)
- Minimal automated smoke tests (server + client) integrated into existing Jest suite
- Manual smoke checklist as release gate

### Explicitly OUT of scope (deferred to E7)

- Quiet hours
- Backlog threshold notifications ("only notify when backlog ≥ X")
- Anki import flow
- Full onboarding + Clerk authentication gating

---

## Tickets

### E6.1 — Polish backlog audit

**Goal:** Create a concrete list of polish items mapped to screens/endpoints.

**Scope:**

1. Re-verify E2/E3/E4 behaviors against canonical specs:
   - `docs/sprint-lifecycle-spec.md` (resumableUntil extension, auto-abandon idempotency, snooze only unreviewed sprint cards)
   - `docs/navigation_model.md` (push tap stack, back behavior, Sprint Complete return behavior)
2. Identify all user-visible states per screen:
   - Loading
   - Empty ("nothing due", "no decks", "no cards", "no eligible cards")
   - Error (network/server/validation)
3. Document gaps as actionable items for E6.2–E6.5

**DoD:** Written gap list with screen/endpoint mapping; items assigned to subsequent E6 tickets.

**Effort:** XS (<2h)

---

### E6.2 — Client: Normalize loading/empty/error patterns

**Goal:** Predictable, minimal, consistent UI behavior across core screens.

**Scope:**

1. **Standardize state handling patterns** across:
   - Home (`app/(tabs)/index.tsx`)
   - Decks List (`app/(tabs)/decks.tsx`)
   - Deck Detail (`app/deck/[id].tsx`)
   - Card Editor (`app/card/[id].tsx`, `app/card/new.tsx`)
   - Sprint Review (`app/sprint/[id].tsx`)
   - Sprint Complete (`app/sprint/complete.tsx`)
   - Notification Controls (`app/notification-controls.tsx`)

2. **For each screen, ensure:**
   - Loading state: spinner or skeleton (consistent)
   - Empty state: clear message + actionable CTA (e.g., "Create deck", "Add card", "You're clear!")
   - Error state: user-friendly message + Retry button (or Back/Home fallback)

3. **Stop relying on brittle error message substring matching:**
   - Use server error `code` (from `{ error: { code, message } }`) for branching logic
   - Example: check `err.code === 'NO_DUE_CARDS'` instead of `err.message.includes('No cards')`

**DoD:** All core screens have consistent loading/empty/error handling; no "dead end" states.

**Effort:** S-M (1–2 days)

**Files likely touched:**

```
apps/client/app/(tabs)/index.tsx
apps/client/app/(tabs)/decks.tsx
apps/client/app/deck/[id].tsx
apps/client/app/card/[id].tsx
apps/client/app/card/new.tsx
apps/client/app/sprint/[id].tsx
apps/client/app/sprint/complete.tsx
apps/client/app/notification-controls.tsx
```

---

### E6.3 — Client: Fix API client 204 handling + error robustness

**Goal:** Eliminate crash paths in the API client layer.

**Scope:**

1. **Fix 204 No Content handling:**
   - Current bug: `request()` in `apps/client/lib/api.ts` always calls `response.json()`, which throws on 204 responses
   - Fix: Check `response.status === 204` (or `!response.headers.get('content-length')`) before parsing JSON
   - Affected functions: `deleteDeck()`, `deleteCard()`, `unsnoozeCard()`

2. **Improve error handling:**
   - Handle non-JSON error bodies gracefully
   - Ensure network timeouts/offline errors surface as retry-able states (not silent failures)

**DoD:** `deleteDeck()` and `deleteCard()` succeed on 204 responses; network errors produce actionable error states.

**Effort:** S (<1 day)

**Files touched:**

```
apps/client/lib/api.ts
```

**Implementation guidance:**

```typescript
// In request() function, before line 46:
async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  // ... existing code ...

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 204 No Content (e.g., DELETE responses)
  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json();

  if (!response.ok) {
    const error = data.error || { code: 'UNKNOWN', message: 'Unknown error' };
    throw new ApiError(response.status, error.code, error.message);
  }

  return data;
}
```

---

### E6.4 — Client: Navigation edge polish

**Goal:** Push tap and Sprint Complete navigation behave per spec.

**Scope:**

1. **Push tap → Sprint Review:**
   - Cold start produces safe back stack (Home beneath)
   - Warm start navigates correctly to sprint

2. **Sprint Complete behaviors:**
   - "Done" returns to launch context:
     - If launched from Home → return to Home
     - If launched from Deck Detail → return to Deck Detail
     - If launched from push (cold start) → return to Home
   - "One more sprint" replaces current sprint route with new sprint (not push)

3. **Resume CTA on Home:**
   - 5-second visibility window behaves consistently
   - Tapping resume navigates to the correct sprint

**DoD:** Navigation flows match `docs/navigation_model.md` for all sprint entry points.

**Effort:** S (<1 day)

**Files likely touched:**

```
apps/client/app/_layout.tsx
apps/client/app/(tabs)/index.tsx
apps/client/app/sprint/[id].tsx
apps/client/app/sprint/complete.tsx
```

---

### E6.5 — Server: Lifecycle + error shape consistency audit

**Goal:** Fewer "weird states", consistent error responses, predictable lifecycle rules.

**Scope:**

1. **Sprint lifecycle/idempotency verification:**
   - `GET /api/sprints/:id`: auto-abandon logic triggers only when appropriate; idempotent (doesn't re-snooze repeatedly)
   - `POST /api/sprints/:id/complete`: safe on repeated calls
   - `POST /api/sprints/:id/abandon`: safe on repeated calls; snoozes only unreviewed sprint cards (≥2h)

2. **Notification eligibility robustness:**
   - `nextEligiblePushTime` always computed safely for Home summary
   - Respects: notifications toggle, cooldown (≥2h), max/day, suppress while resumable sprint exists

3. **Error shape consistency:**
   - Confirm all expected failures return `{ error: { code, message, details? } }`
   - Client can reliably branch on `code`

**DoD:** Lifecycle edge cases handled correctly; error responses are consistent.

**Effort:** S (<1 day)

**Files likely touched:**

```
apps/server/src/routes/sprints.ts
apps/server/src/routes/home.ts
apps/server/src/services/notification-eligibility.ts (if exists)
apps/server/src/middlewares/error-handler.ts
```

---

### E6.6 — Server: Automated smoke tests (sprint lifecycle)

**Goal:** Prevent regressions in core sprint flows via automated tests.

**Scope:** Add route-level smoke tests to the existing server Jest suite.

**Test cases:**

1. **Happy path:** `POST /api/sprints/start` → `POST /api/sprints/:id/review` → `POST /api/sprints/:id/complete`
   - Assert: sprint transitions PENDING → ACTIVE → COMPLETED
   - Assert: card FSRS state updated after review

2. **Auto-abandon on expired resumableUntil:**
   - Create sprint, set `resumableUntil` in the past
   - `GET /api/sprints/:id` triggers auto-abandon
   - Assert: status = ABANDONED, remaining cards snoozed ≥2h

3. **Snooze/abandon idempotency + scope:**
   - `POST /api/sprints/:id/abandon` twice
   - Assert: second call is no-op (no error, no re-snooze)
   - Assert: only unreviewed sprint cards are snoozed

**DoD:** Tests pass in `pnpm test`; cover the three cases above.

**Effort:** S-M (1–2 days)

**Files to create/modify:**

```
apps/server/src/routes/sprints.test.ts (add test cases)
```

**Test pattern (follows existing conventions):**

```typescript
describe('Sprint lifecycle smoke tests', () => {
  describe('happy path', () => {
    it('start → review → complete transitions correctly', async () => {
      // Mock prisma to return appropriate sprint/card data
      // POST /api/sprints/start
      // POST /api/sprints/:id/review
      // POST /api/sprints/:id/complete
      // Assert status transitions
    });
  });

  describe('auto-abandon', () => {
    it('GET sprint with expired resumableUntil triggers abandon', async () => {
      // Mock sprint with resumableUntil in the past
      // GET /api/sprints/:id
      // Assert status = ABANDONED
      // Assert remaining cards snoozed
    });
  });

  describe('abandon idempotency', () => {
    it('double abandon is safe and only snoozes unreviewed cards', async () => {
      // POST /api/sprints/:id/abandon twice
      // Assert no error on second call
      // Assert snooze count matches unreviewed only
    });
  });
});
```

---

### E6.7 — Client: Automated smoke tests (API client + Home screen)

**Goal:** Prevent regressions in critical client paths via automated tests.

**Scope:** Add tests to the existing client Jest suite.

**Test cases:**

1. **API client 204 handling:**
   - `deleteDeck()` succeeds on 204 No Content response
   - `deleteCard()` succeeds on 204 No Content response

2. **Home screen states (optional, lower priority):**
   - Renders loading state initially
   - Renders success state with due count
   - Renders empty state ("You're clear!")

**DoD:** Tests pass in `pnpm test`; cover at minimum the 204 handling cases.

**Effort:** S (<1 day)

**Files to create:**

```
apps/client/lib/api.test.ts
```

**Test implementation (204 handling):**

```typescript
/**
 * Smoke tests for API client edge cases.
 */

describe('API client', () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      EXPO_PUBLIC_API_URL: 'http://test-api',
      EXPO_PUBLIC_DEV_CLERK_ID: 'test_user',
    };
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = originalEnv;
  });

  describe('deleteDeck', () => {
    it('succeeds on 204 No Content response', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 204,
        headers: new Headers(),
      });

      const { deleteDeck } = await import('./api');
      await expect(deleteDeck('deck-123')).resolves.toBeUndefined();

      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-api/api/decks/deck-123',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });

  describe('deleteCard', () => {
    it('succeeds on 204 No Content response', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 204,
        headers: new Headers(),
      });

      const { deleteCard } = await import('./api');
      await expect(deleteCard('card-456')).resolves.toBeUndefined();

      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-api/api/cards/card-456',
        expect.objectContaining({ method: 'DELETE' }),
      );
    });
  });
});
```

---

### E6.8 — Manual smoke checklist + release gate

**Goal:** Repeatable manual verification before release.

**Scope:** Execute the checklist below on a seeded/dev account.

**Manual smoke checklist:**

#### Deck/Card CRUD

- [ ] Create deck → create card → card appears in deck
- [ ] Edit card front/back → changes persist
- [ ] Edit card priority → changes persist
- [ ] Delete card → card removed from deck (no crash)
- [ ] Delete deck → deck removed from list (no crash)
- [ ] Edit deck title → changes persist
- [ ] Edit deck priority → changes persist

#### Sprint lifecycle

- [ ] Start sprint from Home → review all cards → complete → return to Home
- [ ] Start sprint from Deck Detail → review all cards → complete → return to Deck Detail
- [ ] Leave sprint mid-way → return within 30 min → resume works (cards in same position)
- [ ] Leave sprint mid-way → wait 30+ min → sprint auto-abandoned, remaining cards snoozed ≥2h
- [ ] Start sprint when nothing due → proper empty state (no broken UI)
- [ ] Sprint Complete "One more sprint" → new sprint starts (if cards available)

#### Push notifications

- [ ] Receive push notification → tap → Sprint Review opens
- [ ] Push tap (cold start) → back returns to Home
- [ ] Push tap (warm start) → back returns to previous screen or Home
- [ ] Snooze push notification → sprint abandoned + remaining cards snoozed ≥2h
- [ ] Toggle notifications off → no pushes sent
- [ ] Toggle notifications on → pushes resume (respecting cooldown)

#### Notification settings

- [ ] Adjust cooldown → server respects new value (wait for cooldown before next push)
- [ ] Adjust max per day → server respects new value
- [ ] Permission denied state → clear guidance shown + "Open Settings" link works

#### Content rendering

- [ ] Card with **markdown** renders correctly in Sprint Review
- [ ] Card with **LaTeX** renders correctly in Sprint Review
- [ ] Card with **invalid LaTeX** doesn't crash (shows fallback)
- [ ] Card Editor preview matches Sprint Review rendering

#### Priority

- [ ] Deck priority slider updates persist
- [ ] Card priority slider updates persist
- [ ] Priority affects sprint ordering tie-breaks (higher priority cards appear first when due dates equal)

#### Error states

- [ ] Network error on Home → shows error state with Retry
- [ ] Network error on Deck Detail → shows error state with Retry
- [ ] Network error during sprint review → shows error with Retry (doesn't lose progress)

**DoD:** All checklist items pass; any failures are documented and fixed before release.

**Effort:** S (<1 day for execution)

---

## Definition of Done (E6 overall)

- [ ] E6.1 audit complete; gap list documented
- [ ] E6.2 UI states normalized across all core screens
- [ ] E6.3 API client handles 204 correctly; no JSON parse crashes
- [ ] E6.4 Navigation edge cases work per spec
- [ ] E6.5 Server lifecycle/error audit complete
- [ ] E6.6 Server smoke tests pass in `pnpm test`
- [ ] E6.7 Client smoke tests pass in `pnpm test`
- [ ] E6.8 Manual smoke checklist passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes (includes new smoke tests)
- [ ] No known crashers in core flows

---

## Execution Order (Recommended)

| Order | Ticket | Description                  | Effort |
| ----- | ------ | ---------------------------- | ------ |
| 1     | E6.1   | Polish backlog audit         | XS     |
| 2     | E6.3   | Fix API client 204 handling  | S      |
| 3     | E6.7   | Client smoke tests (204)     | S      |
| 4     | E6.5   | Server lifecycle/error audit | S      |
| 5     | E6.6   | Server smoke tests           | S-M    |
| 6     | E6.2   | Normalize UI states          | S-M    |
| 7     | E6.4   | Navigation edge polish       | S      |
| 8     | E6.8   | Manual smoke checklist       | S      |

**Rationale:**

- E6.3 first: unblocks E6.7 (tests need the fix to pass)
- E6.5/E6.6 can run in parallel with E6.2/E6.4
- E6.8 is the final gate after all other tickets complete

---

## Risks & Mitigations

| Risk                                            | Mitigation                                                                 |
| ----------------------------------------------- | -------------------------------------------------------------------------- |
| UI normalization takes longer than expected     | Keep changes minimal; no design system work; just consistency              |
| Server tests require complex Prisma mocking     | Follow existing test patterns; mock at the same level as current tests     |
| Navigation edge cases are hard to test manually | Document exact steps in checklist; consider adding client navigation tests |
| 204 fix breaks other endpoints                  | Write tests first (E6.7); ensure fix is narrowly scoped                    |

---

## Appendix: Current State Analysis

### Known issues (from codebase exploration)

1. **API client 204 crash:** `apps/client/lib/api.ts` line 46 always calls `response.json()`, which throws on 204 responses from DELETE endpoints.

2. **Inconsistent error handling:** Some screens use `err.message.includes('...')` for branching; others use `Alert.alert()`. Server error codes exist but are underutilized.

3. **No client screen tests:** Only `ThemedText` and `ThemedView` have tests; no coverage for actual screens or API client.

4. **Server tests use inconsistent 404 shapes:** Some test helpers return `{ error: 'string' }` while the real app returns `{ error: { code, message } }`.

### Files with loading/empty/error states (audit targets for E6.2)

| Screen                | File                            | Has Loading | Has Empty | Has Error |
| --------------------- | ------------------------------- | ----------- | --------- | --------- |
| Home                  | `app/(tabs)/index.tsx`          | ✓           | ✓         | ✓         |
| Decks List            | `app/(tabs)/decks.tsx`          | ✓           | ✓         | ✓         |
| Deck Detail           | `app/deck/[id].tsx`             | ✓           | ✓         | ✓         |
| Card Editor (edit)    | `app/card/[id].tsx`             | ✓           | N/A       | ✓         |
| Card Editor (new)     | `app/card/new.tsx`              | Partial     | N/A       | Alert     |
| Sprint Review         | `app/sprint/[id].tsx`           | ✓           | ✓         | ✓         |
| Sprint Complete       | `app/sprint/complete.tsx`       | ✓           | N/A       | ✓         |
| Notification Controls | `app/notification-controls.tsx` | ✓           | N/A       | ✓         |

**Legend:** ✓ = implemented, Partial = incomplete, Alert = uses Alert.alert() instead of inline error state
