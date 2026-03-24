import { useCallback, useEffect, useRef, useState } from 'react';
import { useAction } from 'convex/react';
import { aRef } from '../utils/convexRefs';

type SpeakActionArgs = {
  text: string;
  voice?: string;
  rate?: string;
  pitch?: string;
  skipCache?: boolean;
  lowLatency?: boolean;
  traceId?: string;
};

type SpeakTiming = {
  traceId?: string;
  path?: string;
  lowLatency?: boolean;
  totalMs?: number;
  cacheQueryMs?: number;
  cacheHeadMs?: number;
  azureMs?: number;
  uploadMs?: number;
  schedulerMs?: number;
};

type SpeakActionResult = {
  success: boolean;
  url?: string;
  audio?: string;
  format?: string;
  error?: string;
  cached?: boolean;
  source?: string;
  timing?: SpeakTiming;
};

type PlaybackTimingMeta = {
  traceId: string;
  source: 'url' | 'inline' | 'session_cache';
  speakInvokedAtMs: number;
  actionReturnedAtMs: number;
  backendTiming?: SpeakTiming;
};

type SpeakActionFn = (args: SpeakActionArgs) => Promise<SpeakActionResult>;
type RequestIdRef = { current: number };

// Keep a tiny debounce to coalesce rapid duplicate triggers without adding
// noticeable click-to-sound latency.
const SPEAK_DEBOUNCE_MS = 12;
const SESSION_INLINE_CACHE_MAX_SIZE = 60;
const inFlightSpeakRequests = new Map<string, Promise<SpeakActionResult>>();

function nowMs(): number {
  if (
    typeof globalThis.performance !== 'undefined' &&
    typeof globalThis.performance.now === 'function'
  ) {
    return globalThis.performance.now();
  }
  return Date.now();
}

function createTraceId(): string {
  return `tts_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function shouldLogTtsTiming(): boolean {
  if (globalThis.window === undefined) return false;
  if (import.meta.env.DEV) return true;
  try {
    return localStorage.getItem('tts:timing') === '1';
  } catch {
    return false;
  }
}

function logTtsTiming(payload: Record<string, unknown>) {
  if (!shouldLogTtsTiming()) return;
  console.info('[TTS timing]', payload);
}

function buildSpeakRequestDedupeKey(args: SpeakActionArgs): string {
  return `${args.voice || ''}|${args.rate || ''}|${args.pitch || ''}|${args.skipCache ? '1' : '0'}|${args.text}`;
}

function decodeBase64ToUint8Array(base64: string): Uint8Array {
  const byteCharacters = atob(base64);
  const byteLength = byteCharacters.length;
  const byteArray = new Uint8Array(byteLength);
  for (let i = 0; i < byteLength; i++) {
    byteArray[i] = byteCharacters.charCodeAt(i);
  }
  return byteArray;
}

function runSpeakActionWithDedupe(
  speakAction: SpeakActionFn,
  args: SpeakActionArgs
): Promise<SpeakActionResult> {
  const dedupeKey = buildSpeakRequestDedupeKey(args);
  const inFlight = inFlightSpeakRequests.get(dedupeKey);
  if (inFlight) return inFlight;

  const request = speakAction(args).finally(() => {
    inFlightSpeakRequests.delete(dedupeKey);
  });
  inFlightSpeakRequests.set(dedupeKey, request);
  return request;
}

function isStaleRequest(myRequestId: number, requestIdRef: RequestIdRef): boolean {
  return myRequestId !== requestIdRef.current;
}

function failCurrentRequest({
  message,
  myRequestId,
  requestIdRef,
  setError,
  setIsLoading,
}: {
  message: string;
  myRequestId: number;
  requestIdRef: RequestIdRef;
  setError: (message: string) => void;
  setIsLoading: (value: boolean) => void;
}): false {
  setError(message);
  if (myRequestId === requestIdRef.current) setIsLoading(false);
  return false;
}

/**
 * Hook for Text-to-Speech using Convex Azure TTS
 *
 * Features:
 * - Uses Convex Azure TTS action
 * - NO browser speechSynthesis fallback
 *
 * Usage:
 * const { speak, stop, isLoading } = useTTS();
 * await speak("안녕하세요");
 */
export const useTTS = () => {
  const speakAction = useAction(aRef<SpeakActionArgs, SpeakActionResult>('tts:speak'));
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const requestIdRef = useRef(0);
  const cacheRef = useRef<Map<string, string> | null>(null);
  const cacheReadyRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDebounceResolveRef = useRef<((ok: boolean) => void) | null>(null);
  const sessionInlineCacheRef = useRef<Map<string, string>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createdUrlsRef = useRef<Set<string>>(new Set());

  const revokeObjectUrl = useCallback((url: string) => {
    try {
      URL.revokeObjectURL(url);
    } catch (e) {
      console.warn('Failed to revoke audio URL:', e);
    } finally {
      createdUrlsRef.current.delete(url);
    }
  }, []);

  const stopCurrentAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.onabort = null;
      audio.onplaying = null;
      audio.pause();
      audio.currentTime = 0;
      audio.removeAttribute('src');
      try {
        audio.load();
      } catch {
        // Ignore browser-specific unload errors.
      }
      audioRef.current = null;
    }

    // Also stop browser TTS as fallback
    if ('speechSynthesis' in globalThis) {
      globalThis.speechSynthesis.cancel();
    }
  }, []);

  const cancelPendingDebouncedSpeak = useCallback((resolveValue: boolean) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (pendingDebounceResolveRef.current) {
      pendingDebounceResolveRef.current(resolveValue);
      pendingDebounceResolveRef.current = null;
    }
  }, []);

  const cleanupCreatedObjectUrls = useCallback(() => {
    for (const url of createdUrlsRef.current) {
      revokeObjectUrl(url);
    }
    createdUrlsRef.current.clear();
  }, [revokeObjectUrl]);

  const clearSessionInlineCache = useCallback(() => {
    sessionInlineCacheRef.current.clear();
  }, []);

  const handleAudioPlayback = useCallback(
    async (
      audioUrl: string,
      shouldRevoke: boolean,
      myRequestId: number,
      timingMeta?: PlaybackTimingMeta
    ): Promise<boolean> => {
      if (myRequestId !== requestIdRef.current) {
        if (shouldRevoke) revokeObjectUrl(audioUrl);
        return false;
      }

      const audio = new Audio(audioUrl);
      audio.preload = 'auto';
      audioRef.current = audio;
      const audioCreatedAtMs = nowMs();

      return new Promise<boolean>(resolve => {
        let firstSoundLogged = false;
        let playAttemptAtMs = audioCreatedAtMs;

        const logFirstSound = (trigger: 'playing' | 'play_resolved' | 'ended_without_playing') => {
          if (!timingMeta || firstSoundLogged) return;
          firstSoundLogged = true;
          const firstSoundAtMs = nowMs();
          logTtsTiming({
            traceId: timingMeta.traceId,
            source: timingMeta.source,
            trigger,
            clickToFirstSoundMs: Math.round(firstSoundAtMs - timingMeta.speakInvokedAtMs),
            requestRoundTripMs: Math.round(
              timingMeta.actionReturnedAtMs - timingMeta.speakInvokedAtMs
            ),
            playCallToFirstSoundMs: Math.round(firstSoundAtMs - playAttemptAtMs),
            audioCreateToFirstSoundMs: Math.round(firstSoundAtMs - audioCreatedAtMs),
            backend: timingMeta.backendTiming,
          });
        };

        const onPlaybackComplete = (ok: boolean) => {
          if (ok && !firstSoundLogged) {
            logFirstSound('ended_without_playing');
          }
          if (shouldRevoke) revokeObjectUrl(audioUrl);
          audio.onended = null;
          audio.onerror = null;
          audio.onabort = null;
          audio.onplaying = null;

          if (myRequestId === requestIdRef.current) {
            if (audioRef.current === audio) {
              audioRef.current = null;
            }
            setIsLoading(false);
          }
          resolve(ok);
        };

        audio.onended = () => onPlaybackComplete(true);
        audio.onerror = () => onPlaybackComplete(false);
        audio.onabort = () => onPlaybackComplete(false);
        audio.onplaying = () => logFirstSound('playing');
        playAttemptAtMs = nowMs();
        audio
          .play()
          .then(() => logFirstSound('play_resolved'))
          .catch(() => onPlaybackComplete(false));
      });
    },
    [revokeObjectUrl]
  );

  const stop = useCallback(() => {
    requestIdRef.current += 1;
    cancelPendingDebouncedSpeak(false);
    stopCurrentAudio();
    cleanupCreatedObjectUrls();
    clearSessionInlineCache();
    setIsLoading(false);
    setError(null);
  }, [
    cancelPendingDebouncedSpeak,
    cleanupCreatedObjectUrls,
    clearSessionInlineCache,
    stopCurrentAudio,
  ]);

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
      cancelPendingDebouncedSpeak(false);
      stopCurrentAudio();
      cleanupCreatedObjectUrls();
      clearSessionInlineCache();
    };
  }, [
    cancelPendingDebouncedSpeak,
    cleanupCreatedObjectUrls,
    clearSessionInlineCache,
    stopCurrentAudio,
  ]);

  const getCache = useCallback(() => {
    if (!cacheReadyRef.current) {
      cacheRef.current = loadPersistedCache();
      cacheReadyRef.current = true;
    }
    cacheRef.current ??= new Map();
    return cacheRef.current;
  }, []);

  const executeSpeak = useCallback(
    async (
      normalizedText: string,
      options?: {
        voice?: string;
        rate?: string;
        pitch?: string;
      },
      requestMeta?: {
        traceId: string;
        speakInvokedAtMs: number;
      }
    ) => {
      const myRequestId = (requestIdRef.current += 1);
      stopCurrentAudio();
      setIsLoading(true);
      setError(null);

      try {
        const traceId = requestMeta?.traceId || createTraceId();
        const speakInvokedAtMs = requestMeta?.speakInvokedAtMs ?? nowMs();
        const voice = options?.voice || 'ko-KR-SunHiNeural';
        const cacheKey = buildCacheKey(normalizedText, voice, options?.rate, options?.pitch);
        const cachedInlineUrl = touchCache(sessionInlineCacheRef.current, cacheKey);
        if (cachedInlineUrl) {
          return await handleAudioPlayback(cachedInlineUrl, false, myRequestId, {
            traceId,
            source: 'session_cache',
            speakInvokedAtMs,
            actionReturnedAtMs: nowMs(),
          });
        }

        const cache = getCache();
        const cachedUrl = touchCache(cache, cacheKey);

        if (cachedUrl) {
          const cachedPlayed = await handleAudioPlayback(cachedUrl, false, myRequestId, {
            traceId,
            source: 'url',
            speakInvokedAtMs,
            actionReturnedAtMs: nowMs(),
          });
          if (cachedPlayed) {
            persistCache(cache);
            return true;
          }
          // Remove stale/forbidden local cache URL and regenerate.
          cache.delete(cacheKey);
          persistCache(cache);
        }

        const runSpeakAction = async (skipCache: boolean) =>
          await runSpeakActionWithDedupe(speakAction, {
            text: normalizedText,
            voice,
            rate: options?.rate,
            pitch: options?.pitch,
            skipCache,
            lowLatency: true,
            traceId,
          });

        const playFromResult = async (result: SpeakActionResult) => {
          const actionReturnedAtMs = nowMs();
          if (result.url) {
            writeCache(cache, cacheKey, result.url);
            persistCache(cache);
            return await handleAudioPlayback(result.url, false, myRequestId, {
              traceId,
              source: 'url',
              speakInvokedAtMs,
              actionReturnedAtMs,
              backendTiming: result.timing,
            });
          }
          if (result.audio) {
            const audioBlob = base64ToBlob(result.audio, result.format || 'audio/mp3');
            const audioUrl = URL.createObjectURL(audioBlob);
            createdUrlsRef.current.add(audioUrl);
            writeSessionInlineCache(
              sessionInlineCacheRef.current,
              cacheKey,
              audioUrl,
              revokeObjectUrl
            );
            return await handleAudioPlayback(audioUrl, false, myRequestId, {
              traceId,
              source: 'inline',
              speakInvokedAtMs,
              actionReturnedAtMs,
              backendTiming: result.timing,
            });
          }
          return false;
        };

        let result = await runSpeakAction(false);

        if (isStaleRequest(myRequestId, requestIdRef)) return false;

        if (!result.success) {
          logTtsTiming({
            traceId,
            status: 'speak_failed',
            backend: result.timing,
            error: result.error || 'TTS service unavailable',
          });
          return failCurrentRequest({
            message: result.error || 'TTS service unavailable',
            myRequestId,
            requestIdRef,
            setError,
            setIsLoading,
          });
        }

        let played = await playFromResult(result);
        if (played) return true;

        // Retry once bypassing backend cache in case cached URL is stale.
        cache.delete(cacheKey);
        persistCache(cache);
        result = await runSpeakAction(true);
        if (isStaleRequest(myRequestId, requestIdRef)) return false;
        if (!result.success) {
          logTtsTiming({
            traceId,
            status: 'retry_failed',
            backend: result.timing,
            error: result.error || 'TTS service unavailable',
          });
          return failCurrentRequest({
            message: result.error || 'TTS service unavailable',
            myRequestId,
            requestIdRef,
            setError,
            setIsLoading,
          });
        }
        played = await playFromResult(result);
        if (played) return true;

        return failCurrentRequest({
          message: 'Audio playback failed',
          myRequestId,
          requestIdRef,
          setError,
          setIsLoading,
        });
      } catch (error) {
        console.error('TTS error:', error);
        return failCurrentRequest({
          message: error instanceof Error ? error.message : String(error),
          myRequestId,
          requestIdRef,
          setError,
          setIsLoading,
        });
      }
    },
    [getCache, handleAudioPlayback, revokeObjectUrl, speakAction, stopCurrentAudio]
  );

  const speak = useCallback(
    (
      text: string,
      options?: {
        voice?: string;
        rate?: string;
        pitch?: string;
      }
    ) => {
      const normalizedText = text?.trim();
      if (!normalizedText) return Promise.resolve(false);
      const speakInvokedAtMs = nowMs();
      const traceId = createTraceId();

      cancelPendingDebouncedSpeak(false);

      return new Promise<boolean>(resolve => {
        pendingDebounceResolveRef.current = resolve;
        debounceTimerRef.current = setTimeout(async () => {
          debounceTimerRef.current = null;
          pendingDebounceResolveRef.current = null;
          const played = await executeSpeak(normalizedText, options, {
            traceId,
            speakInvokedAtMs,
          });
          resolve(played);
        }, SPEAK_DEBOUNCE_MS);
      });
    },
    [cancelPendingDebouncedSpeak, executeSpeak]
  );

  return { speak, stop, isLoading, error };
};

const CACHE_KEY = 'ttsCacheV1';
const MAX_CACHE_SIZE = 200;

function buildCacheKey(text: string, voice: string, rate?: string, pitch?: string): string {
  return `${voice}|${rate || '0%'}|${pitch || '0%'}|${text}`;
}

function loadPersistedCache(): Map<string, string> {
  if (globalThis.window === undefined) return new Map();
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return new Map();
    const entries = JSON.parse(raw);
    if (!Array.isArray(entries)) return new Map();
    const map = new Map<string, string>();
    for (const entry of entries) {
      if (Array.isArray(entry) && entry.length === 2) {
        const [key, value] = entry;
        if (typeof key === 'string' && typeof value === 'string') {
          map.set(key, value);
        }
      }
    }
    while (map.size > MAX_CACHE_SIZE) {
      const oldestKey = map.keys().next().value;
      if (!oldestKey) break;
      map.delete(oldestKey);
    }
    return map;
  } catch {
    return new Map();
  }
}

function persistCache(cache: Map<string, string>) {
  if (globalThis.window === undefined) return;
  try {
    const entries = Array.from(cache.entries());
    localStorage.setItem(CACHE_KEY, JSON.stringify(entries));
  } catch {
    return;
  }
}

function touchCache(cache: Map<string, string>, key: string): string | undefined {
  const value = cache.get(key);
  if (value) {
    cache.delete(key);
    cache.set(key, value);
  }
  return value;
}

function writeCache(cache: Map<string, string>, key: string, value: string) {
  if (cache.has(key)) {
    cache.delete(key);
  }
  cache.set(key, value);
  if (cache.size > MAX_CACHE_SIZE) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) {
      cache.delete(oldestKey);
    }
  }
}

function writeSessionInlineCache(
  cache: Map<string, string>,
  key: string,
  value: string,
  revokeUrl: (url: string) => void
) {
  const existing = cache.get(key);
  if (existing && existing !== value) {
    revokeUrl(existing);
  }
  if (cache.has(key)) {
    cache.delete(key);
  }
  cache.set(key, value);

  while (cache.size > SESSION_INLINE_CACHE_MAX_SIZE) {
    const oldestKey = cache.keys().next().value;
    if (!oldestKey) break;
    const oldestUrl = cache.get(oldestKey);
    cache.delete(oldestKey);
    if (oldestUrl) {
      revokeUrl(oldestUrl);
    }
  }
}

// Helper: Convert base64 to Blob
function base64ToBlob(base64: string, mimeType: string): Blob {
  return new Blob([decodeBase64ToUint8Array(base64)], { type: mimeType });
}

/**
 * @deprecated Browser TTS is disabled. This function does nothing.
 * Use the useTTS hook's speak() function instead which uses Edge TTS.
 */
export const speakBrowser = (_text: string, _lang: string = 'ko-KR', _rate: number = 0.9) => {
  console.warn('speakBrowser is deprecated and disabled. Use useTTS hook instead.');
};
