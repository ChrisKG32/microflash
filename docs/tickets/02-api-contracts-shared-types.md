# API Contracts & Shared Types

## Title

API contracts + shared types (client/server alignment)

## Goal

Stabilize request/response shapes for MVP flows (sprints, settings, import, tags, priorities).

## Scope

Define DTOs and validation schemas for all MVP endpoints. Update client API wrapper.

## Acceptance Criteria

- Shared DTOs exist (or server Zod schemas are mirrored) for MVP endpoints.
- Client API wrapper (`lib/api.ts`) covers all MVP routes.
- Response shapes are consistent and typed.

## Key DTOs to Define

### Deck

```typescript
interface DeckDTO {
  id: string;
  title: string;
  description: string | null;
  priority: number; // 0-100
  parentDeckId: string | null;
  cardCount: number;
  dueCount: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  subdecks?: DeckDTO[];
}
```

### Card

```typescript
interface CardDTO {
  id: string;
  front: string;
  back: string;
  priority: number; // 0-100
  deckId: string;
  deckTitle: string;
  state: CardState;
  nextReview: string;
  lastReview: string | null;
  reps: number;
  lapses: number;
  tags: TagDTO[];
  createdAt: string;
}
```

### Tag

```typescript
interface TagDTO {
  id: string;
  name: string;
}
```

### Sprint

```typescript
interface SprintDTO {
  id: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
  source: 'HOME' | 'DECK' | 'PUSH';
  deckId: string | null;
  resumableUntil: string;
  startedAt: string;
  completedAt: string | null;
  cards: SprintCardDTO[];
  progress: {
    total: number;
    reviewed: number;
    remaining: number;
  };
}

interface SprintCardDTO {
  id: string;
  position: number;
  reviewedAt: string | null;
  card: CardDTO;
}
```

### Notification Settings

```typescript
interface NotificationSettingsDTO {
  notificationsEnabled: boolean;
  hasPushToken: boolean;
  quietHoursStartMin: number | null;
  quietHoursEndMin: number | null;
  timeZone: string;
  maxPushesPerDay: number;
  cooldownMinutes: number;
  backlogThreshold: number | null;
}
```

### Import Results

```typescript
interface ImportResultDTO {
  success: boolean;
  decksCreated: number;
  cardsCreated: number;
  tagsCreated: number;
  warnings: string[];
  errors: string[];
  decksFlattenedCount: number; // decks that exceeded depth limit
}
```

## Subtasks

- [ ] **02.1** Define Zod schemas for deck create/update with priority.
- [ ] **02.2** Define Zod schemas for card create/update with priority and tags.
- [ ] **02.3** Define Zod schemas for tag CRUD.
- [ ] **02.4** Define Zod schemas for sprint start/complete/abandon.
- [ ] **02.5** Define Zod schemas for notification settings update.
- [ ] **02.6** Define Zod schemas for import request/response.
- [ ] **02.7** Update client `lib/api.ts` with typed functions for all MVP endpoints.
- [ ] **02.8** Add TypeScript interfaces to `packages/shared` if cross-package sharing is needed.

## Dependencies

- Ticket 01 (data model must be defined first).

## Estimated Effort

Small-Medium
