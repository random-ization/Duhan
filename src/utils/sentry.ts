let initialized = false;
let sentryModule: typeof import('@sentry/react') | null = null;
let sentryModulePromise: Promise<typeof import('@sentry/react') | null> | null = null;

async function loadSentryModule() {
  if (sentryModule) return sentryModule;
  if (sentryModulePromise) return sentryModulePromise;

  sentryModulePromise = import('@sentry/react')
    .then(module => {
      sentryModule = module;
      return module;
    })
    .catch(() => null);

  return sentryModulePromise;
}

export async function initSentry() {
  if (initialized) return;
  if (!import.meta.env.PROD) return;

  const dsn = import.meta.env.VITE_SENTRY_DSN?.trim();
  if (!dsn) return;

  const Sentry = await loadSentryModule();
  if (!Sentry) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_I18N_VERSION,
    tracesSampleRate: 0.1,
  });

  initialized = true;
}

export async function captureException(error: unknown, context?: Record<string, unknown>) {
  if (!initialized) {
    await initSentry();
  }
  if (!initialized) return;

  const Sentry = await loadSentryModule();
  if (!Sentry) return;

  if (error instanceof Error) {
    Sentry.captureException(error, { extra: context });
    return;
  }
  Sentry.captureException(new Error(String(error)), { extra: context });
}

export async function captureMessage(
  message: string,
  level: 'warning' | 'error' | 'info' = 'info',
  context?: Record<string, unknown>
) {
  if (!initialized) {
    await initSentry();
  }
  if (!initialized) return;

  const Sentry = await loadSentryModule();
  if (!Sentry) return;

  Sentry.captureMessage(message, { level, extra: context });
}
