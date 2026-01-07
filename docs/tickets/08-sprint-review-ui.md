# Sprint Review UI

## Title

Sprint Review + Sprint Complete UI (graded)

## Goal

Primary microlearning loop: reveal -> grade (4-scale) -> progress -> complete.

## Scope

Client screens for Sprint Review and Sprint Complete.

## Acceptance Criteria

- Sprint Review loads from `sprintId` (not raw cardIds).
- Shows card front, then reveals answer on tap.
- Grade buttons: Again / Hard / Good / Easy.
- Submitting grade calls server and advances to next card.
- Progress indicator shows completion momentum.
- Sprint Complete supports "Done" and "One More Sprint".

## Sprint Review Screen

### Layout

```
+----------------------------------+
| Card 3 of 7        [Deck Name]   |
+----------------------------------+
|                                  |
|  [Progress Bar]                  |
|                                  |
+----------------------------------+
|                                  |
|  Question                        |
|  --------------------------      |
|  What is the capital of France?  |
|                                  |
+----------------------------------+
|                                  |
|  [Show Answer]                   |
|                                  |
+----------------------------------+
```

After reveal:

```
+----------------------------------+
|                                  |
|  Question                        |
|  What is the capital of France?  |
|                                  |
|  --------------------------      |
|                                  |
|  Answer                          |
|  Paris                           |
|                                  |
+----------------------------------+
|                                  |
| [Again] [Hard] [Good] [Easy]     |
|                                  |
+----------------------------------+
```

### States

- **Loading:** Fetching sprint data.
- **Reviewing:** Showing current card.
- **Submitting:** Grade being submitted (disable buttons, show spinner).
- **Error:** Failed to load/submit (retry option).
- **Empty:** No cards in sprint (shouldn't happen, but handle gracefully).

### Behavior

- On grade submit: call `POST /api/sprints/:id/review`.
- On success: advance to next card or navigate to Sprint Complete.
- Back/swipe-back: pops to previous screen (sprint remains resumable).

## Sprint Complete Screen

### Layout

```
+----------------------------------+
|                                  |
|           [Checkmark]            |
|                                  |
|        Sprint Complete!          |
|                                  |
|     7 cards reviewed             |
|     ~45 seconds                  |
|                                  |
+----------------------------------+
|                                  |
|  [Done]                          |
|                                  |
|  [One More Sprint]               |
|                                  |
+----------------------------------+
```

### Behavior

- "Done": navigates back to launch context (Home or Deck Detail).
- "One More Sprint": starts a new sprint (same source/deck if applicable).

## Subtasks

- [ ] **08.1** Create Sprint Review screen (`app/sprint/[id].tsx`).
- [ ] **08.2** Implement card display with front/back reveal.
- [ ] **08.3** Implement grade buttons with submission.
- [ ] **08.4** Implement progress indicator (bar or fraction).
- [ ] **08.5** Handle loading/error/submitting states.
- [ ] **08.6** Create Sprint Complete screen (`app/sprint/complete.tsx`).
- [ ] **08.7** Implement "Done" navigation logic.
- [ ] **08.8** Implement "One More Sprint" flow.
- [ ] **08.9** Integrate Markdown/LaTeX rendering for card content.

## Dependencies

- Ticket 07 (sprint server endpoints).
- Ticket 13 (Markdown/LaTeX rendering).

## Estimated Effort

Medium
