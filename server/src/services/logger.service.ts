import { captureServerException } from './telemetry.service';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  requestId?: string;
  userId?: string;
  route?: string;
  latencyMs?: number;
  statusCode?: number;
  method?: string;
  feature?: string;
  [key: string]: unknown;
}

const write = (level: LogLevel, message: string, context?: LogContext): void => {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...context,
  };

  const serialized = JSON.stringify(payload);

  if (level === 'error') {
    console.error(serialized);
    return;
  }

  if (level === 'warn') {
    console.warn(serialized);
    return;
  }

  console.log(serialized);
};

export const logger = {
  debug: (message: string, context?: LogContext) => write('debug', message, context),
  info: (message: string, context?: LogContext) => write('info', message, context),
  warn: (message: string, context?: LogContext) => write('warn', message, context),
  error: (message: string, error?: unknown, context?: LogContext) => {
    const errorMessage = error instanceof Error ? error.message : undefined;
    const stack = error instanceof Error ? error.stack : undefined;
    write('error', message, {
      ...context,
      errorMessage,
      stack,
    });
    if (error) {
      captureServerException(error, context);
    }
  },
};