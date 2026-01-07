# MVP Polish & Smoke Tests

## Title

MVP polish + smoke tests + doc alignment

## Goal

Ensure the shipped MVP matches `docs/*.md` and core flows are stable.

## Scope

Final integration, testing, and documentation alignment.

## Acceptance Criteria

- `pnpm typecheck` passes.
- `pnpm lint` passes.
- `pnpm test` passes (unit + integration).
- MVP smoke flows succeed on physical device.
- Documentation reflects final implementation.

## Smoke Test Flows

### 1. New User Onboarding (Start Fresh)

1. Open app -> Welcome screen.
2. Sign in with Clerk.
3. Notifications prompt -> Allow.
4. "Start Fresh" -> Create first deck.
5. Add first card.
6. Micro-sprint setup -> Configure preferences.
7. Start first sprint -> Review card -> Submit grade.
8. Sprint complete -> Land on Home.
9. Verify `onboardingComplete = true`.

### 2. New User Onboarding (Import)

1. Open app -> Welcome screen.
2. Sign in with Clerk.
3. Notifications prompt -> Allow.
4. "Import Anki" -> Select `.apkg` file.
5. Confirm deck selection -> Import.
6. View results -> Continue.
7. Micro-sprint setup -> Configure.
8. Start first sprint -> Review -> Grade.
9. Sprint complete -> Home.

### 3. Notification Flow

1. User has due cards and notifications enabled.
2. Wait for scheduler to run (or trigger manually).
3. Receive push notification.
4. Tap notification -> Opens Sprint Review.
5. Complete sprint -> Sprint Complete -> Home.

### 4. Snooze Flow

1. Receive push notification.
2. Long-press -> "Snooze 1h" action.
3. Verify sprint is abandoned.
4. Verify cards are snoozed >= 2h.
5. Verify no new push for cooldown period.

### 5. Quiet Hours / Max Day / Cooldown

1. Set quiet hours to current time range.
2. Verify no push received during quiet hours.
3. Set max/day to 1, receive one push.
4. Verify no more pushes that day.
5. Verify cooldown is respected between pushes.

### 6. Sprint Resume

1. Start sprint from Home.
2. Review 2 of 5 cards.
3. Background the app.
4. Return within 30 minutes.
5. Verify "Resume" CTA appears.
6. Resume -> Continue from card 3.

### 7. Sprint Abandon (Timeout)

1. Start sprint.
2. Review 2 of 5 cards.
3. Wait > 30 minutes (or mock time).
4. Return to app.
5. Verify sprint is abandoned.
6. Verify remaining cards are snoozed >= 2h.
7. Start new sprint -> Different cards.

### 8. Review Ahead (Browse)

1. No cards due.
2. Tap "Review Ahead" on Home.
3. Browse cards (flip, next/prev).
4. Close browse.
5. Verify no Review records created.
6. Verify FSRS state unchanged.

### 9. Priority Tie-Breaking

1. Create cards with same `nextReviewDate`.
2. Set different priorities.
3. Start sprint.
4. Verify higher priority cards appear first.

### 10. Anki Import Edge Cases

1. Import `.apkg` with depth > 2 hierarchy.
2. Verify decks are flattened with warnings.
3. Import `.apkg` with media references.
4. Verify media warning shown, cards imported without media.

## Test Coverage Additions

### Server

- [ ] Sprint selection ordering tests.
- [ ] Notification eligibility tests (all rules).
- [ ] Sprint lifecycle tests (start/resume/complete/abandon/expire).
- [ ] Import parsing and mapping tests.

### Client

- [ ] Component tests for new screens (where feasible).
- [ ] Navigation flow tests (if using testing library).

## Documentation Updates

- [ ] Verify `docs/app-overview.md` matches implementation.
- [ ] Verify `docs/app_screens.md` matches actual screens.
- [ ] Verify `docs/navigation_model.md` matches routes.
- [ ] Update any intentional deviations with rationale.

## Subtasks

- [ ] **16.1** Run full test suite and fix failures.
- [ ] **16.2** Run typecheck and fix errors.
- [ ] **16.3** Run lint and fix issues.
- [ ] **16.4** Manual smoke test: onboarding (start fresh).
- [ ] **16.5** Manual smoke test: onboarding (import).
- [ ] **16.6** Manual smoke test: notification flow.
- [ ] **16.7** Manual smoke test: snooze flow.
- [ ] **16.8** Manual smoke test: quiet hours/max/cooldown.
- [ ] **16.9** Manual smoke test: sprint resume.
- [ ] **16.10** Manual smoke test: sprint abandon timeout.
- [ ] **16.11** Manual smoke test: review ahead browse.
- [ ] **16.12** Manual smoke test: priority tie-breaking.
- [ ] **16.13** Manual smoke test: Anki import edge cases.
- [ ] **16.14** Update documentation for any deviations.
- [ ] **16.15** Create smoke test checklist document.

## Dependencies

All other tickets must be complete.

## Estimated Effort

Medium
