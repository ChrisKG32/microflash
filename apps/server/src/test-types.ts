import { PrismaClient, User, Deck, Card, Review, CardState, Rating } from '@prisma/client';

// Test that we can instantiate PrismaClient
const prisma = new PrismaClient();

// Test that types are available
const testUser: User = {
  id: 'test',
  clerkId: 'user_123',
  pushToken: null,
  notificationsEnabled: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const testDeck: Deck = {
  id: 'deck_123',
  title: 'Test Deck',
  description: 'A test deck',
  parentDeckId: null,
  userId: 'user_123',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const testCard: Card = {
  id: 'card_123',
  front: 'What is 2+2?',
  back: '4',
  stability: 0,
  difficulty: 0,
  elapsedDays: 0,
  scheduledDays: 0,
  reps: 0,
  lapses: 0,
  state: CardState.NEW,
  lastReview: null,
  nextReviewDate: new Date(),
  lastNotificationSent: null,
  snoozedUntil: null,
  deckId: 'deck_123',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const testReview: Review = {
  id: 'review_123',
  rating: Rating.GOOD,
  userId: 'user_123',
  cardId: 'card_123',
  createdAt: new Date(),
};

console.log('✅ All Prisma types imported successfully!');
console.log('✅ PrismaClient instantiated');
console.log('✅ Type checking passed');

export { prisma };
