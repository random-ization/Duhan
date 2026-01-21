import { useCallback, useRef, useState } from 'react';
import { useAction } from 'convex/react';
import { aRef } from '../utils/convexRefs';
import { synthesizeSpeech } from '../lib/edgeTTS';

/**
 * Hook for Text-to-Speech using Azure Cognitive Services with S3 caching
 *
 * Features:
 * - Calls Convex action which uses Azure TTS REST API
 * - S3 caching to reduce API costs (audio served from CDN)
 * - Falls back to browser speechSynthesis if Azure TTS fails
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

        const tryBrowserTTS = async (): Promise<boolean> => {
          if ('speechSynthesis' in window) {
            return new Promise<boolean>(resolve => {
              const utterance = new SpeechSynthesisUtterance(text);
              utterance.lang = 'ko-KR';
              utterance.rate = 0.9;
              utterance.onend = () => {
                setIsLoading(false);
                resolve(true);
              };
              utterance.onerror = () => {
                setIsLoading(false);
                resolve(false);
              };
              speechSynthesis.speak(utterance);
            });
          }
          setIsLoading(false);
          return false;
        };

        const tryEdgeTTS = async (): Promise<boolean> => {
          try {
            const audioBlob = await synthesizeSpeech(text.trim(), {
              voice: options?.voice,
              rate: options?.rate,
              pitch: options?.pitch,
            });
            const audioUrl = URL.createObjectURL(audioBlob);
            return await playAudio(audioUrl, true);
          } catch {
            setIsLoading(false);
            return false;
          }
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
        console.error('Azure TTS error:', error);
        setIsLoading(false);

        // Fallback to browser TTS if enabled
        if (options?.useFallback !== false && 'speechSynthesis' in window) {
          return new Promise<boolean>(resolve => {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'ko-KR';
            utterance.rate = 0.9;
            utterance.onend = () => {
              setIsLoading(false);
              resolve(true);
            };
            utterance.onerror = () => {
              setIsLoading(false);
              resolve(false);
            };
            speechSynthesis.speak(utterance);
          });
        }
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

// Simple speak function for direct use (not a hook)
// Uses browser TTS only - for backward compatibility
export const speakBrowser = (text: string, lang: string = 'ko-KR', rate: number = 0.9) => {
  if ('speechSynthesis' in window) {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = rate;
    speechSynthesis.speak(utterance);
  }
};
