export const logError = (error: Error | string, context?: unknown) => {
    if (import.meta.env.DEV) {
        console.error('[Error]', error, context);
    } else {
        // Integration point for error tracking services (Sentry, LogRocket, etc.)
        // Sentry.captureException(error);
    }
};

export const logInfo = (message: string, context?: unknown) => {
    if (import.meta.env.DEV) {
        console.log('[Info]', message, context);
    }
};

export const logger = {
    error: logError,
    info: logInfo,
};
