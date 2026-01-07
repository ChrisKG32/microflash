# Priority Controls

## Title

Deck + Card priority controls (UI + APIs) and sprint tie-breaking

## Goal

Let users set priorities; sprint selection uses priority only as a tiebreak after urgency.

## Scope

Server: priority fields in DTOs and validation.
Client: priority slider UI components.
Sprint selection: priority tie-breaking (already defined in Ticket 07).

## Priority Semantics

- **Range:** 0-100 (default 50).
- **Higher = more important** (surfaces earlier in ties).
- **Does NOT override urgency:** A card due yesterday always beats a card due tomorrow, regardless of priority.
- **Tie-breaking order:**
  1. Urgency (`nextReviewDate ASC`)
  2. Card priority (`Card.priority DESC`)
  3. Deck priority (`Deck.priority DESC`)
  4. Stable fallback (`Card.createdAt ASC`)

## Acceptance Criteria

- Deck priority editable on Deck Detail screen.
- Card priority editable in Card Editor.
- Priority values persist and appear in list views.
- Sprint selection demonstrably uses priority for tie-breaking.

## UI Components

### Priority Slider

```
Priority
[Low] -------|------- [High]
              ^
             50
```

- Slider from 0 to 100.
- Labels: "Low" (0), "Normal" (50), "High" (100).
- Optional: discrete steps (0, 25, 50, 75, 100) or continuous.

### Deck Detail

- Priority slider in deck settings section.
- Save on change (optimistic update).

### Card Editor

- Priority slider below front/back fields.
- Saved with card create/update.

## API Changes

### Deck

- `GET /api/decks/:id` includes `priority`.
- `PATCH /api/decks/:id` accepts `priority` (0-100).
- `POST /api/decks` accepts optional `priority` (default 50).

### Card

- `GET /api/cards/:id` includes `priority`.
- `PATCH /api/cards/:id` accepts `priority` (0-100).
- `POST /api/cards` accepts optional `priority` (default 50).

## Subtasks

- [ ] **10.1** Server: add priority to deck create/update validation.
- [ ] **10.2** Server: add priority to card create/update validation.
- [ ] **10.3** Server: include priority in deck/card response DTOs.
- [ ] **10.4** Client: create reusable PrioritySlider component.
- [ ] **10.5** Client: add priority slider to Deck Detail.
- [ ] **10.6** Client: add priority slider to Card Editor.
- [ ] **10.7** Add tests verifying sprint selection tie-breaking.

## Dependencies

- Ticket 01 (priority fields in schema).
- Ticket 07 (sprint selection uses priority).

## Estimated Effort

Small
