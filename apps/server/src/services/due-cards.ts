import { prisma } from '@/lib/prisma';

/**
 * Notification window in minutes (±7 minutes from current time).
 */
const NOTIFICATION_WINDOW_MINUTES = 7;

/**
 * Minimum time between notifications for the same card (in minutes).
 * Prevents re-notifying cards that were recently notified.
 */
const MIN_NOTIFICATION_INTERVAL_MINUTES = 30;

/**
 * Card with related deck and user information for notification processing.
 */
export interface DueCardWithRelations {
  id: string;
  front: string;
  nextReviewDate: Date;
  lastNotificationSent: Date | null;
  snoozedUntil: Date | null;
  deck: {
    id: string;
    title: string;
    userId: string;
    parentDeckId: string | null;
  };
  user: {
    id: string;
    clerkId: string;
    pushToken: string | null;
    notificationsEnabled: boolean;
  };
}

/**
 * Options for the due cards query.
 */
export interface FindDueCardsOptions {
  /**
   * Custom notification window in minutes (defaults to 7).
   */
  windowMinutes?: number;

  /**
   * Whether to exclude cards that have been notified recently.
   * Defaults to true.
   */
  excludeRecentlyNotified?: boolean;
}

/**
 * Finds cards that are due for review within the notification window.
 *
 * The query:
 * 1. Finds cards where nextReviewDate is within ±7 minutes of now
 * 2. Excludes cards where snoozedUntil > now (user snoozed the card)
 * 3. Excludes cards that were notified within the last 30 minutes
 * 4. Only includes cards from users with notifications enabled and a push token
 * 5. Includes related deck and user information for grouping
 *
 * @param options - Query options
 * @returns Array of due cards with deck and user relations
 */
export async function findDueCards(
  options: FindDueCardsOptions = {},
): Promise<DueCardWithRelations[]> {
  const {
    windowMinutes = NOTIFICATION_WINDOW_MINUTES,
    excludeRecentlyNotified = true,
  } = options;

  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000);
  const windowEnd = new Date(now.getTime() + windowMinutes * 60 * 1000);

  // Calculate the cutoff for "recently notified" cards
  const recentNotificationCutoff = new Date(
    now.getTime() - MIN_NOTIFICATION_INTERVAL_MINUTES * 60 * 1000,
  );

  // Build the AND conditions array
  const andConditions: object[] = [
    // Card is due within the notification window
    {
      nextReviewDate: {
        gte: windowStart,
        lte: windowEnd,
      },
    },
    // Card is not snoozed (or snooze has expired)
    {
      OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }],
    },
    // User has notifications enabled and has a push token
    {
      deck: {
        user: {
          notificationsEnabled: true,
          pushToken: { not: null },
        },
      },
    },
  ];

  // Add notification filter if needed
  if (excludeRecentlyNotified) {
    andConditions.push({
      OR: [
        { lastNotificationSent: null },
        { lastNotificationSent: { lt: recentNotificationCutoff } },
      ],
    });
  }

  const cards = await prisma.card.findMany({
    where: {
      AND: andConditions,
    },
    select: {
      id: true,
      front: true,
      nextReviewDate: true,
      lastNotificationSent: true,
      snoozedUntil: true,
      deck: {
        select: {
          id: true,
          title: true,
          userId: true,
          parentDeckId: true,
        },
      },
    },
  });

  // Fetch user information for each unique userId
  const userIds = [...new Set(cards.map((card) => card.deck.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      clerkId: true,
      pushToken: true,
      notificationsEnabled: true,
    },
  });

  const userMap = new Map(users.map((user) => [user.id, user]));

  // Combine cards with user information
  return cards
    .map((card) => {
      const user = userMap.get(card.deck.userId);
      if (!user) return null;

      return {
        ...card,
        user,
      };
    })
    .filter((card): card is DueCardWithRelations => card !== null);
}

/**
 * Counts the number of cards due for review within the notification window.
 * Useful for quick checks without fetching full card data.
 *
 * @param options - Query options
 * @returns Count of due cards
 */
export async function countDueCards(
  options: FindDueCardsOptions = {},
): Promise<number> {
  const {
    windowMinutes = NOTIFICATION_WINDOW_MINUTES,
    excludeRecentlyNotified = true,
  } = options;

  const now = new Date();
  const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000);
  const windowEnd = new Date(now.getTime() + windowMinutes * 60 * 1000);
  const recentNotificationCutoff = new Date(
    now.getTime() - MIN_NOTIFICATION_INTERVAL_MINUTES * 60 * 1000,
  );

  const andConditions: object[] = [
    {
      nextReviewDate: {
        gte: windowStart,
        lte: windowEnd,
      },
    },
    {
      OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }],
    },
    {
      deck: {
        user: {
          notificationsEnabled: true,
          pushToken: { not: null },
        },
      },
    },
  ];

  if (excludeRecentlyNotified) {
    andConditions.push({
      OR: [
        { lastNotificationSent: null },
        { lastNotificationSent: { lt: recentNotificationCutoff } },
      ],
    });
  }

  return prisma.card.count({
    where: {
      AND: andConditions,
    },
  });
}
