import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  safeGetLocalStorageItem,
  safeGetSessionStorageItem,
  safeRemoveLocalStorageItem,
  safeSetLocalStorageItem,
  safeSetSessionStorageItem,
} from '../../src/utils/browserStorage';

describe('browserStorage utils', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null instead of throwing when localStorage access is blocked', () => {
    const getItem = vi.fn(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: { getItem },
    });

    expect(safeGetLocalStorageItem('preferredLanguage')).toBeNull();
  });

  it('returns false instead of throwing when sessionStorage writes are blocked', () => {
    const setItem = vi.fn(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });

    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      value: { setItem },
    });

    expect(safeSetSessionStorageItem('dismissed', '1')).toBe(false);
    expect(safeGetSessionStorageItem('dismissed')).toBeNull();
  });

  it('delegates to the underlying storage when available', () => {
    const getItem = vi.fn().mockReturnValue('en');
    const setItem = vi.fn();
    const removeItem = vi.fn();

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: { getItem, setItem, removeItem },
    });

    expect(safeGetLocalStorageItem('preferredLanguage')).toBe('en');
    expect(safeSetLocalStorageItem('preferredLanguage', 'zh')).toBe(true);
    expect(safeRemoveLocalStorageItem('preferredLanguage')).toBe(true);
    expect(setItem).toHaveBeenCalledWith('preferredLanguage', 'zh');
    expect(removeItem).toHaveBeenCalledWith('preferredLanguage');
  });
});
