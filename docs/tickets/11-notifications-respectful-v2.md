# Respectful Notifications v2

## Title

Respectful notifications v2 (quiet hours, max/day, cooldown>=2h, backlog>=X, sprint-aware suppression)

## Goal

Replace card-window pushing with sprint-triggering that respects user control and trust rules.

## Scope

Server: notification eligibility engine, scheduler updates, sprint-per-notification.
Push payload changes.

## Notification Rules

### Quiet Hours

- No pushes between `quietHoursStartMin` and `quietHoursEndMin` in user's timezone.
- Example: quiet 22:00-07:00 = no pushes from 10pm to 7am.

### Cooldown

- Minimum 2 hours between pushes (user can set higher).
- Check `lastPushSentAt` + `cooldownMinutes`.

### Max Per Day

- Track pushes sent today (`pushCountDate`, `pushCountToday`).
- Reset counter when date changes (in user's timezone).
- Default: 6 pushes/day.

### Backlog Threshold (Optional)

- Only notify if due card count >= `backlogThreshold`.
- If null/0, always eligible when cards are due.

### Sprint-Aware Suppression

- No pushes while user has an ACTIVE sprint within `resumableUntil`.
- Rationale: don't interrupt or duplicate an in-progress session.

### Snooze Semantics

- Snoozing a push notification:
  - Abandons the associated sprint (if any).
  - Snoozes that sprint's cards for >= 2 hours.
  - Does NOT count against max/day (it's a skip, not a new push).

## Eligibility Check Algorithm

```typescript
function isUserEligibleForPush(user: User, now: Date): boolean {
  // 1. Notifications enabled?
  if (!user.notificationsEnabled || !user.pushToken) return false;

  // 2. Has active resumable sprint?
  const activeSprint = await getActiveResumableSprint(user.id, now);
  if (activeSprint) return false;

  // 3. In quiet hours?
  if (isInQuietHours(user, now)) return false;

  // 4. Cooldown elapsed?
  if (user.lastPushSentAt) {
    const cooldownEnd = addMinutes(user.lastPushSentAt, user.cooldownMinutes);
    if (now < cooldownEnd) return false;
  }

  // 5. Under max/day?
  const todayCount = getPushCountForToday(user, now);
  if (todayCount >= user.maxPushesPerDay) return false;

  // 6. Backlog threshold met?
  if (user.backlogThreshold) {
    const dueCount = await getDueCardCount(user.id);
    if (dueCount < user.backlogThreshold) return false;
  }

  return true;
}
```

## Push Payload

```typescript
{
  to: expoPushToken,
  title: "Time for a micro-sprint!",
  body: "5 cards ready for review",
  data: {
    type: "sprint",
    sprintId: "...",
    cardIds: ["...", "..."], // for debugging/fallback
    url: "/sprint/[sprintId]"
  },
  categoryId: "due_cards" // for iOS action buttons
}
```

## Scheduler Changes

- Run every 15 minutes (existing).
- For each user with due cards:
  1. Check eligibility.
  2. If eligible, create a sprint (source: PUSH).
  3. Send push notification with sprintId.
  4. Update `lastPushSentAt` and increment `pushCountToday`.

## Acceptance Criteria

- No pushes during quiet hours (user timezone).
- Enforce cooldown >= 120 minutes.
- Enforce max pushes/day.
- Optional backlog threshold works.
- No pushes while sprint is resumable.
- Push opens Sprint Review for the created sprint.
- Snooze action abandons sprint and snoozes cards >= 2h.

## Subtasks

- [ ] **11.1** Implement `isUserEligibleForPush()` function.
- [ ] **11.2** Implement quiet hours check with timezone support.
- [ ] **11.3** Implement cooldown check.
- [ ] **11.4** Implement max/day tracking and check.
- [ ] **11.5** Implement backlog threshold check.
- [ ] **11.6** Implement active sprint suppression check.
- [ ] **11.7** Update scheduler to use eligibility engine.
- [ ] **11.8** Update scheduler to create sprint before sending push.
- [ ] **11.9** Update push payload to include sprintId.
- [ ] **11.10** Update snooze handler to abandon sprint and snooze cards.
- [ ] **11.11** Add comprehensive tests for all eligibility rules.

## Dependencies

- Ticket 01 (user notification pref fields).
- Ticket 07 (sprint system).

## Estimated Effort

Large
