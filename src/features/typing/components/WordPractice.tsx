import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { assemble, disassemble } from 'es-hangul';
import { useTranslation } from 'react-i18next';
import { KeyboardHints } from './KeyboardHints';
import { HiddenInput } from './HiddenInput';
import { Button } from '../../../components/ui';

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
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null!);
  const isComposingRef = useRef(false);
  const prevInputLen = useRef(0);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [isFocused, setIsFocused] = useState(true);

  const [startTime, setStartTime] = useState<number | null>(null);
  const [errorCount, setErrorCount] = useState(0);
  const [totalTypedChars, setTotalTypedChars] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  const currentWord = words[currentIndex];

  // Timer handling is now done in handleInput to avoid useEffect setState warnings

  useEffect(() => {
    if (!startTime) return;
    const interval = setInterval(() => {
      const duration = Math.floor((Date.now() - startTime) / 1000);
      setElapsedTime(duration);

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
  }, [startTime, totalTypedChars, errorCount, onStatsUpdate]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const isComplete = useCallback((input: string, target: string): boolean => {
    if (!input || !target) return false;
    try {
      return disassemble(input) === disassemble(target);
    } catch {
      return input === target;
    }
  }, []);

  const isValidPrefix = useCallback((input: string, target: string): boolean => {
    if (!input) return true;
    if (!target) return false;
    try {
      const targetJamo = disassemble(target);
      const inputJamo = disassemble(input);

      if (targetJamo.startsWith(inputJamo)) return true;

      let matchLen = 0;
      while (
        matchLen < inputJamo.length &&
        matchLen < targetJamo.length &&
        inputJamo[matchLen] === targetJamo[matchLen]
      ) {
        matchLen += 1;
      }

      if (matchLen > 0 && matchLen < inputJamo.length) {
        const extraInput = inputJamo.substring(matchLen);
        const remainingTarget = targetJamo.substring(matchLen);
        return remainingTarget.startsWith(extraInput);
      }

      return false;
    } catch {
      return target.startsWith(input);
    }
  }, []);

  const typingProgress = useMemo(() => {
    if (!currentWord) {
      return {
        completedChars: 0,
        currentDisplayChar: '',
        currentTargetChar: '',
        isError: false,
        nextJamo: null as string | null,
      };
    }

    try {
      const targetChars = currentWord.word.split('');
      const inputJamo = disassemble(userInput);
      let consumed = 0;

      for (let i = 0; i < targetChars.length; i += 1) {
        const targetChar = targetChars[i];
        const targetJamo = disassemble(targetChar);
        const typedSlice = inputJamo.substring(consumed, consumed + targetJamo.length);

        if (!typedSlice) {
          return {
            completedChars: i,
            currentDisplayChar: '',
            currentTargetChar: targetChar,
            isError: false,
            nextJamo: targetJamo[0] || null,
          };
        }

        if (typedSlice === targetJamo) {
          consumed += targetJamo.length;
          continue;
        }

        const currentDisplayChar = assemble(typedSlice.split(''));
        const isError = !targetJamo.startsWith(typedSlice);
        const nextChar = i + 1 < targetChars.length ? targetChars[i + 1] : '';
        const nextJamo = isError
          ? null
          : targetJamo[typedSlice.length] || (nextChar ? disassemble(nextChar)[0] : null);

        return {
          completedChars: i,
          currentDisplayChar,
          currentTargetChar: targetChar,
          isError,
          nextJamo,
        };
      }

      return {
        completedChars: targetChars.length,
        currentDisplayChar: '',
        currentTargetChar: '',
        isError: false,
        nextJamo: null,
      };
    } catch {
      const completedChars = Math.min(userInput.length, currentWord.word.length);
      return {
        completedChars,
        currentDisplayChar: userInput[completedChars] || '',
        currentTargetChar: currentWord.word[completedChars] || '',
        isError: false,
        nextJamo: null,
      };
    }
  }, [currentWord, userInput]);

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

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;

    const handleInput = () => {
      const newValue = el.value.normalize('NFC');
      const isBackspace = newValue.length < prevInputLen.current;
      prevInputLen.current = newValue.length;

      setUserInput(newValue);

      if (startTime === null && newValue.length > 0) {
        setStartTime(Date.now());
      }

      if (isComposingRef.current) return;

      if (!isBackspace && newValue.length > 0 && currentWord) {
        if (!isValidPrefix(newValue, currentWord.word)) {
          setErrorCount(prev => prev + 1);
        }
      }

      if (currentWord && isComplete(newValue, currentWord.word)) {
        setTotalTypedChars(prev => prev + currentWord.word.length);
        if (currentIndex < words.length - 1) {
          setCurrentIndex(prev => prev + 1);
          setUserInput('');
          el.value = '';
          prevInputLen.current = 0;
        } else {
          setTimeout(() => handleAllComplete(), 0);
        }
      }
    };

    const handleCompositionStart = () => {
      isComposingRef.current = true;
    };

    const handleCompositionUpdate = () => {
      setUserInput(el.value.normalize('NFC'));
    };

    const handleCompositionEnd = () => {
      isComposingRef.current = false;
      handleInput();
    };

    const handleFocus = () => setIsFocused(true);
    const handleBlur = () => setIsFocused(false);

    el.addEventListener('input', handleInput);
    el.addEventListener('compositionstart', handleCompositionStart);
    el.addEventListener('compositionupdate', handleCompositionUpdate);
    el.addEventListener('compositionend', handleCompositionEnd);
    el.addEventListener('focus', handleFocus);
    el.addEventListener('blur', handleBlur);

    return () => {
      el.removeEventListener('input', handleInput);
      el.removeEventListener('compositionstart', handleCompositionStart);
      el.removeEventListener('compositionupdate', handleCompositionUpdate);
      el.removeEventListener('compositionend', handleCompositionEnd);
      el.removeEventListener('focus', handleFocus);
      el.removeEventListener('blur', handleBlur);
    };
  }, [
    currentWord,
    currentIndex,
    words.length,
    isComplete,
    handleAllComplete,
    isValidPrefix,
    startTime,
  ]);

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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleClick = () => inputRef.current?.focus();
    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, []);

  if (!currentWord) {
    return (
      <div className="text-muted-foreground">
        {t('typing.wordPractice.noWordsAvailable', { defaultValue: 'No words available' })}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col w-full h-full relative font-sans overflow-hidden focus:outline-none"
      style={{ touchAction: 'none', userSelect: 'none' }}
    >
      <div className="w-full max-w-5xl flex flex-col items-center justify-center relative -mt-8 flex-1">
        <div className="flex flex-col items-center relative z-20 mb-12">
          <div className="text-[10px] font-bold text-blue-600/80 tracking-[0.22em] mb-4 uppercase">
            {t('typing.wordPractice.wordToType', { defaultValue: 'Word to Type' })}
          </div>

          <div className="word-prompt-card px-16 py-8 rounded-[2rem] flex flex-col items-center justify-center relative min-w-[300px]">
            <div className="text-5xl font-black tracking-tight mb-2 text-slate-900">
              {currentWord.word}
            </div>
            <div className="text-blue-100/85 font-semibold text-sm">
              {currentWord.meaning ||
                t('typing.wordPractice.noMeaning', {
                  defaultValue: 'No meaning',
                })}
            </div>
          </div>
        </div>

        <div className="relative flex flex-col items-center z-10 w-full h-32 justify-start">
          <div className="relative flex items-center justify-center h-16">
            {currentWord.word.split('').map((char, idx) => {
              const isCompleted = idx < typingProgress.completedChars;
              const isCurrent = idx === typingProgress.completedChars;
              const isRemaining = idx > typingProgress.completedChars;
              const currentDisplay =
                isCurrent && typingProgress.currentDisplayChar
                  ? typingProgress.currentDisplayChar
                  : char;

              return (
                <div
                  key={`${char}-${idx}`}
                  className="relative flex flex-col items-center justify-end mx-0 leading-none min-w-[3.5rem]"
                >
                  <span className="relative inline-block">
                    <span
                      className={`text-6xl font-black transition-colors duration-150 leading-tight block
                                      ${isCompleted ? 'text-muted-foreground' : ''}
                                      ${isCurrent && typingProgress.isError ? 'text-red-500 scale-110' : ''}
                                      ${isCurrent && !typingProgress.isError ? 'text-blue-700 scale-110' : ''}
                                      ${isRemaining ? 'text-muted-foreground opacity-100' : ''}
                                  `}
                    >
                      {currentDisplay}
                    </span>

                    {isCurrent && isFocused && (
                      <div
                        className={`
                                          absolute top-1 bottom-1 w-1 bg-blue-500 rounded-full animate-pulse
                                          ${typingProgress.currentDisplayChar ? '-right-2' : '-left-2'}
                                      `}
                      ></div>
                    )}
                  </span>

                  {isCurrent && typingProgress.currentDisplayChar && currentDisplay !== char && (
                    <div className="absolute top-full mt-2 text-sm font-bold text-muted-foreground uppercase tracking-widest">
                      {char}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="w-64 h-px bg-slate-300/80 mt-6 rounded-full"></div>
        </div>

        {currentIndex > 0 && (
          <div className="hidden lg:flex absolute left-10 top-1/2 -translate-y-1/2 flex-col items-end opacity-30 transform -translate-x-4 blur-[1px] transition-all duration-500">
            <span className="text-4xl font-bold text-muted-foreground">
              {words[currentIndex - 1].word}
            </span>
          </div>
        )}

        {currentIndex < words.length - 1 && (
          <div className="hidden lg:flex absolute right-10 top-1/2 -translate-y-1/2 flex-col items-start opacity-30 transform translate-x-4 blur-[0.5px] transition-all duration-500">
            <span className="text-4xl font-bold text-muted-foreground">
              {words[currentIndex + 1].word}
            </span>
            <span className="text-sm font-bold text-muted-foreground mt-1 ml-1">
              {words[currentIndex + 1].meaning}
            </span>
          </div>
        )}

        {currentIndex < words.length - 2 && (
          <div className="hidden xl:flex absolute right-0 top-1/2 -translate-y-1/2 flex-col items-start opacity-10 transform translate-x-8 blur-[2px] transition-all duration-500">
            <span className="text-3xl font-bold text-muted-foreground">
              {words[currentIndex + 2].word}
            </span>
          </div>
        )}
      </div>

      <div
        className="flex-shrink-0 pt-3 pb-4 px-4"
        style={{
          background: 'linear-gradient(to top, #f1f5f9 0%, #ffffff 100%)',
          borderTop: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        <div className="w-full max-w-[90rem] mx-auto">
          <div className="flex justify-between items-center mb-2 px-3">
            <div className="flex items-center gap-4 text-muted-foreground text-xs font-medium">
              <Button
                variant="ghost"
                size="auto"
                onClick={onBack}
                className="flex items-center gap-1.5 hover:text-muted-foreground transition-colors"
              >
                ←{' '}
                <span className="flex items-center gap-1.5">
                  📝 {t('typing.wordPractice.wordDrillLabel', { defaultValue: 'Word practice' })}
                </span>
              </Button>
            </div>
            <div className="flex gap-1.5">
              <div className="w-2 h-2 rounded-full bg-orange-500 shadow-sm"></div>
            </div>
          </div>

          <KeyboardHints
            nextJamo={typingProgress.nextJamo}
            targetChar={typingProgress.currentTargetChar || currentWord.word}
            hasError={typingProgress.isError}
          />
        </div>
      </div>

      <HiddenInput
        ref={inputRef}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
    </div>
  );
};
