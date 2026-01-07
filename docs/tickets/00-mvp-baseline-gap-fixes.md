# Baseline Gap Fixes

## Title

Baseline gap fixes (remove stubs, safe deletes, ownership checks)

## Goal

Eliminate "fake-success" endpoints and close obvious security/consistency gaps before building MVP features on top.

## Scope

Server routes for decks/cards currently stubbed or unsafe; align with consistent auth/ownership patterns.

## Acceptance Criteria

- No stub "Not implemented yet" endpoints for MVP-required CRUD.
- Delete endpoints enforce ownership and actually delete.
- Responses are consistent and typed.

## Subtasks

- [ ] **00.1** Implement `GET /api/decks/:id` (include subdecks, counts, priority fields).
- [ ] **00.2** Implement `PATCH /api/decks/:id` (title/description/priority/parentDeckId with max depth=2).
- [ ] **00.3** Implement `DELETE /api/decks/:id` (ownership check; cascade delete cards/subdecks).
- [ ] **00.4** Implement `GET /api/cards/:id`.
- [ ] **00.5** Implement `PATCH /api/cards/:id` (front/back/priority/tags assignment).
- [ ] **00.6** Implement `DELETE /api/cards/:id` (ownership check via deck).
- [ ] **00.7** Update route tests for all above endpoints.

## Technical Notes

- Deck delete should cascade to cards and subdecks (Prisma `onDelete: Cascade` already configured).
- Card ownership is verified via `deck.userId`.
- Max deck depth = 2 must be enforced on `PATCH` when changing `parentDeckId`.

## Dependencies

None (can start immediately).

## Estimated Effort

Small-Medium
