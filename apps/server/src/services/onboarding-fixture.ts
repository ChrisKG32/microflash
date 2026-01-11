/**
 * Onboarding Fixture Service
 *
 * Creates and manages the onboarding-only fixture deck + cards.
 * This fixture is hidden from normal deck/card queries and only used during onboarding.
 */

import { prisma } from '@/lib/prisma';
import { initializeFSRS, calculateInitialReviewDate } from '@/services/fsrs';

/**
 * Fixture deck title (constant for idempotency)
 */
const FIXTURE_DECK_TITLE = 'Starter Deck';

/**
 * Fixture cards content (3 cards)
 */
const FIXTURE_CARDS = [
  {
    front: 'What is microlearning?',
    back: 'Learning in small, focused chunks designed to be completed quickly and repeated over time.',
  },
  {
    front: 'How long should a MicroFlash micro-sprint take?',
    back: 'About 30-90 seconds (usually 3-10 cards).',
  },
  {
    front: 'Does MicroFlash cost money?',
    back: 'No. It is open source and completely free.',
  },
];

/**
 * Ensure the onboarding fixture deck exists for a user.
 * Idempotent: only creates if missing.
 *
 * @param userId - User ID
 * @returns The fixture deck ID
 */
export async function ensureOnboardingFixture(userId: string): Promise<string> {
  // Check if fixture already exists
  const existingFixture = await prisma.deck.findFirst({
    where: {
      userId,
      isOnboardingFixture: true,
    },
    select: { id: true },
  });

  if (existingFixture) {
    return existingFixture.id;
  }

  // Create fixture deck + cards in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create the fixture deck
    const deck = await tx.deck.create({
      data: {
        title: FIXTURE_DECK_TITLE,
        description: 'Welcome to MicroFlash! Complete this quick sprint.',
        userId,
        isOnboardingFixture: true,
        priority: 50,
      },
    });

    // Create the 3 fixture cards
    const fsrsState = initializeFSRS();
    const nextReviewDate = calculateInitialReviewDate();

    await tx.card.createMany({
      data: FIXTURE_CARDS.map((card) => ({
        front: card.front,
        back: card.back,
        deckId: deck.id,
        priority: 50,
        // FSRS state
        stability: fsrsState.stability,
        difficulty: fsrsState.difficulty,
        elapsedDays: fsrsState.elapsedDays,
        scheduledDays: fsrsState.scheduledDays,
        reps: fsrsState.reps,
        lapses: fsrsState.lapses,
        state: fsrsState.state,
        lastReview: fsrsState.lastReview,
        nextReviewDate,
      })),
    });

    return deck;
  });

  return result.id;
}

/**
 * Get the fixture deck ID for a user (if it exists).
 *
 * @param userId - User ID
 * @returns Fixture deck ID or null
 */
export async function getFixtureDeckId(userId: string): Promise<string | null> {
  const fixture = await prisma.deck.findFirst({
    where: {
      userId,
      isOnboardingFixture: true,
    },
    select: { id: true },
  });

  return fixture?.id ?? null;
}

/**
 * Delete the onboarding fixture deck for a user.
 * Cascade deletes all cards in the fixture.
 *
 * @param userId - User ID
 */
export async function deleteOnboardingFixture(userId: string): Promise<void> {
  await prisma.deck.deleteMany({
    where: {
      userId,
      isOnboardingFixture: true,
    },
  });
}
