import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  getMediaQueryList,
  matchesMediaQuery,
  subscribeToMediaQuery,
} from '../../src/utils/mediaQuery';

describe('mediaQuery utils', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false safely when matchMedia is unavailable', () => {
    const original = window.matchMedia;

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: undefined,
    });

    expect(getMediaQueryList('(display-mode: standalone)')).toBeNull();
    expect(matchesMediaQuery('(display-mode: standalone)')).toBe(false);

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: original,
    });
  });

  it('subscribes with addEventListener when available', () => {
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    const mediaQueryList = {
      matches: false,
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener,
      removeEventListener,
    } as unknown as MediaQueryList;

    const handler = vi.fn();
    const unsubscribe = subscribeToMediaQuery(mediaQueryList, handler);

    expect(addEventListener).toHaveBeenCalledWith('change', handler);
    unsubscribe();
    expect(removeEventListener).toHaveBeenCalledWith('change', handler);
  });

  it('falls back to addListener/removeListener for legacy MediaQueryList', () => {
    const addListener = vi.fn();
    const removeListener = vi.fn();
    const legacyMediaQueryList = {
      matches: true,
      media: '(max-width: 767px)',
      onchange: null,
      addListener,
      removeListener,
    } as unknown as MediaQueryList;

    const handler = vi.fn();
    const unsubscribe = subscribeToMediaQuery(legacyMediaQueryList, handler);

    expect(addListener).toHaveBeenCalledWith(handler);
    unsubscribe();
    expect(removeListener).toHaveBeenCalledWith(handler);
  });
});
