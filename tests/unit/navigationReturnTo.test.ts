import { describe, expect, it } from 'vitest';
import { resolveSafeReturnTo } from '../../src/utils/navigation';

describe('resolveSafeReturnTo', () => {
  it('returns raw path when it is a valid internal path', () => {
    expect(resolveSafeReturnTo('/media?tab=videos', '/dashboard')).toBe('/media?tab=videos');
  });

  it('falls back when raw value is empty or missing', () => {
    expect(resolveSafeReturnTo('', '/dashboard')).toBe('/dashboard');
    expect(resolveSafeReturnTo(undefined, '/dashboard')).toBe('/dashboard');
    expect(resolveSafeReturnTo(null, '/dashboard')).toBe('/dashboard');
  });

  it('falls back when raw value is not a local path', () => {
    expect(resolveSafeReturnTo('https://evil.example.com', '/dashboard')).toBe('/dashboard');
    expect(resolveSafeReturnTo('javascript:alert(1)', '/dashboard')).toBe('/dashboard');
  });

  it('falls back for protocol-relative paths', () => {
    expect(resolveSafeReturnTo('//evil.example.com', '/dashboard')).toBe('/dashboard');
  });

  it('normalizes fallback when fallback has no leading slash', () => {
    expect(resolveSafeReturnTo(undefined, 'dashboard')).toBe('/dashboard');
  });
});
