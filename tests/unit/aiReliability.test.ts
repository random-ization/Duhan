import { describe, expect, it, vi } from 'vitest';
import {
  fetchWithTimeout,
  isLikelyTransientError,
  parseJsonObjectFromModelContent,
  retryAsync,
} from '../../convex/aiReliability';

describe('parseJsonObjectFromModelContent', () => {
  it('parses plain json object', () => {
    const parsed = parseJsonObjectFromModelContent('{"ok":true,"n":1}');
    expect(parsed).toEqual({ ok: true, n: 1 });
  });

  it('parses embedded json object from model wrappers', () => {
    const parsed = parseJsonObjectFromModelContent('```json\n{"translations":["a"]}\n```');
    expect(parsed).toEqual({ translations: ['a'] });
  });

  it('returns null for invalid payload', () => {
    const parsed = parseJsonObjectFromModelContent('not json');
    expect(parsed).toBeNull();
  });
});

describe('isLikelyTransientError', () => {
  it('detects transient by status code', () => {
    expect(isLikelyTransientError({ status: 429 })).toBe(true);
    expect(isLikelyTransientError({ response: { status: 503 } })).toBe(true);
  });

  it('detects transient by message', () => {
    expect(isLikelyTransientError(new Error('request timed out'))).toBe(true);
    expect(isLikelyTransientError(new Error('socket hang up'))).toBe(true);
  });

  it('does not classify permanent validation errors as transient', () => {
    expect(isLikelyTransientError(new Error('schema validation failed'))).toBe(false);
  });
});

describe('retryAsync', () => {
  it('retries and eventually succeeds', async () => {
    let calls = 0;
    const value = await retryAsync(
      async () => {
        calls += 1;
        if (calls < 3) {
          throw Object.assign(new Error('rate limit'), { status: 429 });
        }
        return 'ok';
      },
      { retries: 3, baseDelayMs: 1, maxDelayMs: 2 }
    );

    expect(value).toBe('ok');
    expect(calls).toBe(3);
  });

  it('stops retrying when shouldRetry returns false', async () => {
    let calls = 0;
    await expect(
      retryAsync(
        async () => {
          calls += 1;
          throw new Error('fatal');
        },
        { retries: 3, shouldRetry: () => false, baseDelayMs: 1, maxDelayMs: 2 }
      )
    ).rejects.toThrow('fatal');
    expect(calls).toBe(1);
  });
});

describe('fetchWithTimeout', () => {
  it('passes through successful fetch response', async () => {
    const response = new Response('ok', { status: 200 });
    const fetchMock = vi.fn().mockResolvedValue(response);
    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const result = await fetchWithTimeout('https://example.com', {}, 50);
    expect(result.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
