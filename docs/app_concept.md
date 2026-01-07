# Concept Brief v1

## 1) One-sentence pitch:

A free, microlearning-first flashcard app that delivers tiny, priority-aware review sprints via respectful push notifications so spaced repetition actually happens throughout the day.

## 2) Target user:

Busy students and professionals (especially multi-subject learners) who believe in spaced repetition but regularly fall behind because “sit down and grind reviews” doesn’t fit their day.

## 3) Problem (current pain):

Traditional SRS apps create review backlogs that become long, dreaded sessions; users either batch reviews weekly (breaking optimal spacing) or stop entirely. Reminders and “study streak” nudges don’t reliably drive _real_ microlearning, and the friction of starting a session is too high for frequent, tiny bursts.

## 4) Promise (why this is better):

You’ll stay caught up with SRS in 30–90 second bursts because the app drip-feeds the _right_ due cards at the _right_ times, with clear controls that prevent overwhelm and notification fatigue.

## 5) Differentiation (1–3 points):

- **Micro-sprint scheduling as the core loop:** 3–10 cards per sprint, delivered throughout the day.
- **Priority-aware selection:** both deck-level and card-level priority influence what gets surfaced first.
- **Respectful push behavior:** predictable, user-controlled notifications with “snooze means snooze” handling.

## 6) MVP scope (high level):

### In:

- Basic decks + cards (create/edit/delete), plus import-friendly structure
- Markdown + LaTeX rendering in cards
- SRS scheduling (FSRS or comparable)
- Micro-sprint delivery via push notifications (one-tap starts a sprint)
- **Priority controls**
  - Deck priority slider
  - Card priority slider
- **Notification + sprint behavior**
  - Quiet hours, max pushes/day, cooldown between pushes
  - “Only notify when backlog ≥ X” (optional)
  - **Snooze semantics:** snoozing a notification skips that sprint and prevents resurfacing it for **at least 2 hours**
  - **Sprint resumption window:** if a user starts a micro-sprint and doesn’t finish:
    - they can resume it within **30 minutes**
    - after **30 minutes**, it auto-snoozes (treated as skipped) and won’t reappear for **at least 2 hours**
- **Tags (placeholder):** user can add/manage tags, but no meaningful behavior/weighting in MVP
- Anki import (.apkg) to reduce switching cost (onboarding accelerator)

### Out:

- Subscription or monetization (app is completely free; no subscription, ever)
- Watch app, motion triggers, calendar integration
- Full Anki parity (advanced templates/plugins/cloze power features beyond what’s needed)
- Tag-driven scheduling/analytics/recommendations (deferred)

## 7) Top risks (up to 5):

- **Notification fatigue** → users disable pushes → differentiator dies.
- **Notification reliability** across iOS/Android background constraints and device settings.
- **Switching inertia** even with Anki import (habits and ecosystems are sticky).
- **Import edge cases** (weird decks/media) erode trust if the first experience fails.
- **Free-only sustainability**: without monetization, long-term maintenance/hosting needs a plan (or clear “local-only / minimal backend” constraints).

## 8) Pivot options (2–4):

- **Queue manager positioning:** sell “review-load smoothing + micro-sprint scheduling,” not “another flashcard app.”
- **Niche-first:** target one high-intensity category (language vocab / exam cert / CS interview drills) with opinionated defaults.
- **Anki-adjacent tooling:** lean harder into “import + microlearning UX” as the main value, keep authoring minimal.
- **Optional hosted add-on later:** stay free/open-source core, but allow an optional hosted sync/backup service if sustainability becomes an issue.

## 9) Kill criteria (clear triggers):

- Users don’t complete micro-sprints from notifications at least ~3–5 days/week after initial onboarding.
- A large share of users disable notifications within the first 7–14 days.
- Users frequently abandon sprints and don’t resume within the 30-minute window (suggesting sprint size/UX is wrong).
- Backlog metrics don’t improve over 2–4 weeks (users remain perpetually overdue despite micro-sprints).
- Import fails often enough that support load is dominated by deck/media edge cases.
