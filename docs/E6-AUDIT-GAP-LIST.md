# E6.1 — Polish Backlog Audit: Gap List

**Date:** 2026-01-08  
**Status:** Complete

This document captures the gaps identified during the E6.1 audit, mapped to screens/endpoints and assigned to subsequent E6 tickets.

---

## 1. Sprint Lifecycle Verification (vs. `docs/sprint-lifecycle-spec.md`)

### 1.1 resumableUntil Extension

**Spec:** On any review submission, extend `resumableUntil = now + 30 minutes`  
**Status:** VERIFIED - `sprint-service.ts` extends resumableUntil on each review

### 1.2 Auto-Abandon Idempotency

**Spec:** Auto-abandon is idempotent (won't re-snooze already-snoozed cards)  
**Status:** VERIFIED - `abandonSprint` checks if sprint is already ABANDONED/COMPLETED and returns early

### 1.3 Snooze Only Unreviewed Cards

**Spec:** Only unreviewed SprintCards have their cards snoozed  
**Status:** VERIFIED - `abandonSprint` filters for `result === null` before snoozing

### 1.4 Complete/Abandon Idempotency

**Spec:** Safe to call multiple times; no-op if already COMPLETED/ABANDONED  
**Status:** VERIFIED - Both endpoints handle already-terminal states gracefully

---

## 2. Navigation Verification (vs. `docs/navigation_model.md`)

### 2.1 Push Tap Stack (Cold Start)

**Spec:** Stack should be `MainTabs(Home)` -> `Sprint Review`. Back returns to Home.  
**Status:** PARTIAL - Client passes `returnTo: '/'` but cold start stack construction not explicitly handled  
**Gap:** Need to verify/ensure cold start from push creates proper back stack  
**Assigned to:** E6.4

### 2.2 Sprint Complete Return Behavior

**Spec:** "Done" returns to launch context (Home/Deck Detail/Home for push cold start)  
**Status:** VERIFIED - Uses `returnTo` param correctly

### 2.3 "One More Sprint" Behavior

**Spec:** Replaces current sprint route with new sprint (not push)  
**Status:** VERIFIED - Uses `router.replace()` correctly

### 2.4 Resume CTA 5-Second Window

**Spec:** CTA includes 5-second visibility; disappears if not tapped  
**Status:** VERIFIED - `RESUME_CTA_DURATION_MS = 5000` with auto-hide timer

---

## 3. User-Visible States Audit

### 3.1 Home Screen (`app/(tabs)/index.tsx`)

| State               | Implemented                                         | Gap  |
| ------------------- | --------------------------------------------------- | ---- |
| Loading             | Yes - ActivityIndicator + "Loading..."              | None |
| Empty (nothing due) | Yes - "You're all caught up!" with Review Ahead CTA | None |
| Error               | Yes - Error message + Retry button                  | None |
| Resume CTA          | Yes - 5-second auto-hide                            | None |

**Issues Found:**

- Error handling uses `err.message.includes('No cards')` for branching (line 117)
- **Assigned to:** E6.2

### 3.2 Decks List (`app/(tabs)/decks.tsx`)

| State            | Implemented                                  | Gap  |
| ---------------- | -------------------------------------------- | ---- |
| Loading          | Yes - ActivityIndicator + "Loading decks..." | None |
| Empty (no decks) | Yes - "No decks yet" with create CTA         | None |
| Error            | Yes - Error message + Retry button           | None |

**Issues Found:**

- Uses `Alert.alert()` for create deck errors instead of inline error state
- **Assigned to:** E6.2 (minor - acceptable for MVP)

### 3.3 Deck Detail (`app/deck/[id].tsx`)

| State            | Implemented                                 | Gap  |
| ---------------- | ------------------------------------------- | ---- |
| Loading          | Yes - ActivityIndicator + "Loading deck..." | None |
| Empty (no cards) | Yes - "No cards yet" with add CTA           | None |
| Error            | Yes - Error message + Retry button          | None |

**Issues Found:**

- Uses `err.message.includes('No cards')` for branching (line 144)
- Uses `Alert.alert()` for sprint start errors
- **Assigned to:** E6.2

### 3.4 Card Editor - Edit (`app/card/[id].tsx`)

| State   | Implemented                                 | Gap  |
| ------- | ------------------------------------------- | ---- |
| Loading | Yes - ActivityIndicator + "Loading card..." | None |
| Error   | Yes - Error message + "Go Back" button      | None |

**Issues Found:**

- Uses `Alert.alert()` for save/delete errors
- **Assigned to:** E6.2 (minor - acceptable for MVP)

### 3.5 Card Editor - New (`app/card/new.tsx`)

| State   | Implemented         | Gap                            |
| ------- | ------------------- | ------------------------------ |
| Loading | N/A (no data fetch) | None                           |
| Error   | Alert only          | **Gap: No inline error state** |

**Issues Found:**

- Uses `Alert.alert()` for all errors
- No loading state for save operation (only button disabled)
- **Assigned to:** E6.2 (minor - acceptable for MVP)

### 3.6 Sprint Review (`app/sprint/[id].tsx`)

| State            | Implemented                                   | Gap  |
| ---------------- | --------------------------------------------- | ---- |
| Loading          | Yes - ActivityIndicator + "Loading sprint..." | None |
| Empty (no cards) | Yes - "Completing sprint..." state            | None |
| Error            | Yes - Error message + "Go Home" button        | None |
| Abandoned        | Yes - Shows error message                     | None |

**Issues Found:**

- Uses `err.message.includes('not found')` for branching (line 58)
- Uses `err.message.includes('expired')` for branching (lines 60, 143)
- Uses `err.message.includes('already reviewed')` for branching (line 146)
- **Assigned to:** E6.2

### 3.7 Sprint Complete (`app/sprint/complete.tsx`)

| State   | Implemented             | Gap  |
| ------- | ----------------------- | ---- |
| Loading | N/A (uses params)       | None |
| Error   | Yes - Inline error text | None |

**Issues Found:**

- Uses `err.message.includes('No cards')` for branching (line 89)
- **Assigned to:** E6.2

### 3.8 Notification Controls (`app/notification-controls.tsx`)

| State             | Implemented                             | Gap  |
| ----------------- | --------------------------------------- | ---- |
| Loading           | Yes - ActivityIndicator + "Loading..."  | None |
| Error             | Yes - Inline error section              | None |
| Permission Denied | Yes - Warning section + "Open Settings" | None |

**Issues Found:**

- None - well-implemented
- **No action needed**

---

## 4. API Client Issues (`apps/client/lib/api.ts`)

### 4.1 204 No Content Crash

**Issue:** `request()` always calls `response.json()` (line 46), which throws on 204 responses  
**Affected Functions:** `deleteDeck()`, `deleteCard()`, `unsnoozeCard()`  
**Assigned to:** E6.3

### 4.2 Non-JSON Error Bodies

**Issue:** If server returns non-JSON error, `response.json()` will throw  
**Assigned to:** E6.3

### 4.3 Network Timeout/Offline Handling

**Issue:** No explicit handling for network errors; they surface as generic errors  
**Assigned to:** E6.3 (low priority - acceptable for MVP)

---

## 5. Server Error Shape Consistency

### 5.1 Error Response Format

**Spec:** All errors should return `{ error: { code, message, details? } }`  
**Status:** VERIFIED - `error-handler.ts` enforces this consistently

### 5.2 Error Codes Used

All error codes are properly defined and used:

- `NO_ELIGIBLE_CARDS` - 404 when no cards due
- `SPRINT_NOT_FOUND` - 404 when sprint doesn't exist
- `SPRINT_NOT_OWNED` / `FORBIDDEN` - 403 for unauthorized access
- `SPRINT_EXPIRED` - 409 when sprint past resumableUntil
- `SPRINT_NOT_ACTIVE` - 409 when sprint not in ACTIVE state
- `CARD_NOT_IN_SPRINT` - 400 when card not part of sprint
- `CARD_ALREADY_REVIEWED` - 409 when card already graded
- `SPRINT_ABANDONED` - 409 when trying to complete abandoned sprint
- `SPRINT_INCOMPLETE` - 400 when completing with unreviewed cards
- `VALIDATION_ERROR` - 400 for Zod validation failures
- `INTERNAL_ERROR` - 500 for unexpected errors

**Status:** VERIFIED - All error codes are consistent

---

## 6. Gap Summary by E6 Ticket

### E6.2 — Client: Normalize loading/empty/error patterns

- [ ] Home: Use error `code` instead of `err.message.includes('No cards')`
- [ ] Deck Detail: Use error `code` instead of `err.message.includes('No cards')`
- [ ] Sprint Review: Use error `code` instead of message substring matching
- [ ] Sprint Complete: Use error `code` instead of `err.message.includes('No cards')`
- [ ] (Optional) Convert Alert.alert() to inline error states where appropriate

### E6.3 — Client: Fix API client 204 handling

- [ ] Handle 204 No Content responses without calling `response.json()`
- [ ] Handle non-JSON error bodies gracefully
- [ ] (Optional) Improve network error messaging

### E6.4 — Client: Navigation edge polish

- [ ] Verify/ensure push tap cold start creates proper back stack
- [ ] Test all navigation flows match spec

### E6.5 — Server: Lifecycle + error shape consistency audit

- [ ] No gaps found - server implementation matches spec
- [ ] Consider adding integration tests to prevent regressions

### E6.6 — Server: Automated smoke tests

- [ ] Add happy path test: start -> review -> complete
- [ ] Add auto-abandon test: expired resumableUntil triggers abandon
- [ ] Add abandon idempotency test: double abandon is safe

### E6.7 — Client: Automated smoke tests

- [ ] Add 204 handling tests for deleteDeck(), deleteCard()
- [ ] (Optional) Add Home screen state tests

---

## 7. Risk Assessment

| Risk                              | Severity | Mitigation                        |
| --------------------------------- | -------- | --------------------------------- |
| 204 crash in production           | High     | E6.3 is critical path             |
| Message substring matching breaks | Medium   | E6.2 should use error codes       |
| Cold start navigation issues      | Low      | E6.4 verification needed          |
| Server lifecycle bugs             | Low      | E6.6 tests will catch regressions |

---

## 8. Recommended Execution Order

1. **E6.3** - Fix API client 204 handling (unblocks E6.7)
2. **E6.7** - Client smoke tests (validates E6.3 fix)
3. **E6.5** - Server lifecycle audit (no blockers)
4. **E6.6** - Server smoke tests (validates E6.5)
5. **E6.2** - Normalize UI states (can run in parallel with E6.5/E6.6)
6. **E6.4** - Navigation edge polish (can run in parallel)
7. **E6.8** - Manual smoke checklist (final gate)

---

## Appendix: Files Audited

### Client

- `apps/client/app/(tabs)/index.tsx` - Home screen
- `apps/client/app/(tabs)/decks.tsx` - Decks list
- `apps/client/app/deck/[id].tsx` - Deck detail
- `apps/client/app/card/[id].tsx` - Card editor (edit)
- `apps/client/app/card/new.tsx` - Card editor (new)
- `apps/client/app/sprint/[id].tsx` - Sprint review
- `apps/client/app/sprint/complete.tsx` - Sprint complete
- `apps/client/app/notification-controls.tsx` - Notification controls
- `apps/client/lib/api.ts` - API client

### Server

- `apps/server/src/routes/sprints.ts` - Sprint routes
- `apps/server/src/routes/home.ts` - Home routes
- `apps/server/src/middlewares/error-handler.ts` - Error handling

### Specs

- `docs/sprint-lifecycle-spec.md` - Sprint lifecycle specification
- `docs/navigation_model.md` - Navigation model specification
