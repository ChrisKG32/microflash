/**
 * Notification Eligibility Service
 *
 * Centralizes "can we push now?" and "when next?" logic for push notifications.
 * Used by:
 * - Scheduler (E4.2) to decide who gets a sprint push
 * - Home summary endpoint to return nextEligiblePushTime
 */

import { prisma } from '@/lib/prisma';
import type { User } from '@/generated/prisma';
import { findResumableSprint } from '@/services/sprint-service';

/**
 * Result of checking a user's push notification eligibility.
 */
export interface PushEligibilityResult {
  /** Whether the user is currently eligible for a push notification */
  eligible: boolean;
  /** When the user will next be eligible (null if never/unknown) */
  nextEligibleAt: Date | null;
  /** Reason for ineligibility (only set when eligible=false) */
  reason?: string;
}

/**
 * Reasons why a user may be ineligible for push notifications.
 */
export type IneligibilityReason =
  | 'NOTIFICATIONS_DISABLED'
  | 'NO_PUSH_TOKEN'
  | 'RESUMABLE_SPRINT_EXISTS'
  | 'COOLDOWN_ACTIVE'
  | 'MAX_PER_DAY_REACHED';

/**
 * Gets the start of the current UTC day.
 */
export function getStartOfUTCDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * Gets the start of the next UTC day.
 */
export function getStartOfNextUTCDay(date: Date): Date {
  const d = getStartOfUTCDay(date);
  d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

/**
 * Checks if a date is "today" in UTC.
 */
export function isToday(date: Date | null, now: Date): boolean {
  if (!date) return false;
  const todayStart = getStartOfUTCDay(now);
  const tomorrowStart = getStartOfNextUTCDay(now);
  return date >= todayStart && date < tomorrowStart;
}

/**
 * Gets the effective notifications count for today.
 * If lastPushSentAt is not today, the count is effectively 0.
 */
export function getEffectiveNotificationsCountToday(
  user: Pick<User, 'lastPushSentAt' | 'notificationsCountToday'>,
  now: Date,
): number {
  if (!isToday(user.lastPushSentAt, now)) {
    return 0;
  }
  return user.notificationsCountToday;
}

/**
 * Checks if a user is eligible for a push notification.
 *
 * Eligibility rules (MVP simplified):
 * 1. notificationsEnabled must be true
 * 2. pushToken must exist
 * 3. No resumable sprint exists
 * 4. Cooldown has elapsed (>= notificationCooldownMinutes since lastPushSentAt)
 * 5. Max per day not reached (notificationsCountToday < maxNotificationsPerDay)
 *
 * @param user - User record with notification fields
 * @param now - Current time (for testability)
 * @returns Eligibility result with next eligible time if applicable
 */
export async function getUserPushEligibility(
  user: Pick<
    User,
    | 'id'
    | 'notificationsEnabled'
    | 'pushToken'
    | 'lastPushSentAt'
    | 'notificationCooldownMinutes'
    | 'maxNotificationsPerDay'
    | 'notificationsCountToday'
  >,
  now: Date = new Date(),
): Promise<PushEligibilityResult> {
  // Rule 1: Notifications must be enabled
  if (!user.notificationsEnabled) {
    return {
      eligible: false,
      nextEligibleAt: null,
      reason: 'NOTIFICATIONS_DISABLED',
    };
  }

  // Rule 2: Must have a push token
  if (!user.pushToken) {
    return {
      eligible: false,
      nextEligibleAt: null,
      reason: 'NO_PUSH_TOKEN',
    };
  }

  // Rule 3: No resumable sprint should exist
  const resumableSprint = await findResumableSprint(user.id);
  if (resumableSprint) {
    return {
      eligible: false,
      nextEligibleAt: resumableSprint.resumableUntil,
      reason: 'RESUMABLE_SPRINT_EXISTS',
    };
  }

  // Rule 4: Cooldown must have elapsed
  if (user.lastPushSentAt) {
    const cooldownEnd = new Date(
      user.lastPushSentAt.getTime() + user.notificationCooldownMinutes * 60000,
    );
    if (now < cooldownEnd) {
      return {
        eligible: false,
        nextEligibleAt: cooldownEnd,
        reason: 'COOLDOWN_ACTIVE',
      };
    }
  }

  // Rule 5: Max per day not reached
  const effectiveCount = getEffectiveNotificationsCountToday(user, now);
  if (effectiveCount >= user.maxNotificationsPerDay) {
    return {
      eligible: false,
      nextEligibleAt: getStartOfNextUTCDay(now),
      reason: 'MAX_PER_DAY_REACHED',
    };
  }

  // All rules passed - user is eligible
  return {
    eligible: true,
    nextEligibleAt: now,
  };
}

/**
 * Computes the next eligible push time for a user.
 * This is a convenience wrapper that returns just the nextEligibleAt value.
 *
 * @param userId - User ID to check
 * @param now - Current time (for testability)
 * @returns Next eligible time as ISO string, or null if never eligible
 */
export async function getNextEligiblePushTime(
  userId: string,
  now: Date = new Date(),
): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      notificationsEnabled: true,
      pushToken: true,
      lastPushSentAt: true,
      notificationCooldownMinutes: true,
      maxNotificationsPerDay: true,
      notificationsCountToday: true,
    },
  });

  if (!user) {
    return null;
  }

  const result = await getUserPushEligibility(user, now);
  return result.nextEligibleAt?.toISOString() ?? null;
}

/**
 * Gets all users who are potentially eligible for push notifications.
 * This is a pre-filter query - actual eligibility must still be checked
 * per-user with getUserPushEligibility().
 *
 * @returns Array of users with notification fields
 */
export async function getCandidateUsersForPush(): Promise<
  Array<
    Pick<
      User,
      | 'id'
      | 'notificationsEnabled'
      | 'pushToken'
      | 'lastPushSentAt'
      | 'notificationCooldownMinutes'
      | 'maxNotificationsPerDay'
      | 'notificationsCountToday'
      | 'sprintSize'
    >
  >
> {
  return prisma.user.findMany({
    where: {
      notificationsEnabled: true,
      pushToken: { not: null },
    },
    select: {
      id: true,
      notificationsEnabled: true,
      pushToken: true,
      lastPushSentAt: true,
      notificationCooldownMinutes: true,
      maxNotificationsPerDay: true,
      notificationsCountToday: true,
      sprintSize: true,
    },
  });
}

/**
 * Checks if a user has any due cards available for a sprint.
 *
 * @param userId - User ID to check
 * @param now - Current time
 * @returns True if user has at least one due card
 */
export async function userHasDueCards(
  userId: string,
  now: Date = new Date(),
): Promise<boolean> {
  const count = await prisma.card.count({
    where: {
      deck: { userId },
      nextReviewDate: { lte: now },
      OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: now } }],
    },
  });
  return count > 0;
}
