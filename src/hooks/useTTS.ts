import { useCallback, useRef } from 'react';
import { useAction } from 'convex/react';
import { aRef } from '../utils/convexRefs';

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
  const isLoadingRef = useRef<boolean>(false);

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
  }, []);

  const speak = useCallback(
    async (
      text: string,
      options?: {
        voice?: string;
        rate?: string;
        pitch?: string;
        useFallback?: boolean;
      }
    ) => {
      if (!text || text.trim().length === 0) return false;

      // Stop any current audio
      stop();
      isLoadingRef.current = true;

      try {
        const result = (await speakAction({
          text: text.trim(),
          voice: options?.voice,
          rate: options?.rate,
          pitch: options?.pitch,
        })) as { success: boolean; url?: string; audio?: string; format?: string; error?: string };

        if (result.success) {
          let audioUrl: string;

          // Prefer URL (S3 CDN) over base64
          if (result.url) {
            audioUrl = result.url;
          } else if (result.audio) {
            const audioBlob = base64ToBlob(result.audio, result.format || 'audio/mp3');
            audioUrl = URL.createObjectURL(audioBlob);
          } else {
            throw new Error('No audio data received');
          }

          const audio = new Audio(audioUrl);
          audioRef.current = audio;

          return new Promise<boolean>(resolve => {
            audio.onended = () => {
              // Only revoke if it was a blob URL
              if (!result.url) {
                URL.revokeObjectURL(audioUrl);
              }
              audioRef.current = null;
              isLoadingRef.current = false;
              resolve(true);
            };
            audio.onerror = () => {
              if (!result.url) {
                URL.revokeObjectURL(audioUrl);
              }
              audioRef.current = null;
              isLoadingRef.current = false;
              resolve(false);
            };
            audio.play().catch(() => {
              isLoadingRef.current = false;
              resolve(false);
            });
          });
        } else {
          throw new Error(result.error || 'TTS failed');
        }
      } catch (error) {
        console.error('Azure TTS error:', error);
        isLoadingRef.current = false;

        // Fallback to browser TTS if enabled
        if (options?.useFallback !== false && 'speechSynthesis' in window) {
          return new Promise<boolean>(resolve => {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'ko-KR';
            utterance.rate = 0.9;
            utterance.onend = () => resolve(true);
            utterance.onerror = () => resolve(false);
            speechSynthesis.speak(utterance);
          });
        }
        return false;
      }
    },
    [speakAction, stop]
  );

  return { speak, stop, isLoading: isLoadingRef.current };
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
