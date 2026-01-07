# Home Screen (Command Center)

## Title

Home screen (MVP command center)

## Goal

Home becomes the central hub: "Start Sprint", due/overdue counts, resume CTA, review-ahead entry, and notification status.

## Scope

Server endpoint for home summary data; client Home screen UI.

## Acceptance Criteria

- Shows due card count + "Start Sprint" button.
- If resumable sprint exists, shows "Resume" CTA for 5 seconds on app open.
- If nothing due, shows "You're clear" message + "Review Ahead" CTA.
- Shows notifications disabled indicator when permission denied.
- Shows next eligible push time (if notifications enabled).

## Home Summary Data

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
  notificationsPermissionDenied: boolean;
}
```

## UI States

### Loading

- Spinner + "Loading..."

### Has Due Cards

- Due count badge
- "Start Sprint" primary button
- Optional: "X cards overdue" warning if overdueCount > 0

### Nothing Due

- "You're clear!" message
- "Review Ahead" secondary button
- "Come back later" or next review time hint

### Resumable Sprint

- "Resume Sprint" CTA (prominent)
- Shows for 5 seconds on app open, then fades/hides
- Tapping navigates to sprint

### Notifications Disabled

- Subtle persistent indicator (icon or banner)
- Tapping opens modal with guidance to enable

### Error

- Error message + "Retry" button

## Subtasks

- [ ] **06.1** Server: `GET /api/home/summary` endpoint.
- [ ] **06.2** Client: Home screen layout with all states.
- [ ] **06.3** Client: Resume CTA with 5-second visibility timer.
- [ ] **06.4** Client: "Start Sprint" button wired to sprint start.
- [ ] **06.5** Client: "Review Ahead" button wired to browse mode.
- [ ] **06.6** Client: Notifications disabled indicator + modal.
- [ ] **06.7** Client: Pull-to-refresh support.

## Dependencies

- Ticket 07 (sprint system for resumable sprint check).
- Ticket 11 (notification eligibility for next push time).

## Estimated Effort

Medium
