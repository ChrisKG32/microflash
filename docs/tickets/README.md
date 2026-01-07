# MicroFlash MVP Implementation Plan

This directory contains the implementation tickets for reaching MVP.

## Quick Links

| #   | Ticket                                                                 | Effort | Status      |
| --- | ---------------------------------------------------------------------- | ------ | ----------- |
| 00  | [Baseline Gap Fixes](./00-mvp-baseline-gap-fixes.md)                   | S-M    | Not Started |
| 01  | [Data Model & Migrations](./01-data-model-mvp.md)                      | M      | Not Started |
| 02  | [API Contracts & Shared Types](./02-api-contracts-shared-types.md)     | S-M    | Not Started |
| 03  | [Clerk Auth (Prod Ready)](./03-auth-clerk-prod-ready.md)               | M      | Not Started |
| 04  | [Onboarding Flow](./04-onboarding-flow.md)                             | M-L    | Not Started |
| 05  | [Navigation Restructure](./05-navigation-restructure.md)               | M      | Not Started |
| 06  | [Home Screen (Command Center)](./06-home-command-center.md)            | M      | Not Started |
| 07  | [Sprint System (Server)](./07-sprints-server-core.md)                  | L      | Not Started |
| 08  | [Sprint Review UI](./08-sprint-review-ui.md)                           | M      | Not Started |
| 09  | [Review Ahead (Browse)](./09-review-ahead-browse-mode.md)              | S-M    | Not Started |
| 10  | [Priority Controls](./10-priority-controls.md)                         | S      | Not Started |
| 11  | [Respectful Notifications v2](./11-notifications-respectful-v2.md)     | L      | Not Started |
| 12  | [Notification Controls (Client)](./12-notification-controls-client.md) | M      | Not Started |
| 13  | [Markdown + LaTeX Rendering](./13-markdown-latex-rendering.md)         | M      | Not Started |
| 14  | [Tags Placeholder](./14-tags-placeholder.md)                           | S-M    | Not Started |
| 15  | [Anki Import](./15-anki-import.md)                                     | L      | Not Started |
| 16  | [MVP Polish & Smoke Tests](./16-mvp-polish-smoke-tests.md)             | M      | Not Started |

## Recommended Sequencing

### Phase 1: Foundation (Weeks 1-2)

```
00 Baseline Gap Fixes ─────┐
                           ├──> 02 API Contracts
01 Data Model & Migrations ┘
```

These are independent and can be worked in parallel. They establish the data layer and close existing gaps.

### Phase 2: Auth & Navigation (Week 2-3)

```
02 ──> 03 Clerk Auth ──> 04 Onboarding Flow
                    └──> 05 Navigation Restructure
```

Auth must be in place before onboarding. Navigation restructure can happen in parallel with onboarding screens.

### Phase 3: Core Sprint Experience (Weeks 3-4)

```
01 + 02 ──> 07 Sprint System (Server) ──> 08 Sprint Review UI
                                     └──> 06 Home Screen
```

Sprint server is the largest ticket. Home screen and Sprint UI depend on it.

### Phase 4: Notifications & Controls (Weeks 4-5)

```
07 ──> 11 Respectful Notifications v2 ──> 12 Notification Controls (Client)
01 ──> 10 Priority Controls (can parallel with 07)
```

Notifications v2 depends on sprint system. Priority controls can be done earlier.

### Phase 5: Content & Features (Weeks 5-6)

```
13 Markdown + LaTeX (can start anytime, needed by 08)
09 Review Ahead (depends on 13)
14 Tags Placeholder (depends on 01)
15 Anki Import (depends on 01, 04, 05, 14)
```

These can be parallelized. Markdown/LaTeX should land before Sprint UI is finalized.

### Phase 6: Polish (Week 6-7)

```
All ──> 16 MVP Polish & Smoke Tests
```

## Dependency Graph

```
                                    ┌─────────────────┐
                                    │ 00 Baseline     │
                                    │ Gap Fixes       │
                                    └────────┬────────┘
                                             │
┌─────────────────┐                          │
│ 01 Data Model   │──────────────────────────┼───────────────────┐
│ & Migrations    │                          │                   │
└────────┬────────┘                          │                   │
         │                                   │                   │
         ▼                                   ▼                   │
┌─────────────────┐                 ┌─────────────────┐          │
│ 02 API          │◄────────────────│                 │          │
│ Contracts       │                 │                 │          │
└────────┬────────┘                 │                 │          │
         │                          │                 │          │
         ▼                          │                 │          │
┌─────────────────┐                 │                 │          │
│ 03 Clerk Auth   │                 │                 │          │
│ (Prod Ready)    │                 │                 │          │
└────────┬────────┘                 │                 │          │
         │                          │                 │          │
         ├──────────────────────────┤                 │          │
         │                          │                 │          │
         ▼                          ▼                 │          │
┌─────────────────┐        ┌─────────────────┐       │          │
│ 04 Onboarding   │        │ 05 Navigation   │       │          │
│ Flow            │        │ Restructure     │       │          │
└────────┬────────┘        └────────┬────────┘       │          │
         │                          │                │          │
         │                          │                │          │
         │                          │                ▼          │
         │                          │       ┌─────────────────┐ │
         │                          │       │ 07 Sprint       │ │
         │                          │       │ System (Server) │◄┘
         │                          │       └────────┬────────┘
         │                          │                │
         │                          │       ┌────────┴────────┐
         │                          │       │                 │
         │                          │       ▼                 ▼
         │                          │ ┌───────────┐   ┌───────────┐
         │                          │ │ 06 Home   │   │ 08 Sprint │
         │                          │ │ Screen    │   │ Review UI │
         │                          │ └───────────┘   └───────────┘
         │                          │       │                 │
         │                          │       │                 │
         │                          │       ▼                 │
         │                          │ ┌───────────────────┐   │
         │                          │ │ 11 Respectful     │   │
         │                          │ │ Notifications v2  │   │
         │                          │ └─────────┬─────────┘   │
         │                          │           │             │
         │                          │           ▼             │
         │                          │ ┌───────────────────┐   │
         │                          │ │ 12 Notification   │   │
         │                          └─│ Controls (Client) │   │
         │                            └───────────────────┘   │
         │                                                    │
         │  ┌─────────────────┐                               │
         │  │ 10 Priority     │◄──────────────────────────────┘
         │  │ Controls        │
         │  └─────────────────┘
         │
         │  ┌─────────────────┐
         │  │ 13 Markdown +   │ (can start early, needed by 08, 09)
         │  │ LaTeX Rendering │
         │  └────────┬────────┘
         │           │
         │           ▼
         │  ┌─────────────────┐
         │  │ 09 Review Ahead │
         │  │ (Browse)        │
         │  └─────────────────┘
         │
         │  ┌─────────────────┐
         └──│ 14 Tags         │
            │ Placeholder     │
            └────────┬────────┘
                     │
                     ▼
            ┌─────────────────┐
            │ 15 Anki Import  │◄── (also depends on 04, 05)
            └─────────────────┘
                     │
                     ▼
            ┌─────────────────┐
            │ 16 MVP Polish   │◄── (depends on ALL)
            │ & Smoke Tests   │
            └─────────────────┘
```

## Key Decisions (Locked for MVP)

| Decision               | Choice                                              |
| ---------------------- | --------------------------------------------------- |
| Deck nesting depth     | Max 2 levels (parent + subdeck)                     |
| Sprint selection order | Urgency (nextReviewDate ASC) then priority tiebreak |
| Anki import scope      | Cards only (no review history)                      |
| Review ahead           | Browse-only (no grading), any future cards allowed  |
| Browse ordering        | nextReviewDate ASC (soonest first)                  |
| Notification cooldown  | Minimum 2 hours                                     |

## Effort Legend

- **S** = Small (< 1 day)
- **S-M** = Small-Medium (1-2 days)
- **M** = Medium (2-4 days)
- **M-L** = Medium-Large (4-6 days)
- **L** = Large (1+ week)

## Total Estimated Effort

~6-8 weeks for a single developer, or ~3-4 weeks with 2 developers working in parallel on independent tracks.

## Parallel Work Tracks

### Track A (Server-heavy)

00 → 01 → 07 → 11 → 15

### Track B (Client-heavy)

03 → 04 → 05 → 06 → 08 → 12

### Track C (Independent)

13 → 09 (can be done anytime)
10, 14 (can slot in when dependencies met)
