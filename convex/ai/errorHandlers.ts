/**
 * AI error handling utilities.
 *
 * Pure functions extracted from convex/ai.ts — no Convex runtime dependencies.
 */

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  )
    return error.message;
  return 'Unknown error';
}

export function resolveErrorHttpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  if ('status' in error && typeof error.status === 'number') return error.status;
  if ('response' in error && error.response && typeof error.response === 'object') {
    const response = error.response as { status?: number };
    if (typeof response.status === 'number') return response.status;
  }
  if ('statusCode' in error && typeof error.statusCode === 'number') return error.statusCode;
  return undefined;
}

export function resolveErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object') return 'UNKNOWN_ERROR';
  if ('code' in error && typeof error.code === 'string') return error.code;
  if ('message' in error && typeof error.message === 'string') {
    const message = error.message;
    if (message.includes('rate_limit')) return 'RATE_LIMIT';
    if (message.includes('insufficient_quota')) return 'INSUFFICIENT_QUOTA';
    if (message.includes('invalid_api_key')) return 'INVALID_API_KEY';
    if (message.includes('model_not_found')) return 'MODEL_NOT_FOUND';
  }
  return 'UNKNOWN_ERROR';
}

export function resolveReadableAiErrorCode(error: unknown): string {
  const code = resolveErrorCode(error);
  const status = resolveErrorHttpStatus(error);

  switch (code) {
    case 'rate_limit_exceeded':
      return 'AI_RATE_LIMIT';
    case 'insufficient_quota':
      return 'AI_QUOTA_EXCEEDED';
    case 'invalid_api_key':
      return 'AI_API_KEY_INVALID';
    case 'model_not_found':
      return 'AI_MODEL_NOT_FOUND';
    default:
      if (status === 429) return 'AI_RATE_LIMIT';
      if (status === 401) return 'AI_API_KEY_INVALID';
      if (status === 403) return 'AI_FORBIDDEN';
      if (status === 404) return 'AI_NOT_FOUND';
      if (status && status >= 500) return 'AI_SERVICE_ERROR';
      return 'AI_UNKNOWN_ERROR';
  }
}
