# Architecture Snapshot

## 1) Overview (components):
- **iOS Mobile App (Expo / React Native + React Navigation v7)**
  - Screens + local cache (AsyncStorage) + offline mutation queue
  - Uses Clerk hosted sign-in UI
  - Uses Expo Notifications (receives push, registers Expo push token)
- **Backend API (Node + Express)**
  - Verifies Clerk JWT on requests
  - CRUD + sync for decks/cards/reviews/settings
  - Import endpoint (upload `.apkg`, server parses)
  - Push token registry + notification sending via Expo Push API
  - **In-process cron** (node cron) to schedule push prompts
- **PostgreSQL**
  - Source of truth for users, decks, cards, review state, review sessions, notification settings, push token, sync cursors
- **Third parties**
  - **Clerk** (auth + hosted UI; backend JWT verification; user deletion)
  - **Expo Push service / APNs** (push delivery)

## 2) Responsibilities (who owns what):
- **Mobile app owns**
  - UX + navigation flows (Public/Auth/Onboarding/Core/Settings)
  - Offline-first behavior: read from local cache, queue writes when offline
  - Local “review now” and “start sprint now” entry points
  - Applying review grades to local card state immediately (so sprint UX never blocks)
  - Registering / refreshing Expo push token (when permission changes or token rotates)
- **Backend API owns**
  - Canonical persistence + cross-session continuity
  - Sync protocol (pull changes, accept queued writes, resolve conflicts as last-write-wins)
  - Import parsing and DB writes for `.apkg`
  - Notification prompting policy enforcement (quiet hours, max/day, cooldown>=2h, snooze windows, “no pushes when resumable sprint exists”)
  - Recording “review sessions” (sprints) and basic metrics counts (no analytics tooling)
  - Account deletion: wipe DB + delete Clerk user (server-to-server)
- **Postgres owns**
  - Durable state + simple timestamps needed for last-write-wins and incremental sync

## 3) Integrations:
- **Auth**
  - Clerk (mobile hosted sign-in)
  - Backend JWT verification middleware (Clerk SDK/JWKS)
- **Push**
  - Expo Notifications on device (permission + token)
  - Backend sends via Expo Push API (token stored per user; replace on re-register)
- **Import**
  - Mobile uploads `.apkg` to backend
  - Backend parses and writes to Postgres
- **No analytics / no crash reporting**
  - Rely on basic server logs only (no external pipeline)

## 4) Data paths (high level):
- **Sign-in + onboarding**
  - App → Clerk sign-in → receives session token → App calls Backend for profile/bootstrap
  - App completes onboarding steps (notifications prompt shown, at least one deck exists, first review completed) → Backend stores onboardingComplete
- **Periodic sync (normal operation)**
  - App (on launch, foreground, and after edits/reviews) calls:
    - Pull: “changes since lastSyncCursor”
    - Push: queued local mutations (create/update/delete decks/cards; review updates; settings changes)
  - Backend applies last-write-wins using per-record `updatedAt` (and tombstones for deletes), returns new cursor
- **Start sprint now (manual)**
  - App requests “start a review session” (optionally constrained to a deck)
  - Backend creates a **review session record** and returns the selected cards (or a due set slice) + session id
  - App runs the review loop; each grade updates local state immediately and queues mutation(s) for sync
- **Push-prompted sprint**
  - Cron on Backend evaluates eligibility per user (quiet hours, cooldown>=2h, max/day, snooze/skip windows, backlog thresholds)
  - Backend sends push via Expo
  - User taps push → app deep links to Sprint Review → app calls Backend to start a session (same as manual start)
- **Offline review/edit**
  - App works from local cache; edits and review outcomes append to a local mutation queue in AsyncStorage
  - When back online, queued writes are pushed; conflict resolution is last-write-wins
  - Import is disabled offline
- **Import**
  - App uploads `.apkg` → Backend parses → writes decks/cards → App syncs down
- **Account deletion**
  - App calls Backend “delete my account”
  - Backend deletes all Postgres data for user + calls Clerk to delete the user

## 5) Assumptions:
- **Single active device per user** early on (no multi-device coordination)
- iOS-first MVP; Android later
- Push notifications are “prompts,” not the only way to start a sprint
- “Server scheduling” primarily means **server decides when to prompt**; the app must still function offline using locally cached review state
- Last-write-wins is acceptable for MVP (no merge UI)
- AsyncStorage local cache size stays reasonable for early users (import sizes are “basic”)

## 6) Risks + mitigations (top 5):
1. **AsyncStorage performance/scaling** (large decks/imports make reads/writes slow, sync heavy)  
   - Mitigation: treat AsyncStorage as MVP cache; keep records chunked; move to SQLite when card count/import size grows.
2. **In-process cron + horizontal scaling** (multiple API instances can double-send pushes; restarts can miss schedules)  
   - Mitigation: run a single API instance for MVP or add a simple leader lock in Postgres; later split cron into a worker service.
3. **Offline + server-driven prompting mismatch** (user reviews offline; server’s “due/backlog” view may be stale → prompts feel wrong)  
   - Mitigation: keep sync frequent on foreground; make prompts conservative (respect cooldowns/snooze) and allow “review now” to cover gaps.
4. **No observability** (push delivery failures / import errors become hard to debug)  
   - Mitigation: store minimal internal audit rows in Postgres (push attempts, import job status, last sync time) without external analytics tooling.
5. **Import edge cases** (weird `.apkg` structure/media/cloze/templates) degrade trust on day 1  
   - Mitigation: strict MVP scope messaging (“basic cards only, no media”), clear import warnings/results, and fail-fast with actionable errors.
