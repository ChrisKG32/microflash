# Navigation Restructure

## Title

expo-router restructure to match MVP navigation model

## Goal

Implement RootStack with route groups: PublicStack, OnboardingStack, MainTabs; sprint screens live at root level.

## Scope

Reorganize expo-router file structure and layouts to match `docs/navigation_model.md`.

## Acceptance Criteria

- Root routes exist for Sprint Review + Sprint Complete (tab-agnostic).
- Push notification tap always lands on Sprint Review with safe back behavior.
- Cold start from push results in: MainTabs(Home) -> Sprint Review; back returns to Home.
- Route groups properly gate access based on auth + onboarding state.

## Target Structure

```
app/
  _layout.tsx              # RootStack
  (public)/
    _layout.tsx            # PublicStack
    welcome.tsx
    sign-in.tsx
  (onboarding)/
    _layout.tsx            # OnboardingStack
    notifications.tsx
    import-or-start.tsx
    import-confirm.tsx
    import-progress.tsx
    import-results.tsx
    setup.tsx
  (tabs)/
    _layout.tsx            # MainTabs (bottom tabs)
    index.tsx              # Home
    decks.tsx              # Decks List
    settings.tsx           # Settings
  deck/
    [id].tsx               # Deck Detail
  card/
    [id].tsx               # Card Editor (create/edit)
  sprint/
    [id].tsx               # Sprint Review (graded)
    complete.tsx           # Sprint Complete
  browse.tsx               # Review Ahead (browse-only)
  notification-controls.tsx
  account.tsx
```

## Navigation Rules

### Auth Gating

- Not signed in: only `(public)` routes accessible.
- Signed in but `onboardingComplete = false`: only `(onboarding)` routes accessible.
- Signed in and `onboardingComplete = true`: `(tabs)` and other core routes accessible.

### Back Behavior

- Sprint Review: back pops to previous screen (no confirmation).
- Deep-linked Sprint Review (from push): stack is `MainTabs(Home) -> Sprint Review`; back returns to Home.
- Sprint Complete: "Done" pops to launch context.

### Push Deep Links

- Push payload includes `sprintId`.
- On tap: navigate to `/sprint/[sprintId]`.
- Ensure nav stack has Home below sprint screen.

## Subtasks

- [ ] **05.1** Create `(public)` layout and routes (welcome, sign-in).
- [ ] **05.2** Create `(onboarding)` layout and placeholder routes.
- [ ] **05.3** Update `(tabs)` layout (Home, Decks, Settings tabs).
- [ ] **05.4** Create root sprint routes (`sprint/[id].tsx`, `sprint/complete.tsx`).
- [ ] **05.5** Create browse route (`browse.tsx`).
- [ ] **05.6** Create deck detail and card editor routes.
- [ ] **05.7** Create notification-controls and account routes.
- [ ] **05.8** Implement auth + onboarding gating in root layout.
- [ ] **05.9** Update notification response handler to navigate to sprint routes.
- [ ] **05.10** Ensure cold-start from push has correct back-stack behavior.
- [ ] **05.11** Remove legacy `review-session.tsx` route.

## Dependencies

- Ticket 03 (auth state needed for gating).
- Ticket 04 (onboarding state needed for gating).

## Estimated Effort

Medium
