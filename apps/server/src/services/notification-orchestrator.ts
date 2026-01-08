/**
 * Notification Orchestrator
 *
 * Orchestrates the sprint-based push notification flow:
 * 1. Find eligible users (notifications enabled + push token)
 * 2. Check per-user eligibility (cooldown, max/day, no resumable sprint)
 * 3. Check if user has due cards
 * 4. Create PENDING push sprint
 * 5. Send push notification with sprintId
 * 6. Update user tracking on success
 * 7. Cleanup sprint on failure
 */

import pAll from 'p-all';
import { prisma } from '@/lib/prisma';
import {
  getCandidateUsersForPush,
  getUserPushEligibility,
  userHasDueCards,
  isToday,
} from '@/services/notification-eligibility';
import {
  createPendingPushSprint,
  deletePendingSprint,
} from '@/services/sprint-service';
import {
  prepareNotificationPayload,
  type UserNotificationGroup,
} from '@/services/notification-grouping';
import {
  sendBatchNotifications,
  type PushNotificationResult,
} from '@/services/push-notifications';
import { removeUserPushToken } from '@/services/card-notifications';

/**
 * Result of the notification orchestration process.
 */
export interface NotificationOrchestrationResult {
  totalUsersChecked: number;
  totalUsersEligible: number;
  totalSprintsCreated: number;
  totalNotificationsSent: number;
  successfulNotifications: number;
  failedNotifications: number;
  tokensRemoved: number;
}

/**
 * Internal tracking for a user's push attempt
 */
interface PushAttempt {
  userId: string;
  pushToken: string;
  sprintId: string;
  cardCount: number;
}

/**
 * Orchestrates the entire notification process:
 * 1. Find candidate users
 * 2. Check eligibility and due cards
 * 3. Create sprints and send pushes
 * 4. Update tracking and cleanup failures
 *
 * @returns Result of the orchestration process
 */
export async function sendDueCardNotifications(): Promise<NotificationOrchestrationResult> {
  const result: NotificationOrchestrationResult = {
    totalUsersChecked: 0,
    totalUsersEligible: 0,
    totalSprintsCreated: 0,
    totalNotificationsSent: 0,
    successfulNotifications: 0,
    failedNotifications: 0,
    tokensRemoved: 0,
  };

  const now = new Date();

  try {
    // Step 1: Get candidate users (notifications enabled + push token)
    const candidateUsers = await getCandidateUsersForPush();
    result.totalUsersChecked = candidateUsers.length;

    if (candidateUsers.length === 0) {
      console.log(
        '[NotificationOrchestrator] No candidate users for push notifications',
      );
      return result;
    }

    console.log(
      `[NotificationOrchestrator] Found ${candidateUsers.length} candidate users`,
    );

    // Step 2: Check eligibility and create sprints for eligible users
    const pushAttempts: PushAttempt[] = [];

    for (const user of candidateUsers) {
      // Check eligibility
      const eligibility = await getUserPushEligibility(user, now);
      if (!eligibility.eligible) {
        console.log(
          `[NotificationOrchestrator] User ${user.id} ineligible: ${eligibility.reason}`,
        );
        continue;
      }

      // Check if user has due cards
      const hasDueCards = await userHasDueCards(user.id, now);
      if (!hasDueCards) {
        console.log(
          `[NotificationOrchestrator] User ${user.id} has no due cards`,
        );
        continue;
      }

      result.totalUsersEligible++;

      // Create PENDING push sprint
      try {
        const { sprint, cardCount } = await createPendingPushSprint({
          userId: user.id,
          sprintSize: user.sprintSize,
        });

        result.totalSprintsCreated++;

        pushAttempts.push({
          userId: user.id,
          pushToken: user.pushToken!,
          sprintId: sprint.id,
          cardCount,
        });

        console.log(
          `[NotificationOrchestrator] Created sprint ${sprint.id} for user ${user.id} with ${cardCount} cards`,
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        console.log(
          `[NotificationOrchestrator] Failed to create sprint for user ${user.id}: ${message}`,
        );
        // Continue to next user
      }
    }

    if (pushAttempts.length === 0) {
      console.log(
        '[NotificationOrchestrator] No sprints created, nothing to send',
      );
      return result;
    }

    // Step 3: Prepare and send notifications
    const notifications = pushAttempts.map((attempt) => {
      // Build a minimal UserNotificationGroup for payload preparation
      const group: UserNotificationGroup = {
        userId: attempt.userId,
        clerkId: '', // Not needed for payload
        pushToken: attempt.pushToken,
        decks: [], // Not needed for payload (we use cardCount directly)
        totalCards: attempt.cardCount,
        sprintId: attempt.sprintId,
      };

      const payload = prepareNotificationPayload(group, attempt.cardCount);

      return {
        pushToken: attempt.pushToken,
        title: payload.title,
        body: payload.body,
        categoryId: payload.categoryId,
        data: payload.data,
      };
    });

    console.log(
      `[NotificationOrchestrator] Sending ${notifications.length} push notifications`,
    );

    const sendResults = await sendBatchNotifications(notifications);
    result.totalNotificationsSent = sendResults.length;

    // Step 4: Process results - update tracking for successes, cleanup failures
    const successfulUserIds: string[] = [];
    const failedAttempts: {
      attempt: PushAttempt;
      result: PushNotificationResult;
    }[] = [];
    const tokensToRemove: string[] = [];

    for (let i = 0; i < sendResults.length; i++) {
      const sendResult = sendResults[i];
      const attempt = pushAttempts[i];

      if (sendResult.success) {
        result.successfulNotifications++;
        successfulUserIds.push(attempt.userId);
        console.log(
          `[NotificationOrchestrator] Successfully sent push for sprint ${attempt.sprintId}`,
        );
      } else {
        result.failedNotifications++;
        failedAttempts.push({ attempt, result: sendResult });
        console.log(
          `[NotificationOrchestrator] Failed to send push for sprint ${attempt.sprintId}: ${sendResult.error}`,
        );

        // Check if we should remove the token
        if (
          sendResult.error?.includes('DeviceNotRegistered') ||
          sendResult.error?.includes('InvalidCredentials') ||
          sendResult.error?.includes('Invalid Expo push token')
        ) {
          tokensToRemove.push(attempt.userId);
        }
      }
    }

    // Step 5: Update user tracking for successful sends
    if (successfulUserIds.length > 0) {
      await updateUserPushTracking(successfulUserIds, now);
    }

    // Step 6: Cleanup failed sprints
    if (failedAttempts.length > 0) {
      const cleanupTasks = failedAttempts.map(({ attempt }) => async () => {
        await deletePendingSprint(attempt.sprintId);
        console.log(
          `[NotificationOrchestrator] Cleaned up failed sprint ${attempt.sprintId}`,
        );
      });
      await pAll(cleanupTasks, { concurrency: 5 });
    }

    // Step 7: Remove invalid tokens
    if (tokensToRemove.length > 0) {
      const tokenRemovalTasks = tokensToRemove.map(
        (userId) => () => removeUserPushToken(userId),
      );
      await pAll(tokenRemovalTasks, { concurrency: 5 });
      result.tokensRemoved = tokensToRemove.length;
      console.log(
        `[NotificationOrchestrator] Removed ${tokensToRemove.length} invalid tokens`,
      );
    }

    console.log(
      `[NotificationOrchestrator] Complete: ${result.successfulNotifications}/${result.totalNotificationsSent} successful`,
    );

    return result;
  } catch (error) {
    console.error('[NotificationOrchestrator] Error:', error);
    throw error;
  }
}

/**
 * Update user push tracking fields after successful sends.
 *
 * @param userIds - Array of user IDs that received successful pushes
 * @param now - Current time
 */
async function updateUserPushTracking(
  userIds: string[],
  now: Date,
): Promise<void> {
  // We need to handle each user individually because of the day rollover logic
  const updateTasks = userIds.map((userId) => async () => {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { lastPushSentAt: true, notificationsCountToday: true },
    });

    if (!user) return;

    // Calculate new count (reset if last push was not today)
    const currentCount = isToday(user.lastPushSentAt, now)
      ? user.notificationsCountToday
      : 0;

    await prisma.user.update({
      where: { id: userId },
      data: {
        lastPushSentAt: now,
        notificationsCountToday: currentCount + 1,
      },
    });
  });

  await pAll(updateTasks, { concurrency: 5 });
}
