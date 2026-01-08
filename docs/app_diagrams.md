Sequence Diagram Pack (High-Level)

1) Overall app sequence
```mermaid
sequenceDiagram
  participant U as User
  participant A as Mobile App
  participant L as Local Storage
  participant B as Backend
  participant AU as Auth Provider
  participant P as Push Service

  U->>A: Open app
  A->>L: Fetch cached state

  alt Not signed in
    A->>U: View Welcome / Sign In
    U->>A: Sign in
    A->>AU: Authenticate
    AU-->>A: Authenticated
  end

  A->>B: Sync
  B-->>A: Receive data

  opt Notifications enabled
    A->>P: Register/refresh push capability
    A->>B: Update notification settings/token
  end

  par Ongoing usage
    U->>A: View Home / Decks / Settings
    A->>B: Request data (as needed)
    B-->>A: Receive data
  and Prompting loop
    B->>B: Create sprint + associate cards
    B->>P: Schedule notification
    P-->>U: Deliver notification
  end

  alt Sprint started from notification
    U->>A: Open sprint from notification
    A->>B: Request sprint data
    B-->>A: Receive sprint + cards
  else Sprint started manually
    U->>A: Start sprint
    A->>B: Create sprint
    B-->>A: Receive sprint + cards
  end

  loop Review cards
    A->>U: View card
    U->>A: Grade / answer
    A->>L: Persist local updates
  end

  A->>B: Update review state
  B-->>A: Receive success/error state
  A->>U: View Sprint Complete
```

2) Core screens sequences
- Onboarding (start fresh)
```mermaid
sequenceDiagram
  participant U as User
  participant A as Mobile App
  participant B as Backend
  participant AU as Auth Provider
  participant P as Push Service

  U->>A: View Welcome
  U->>A: Sign in
  A->>AU: Authenticate
  AU-->>A: Authenticated

  U->>A: Enable notifications (system prompt)
  A->>P: Register push capability
  A->>B: Update notification settings/token
  B-->>A: Receive success/error state

  U->>A: Configure micro-sprint settings
  A->>B: Update notification settings
  B-->>A: Receive success/error state

  U->>A: Start first sprint
  A->>B: Create sprint
  B-->>A: Receive sprint + cards
  A->>U: View Sprint Review
```

- Onboarding (import)
```mermaid
sequenceDiagram
  participant U as User
  participant A as Mobile App
  participant B as Backend

  U->>A: View Import flow
  U->>A: Select import file
  A->>B: Request import
  B-->>A: Receive "import started"

  loop While importing
    A->>B: Request import status
    B-->>A: Receive status update
    A->>U: Show progress state
  end

  B-->>A: Receive "import complete"
  A->>B: Sync
  B-->>A: Receive data
  A->>U: Continue to Micro-sprint Setup
```

- Deck detail + card editor
```mermaid
sequenceDiagram
  participant U as User
  participant A as Mobile App
  participant L as Local Storage
  participant B as Backend

  U->>A: View Decks List
  A->>B: Request data
  B-->>A: Receive data

  U->>A: View Deck Detail
  U->>A: Update deck or card content
  A->>L: Persist local updates
  A->>B: Update item
  B-->>A: Receive success/error state
  A->>U: Show success/error state
```

- Settings + delete account
```mermaid
sequenceDiagram
  participant U as User
  participant A as Mobile App
  participant L as Local Storage
  participant B as Backend
  participant AU as Auth Provider

  U->>A: View Settings / Account
  U->>A: Request account deletion
  A->>U: Confirm destructive action

  U->>A: Confirm
  A->>B: Request account deletion
  B-->>A: Receive success/error state

  A->>L: Clear local data
  A->>AU: End session
  A->>U: Return to Welcome
```

3) Core features sequences
- Notification-driven micro-sprint (server creates sprint before notify)
```mermaid
sequenceDiagram
  participant B as Backend
  participant P as Push Service
  participant U as User
  participant A as Mobile App

  B->>B: Create sprint + associate cards
  B->>P: Schedule notification
  P-->>U: Deliver notification

  U->>A: Tap notification
  A->>B: Request sprint data
  B-->>A: Receive sprint + cards
  A->>U: View Sprint Review
```

- Resumable sprint + auto-snooze (30-minute window)
```mermaid
sequenceDiagram
  participant U as User
  participant A as Mobile App
  participant L as Local Storage
  participant B as Backend

  U->>A: Open Sprint Review
  A->>L: Record "opened time"
  A->>B: Update sprint opened time
  B-->>A: Receive success/error state

  alt User returns within window
    U->>A: Resume sprint
    A->>U: View Sprint Review
  else Window expired
    A->>L: Mark sprint auto-snoozed
    A->>B: Update sprint state (auto-snooze)
    B-->>A: Receive success/error state
    A->>U: Show "sprint skipped" state
  end
```

- Offline manual sprint + later sync
```mermaid
sequenceDiagram
  participant U as User
  participant A as Mobile App
  participant L as Local Storage
  participant B as Backend

  U->>A: Start sprint (offline)
  A->>L: Select due cards + order by priority/due
  A->>U: View Sprint Review

  loop Review cards
    U->>A: Grade / answer
    A->>L: Persist local updates
  end

  A->>U: View Sprint Complete
  opt When back online
    A->>B: Sync
    B-->>A: Receive success/error state
  end
```
