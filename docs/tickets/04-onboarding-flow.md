# Onboarding Flow

## Title

Onboarding flow + gating rules (as per docs)

## Goal

Implement: Welcome -> Sign In -> Notifications prompt -> Import/Start -> Micro-sprint setup -> First Sprint -> Main app.

## Scope

Client screens and server endpoints for onboarding state management.

## Acceptance Criteria

- `onboardingComplete` requires ALL of:
  1. User is signed in
  2. Notifications prompt has been shown (allow or deny)
  3. At least 1 deck exists (created or imported)
  4. User has submitted at least 1 graded review
- If notifications denied, onboarding proceeds but app shows persistent indicator.
- User cannot access MainTabs until onboarding is complete.

## Screens

### Welcome

- Purpose: Explain micro-sprints + "respectful notifications" value prop.
- Actions: "Sign In" button.
- States: Static (no loading/error).

### Notifications Enablement

- Purpose: Explain why notifications matter; trigger OS permission prompt.
- Actions: "Enable Notifications" (triggers OS prompt), "Not Now" (skips).
- States: Loading (waiting for OS result), Error (denied - show guidance).
- On completion: Record `notificationsPromptedAt` timestamp.

### Import or Start Fresh

- Purpose: Choose initial path.
- Actions: "Import Anki (.apkg)", "Create First Deck".
- Routes to: Import flow OR deck creation.

### Micro-sprint Setup

- Purpose: Configure notification/sprint preferences.
- Fields:
  - Quiet hours (start/end time pickers)
  - Max pushes per day (slider: 1-12, default 6)
  - Cooldown between pushes (slider: 2-8 hours, default 2, minimum 2)
  - Sprint size (slider: 3-10, default 5)
  - Backlog threshold (optional: "Only notify when X+ cards due")
- Actions: "Continue" (saves settings).

### First Sprint

- Purpose: Complete onboarding by reviewing at least one card.
- Behavior: Starts a normal sprint; on first graded review, sets `onboardingComplete = true`.

## Subtasks

- [ ] **04.1** Create Welcome screen with value prop messaging.
- [ ] **04.2** Create Notifications Enablement screen with soft-ask + OS prompt.
- [ ] **04.3** Create Import or Start Fresh screen.
- [ ] **04.4** Create Micro-sprint Setup screen with preference controls.
- [ ] **04.5** Server: `PATCH /api/me/onboarding` to update notification prefs and mark prompt shown.
- [ ] **04.6** Server: `GET /api/me/onboarding-status` to check completion rules.
- [ ] **04.7** Server: track "first graded review" to complete onboarding.
- [ ] **04.8** Client: onboarding gating logic (redirect to onboarding if incomplete).
- [ ] **04.9** Client: persistent "notifications disabled" indicator component.

## Dependencies

- Ticket 01 (user onboarding fields).
- Ticket 03 (auth must work).
- Ticket 05 (navigation structure).

## Estimated Effort

Medium-Large
