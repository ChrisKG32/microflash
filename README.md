# MicroFlash

> Intelligent spaced repetition learning with FSRS-powered smart notifications

A cross-platform flashcard application built with React Native, Expo, and Express.

## Tech Stack

- **Frontend**: React Native, Expo (iOS, Android, Web)
- **Backend**: Express.js, PostgreSQL, Prisma
- **Auth**: Clerk
- **Language**: TypeScript
- **Package Manager**: pnpm

## Project Structure
```
microflash/
├── apps/
│   ├── client/        # React Native app (iOS, Android, Web)
│   └── server/        # Express API server
└── packages/
    └── shared/        # Shared types and utilities
```

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- PostgreSQL database (we use [Neon](https://neon.tech))

### Installation
```bash
# Install dependencies
pnpm install
```

### Database Setup

1. Create a [Neon](https://neon.tech) account and project
2. Copy `.env.example` to `.env` in `apps/server/`
```bash
   cp apps/server/.env.example apps/server/.env
```
3. Add your `DATABASE_URL` to `apps/server/.env`
4. Run migrations:
```bash
   cd apps/server
   pnpm prisma migrate dev
```
5. Seed the database with test data:
```bash
   pnpm db:seed
```
6. (Optional) Open Prisma Studio to view data:
```bash
   pnpm prisma studio
```

### Development
```bash
# Start API server
pnpm dev:server

# Start Expo app (in another terminal)
pnpm dev:client
```

## Scripts

- `pnpm dev:server` - Start the API server with hot reload
- `pnpm dev:client` - Start the Expo application
- `pnpm build` - Build all packages
- `pnpm lint` - Lint all packages
- `pnpm type-check` - Type check all packages

## Database Commands

From `apps/server`:

- `pnpm db:seed` - Populate database with test data
- `pnpm db:studio` - Open Prisma Studio (database GUI)
- `pnpm db:migrate` - Run database migrations
- `pnpm db:generate` - Regenerate Prisma Client

## License

MIT

## Author

Built by Kyla
