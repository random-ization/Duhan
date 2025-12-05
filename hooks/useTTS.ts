import { useState, useCallback, useRef, useEffect } from 'react';

interface UseTTSOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export const useTTS = (options: UseTTSOptions = {}) => {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      setSupported(true);
    }

    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  const speak = useCallback(
    (text: string, overrideOptions?: UseTTSOptions) => {
      if (!synthRef.current || !text) return;

      // Cancel any ongoing speech
      synthRef.current.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      const finalOptions = { ...options, ...overrideOptions };

      utterance.lang = finalOptions.lang || 'ko-KR';
      utterance.rate = finalOptions.rate || 1;
      utterance.pitch = finalOptions.pitch || 1;
      utterance.volume = finalOptions.volume || 1;

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      utteranceRef.current = utterance;
      synthRef.current.speak(utterance);
    },
    [options]
  );

  const cancel = useCallback(() => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setSpeaking(false);
    }
  }, []);

  const pause = useCallback(() => {
    if (synthRef.current && speaking) {
      synthRef.current.pause();
    }
  }, [speaking]);

  const resume = useCallback(() => {
    if (synthRef.current && speaking) {
      synthRef.current.resume();
    }
  }, [speaking]);

  return {
    speak,
    cancel,
    pause,
    resume,
    speaking,
    supported,
  };
};
