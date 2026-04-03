import { toErrorMessage } from './errors';

type RetryOptions = {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  label?: string;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (args: { error: unknown; attempt: number; maxAttempts: number }) => void;
};

type FetchInit = Record<string, unknown> & {
  signal?: unknown;
};

const RETRYABLE_HTTP_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

const getErrorStatus = (error: unknown): number | undefined => {
  if (!error || typeof error !== 'object') return undefined;
  const candidate = error as Record<string, unknown>;
  if (typeof candidate.status === 'number') return candidate.status;
  if (
    candidate.response &&
    typeof candidate.response === 'object' &&
    typeof (candidate.response as Record<string, unknown>).status === 'number'
  ) {
    return (candidate.response as Record<string, unknown>).status as number;
  }
  return undefined;
};

export const isRetryableHttpStatus = (status?: number): boolean => {
  if (!status) return false;
  return RETRYABLE_HTTP_STATUS.has(status);
};

export const isLikelyTransientError = (error: unknown): boolean => {
  const status = getErrorStatus(error);
  if (isRetryableHttpStatus(status)) return true;

  const message = toErrorMessage(error).toLowerCase();
  return (
    message.includes('timed out') ||
    message.includes('timeout') ||
    message.includes('abort') ||
    message.includes('rate limit') ||
    message.includes('temporar') ||
    message.includes('econnreset') ||
    message.includes('enotfound') ||
    message.includes('socket hang up')
  );
};

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getBackoffDelay = (attempt: number, baseDelayMs: number, maxDelayMs: number) => {
  const exp = Math.min(maxDelayMs, baseDelayMs * 2 ** Math.max(0, attempt - 1));
  const jitter = Math.floor(Math.random() * Math.max(50, Math.floor(exp * 0.25)));
  return exp + jitter;
};

export async function retryAsync<T>(
  operation: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const retries = Math.max(0, options?.retries ?? 2);
  const baseDelayMs = Math.max(100, options?.baseDelayMs ?? 350);
  const maxDelayMs = Math.max(baseDelayMs, options?.maxDelayMs ?? 3000);
  const shouldRetry = options?.shouldRetry ?? ((error: unknown) => isLikelyTransientError(error));

  let lastError: unknown;
  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt > retries || !shouldRetry(error, attempt)) {
        throw error;
      }

      if (options?.label) {
        console.warn(
          `[AI][Retry] ${options.label} failed (attempt ${attempt}/${retries + 1}): ${toErrorMessage(error)}`
        );
      }
      options?.onRetry?.({ error, attempt, maxAttempts: retries + 1 });
      await wait(getBackoffDelay(attempt, baseDelayMs, maxDelayMs));
    }
  }

  throw lastError;
}

export async function fetchWithTimeout(
  input: string | URL | Request,
  init: FetchInit = {},
  timeoutMs: number = 15000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const requestInit = {
      ...(init as object),
      signal: (init.signal as AbortSignal | undefined) ?? controller.signal,
    };
    return await fetch(input, requestInit as Parameters<typeof fetch>[1]);
  } finally {
    clearTimeout(timer);
  }
}

export function parseJsonObjectFromModelContent(content: string): Record<string, unknown> | null {
  if (!content || typeof content !== 'string') return null;

  const tryParse = (value: string) => {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
      return parsed as Record<string, unknown>;
    } catch {
      return null;
    }
  };

  const direct = tryParse(content);
  if (direct) return direct;

  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return tryParse(content.slice(start, end + 1));
  }

  return null;
}
