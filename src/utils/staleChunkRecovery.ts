import { safeGetSessionStorageItem, safeSetSessionStorageItem } from './browserStorage';

const RECOVERY_ATTEMPTS_KEY = 'duhan:stale-chunk-recovery-attempts';
const RECOVERY_QUERY_PARAM = '__duhan_reload';
const MAX_RECOVERY_ATTEMPTS = 3;

const STALE_CHUNK_ERROR_PATTERNS = [
  'failed to fetch dynamically imported module',
  'error loading dynamically imported module',
  'chunkloaderror',
  'loading chunk',
  'importing a module script failed',
  'failed to load module script',
];

const readAttemptCount = () => {
  if (typeof globalThis.window === 'undefined') return 0;
  const raw = safeGetSessionStorageItem(RECOVERY_ATTEMPTS_KEY);
  const parsed = Number.parseInt(raw || '0', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const writeAttemptCount = (value: number) => {
  if (typeof globalThis.window === 'undefined') return;
  safeSetSessionStorageItem(RECOVERY_ATTEMPTS_KEY, String(value));
};

const clearServiceWorkers = async () => {
  if (typeof globalThis.navigator === 'undefined' || !('serviceWorker' in globalThis.navigator)) {
    return;
  }

  const registrations = await globalThis.navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(registrations.map(registration => registration.unregister()));
};

const clearBrowserCaches = async () => {
  if (typeof globalThis.caches === 'undefined') return;
  const keys = await globalThis.caches.keys();
  await Promise.allSettled(keys.map(key => globalThis.caches.delete(key)));
};

const reloadWithCacheBust = (reload?: (url: string) => void) => {
  if (typeof globalThis.window === 'undefined') return;

  const nextUrl = new URL(globalThis.window.location.href);
  nextUrl.searchParams.set(RECOVERY_QUERY_PARAM, String(Date.now()));
  const performReload = reload ?? (url => globalThis.window.location.replace(url));
  performReload(nextUrl.toString());
};

const clearRecoveryQueryParam = () => {
  if (typeof globalThis.window === 'undefined') return;
  const url = new URL(globalThis.window.location.href);
  if (!url.searchParams.has(RECOVERY_QUERY_PARAM)) return;

  url.searchParams.delete(RECOVERY_QUERY_PARAM);
  const nextPath = `${url.pathname}${url.search}${url.hash}`;
  globalThis.window.history.replaceState(globalThis.window.history.state, '', nextPath);
};

export function isStaleChunkError(error: unknown): boolean {
  const message =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : String((error as { message?: unknown } | null | undefined)?.message || error || '');

  const normalizedMessage = message.toLowerCase();
  return STALE_CHUNK_ERROR_PATTERNS.some(pattern => normalizedMessage.includes(pattern));
}

export function recoverFromStaleChunk(
  reason: string,
  options: RecoverFromStaleChunkOptions = {}
): boolean {
  if (typeof globalThis.window === 'undefined') return false;

  const nextAttempt = readAttemptCount() + 1;
  if (nextAttempt > MAX_RECOVERY_ATTEMPTS) {
    console.error(
      `[runtime] stale chunk recovery skipped (${reason}): reached ${MAX_RECOVERY_ATTEMPTS} attempts`
    );
    return false;
  }

  writeAttemptCount(nextAttempt);

  void Promise.allSettled([clearServiceWorkers(), clearBrowserCaches()]).finally(() => {
    reloadWithCacheBust(options.reload);
  });

  return true;
}

export function finalizeStaleChunkRecovery() {
  clearRecoveryQueryParam();
}
type RecoverFromStaleChunkOptions = {
  reload?: (url: string) => void;
};
