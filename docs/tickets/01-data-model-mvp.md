# MVP Data Model & Migrations

## Title

MVP data model & migrations (settings, priorities, tags, sprint state)

## Goal

Add persistent primitives required by onboarding, micro-sprints, priorities, respectful notifications, tags, and import.

## Scope

Prisma schema additions + migration. Update server typing and validation schemas.

## Acceptance Criteria

- Prisma migration applies cleanly.
- Defaults keep existing dev flows working.
- Max deck depth = 2 is enforceable for normal CRUD and import.
- New fields have safe defaults so existing users don't break.

## Schema Additions

### User (extend existing)

```prisma
// Onboarding
onboardingComplete     Boolean   @default(false)
notificationsPromptedAt DateTime?

// Notification preferences
quietHoursStartMin     Int?      // 0-1439 (minutes from midnight)
quietHoursEndMin       Int?      // 0-1439
timeZone               String    @default("UTC")
maxPushesPerDay        Int       @default(6)
cooldownMinutes        Int       @default(120) // >= 120
backlogThreshold       Int?      // optional "only notify when due >= X"

// Notification tracking
lastPushSentAt         DateTime?
pushCountDate          DateTime? // date of last push count reset
pushCountToday         Int       @default(0)

// Sprint preferences
sprintSize             Int       @default(5) // 3-10
```

### Deck (extend existing)

```prisma
priority  Int @default(50) // 0-100
archived  Boolean @default(false)
```

### Card (extend existing)

```prisma
priority  Int @default(50) // 0-100
```

### Tag (new)

```prisma
model Tag {
  id        String   @id @default(cuid())
  name      String
  userId    String
  createdAt DateTime @default(now())

  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  cards     CardTag[]

  @@unique([userId, name])
  @@index([userId])
}
```

### CardTag (new, m2m)

```prisma
model CardTag {
  cardId String
  tagId  String

  card Card @relation(fields: [cardId], references: [id], onDelete: Cascade)
  tag  Tag  @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([cardId, tagId])
  @@index([tagId])
}
```

### Sprint (new)

```prisma
enum SprintStatus {
  ACTIVE
  COMPLETED
  ABANDONED
}

enum SprintSource {
  HOME
  DECK
  PUSH
}

model Sprint {
  id             String       @id @default(cuid())
  userId         String
  status         SprintStatus @default(ACTIVE)
  source         SprintSource
  deckId         String?      // if deck-constrained
  resumableUntil DateTime
  startedAt      DateTime     @default(now())
  completedAt    DateTime?
  abandonedAt    DateTime?

  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  deck        Deck?        @relation(fields: [deckId], references: [id], onDelete: SetNull)
  sprintCards SprintCard[]

  @@index([userId])
  @@index([status])
}
```

### SprintCard (new)

```prisma
model SprintCard {
  id         String   @id @default(cuid())
  sprintId   String
  cardId     String
  position   Int      // ordering within sprint
  reviewedAt DateTime?

  sprint Sprint @relation(fields: [sprintId], references: [id], onDelete: Cascade)
  card   Card   @relation(fields: [cardId], references: [id], onDelete: Cascade)

  @@unique([sprintId, cardId])
  @@index([sprintId])
}
```

## Subtasks

- [ ] **01.1** Add priority fields to Deck and Card models.
- [ ] **01.2** Add Tag and CardTag models (user-scoped unique tag names).
- [ ] **01.3** Add user onboarding fields (`onboardingComplete`, `notificationsPromptedAt`).
- [ ] **01.4** Add user notification preference fields (quiet hours, max/day, cooldown, backlog threshold, timezone).
- [ ] **01.5** Add user notification tracking fields (lastPushSentAt, daily counters).
- [ ] **01.6** Add user sprint preference field (`sprintSize`).
- [ ] **01.7** Add Sprint and SprintCard models with enums.
- [ ] **01.8** Add relations to User, Deck, Card models.
- [ ] **01.9** Run `pnpm db:generate` and `pnpm db:migrate`.
- [ ] **01.10** Update Zod validation schemas for new fields.

## Dependencies

None (foundational ticket).

## Estimated Effort

Medium
