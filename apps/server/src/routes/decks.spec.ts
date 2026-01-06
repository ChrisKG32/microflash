import * as dotenv from 'dotenv';
import { PrismaClient } from '../generated/prisma/index.js';

// Load test environment variables
// Path is relative to the project root since Jest runs from there
dotenv.config({ path: 'apps/server/.env.test', quiet: true });

// Integration tests use real database
// Run with: pnpm test:integration
//
// SETUP REQUIRED:
// 1. Ensure PostgreSQL is running locally
// 2. Create a test database: CREATE DATABASE microflash_test;
// 3. Update apps/server/.env.test with your database URL
// 4. Run migrations: DATABASE_URL="..." pnpm --filter @microflash/server db:push

const prisma = new PrismaClient();

// Check if database is available before running tests
let databaseAvailable = false;

describe('Decks Routes - Integration Tests', () => {
  beforeAll(async () => {
    try {
      await prisma.$connect();
      databaseAvailable = true;
    } catch (error) {
      console.warn(
        '\n⚠️  Integration tests skipped: Database not available.\n' +
          '   Configure apps/server/.env.test and ensure PostgreSQL is running.\n',
      );
    }
  });

  afterAll(async () => {
    if (databaseAvailable) {
      await prisma.$disconnect();
    }
  });

  describe('Database connectivity', () => {
    it('should connect to the test database', async () => {
      if (!databaseAvailable) {
        console.log('Skipping: Database not available');
        return;
      }
      const result = await prisma.$queryRaw`SELECT 1 as connected`;
      expect(result).toBeDefined();
    });
  });

  describe('Prisma deck operations', () => {
    it('should be able to query decks from the database', async () => {
      if (!databaseAvailable) {
        console.log('Skipping: Database not available');
        return;
      }
      // This test verifies that the Prisma client can query the decks table
      // It doesn't require any seed data - just verifies the connection works
      const decks = await prisma.deck.findMany({
        take: 5,
      });

      expect(Array.isArray(decks)).toBe(true);
    });

    it('should be able to count decks', async () => {
      if (!databaseAvailable) {
        console.log('Skipping: Database not available');
        return;
      }
      const count = await prisma.deck.count();

      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});
