import { useCallback, useRef, useState } from 'react';
import { useAction } from 'convex/react';
import { aRef } from '../utils/convexRefs';

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
  const speakAction = useAction(
    aRef<
      { text: string; voice?: string; rate?: string; pitch?: string },
      { success: boolean; url?: string; audio?: string; format?: string; error?: string }
    >('tts:speak')
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const requestIdRef = useRef(0);
  const cacheRef = useRef<Map<string, string> | null>(null);
  const cacheReadyRef = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const createdUrlsRef = useRef<string[]>([]);

  const stopCurrentAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = '';
      audioRef.current = null;
    }
    // Also stop browser TTS as fallback
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
  }, []);

  const stop = useCallback(() => {
    requestIdRef.current += 1;
    stopCurrentAudio();
    // Clean up any created URLs
    createdUrlsRef.current.forEach(url => {
      try {
        URL.revokeObjectURL(url);
      } catch (e) {
        console.warn('Failed to revoke URL during stop:', e);
      }
    });
    createdUrlsRef.current = [];
    setIsLoading(false);
  }, [stopCurrentAudio]);

  const getCache = useCallback(() => {
    if (!cacheReadyRef.current) {
      cacheRef.current = loadPersistedCache();
      cacheReadyRef.current = true;
    }
    if (!cacheRef.current) {
      cacheRef.current = new Map();
    }
    return cacheRef.current;
  }, []);

  const speak = useCallback(
    async (
      text: string,
      options?: {
        voice?: string;
        rate?: string;
        pitch?: string;
      }
    ) => {
      const normalizedText = text?.trim();
      if (!normalizedText) return false;

      const myRequestId = (requestIdRef.current += 1);
      stopCurrentAudio();
      setIsLoading(true);

      try {
        const playAudio = async (audioUrl: string, shouldRevoke: boolean): Promise<boolean> => {
          if (myRequestId !== requestIdRef.current) {
            if (shouldRevoke) URL.revokeObjectURL(audioUrl);
            return false;
          }
          const audio = new Audio(audioUrl);
          audio.preload = 'auto';
          audioRef.current = audio;
          return new Promise<boolean>(resolve => {
            const cleanup = (ok: boolean) => {
              try {
                if (shouldRevoke) URL.revokeObjectURL(audioUrl);
              } catch (e) {
                console.warn('Failed to revoke audio URL:', e);
              }
              if (myRequestId === requestIdRef.current) {
                if (audioRef.current === audio) {
                  audioRef.current = null;
                }
                setIsLoading(false);
              }
              resolve(ok);
            };
            audio.onended = () => cleanup(true);
            audio.onerror = () => cleanup(false);
            audio.onabort = () => cleanup(false);
            audio.play().catch(() => cleanup(false));
          });
        };

        const tryConvexTTS = async (): Promise<boolean> => {
          const voice = options?.voice || 'ko-KR-SunHiNeural';
          const cacheKey = buildCacheKey(normalizedText, voice);
          const cache = getCache();
          const cachedUrl = touchCache(cache, cacheKey);
          if (cachedUrl) {
            persistCache(cache);
            return await playAudio(cachedUrl, false);
          }

          const result = (await speakAction({
            text: normalizedText,
            voice,
            rate: options?.rate,
            pitch: options?.pitch,
          })) as {
            success: boolean;
            url?: string;
            audio?: string;
            format?: string;
            error?: string;
          };

          if (myRequestId !== requestIdRef.current) {
            return false;
          }

          if (!result.success) {
            if (myRequestId === requestIdRef.current) setIsLoading(false);
            return false;
          }

          if (result.url) {
            writeCache(cache, cacheKey, result.url);
            persistCache(cache);
            return await playAudio(result.url, false);
          }

          if (result.audio) {
            const audioBlob = base64ToBlob(result.audio, result.format || 'audio/mp3');
            const audioUrl = URL.createObjectURL(audioBlob);
            createdUrlsRef.current.push(audioUrl);
            return await playAudio(audioUrl, true);
          }

          if (myRequestId === requestIdRef.current) setIsLoading(false);
          return false;
        };

        return await tryConvexTTS();
      } catch (error) {
        console.error('TTS error:', error);
        if (myRequestId === requestIdRef.current) setIsLoading(false);
        return false;
      }
    },
    [getCache, speakAction, stopCurrentAudio]
  );

  return { speak, stop, isLoading };
};

const CACHE_KEY = 'ttsCacheV1';
const MAX_CACHE_SIZE = 200;

function buildCacheKey(text: string, voice: string): string {
  return `${voice}|${text}`;
}

function loadPersistedCache(): Map<string, string> {
  if (typeof window === 'undefined') return new Map();
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
  if (typeof window === 'undefined') return;
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

// Helper: Convert base64 to Blob
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * @deprecated Browser TTS is disabled. This function does nothing.
 * Use the useTTS hook's speak() function instead which uses Edge TTS.
 */
export const speakBrowser = (_text: string, _lang: string = 'ko-KR', _rate: number = 0.9) => {
  console.warn('speakBrowser is deprecated and disabled. Use useTTS hook instead.');
};
