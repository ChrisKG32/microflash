# Review Ahead (Browse Mode)

## Title

Review Ahead (browse-only, no grading) across all cards

## Goal

Allow flipping through any cards (including future) without affecting FSRS scheduling.

## Scope

Server endpoint for browsing cards; client Browse screen.

## Acceptance Criteria

- Browse mode shows front/back flip + next/prev navigation.
- No rating buttons; no Review rows created; no FSRS updates.
- Supports browsing all cards or deck-only.
- Default ordering: `nextReviewDate ASC` (soonest first).
- Visually distinct from graded Sprint Review.

## Browse Endpoint

### `GET /api/cards/browse`

Query params:

```typescript
{
  deckId?: string;     // optional, filter to deck + subdecks
  cursor?: string;     // pagination cursor (card ID)
  limit?: number;      // default 20
}
```

Response:

```typescript
{
  cards: CardDTO[];
  nextCursor: string | null;
  total: number;
}
```

Ordering:

- `nextReviewDate ASC` (soonest upcoming first)
- Then `createdAt ASC` (stable tiebreak)

## Browse Screen

### Layout

```
+----------------------------------+
| Review Ahead       [X Close]     |
+----------------------------------+
| Card 12 of 156                   |
+----------------------------------+
|                                  |
|  [Card Front]                    |
|                                  |
|  What is the capital of France?  |
|                                  |
+----------------------------------+
|                                  |
|  [Tap to flip]                   |
|                                  |
+----------------------------------+
|                                  |
|  [< Prev]           [Next >]     |
|                                  |
+----------------------------------+
```

After flip:

```
+----------------------------------+
|                                  |
|  [Card Back]                     |
|                                  |
|  Paris                           |
|                                  |
+----------------------------------+
|                                  |
|  [Tap to flip back]              |
|                                  |
+----------------------------------+
```

### Visual Distinction from Sprint Review

- Different header (no progress bar).
- No grade buttons.
- Different color scheme or "Browse Mode" label.
- Close button instead of back (or both).

### Entry Points

- Home: "Review Ahead" button (shown when nothing due or always available).
- Deck Detail: "Browse Deck" button.

### Behavior

- Tap card: flip front/back.
- Next/Prev: navigate through cards (paginate as needed).
- Close: return to previous screen.
- No server calls on flip (read-only).

## Subtasks

- [ ] **09.1** Server: `GET /api/cards/browse` endpoint with pagination.
- [ ] **09.2** Client: Browse screen (`app/browse.tsx`).
- [ ] **09.3** Implement card flip animation/interaction.
- [ ] **09.4** Implement next/prev navigation with pagination.
- [ ] **09.5** Add entry point on Home screen.
- [ ] **09.6** Add entry point on Deck Detail screen.
- [ ] **09.7** Ensure visual distinction from Sprint Review.
- [ ] **09.8** Integrate Markdown/LaTeX rendering.

## Dependencies

- Ticket 13 (Markdown/LaTeX rendering).

## Estimated Effort

Small-Medium
