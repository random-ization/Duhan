import { useCallback, useRef, useState } from 'react';
import { useAction } from 'convex/react';
import { aRef } from '../utils/convexRefs';
import { synthesizeSpeech } from '../lib/edgeTTS';

/**
 * Hook for Text-to-Speech using Edge TTS
 *
 * Features:
 * - Connects to Microsoft Edge TTS WebSocket API
 * - Falls back to Convex Azure TTS action as backup
 * - NO browser speechSynthesis fallback (intentionally disabled)
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
  const [isLoading, setIsLoading] = useState(false);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    // Also stop browser TTS as fallback
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel();
    }
    setIsLoading(false);
  }, []);

  const speak = useCallback(
    async (
      text: string,
      options?: {
        voice?: string;
        rate?: string;
        pitch?: string;
        useFallback?: boolean;
        engine?: 'auto' | 'convex' | 'edge' | 'browser';
      }
    ) => {
      if (!text || text.trim().length === 0) return false;

      // Stop any current audio
      stop();
      setIsLoading(true);

      try {
        const useFallback = options?.useFallback !== false;
        const engine = options?.engine ?? 'edge';

        const playAudio = async (audioUrl: string, shouldRevoke: boolean): Promise<boolean> => {
          const audio = new Audio(audioUrl);
          audioRef.current = audio;
          return new Promise<boolean>(resolve => {
            audio.onended = () => {
              if (shouldRevoke) URL.revokeObjectURL(audioUrl);
              audioRef.current = null;
              setIsLoading(false);
              resolve(true);
            };
            audio.onerror = () => {
              if (shouldRevoke) URL.revokeObjectURL(audioUrl);
              audioRef.current = null;
              setIsLoading(false);
              resolve(false);
            };
            audio.play().catch(() => {
              if (shouldRevoke) URL.revokeObjectURL(audioUrl);
              audioRef.current = null;
              setIsLoading(false);
              resolve(false);
            });
          });
        };

        // Browser TTS fallback intentionally disabled
        const tryBrowserTTS = async (): Promise<boolean> => {
          console.warn('TTS: Edge TTS failed, browser fallback is disabled');
          setIsLoading(false);
          return false;
        };

        const tryEdgeTTS = async (retries: number = 2): Promise<boolean> => {
          for (let attempt = 0; attempt <= retries; attempt++) {
            try {
              const audioBlob = await synthesizeSpeech(text.trim(), {
                voice: options?.voice,
                rate: options?.rate,
                pitch: options?.pitch,
              });
              const audioUrl = URL.createObjectURL(audioBlob);
              return await playAudio(audioUrl, true);
            } catch {
              if (attempt < retries) {
                // Brief delay before retry
                await new Promise(r => setTimeout(r, 200));
                continue;
              }
            }
          }
          setIsLoading(false);
          return false;
        };

        const tryConvexTTS = async (): Promise<boolean> => {
          const result = (await speakAction({
            text: text.trim(),
            voice: options?.voice,
            rate: options?.rate,
            pitch: options?.pitch,
          })) as {
            success: boolean;
            url?: string;
            audio?: string;
            format?: string;
            error?: string;
          };

          if (!result.success) {
            setIsLoading(false);
            return false;
          }

          if (result.url) {
            return await playAudio(result.url, false);
          }

          if (result.audio) {
            const audioBlob = base64ToBlob(result.audio, result.format || 'audio/mp3');
            const audioUrl = URL.createObjectURL(audioBlob);
            return await playAudio(audioUrl, true);
          }

          setIsLoading(false);
          return false;
        };

        if (engine === 'browser') {
          return await tryBrowserTTS();
        }

        if (engine === 'edge') {
          const ok = await tryEdgeTTS();
          if (ok) return true;
          return useFallback ? await tryBrowserTTS() : false;
        }

        if (engine === 'convex') {
          const ok = await tryConvexTTS();
          if (ok) return true;
          if (!useFallback) return false;
          const edgeOk = await tryEdgeTTS();
          if (edgeOk) return true;
          return await tryBrowserTTS();
        }

        const ok = await tryConvexTTS();
        if (ok) return true;
        const edgeOk = await tryEdgeTTS();
        if (edgeOk) return true;
        return useFallback ? await tryBrowserTTS() : false;
      } catch (error) {
        console.error('TTS error:', error);
        setIsLoading(false);
        // Browser TTS fallback intentionally disabled
        return false;
      }
    },
    [speakAction, stop]
  );

  return { speak, stop, isLoading };
};

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
