import * as Sentry from '@sentry/node';

let initialized = false;

const getServerSentryDsn = (): string | null => process.env.SENTRY_DSN_API?.trim() || process.env.SENTRY_DSN?.trim() || null;

export const initServerTelemetry = (): void => {
  if (initialized) return;

  const dsn = getServerSentryDsn();
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: process.env.APP_ENV || process.env.NODE_ENV || 'development',
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || '0'),
  });

  initialized = true;
};

export const captureServerException = (error: unknown, extra?: Record<string, unknown>): void => {
  if (!initialized) return;
  Sentry.captureException(error, {
    extra,
  });
};