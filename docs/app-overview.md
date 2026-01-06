# Project Overview

<ProjectOverview>
A cross-platform flash card application supporting iOS, Android, and Web (desktop) using React Native and Expo. The application enables users to create flash cards with Markdown and LaTeX/MathJax mathematical notation, organized into decks and subdecks (up to 2 levels deep). The core differentiator is intelligent push notifications driven by the FSRS (Free Spaced Repetition Scheduler) algorithm, which notifies users on their mobile devices when cards are due for review. The desktop interface is primarily for card creation and management, while mobile apps provide the review experience.
</ProjectOverview>

<CoreFunctionality>
## Card Creation & Management
Users create flash cards with rich content including Markdown formatting and mathematical notation using LaTeX/MathJax. Cards are organized into decks, which can contain subdecks up to 2 levels deep. The desktop interface provides the primary card creation experience, though mobile creation is also supported.

## FSRS-Based Spaced Repetition

The server implements the FSRS algorithm to calculate optimal review intervals for each card based on the user's performance history. After each review, the algorithm updates the card's state and determines when the user should next review that card. This ensures efficient learning through scientifically-optimized spacing.

## Intelligent Push Notifications

A background job runs every 15 minutes to identify cards that are due for review. Cards with review times within approximately ±7 minutes of the current time are grouped together into a single notification. This provides 15-30 minute precision while minimizing notification spam. Notifications include the number of due cards and which decks they belong to.

## Notification Behavior

When a notification is sent, the system tracks that it was delivered. If the user doesn't review the card, it will be included in subsequent notification windows. Users can also snooze individual cards for a specified duration (1 hour, 4 hours, 1 day, or custom), which delays notifications without affecting the underlying FSRS schedule.

## Review Interface

The mobile applications provide a card review interface where users see the front of a card, flip it to reveal the back, and then rate their recall using four options: Again (forgot), Hard (difficult), Good (correct), or Easy (effortless). These ratings feed into the FSRS algorithm to adjust future review intervals.

## Multi-Platform Experience

Desktop users primarily create and manage cards, though they can also review without receiving notifications. Mobile users primarily review cards in response to notifications, though they can also browse decks and create cards. All data syncs in real-time through the server.
</CoreFunctionality>

<TechnicalConstraints>
- Notification precision: 15-30 minutes (not real-time)
- Subdeck depth: Maximum 2 levels
- Initial version: No offline support
- Initial version: No multi-device conflict resolution
- FSRS calculations: Server-side only
- Single card rendered at a time (no performance concerns for rendering)
</TechnicalConstraints>

<FutureConsiderations>
- Multi-device editing support
- Offline review capability
- Bulk card import/export
- Review statistics and analytics
- Customizable notification preferences (quiet hours, preferred times)
- Collaborative decks
- Third-party integrations (Anki import, etc.)
</FutureConsiderations>

# Project Technology Overview

<TechnologyStack>
## Language
- Typescript

## Frontend

- React Native with Expo
- React Navigation (for iOS, Android, Web)
- Clerk for authentication

## Backend

- Express.js
- PostgreSQL database (Prisma ORM)
- node-cron for scheduling

## Infrastructure

- Railway, Render, or Fly.io for hosting
- Expo Push Notifications
- PostgreSQL hosting (Railway, Neon, or Supabase)
  </TechnologyStack>

<ArchitectureOverview>
The application follows a client-server architecture where the server handles all business logic, FSRS calculations, and notification scheduling. The client applications (mobile and web) provide the user interface for card creation, deck management, and reviewing.

## Client Layer (React Native + Expo)

The client applications run on iOS, Android, and Web platforms using a shared React Native codebase. The desktop web experience is optimized for card creation with a full-featured editor supporting Markdown and LaTeX. The mobile experience is optimized for reviewing cards with a streamlined interface and push notification support. It would be nice if the mobile experience also shared the card creation interface, but is not in the MVP. Users authenticate via Clerk, and mobile devices register for push notifications through Expo's notification service.

## Server Layer (Express + PostgreSQL)

The server provides RESTful APIs for all client operations including authentication, deck management, card CRUD operations, and review submissions. It maintains the authoritative state for all user data, cards, and FSRS scheduling information. A background scheduler runs every 15 minutes to identify cards due for review and sends push notifications to users' mobile devices via Expo's push notification service.

## Data Layer (PostgreSQL)

The database stores users, decks (with hierarchical relationships), cards (with FSRS state), and review history. Card state includes the FSRS parameters needed to calculate optimal review intervals. The schema supports tracking notification delivery and snooze functionality.
</ArchitectureOverview>

<DataModel>
## Core Entities
- **Users**: Store authentication details (Clerk ID), push notification tokens, and notification preferences
- **Decks**: Organize cards into hierarchical groups (max 2 levels deep) owned by users
- **Cards**: Contain front/back content, FSRS state, next review date, notification tracking, and snooze information
- **Reviews**: Log each time a user reviews a card including their rating and timestamp

## Key Relationships

- Users own multiple Decks
- Decks can have a parent Deck (for subdecks)
- Decks contain multiple Cards
- Cards have multiple Reviews over time
- Users have Reviews for Cards
  </DataModel>

<SystemFlows>
## Card Creation Flow
User creates deck → User creates card with Markdown/LaTeX content → Server stores card with initial FSRS state → Server calculates initial review date

## Review Notification Flow

Scheduler runs every 15 minutes → Queries cards due within ±7 minute window → Groups cards by user → Sends push notification with card count and deck names → Marks cards as notified

## Review Completion Flow

User receives notification → User opens app and views card front → User flips to see back → User rates recall (Again/Hard/Good/Easy) → Server updates FSRS state → Server calculates next review date → Server resets notification tracking

## Snooze Flow

User receives notification → User chooses to snooze → Server updates snooze timestamp → Card excluded from notifications until snooze expires → Card included in next notification window after snooze expiration
</SystemFlows>

# Project Mermaid Sequence Diagram

sequenceDiagram
actor User
participant WebApp as Web App (Desktop)
participant MobileApp as Mobile App
participant ExpressAPI as Express Server
participant PostgreSQL as PostgreSQL Database
participant Scheduler as Background Scheduler (node-cron)
participant ExpoNotif as Expo Push Service
participant Clerk as Clerk Auth

    %% Authentication Flow
    Note over User,Clerk: Authentication Flow
    User->>MobileApp: Opens app
    MobileApp->>Clerk: Authenticate user
    Clerk-->>MobileApp: Auth token
    MobileApp->>ExpressAPI: Register push notification token
    ExpressAPI->>PostgreSQL: Store push token for user
    PostgreSQL-->>ExpressAPI: Confirmation
    ExpressAPI-->>MobileApp: Registration complete

    %% Card Creation Flow
    Note over User,PostgreSQL: Card Creation Flow (Desktop)
    User->>WebApp: Create new deck
    WebApp->>ExpressAPI: POST /api/decks
    ExpressAPI->>PostgreSQL: INSERT deck record
    PostgreSQL-->>ExpressAPI: Deck created
    ExpressAPI-->>WebApp: Deck details

    User->>WebApp: Create card with Markdown/LaTeX
    WebApp->>ExpressAPI: POST /api/cards
    ExpressAPI->>ExpressAPI: Initialize FSRS state
    ExpressAPI->>ExpressAPI: Calculate initial review date
    ExpressAPI->>PostgreSQL: INSERT card with FSRS data
    PostgreSQL-->>ExpressAPI: Card created
    ExpressAPI-->>WebApp: Card details
    WebApp-->>User: Display confirmation

    %% Review Notification Flow
    Note over Scheduler,MobileApp: Review Notification Flow (Every 15 min)
    Scheduler->>Scheduler: Runs every 15 minutes
    Scheduler->>PostgreSQL: Query cards due within ±7 min window
    PostgreSQL-->>Scheduler: List of due cards by user
    Scheduler->>Scheduler: Group cards by user and deck
    Scheduler->>PostgreSQL: Mark cards as notified
    PostgreSQL-->>Scheduler: Updated
    Scheduler->>ExpoNotif: Send push notification with card count
    ExpoNotif-->>MobileApp: Push notification delivered
    MobileApp-->>User: Notification: "5 cards due in Math deck"

    %% Review Completion Flow
    Note over User,PostgreSQL: Review Completion Flow
    User->>MobileApp: Tap notification / open app
    MobileApp->>ExpressAPI: GET /api/cards/due
    ExpressAPI->>PostgreSQL: Fetch due cards
    PostgreSQL-->>ExpressAPI: Card list
    ExpressAPI-->>MobileApp: Due cards
    MobileApp-->>User: Display card front

    User->>MobileApp: Flip card
    MobileApp-->>User: Display card back

    User->>MobileApp: Rate recall (Again/Hard/Good/Easy)
    MobileApp->>ExpressAPI: POST /api/reviews with rating
    ExpressAPI->>ExpressAPI: Run FSRS algorithm
    ExpressAPI->>ExpressAPI: Calculate next review date
    ExpressAPI->>PostgreSQL: INSERT review record
    ExpressAPI->>PostgreSQL: UPDATE card FSRS state & next review
    ExpressAPI->>PostgreSQL: Reset notification tracking
    PostgreSQL-->>ExpressAPI: Updated
    ExpressAPI-->>MobileApp: Next card or completion message
    MobileApp-->>User: Show next card or "All done!"

    %% Snooze Flow
    Note over User,PostgreSQL: Snooze Flow
    User->>MobileApp: Snooze card (e.g., 4 hours)
    MobileApp->>ExpressAPI: POST /api/cards/:id/snooze
    ExpressAPI->>PostgreSQL: UPDATE card snooze timestamp
    PostgreSQL-->>ExpressAPI: Updated
    ExpressAPI-->>MobileApp: Snooze confirmed
    MobileApp-->>User: "Card snoozed for 4 hours"

    Note over Scheduler,MobileApp: Card excluded from notifications until snooze expires
