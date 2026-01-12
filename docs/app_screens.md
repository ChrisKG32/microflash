# Screen & State Spec (updated for latest navigation model + shell chrome) :contentReference[oaicite:0]{index=0}

## 1) Screen groups:

- Public
- Auth
- Onboarding (gated)
- Core
- Library
- Settings (accessed via avatar menu)
- Global overlays / placeholders

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
  - Purpose: Explain why notifications matter; trigger OS permission prompt (after sign-in).
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
  - Purpose: Let user choose which decks to import; choose import mode.
  - Primary actions: Select decks; choose mode (Replace / Import as new); Import; Cancel.
  - States:
    - Loading: Reading file / parsing manifest.
    - Empty: No decks found in file.
    - Error: Unsupported/failed parse (actionable reason + retry).

- **Import Progress & Results**
  - Purpose: Show import progress, then success summary + warnings (no media support).
  - Primary actions: Done; View Library; Re-import.
  - States:
    - Loading: Importing (progress indicator).
    - Empty: Imported 0 cards (explain why).
    - Error: Import failed mid-way (retry).

- **Micro-sprint Setup**
  - Purpose: Minimal configuration so notifications aren’t spammy and sprints feel right.
  - Primary actions: Set quiet hours; set max/day; set cooldown (>=2h); set sprint size (3–10); Continue.
  - States:
    - Loading: Saving settings.
    - Empty: N/A
    - Error: Validation/save failure.

---

### Core (Review)

- **Review (Home)**
  - Purpose: Command center for quick sprints; show due/overdue and notification status.
  - Primary actions:
    - Start micro-sprint now
    - Snooze (>=2h)
    - Go to Library (via bottom tab)
    - Open Notifications (header icon; placeholder for now if no functionality)
    - Open avatar menu (Profile / Settings / Stats placeholders as applicable)
  - States:
    - Loading: Fetching due counts / next sprint selection / resumable sprint check.
    - Empty: Nothing due/overdue (show “You’re clear” + next-eligible-notification info).
    - Error: Couldn’t load due state (retry).
  - Additional UX states (material to UI):
    - Resumable sprint available: Show a **Resume** CTA on Home that auto-disappears after ~5 seconds if not tapped.
    - Notifications denied: Persistent subtle indicator (e.g., warning icon) that opens Notifications Disabled Modal.

- **Sprint Review**
  - Purpose: Core review loop in 30–90s; motivating progress (bar + “cards left”).
  - Primary actions:
    - Reveal answer
    - Grade (😬 / Uh Oh / Alright / Nailed it) via buttons + swipe
    - Exit/back (no confirmation)
  - States:
    - Loading: Building sprint / loading next card.
    - Empty: No eligible due/overdue cards (explain + return to Review).
    - Error: Scheduling/update failed for a card (retry / skip card).

- **Sprint Complete**
  - Purpose: Quick satisfying finish; optionally nudge to stop after one sprint.
  - Primary actions: Done; One more sprint; (optional) Call it a day.
  - States:
    - Loading: Saving final updates.
    - Empty: N/A
    - Error: Final save failed (retry).

- **Sprint Abandoned (state, not a separate screen)**
  - Purpose: If user leaves the app >30 minutes mid-sprint, treat sprint as ended and do not resume.
  - Primary actions: Start new sprint (from Review / Deck Detail).
  - States:
    - Loading: N/A
    - Empty: N/A
    - Error: N/A

---

### Library

**Navigation Note:** All Library screens use the **same single top nav** (owned by the Library Stack). When drilling into Deck Detail or Card Editor, the header title updates and the back button appears—no nested/second header is shown.

- **Library (Decks List)**
  - Purpose: Browse decks; see due counts + deck priority indicator.
  - Primary actions: Open deck; Create deck; Search decks.
  - States:
    - Loading: Loading deck list.
    - Empty: No decks (CTA: import or create).
    - Error: Failed to load decks.

- **Deck Detail**
  - Purpose: Manage a deck; deck-level priority; browse cards; start a deck-only sprint.
  - Primary actions:
    - Start sprint for this deck
    - Adjust deck priority slider (optional)
    - Add card
    - Search cards
  - States:
    - Loading: Loading deck/cards.
    - Empty: Deck has no cards (CTA: add card).
    - Error: Failed to load deck.

- **Card Editor**
  - Purpose: Create/edit front/back card; set optional card priority (simple slider).
  - Primary actions: Save; Cancel; Delete card.
  - States:
    - Loading: Saving card.
    - Empty: Empty fields validation (disable save / inline errors).
    - Error: Save failed.

---

### Settings (accessed from avatar menu)

- **Settings**
  - Purpose: Central place for notification behavior + account basics + import entry point.
  - Primary actions: Open Notification Controls; Open Account; Import (launch import sub-flow).
  - States:
    - Loading: Loading settings.
    - Empty: N/A
    - Error: Failed to load/save settings.

- **Notification Controls**
  - Purpose: Full respectful notification tuning (quiet hours, max/day, cooldown>=2h, snooze behavior).
  - Primary actions: Update controls; Open OS settings link if disabled.
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

---

### Global overlays / placeholders

- **Notifications Disabled Modal (overlay)**
  - Purpose: Explain impact of disabled notifications and how to enable.
  - Primary actions: Dismiss; Open Settings (deep link to OS settings or in-app Notification Controls).
  - States:
    - Loading: N/A
    - Empty: N/A
    - Error: N/A

- **Notifications (placeholder)**
  - Purpose: Placeholder destination for the header notifications button (no functionality yet).
  - Primary actions: None (or “Coming soon”).
  - States:
    - Loading: N/A
    - Empty: Always empty (“No notifications yet”).
    - Error: N/A

- **Profile (placeholder)**
  - Purpose: Placeholder destination from avatar menu.
  - Primary actions: None (or “Coming soon”).
  - States:
    - Loading: N/A
    - Empty: Always empty.
    - Error: N/A

- **Stats (placeholder)**
  - Purpose: Placeholder destination from avatar menu.
  - Primary actions: None (or “Coming soon”).
  - States:
    - Loading: N/A
    - Empty: Always empty.
    - Error: N/A

---

## 3) Open questions (only if blocking):

- When the user taps the header **Notifications** icon: do you want a placeholder screen (recommended for now), or should it open the Notifications Disabled Modal only when notifications are off and otherwise do nothing?

## 4) Parking Lot (deferred items):

- Parking Lot: 2 — Tag UX — Keep tags as placeholders; add tagging UI + tag priority only when there’s a real use case.
- Parking Lot: 2 — Motivation polish — Iterate on progress/micro-milestones (“cards left”, half-way cues, finish-line cues) once core loop is stable.
