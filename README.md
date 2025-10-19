# MicroFlash

> Intelligent spaced repetition learning with FSRS-powered smart notifications

A cross-platform flashcard application built with React Native, Expo, and Express.

## Tech Stack

- **Frontend**: React Native, Expo (iOS, Android, Web)
- **Backend**: Express.js, PostgreSQL, Prisma
- **Language**: TypeScript
- **Package Manager**: pnpm

## Getting Started

### Prerequisites

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- PostgreSQL (for local development)

### Installation

```bash
# Install dependencies
pnpm install

# Start development servers
pnpm dev        # Start API server
pnpm dev:app    # Start Expo app
```

### Project Structure

```
microflash/
├── packages/
│   ├── application/    # React Native app (iOS, Android, Web)
│   ├── server/        # Express API server
│   └── shared/        # Shared types and utilities
└── docs/             # Documentation
```

## Scripts

- `pnpm dev` - Start the API server
- `pnpm dev:app` - Start the Expo application
- `pnpm build` - Build all packages
- `pnpm lint` - Lint all packages
- `pnpm format` - Format code with Prettier
- `pnpm type-check` - Type check all packages

## License

MIT

## Author

Built by Kyla
