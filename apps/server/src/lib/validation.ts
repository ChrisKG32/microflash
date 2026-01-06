import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
import { ValidationError, type ErrorDetail } from './errors.js';

/**
 * Validation schemas for API request bodies.
 */

// Card schemas
export const createCardSchema = z.object({
  front: z
    .string()
    .min(1, 'Front content is required')
    .max(10000, 'Front content exceeds maximum length'),
  back: z
    .string()
    .min(1, 'Back content is required')
    .max(10000, 'Back content exceeds maximum length'),
  deckId: z.string().min(1, 'Deck ID is required'),
});

export const updateCardSchema = z.object({
  front: z
    .string()
    .min(1, 'Front content cannot be empty')
    .max(10000, 'Front content exceeds maximum length')
    .optional(),
  back: z
    .string()
    .min(1, 'Back content cannot be empty')
    .max(10000, 'Back content exceeds maximum length')
    .optional(),
});

// Deck schemas
export const createDeckSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title exceeds maximum length'),
  description: z
    .string()
    .max(1000, 'Description exceeds maximum length')
    .optional(),
  parentDeckId: z.string().optional(),
});

export const updateDeckSchema = z.object({
  title: z
    .string()
    .min(1, 'Title cannot be empty')
    .max(255, 'Title exceeds maximum length')
    .optional(),
  description: z
    .string()
    .max(1000, 'Description exceeds maximum length')
    .optional(),
});

// Review schemas
export const submitReviewSchema = z.object({
  cardId: z.string().min(1, 'Card ID is required'),
  rating: z.enum(['AGAIN', 'HARD', 'GOOD', 'EASY'], {
    message: 'Rating must be one of: AGAIN, HARD, GOOD, EASY',
  }),
});

// Notification schemas
export const registerPushTokenSchema = z.object({
  pushToken: z.string().min(1, 'Push token is required'),
});

export const updateNotificationSettingsSchema = z.object({
  notificationsEnabled: z.boolean(),
});

/**
 * Type exports for use in route handlers
 */
export type CreateCardInput = z.infer<typeof createCardSchema>;
export type UpdateCardInput = z.infer<typeof updateCardSchema>;
export type CreateDeckInput = z.infer<typeof createDeckSchema>;
export type UpdateDeckInput = z.infer<typeof updateDeckSchema>;
export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;
export type RegisterPushTokenInput = z.infer<typeof registerPushTokenSchema>;
export type UpdateNotificationSettingsInput = z.infer<
  typeof updateNotificationSettingsSchema
>;

/**
 * Helper to extract issues from Zod error in v4 format
 */
function extractIssues(error: z.core.$ZodError): ErrorDetail[] {
  return error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
}

/**
 * Middleware factory that validates request body against a Zod schema.
 * Returns 400 with detailed error messages if validation fails.
 */
export function validateBody<T extends z.ZodType>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const details = extractIssues(result.error);
      throw new ValidationError('Invalid request data', details);
    }

    // Replace body with parsed/validated data (includes defaults, transformations)
    req.body = result.data;
    next();
  };
}

/**
 * Validates query parameters against a Zod schema.
 */
export function validateQuery<T extends z.ZodType>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const details = extractIssues(result.error);
      throw new ValidationError('Invalid query parameters', details);
    }

    // Type assertion needed for Express compatibility
    req.query = result.data as typeof req.query;
    next();
  };
}

/**
 * Validates URL parameters against a Zod schema.
 */
export function validateParams<T extends z.ZodType>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      const details = extractIssues(result.error);
      throw new ValidationError('Invalid URL parameters', details);
    }

    // Type assertion needed for Express compatibility
    req.params = result.data as typeof req.params;
    next();
  };
}
