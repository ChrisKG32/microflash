import { PrismaClient } from '../generated/prisma/index.js';

// Singleton pattern for Prisma client
// Prevents multiple instances during development hot-reload
// and allows test mocking

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
