# Local Development Guide

This guide walks you through running MicroFlash locally for end-to-end testing.

## Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- PostgreSQL (local or remote)
- Xcode (for iOS simulator)

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up the Database

Create a PostgreSQL database and configure the connection:

```bash
# Copy the example env file
cp apps/server/.env.example apps/server/.env

# Edit apps/server/.env with your database URL:
# DATABASE_URL="postgresql://user:password@localhost:5432/microflash"
# DEV_AUTH="1"
```

Push the schema to your database:

```bash
pnpm --filter @microflash/server db:push
```

(Optional) Seed with test data:

```bash
pnpm --filter @microflash/server db:seed
```

### 3. Set Up the Mobile App

```bash
# Copy the example env file
cp apps/mobile/.env.example apps/mobile/.env

# The defaults should work for local development:
# EXPO_PUBLIC_API_URL=http://localhost:3000
# EXPO_PUBLIC_DEV_CLERK_ID=user_local_dev
```

### 4. Start the Server

```bash
pnpm dev:server
```

You should see:

```
🔓 DEV_AUTH mode enabled - using x-dev-clerk-id header for auth
Server running on port 3000
```

### 5. Start the Mobile App

In a new terminal:

```bash
pnpm dev:mobile
```

Then press:

- `w` for web
- `i` for iOS simulator

## Smoke Tests (curl)

Verify the server is working with these curl commands:

```bash
# Health check
curl http://localhost:3000/health

# Get current user (auto-creates if doesn't exist)
curl http://localhost:3000/api/me \
  -H "x-dev-clerk-id: user_local_dev"

# List decks
curl http://localhost:3000/api/decks \
  -H "x-dev-clerk-id: user_local_dev"

# Create a deck
curl -X POST http://localhost:3000/api/decks \
  -H "Content-Type: application/json" \
  -H "x-dev-clerk-id: user_local_dev" \
  -d '{"title": "Test Deck"}'

# Create a card (replace DECK_ID with actual deck ID)
curl -X POST http://localhost:3000/api/cards \
  -H "Content-Type: application/json" \
  -H "x-dev-clerk-id: user_local_dev" \
  -d '{"front": "What is 2+2?", "back": "4", "deckId": "DECK_ID"}'

# Get due cards
curl http://localhost:3000/api/cards/due \
  -H "x-dev-clerk-id: user_local_dev"

# Submit a review (replace CARD_ID with actual card ID)
curl -X POST http://localhost:3000/api/reviews \
  -H "Content-Type: application/json" \
  -H "x-dev-clerk-id: user_local_dev" \
  -d '{"cardId": "CARD_ID", "rating": "GOOD"}'
```

## DEV_AUTH Mode

When `DEV_AUTH=1` is set in the server environment:

1. **No Clerk required**: The server doesn't need Clerk credentials
2. **Header-based auth**: Use `x-dev-clerk-id` header to authenticate
3. **Auto user creation**: Users are automatically created if they don't exist

The mobile app sends this header automatically using `EXPO_PUBLIC_DEV_CLERK_ID`.

## End-to-End Test Flow

1. **Start server and client** (steps 4-5 above)
2. **Open the app** (web or iOS simulator)
3. **Create a deck**: Go to Decks tab → "+ New Deck" → Enter title → Create
4. **Add cards**: Tap deck → "+ Add Card" → Enter front/back → Add Card
5. **Review cards**: Go to Review tab → See due card → Show Answer → Rate it
6. **Verify scheduling**: After rating, the card's next review date updates

## Troubleshooting

### "Network request failed" on iOS simulator

- Ensure the server is running on port 3000
- iOS simulator shares the host network, so `localhost:3000` should work
- Check that `EXPO_PUBLIC_API_URL=http://localhost:3000` in `apps/mobile/.env`

### "User not found" errors

- Ensure `DEV_AUTH=1` is set in `apps/server/.env`
- Restart the server after changing env vars

### Database connection errors

- Verify PostgreSQL is running
- Check `DATABASE_URL` in `apps/server/.env`
- Run `pnpm --filter @microflash/server db:push` to sync schema

### Cards not showing as due

- New cards are immediately due (nextReviewDate = now)
- After reviewing, cards are scheduled for the future based on FSRS algorithm
- To test reviews again, create new cards or wait for existing cards to become due
