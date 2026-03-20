'use node';

let initialized = false;

type SentryLevel = 'warning' | 'error' | 'info';

async function getSentryClient() {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return null;

  const Sentry = await import('@sentry/node');
  if (!initialized) {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV || 'development',
      release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA,
      tracesSampleRate: 0.1,
    });
    initialized = true;
  }

  return Sentry;
}

export async function captureServerException(error: unknown, context?: Record<string, unknown>) {
  const Sentry = await getSentryClient();
  if (!Sentry) return;

  const normalizedError = error instanceof Error ? error : new Error(String(error));
  Sentry.captureException(normalizedError, { extra: context });
  await Sentry.flush(2000);
}

export async function captureServerMessage(
  message: string,
  level: SentryLevel = 'warning',
  context?: Record<string, unknown>
) {
  const Sentry = await getSentryClient();
  if (!Sentry) return;

  Sentry.captureMessage(message, { level, extra: context });
  await Sentry.flush(2000);
}
