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
  | 'MAX_PER_DAY_REACHED'
  | 'QUIET_HOURS_ACTIVE';

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
 * Converts a time string (HH:MM) to minutes since midnight.
 * @param timeString - Time in HH:MM format (e.g., "22:00")
 * @returns Minutes since midnight (0-1439)
 */
export function timeStringToMinutes(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Gets the current time in minutes since midnight for a given timezone.
 * @param now - Current date/time
 * @param timezone - IANA timezone string (e.g., "America/New_York")
 * @returns Minutes since midnight in the user's timezone (0-1439)
 */
export function getCurrentTimeInTimezone(now: Date, timezone: string): number {
  try {
    // Format the time in the user's timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const hours = parseInt(
      parts.find((p) => p.type === 'hour')?.value ?? '0',
      10,
    );
    const minutes = parseInt(
      parts.find((p) => p.type === 'minute')?.value ?? '0',
      10,
    );

    return hours * 60 + minutes;
  } catch (_error) {
    // If timezone is invalid, fall back to UTC
    console.error(
      `[NotificationEligibility] Invalid timezone: ${timezone}, falling back to UTC`,
    );
    return now.getUTCHours() * 60 + now.getUTCMinutes();
  }
}

/**
 * Checks if the current time falls within quiet hours.
 * Handles cases where quiet hours span midnight (e.g., 22:00 to 07:00).
 *
 * @param currentMinutes - Current time in minutes since midnight
 * @param startMinutes - Quiet hours start in minutes since midnight
 * @param endMinutes - Quiet hours end in minutes since midnight
 * @returns True if current time is within quiet hours
 */
export function isInQuietHours(
  currentMinutes: number,
  startMinutes: number,
  endMinutes: number,
): boolean {
  if (startMinutes < endMinutes) {
    // Normal case: quiet hours within same day (e.g., 01:00 to 06:00)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } else {
    // Spans midnight: quiet hours cross day boundary (e.g., 22:00 to 07:00)
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
}

/**
 * Calculates when quiet hours will end.
 * @param now - Current date/time
 * @param currentMinutes - Current time in minutes since midnight in user's timezone
 * @param endMinutes - Quiet hours end in minutes since midnight
 * @param timezone - User's timezone
 * @returns Date when quiet hours end
 */
export function getQuietHoursEndTime(
  now: Date,
  currentMinutes: number,
  endMinutes: number,
  timezone: string,
): Date {
  try {
    // Get the current date in the user's timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const parts = formatter.formatToParts(now);
    const year = parseInt(
      parts.find((p) => p.type === 'year')?.value ?? '0',
      10,
    );
    const month = parseInt(
      parts.find((p) => p.type === 'month')?.value ?? '0',
      10,
    );
    const day = parseInt(parts.find((p) => p.type === 'day')?.value ?? '0', 10);

    // Create a date string in the user's timezone
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;

    // If end time is before current time, it's tomorrow
    const dateStr =
      endMinutes <= currentMinutes
        ? `${year}-${String(month).padStart(2, '0')}-${String(day + 1).padStart(2, '0')}`
        : `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    const timeStr = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}:00`;

    // Parse as a date in the user's timezone and convert to UTC
    const endDate = new Date(`${dateStr}T${timeStr}`);

    // Adjust for timezone offset
    const userDate = new Date(
      endDate.toLocaleString('en-US', { timeZone: timezone }),
    );
    const utcDate = new Date(
      endDate.toLocaleString('en-US', { timeZone: 'UTC' }),
    );
    const offset = utcDate.getTime() - userDate.getTime();

    return new Date(endDate.getTime() - offset);
  } catch (error) {
    console.error(
      `[NotificationEligibility] Error calculating quiet hours end time:`,
      error,
    );
    // Fallback: add time to current date
    const minutesUntilEnd =
      endMinutes > currentMinutes
        ? endMinutes - currentMinutes
        : 1440 - currentMinutes + endMinutes;
    return new Date(now.getTime() + minutesUntilEnd * 60000);
  }
}

/**
 * Checks if a user is eligible for a push notification.
 *
 * Eligibility rules:
 * 1. notificationsEnabled must be true
 * 2. pushToken must exist
 * 3. No resumable sprint exists
 * 4. Not in quiet hours (if configured)
 * 5. Cooldown has elapsed (>= notificationCooldownMinutes since lastPushSentAt)
 * 6. Max per day not reached (notificationsCountToday < maxNotificationsPerDay)
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
    | 'quietHoursStart'
    | 'quietHoursEnd'
    | 'timezone'
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

  // Rule 4: Check quiet hours (if configured)
  if (user.quietHoursStart && user.quietHoursEnd) {
    const currentMinutes = getCurrentTimeInTimezone(now, user.timezone);
    const startMinutes = timeStringToMinutes(user.quietHoursStart);
    const endMinutes = timeStringToMinutes(user.quietHoursEnd);

    if (isInQuietHours(currentMinutes, startMinutes, endMinutes)) {
      const quietHoursEnd = getQuietHoursEndTime(
        now,
        currentMinutes,
        endMinutes,
        user.timezone,
      );
      return {
        eligible: false,
        nextEligibleAt: quietHoursEnd,
        reason: 'QUIET_HOURS_ACTIVE',
      };
    }
  }

  // Rule 5: Cooldown must have elapsed
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

  // Rule 6: Max per day not reached
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
      quietHoursStart: true,
      quietHoursEnd: true,
      timezone: true,
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
      | 'quietHoursStart'
      | 'quietHoursEnd'
      | 'timezone'
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
      quietHoursStart: true,
      quietHoursEnd: true,
      timezone: true,
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
