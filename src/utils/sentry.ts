import * as Sentry from '@sentry/react';

let initialized = false;

export function initSentry() {
  if (initialized) return;
  if (!import.meta.env.PROD) return;

  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_I18N_VERSION,
    tracesSampleRate: 0.1,
  });

  initialized = true;
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  if (!initialized) return;
  if (error instanceof Error) {
    Sentry.captureException(error, { extra: context });
    return;
  }
  Sentry.captureException(new Error(String(error)), { extra: context });
}

export function captureMessage(
  message: string,
  level: 'warning' | 'error' | 'info' = 'info',
  context?: Record<string, unknown>
) {
  if (!initialized) return;
  Sentry.captureMessage(message, { level, extra: context });
}
