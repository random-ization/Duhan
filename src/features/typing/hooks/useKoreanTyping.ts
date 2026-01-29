import React, { useState, useRef, useEffect, useCallback } from 'react';
import { disassemble } from 'es-hangul';

export type TypingMode = 'sentence' | 'paragraph';
export type TypingPhase = 'start' | 'typing' | 'finish';
export type ValidationStatus = 'correct' | 'incorrect' | 'pending';

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
  const [stats, setStats] = useState<TypingStats>({
    wpm: 0,
    accuracy: 100,
    startTime: null,
    errorCount: 0,
  });

  const inputRef = useRef<HTMLInputElement>(null!);

  // Stats Logic
  const calculateStats = useCallback(() => {
    setStats(prev => {
      if (!prev.startTime) return prev;

      const currentTime = Date.now();
      const timeInMinutes = (currentTime - prev.startTime) / 60000;

      if (timeInMinutes <= 0) return prev;

      const wpm = Math.round(completedIndex / 5 / timeInMinutes);
      const accuracy =
        completedIndex > 0
          ? Math.max(0, Math.round((completedIndex / (completedIndex + prev.errorCount)) * 100))
          : 100;

      return {
        ...prev,
        wpm,
        accuracy,
      };
    });
  }, [completedIndex]);

  // Timer for WPM updates
  useEffect(() => {
    if (phase === 'typing') {
      const interval = setInterval(calculateStats, 500);
      return () => clearInterval(interval);
    }
  }, [phase, calculateStats]);

  // Normalize Korean text to handle different Unicode representations
  // Hangul Jamo (U+1100-U+11FF) vs Hangul Compatibility Jamo (U+3130-U+318F)
  const normalizeKorean = (str: string): string => {
    // First apply NFC normalization
    let normalized = str.normalize('NFC');

    // Map Hangul Jamo to Compatibility Jamo
    const jamoMap: Record<string, string> = {
      // Initial consonants (Choseong) -> Compatibility Jamo
      '\u1100': '\u3131',
      '\u1101': '\u3132',
      '\u1102': '\u3134',
      '\u1103': '\u3137',
      '\u1104': '\u3138',
      '\u1105': '\u3139',
      '\u1106': '\u3141',
      '\u1107': '\u3142',
      '\u1108': '\u3143',
      '\u1109': '\u3145',
      '\u110A': '\u3146',
      '\u110B': '\u3147',
      '\u110C': '\u3148',
      '\u110D': '\u3149',
      '\u110E': '\u314A',
      '\u110F': '\u314B',
      '\u1110': '\u314C',
      '\u1111': '\u314D',
      '\u1112': '\u314E',

      // Medial vowels (Jungseong) -> Compatibility Jamo
      '\u1161': '\u314F',
      '\u1162': '\u3150',
      '\u1163': '\u3151',
      '\u1164': '\u3152',
      '\u1165': '\u3153',
      '\u1166': '\u3154',
      '\u1167': '\u3155',
      '\u1168': '\u3156',
      '\u1169': '\u3157',
      '\u116A': '\u3158',
      '\u116B': '\u3159',
      '\u116C': '\u315A',
      '\u116D': '\u315B',
      '\u116E': '\u315C',
      '\u116F': '\u315D',
      '\u1170': '\u315E',
      '\u1171': '\u315F',
      '\u1172': '\u3160',
      '\u1173': '\u3161',
      '\u1174': '\u3162',
      '\u1175': '\u3163',

      // Final consonants (Jongseong) -> Compatibility Jamo
      '\u11A8': '\u3131',
      '\u11A9': '\u3132',
      '\u11AA': '\u3133',
      '\u11AB': '\u3134',
      '\u11AC': '\u3135',
      '\u11AD': '\u3136',
      '\u11AE': '\u3137',
      '\u11AF': '\u3139',
      '\u11B0': '\u313A',
      '\u11B1': '\u313B',
      '\u11B2': '\u313C',
      '\u11B3': '\u313D',
      '\u11B4': '\u313E',
      '\u11B5': '\u313F',
      '\u11B6': '\u3140',
      '\u11B7': '\u3141',
      '\u11B8': '\u3142',
      '\u11B9': '\u3144',
      '\u11BA': '\u3145',
      '\u11BB': '\u3146',
      '\u11BC': '\u3147',
      '\u11BD': '\u3148',
      '\u11BE': '\u314A',
      '\u11BF': '\u314B',
      '\u11C0': '\u314C',
      '\u11C1': '\u314D',
      '\u11C2': '\u314E',
    };

    for (const [from, to] of Object.entries(jamoMap)) {
      normalized = normalized.split(from).join(to);
    }

    return normalized;
  };

  // Core Korean Logic - Character validation
  // Now also considers if extra trailing consonant could be initial of next char
  const checkInput = useCallback(
    (targetChar: string, inputChar: string, nextTargetChar?: string): ValidationStatus => {
      if (!targetChar) return 'incorrect';
      if (!inputChar) return 'pending';

      try {
        // Normalize both characters
        const normalizedTarget = normalizeKorean(targetChar);
        const normalizedInput = normalizeKorean(inputChar);

        // 1. Exact Match (for spaces, punctuation, etc.)
        if (normalizedTarget === normalizedInput) return 'correct';

        // 2. Disassemble both characters and normalize the result
        const targetJamos = normalizeKorean(disassemble(targetChar));
        const inputJamos = normalizeKorean(disassemble(inputChar));

        // 3. Exact jamo match = correct
        if (targetJamos === inputJamos) return 'correct';

        // 4. Prefix Match = still composing (pending)
        // Example: Target 'ㄱㅏ' (가), Input 'ㄱ' → Pending
        if (targetJamos.startsWith(inputJamos)) {
          return 'pending';
        }

        // 5. Check if input has extra trailing consonant(s) that could be the initial of the next character
        // This handles the Korean consonant "migration" where ㄹ typed after 이 temporarily makes 일
        // before the next vowel causes it to move to the next syllable (일 + ㅡ → 이름)
        if (inputJamos.length > targetJamos.length && nextTargetChar) {
          // Check if the input starts with all the target jamos
          const inputStartsWithTarget = inputJamos.substring(0, targetJamos.length) === targetJamos;

          if (inputStartsWithTarget) {
            const extraJamos = inputJamos.substring(targetJamos.length);
            const nextTargetJamos = normalizeKorean(disassemble(nextTargetChar));

            // Check if the extra jamos match the beginning of the next target
            // Use substring comparison for more reliability
            if (
              nextTargetJamos.length >= extraJamos.length &&
              nextTargetJamos.substring(0, extraJamos.length) === extraJamos
            ) {
              return 'pending';
            }
          }
        }

        // 6. If input is longer or doesn't match prefix → incorrect
        return 'incorrect';
      } catch {
        // Fallback for non-Hangul
        return targetChar === inputChar ? 'correct' : 'incorrect';
      }
    },
    []
  );

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
    (rawValue: string) => {
      if (!initialText) return;

      // Calculate how many characters are correctly completed
      let newCompletedIndex = 0;
      let hasIncompleteChar = false;

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
          break;
        }
      }

      setCompletedIndex(newCompletedIndex);

      // Check for completion
      if (newCompletedIndex === initialText.length && !hasIncompleteChar) {
        setPhase('finish');
        calculateStats();
      }
    },
    [initialText, checkInput, calculateStats]
  );

  // Sync Input change
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    const handleInput = () => {
      const rawValue = el.value;

      // Start timing on first input
      if (phase === 'start' && rawValue.length > 0) {
        setPhase('typing');
        setStats(prev => ({ ...prev, startTime: Date.now() }));
      }

      setUserInput(rawValue);
      processInput(rawValue);
    };

    el.addEventListener('input', handleInput);
    return () => el.removeEventListener('input', handleInput);
  }, [phase, processInput]);

  const reset = useCallback(() => {
    setUserInput('');
    setCompletedIndex(0);
    setPhase('start');
    setStats({
      wpm: 0,
      accuracy: 100,
      startTime: null,
      errorCount: 0,
    });
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.focus();
    }
  }, []);

  return {
    userInput,
    completedIndex,
    phase,
    stats,
    inputRef,
    reset,
    checkInput,
    getNextJamo,
  };
};
