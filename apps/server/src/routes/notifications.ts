import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/middlewares/auth';
import { validate } from '@/middlewares/validate';
import { asyncHandler, ApiError } from '@/middlewares/error-handler';
import { isValidExpoPushToken } from '@/services/push-notifications';
import { createPendingPushSprint } from '@/services/sprint-service';
import {
  prepareNotificationPayload,
  type UserNotificationGroup,
} from '@/services/notification-grouping';

const router: RouterType = Router();

// Validation schemas
const registerPushTokenSchema = z.object({
  pushToken: z.string().min(1, 'Push token is required'),
});

const snoozeCardSchema = z.object({
  duration: z
    .number()
    .int()
    .min(1)
    .max(1440)
    .default(30)
    .describe('Snooze duration in minutes (1-1440)'),
});

const updatePreferencesSchema = z.object({
  notificationsEnabled: z.boolean().optional(),
  notificationCooldownMinutes: z
    .number()
    .int()
    .min(120, 'Cooldown must be at least 120 minutes (2 hours)')
    .max(1440, 'Maximum cooldown is 1440 minutes (24 hours)')
    .optional(),
  maxNotificationsPerDay: z
    .number()
    .int()
    .min(1, 'Must be at least 1')
    .max(50, 'Maximum 50 notifications per day')
    .optional(),
});

// POST /api/notifications/register - Register push token
router.post(
  '/register',
  requireUser,
  validate({ body: registerPushTokenSchema }),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const { pushToken } = req.validated!.body as z.infer<
      typeof registerPushTokenSchema
    >;

    // Validate the push token format
    if (!isValidExpoPushToken(pushToken)) {
      throw new ApiError(
        400,
        'INVALID_PUSH_TOKEN',
        'Invalid Expo push token format',
      );
    }

    // Update user's push token
    await prisma.user.update({
      where: { id: user.id },
      data: { pushToken },
    });

    res.json({
      success: true,
      message: 'Push token registered successfully',
    });
  }),
);

// Note: Sprint-based snooze is handled via POST /api/sprints/:id/abandon (E4.3)
// The legacy batch snooze endpoint has been removed in favor of sprint-level operations.

// POST /api/notifications/cards/:id/snooze - Snooze a card's notifications
router.post(
  '/cards/:id/snooze',
  requireUser,
  validate({ body: snoozeCardSchema }),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const cardId = req.params.id;
    const { duration } = req.validated!.body as z.infer<
      typeof snoozeCardSchema
    >;

    // Find the card and verify ownership
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        deck: {
          select: { userId: true },
        },
      },
    });

    if (!card) {
      throw new ApiError(404, 'CARD_NOT_FOUND', 'Card not found');
    }

    if (card.deck.userId !== user.id) {
      throw new ApiError(403, 'FORBIDDEN', 'You do not own this card');
    }

    // Calculate snooze end time
    const snoozedUntil = new Date(Date.now() + duration * 60 * 1000);

    // Update the card
    await prisma.card.update({
      where: { id: cardId },
      data: { snoozedUntil },
    });

    res.json({
      success: true,
      message: `Card snoozed for ${duration} minutes`,
      snoozedUntil: snoozedUntil.toISOString(),
    });
  }),
);

// DELETE /api/notifications/cards/:id/snooze - Unsnooze a card
router.delete(
  '/cards/:id/snooze',
  requireUser,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const cardId = req.params.id;

    // Find the card and verify ownership
    const card = await prisma.card.findUnique({
      where: { id: cardId },
      include: {
        deck: {
          select: { userId: true },
        },
      },
    });

    if (!card) {
      throw new ApiError(404, 'CARD_NOT_FOUND', 'Card not found');
    }

    if (card.deck.userId !== user.id) {
      throw new ApiError(403, 'FORBIDDEN', 'You do not own this card');
    }

    // Clear the snooze
    await prisma.card.update({
      where: { id: cardId },
      data: { snoozedUntil: null },
    });

    res.json({
      success: true,
      message: 'Card unsnooze successful',
    });
  }),
);

// PATCH /api/notifications/preferences - Update notification preferences
router.patch(
  '/preferences',
  requireUser,
  validate({ body: updatePreferencesSchema }),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const {
      notificationsEnabled,
      notificationCooldownMinutes,
      maxNotificationsPerDay,
    } = req.validated!.body as z.infer<typeof updatePreferencesSchema>;

    // Build update data (only include fields that were provided)
    const updateData: {
      notificationsEnabled?: boolean;
      notificationCooldownMinutes?: number;
      maxNotificationsPerDay?: number;
    } = {};

    if (notificationsEnabled !== undefined) {
      updateData.notificationsEnabled = notificationsEnabled;
    }
    if (notificationCooldownMinutes !== undefined) {
      updateData.notificationCooldownMinutes = notificationCooldownMinutes;
    }
    if (maxNotificationsPerDay !== undefined) {
      updateData.maxNotificationsPerDay = maxNotificationsPerDay;
    }

    // Update user's notification preferences
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        notificationsEnabled: true,
        notificationCooldownMinutes: true,
        maxNotificationsPerDay: true,
        pushToken: true,
        lastPushSentAt: true,
        notificationsCountToday: true,
      },
    });

    res.json({
      success: true,
      message: 'Notification preferences updated',
      prefs: {
        notificationsEnabled: updatedUser.notificationsEnabled,
        notificationCooldownMinutes: updatedUser.notificationCooldownMinutes,
        maxNotificationsPerDay: updatedUser.maxNotificationsPerDay,
        hasPushToken: !!updatedUser.pushToken,
        lastPushSentAt: updatedUser.lastPushSentAt?.toISOString() ?? null,
        notificationsCountToday: updatedUser.notificationsCountToday,
      },
    });
  }),
);

// GET /api/notifications/preferences - Get notification preferences
router.get(
  '/preferences',
  requireUser,
  asyncHandler(async (req, res) => {
    const user = req.user!;

    // Fetch full user data for preferences
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        notificationsEnabled: true,
        notificationCooldownMinutes: true,
        maxNotificationsPerDay: true,
        pushToken: true,
        lastPushSentAt: true,
        notificationsCountToday: true,
      },
    });

    if (!userData) {
      throw new ApiError(404, 'USER_NOT_FOUND', 'User not found');
    }

    res.json({
      notificationsEnabled: userData.notificationsEnabled,
      notificationCooldownMinutes: userData.notificationCooldownMinutes,
      maxNotificationsPerDay: userData.maxNotificationsPerDay,
      hasPushToken: !!userData.pushToken,
      lastPushSentAt: userData.lastPushSentAt?.toISOString() ?? null,
      notificationsCountToday: userData.notificationsCountToday,
    });
  }),
);

// =============================================================================
// Dev/Test Endpoints (non-production only)
// =============================================================================

/**
 * POST /api/notifications/dev/test-sprint
 *
 * Creates a PENDING push sprint and returns the notification payload
 * so the client can schedule a local notification for testing.
 *
 * Only available in non-production environments.
 *
 * Response:
 * - sprintId: string
 * - cardCount: number
 * - notification: { title, body, categoryId, data }
 */
router.post(
  '/dev/test-sprint',
  requireUser,
  asyncHandler(async (req, res) => {
    // Guard: only allow in non-production environments
    if (process.env.NODE_ENV === 'production') {
      throw new ApiError(
        404,
        'NOT_FOUND',
        'This endpoint is not available in production',
      );
    }

    const user = req.user!;

    try {
      // Create a PENDING push sprint (same as real push flow)
      const { sprint, cardCount } = await createPendingPushSprint({
        userId: user.id,
        sprintSize: user.sprintSize,
      });

      // Build a minimal UserNotificationGroup for payload preparation
      const group: UserNotificationGroup = {
        userId: user.id,
        clerkId: user.clerkId,
        pushToken: user.pushToken ?? '',
        decks: [],
        totalCards: cardCount,
        sprintId: sprint.id,
      };

      // Prepare the notification payload (same as real push flow)
      const payload = prepareNotificationPayload(group, cardCount);

      res.status(201).json({
        sprintId: sprint.id,
        cardCount,
        notification: {
          title: payload.title,
          body: payload.body,
          categoryId: payload.categoryId,
          data: payload.data,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'NO_ELIGIBLE_CARDS') {
        throw new ApiError(
          404,
          'NO_ELIGIBLE_CARDS',
          'No cards are due for review. Create some cards first.',
        );
      }
      throw error;
    }
  }),
);

export default router;
