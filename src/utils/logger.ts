export const logError = (error: Error | string, context?: unknown) => {
  if (import.meta.env.DEV) {
    console.error('[Error]', error, context);
  } else {
    // Integration point for error tracking services (Sentry, LogRocket, etc.)
    // Sentry.captureException(error);
  }
};

export const logWarn = (message: string, context?: unknown) => {
  if (import.meta.env.DEV) {
    console.warn('[Warn]', message, context);
  }
};

export const logInfo = (message: string, context?: unknown) => {
  if (import.meta.env.DEV) {
    console.log('[Info]', message, context);
  }
};

export const logDebug = (message: string, context?: unknown) => {
  if (import.meta.env.DEV) {
    console.debug('[Debug]', message, context);
  }
};

export const logger = {
  error: logError,
  warn: logWarn,
  info: logInfo,
  debug: logDebug,
};
