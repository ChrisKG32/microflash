# MicroFlash MVP Implementation Plan

## Walking Skeleton

A dev-auth user can: create a deck → create 1–3 cards → start a sprint → review cards (reveal + grade) → complete sprint → return to Home showing updated due state; leaving mid-sprint allows resume within 30 minutes; after 30 minutes the sprint auto-abandons and remaining cards are snoozed ≥2 hours.

---

## Decisions

### D1 — Priority numeric spec + migration mapping

- **Goal:** Lock priority range, defaults, and how existing enum data maps into numeric.
- **Scope:** Decide: range (0–100), default (50), step behavior (continuous vs discrete), mapping from existing `LOW|MEDIUM|HIGH` to numbers.
- **DoD:** Written decision with mapping table and any UI constraints.
- **Dependencies:** None

### D2 — MVP notification rules (simplified)

- **Goal:** Freeze which "respectful notifications" rules ship in MVP vs deferred.
- **Scope:** MVP includes: notifications toggle, cooldown (>=2h), max/day, suppress while sprint resumable, sprint-level snooze semantics. Explicitly defer: quiet hours, backlog threshold.
- **DoD:** Written decision stating included rules and deferred rules.
- **Dependencies:** None

---

## Epics & Tickets (Ordered)

### E1 — Foundation alignment (schema + contracts + remove legacy paths)

**Goal:** Make the codebase ready for sprint-first MVP without half-migrated flows.

**Scope:** Schema changes, DTO definitions, and migration plan for legacy review-session concept.

**DoD:** Schema and contracts are stable; no MVP tickets depend on legacy cardIds review sessions.

**Dependencies:** D1, D2

#### E1.1 — Data model: numeric priorities

- **Goal:** Replace enum deck/card priority with numeric 0–100.
- **Scope:** Prisma migration: replace `Priority` enum fields with `Int`, data backfill mapping (LOW=25, MEDIUM=50, HIGH=75), update validation schemas.
- **DoD:** Migration plan documented; validation accepts 0–100; existing data mapped.
- **Dependencies:** D1

#### E1.2 — Data model: sprint lifecycle fields

- **Goal:** Enable resume/abandon behavior and push attribution.
- **Scope:** Add/confirm fields: `Sprint.source` (enum: HOME, DECK, PUSH), `Sprint.resumableUntil` (DateTime), `Sprint.abandonedAt` (DateTime); confirm `Sprint.status` enum usage.
- **DoD:** Field list + semantics documented; migration ready.
- **Dependencies:** E1.1

#### E1.3 — API contracts: Sprint + Home + NotificationPrefs DTOs

- **Goal:** Remove client/server drift and make sprint screens implementable consistently.
- **Scope:** Define request/response DTOs for: start sprint, get sprint, submit review, complete/abandon, home summary, notification prefs (simplified subset).
- **DoD:** DTO definitions documented and referenced by all subsequent tickets.
- **Dependencies:** E1.2

#### E1.4 — Plan removal of legacy "cardIds review-session" concept

- **Goal:** Ensure there is one review concept: Sprint.
- **Scope:** Document migration: remove/deprecate `review-session.tsx` route, update push payload to use sprintId, remove `/api/cards/by-ids` usage for review sessions.
- **DoD:** Migration plan documented; no MVP tickets depend on cardIds review sessions.
- **Dependencies:** E1.3

---

### E2 — Sprint system (server)

**Goal:** Server becomes source-of-truth for sprint lifecycle and selection.

**Scope:** Sprint CRUD endpoints, selection algorithm, lifecycle management.

**DoD:** User can start/resume/complete a sprint and grade cards; state persists server-side.

**Dependencies:** E1.2, E1.3

#### E2.1 — Server: `POST /api/sprints/start` (resume-first)

- **Goal:** Start a new sprint or return active resumable sprint.
- **Scope:** Eligibility filter (due, not snoozed, owned, not already in ACTIVE sprint), ordering (urgency then priority), limit by user sprintSize, optional deck constraint, resume logic.
- **DoD:** Endpoint returns deterministic ordered sprint with cards; tests cover ordering + resume behavior.
- **Dependencies:** E2

**Selection algorithm:**

1. Filter eligible cards: belongs to user (via deck), `nextReviewDate <= now`, not snoozed, not in ACTIVE sprint
2. Order by: `nextReviewDate ASC` (urgency), then `Card.priority DESC`, then `Deck.priority DESC`, then `Card.createdAt ASC`
3. Limit to user's `sprintSize` (default 5, range 3–10)
4. If `deckId` provided, filter to that deck + subdecks only

#### E2.2 — Server: `GET /api/sprints/:id` (+ auto-expire on read)

- **Goal:** Fetch sprint state safely and auto-abandon if expired.
- **Scope:** Ownership checks; if `resumableUntil < now` and status ACTIVE → transition to ABANDONED, snooze remaining cards ≥2h.
- **DoD:** Endpoint returns sprint + progress; expired sprint auto-transitions; tests included.
- **Dependencies:** E2.1

#### E2.3 — Server: `POST /api/sprints/:id/review`

- **Goal:** Grade a card within a sprint and update FSRS.
- **Scope:** Create Review record; update card FSRS state; mark SprintCard result; extend `resumableUntil` by 30 mins; enforce card belongs to sprint + user.
- **DoD:** Endpoint updates sprint progress and card schedule; tests cover correctness and auth/ownership.
- **Dependencies:** E2.2

#### E2.4 — Server: `POST /api/sprints/:id/complete` + `POST /api/sprints/:id/abandon`

- **Goal:** Finish sprint cleanly or abandon and snooze remaining cards ≥2h.
- **Scope:** Status transitions + timestamps; abandon snoozes only unreviewed sprint cards; idempotent behavior for double-calls.
- **DoD:** Transitions enforced; double-complete/abandon handled predictably; tests included.
- **Dependencies:** E2.3

---

### E3 — Navigation + core screens

**Goal:** Establish the correct tabs/stacks structure so sprint flows and push deep links behave correctly.

**Scope:** Navigation scaffolding + Home + Sprint Review + Sprint Complete + Deck Detail integration.

**DoD:** Navigation behaves per `docs/navigation_model.md` for core flows (minus Clerk gating); sprint screens are reachable from Home, Deck Detail, and push.

**Dependencies:** E2

#### E3.1 — Client: Navigation structure (tabs + root sprint routes)

- **Goal:** Create the navigation scaffolding matching docs while keeping dev-auth.
- **Scope:** Implement expo-router structure with tabs and root-level sprint routes.
- **DoD:** Navigation structure matches target; push can land on Sprint Review with Home beneath.
- **Dependencies:** E2.1

**Target expo-router file structure (MVP):**

```
app/
  _layout.tsx              # Root layout (dev-auth, no Clerk gating)
  (tabs)/
    _layout.tsx            # Bottom tab navigator: Home | Decks | Settings
    index.tsx              # Home tab (command center)
    decks.tsx              # Decks List tab
    settings.tsx           # Settings tab
  deck/
    [id].tsx               # Deck Detail (push from Decks tab)
  card/
    [id].tsx               # Card Editor - edit existing (push from Deck Detail)
    new.tsx                # Card Editor - create new (push from Deck Detail)
  sprint/
    [id].tsx               # Sprint Review (root-level, tab-agnostic)
    complete.tsx           # Sprint Complete (root-level)
  browse.tsx               # Review Ahead / Browse mode (root-level)
  notification-controls.tsx # Notification settings (push from Settings)
```

**Navigation rules:**

- Tab bar: Home (index) | Decks | Settings
- Sprint routes at root: reachable from any context (Home, Deck Detail, push)
- Push notification tap: navigate to `/sprint/[id]` with Home as back destination
- "Start Sprint" from Home or Deck Detail: push `/sprint/[id]`
- Sprint Complete "Done": pop to launch context
- Sprint Complete "One More Sprint": replace with new `/sprint/[id]`

**Migration from current state:**

- Remove/hide legacy `review-session.tsx`
- Current `(tabs)/index.tsx` (Review tab) → becomes Home command center
- Current `(tabs)/settings.tsx` (notification debug) → becomes real Settings

#### E3.2 — Client: Sprint Review screen (`/sprint/[id]`)

- **Goal:** Replace "review-session by cardIds" with sprint-based review.
- **Scope:** Load sprint by ID, reveal answer, grade buttons (Again/Hard/Good/Easy), progress indicator, error/loading states.
- **DoD:** Can complete a sprint from start to finish; back navigation leaves sprint resumable.
- **Dependencies:** E2.2, E2.3, E3.1

**Route:** `app/sprint/[id].tsx`

#### E3.3 — Client: Sprint Complete screen

- **Goal:** Provide completion feedback and next actions.
- **Scope:** Show completion stats, "Done" button, "One More Sprint" button.
- **DoD:** "Done" returns to launch context; "One More Sprint" starts a new sprint.
- **Dependencies:** E2.4, E3.2

**Route:** `app/sprint/complete.tsx`

#### E3.4 — Server + Client: Home summary + Home command center

- **Goal:** Make Home the primary entry point described in docs.
- **Scope:** `GET /api/home/summary` endpoint + Home UI with all states.
- **DoD:** Home shows due/overdue counts, resume CTA (5s visibility), Start Sprint button, empty state.
- **Dependencies:** E2.1, E2.2, E3.1

**Home summary DTO:**

```typescript
interface HomeSummaryDTO {
  dueCount: number;
  overdueCount: number; // due > 24h ago
  resumableSprint: {
    id: string;
    resumableUntil: string;
    progress: { total: number; reviewed: number };
  } | null;
  nextEligiblePushTime: string | null;
  notificationsEnabled: boolean;
}
```

**UI states:**

- Loading: spinner
- Has due cards: due count + "Start Sprint" button
- Nothing due: "You're clear!" + "Review Ahead" option
- Resumable sprint: "Resume" CTA visible for 5 seconds on app open
- Error: retry button

#### E3.5 — Client: Deck Detail "Start sprint for this deck"

- **Goal:** Enable deck-constrained sprints.
- **Scope:** Add Start Sprint button on Deck Detail; pass deckId to sprint start.
- **DoD:** Sprint created from deck only contains that deck/subdecks' due cards.
- **Dependencies:** E2.1, E3.1

---

### E4 — Notifications MVP (simplified, sprint-triggering)

**Goal:** Replace card-window notifications with sprint-triggering pushes; ship minimal trust rules.

**Scope:** Server eligibility engine + scheduler changes + client push handling + minimal controls UI.

**DoD:** Eligible users receive pushes; tap opens sprint; snooze skips sprint and snoozes remaining cards.

**Dependencies:** D2, E2, E3.1

#### E4.1 — Server: eligibility engine (simplified)

- **Goal:** Centralize "can we push now?" logic.
- **Scope:** Implement checks: notificationsEnabled + pushToken, cooldown>=120 min, max/day, suppress while sprint resumable.
- **DoD:** Unit tests for each rule; exposes `nextEligiblePushTime` computation for Home.
- **Dependencies:** D2, E2.1

**Eligibility algorithm:**

```typescript
function isUserEligibleForPush(user: User, now: Date): boolean {
  if (!user.notificationsEnabled || !user.pushToken) return false;
  if (hasActiveResumableSprint(user.id, now)) return false;
  if (
    user.lastPushSentAt &&
    now < addMinutes(user.lastPushSentAt, user.notificationCooldownMinutes)
  )
    return false;
  if (getPushCountForToday(user, now) >= user.maxNotificationsPerDay)
    return false;
  return true;
}
```

#### E4.2 — Server: scheduler sends "sprint push" (not card-window)

- **Goal:** Replace current due-window card notifications with sprint-triggering notifications.
- **Scope:** On eligible run: create sprint with source=PUSH; send push with sprintId; update `lastPushSentAt` and increment daily counter.
- **DoD:** Push payload contains sprintId and deep link `/sprint/[id]`; successful sends update tracking fields.
- **Dependencies:** E4.1, E2.1

**Push payload:**

```typescript
{
  to: expoPushToken,
  title: "Time for a micro-sprint!",
  body: "X cards ready for review",
  data: {
    type: "sprint",
    sprintId: "...",
    url: "/sprint/[sprintId]"
  },
  categoryId: "due_cards"
}
```

#### E4.3 — Server: push snooze action abandons sprint

- **Goal:** Make "snooze means snooze" at sprint level.
- **Scope:** Snooze endpoint takes sprintId; abandons sprint; snoozes remaining cards ≥2h; does NOT increment max/day counter.
- **DoD:** Snoozing from push causes sprint to become ABANDONED and cards snoozed; tests included.
- **Dependencies:** E2.4, E4.2

#### E4.4 — Client: push handling routes to `/sprint/[id]`

- **Goal:** Tapping push starts the sprint review flow reliably.
- **Scope:** Update notification response handler to navigate to sprint route; ensure Home below on cold start; wire snooze action to sprint snooze endpoint.
- **DoD:** Tap push → Sprint Review opens; back returns to Home; "Snooze" action hits sprint snooze endpoint.
- **Dependencies:** E3.1, E4.2, E4.3

#### E4.5 — Client: Notification Controls (minimal for MVP)

- **Goal:** Give users control without full settings surface area.
- **Scope:** Toggle notifications, set cooldown (min 2h), set max/day; show permission-denied guidance + "Open Settings" link.
- **DoD:** User can adjust prefs and see them reflected server-side; denied permissions show clear guidance.
- **Dependencies:** E4.1, E4.2

**Route:** `app/notification-controls.tsx`

---

### E5 — Authoring + content rendering

**Goal:** Improve deck/card management and content fidelity for real studying.

**Scope:** Card editor (create/edit/delete), markdown+LaTeX rendering, priority sliders.

**DoD:** Users can create/edit cards with rich rendering and tune priorities that affect sprint ordering ties.

**Dependencies:** E1.1, E2, E3

#### E5.1 — Client: Markdown + LaTeX renderer component

- **Goal:** Render card front/back per MVP requirement.
- **Scope:** Shared `<CardContent />` component with Markdown + LaTeX; graceful fallback on invalid LaTeX.
- **DoD:** Sprint Review uses renderer for front/back; no crashes on invalid input.
- **Dependencies:** E3.2

**Libraries:** `react-native-markdown-display` + `react-native-mathjax-svg`

#### E5.2 — Client: Card Editor (create/edit/delete) + preview

- **Goal:** Full basic card management.
- **Scope:** Dedicated card editor routes; supports create, edit, delete; shows markdown/latex preview.
- **DoD:** Card CRUD works end-to-end; preview matches Sprint Review rendering.
- **Dependencies:** E5.1

**Routes:** `app/card/[id].tsx` (edit), `app/card/new.tsx` (create)

#### E5.3 — Client + Server: Priority sliders (0–100)

- **Goal:** Let users tune importance.
- **Scope:** Slider UI for 0–100; wire to deck update + card update; show value labels (Low/Normal/High).
- **DoD:** Updates persist; sprint selection tie-break respects priorities.
- **Dependencies:** E1.1, E5.2

---

### E6 — MVP polish + smoke tests

**Goal:** Stabilize UX and prevent regressions in the core loop.

**Scope:** Error states, loading states, empty states, basic test coverage and manual smoke checklist.

**DoD:** Defined smoke test plan passes.

**Dependencies:** E2–E5

**Smoke test checklist:**

- [ ] Create deck → create card → card appears in deck
- [ ] Start sprint from Home → review all cards → complete → return to Home
- [ ] Start sprint from Deck Detail → review → complete → return to Deck Detail
- [ ] Leave sprint mid-way → return within 30 min → resume works
- [ ] Leave sprint mid-way → wait 30+ min → sprint auto-abandoned, cards snoozed
- [ ] Receive push notification → tap → Sprint Review opens → back returns to Home
- [ ] Snooze push notification → sprint abandoned, cards snoozed ≥2h
- [ ] Toggle notifications off → no pushes sent
- [ ] Adjust cooldown/max per day → server respects new values
- [ ] Card content with markdown renders correctly
- [ ] Card content with LaTeX renders correctly
- [ ] Priority slider updates persist and affect sprint ordering

---

## Parking Lot (Deferred Items)

| ID   | Label                               | Notes                                     |
| ---- | ----------------------------------- | ----------------------------------------- |
| MF-1 | Anki import                         | Post-MVP per decision                     |
| MF-2 | Quiet hours                         | Deferred from MVP notification rules      |
| MF-3 | Backlog threshold notifications     | Deferred from MVP notification rules      |
| MF-4 | Full onboarding + Clerk hosted auth | Deferred while using dev-auth for MVP     |
| MF-5 | Offline-first + sync protocol       | Post-MVP per decision                     |
| MF-6 | Account deletion                    | Post-MVP; sign-out only for now           |
| MF-7 | Tags placeholder                    | Deferred per decision                     |
| MF-8 | Review Ahead / Browse mode          | Lower priority; defer if time-constrained |

---

## Dependency Graph

```
D1 (Priority spec) ───────────────────────────────────┐
D2 (Notification rules) ──────────────────────────────┤
                                                      │
                                                      ▼
                                               ┌─────────────┐
                                               │     E1      │
                                               │ Foundation  │
                                               └──────┬──────┘
                                                      │
                        ┌─────────────────────────────┼─────────────────────────────┐
                        │                             │                             │
                        ▼                             ▼                             ▼
                 ┌─────────────┐              ┌─────────────┐              ┌─────────────┐
                 │    E1.1     │              │    E1.2     │              │    E1.3     │
                 │  Priority   │              │   Sprint    │              │    DTOs     │
                 │  Numeric    │              │   Fields    │              │             │
                 └──────┬──────┘              └──────┬──────┘              └──────┬──────┘
                        │                            │                            │
                        │                            └────────────┬───────────────┘
                        │                                         │
                        │                                         ▼
                        │                                  ┌─────────────┐
                        │                                  │     E2      │
                        │                                  │   Sprint    │
                        │                                  │   Server    │
                        │                                  └──────┬──────┘
                        │                                         │
                        │              ┌──────────────────────────┼──────────────────────────┐
                        │              │                          │                          │
                        │              ▼                          ▼                          │
                        │       ┌─────────────┐            ┌─────────────┐                   │
                        │       │     E3      │            │     E4      │                   │
                        │       │    Nav +    │            │   Notifs    │                   │
                        │       │   Screens   │            │    MVP      │                   │
                        │       └──────┬──────┘            └─────────────┘                   │
                        │              │                                                     │
                        └──────────────┼─────────────────────────────────────────────────────┘
                                       │
                                       ▼
                                ┌─────────────┐
                                │     E5      │
                                │  Authoring  │
                                │  + Render   │
                                └──────┬──────┘
                                       │
                                       ▼
                                ┌─────────────┐
                                │     E6      │
                                │   Polish    │
                                └─────────────┘
```

---

## Effort Estimates

| Ticket | Effort | Notes                        |
| ------ | ------ | ---------------------------- |
| D1     | XS     | Decision doc                 |
| D2     | XS     | Decision doc                 |
| E1.1   | S      | Migration + validation       |
| E1.2   | S      | Schema fields                |
| E1.3   | S-M    | DTO definitions              |
| E1.4   | S      | Migration plan doc           |
| E2.1   | M      | Core sprint start logic      |
| E2.2   | S      | Get + auto-expire            |
| E2.3   | M      | Review submission + FSRS     |
| E2.4   | S      | Complete/abandon transitions |
| E3.1   | M      | Navigation restructure       |
| E3.2   | M      | Sprint Review screen         |
| E3.3   | S      | Sprint Complete screen       |
| E3.4   | M      | Home summary + screen        |
| E3.5   | S      | Deck Detail sprint button    |
| E4.1   | S-M    | Eligibility engine           |
| E4.2   | M      | Scheduler sprint-push        |
| E4.3   | S      | Snooze abandons sprint       |
| E4.4   | S      | Client push handling         |
| E4.5   | M      | Notification Controls UI     |
| E5.1   | M      | Markdown + LaTeX component   |
| E5.2   | M      | Card Editor                  |
| E5.3   | S      | Priority sliders             |
| E6     | M      | Polish + smoke tests         |

**Legend:** XS (<2h), S (<1d), S-M (1-2d), M (2-4d)

**Total estimated effort:** ~4-5 weeks for a single developer

---

## Execution Order (Recommended)

### Phase 1: Foundation (Days 1-3)

1. D1 — Priority spec decision
2. D2 — Notification rules decision
3. E1.1 — Numeric priorities migration
4. E1.2 — Sprint lifecycle fields
5. E1.3 — DTO definitions
6. E1.4 — Legacy removal plan

### Phase 2: Sprint Server (Days 4-8)

7. E2.1 — Sprint start endpoint
8. E2.2 — Sprint get + auto-expire
9. E2.3 — Sprint review endpoint
10. E2.4 — Sprint complete/abandon

### Phase 3: Navigation + Core Screens (Days 9-14)

11. E3.1 — Navigation structure
12. E3.2 — Sprint Review screen
13. E3.3 — Sprint Complete screen
14. E3.4 — Home summary + screen
15. E3.5 — Deck Detail sprint button

### Phase 4: Notifications (Days 15-19)

16. E4.1 — Eligibility engine
17. E4.2 — Scheduler sprint-push
18. E4.3 — Snooze abandons sprint
19. E4.4 — Client push handling
20. E4.5 — Notification Controls UI

### Phase 5: Authoring + Polish (Days 20-25)

21. E5.1 — Markdown + LaTeX renderer
22. E5.2 — Card Editor
23. E5.3 — Priority sliders
24. E6 — Polish + smoke tests
