import { Router, type Router as RouterType } from 'express';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/middlewares/auth';
import { validate } from '@/middlewares/validate';
import { asyncHandler, ApiError } from '@/middlewares/error-handler';
import { isValidExpoPushToken } from '@/services/push-notifications';

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
  notificationsEnabled: z.boolean(),
});

const batchSnoozeSchema = z.object({
  cardIds: z
    .array(z.string().min(1))
    .min(1, 'At least one card ID is required')
    .max(10, 'Maximum 10 card IDs allowed'),
  durationMinutes: z
    .number()
    .int()
    .min(1)
    .max(1440)
    .default(60)
    .describe('Snooze duration in minutes (default: 60)'),
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

// POST /api/notifications/snooze - Batch snooze multiple cards (used by notification actions)
router.post(
  '/snooze',
  requireUser,
  validate({ body: batchSnoozeSchema }),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const { cardIds, durationMinutes } = req.validated!.body as z.infer<
      typeof batchSnoozeSchema
    >;

    // Find all cards and verify ownership (via deck)
    const cards = await prisma.card.findMany({
      where: {
        id: { in: cardIds },
        deck: {
          userId: user.id,
        },
      },
      select: { id: true },
    });

    const ownedCardIds = cards.map((c) => c.id);
    const notFoundIds = cardIds.filter((id) => !ownedCardIds.includes(id));

    if (ownedCardIds.length === 0) {
      throw new ApiError(
        404,
        'CARDS_NOT_FOUND',
        'No cards found or you do not own them',
      );
    }

    // Calculate snooze end time
    const snoozedUntil = new Date(Date.now() + durationMinutes * 60 * 1000);

    // Batch update all owned cards
    const result = await prisma.card.updateMany({
      where: {
        id: { in: ownedCardIds },
      },
      data: { snoozedUntil },
    });

    res.json({
      success: true,
      message: `${result.count} card(s) snoozed for ${durationMinutes} minutes`,
      snoozedCount: result.count,
      snoozedUntil: snoozedUntil.toISOString(),
      notFoundIds: notFoundIds.length > 0 ? notFoundIds : undefined,
    });
  }),
);

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
    const { notificationsEnabled } = req.validated!.body as z.infer<
      typeof updatePreferencesSchema
    >;

    // Update user's notification preferences
    await prisma.user.update({
      where: { id: user.id },
      data: { notificationsEnabled },
    });

    res.json({
      success: true,
      message: `Notifications ${notificationsEnabled ? 'enabled' : 'disabled'}`,
      notificationsEnabled,
    });
  }),
);

// GET /api/notifications/preferences - Get notification preferences
router.get(
  '/preferences',
  requireUser,
  asyncHandler(async (req, res) => {
    const user = req.user!;

    res.json({
      notificationsEnabled: user.notificationsEnabled,
      hasPushToken: !!user.pushToken,
    });
  }),
);

export default router;
