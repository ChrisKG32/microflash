# Anki Import

## Title

Anki `.apkg` import (cards-only, no review history, no media) + onboarding integration

## Goal

Enable import flow that accelerates time-to-first-review by reducing switching cost.

## Scope

Server: `.apkg` upload, parse, create decks/cards.
Client: Import flow screens.

## Constraints (MVP Decisions)

- Import **cards only** (ignore revlog/review history).
- **No media** support (warn user clearly).
- Deck nesting constrained to **max depth = 2** (flatten deeper hierarchies).

## .apkg Format Overview

- ZIP archive containing SQLite database (`collection.anki2` or `collection.anki21`).
- Key tables: `notes` (content), `cards` (scheduling), `col` (decks/models as JSON).
- Fields in `notes.flds` separated by `\x1F` (ASCII unit separator).
- Deck hierarchy in names: `"Parent::Child::Grandchild"`.

## Import Flow

### 1. Upload

- User selects `.apkg` file.
- Client uploads to server.

### 2. Parse & Preview

- Server extracts and parses `.apkg`.
- Returns deck list with card counts for user selection.

### 3. Confirm

- User selects which decks to import.
- User sees warnings (media not supported, depth flattening).

### 4. Import

- Server creates Deck/Card records.
- Shows progress indicator.

### 5. Results

- Summary: X decks created, Y cards imported.
- Warnings: media skipped, decks flattened.
- Actions: "View Decks", "Done".

## Deck Depth Flattening

When Anki deck hierarchy exceeds depth = 2:

- `A` -> MicroFlash deck `A`
- `A::B` -> MicroFlash subdeck `B` under `A`
- `A::B::C` -> Flatten: subdeck `B - C` under `A`
- `A::B::C::D` -> Flatten: subdeck `B - C - D` under `A`

Alternative: Create `B` with merged children. Document chosen approach.

## Endpoints

### `POST /api/import/apkg/preview`

Request: multipart/form-data with `.apkg` file.

Response:

```typescript
{
  decks: {
    ankiDeckId: number;
    name: string;
    cardCount: number;
    willFlatten: boolean; // depth > 2
  }[];
  warnings: string[];
}
```

### `POST /api/import/apkg`

Request:

```typescript
{
  fileId: string; // from preview, or re-upload
  selectedDeckIds: number[];
}
```

Response:

```typescript
{
  success: boolean;
  decksCreated: number;
  cardsCreated: number;
  tagsCreated: number;
  warnings: string[];
  errors: string[];
  decksFlattenedCount: number;
}
```

## Card Mapping

| Anki            | MicroFlash                     |
| --------------- | ------------------------------ |
| `notes.flds[0]` | `Card.front`                   |
| `notes.flds[1]` | `Card.back`                    |
| `notes.tags`    | `Card.tags` (create Tags)      |
| `cards.did`     | `Card.deckId` (mapped)         |
| N/A             | `Card.priority` = 50 (default) |
| N/A             | FSRS state initialized fresh   |

## Client Screens

### Import Confirm

```
+----------------------------------+
| Import Anki Deck                 |
+----------------------------------+
| Select decks to import:          |
|                                  |
| [x] Spanish Vocabulary (523)     |
| [x] Spanish Grammar (128)        |
| [ ] French Basics (89)           |
|                                  |
+----------------------------------+
| Warnings:                        |
| - Media files will be skipped    |
| - 2 decks will be flattened      |
+----------------------------------+
| [Cancel]           [Import]      |
+----------------------------------+
```

### Import Progress

```
+----------------------------------+
| Importing...                     |
+----------------------------------+
|                                  |
| [Progress bar: 45%]              |
|                                  |
| Creating cards... 234/523        |
|                                  |
+----------------------------------+
```

### Import Results

```
+----------------------------------+
| Import Complete!                 |
+----------------------------------+
|                                  |
| 2 decks created                  |
| 651 cards imported               |
| 12 tags created                  |
|                                  |
| Warnings:                        |
| - 47 media references skipped    |
| - 2 decks flattened (depth > 2)  |
|                                  |
+----------------------------------+
| [View Decks]           [Done]    |
+----------------------------------+
```

## Subtasks

- [ ] **15.1** Add `anki-apkg-parser` (or similar) dependency to server.
- [ ] **15.2** Server: implement `.apkg` file upload handling.
- [ ] **15.3** Server: implement `POST /api/import/apkg/preview` endpoint.
- [ ] **15.4** Server: implement deck hierarchy flattening logic.
- [ ] **15.5** Server: implement `POST /api/import/apkg` endpoint.
- [ ] **15.6** Server: map Anki notes/cards to MicroFlash schema.
- [ ] **15.7** Server: create Tags from Anki tags.
- [ ] **15.8** Server: initialize FSRS state for imported cards.
- [ ] **15.9** Client: create Import Confirm screen.
- [ ] **15.10** Client: create Import Progress screen.
- [ ] **15.11** Client: create Import Results screen.
- [ ] **15.12** Client: integrate import into onboarding flow.
- [ ] **15.13** Client: add import entry point in Settings.
- [ ] **15.14** Add tests for parsing and mapping logic.

## Dependencies

- Ticket 01 (Tag model for tag import).
- Ticket 04 (onboarding integration).
- Ticket 05 (navigation for import screens).

## Estimated Effort

Large
