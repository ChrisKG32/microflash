import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { ZodSchema } from 'zod';

/**
 * Configuration for the validate middleware.
 * Specify which parts of the request to validate.
 */
export interface ValidateConfig {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

/**
 * Middleware factory that validates request data against Zod schemas.
 *
 * On success: attaches validated data to `req.validated.{body, query, params}`
 * On failure: calls `next(zodError)` to let the global error handler format the 400 response
 *
 * Usage:
 *   router.post('/', validate({ body: createCardSchema }), asyncHandler(handler));
 *   router.get('/:id', validate({ params: idParamSchema }), asyncHandler(handler));
 *   router.get('/', validate({ query: listQuerySchema }), asyncHandler(handler));
 *
 * @param config - Object specifying schemas for body, query, and/or params
 * @returns Express middleware that validates and attaches parsed data
 */
export function validate(config: ValidateConfig): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      // Initialize validated object if not present
      req.validated = req.validated || {};

      // Validate body if schema provided
      if (config.body) {
        req.validated.body = await config.body.parseAsync(req.body);
      }

      // Validate query if schema provided
      if (config.query) {
        req.validated.query = await config.query.parseAsync(req.query);
      }

      // Validate params if schema provided
      if (config.params) {
        req.validated.params = await config.params.parseAsync(req.params);
      }

      next();
    } catch (error) {
      // Pass Zod errors to global error handler
      next(error);
    }
  };
}
