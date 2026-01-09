# MicroFlash Desktop (Electron) Implementation Plan

## Overview

A companion desktop application for Mac and Windows focused on **deck/card authoring and management**, with optional review/sprint support. Mobile remains the primary notification surface for micro-sprints.

### Goals

- Desktop app for **Mac + Windows** (website/GitHub download)
- Focus on **deck/card authoring + management**
- **Optional review/sprints** (reuse existing server sprint flow)
- **Anki `.apkg` import**: file picker → upload to server → spinner → result
- **Clerk sign-in** with long session duration ("as long as Clerk allows")
- **Online required** for meaningful use (offline cache/sync deferred)

### Non-Goals (MVP)

- Mac App Store / Microsoft Store distribution
- Auto-updates (defer until stable)
- Code signing (defer until stable)
- Offline-first / local cache / sync queue
- Tags
- Batch operations (multi-select, bulk edit)
- Rich editing (split-pane preview, templates, cloze, images)
- Desktop notifications

---

## Architecture Decisions

### A) New Workspace

- Create `apps/desktop` as a new pnpm workspace app
- Tooling: **electron-vite** (handles main + preload + renderer builds)
- Renderer: **React + Vite** (not Expo/RN-web)

### B) Renderer Strategy (Future Offline-Friendly)

- **Dev mode:** Load renderer from Vite dev server URL
- **Prod mode:** Load renderer from a **local HTTP origin** served by Electron main process
  - Avoids `file://` auth/storage/origin issues
  - Keeps UI "local" for future offline work

### C) Auth Strategy (Clerk)

- Use `@clerk/clerk-react` in the renderer
- API calls send `Authorization: Bearer <token>` via `getToken()`
- Server already supports Bearer auth via `@clerk/express`
- Configure Clerk session duration to maximum in dashboard
- Login requires internet; after login, session persists for days/weeks

### D) Electron Security Defaults

- `contextIsolation: true`
- `nodeIntegration: false`
- `sandbox: true`
- Preload uses `contextBridge` only if needed (minimal IPC for MVP)

---

## Code Organization / Reuse

### 1) Extract Shared API Client

Create `packages/api-client`:

- Move/derive from `apps/client/lib/api.ts`
- Make auth pluggable via injected `getAuthHeaders()`:
  - Desktop: Bearer token from Clerk `getToken()`
  - Mobile dev: existing `x-dev-clerk-id` header
  - Mobile prod (later): Clerk token
- Both desktop and mobile consume the same typed API calls

### 2) Adopt Shared DTOs

- `packages/shared` exists but isn't actively used
- Gradually align API client request/response types with shared DTOs
- Reduces drift between client implementations

---

## Implementation Phases

### Phase 0 — Auth Spike (De-risk Clerk + Electron)

**Goal:** Prove local-rendered Electron UI works with Clerk auth.

**Deliverables:**

1. Scaffold `apps/desktop` with electron-vite + React
2. Configure local HTTP origin for prod renderer
3. Integrate `@clerk/clerk-react` in renderer
4. Implement sign-in flow
5. Call `GET /api/me` with Bearer token
6. Verify session persistence across app restart

**Exit Criteria:**

- Sign in once → close app → reopen → still signed in
- Authenticated API call works

**Effort:** M (2-4 days)

---

### Phase 1 — Shared API Client Extraction

**Goal:** Avoid duplicating API logic between mobile and desktop.

**Deliverables:**

1. Create `packages/api-client` workspace
2. Extract/refactor from `apps/client/lib/api.ts`
3. Make auth pluggable (token provider pattern)
4. Update mobile client to use shared package
5. Desktop uses shared package with Clerk token provider

**Exit Criteria:**

- Both apps use `@microflash/api-client`
- No duplicated API wrapper code

**Effort:** S-M (1-2 days)

---

### Phase 2 — Desktop MVP Screens

**Goal:** Basic desktop UI for deck/card management.

**Deliverables:**

#### 2.1 — Desktop Layout + Navigation

- Simple layout (sidebar or top nav)
- Routes: Decks, Deck Detail, Card Editor, Sprint, Settings

#### 2.2 — Decks List

- List all decks with due counts
- Search/filter decks
- Create deck button

#### 2.3 — Deck Detail

- List cards in deck with search
- "Start sprint for this deck" button
- Create card button
- Edit/delete deck

#### 2.4 — Card Editor

- Create new card
- Edit existing card
- Delete card
- Plain text fields for front/back (Markdown/LaTeX content)
- Basic preview (render Markdown/LaTeX)

**Exit Criteria:**

- Can create/edit/delete decks and cards from desktop
- Changes reflect on mobile after sync

**Effort:** M (2-4 days)

---

### Phase 3 — Desktop Review/Sprint

**Goal:** Allow optional review on desktop using existing sprint system.

**Deliverables:**

#### 3.1 — Start Sprint

- Global "Start sprint" from home/decks view
- Per-deck "Start sprint" from deck detail
- Uses existing `POST /api/sprints/start`

#### 3.2 — Sprint Review Screen

- Load sprint by ID
- Show card front → reveal answer
- Grade buttons (Again/Hard/Good/Easy)
- Progress indicator
- Uses existing `POST /api/sprints/:id/review`

#### 3.3 — Sprint Complete Screen

- Show completion stats
- "Done" returns to previous view
- "One More Sprint" starts new sprint
- Uses existing `POST /api/sprints/:id/complete`

**Exit Criteria:**

- Can complete a full sprint on desktop
- Reviews sync to server (visible on mobile)

**Effort:** M (2-4 days)

---

### Phase 4 — Anki Import (Server + Desktop)

**Goal:** Import `.apkg` files from desktop.

**Deliverables:**

#### 4.1 — Server: Import Endpoint

- `POST /api/import/apkg` (multipart upload)
- Parse `.apkg` (zip containing SQLite DB)
- Libraries: `adm-zip` + `better-sqlite3`
- Extract decks and cards from `collection.anki2` / `collection.anki21`
- Skip media files (MVP)
- Create decks/cards in database
- Return result DTO:

```typescript
interface ImportResult {
  decksCreated: number;
  cardsCreated: number;
  warnings: string[]; // e.g., "Media files skipped"
}
```

#### 4.2 — Desktop: Import UI

- Import button/screen
- File picker (`<input type="file" accept=".apkg">`)
- Upload to server
- Show spinner during import
- Display success/error summary

**Exit Criteria:**

- Can import `.apkg` from desktop
- Imported decks/cards appear in deck list
- Can start sprint from imported deck

**Effort:** M (2-4 days)

---

### Phase 5 — Packaging (Website/GitHub Download)

**Goal:** Distributable installers for Mac and Windows.

**Deliverables:**

1. Configure `electron-builder`
2. macOS: `.dmg` and `.zip`
3. Windows: NSIS installer and portable `.exe`
4. GitHub Releases or website download

**Deferred:**

- Code signing (macOS notarization, Windows certificate)
- Auto-updates via `electron-updater`
- Mac App Store / Microsoft Store

**Exit Criteria:**

- Can download and install on Mac
- Can download and install on Windows
- App launches and works

**Effort:** S-M (1-2 days)

---

## Smoke Tests (MVP)

| Test            | Steps                      | Expected               |
| --------------- | -------------------------- | ---------------------- |
| Auth            | Sign in → restart app      | Still signed in        |
| Create deck     | Decks → Create → Save      | Deck appears in list   |
| Create card     | Deck → Add card → Save     | Card appears in deck   |
| Edit card       | Card → Edit → Save         | Changes persist        |
| Delete card     | Card → Delete → Confirm    | Card removed           |
| Start sprint    | Decks → Start sprint       | Sprint review opens    |
| Grade card      | Sprint → Reveal → Grade    | Next card shown        |
| Complete sprint | Grade all cards            | Sprint complete screen |
| Import          | Import → Pick .apkg → Wait | Decks/cards created    |

---

## File Structure (Proposed)

```
apps/desktop/
├── package.json
├── electron-vite.config.ts
├── electron-builder.yml
├── resources/
│   ├── icon.icns          # macOS icon
│   ├── icon.ico           # Windows icon
│   └── icon.png           # Linux icon
├── src/
│   ├── main/
│   │   └── index.ts       # Electron main process
│   ├── preload/
│   │   └── index.ts       # Preload script (if needed)
│   └── renderer/
│       ├── index.html
│       ├── index.tsx      # React entry
│       ├── App.tsx
│       ├── components/
│       ├── pages/
│       │   ├── Login.tsx
│       │   ├── Decks.tsx
│       │   ├── DeckDetail.tsx
│       │   ├── CardEditor.tsx
│       │   ├── SprintReview.tsx
│       │   ├── SprintComplete.tsx
│       │   └── Import.tsx
│       └── lib/
│           └── clerk.ts   # Clerk setup
└── tsconfig.json

packages/api-client/
├── package.json
├── src/
│   ├── index.ts
│   ├── client.ts          # API client with pluggable auth
│   ├── types.ts           # Request/response types
│   └── endpoints/
│       ├── decks.ts
│       ├── cards.ts
│       ├── sprints.ts
│       ├── home.ts
│       └── import.ts
└── tsconfig.json
```

---

## Server Changes Required

### New Endpoint: `POST /api/import/apkg`

Location: `apps/server/src/routes/import.ts`

**Dependencies to add:**

```json
{
  "adm-zip": "^0.5.x",
  "better-sqlite3": "^9.x"
}
```

**Endpoint spec:**

- Method: `POST`
- Path: `/api/import/apkg`
- Content-Type: `multipart/form-data`
- Auth: `requireUser`
- Body: `file` (the `.apkg` file)
- Response: `ImportResult` (see above)

### CORS (Already Open)

Server uses `cors()` with no restrictions — desktop origin will work.

---

## Effort Summary

| Phase | Description           | Effort     |
| ----- | --------------------- | ---------- |
| 0     | Auth spike            | M (2-4d)   |
| 1     | Shared API client     | S-M (1-2d) |
| 2     | Desktop MVP screens   | M (2-4d)   |
| 3     | Desktop review/sprint | M (2-4d)   |
| 4     | Anki import           | M (2-4d)   |
| 5     | Packaging             | S-M (1-2d) |

**Total estimated effort:** ~2-3 weeks for a single developer

---

## Risks & Mitigations

| Risk                             | Impact           | Mitigation                                              |
| -------------------------------- | ---------------- | ------------------------------------------------------- |
| Clerk fails in packaged Electron | Auth broken      | Use local HTTP origin (not file://); spike early        |
| `.apkg` format edge cases        | Import fails     | Support Legacy 2 format; clear error messages           |
| Large imports slow/timeout       | Bad UX           | Keep synchronous for MVP; add job queue later if needed |
| Session expires unexpectedly     | User frustration | Configure max session duration in Clerk dashboard       |

---

## Future Enhancements (Post-MVP)

- Offline cache + sync queue
- Auto-updates via electron-updater
- Code signing + notarization
- Mac App Store / Microsoft Store distribution
- Keyboard shortcuts
- Bulk operations (multi-select, batch edit)
- Rich card editor (split-pane preview)
- Export (Anki, CSV, Markdown)
