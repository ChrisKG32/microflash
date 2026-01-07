# Sprint System (Server Core)

## Title

Sprint system (server): build/start/resume/abandon/complete

## Goal

Server is source-of-truth for graded micro-sprints and their lifecycle (including auto-snooze rules).

## Scope

Sprint CRUD endpoints, selection algorithm, lifecycle management.

## Selection Algorithm

When building a sprint candidate list:

1. **Filter eligible cards:**
   - Belongs to user (via deck ownership)
   - `nextReviewDate <= now` (due)
   - Not snoozed (`snoozedUntil` is null or expired)
   - Not already in an ACTIVE sprint

2. **Order by urgency then priority:**
   - Primary: `nextReviewDate ASC` (oldest due first = most urgent)
   - Tiebreak 1: `Card.priority DESC` (higher priority wins)
   - Tiebreak 2: `Deck.priority DESC` (higher deck priority wins)
   - Tiebreak 3: `Card.createdAt ASC` (stable ordering)

3. **Limit to sprint size:**
   - User's `sprintSize` setting (3-10)
   - Return fewer if insufficient eligible cards

4. **Deck-constrained sprints:**
   - If `deckId` provided, filter to that deck + its subdecks only

## Acceptance Criteria

- Start sprint from Home or Deck produces persisted Sprint + ordered SprintCards.
- Resume returns same sprint if within 30 minutes of `resumableUntil`.
- If sprint not finished within 30 minutes: mark ABANDONED and snooze remaining cards >= 2 hours.
- Completing sprint records completion timestamp and clears resumable state.
- Selection ordering is deterministic and testable.

## Endpoints

### `POST /api/sprints/start`

Request:

```typescript
{
  source: 'HOME' | 'DECK' | 'PUSH';
  deckId?: string; // optional, for deck-constrained
}
```

Response:

```typescript
{
  sprint: SprintDTO;
}
```

Behavior:

- If user has ACTIVE sprint within resumableUntil, return that sprint (resume).
- Otherwise, build new sprint using selection algorithm.
- Set `resumableUntil = now + 30 minutes`.

### `GET /api/sprints/:id`

Response:

```typescript
{
  sprint: SprintDTO;
}
```

### `POST /api/sprints/:id/review`

Request:

```typescript
{
  cardId: string;
  rating: 'AGAIN' | 'HARD' | 'GOOD' | 'EASY';
}
```

Response:

```typescript
{
  sprint: SprintDTO; // updated progress
  card: CardDTO; // updated FSRS state
}
```

Behavior:

- Create Review record.
- Update card FSRS state.
- Mark SprintCard as reviewed.
- Extend `resumableUntil` by 30 minutes from now.

### `POST /api/sprints/:id/complete`

Response:

```typescript
{
  sprint: SprintDTO;
}
```

Behavior:

- Set status = COMPLETED, completedAt = now.
- Clear resumableUntil.

### `POST /api/sprints/:id/abandon`

Response:

```typescript
{
  sprint: SprintDTO;
  snoozedCardCount: number;
}
```

Behavior:

- Set status = ABANDONED, abandonedAt = now.
- Snooze all unreviewed cards for >= 2 hours.

## Background/On-Read Expiration

When reading a sprint or starting a new one:

- If existing ACTIVE sprint has `resumableUntil < now`:
  - Auto-abandon it (set ABANDONED, snooze remaining cards).

## Subtasks

- [ ] **07.1** Implement sprint selection query with ordering rules.
- [ ] **07.2** Implement `POST /api/sprints/start` with resume logic.
- [ ] **07.3** Implement `GET /api/sprints/:id`.
- [ ] **07.4** Implement `POST /api/sprints/:id/review` (integrates with existing FSRS/review logic).
- [ ] **07.5** Implement `POST /api/sprints/:id/complete`.
- [ ] **07.6** Implement `POST /api/sprints/:id/abandon`.
- [ ] **07.7** Implement auto-expiration logic (on read or periodic job).
- [ ] **07.8** Add comprehensive tests for selection ordering.
- [ ] **07.9** Add tests for lifecycle transitions (start/resume/complete/abandon/expire).

## Dependencies

- Ticket 01 (Sprint/SprintCard models).
- Ticket 00 (card ownership checks pattern).

## Estimated Effort

Large
