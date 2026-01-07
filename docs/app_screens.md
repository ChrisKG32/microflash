# Screen & State Spec

## 1) Screen groups:
- Public
- Auth
- Onboarding
- Core
- Import
- Settings

## 2) Screens:

- **Welcome**
  - Purpose: Explain micro-sprints + “respectful notifications” value prop and push user into sign-in.
  - Primary actions: Sign in.
  - States:
    - Loading: None (static).
    - Empty: N/A
    - Error: N/A

- **Sign In (Clerk hosted)**
  - Purpose: Authenticate user (required; no guest mode).
  - Primary actions: Continue with GitHub/Discord/Google/email.
  - States:
    - Loading: Auth in progress.
    - Empty: N/A
    - Error: Auth failed / cancelled.

- **Notifications Enablement (soft ask → system prompt)**
  - Purpose: Explain why notifications matter; trigger OS permission prompt.
  - Primary actions: Enable notifications; Not now.
  - States:
    - Loading: Waiting for OS permission result.
    - Empty: N/A
    - Error: Notifications denied (show “How to enable in Settings” + continue).

- **Import or Start Fresh**
  - Purpose: Choose initial path: import Anki deck(s) or create first deck/card.
  - Primary actions: Import Anki (.apkg); Create deck.
  - States:
    - Loading: N/A
    - Empty: N/A
    - Error: N/A

- **Import Confirm**
  - Purpose: Let user choose which decks to import; set expectations.
  - Primary actions: Select decks; Import; Cancel.
  - States:
    - Loading: Reading file / parsing manifest.
    - Empty: No decks found in file.
    - Error: Unsupported/failed parse (show actionable reason + retry).

- **Import Progress & Results**
  - Purpose: Show import progress, then success summary and warnings (no media support).
  - Primary actions: Done; View decks; Re-import.
  - States:
    - Loading: Importing (progress indicator).
    - Empty: Imported 0 cards (explain why).
    - Error: Import failed mid-way (retry / report).

- **Micro-sprint Setup**
  - Purpose: Minimal configuration so notifications aren’t spammy and sprints feel right.
  - Primary actions: Set quiet hours; set max/day; set cooldown (>=2h); set sprint size (3–10); Continue.
  - States:
    - Loading: Saving settings.
    - Empty: N/A
    - Error: Validation/save failure.

- **Home**
  - Purpose: Command center: start a sprint now; see due/overdue; see notification status (paused/snoozed/next eligible time).
  - Primary actions: Start micro-sprint now; Snooze notifications; Go to Decks; Go to Settings; Import.
  - States:
    - Loading: Fetching due counts / next sprint selection.
    - Empty: Nothing due (show “You’re clear” + optional “review ahead” or “come back later”).
    - Error: Couldn’t load due state (retry).

- **Sprint Review**
  - Purpose: Core review loop in 30–90s; motivating progress bar; swipe + buttons grading.
  - Primary actions: Reveal answer; Grade (😬 / Uh Oh / Alright / Nailed it); Swipe grade; Pause/Exit.
  - States:
    - Loading: Building sprint / loading next card.
    - Empty: No eligible cards (show “Nothing due” + return Home).
    - Error: Scheduling/update failed for a card (retry / skip card).

- **Sprint Abandoned (state, not a separate screen)**
  - Purpose: If user leaves app >30 minutes mid-sprint, treat sprint as ended.
  - Primary actions: Resume is unavailable; Start new sprint.
  - States:
    - Loading: N/A
    - Empty: N/A
    - Error: N/A

- **Sprint Complete**
  - Purpose: Quick satisfying finish; optional gentle “call it a day” nudge.
  - Primary actions: Done; One more sprint; (optional) Call it a day.
  - States:
    - Loading: Saving final updates.
    - Empty: N/A
    - Error: Final save failed (retry).

- **Decks List**
  - Purpose: Browse decks and see due counts + priority indicator.
  - Primary actions: Open deck; Create deck; Search decks.
  - States:
    - Loading: Loading deck list.
    - Empty: No decks (CTA: import or create).
    - Error: Failed to load decks.

- **Deck Detail**
  - Purpose: Manage a deck: view due counts, start a sprint constrained to deck, set deck priority.
  - Primary actions: Start sprint for deck; Adjust priority slider; Add card; Search cards.
  - States:
    - Loading: Loading deck/cards.
    - Empty: Deck has no cards (CTA: add card).
    - Error: Failed to load deck.

- **Card Editor**
  - Purpose: Create/edit front/back card; set optional card priority (simple slider).
  - Primary actions: Save; Cancel; Delete card.
  - States:
    - Loading: Saving card.
    - Empty: Empty fields validation (disable save / show inline errors).
    - Error: Save failed.

- **Settings**
  - Purpose: Central place for notification behavior + account basics.
  - Primary actions: Open Notification Controls; Open Account; Re-run onboarding/setup (optional).
  - States:
    - Loading: Loading settings.
    - Empty: N/A
    - Error: Failed to load/save settings.

- **Notification Controls**
  - Purpose: Full respectful notification tuning (quiet hours, max/day, cooldown>=2h, snooze behavior).
  - Primary actions: Update controls; Test notification (optional); Open OS settings link if disabled.
  - States:
    - Loading: Saving changes.
    - Empty: N/A
    - Error: Save failed / notifications disabled.

- **Account**
  - Purpose: Basic account management.
  - Primary actions: Sign out.
  - States:
    - Loading: Signing out.
    - Empty: N/A
    - Error: Sign out failed.

## 3) Open questions (only if blocking):
- Do you want a “Review ahead” option when nothing is due, or strictly due/overdue only?
