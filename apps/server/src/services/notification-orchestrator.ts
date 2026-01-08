import pAll from 'p-all';
import { findDueCards } from './due-cards';
import { groupCardsByUserAndDeck } from './notification-grouping';
// TODO (E4.2): Re-enable when sprint-based notifications are implemented
// import {
//   sendBatchNotifications,
//   logNotificationResults,
// } from './push-notifications';
import { removeUserPushToken } from './card-notifications';

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
  /** @deprecated No longer used - sprint-based notifications don't have overflow */
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
    // NOTE: E4.2 will update this to create sprints before sending notifications.
    // For now, this orchestrator is disabled until sprint creation is implemented.
    // The prepareNotificationPayload function requires sprintId to be set.
    //
    // TODO (E4.2): For each user group:
    // 1. Create a sprint with source=PUSH
    // 2. Set group.sprintId = sprint.id
    // 3. Call prepareNotificationPayload(group, sprint.cards.length)
    // 4. Send notification
    // 5. Track sprint for marking cards as notified on success

    console.log(
      '[NotificationOrchestrator] Sprint-based notifications not yet implemented (E4.2)',
    );
    console.log(
      `[NotificationOrchestrator] Would notify ${userGroups.length} users with ${result.totalCardsFound} total due cards`,
    );

    // For now, just track tokens that need removal from users without valid tokens
    // This keeps the token cleanup logic working
    const tokensToRemove: { userId: string; pushToken: string }[] = [];

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
      `[NotificationOrchestrator] Complete (no-op until E4.2): ${result.totalUsersNotified} users eligible`,
    );

    return result;
  } catch (error) {
    console.error('[NotificationOrchestrator] Error:', error);
    throw error;
  }
}
