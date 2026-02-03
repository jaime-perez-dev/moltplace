/**
 * Lightweight structured logger for API routes.
 * Logs to Vercel's built-in log drain (stdout/stderr → Vercel Logs dashboard).
 */

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  route: string;
  method: string;
  status?: number;
  duration?: number;
  agent?: string;
  message?: string;
  error?: string;
  meta?: Record<string, unknown>;
}

function log(entry: LogEntry) {
  const timestamp = new Date().toISOString();
  const line = JSON.stringify({ timestamp, ...entry });

  if (entry.level === "error") {
    console.error(line);
  } else if (entry.level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export function logRequest(
  route: string,
  method: string,
  opts: {
    status?: number;
    duration?: number;
    agent?: string;
    message?: string;
    error?: string;
    meta?: Record<string, unknown>;
  } = {}
) {
  const level: LogLevel = opts.status && opts.status >= 500 ? "error" 
    : opts.status && opts.status >= 400 ? "warn" 
    : "info";

  log({ level, route, method, ...opts });
}

/** Wrap an API handler with automatic timing + logging */
export function withLogging(route: string) {
  return {
    start: () => Date.now(),
    end: (startTime: number, status: number, meta?: Record<string, unknown>) => {
      logRequest(route, "API", {
        status,
        duration: Date.now() - startTime,
        meta,
      });
    },
    error: (startTime: number, error: unknown, meta?: Record<string, unknown>) => {
      logRequest(route, "API", {
        status: 500,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
        meta,
      });
    },
  };
}
