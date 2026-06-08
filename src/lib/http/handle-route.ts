import { ZodError } from "zod";
import { AppError } from "./errors";
import { logger } from "./logger";

/**
 * Wraps a route handler so that thrown errors are mapped to consistent HTTP
 * responses:
 *   - ZodError / ValidationError -> 400 { error: "validation", issues }
 *   - NotFoundError              -> 404 { error: "not_found" }
 *   - AppError                   -> its status/code
 *   - anything else              -> 500 { error: "internal" } (logged)
 *
 * Handlers contain no error-mapping logic of their own.
 */
export function handleRoute<Args extends unknown[]>(
  operation: string,
  fn: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof ZodError) {
        return Response.json(
          { error: "validation", issues: err.issues },
          { status: 400 },
        );
      }
      if (err instanceof AppError) {
        return Response.json(
          { error: err.code, message: err.message, details: err.details ?? undefined },
          { status: err.status },
        );
      }
      logger.error(operation, err);
      return Response.json({ error: "internal" }, { status: 500 });
    }
  };
}
