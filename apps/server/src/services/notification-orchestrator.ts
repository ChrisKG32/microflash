import pAll from 'p-all';
import { findDueCards } from './due-cards';
import {
  groupCardsByUserAndDeck,
  prepareNotificationPayload,
} from './notification-grouping';
import {
  sendBatchNotifications,
  logNotificationResults,
} from './push-notifications';
import { markCardsAsNotified, removeUserPushToken } from './card-notifications';

/**
 * Result of the notification orchestration process.
 */
export interface NotificationOrchestrationResult {
  totalCardsFound: number;
  totalUsersNotified: number;
  totalNotificationsSent: number;
  successfulNotifications: number;
  failedNotifications: number;
  cardsMarkedAsNotified: number;
}

/**
 * Orchestrates the entire notification process:
 * 1. Find cards due for review
 * 2. Group cards by user and deck
 * 3. Send push notifications
 * 4. Mark successfully notified cards in the database
 *
 * @returns Result of the orchestration process
 */
export async function sendDueCardNotifications(): Promise<NotificationOrchestrationResult> {
  const result: NotificationOrchestrationResult = {
    totalCardsFound: 0,
    totalUsersNotified: 0,
    totalNotificationsSent: 0,
    successfulNotifications: 0,
    failedNotifications: 0,
    cardsMarkedAsNotified: 0,
  };

  try {
    // Step 1: Find cards due for review
    const dueCards = await findDueCards();
    result.totalCardsFound = dueCards.length;

    if (dueCards.length === 0) {
      console.log('[NotificationOrchestrator] No cards due for notification');
      return result;
    }

    console.log(
      `[NotificationOrchestrator] Found ${dueCards.length} cards due for notification`,
    );

    // Step 2: Group cards by user and deck
    const userGroups = groupCardsByUserAndDeck(dueCards);
    result.totalUsersNotified = userGroups.length;

    if (userGroups.length === 0) {
      console.log(
        '[NotificationOrchestrator] No users with valid push tokens to notify',
      );
      return result;
    }

    console.log(
      `[NotificationOrchestrator] Grouped cards for ${userGroups.length} users`,
    );

    // Step 3: Prepare and send notifications
    const notifications = userGroups.map((group) => {
      const payload = prepareNotificationPayload(group);
      return {
        pushToken: group.pushToken,
        title: payload.title,
        body: payload.body,
        data: payload.data as Record<string, unknown>,
        // Track which cards belong to this notification for marking
        _cardIds: payload.data.cardIds,
        _userId: group.userId,
      };
    });

    result.totalNotificationsSent = notifications.length;

    const sendResults = await sendBatchNotifications(
      notifications.map((n) => ({
        pushToken: n.pushToken,
        title: n.title,
        body: n.body,
        data: n.data,
      })),
    );

    // Log results
    logNotificationResults(sendResults);

    // Count successes and failures
    result.successfulNotifications = sendResults.filter(
      (r) => r.success,
    ).length;
    result.failedNotifications = sendResults.filter((r) => !r.success).length;

    // Step 4: Mark cards as notified for successful sends
    const successfulCardIds: string[] = [];
    const tokensToRemove: { userId: string; pushToken: string }[] = [];

    for (let i = 0; i < sendResults.length; i++) {
      const sendResult = sendResults[i];
      const notification = notifications[i];

      if (sendResult.success) {
        // Add all card IDs from this successful notification
        successfulCardIds.push(...notification._cardIds);
      } else if (
        sendResult.error?.includes('DeviceNotRegistered') ||
        sendResult.error?.includes('Invalid')
      ) {
        // Track tokens that need to be removed
        tokensToRemove.push({
          userId: notification._userId,
          pushToken: notification.pushToken,
        });
      }
    }

    // Mark successfully notified cards
    if (successfulCardIds.length > 0) {
      result.cardsMarkedAsNotified =
        await markCardsAsNotified(successfulCardIds);
    }

    // Remove invalid push tokens concurrently with limited concurrency
    if (tokensToRemove.length > 0) {
      const tokenRemovalTasks = tokensToRemove.map(
        ({ userId }) =>
          () =>
            removeUserPushToken(userId),
      );
      await pAll(tokenRemovalTasks, { concurrency: 5 });
    }

    console.log(
      `[NotificationOrchestrator] Complete: ${result.successfulNotifications}/${result.totalNotificationsSent} notifications sent, ${result.cardsMarkedAsNotified} cards marked as notified`,
    );

    return result;
  } catch (error) {
    console.error('[NotificationOrchestrator] Error:', error);
    throw error;
  }
}
