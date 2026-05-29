/**
 * Structured Logger
 *
 * Production-ready logging with:
 * - Structured JSON output (for log aggregation services)
 * - Log levels (debug, info, warn, error)
 * - Context enrichment (request ID, business ID, etc.)
 * - Sensitive data redaction
 *
 * In production, these logs are captured by Vercel's log drain
 * and can be forwarded to: Datadog, Logtail, Axiom, etc.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  requestId?: string;
  businessId?: string;
  userId?: string;
  action?: string;
  duration?: number;
  [key: string]: unknown;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Only show logs at or above this level
const MIN_LEVEL: LogLevel = process.env.NODE_ENV === "production" ? "info" : "debug";

class Logger {
  private context: LogContext;

  constructor(context: LogContext = {}) {
    this.context = context;
  }

  /**
   * Create a child logger with additional context.
   */
  child(context: LogContext): Logger {
    return new Logger({ ...this.context, ...context });
  }

  debug(message: string, data?: Record<string, unknown>) {
    this.log("debug", message, data);
  }

  info(message: string, data?: Record<string, unknown>) {
    this.log("info", message, data);
  }

  warn(message: string, data?: Record<string, unknown>) {
    this.log("warn", message, data);
  }

  error(message: string, error?: unknown, data?: Record<string, unknown>) {
    const errorData: Record<string, unknown> = { ...data };

    if (error instanceof Error) {
      errorData.error_name = error.name;
      errorData.error_message = error.message;
      errorData.error_stack = error.stack?.split("\n").slice(0, 5).join("\n");
    } else if (error) {
      errorData.error_raw = String(error);
    }

    this.log("error", message, errorData);
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>) {
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[MIN_LEVEL]) return;

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...this.redactSensitive(data || {}),
    };

    // In production: structured JSON for log aggregation
    // In development: readable format
    if (process.env.NODE_ENV === "production") {
      const output = JSON.stringify(entry);
      if (level === "error") {
        console.error(output);
      } else if (level === "warn") {
        console.warn(output);
      } else {
        console.log(output);
      }
    } else {
      const prefix = `[${level.toUpperCase()}]`;
      const ctx = this.context.action ? `[${this.context.action}]` : "";
      if (level === "error") {
        console.error(`${prefix}${ctx} ${message}`, data || "");
      } else if (level === "warn") {
        console.warn(`${prefix}${ctx} ${message}`, data || "");
      } else {
        console.log(`${prefix}${ctx} ${message}`, data || "");
      }
    }
  }

  /**
   * Redact sensitive fields from log data.
   */
  private redactSensitive(data: Record<string, unknown>): Record<string, unknown> {
    const sensitiveKeys = [
      "password",
      "access_token",
      "secret",
      "api_key",
      "authorization",
      "cookie",
      "token",
    ];

    const redacted: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
        redacted[key] = "[REDACTED]";
      } else if (typeof value === "object" && value !== null) {
        redacted[key] = this.redactSensitive(value as Record<string, unknown>);
      } else {
        redacted[key] = value;
      }
    }

    return redacted;
  }
}

// Default logger instance
export const logger = new Logger();

// Create request-scoped logger
export function createRequestLogger(requestId: string, action?: string): Logger {
  return new Logger({ requestId, action });
}
