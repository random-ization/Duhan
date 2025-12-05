import { ToastType } from '../components/common/Toast';

export interface ErrorHandlerOptions {
  showToast?: boolean;
  toastCallback?: (type: ToastType, message: string) => void;
  retry?: () => Promise<void>;
  retryCount?: number;
  customMessage?: string;
  logError?: boolean;
}

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'AppError';
  }
}

const getErrorMessage = (error: unknown, customMessage?: string): string => {
  if (customMessage) return customMessage;

  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred';
};

export const handleError = async (
  error: unknown,
  options: ErrorHandlerOptions = {}
): Promise<void> => {
  const {
    showToast = true,
    toastCallback,
    retry,
    retryCount = 0,
    customMessage,
    logError = true,
  } = options;

  const message = getErrorMessage(error, customMessage);

  // Log error if needed
  if (logError) {
    console.error('[ErrorHandler]', error);
  }

  // Attempt retry if provided
  if (retry && retryCount > 0) {
    try {
      // Exponential backoff: 1s, 2s, 4s for retries
      const delay = Math.pow(2, 3 - retryCount) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      await retry();
      return;
    } catch (retryError) {
      if (retryCount > 1) {
        return handleError(retryError, { ...options, retryCount: retryCount - 1 });
      }
    }
  }

  // Show toast notification
  if (showToast && toastCallback) {
    toastCallback('error', message);
  }
};

export const handleApiError = (error: unknown, customMessage?: string): string => {
  if (error instanceof Response) {
    switch (error.status) {
      case 401:
        return 'Authentication required. Please log in.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return customMessage || 'An error occurred while processing your request.';
    }
  }

  return getErrorMessage(error, customMessage);
};

export const withErrorHandling = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: ErrorHandlerOptions
): T => {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      await handleError(error, options);
      throw error;
    }
  }) as T;
};
