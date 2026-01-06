import { prisma } from '@/lib/prisma';

/**
 * Marks cards as notified by updating their lastNotificationSent timestamp.
 * This function is idempotent - calling it multiple times with the same card IDs
 * will simply update the timestamp again.
 *
 * @param cardIds - Array of card IDs to mark as notified
 * @returns Number of cards updated
 */
export async function markCardsAsNotified(cardIds: string[]): Promise<number> {
  if (cardIds.length === 0) {
    return 0;
  }

  const result = await prisma.card.updateMany({
    where: {
      id: {
        in: cardIds,
      },
    },
    data: {
      lastNotificationSent: new Date(),
    },
  });

  console.log(`[CardNotifications] Marked ${result.count} cards as notified`);
  return result.count;
}

/**
 * Marks a single card as notified.
 *
 * @param cardId - The card ID to mark as notified
 * @returns true if the card was updated, false otherwise
 */
export async function markCardAsNotified(cardId: string): Promise<boolean> {
  try {
    await prisma.card.update({
      where: { id: cardId },
      data: {
        lastNotificationSent: new Date(),
      },
    });
    return true;
  } catch (error) {
    // Card might not exist
    console.error(
      `[CardNotifications] Failed to mark card ${cardId} as notified:`,
      error,
    );
    return false;
  }
}

/**
 * Clears the notification status for cards (resets lastNotificationSent to null).
 * This is typically called when a card is reviewed, allowing it to be notified again
 * for its next review date.
 *
 * @param cardIds - Array of card IDs to clear notification status
 * @returns Number of cards updated
 */
export async function clearNotificationStatus(
  cardIds: string[],
): Promise<number> {
  if (cardIds.length === 0) {
    return 0;
  }

  const result = await prisma.card.updateMany({
    where: {
      id: {
        in: cardIds,
      },
    },
    data: {
      lastNotificationSent: null,
    },
  });

  return result.count;
}

/**
 * Snoozes cards for a specified duration.
 * Used to auto-snooze overflow cards that weren't included in a notification.
 *
 * @param cardIds - Array of card IDs to snooze
 * @param durationMinutes - Duration to snooze in minutes
 * @returns Number of cards snoozed
 */
export async function snoozeCards(
  cardIds: string[],
  durationMinutes: number,
): Promise<number> {
  if (cardIds.length === 0) {
    return 0;
  }

  const snoozedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);

  const result = await prisma.card.updateMany({
    where: {
      id: {
        in: cardIds,
      },
    },
    data: {
      snoozedUntil,
    },
  });

  console.log(
    `[CardNotifications] Snoozed ${result.count} cards for ${durationMinutes} minutes`,
  );
  return result.count;
}

/**
 * Removes a user's push token from the database.
 * This is called when we receive a DeviceNotRegistered error from Expo,
 * indicating the token is no longer valid.
 *
 * @param userId - The user ID whose push token should be removed
 * @returns true if the token was removed, false otherwise
 */
export async function removeUserPushToken(userId: string): Promise<boolean> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        pushToken: null,
      },
    });
    console.log(`[CardNotifications] Removed push token for user ${userId}`);
    return true;
  } catch (error) {
    console.error(
      `[CardNotifications] Failed to remove push token for user ${userId}:`,
      error,
    );
    return false;
  }
}
