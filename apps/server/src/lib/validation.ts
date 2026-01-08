import { z } from 'zod';

/**
 * Validation schemas for API request bodies.
 * These schemas are used with Zod for runtime validation.
 *
 * All schemas use .strict() to reject unknown fields.
 *
 * Note: Zod 4 uses { error: "message" } instead of { required_error, message }
 */

// Priority validation (numeric 0-100)
export const prioritySchema = z
  .number({ error: 'Priority must be a number' })
  .int({ error: 'Priority must be an integer' })
  .min(0, { error: 'Priority must be at least 0' })
  .max(100, { error: 'Priority must be at most 100' });

export type Priority = z.infer<typeof prioritySchema>;

// Card validation schemas
export const createCardSchema = z
  .object({
    front: z
      .string({ error: 'Front is required' })
      .min(1, { error: 'Front cannot be empty' })
      .max(10000, { error: 'Front is too long (max 10000 characters)' }),
    back: z
      .string({ error: 'Back is required' })
      .min(1, { error: 'Back cannot be empty' })
      .max(10000, { error: 'Back is too long (max 10000 characters)' }),
    deckId: z
      .string({ error: 'Deck ID is required' })
      .min(1, { error: 'Deck ID is required' }),
    priority: prioritySchema.optional(),
  })
  .strict();

export type CreateCardInput = z.infer<typeof createCardSchema>;

// Update card validation schema
export const updateCardSchema = z
  .object({
    front: z
      .string()
      .min(1, { error: 'Front cannot be empty' })
      .max(10000, { error: 'Front is too long (max 10000 characters)' })
      .optional(),
    back: z
      .string()
      .min(1, { error: 'Back cannot be empty' })
      .max(10000, { error: 'Back is too long (max 10000 characters)' })
      .optional(),
    deckId: z.string().min(1, { error: 'Deck ID cannot be empty' }).optional(),
    priority: prioritySchema.optional(),
  })
  .strict();

export type UpdateCardInput = z.infer<typeof updateCardSchema>;

// Deck validation schemas
export const createDeckSchema = z
  .object({
    title: z
      .string({ error: 'Title is required' })
      .min(1, { error: 'Title cannot be empty' })
      .max(255, { error: 'Title is too long (max 255 characters)' }),
    description: z
      .string()
      .max(1000, { error: 'Description is too long (max 1000 characters)' })
      .optional(),
    parentDeckId: z.string().optional(),
    priority: prioritySchema.optional(),
  })
  .strict();

export type CreateDeckInput = z.infer<typeof createDeckSchema>;

// Update deck validation schema
export const updateDeckSchema = z
  .object({
    title: z
      .string()
      .min(1, { error: 'Title cannot be empty' })
      .max(255, { error: 'Title is too long (max 255 characters)' })
      .optional(),
    description: z
      .string()
      .max(1000, { error: 'Description is too long (max 1000 characters)' })
      .nullable()
      .optional(),
    parentDeckId: z.string().nullable().optional(),
    priority: prioritySchema.optional(),
  })
  .strict();

export type UpdateDeckInput = z.infer<typeof updateDeckSchema>;

// Review validation schemas
export const createReviewSchema = z
  .object({
    cardId: z
      .string({ error: 'Card ID is required' })
      .min(1, { error: 'Card ID is required' }),
    rating: z.enum(['AGAIN', 'HARD', 'GOOD', 'EASY'], {
      error: 'Rating must be one of: AGAIN, HARD, GOOD, EASY',
    }),
  })
  .strict();

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

// Tag validation schemas
export const createTagSchema = z
  .object({
    name: z
      .string({ error: 'Tag name is required' })
      .min(1, { error: 'Tag name cannot be empty' })
      .max(100, { error: 'Tag name is too long (max 100 characters)' }),
  })
  .strict();

export type CreateTagInput = z.infer<typeof createTagSchema>;

export const addTagToCardSchema = z
  .object({
    tagId: z
      .string({ error: 'Tag ID is required' })
      .min(1, { error: 'Tag ID is required' }),
  })
  .strict();

export type AddTagToCardInput = z.infer<typeof addTagToCardSchema>;

// Notification preferences validation schema
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const updateNotificationPreferencesSchema = z
  .object({
    notificationsEnabled: z.boolean().optional(),
    quietHoursStart: z
      .string()
      .regex(timeRegex, { message: 'Must be in HH:MM format' })
      .nullable()
      .optional(),
    quietHoursEnd: z
      .string()
      .regex(timeRegex, { message: 'Must be in HH:MM format' })
      .nullable()
      .optional(),
    maxNotificationsPerDay: z
      .number()
      .int()
      .min(1, { error: 'Must be at least 1' })
      .max(50, { error: 'Maximum 50 notifications per day' })
      .optional(),
    notificationCooldownMinutes: z
      .number()
      .int()
      .min(120, { error: 'Cooldown must be at least 120 minutes (2 hours)' })
      .max(1440, { error: 'Maximum cooldown is 1440 minutes (24 hours)' })
      .optional(),
    backlogThreshold: z
      .number()
      .int()
      .min(1, { error: 'Must be at least 1' })
      .max(100, { error: 'Maximum 100 cards' })
      .optional(),
    timezone: z
      .string()
      .min(1, { error: 'Timezone cannot be empty' })
      .max(50, { error: 'Timezone is too long' })
      .optional(),
    sprintSize: z
      .number()
      .int()
      .min(3, { error: 'Sprint size must be at least 3' })
      .max(10, { error: 'Sprint size cannot exceed 10' })
      .optional(),
  })
  .strict();

export type UpdateNotificationPreferencesInput = z.infer<
  typeof updateNotificationPreferencesSchema
>;

// Sprint validation schemas
export const sprintStatusEnum = z.enum(
  ['PENDING', 'ACTIVE', 'COMPLETED', 'ABANDONED'],
  {
    error: 'Status must be one of: PENDING, ACTIVE, COMPLETED, ABANDONED',
  },
);

export const sprintSourceEnum = z.enum(['HOME', 'DECK', 'PUSH'], {
  error: 'Source must be one of: HOME, DECK, PUSH',
});

export const cardResultEnum = z.enum(['PASS', 'FAIL', 'SKIP'], {
  error: 'Result must be one of: PASS, FAIL, SKIP',
});

export const createSprintSchema = z
  .object({
    deckId: z.string().optional(), // Optional: constrain sprint to a specific deck
    source: sprintSourceEnum.optional().default('HOME'), // Where the sprint was started from
  })
  .strict();

export type CreateSprintInput = z.infer<typeof createSprintSchema>;

export const updateSprintStatusSchema = z
  .object({
    status: sprintStatusEnum,
  })
  .strict();

export type UpdateSprintStatusInput = z.infer<typeof updateSprintStatusSchema>;

export const recordSprintCardResultSchema = z
  .object({
    result: cardResultEnum,
  })
  .strict();

export type RecordSprintCardResultInput = z.infer<
  typeof recordSprintCardResultSchema
>;

// Sprint review validation schema (for POST /api/sprints/:id/review)
export const ratingEnum = z.enum(['AGAIN', 'HARD', 'GOOD', 'EASY'], {
  error: 'Rating must be one of: AGAIN, HARD, GOOD, EASY',
});

export const submitSprintReviewSchema = z
  .object({
    cardId: z
      .string({ error: 'Card ID is required' })
      .min(1, { error: 'Card ID is required' }),
    rating: ratingEnum,
  })
  .strict();

export type SubmitSprintReviewInput = z.infer<typeof submitSprintReviewSchema>;

// User onboarding validation schema
export const updateOnboardingSchema = z
  .object({
    onboardingComplete: z.boolean().optional(),
    notificationsPromptedAt: z.string().datetime().nullable().optional(),
  })
  .strict();

export type UpdateOnboardingInput = z.infer<typeof updateOnboardingSchema>;
