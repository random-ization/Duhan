import React, { useState, useEffect, useCallback, useRef } from 'react';
import { disassemble } from 'es-hangul';
import { KeyboardHints } from './KeyboardHints';
import { HiddenInput } from './HiddenInput';

interface WordItem {
  id: string;
  word: string;
  meaning?: string;
}

interface WordPracticeProps {
  words: WordItem[];
  onComplete: (stats: {
    wpm: number;
    accuracy: number;
    errorCount: number;
    duration: number;
    wordsCompleted: number;
  }) => void;
  onStatsUpdate?: (stats: {
    wpm: number;
    accuracy: number;
    errorCount: number;
    duration: number;
  }) => void;
  onBack: () => void;
}

export const WordPractice: React.FC<WordPracticeProps> = ({
  words,
  onComplete,
  onStatsUpdate,
  onBack,
}) => {
  const inputRef = useRef<HTMLInputElement>(null!);

  // Current word index
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [isFocused, setIsFocused] = useState(true);

  // Stats tracking
  const [startTime, setStartTime] = useState<number | null>(null);
  const [errorCount, setErrorCount] = useState(0);
  const [totalTypedChars, setTotalTypedChars] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const prevInputLen = useRef(0); // Track previous input length to detect backspaces

  // Current target word
  const currentWord = words[currentIndex];

  // Start timer on first input
  useEffect(() => {
    if (userInput.length === 1 && startTime === null) {
      setTimeout(() => setStartTime(Date.now()), 0);
    }
  }, [userInput, startTime]);

  // Timer update & Stats Sync
  useEffect(() => {
    if (startTime) {
      const interval = setInterval(() => {
        const now = Date.now();
        const duration = Math.floor((now - startTime) / 1000);
        setElapsedTime(duration);

        // Sync stats to parent
        if (onStatsUpdate) {
          const wpm = duration > 0 ? Math.round(totalTypedChars / (duration / 60)) : 0;

          const accuracy =
            totalTypedChars > 0
              ? Math.round((totalTypedChars / (totalTypedChars + errorCount)) * 100)
              : 100;

          onStatsUpdate({
            wpm,
            accuracy: Math.min(100, Math.max(0, accuracy)),
            errorCount,
            duration,
          });
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [startTime, totalTypedChars, errorCount, onStatsUpdate]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Check if input exactly matches target using jamo comparison
  const isComplete = useCallback((input: string, target: string): boolean => {
    if (!input || !target) return false;
    try {
      const targetJamo = disassemble(target);
      const inputJamo = disassemble(input);
      // Must have at least as many jamos and match exactly
      return inputJamo === targetJamo;
    } catch {
      return input === target;
    }
  }, []);

  // Check if input is a valid prefix of target (for visual feedback)
  const isValidPrefix = useCallback((input: string, target: string): boolean => {
    if (!input) return true;
    if (!target) return false;
    try {
      const targetJamo = disassemble(target);
      const inputJamo = disassemble(input);

      if (targetJamo.startsWith(inputJamo)) {
        return true;
      }

      if (inputJamo.length > 0 && targetJamo.length > 0) {
        let matchLen = 0;
        while (
          matchLen < inputJamo.length &&
          matchLen < targetJamo.length &&
          inputJamo[matchLen] === targetJamo[matchLen]
        ) {
          matchLen++;
        }

        if (matchLen > 0 && matchLen < inputJamo.length) {
          const extraInput = inputJamo.substring(matchLen);
          const remainingTarget = targetJamo.substring(matchLen);
          if (remainingTarget.startsWith(extraInput)) {
            return true;
          }
        }
      }

      return false;
    } catch {
      return target.startsWith(input);
    }
  }, []);

  // Calculate next jamo for hints
  const getNextJamo = useCallback(() => {
    if (!currentWord) return null;
    try {
      const tJamo = disassemble(currentWord.word);
      const iJamo = disassemble(userInput);

      if (tJamo.startsWith(iJamo)) {
        return tJamo[iJamo.length] || null;
      }

      let matchLen = 0;
      while (
        matchLen < iJamo.length &&
        matchLen < tJamo.length &&
        iJamo[matchLen] === tJamo[matchLen]
      ) {
        matchLen++;
      }

      if (matchLen > 0 && matchLen < iJamo.length) {
        const extraInput = iJamo.substring(matchLen);
        const remainingTarget = tJamo.substring(matchLen);

        if (remainingTarget.startsWith(extraInput)) {
          return remainingTarget[extraInput.length] || null;
        }
      }

      return null;
    } catch {
      return null;
    }
  }, [currentWord, userInput]);

  const nextJamo = getNextJamo();

  // Calculate how many complete characters have been typed
  const getCompletedChars = useCallback((): number => {
    if (!currentWord || !userInput) return 0;

    try {
      const inputJamo = disassemble(userInput);
      let completedChars = 0;
      let jamoCount = 0;

      for (let i = 0; i < currentWord.word.length; i++) {
        const charJamos = disassemble(currentWord.word[i]);
        jamoCount += charJamos.length;

        if (inputJamo.length >= jamoCount) {
          const targetJamosUpToChar = disassemble(currentWord.word.substring(0, i + 1));
          const inputJamosUpToChar = inputJamo.substring(0, targetJamosUpToChar.length);

          if (targetJamosUpToChar === inputJamosUpToChar) {
            completedChars = i + 1;
          } else {
            break;
          }
        } else {
          break;
        }
      }

      return completedChars;
    } catch {
      return 0;
    }
  }, [currentWord, userInput]);

  const completedChars = getCompletedChars();

  const isError = currentWord && userInput ? !isValidPrefix(userInput, currentWord.word) : false;

  // Handle completion of all words
  const handleAllComplete = useCallback(() => {
    const duration = elapsedTime || 1;
    const wpm = Math.round(totalTypedChars / (duration / 60));

    const accuracy =
      totalTypedChars > 0
        ? Math.round((totalTypedChars / (totalTypedChars + errorCount)) * 100)
        : 100;

    onComplete({
      wpm,
      accuracy: Math.min(100, Math.max(0, accuracy)),
      errorCount,
      duration,
      wordsCompleted: words.length,
    });
  }, [elapsedTime, totalTypedChars, errorCount, words.length, onComplete]);

  // Use native event listener
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    const handleInput = () => {
      const newValue = el.value;
      const isBackspace = newValue.length < prevInputLen.current;
      prevInputLen.current = newValue.length;

      setUserInput(newValue);

      // Check for errors
      if (!isBackspace && newValue.length > 0 && currentWord) {
        if (!isValidPrefix(newValue, currentWord.word)) {
          setErrorCount(prev => prev + 1);
        }
      }

      // Check for word completion
      if (currentWord && isComplete(newValue, currentWord.word)) {
        setTotalTypedChars(prev => prev + currentWord.word.length);

        if (currentIndex < words.length - 1) {
          setCurrentIndex(prev => prev + 1);
          setUserInput('');
          el.value = '';
          prevInputLen.current = 0; // Reset input length tracking
        } else {
          setTimeout(() => handleAllComplete(), 0);
        }
      }
    };

    el.addEventListener('input', handleInput);
    return () => el.removeEventListener('input', handleInput);
  }, [currentWord, currentIndex, words.length, isComplete, handleAllComplete, isValidPrefix]);

  // Reset input when word changes (safety check)
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.focus();
    }
    setTimeout(() => {
      setUserInput('');
      prevInputLen.current = 0;
    }, 0);
  }, [currentIndex]);

  const containerRef = useRef<HTMLDivElement>(null);

  // Click anywhere to focus input (Accessibility: handled via event listener instead of onClick on div)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleClick = () => {
      inputRef.current?.focus();
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, []);

  if (!currentWord) {
    return <div className="text-slate-500">No words available</div>;
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col w-full h-full relative font-sans overflow-hidden focus:outline-none"
      style={{ touchAction: 'none', userSelect: 'none' }}
    >
      {/* Word Carousel - V6 Separated Layout */}
      <div className="w-full max-w-5xl flex flex-col items-center justify-center relative -mt-8 flex-1">
        {/* 1. The Prompt Card (Compact & Blue) */}
        <div className="flex flex-col items-center relative z-20 mb-12">
          <div className="text-[10px] font-bold text-blue-500 tracking-[0.25em] mb-4 uppercase">
            Word to Type
          </div>

          <div className="word-prompt-card px-16 py-8 rounded-[2rem] flex flex-col items-center justify-center text-slate-800 relative min-w-[300px]">
            {/* Main Word */}
            <div className="text-5xl font-black tracking-tight mb-2 text-slate-900 drop-shadow-sm">
              {currentWord.word}
            </div>
            {/* Meaning */}
            <div className="text-slate-500 font-bold text-sm">{currentWord.meaning || '...'}</div>
          </div>
        </div>

        {/* 2. The Input Area (Clearly Separated Below) */}
        <div className="relative flex flex-col items-center z-10 w-full h-32 justify-start">
          {/* Floating Input Display - Character by Character for perfect alignment */}
          <div className="relative flex items-center justify-center h-16">
            {currentWord.word.split('').map((char, idx) => {
              const isCompleted = idx < completedChars;
              const isCurrent = idx === completedChars;
              const isRemaining = idx > completedChars;

              return (
                <div
                  key={`${char}-${idx}`}
                  className="relative flex flex-col items-center justify-end mx-0 leading-none min-w-[3.5rem]"
                >
                  {/* Character Wrapper for Cursor Positioning */}
                  <span className="relative inline-block">
                    <span
                      className={`text-6xl font-black transition-colors duration-150 leading-tight block
                                      ${isCompleted ? 'text-slate-800' : ''}
                                      ${isCurrent ? 'text-blue-600 scale-110' : ''} 
                                      ${isRemaining ? 'text-slate-300 opacity-100' : ''}
                                  `}
                    >
                      {/* Show actual user input if current, otherwise target char */}
                      {isCurrent && userInput[idx] ? userInput[idx] : char}
                    </span>

                    {/* Cursor Bar - Attached to Character Span */}
                    {isCurrent && isFocused && (
                      <div
                        className={`
                                          absolute top-1 bottom-1 w-1 bg-blue-500 rounded-full animate-pulse
                                          ${userInput[idx] ? '-right-2' : '-left-2'}
                                      `}
                      ></div>
                    )}
                  </span>

                  {/* Ghost Target Hint (if typing) - Moved outside relative span to center correctly */}
                  {isCurrent && userInput[idx] && userInput[idx] !== char && (
                    <div className="absolute top-full mt-2 text-sm font-bold text-slate-300 uppercase tracking-widest">
                      {char}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Visual Guide / Underline */}
          <div className="w-64 h-px bg-slate-200 mt-6 rounded-full"></div>
        </div>

        {/* Peripheral Words (Floating Text) */}
        {/* Previous Word (Left) */}
        {currentIndex > 0 && (
          <div className="hidden lg:flex absolute left-10 top-1/2 -translate-y-1/2 flex-col items-end opacity-30 transform -translate-x-4 blur-[1px] transition-all duration-500">
            <span className="text-4xl font-bold text-slate-400">
              {words[currentIndex - 1].word}
            </span>
          </div>
        )}

        {/* Next Word (Right) */}
        {currentIndex < words.length - 1 && (
          <div className="hidden lg:flex absolute right-10 top-1/2 -translate-y-1/2 flex-col items-start opacity-30 transform translate-x-4 blur-[0.5px] transition-all duration-500">
            <span className="text-4xl font-bold text-slate-400">
              {words[currentIndex + 1].word}
            </span>
            <span className="text-sm font-bold text-slate-300 mt-1 ml-1">
              {words[currentIndex + 1].meaning}
            </span>
          </div>
        )}

        {/* Next + 1 (Far Right) */}
        {currentIndex < words.length - 2 && (
          <div className="hidden xl:flex absolute right-0 top-1/2 -translate-y-1/2 flex-col items-start opacity-10 transform translate-x-8 blur-[2px] transition-all duration-500">
            <span className="text-3xl font-bold text-slate-400">
              {words[currentIndex + 2].word}
            </span>
          </div>
        )}
      </div>

      {/* Keyboard Area - Enhanced */}
      <div
        className="flex-shrink-0 pt-3 pb-4 px-4"
        style={{
          background: 'linear-gradient(to top, #f1f5f9 0%, #ffffff 100%)',
          borderTop: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        <div className="w-full max-w-[90rem] mx-auto">
          <div className="flex justify-between items-center mb-2 px-3">
            <div className="flex items-center gap-4 text-slate-500 text-xs font-medium">
              <button
                onClick={onBack}
                className="flex items-center gap-1.5 hover:text-slate-800 transition-colors"
              >
                ← <span className="flex items-center gap-1.5">📝 낱말연습</span>
              </button>
            </div>
            <div className="flex gap-1.5">
              <div className="w-2 h-2 rounded-full bg-orange-500 shadow-sm"></div>
            </div>
          </div>

          <KeyboardHints nextJamo={nextJamo} targetChar={currentWord.word} hasError={isError} />
        </div>
      </div>

      {/* Use the same HiddenInput component as sentence mode */}
      <HiddenInput
        ref={inputRef}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
    </div>
  );
};
