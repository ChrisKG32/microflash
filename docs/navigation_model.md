# Navigation Model

## 1) Destination map (grouped destinations):
### Public
- Welcome

### Auth
- Sign In (Clerk hosted)

### Onboarding (gated; fastest path to “first review”)
- Notifications Enablement (soft ask → system prompt)
- Import or Start Fresh
- Import Confirm
- Import Progress & Results
- Micro-sprint Setup
- (First Sprint) Sprint Review
- (First Sprint) Sprint Complete

### Core
- Home
- Sprint Review
- Sprint Complete
- Decks List
- Deck Detail
- Card Editor

### Settings
- Settings
- Notification Controls
- Account

---

## 2) Navigation model (structures and nesting):
Target: iOS MVP, React Navigation v7 (Expo)

### Why this shape (UX rationale)
- Use a **bottom tab bar** for the core shell because the app has a small number of top-level destinations (Home / Decks / Settings) and tab bars are the standard iOS pattern for switching between peer areas with high discoverability.
  - References: Apple HIG “Tab bars”; Nielsen Norman Group “Mobile Navigation Patterns” (visible nav beats hidden menus for discoverability).

### Root navigator (RootStack)
- **RootStack (native stack)**
  - `PublicStack` (Welcome → Sign In)
  - `OnboardingStack` (Notifications → Import/Start → Setup → First Sprint)
  - `MainTabs` (TabNavigator)
  - Shared push destinations outside tabs (so they’re “tab-agnostic” but still a normal push):
    - Sprint Review
    - Sprint Complete

> Key idea: Sprint Review / Complete live at the RootStack level so they can be pushed consistently from anywhere (Home, Deck Detail, deep link from push) without duplicating screens across tab stacks or creating weird “which tab owns the sprint?” behavior.

### PublicStack
- Welcome
- Sign In (Clerk hosted)

### OnboardingStack (linear, short, <30s)
- Notifications Enablement
- Import or Start Fresh
  - (If Import) Import Confirm → Import Progress & Results
- Micro-sprint Setup
- Sprint Review (first card)
- Sprint Complete
- Exit to `MainTabs` (Home tab)

### MainTabs (bottom tabs)
- **HomeTab (HomeStack)**
  - Home
- **DecksTab (DecksStack)**
  - Decks List
  - Deck Detail
  - Card Editor (only reachable from Deck Detail)
- **SettingsTab (SettingsStack)**
  - Settings
  - Notification Controls
  - Account
  - (Import screens accessible from Settings as a sub-flow)
    - Import or Start Fresh (entry point “Import”)
    - Import Confirm
    - Import Progress & Results

---

## 3) Navigation rules:
### - Auth gating:
- If **not signed in**: only PublicStack is reachable (Welcome → Sign In).
- After sign-in, user is routed to OnboardingStack **until onboardingComplete = true**.
- **OnboardingComplete = true** only after ALL are true:
  1) Account created / signed in
  2) Notifications permission prompt shown (user may allow or deny)
  3) User has at least one deck (created or imported)
  4) User has reviewed at least one card (i.e., completed first Sprint Review answer)
- If notifications are denied:
  - User may proceed into the app (do not block core usage).
  - Show a persistent, subtle “notifications disabled” indicator every time they open the app (see below).

### - Back behavior:
(iOS focus)
- **Standard iOS back behavior** everywhere (nav bar back + swipe-back) is enabled.
- Sprint Review:
  - Back/swipe-back simply pops to the previous screen (no confirmation).
  - Leaving Sprint Review keeps sprint resumable for 30 minutes (app logic).
- Deep-linked Sprint Review (from push):
  - Ensure the nav stack always has a safe “below” route.
  - If the app was cold-started by a push, the stack should effectively be: `MainTabs(Home)` → `Sprint Review`.
  - Back from Sprint Review returns to Home.
- Sprint Complete:
  - “Done” pops back to wherever Sprint Review was launched from (Home, Deck Detail, etc.).
  - If launched from push on cold start, “Done” returns to Home.

### - Modal vs push conventions:
- Default: **push** for almost everything.
- Sprint Review and Sprint Complete: **push** (explicitly not modal).
- Notifications-disabled education:
  - Tapping the warning icon opens a **modal** (lightweight explainer) with:
    - Dismiss
    - “Open Settings” (deep link to iOS settings / in-app Notification Controls screen as appropriate)

### - Entry points (only what impacts nav):
- App icon launch:
  - Always lands on **Home** (MainTabs default tab).
  - If there is a resumable sprint (within 30 minutes), show a **Resume** CTA on Home:
    - CTA includes a 5-second decreasing indicator; if not tapped within 5 seconds, it disappears (per your requirement).
- Push notification tap:
  - Opens **directly into Sprint Review** for the sprint associated with that notification.
  - No push notifications should fire while a resumable sprint exists (app logic). If it happens anyway, open the sprint referenced by the push.
- In-app “Start Sprint” (Home or Deck Detail):
  - Push Sprint Review on top of current location.

---

## 4) Top flows (5–10):
- First-time user onboarding (start fresh): Welcome → Sign In → Notifications Enablement → Import or Start Fresh (Start Fresh) → Micro-sprint Setup → Sprint Review (first card) → Sprint Complete → Home
- First-time user onboarding (import): Welcome → Sign In → Notifications Enablement → Import or Start Fresh (Import) → Import Confirm → Import Progress & Results → Micro-sprint Setup → Sprint Review → Sprint Complete → Home
- Start sprint from Home: Home → (Start Sprint) → Sprint Review → Sprint Complete → Home
- Start deck-only sprint: Decks List → Deck Detail → (Start Sprint for Deck) → Sprint Review → Sprint Complete → Deck Detail
- Push notification sprint: (Push tapped) → Sprint Review → Sprint Complete → Home
- Resume sprint (within 30 min): App launch → Home (Resume CTA for 5s) → Sprint Review → Sprint Complete → Home
- Notifications disabled education: Home (warning icon) → Notifications Disabled Modal → (Dismiss) → Home OR (Go to settings) → Notification Controls
- Edit a card: Decks List → Deck Detail → Card Editor → (Save) → Deck Detail
