import { logger } from './logger';

/**
 * Fetches the user's country code based on their IP address.
 *
 * Notes:
 * - This is best-effort only (CORS, adblockers, rate limits, and privacy settings can break it).
 * - We cache aggressively to avoid repeated network calls and console noise.
 */
const COUNTRY_CACHE_KEY = 'geo.countryCode';
const COUNTRY_CACHE_AT_KEY = 'geo.countryCodeAt';
const COUNTRY_ATTEMPT_AT_KEY = 'geo.countryAttemptAt';

const COUNTRY_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const COUNTRY_RETRY_BACKOFF_MS = 2 * 60 * 60 * 1000; // 2 hours

let inFlight: Promise<string | null> | null = null;
let didWarn = false;

function safeNow(): number {
  return Date.now();
}

function safeGetLocalStorageItem(key: string): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetLocalStorageItem(key: string, value: string): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, value);
  } catch {
    // ignore storage failures
  }
}

function readCachedCountry(): string | null {
  const code = safeGetLocalStorageItem(COUNTRY_CACHE_KEY);
  const atRaw = safeGetLocalStorageItem(COUNTRY_CACHE_AT_KEY);
  const at = atRaw ? Number(atRaw) : NaN;

  if (!code) return null;
  if (!Number.isFinite(at)) return null;
  if (safeNow() - at > COUNTRY_CACHE_TTL_MS) return null;
  return code;
}

function shouldBackoffRetry(): boolean {
  const atRaw = safeGetLocalStorageItem(COUNTRY_ATTEMPT_AT_KEY);
  const at = atRaw ? Number(atRaw) : NaN;
  if (!Number.isFinite(at)) return false;
  return safeNow() - at < COUNTRY_RETRY_BACKOFF_MS;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const id = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    window.clearTimeout(id);
  }
}

export async function fetchUserCountry(): Promise<string | null> {
  const cached = readCachedCountry();
  if (cached) return cached;

  // If we recently failed, don't hammer external APIs.
  if (shouldBackoffRetry()) return null;

  if (inFlight) return inFlight;

  // Mark attempt time immediately to avoid thundering herds.
  safeSetLocalStorageItem(COUNTRY_ATTEMPT_AT_KEY, String(safeNow()));

  inFlight = (async () => {
    try {
      // ipapi.co frequently fails in browsers (CORS / rate limits). ipwho.is is more CORS-friendly.
      const response = await fetchWithTimeout(
        'https://ipwho.is/?fields=success,country_code',
        2500
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data: { success?: boolean; country_code?: string } = await response.json();
      const code = typeof data.country_code === 'string' ? data.country_code : null;
      if (!data.success || !code) return null;

      safeSetLocalStorageItem(COUNTRY_CACHE_KEY, code);
      safeSetLocalStorageItem(COUNTRY_CACHE_AT_KEY, String(safeNow()));
      return code;
    } catch (error) {
      // Only log in development, and only once per session (network issues are common).
      if (import.meta.env.DEV && !didWarn) {
        didWarn = true;
        logger.warn('Failed to fetch user country (best-effort):', error);
      }
      return null;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}
