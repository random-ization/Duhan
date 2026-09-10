import React, { useState, useRef, useEffect, useCallback } from 'react';
import { disassemble } from 'es-hangul';
import {
  TypingMode,
  TypingPhase,
  ValidationStatus,
  normalizeKorean,
  checkInputStatus as checkInput,
} from '../utils/hangulUtils';

export type { TypingMode, TypingPhase, ValidationStatus };

export interface TypingStats {
  wpm: number;
  accuracy: number;
  startTime: number | null;
  errorCount: number;
}

interface UseKoreanTypingReturn {
  userInput: string;
  completedIndex: number; // Number of CORRECTLY completed characters
  phase: TypingPhase;
  isComposing: boolean;
  stats: TypingStats;
  inputRef: React.RefObject<HTMLInputElement>;
  reset: () => void;
  checkInput: (targetChar: string, inputChar: string, nextTargetChar?: string) => ValidationStatus;
  getNextJamo: (targetChar: string, inputChar: string, nextTargetChar?: string) => string | null;
}

export const useKoreanTyping = (initialText: string, _mode: TypingMode): UseKoreanTypingReturn => {
  const [userInput, setUserInput] = useState('');
  const [completedIndex, setCompletedIndex] = useState(0); // Track completed chars
  const [phase, setPhase] = useState<TypingPhase>('start');
  const [isComposing, setIsComposing] = useState(false);
  const [stats, setStats] = useState<TypingStats>({
    wpm: 0,
    accuracy: 100,
    startTime: null,
    errorCount: 0,
  });

  const inputRef = useRef<HTMLInputElement>(null!);
  const phaseRef = useRef<TypingPhase>('start');
  const isComposingRef = useRef(false);
  const lastProcessedValueRef = useRef('');
  const completedIndexRef = useRef(0);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Stats Logic
  const calculateStats = useCallback(() => {
    setStats(prev => {
      if (prev.startTime === null) return prev;

      const currentTime = Date.now();
      const timeInMinutes = (currentTime - prev.startTime) / 60000;

      const completed = completedIndexRef.current;
      const wpm = timeInMinutes > 0 ? Math.round(completed / 5 / timeInMinutes) : 0;
      const accuracy =
        completed + prev.errorCount > 0
          ? Math.max(0, Math.round((completed / (completed + prev.errorCount)) * 100))
          : 100;

      return {
        ...prev,
        wpm,
        accuracy,
      };
    });
  }, []);

  // Timer for WPM updates
  useEffect(() => {
    if (phase === 'typing') {
      const interval = setInterval(calculateStats, 500);
      return () => clearInterval(interval);
    }
  }, [phase, calculateStats]);

  // Get the next jamo needed for keyboard hints
  // Handles: normal typing, completed chars, and consonant migration
  const getNextJamo = useCallback(
    (targetChar: string, inputChar: string, nextTargetChar?: string): string | null => {
      if (!targetChar) return null;

      try {
        const targetJamos = normalizeKorean(disassemble(targetChar));
        const inputJamos = inputChar ? normalizeKorean(disassemble(inputChar)) : '';

        // Case 1: Normal typing - input is a prefix of target
        // Example: target="가" (ㄱㅏ), input="ㄱ" → next is "ㅏ"
        if (targetJamos.startsWith(inputJamos)) {
          const nextIndex = inputJamos.length;
          if (nextIndex < targetJamos.length) {
            return targetJamos[nextIndex];
          }
          // Input is complete - return first jamo of next char if available
          if (nextTargetChar) {
            const nextTargetJamos = normalizeKorean(disassemble(nextTargetChar));
            return nextTargetJamos[0] || null;
          }
          return null;
        }

        // Case 2: Consonant migration - input has extra trailing consonants
        // Example: target="이" (ㅇㅣ), input="일" (ㅇㅣㄹ) → next is "ㅡ" (vowel of next char)
        // This happens when typing 이름: after ㅇㅣ, user types ㄹ, IME shows 일
        if (
          inputJamos.startsWith(targetJamos) &&
          inputJamos.length > targetJamos.length &&
          nextTargetChar
        ) {
          const extraJamos = inputJamos.substring(targetJamos.length);
          const nextTargetJamos = normalizeKorean(disassemble(nextTargetChar));

          // Check if the extra jamos match beginning of next target (consonant migration)
          if (nextTargetJamos.startsWith(extraJamos)) {
            // Return the next jamo after the migrated consonants
            const nextIndex = extraJamos.length;
            if (nextIndex < nextTargetJamos.length) {
              return nextTargetJamos[nextIndex];
            }
            return null; // Next char would be complete after migration
          }
        }

        // Case 3: Input doesn't match - error state
        // Return null (KeyboardHints will show backspace)
        return null;
      } catch {
        return null;
      }
    },
    []
  );

  // Process input and update completed index
  const processInput = useCallback(
    (rawValue: string, previousValue: string) => {
      if (!initialText) return;

      // Calculate how many characters are correctly completed
      let newCompletedIndex = 0;
      let hasIncompleteChar = false;
      let hasError = rawValue.length > initialText.length;

      for (let i = 0; i < rawValue.length && i < initialText.length; i++) {
        // Pass the next target character for better composition handling
        const nextTargetChar = i + 1 < initialText.length ? initialText[i + 1] : undefined;
        const status = checkInput(initialText[i], rawValue[i], nextTargetChar);

        if (status === 'correct') {
          newCompletedIndex = i + 1;
        } else if (status === 'pending') {
          // Character is being composed, stop counting completed
          hasIncompleteChar = true;
          break;
        } else {
          // Incorrect - stop here
          hasError = true;
          break;
        }
      }

      // Count new committed invalid edits, not transient IME values, duplicate
      // composition events, or deletion while the user corrects a mistake.
      if (hasError && rawValue.length >= previousValue.length) {
        setStats(prev => ({ ...prev, errorCount: prev.errorCount + 1 }));
      }
      completedIndexRef.current = newCompletedIndex;
      setCompletedIndex(newCompletedIndex);
      calculateStats();

      // Check for completion
      if (
        newCompletedIndex === initialText.length &&
        rawValue.length === initialText.length &&
        !hasIncompleteChar
      ) {
        phaseRef.current = 'finish';
        setPhase('finish');
      }
    },
    [initialText, calculateStats]
  );

  // Sync Input change
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    const applyCommittedInput = (rawValue: string) => {
      if (phaseRef.current === 'finish') return;
      // De-dup to avoid double-processing when compositionend and input fire with same final value.
      if (rawValue === lastProcessedValueRef.current) {
        return;
      }
      const previousValue = lastProcessedValueRef.current;
      lastProcessedValueRef.current = rawValue;

      // Start timing on first input
      if (phaseRef.current === 'start' && rawValue.length > 0) {
        phaseRef.current = 'typing';
        setPhase('typing');
        setStats(prev => (prev.startTime ? prev : { ...prev, startTime: Date.now() }));
      }

      processInput(rawValue, previousValue);
    };

    const handleInput = () => {
      const rawValue = el.value.normalize('NFC');
      setUserInput(rawValue);

      // IME composing text is UI-only; do not run validation/WPM progression yet.
      if (isComposingRef.current) {
        return;
      }

      applyCommittedInput(rawValue);
    };

    const handleCompositionStart = () => {
      isComposingRef.current = true;
      setIsComposing(true);
    };

    const handleCompositionUpdate = () => {
      // Keep transient composing value visible in the UI.
      setUserInput(el.value.normalize('NFC'));
    };

    const handleCompositionEnd = () => {
      isComposingRef.current = false;
      setIsComposing(false);

      const rawValue = el.value.normalize('NFC');
      setUserInput(rawValue);
      applyCommittedInput(rawValue);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // During IME composition, never run final validation on keydown.
      if (isComposingRef.current) {
        return;
      }

      // Backspace/Enter timing differs by browser+IME; re-sync after native value settles.
      if (event.key === 'Backspace' || event.key === 'Enter') {
        queueMicrotask(() => {
          const rawValue = el.value.normalize('NFC');
          setUserInput(rawValue);
          applyCommittedInput(rawValue);
        });
      }
    };

    el.addEventListener('input', handleInput);
    el.addEventListener('compositionstart', handleCompositionStart);
    el.addEventListener('compositionupdate', handleCompositionUpdate);
    el.addEventListener('compositionend', handleCompositionEnd);
    el.addEventListener('keydown', handleKeyDown);

    return () => {
      el.removeEventListener('input', handleInput);
      el.removeEventListener('compositionstart', handleCompositionStart);
      el.removeEventListener('compositionupdate', handleCompositionUpdate);
      el.removeEventListener('compositionend', handleCompositionEnd);
      el.removeEventListener('keydown', handleKeyDown);
    };
  }, [processInput]);

  const reset = useCallback(() => {
    setUserInput('');
    setCompletedIndex(0);
    setPhase('start');
    setIsComposing(false);
    setStats({
      wpm: 0,
      accuracy: 100,
      startTime: null,
      errorCount: 0,
    });
    phaseRef.current = 'start';
    isComposingRef.current = false;
    lastProcessedValueRef.current = '';
    completedIndexRef.current = 0;
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.focus();
    }
  }, []);

  return {
    userInput,
    completedIndex,
    phase,
    isComposing,
    stats,
    inputRef,
    reset,
    checkInput,
    getNextJamo,
  };
};
