/**
 * Sprint Service
 *
 * Handles sprint creation, selection algorithm, and lifecycle management.
 */

import { prisma } from '@/lib/prisma';
import type { SprintStatus, SprintSource } from '@/generated/prisma';

/**
 * Resume window duration in minutes.
 * After this time without activity, sprint is auto-abandoned.
 */
export const RESUME_WINDOW_MINUTES = 30;

/**
 * Snooze duration in minutes for abandoned sprint cards.
 */
export const ABANDON_SNOOZE_MINUTES = 120;

/**
 * Default sprint size if not specified by user.
 */
export const DEFAULT_SPRINT_SIZE = 5;

/**
 * Options for starting a sprint
 */
export interface StartSprintOptions {
  userId: string;
  deckId?: string;
  source?: SprintSource;
}

/**
 * Result of starting a sprint
 */
export interface StartSprintResult {
  sprint: SprintWithCards;
  resumed: boolean;
}

/**
 * Sprint with cards included
 */
export interface SprintWithCards {
  id: string;
  userId: string;
  deckId: string | null;
  status: SprintStatus;
  source: SprintSource;
  createdAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  resumableUntil: Date | null;
  abandonedAt: Date | null;
  deck: { id: string; title: string } | null;
  sprintCards: Array<{
    id: string;
    order: number;
    result: string | null;
    card: {
      id: string;
      front: string;
      back: string;
      priority: number;
      deckId: string;
      state: string;
      nextReviewDate: Date;
      snoozedUntil: Date | null;
      deck: { id: string; title: string };
    };
  }>;
}

/**
 * Find an active resumable sprint for a user.
 * Returns the sprint if it exists and is still within the resume window.
 */
export async function findResumableSprint(
  userId: string,
): Promise<SprintWithCards | null> {
  const now = new Date();

  const sprint = await prisma.sprint.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      resumableUntil: { gt: now },
    },
    include: {
      deck: { select: { id: true, title: true } },
      sprintCards: {
        orderBy: { order: 'asc' },
        include: {
          card: {
            include: {
              deck: { select: { id: true, title: true } },
            },
          },
        },
      },
    },
  });

  return sprint as SprintWithCards | null;
}

/**
 * Get user's sprint size preference.
 */
async function getUserSprintSize(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { sprintSize: true },
  });
  return user?.sprintSize ?? DEFAULT_SPRINT_SIZE;
}

/**
 * Select eligible cards for a sprint using the priority-aware algorithm.
 *
 * Selection criteria:
 * 1. Card belongs to user (via deck)
 * 2. nextReviewDate <= now (due)
 * 3. Not snoozed (snoozedUntil is null or <= now)
 * 4. Not already in an ACTIVE sprint
 *
 * Ordering:
 * 1. nextReviewDate ASC (most urgent first)
 * 2. Card.priority DESC (higher priority first)
 * 3. Deck.priority DESC (higher priority deck first)
 * 4. Card.createdAt ASC (older cards first as tiebreaker)
 */
export async function selectEligibleCards(
  userId: string,
  limit: number,
  deckId?: string,
): Promise<
  Array<{
    id: string;
    front: string;
    back: string;
    priority: number;
    deckId: string;
    state: string;
    nextReviewDate: Date;
    snoozedUntil: Date | null;
    deck: { id: string; title: string; priority: number };
  }>
> {
  const now = new Date();

  // Get IDs of cards already in active sprints
  const activeSprintCardIds = await prisma.sprintCard.findMany({
    where: {
      sprint: {
        userId,
        status: 'ACTIVE',
      },
    },
    select: { cardId: true },
  });
  const excludeCardIds = activeSprintCardIds.map((sc) => sc.cardId);

  // Build deck filter
  let deckFilter: { userId: string; id?: string } = { userId };
  if (deckId) {
    // TODO: Support subdecks in future
    deckFilter = { userId, id: deckId };
  }

  // Query eligible cards with proper ordering
  const cards = await prisma.card.findMany({
    where: {
      deck: deckFilter,
      nextReviewDate: { lte: now },
      OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }],
      id: excludeCardIds.length > 0 ? { notIn: excludeCardIds } : undefined,
    },
    include: {
      deck: { select: { id: true, title: true, priority: true } },
    },
    orderBy: [
      { nextReviewDate: 'asc' },
      { priority: 'desc' },
      // Note: Prisma doesn't support ordering by relation field directly,
      // so we'll sort deck priority in memory
      { createdAt: 'asc' },
    ],
    take: limit * 2, // Fetch extra to allow for deck priority sorting
  });

  // Sort by deck priority (secondary sort after card priority)
  // Since Prisma can't do this, we do it in memory
  const sortedCards = cards
    .sort((a, b) => {
      // Primary: nextReviewDate ASC
      const dateDiff = a.nextReviewDate.getTime() - b.nextReviewDate.getTime();
      if (dateDiff !== 0) return dateDiff;

      // Secondary: card priority DESC
      const cardPriorityDiff = b.priority - a.priority;
      if (cardPriorityDiff !== 0) return cardPriorityDiff;

      // Tertiary: deck priority DESC
      const deckPriorityDiff = b.deck.priority - a.deck.priority;
      if (deckPriorityDiff !== 0) return deckPriorityDiff;

      // Quaternary: createdAt ASC
      return a.createdAt.getTime() - b.createdAt.getTime();
    })
    .slice(0, limit);

  return sortedCards;
}

/**
 * Start a new sprint or return an existing resumable sprint.
 *
 * Resume-first logic:
 * 1. Check for existing ACTIVE sprint within resume window
 * 2. If found, return it (resumed = true)
 * 3. Otherwise, create new sprint with selected cards
 */
export async function startSprint(
  options: StartSprintOptions,
): Promise<StartSprintResult> {
  const { userId, deckId, source = 'HOME' } = options;

  // Check for resumable sprint first
  const existingSprint = await findResumableSprint(userId);
  if (existingSprint) {
    return { sprint: existingSprint, resumed: true };
  }

  // Get user's sprint size preference
  const sprintSize = await getUserSprintSize(userId);

  // Select eligible cards
  const eligibleCards = await selectEligibleCards(userId, sprintSize, deckId);

  if (eligibleCards.length === 0) {
    throw new Error('NO_ELIGIBLE_CARDS');
  }

  // Create sprint with cards in a transaction
  const now = new Date();
  const resumableUntil = new Date(
    now.getTime() + RESUME_WINDOW_MINUTES * 60000,
  );

  const sprint = await prisma.sprint.create({
    data: {
      userId,
      deckId: deckId ?? null,
      status: 'ACTIVE',
      source,
      startedAt: now,
      resumableUntil,
      sprintCards: {
        create: eligibleCards.map((card, index) => ({
          cardId: card.id,
          order: index + 1,
        })),
      },
    },
    include: {
      deck: { select: { id: true, title: true } },
      sprintCards: {
        orderBy: { order: 'asc' },
        include: {
          card: {
            include: {
              deck: { select: { id: true, title: true } },
            },
          },
        },
      },
    },
  });

  return { sprint: sprint as SprintWithCards, resumed: false };
}

/**
 * Calculate sprint progress.
 */
export function calculateProgress(
  sprintCards: Array<{ result: string | null }>,
) {
  const total = sprintCards.length;
  const reviewed = sprintCards.filter((sc) => sc.result !== null).length;
  return {
    total,
    reviewed,
    remaining: total - reviewed,
  };
}

/**
 * Format a sprint for API response.
 */
export function formatSprintResponse(sprint: SprintWithCards) {
  const progress = calculateProgress(sprint.sprintCards);

  return {
    id: sprint.id,
    status: sprint.status,
    source: sprint.source,
    deckId: sprint.deckId,
    deckTitle: sprint.deck?.title ?? null,
    createdAt: sprint.createdAt.toISOString(),
    startedAt: sprint.startedAt?.toISOString() ?? null,
    completedAt: sprint.completedAt?.toISOString() ?? null,
    resumableUntil: sprint.resumableUntil?.toISOString() ?? null,
    abandonedAt: sprint.abandonedAt?.toISOString() ?? null,
    cards: sprint.sprintCards.map((sc) => ({
      id: sc.id,
      order: sc.order,
      result: sc.result,
      reviewedAt: null, // TODO: Add reviewedAt field to SprintCard if needed
      card: {
        id: sc.card.id,
        front: sc.card.front,
        back: sc.card.back,
        priority: sc.card.priority,
        deckId: sc.card.deckId,
        deckTitle: sc.card.deck.title,
        state: sc.card.state,
        nextReviewDate: sc.card.nextReviewDate.toISOString(),
        snoozedUntil: sc.card.snoozedUntil?.toISOString() ?? null,
      },
    })),
    progress,
  };
}
