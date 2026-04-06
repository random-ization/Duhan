import { describe, it, expect } from 'vitest';
import {
  toErrorMessage,
  resolveErrorHttpStatus,
  resolveErrorCode,
  resolveReadableAiErrorCode,
} from '../../convex/ai/errorHandlers';

describe('toErrorMessage', () => {
  it('extracts message from Error instance', () => {
    expect(toErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('returns plain string as-is', () => {
    expect(toErrorMessage('something broke')).toBe('something broke');
  });

  it('extracts message from object with message property', () => {
    expect(toErrorMessage({ message: 'obj error' })).toBe('obj error');
  });

  it('returns Unknown error for null/undefined', () => {
    expect(toErrorMessage(null)).toBe('Unknown error');
    expect(toErrorMessage(undefined)).toBe('Unknown error');
  });

  it('returns Unknown error for number', () => {
    expect(toErrorMessage(42)).toBe('Unknown error');
  });
});

describe('resolveErrorHttpStatus', () => {
  it('returns status from object with status property', () => {
    expect(resolveErrorHttpStatus({ status: 429 })).toBe(429);
  });

  it('returns status from nested response.status', () => {
    expect(resolveErrorHttpStatus({ response: { status: 500 } })).toBe(500);
  });

  it('returns statusCode from object', () => {
    expect(resolveErrorHttpStatus({ statusCode: 403 })).toBe(403);
  });

  it('returns undefined for null', () => {
    expect(resolveErrorHttpStatus(null)).toBeUndefined();
  });

  it('returns undefined for object without status', () => {
    expect(resolveErrorHttpStatus({ message: 'no status here' })).toBeUndefined();
  });
});

describe('resolveErrorCode', () => {
  it('returns code from object with code property', () => {
    expect(resolveErrorCode({ code: 'rate_limit_exceeded' })).toBe('rate_limit_exceeded');
  });

  it('detects rate_limit in message', () => {
    expect(resolveErrorCode({ message: 'rate_limit reached' })).toBe('RATE_LIMIT');
  });

  it('detects insufficient_quota in message', () => {
    expect(resolveErrorCode({ message: 'insufficient_quota' })).toBe('INSUFFICIENT_QUOTA');
  });

  it('detects invalid_api_key in message', () => {
    expect(resolveErrorCode({ message: 'invalid_api_key provided' })).toBe('INVALID_API_KEY');
  });

  it('returns UNKNOWN_ERROR for null', () => {
    expect(resolveErrorCode(null)).toBe('UNKNOWN_ERROR');
  });

  it('returns UNKNOWN_ERROR for unrecognized error', () => {
    expect(resolveErrorCode({ message: 'something else' })).toBe('UNKNOWN_ERROR');
  });
});

describe('resolveReadableAiErrorCode', () => {
  it('maps rate_limit_exceeded code to AI_RATE_LIMIT', () => {
    expect(resolveReadableAiErrorCode({ code: 'rate_limit_exceeded' })).toBe('AI_RATE_LIMIT');
  });

  it('maps insufficient_quota code to AI_QUOTA_EXCEEDED', () => {
    expect(resolveReadableAiErrorCode({ code: 'insufficient_quota' })).toBe('AI_QUOTA_EXCEEDED');
  });

  it('maps 429 status to AI_RATE_LIMIT', () => {
    expect(resolveReadableAiErrorCode({ status: 429 })).toBe('AI_RATE_LIMIT');
  });

  it('maps 401 status to AI_API_KEY_INVALID', () => {
    expect(resolveReadableAiErrorCode({ status: 401 })).toBe('AI_API_KEY_INVALID');
  });

  it('maps 500 status to AI_SERVICE_ERROR', () => {
    expect(resolveReadableAiErrorCode({ status: 500 })).toBe('AI_SERVICE_ERROR');
  });

  it('returns AI_UNKNOWN_ERROR for unrecognized error', () => {
    expect(resolveReadableAiErrorCode({ status: 200 })).toBe('AI_UNKNOWN_ERROR');
  });
});
