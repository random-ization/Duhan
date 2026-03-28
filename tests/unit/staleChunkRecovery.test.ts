import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  finalizeStaleChunkRecovery,
  isStaleChunkError,
  recoverFromStaleChunk,
} from '../../src/utils/staleChunkRecovery';

describe('staleChunkRecovery', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    window.history.replaceState(null, '', '/zh/dashboard');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('detects stale chunk loading errors from multiple runtimes', () => {
    expect(isStaleChunkError(new Error('Failed to fetch dynamically imported module'))).toBe(true);
    expect(isStaleChunkError(new Error('Loading chunk 42 failed.'))).toBe(true);
    expect(isStaleChunkError('Importing a module script failed')).toBe(true);
    expect(isStaleChunkError(new Error('Regular API error'))).toBe(false);
  });

  it('clears service workers and caches before reloading with a cache-busting URL', async () => {
    const unregister = vi.fn().mockResolvedValue(true);
    const getRegistrations = vi.fn().mockResolvedValue([{ unregister }]);
    const cacheDelete = vi.fn().mockResolvedValue(true);
    const cacheKeys = vi.fn().mockResolvedValue(['workbox-precache-v1']);
    const reload = vi.fn();

    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: { getRegistrations },
    });
    Object.defineProperty(window, 'caches', {
      configurable: true,
      value: {
        keys: cacheKeys,
        delete: cacheDelete,
      },
    });

    expect(recoverFromStaleChunk('vite:preloadError', { reload })).toBe(true);

    await vi.waitFor(() => {
      expect(reload).toHaveBeenCalledTimes(1);
    });

    expect(sessionStorage.getItem('duhan:stale-chunk-recovery-attempts')).toBe('1');
    expect(getRegistrations).toHaveBeenCalledTimes(1);
    expect(unregister).toHaveBeenCalledTimes(1);
    expect(cacheKeys).toHaveBeenCalledTimes(1);
    expect(cacheDelete).toHaveBeenCalledWith('workbox-precache-v1');
    expect(reload.mock.calls[0]?.[0]).toContain('__duhan_reload=');
  });

  it('stops automatic recovery after the configured attempt limit', () => {
    sessionStorage.setItem('duhan:stale-chunk-recovery-attempts', '3');
    const reload = vi.fn();

    expect(recoverFromStaleChunk('window-error', { reload })).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });

  it('removes the cache-bust query parameter after a successful boot', () => {
    window.history.replaceState(null, '', '/zh/dashboard?__duhan_reload=123&foo=bar#stats');

    finalizeStaleChunkRecovery();

    expect(window.location.pathname).toBe('/zh/dashboard');
    expect(window.location.search).toBe('?foo=bar');
    expect(window.location.hash).toBe('#stats');
  });
});
