# Project Overview

## Product Summary

MicroFlash is a **free**, microlearning-first spaced repetition flashcard app. Instead of long review sessions and growing backlogs, it delivers **tiny, priority-aware review sprints** (typically **3–10 cards** in **30–90 seconds**) throughout the day, supported by **respectful, user-controlled push notifications**.

The goal is simple: help busy learners stay caught up on spaced repetition by making "do a little now" the default.

**Completely free; no subscription, ever.**

## Target User

Busy students and professionals (especially multi-subject learners) who value spaced repetition but routinely fall behind because traditional apps funnel them into long, dreaded review sessions.

## Core Differentiators

- **Micro-sprint scheduling as the core loop:** short, frequent review bursts (not long sessions).
- **Priority-aware selection:** deck priority + card priority influence which due items surface first.
- **Respectful notifications:** predictable and controllable push behavior, with "snooze means snooze."

---

# Core Functionality (MVP)

## Decks & Cards

- Create/edit/delete decks and cards.
- Card content supports **Markdown** and **LaTeX** rendering.
- **Card types**:
  - **Two-sided cards**: Have both front (question) and back (answer) content
  - **One-sided cards**: Have only front content; back is empty (useful for facts, definitions, or self-assessment)
- **Desktop card editor** uses unified markdown format with `\n---\n` separator to split front/back
- Tags exist as a **placeholder feature** (basic manage/add), without meaningful scheduling behavior in MVP.

## Spaced Repetition Scheduling

- Uses **FSRS (or comparable)** to schedule reviews based on performance history.
- After each graded review, the scheduler updates the card state and computes the next due time.

## Micro-Sprints (Primary Experience)

A micro-sprint is a small queue of due/eligible cards (typically 3–10). Users can:

- Start a sprint from **Home** ("Start now").
- Start a sprint constrained to a **specific deck** from Deck Detail.
- Start a sprint directly from a **push notification tap**.

### Sprint Review UI

- Reveal answer → grade recall (4-grade scale).
- Progress indicator designed for quick completion and momentum.

### Sprint Resumption

- If a user leaves mid-sprint, they can **resume within 30 minutes**.
- After **30 minutes**, the sprint is treated as **skipped/auto-snoozed** and won't reappear for **at least 2 hours**.

## Push Notifications (Respectful by Design)

Notifications exist to _trigger micro-sprints_, not to nag endlessly.

Key controls/behaviors:

- **Quiet hours**
- **Max pushes/day**
- **Cooldown between pushes (≥ 2 hours)**
- Optional: **Only notify when backlog ≥ X**
- **Snooze semantics:** snoozing a notification skips that sprint and prevents resurfacing for **at least 2 hours**
- While a sprint is resumable, the app should avoid firing new sprint notifications (app logic).

## Anki Import (Onboarding Accelerator)

- Import Anki `.apkg` to reduce switching cost and speed up time-to-first-review.
- Import flow includes: deck selection, progress, and results/warnings.
- MVP limitation: **no media support** (surface clearly in import results).

---

# Screens & Navigation Overview

## Screen Groups

- Public
- Auth
- Onboarding
- Core
- Import
- Settings

## Navigation Shape (iOS MVP)

- **RootStack**
  - `PublicStack` (Welcome → Sign In)
  - `OnboardingStack` (Notifications → Import/Start → Micro-sprint Setup → First Sprint)
  - `MainTabs` (Home / Decks / Settings)
  - Shared push destinations at root:
    - **Sprint Review**
    - **Sprint Complete**

**Why Sprint screens live at RootStack:** they must be launchable consistently from anywhere (Home, Deck Detail, deep link from push) without duplicating ownership across tabs.

## Auth + Onboarding Gating

- No guest mode; user must sign in.
- After sign-in, user remains in onboarding until `onboardingComplete = true`.
- OnboardingComplete requires:
  1. Signed in
  2. Notifications prompt shown (allow or deny)
  3. At least one deck exists (created or imported)
  4. User has reviewed at least one card

If notifications are denied, the user can proceed, but the app should show a subtle persistent indicator and provide a path to enable notifications later.

---

# Technical Overview

## Stack

- **Language:** TypeScript
- **Client:** React Native + Expo (expo-router), React Navigation
- **Auth:** Clerk
- **Server:** Express
- **Database:** PostgreSQL (Prisma ORM)
- **Push:** Expo Push Notifications

## Architecture Summary

Client-server architecture:

- Server owns data, scheduling state, and APIs for decks/cards/reviews/settings.
- Client handles onboarding, review UX, deck/card management, and notification permission/token registration.
- A scheduler/service coordinates when users are eligible for the next micro-sprint notification based on:
  - Due backlog
  - User limits (quiet hours, max/day, cooldown)
  - Sprint/resume/snooze rules

---

# MVP Constraints / Non-Goals

- **No subscription or monetization** (free, forever).
- Tags do not affect scheduling in MVP.
- Import is supported, but **media is not** (MVP).
- Notification behavior must prioritize trust (cooldowns, quiet hours, strong snooze semantics).

---

# Future Considerations (Post-MVP)

- Tag-driven scheduling/analytics
- Richer import parity (including media/templates)
- Advanced analytics and review insights
- Offline review capability
- Multi-device sync improvements
