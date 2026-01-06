import { z } from 'zod';

/**
 * Validation schemas for API request bodies.
 * These schemas are used with Zod for runtime validation.
 *
 * All schemas use .strict() to reject unknown fields.
 *
 * Note: Zod 4 uses { error: "message" } instead of { required_error, message }
 */

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
  })
  .strict();

export type CreateCardInput = z.infer<typeof createCardSchema>;

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
  })
  .strict();

export type CreateDeckInput = z.infer<typeof createDeckSchema>;

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
