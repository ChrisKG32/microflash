# Navigation Pack

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

### Core (Main app)

- Review Home (aka “Review” tab root; formerly Home)
- Sprint Review
- Sprint Complete
- Decks List (aka “Library” tab root)
- Deck Detail
- Card Editor

### Menu (via avatar popover)

- Profile (placeholder)
- Stats (placeholder)
- Settings
  - Notification Controls
  - Account
  - Import (sub-flow entry point)
    - Import or Start Fresh
    - Import Confirm
    - Import Progress & Results

### Header actions (top navbar)

- Notifications button (placeholder; no functional destination yet)

---

## 2) Navigation model (structures and nesting):

Target: iOS MVP, React Navigation v7 (Expo)

### Root navigator (RootStack)

- **RootStack (native stack)**
  - `PublicStack` (Welcome → Sign In)
  - `OnboardingStack` (Notifications → Import/Start → Setup → First Sprint)
  - `MainTabs` (BottomTabNavigator)
  - `MenuStack` (Settings + placeholder destinations launched from avatar popover)
    - Profile (placeholder)
    - Stats (placeholder)
    - Settings
    - Notification Controls
    - Account
    - Import flow screens (reused)
  - Shared push destinations outside tabs (tab-agnostic):
    - Sprint Review
    - Sprint Complete

> Key idea: Sprint Review / Complete live at the RootStack level so they can be pushed consistently from anywhere (Review tab, Library tab, Settings, deep link from push) without duplicating screens across stacks.

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
- Exit to `MainTabs` (Review tab)

### MainTabs (bottom tabs)

- **ReviewTab (ReviewStack)**
  - Review Home
- **LibraryTab (LibraryStack)**
  - Decks List
  - Deck Detail
  - Card Editor (only reachable from Deck Detail)

### Top navbar (header) composition

**CRITICAL: Only one header is ever shown at a time.**

- Avoid enabling headers on both Tabs and nested Stacks simultaneously.
- Each tab's nested Stack should own its own header (Tabs header disabled for that tab).

Applies across stacks by default:

- **Left:** iOS back button when `canGoBack` (and iOS swipe-back enabled).
- **Right:** Notifications icon (placeholder) + Avatar button.
  - Avatar button opens a **popover** with:
    - Profile (placeholder)
    - Settings
    - Stats (placeholder)

Notes:

- Review Home / Decks List (tab roots) have **no back button**.
- When drilling into Library (Deck Detail → Card Editor), the **same single top header** updates (title changes, back button appears); no nested/second header appears.
- Sprint Review / Sprint Complete can optionally **hide header-right actions** (notifications/avatar) to reduce accidental taps during review; keep the back button behavior consistent.

---

## 3) Navigation rules:

### - Auth gating:

- If **not signed in**: only PublicStack is reachable (Welcome → Sign In).
- After sign-in, user is routed to OnboardingStack **until onboardingComplete = true**.
- **OnboardingComplete = true** only after ALL are true:
  1. Account created / signed in
  2. Notifications permission prompt shown (user may allow or deny)
  3. User has at least one deck (created or imported)
  4. User has reviewed at least one card (i.e., completed first Sprint Review answer)

### - Back behavior:

(iOS focus)

- Standard iOS back behavior everywhere (nav bar back + swipe-back) is enabled.
- **MenuStack (Settings/Profile/Stats):**
  - Opening from avatar popover pushes onto RootStack above whatever the user was doing.
  - Back returns to the exact prior screen (e.g., Deck Detail, Review Home, etc.).
- Sprint Review:
  - Back/swipe-back pops to the previous screen (no confirmation).
  - Leaving Sprint Review keeps sprint resumable for 30 minutes (app logic).
- Deep-linked Sprint Review (from push):
  - If cold-started by a push, the stack should effectively be: `MainTabs(Review)` → `Sprint Review`.
  - Back from Sprint Review returns to Review Home.
- Sprint Complete:
  - “Done” pops back to wherever Sprint Review was launched from.
  - If launched from push on cold start, “Done” returns to Review Home.

### - Modal vs push conventions:

- Default: **push** for almost everything.
- Sprint Review / Sprint Complete: **push** (not modal).
- Avatar popover:
  - Popover is not a route; selecting an item triggers a **push** into `MenuStack`.
- Notifications button (placeholder):
  - No navigation for now. If it must do _something_, use a lightweight non-route behavior (e.g., toast) rather than a dead-end screen.

### - Entry points (only what impacts nav):

- App icon launch:
  - Lands on **Review Home** (MainTabs default tab = Review).
  - If there is a resumable sprint (within 30 minutes), show a **Resume** CTA on Review Home (per your existing rules).
- Push notification tap:
  - Opens **directly into Sprint Review** for the sprint associated with that notification.
- In-app “Start Sprint” (Review Home or Deck Detail):
  - Push Sprint Review on top of current location.

---

## 4) Top flows (5–10):

- First-time user onboarding (start fresh):
  - Welcome → Sign In → Notifications Enablement → Import or Start Fresh (Start Fresh) → Micro-sprint Setup → Sprint Review → Sprint Complete → Review Home
- First-time user onboarding (import):
  - Welcome → Sign In → Notifications Enablement → Import or Start Fresh (Import) → Import Confirm → Import Progress & Results → Micro-sprint Setup → Sprint Review → Sprint Complete → Review Home
- Start sprint from Review Home:
  - Review Home → Sprint Review → Sprint Complete → Review Home
- Start deck-only sprint:
  - Library (Decks List) → Deck Detail → (Start Sprint for Deck) → Sprint Review → Sprint Complete → Deck Detail
- Push notification sprint:
  - (Push tapped) → Sprint Review → Sprint Complete → Review Home
- Edit a card:
  - Library (Decks List) → Deck Detail → Card Editor → (Save) → Deck Detail
- Open settings from anywhere:
  - Any screen → Avatar → Settings → (Back) → prior screen
- Import from settings:
  - Any screen → Avatar → Settings → Import → Import Confirm → Import Progress & Results → (Done) → Settings

---

## 5) Parking Lot (deferred items):

- Parking Lot: 3 — Notifications button destination — Decide whether this becomes an Inbox/History screen, or stays as a no-op until real notification UX exists.
- Parking Lot: 3 — Profile / Stats screens — Define what “Profile” and “Stats” mean before wiring navigation beyond placeholders.
