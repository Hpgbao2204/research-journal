/**
 * Minimal logger abstraction. Records an operation name and a sanitized context
 * object. It never logs secrets or environment values. In the MVP it writes to
 * the server console; the interface allows swapping for a structured logger.
 */

type LogContext = Record<string, unknown>;

const SECRET_KEY_PATTERN = /(key|token|secret|password|authorization|url)/i;

function sanitize(context: LogContext | undefined): LogContext {
  if (!context) return {};
  const out: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    out[key] = SECRET_KEY_PATTERN.test(key) ? "[redacted]" : value;
  }
  return out;
}

export const logger = {
  error(operation: string, error: unknown, context?: LogContext): void {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[error] ${operation}: ${message}`, sanitize(context));
  },
  warn(operation: string, context?: LogContext): void {
    console.warn(`[warn] ${operation}`, sanitize(context));
  },
  info(operation: string, context?: LogContext): void {
    console.info(`[info] ${operation}`, sanitize(context));
  },
};
