import pAll from 'p-all';
import { findDueCards } from './due-cards';
import {
  groupCardsByUserAndDeck,
  prepareNotificationPayload,
  OVERFLOW_SNOOZE_DURATION_MINUTES,
} from './notification-grouping';
import {
  sendBatchNotifications,
  logNotificationResults,
} from './push-notifications';
import {
  markCardsAsNotified,
  removeUserPushToken,
  snoozeCards,
} from './card-notifications';

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
  /** Number of overflow cards that were auto-snoozed for 2 hours */
  overflowCardsSnoozed: number;
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
    overflowCardsSnoozed: 0,
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
        categoryId: payload.categoryId,
        data: payload.data as Record<string, unknown>,
        // Track which cards belong to this notification for marking
        _includedCardIds: group.includedCardIds,
        _overflowCardIds: group.overflowCardIds,
        _userId: group.userId,
      };
    });

    result.totalNotificationsSent = notifications.length;

    const sendResults = await sendBatchNotifications(
      notifications.map((n) => ({
        pushToken: n.pushToken,
        title: n.title,
        body: n.body,
        categoryId: n.categoryId,
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

    // Step 4: Mark cards as notified for successful sends and snooze overflow
    const successfulCardIds: string[] = [];
    const overflowCardIds: string[] = [];
    const tokensToRemove: { userId: string; pushToken: string }[] = [];

    for (let i = 0; i < sendResults.length; i++) {
      const sendResult = sendResults[i];
      const notification = notifications[i];

      if (sendResult.success) {
        // Add included card IDs from this successful notification
        successfulCardIds.push(...notification._includedCardIds);
        // Track overflow cards to snooze
        overflowCardIds.push(...notification._overflowCardIds);
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

    // Snooze overflow cards for 2 hours so user isn't overwhelmed
    if (overflowCardIds.length > 0) {
      result.overflowCardsSnoozed = await snoozeCards(
        overflowCardIds,
        OVERFLOW_SNOOZE_DURATION_MINUTES,
      );
      console.log(
        `[NotificationOrchestrator] Snoozed ${result.overflowCardsSnoozed} overflow cards for ${OVERFLOW_SNOOZE_DURATION_MINUTES} minutes`,
      );
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
      `[NotificationOrchestrator] Complete: ${result.successfulNotifications}/${result.totalNotificationsSent} notifications sent, ${result.cardsMarkedAsNotified} cards marked as notified, ${result.overflowCardsSnoozed} overflow cards snoozed`,
    );

    return result;
  } catch (error) {
    console.error('[NotificationOrchestrator] Error:', error);
    throw error;
  }
}
