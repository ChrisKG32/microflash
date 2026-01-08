# Sprint Lifecycle Specification

This document defines the canonical lifecycle rules for sprints in MicroFlash.

## Sprint States

```
PENDING → ACTIVE → COMPLETED
                 ↘ ABANDONED
```

- **PENDING**: Sprint created but not yet opened by user
- **ACTIVE**: Sprint is in progress (user has opened it)
- **COMPLETED**: All cards reviewed, sprint finished successfully
- **ABANDONED**: Sprint was abandoned (auto or explicit)

## Sprint Sources

- **HOME**: Started manually from Home screen ("Start Sprint" button)
- **DECK**: Started from Deck Detail screen (deck-constrained sprint)
- **PUSH**: Created by server scheduler before sending push notification

## Lifecycle Rules

### Creation

| Source | Trigger                                             | Initial State |
| ------ | --------------------------------------------------- | ------------- |
| HOME   | User taps "Start Sprint" on Home                    | PENDING       |
| DECK   | User taps "Start Sprint" on Deck Detail             | PENDING       |
| PUSH   | Server scheduler creates sprint before sending push | PENDING       |

For PUSH sprints, the server creates the sprint first, then sends the push notification containing the `sprintId`.

### Opening (First Access)

When a sprint is first opened (via `GET /api/sprints/:id`):

1. If `startedAt` is null:
   - Set `startedAt = now`
   - Set `status = ACTIVE`
   - Set `resumableUntil = now + 30 minutes`

2. If sprint is already ACTIVE and `resumableUntil > now`:
   - Return sprint as-is (resume scenario)

3. If sprint is ACTIVE but `resumableUntil <= now`:
   - Trigger auto-abandon (see below)

### Activity Extension

On any review submission (`POST /api/sprints/:id/review`):

- Extend `resumableUntil = now + 30 minutes`

This ensures active engagement keeps the sprint alive.

### Auto-Abandon

Triggered when:

- Sprint is ACTIVE
- `resumableUntil <= now`
- User attempts to access the sprint (GET) or server checks eligibility

Actions:

1. Set `status = ABANDONED`
2. Set `abandonedAt = now`
3. For each unreviewed SprintCard:
   - Set `Card.snoozedUntil = now + 2 hours`

### Explicit Abandon

Triggered by:

- User taps "Snooze" on push notification
- User explicitly abandons sprint via endpoint

Actions: Same as auto-abandon.

### Completion

Triggered when:

- All SprintCards have been reviewed (have a `result`)
- User calls `POST /api/sprints/:id/complete`

Actions:

1. Set `status = COMPLETED`
2. Set `completedAt = now`

## Resume Window

- Duration: **30 minutes** from last activity
- Tracked by: `resumableUntil` field
- Extended by: Each review submission

If user returns within the window:

- Sprint continues from where they left off
- `resumableUntil` is extended on next review

If user returns after the window:

- Sprint is auto-abandoned
- Remaining cards are snoozed for 2 hours
- User must start a new sprint

## Snooze Semantics

When a sprint is abandoned (auto or explicit):

- Only **unreviewed** SprintCards have their cards snoozed
- Snooze duration: **2 hours minimum**
- This prevents the same cards from immediately appearing in a new sprint

## Push Notification Flow

```
Server Scheduler
    │
    ├─1─► Check user eligibility
    │     - notificationsEnabled
    │     - has pushToken
    │     - cooldown elapsed (≥2h)
    │     - max/day not exceeded
    │     - no active resumable sprint
    │
    ├─2─► Create Sprint (source=PUSH, status=PENDING)
    │
    ├─3─► Send push with sprintId
    │
    └─4─► Update lastPushSentAt, increment daily counter

User taps notification
    │
    └───► App navigates to /sprint/[sprintId]
          │
          └───► GET /api/sprints/:id
                │
                └───► Sprint opens (PENDING → ACTIVE)
```

## Idempotency

- `POST /api/sprints/:id/complete`: Safe to call multiple times; no-op if already COMPLETED
- `POST /api/sprints/:id/abandon`: Safe to call multiple times; no-op if already ABANDONED
- `GET /api/sprints/:id`: Auto-abandon is idempotent (won't re-snooze already-snoozed cards)

## Database Fields

### Sprint Model

| Field          | Type         | Description                   |
| -------------- | ------------ | ----------------------------- |
| id             | String       | Unique identifier             |
| userId         | String       | Owner of the sprint           |
| deckId         | String?      | Optional deck constraint      |
| status         | SprintStatus | Current state                 |
| source         | SprintSource | Where sprint originated       |
| createdAt      | DateTime     | When sprint was created       |
| startedAt      | DateTime?    | When user first opened sprint |
| completedAt    | DateTime?    | When sprint was completed     |
| resumableUntil | DateTime?    | Deadline to resume sprint     |
| abandonedAt    | DateTime?    | When sprint was abandoned     |

### SprintCard Model

| Field     | Type        | Description                     |
| --------- | ----------- | ------------------------------- |
| id        | String      | Unique identifier               |
| sprintId  | String      | Parent sprint                   |
| cardId    | String      | The card to review              |
| order     | Int         | Position in sprint (1-indexed)  |
| result    | CardResult? | Review outcome (PASS/FAIL/SKIP) |
| createdAt | DateTime    | When added to sprint            |
