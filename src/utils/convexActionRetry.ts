type ConvexActionFn<TArgs, TResult> = (args: TArgs) => Promise<TResult>;

type RetryOptions = {
  retries?: number;
  initialDelayMs?: number;
  factor?: number;
};

const DEFAULT_RETRIES = 2;
const DEFAULT_INITIAL_DELAY_MS = 300;
const DEFAULT_FACTOR = 2;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const isRetryableConvexNetworkError = (error: unknown): boolean => {
  const message = String(
    (error as { message?: string } | null)?.message || error || ''
  ).toLowerCase();
  return (
    message.includes('connection lost while action was in flight') ||
    message.includes('the network connection was lost') ||
    message.includes('websocket') ||
    message.includes('networkerror')
  );
};

export async function runConvexActionWithRetry<TArgs, TResult>(
  action: ConvexActionFn<TArgs, TResult>,
  args: TArgs,
  options: RetryOptions = {}
): Promise<TResult> {
  const retries = options.retries ?? DEFAULT_RETRIES;
  const factor = options.factor ?? DEFAULT_FACTOR;
  let delayMs = options.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS;

  let attempt = 0;
  let lastError: unknown;

  while (attempt <= retries) {
    try {
      return await action(args);
    } catch (error: unknown) {
      lastError = error;
      if (!isRetryableConvexNetworkError(error) || attempt === retries) {
        throw error;
      }
      await sleep(delayMs);
      delayMs = Math.round(delayMs * factor);
      attempt += 1;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError || 'Unknown error'));
}
