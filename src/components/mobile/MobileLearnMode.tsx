import { useEffect, useMemo, useRef, useState } from 'react';
import { Volume2, Check, X, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui';
import { useTTS } from '../../hooks/useTTS';
import { KT } from './ksoft/ksoft';

type QuestionLanguage = 'KOREAN' | 'NATIVE';

type MobileLearnWord = Readonly<{
  id: string;
  korean: string;
  english: string;
  word?: string;
  meaning?: string;
  pronunciation?: string;
}>;

type QuizOption = Readonly<{
  key: string;
  text: string;
  isCorrect: boolean;
}>;

type AnswerState = 'correct' | 'wrong' | null;

const FALLBACK_OPTIONS = ['...', '...', '...'] as const;

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function deterministicSort<T>(
  items: readonly T[],
  getKey: (item: T) => string,
  seed: string
): T[] {
  return [...items].sort((left, right) => {
    const leftKey = getKey(left);
    const rightKey = getKey(right);
    const leftHash = hashString(`${seed}:${leftKey}`);
    const rightHash = hashString(`${seed}:${rightKey}`);
    if (leftHash !== rightHash) {
      return leftHash - rightHash;
    }
    return leftKey.localeCompare(rightKey);
  });
}

function getKoreanText(word: MobileLearnWord): string {
  return word.korean || word.word || '';
}

function getNativeText(word: MobileLearnWord): string {
  return word.english || word.meaning || '';
}

function getAnswerText(word: MobileLearnWord, questionLanguage: QuestionLanguage): string {
  return questionLanguage === 'KOREAN' ? getNativeText(word) : getKoreanText(word);
}

function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getSegmentQuestionIndex(slot: number, totalSlots: number, totalQuestions: number): number {
  if (totalQuestions <= 1) return 0;
  const ratio = slot / Math.max(1, totalSlots - 1);
  return Math.min(totalQuestions - 1, Math.round(ratio * (totalQuestions - 1)));
}

export interface MobileLearnModeProps {
  readonly words: readonly MobileLearnWord[];
  readonly initialIndex?: number;
  readonly onProgressChange?: (index: number, total: number) => void;
  readonly onComplete?: () => void;
  readonly onFsrsReview?: (wordId: string, isCorrect: boolean) => void;
}

export function MobileLearnMode({ words, initialIndex = 0, onProgressChange, onComplete, onFsrsReview }: MobileLearnModeProps) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [selectedOptionKey, setSelectedOptionKey] = useState<string | null>(null);
  const [revealCorrect, setRevealCorrect] = useState(false);
  const questionLang: QuestionLanguage = 'KOREAN';
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [answerStates, setAnswerStates] = useState<AnswerState[]>(() => words.map(() => null));

  const { speak } = useTTS();
  const revealTimeoutRef = useRef<number | null>(null);

  const currentWord = words[currentIndex] ?? null;
  const korean = currentWord ? getKoreanText(currentWord) : '';
  const nativeText = currentWord ? getNativeText(currentWord) : '';
  const pronunciation = currentWord?.pronunciation || '';
  const optionSeed = currentWord ? `${currentWord.id}:${questionLang}` : `empty:${questionLang}`;

  useEffect(() => {
    if (korean && !hasAnswered && questionLang === 'KOREAN') {
      void speak(korean);
    }
  }, [hasAnswered, korean, questionLang, speak]);

  useEffect(() => {
    return () => {
      if (revealTimeoutRef.current !== null) {
        window.clearTimeout(revealTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => {
      window.clearInterval(timerId);
    };
  }, []);

  useEffect(() => {
    const schedule =
      typeof globalThis.queueMicrotask === 'function'
        ? globalThis.queueMicrotask
        : (callback: () => void) => {
            globalThis.setTimeout(callback, 0);
          };

    schedule(() => {
      setAnswerStates(prev => {
        if (prev.length === words.length) return prev;
        return words.map((_, idx) => prev[idx] ?? null);
      });
    });
  }, [words]);

  const correctOption = questionLang === 'KOREAN' ? nativeText : korean;
  const distractors = useMemo(() => {
    if (words.length === 0) {
      return [...FALLBACK_OPTIONS];
    }

    const otherWords = deterministicSort(
      words.filter(
        (word, index) => index !== currentIndex && getAnswerText(word, questionLang).trim().length
      ),
      word => word.id,
      `distractors:${optionSeed}`
    );

    return [
      ...otherWords.slice(0, 3).map(word => getAnswerText(word, questionLang)),
      ...FALLBACK_OPTIONS,
    ].slice(0, 3);
  }, [currentIndex, optionSeed, questionLang, words]);

  const options = useMemo(() => {
    const optionList: QuizOption[] = [
      {
        key: `${optionSeed}:correct`,
        text: correctOption,
        isCorrect: true,
      },
      ...distractors.map((text, index) => ({
        key: `${optionSeed}:distractor:${index}:${text}`,
        text,
        isCorrect: false,
      })),
    ];

    return deterministicSort(optionList, option => option.key, `options:${optionSeed}`);
  }, [correctOption, distractors, optionSeed]);

  const progressSegments = useMemo(() => {
    const totalSlots = Math.min(20, Math.max(8, words.length));
    return Array.from({ length: totalSlots }, (_, slot) => {
      const representedIndex = getSegmentQuestionIndex(slot, totalSlots, words.length);
      const state = answerStates[representedIndex] ?? null;
      const isCurrent = representedIndex === currentIndex && !hasAnswered;
      const isFuture =
        representedIndex > currentIndex || (representedIndex === currentIndex && hasAnswered);
      return { representedIndex, state, isCurrent, isFuture };
    });
  }, [answerStates, currentIndex, hasAnswered, words.length]);

  if (!currentWord) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-slate-500">
        <p className="font-bold">
          {t('mobileLearnMode.emptyWords', { defaultValue: 'No words available' })}
        </p>
        <Button onClick={onComplete} className="mt-4">
          {t('common.back', { defaultValue: 'Back' })}
        </Button>
      </div>
    );
  }

  const moveToNext = () => {
    if (revealTimeoutRef.current !== null) {
      window.clearTimeout(revealTimeoutRef.current);
      revealTimeoutRef.current = null;
    }

    if (currentIndex + 1 < words.length) {
      setCurrentIndex(prev => {
        const next = prev + 1;
        if (onProgressChange) onProgressChange(next, words.length);
        return next;
      });
      setHasAnswered(false);
      setSelectedOptionKey(null);
      setRevealCorrect(false);
      return;
    }

    if (onProgressChange) onProgressChange(words.length, words.length);
    if (onComplete) onComplete();
  };

  const handleAnswer = (optionKey: string, isCorrect: boolean) => {
    if (hasAnswered) return;
    setHasAnswered(true);
    setSelectedOptionKey(optionKey);
    setAnswerStates(prev => {
      const next = [...prev];
      next[currentIndex] = isCorrect ? 'correct' : 'wrong';
      return next;
    });

    if (revealTimeoutRef.current !== null) {
      window.clearTimeout(revealTimeoutRef.current);
      revealTimeoutRef.current = null;
    }

    if (isCorrect) {
      setRevealCorrect(true);
    } else {
      revealTimeoutRef.current = window.setTimeout(() => {
        setRevealCorrect(true);
        revealTimeoutRef.current = null;
      }, 250);
    }

    if (onFsrsReview) {
      onFsrsReview(currentWord.id, isCorrect);
    }
  };

  const handleSkip = () => {
    if (hasAnswered) return;
    setAnswerStates(prev => {
      const next = [...prev];
      next[currentIndex] = 'wrong';
      return next;
    });
    if (onFsrsReview) onFsrsReview(currentWord.id, false);
    moveToNext();
  };

  const handleNext = () => {
    if (!hasAnswered) return;
    moveToNext();
  };

  const promptText =
    questionLang === 'KOREAN'
      ? t('vocab.learnPromptMeaning', { defaultValue: 'What does the following word mean?' })
      : t('vocab.learnPromptKorean', { defaultValue: 'Which Korean word matches the following meaning?' });
  const promptWord = questionLang === 'KOREAN' ? korean : nativeText;
  const hintText =
    questionLang === 'KOREAN'
      ? pronunciation
        ? `“${pronunciation}”`
        : `“${t('vocab.learnSelectCorrect', { defaultValue: 'Please choose the correct answer' })}”`
      : `“${t('vocab.learnSelectCorrect', { defaultValue: 'Please choose the correct answer' })}”`;
  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden"
      style={{
        background: KT.bg,
        color: KT.ink,
        fontFamily: KT.font,
      }}
    >
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 'calc(env(safe-area-inset-top) + 16px) 18px 16px',
          }}
        >
          <div style={{ width: '100%', maxWidth: 440, margin: '0 auto' }}>
            <header style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  if (onComplete) onComplete();
                }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  border: `1px solid ${KT.line}`,
                  background: KT.card,
                  boxShadow: KT.shSm,
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
                aria-label="关闭"
              >
                <X size={18} color={KT.ink} />
              </button>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: KT.sub, letterSpacing: 0.2 }}>学习模式 · 试</div>
                <div style={{ marginTop: 2, fontSize: 18, fontWeight: 800, color: KT.ink, lineHeight: 1.1 }}>
                  第 {currentIndex + 1} 题
                  <span style={{ fontSize: 14, fontWeight: 700, color: KT.ink2 }}> / {words.length}</span>
                </div>
              </div>

              <div
                style={{
                  flexShrink: 0,
                  minWidth: 72,
                  height: 38,
                  borderRadius: 19,
                  background: KT.ink,
                  color: KT.card,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 16,
                  fontWeight: 800,
                  fontVariantNumeric: 'tabular-nums',
                  padding: '0 12px',
                }}
              >
                {formatDuration(elapsedSeconds)}
              </div>
            </header>

            <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: `repeat(${progressSegments.length}, 1fr)`, gap: 5 }}>
              {progressSegments.map((segment, idx) => {
                let background = 'rgba(31,27,23,0.1)';
                if (segment.isCurrent) {
                  background = KT.ink;
                } else if (segment.state === 'correct') {
                  background = KT.mintDeep;
                } else if (segment.state === 'wrong') {
                  background = KT.pinkDeep;
                } else if (segment.isFuture) {
                  background = 'rgba(31,27,23,0.1)';
                }

                return (
                  <span
                    key={`progress-${segment.representedIndex}-${idx}`}
                    style={{ height: 6, borderRadius: 999, background }}
                  />
                );
              })}
            </div>

            <section
              style={{
                marginTop: 16,
                background: KT.card,
                border: `1px solid ${KT.line}`,
                boxShadow: KT.sh,
                borderRadius: 24,
                padding: '16px 16px 14px',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 800, color: KT.sub, letterSpacing: 0.2, marginBottom: 8 }}>{promptText}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ fontSize: questionLang === 'KOREAN' ? 44 : 28, fontWeight: 800, color: KT.ink, lineHeight: 1.08 }}>
                  {promptWord}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (questionLang === 'KOREAN') {
                      void speak(korean);
                    } else {
                      void speak(nativeText);
                    }
                  }}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    border: 'none',
                    background: KT.ink,
                    color: KT.card,
                    display: 'grid',
                    placeItems: 'center',
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                  aria-label="播放发音"
                >
                  <Volume2 size={18} />
                </button>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: KT.sub, fontStyle: 'italic' }}>{hintText}</div>
            </section>

            <section style={{ marginTop: 14, display: 'grid', gap: 10 }}>
              {options.map((option, idx) => {
                const isSelected = selectedOptionKey === option.key;
                const showAsCorrect = hasAnswered && revealCorrect && option.isCorrect;
                const showAsWrong = hasAnswered && isSelected && !option.isCorrect;

                let background: string = KT.card;
                let border: string = `1px solid ${KT.line}`;
                let textColor: string = KT.ink;
                let badgeBackground: string = KT.bg2;
                let badgeTextColor: string = KT.ink;

                if (showAsCorrect) {
                  background = `${KT.mint}66`;
                  border = `2px solid ${KT.mintDeep}`;
                  textColor = KT.mintDeep;
                  badgeBackground = KT.mintDeep;
                  badgeTextColor = KT.card;
                } else if (showAsWrong) {
                  background = `${KT.pink}66`;
                  border = `2px solid ${KT.pinkDeep}`;
                  textColor = KT.pinkDeep;
                  badgeBackground = KT.pinkDeep;
                  badgeTextColor = KT.card;
                }

                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => handleAnswer(option.key, option.isCorrect)}
                    disabled={hasAnswered}
                    style={{
                      minHeight: 74,
                      borderRadius: 18,
                      border,
                      background,
                      boxShadow: KT.shSm,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 14px',
                      cursor: hasAnswered ? 'default' : 'pointer',
                    }}
                  >
                    <span
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 11,
                        background: badgeBackground,
                        color: badgeTextColor,
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 20,
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      {['A', 'B', 'C', 'D'][idx]}
                    </span>
                    <span
                      style={{
                        flex: 1,
                        fontSize: 14,
                        fontWeight: 700,
                        color: textColor,
                        textAlign: 'left',
                        lineHeight: 1.2,
                      }}
                    >
                      {option.text}
                    </span>
                    {showAsCorrect ? <Check size={20} color={KT.mintDeep} /> : null}
                    {showAsWrong ? <X size={20} color={KT.pinkDeep} /> : null}
                  </button>
                );
              })}
            </section>

          </div>
        </div>

        <footer
          style={{
            borderTop: `1px solid ${KT.line}`,
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            padding: '12px 18px calc(env(safe-area-inset-bottom) + 12px)',
          }}
        >
          <div style={{ width: '100%', maxWidth: 440, margin: '0 auto', display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={handleSkip}
              disabled={hasAnswered}
              style={{
                flex: 0.34,
                minHeight: 48,
                borderRadius: 16,
                border: `1px solid ${KT.line2}`,
                background: KT.card,
                color: KT.ink2,
                fontSize: 15,
                fontWeight: 700,
                cursor: hasAnswered ? 'default' : 'pointer',
                opacity: hasAnswered ? 0.45 : 1,
              }}
            >
              跳过
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={!hasAnswered}
              style={{
                flex: 1,
                minHeight: 48,
                borderRadius: 16,
                border: 'none',
                background: KT.ink,
                color: KT.card,
                fontSize: 15,
                fontWeight: 800,
                letterSpacing: 0.2,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                cursor: hasAnswered ? 'pointer' : 'default',
                opacity: hasAnswered ? 1 : 0.36,
              }}
            >
              {currentIndex + 1 === words.length ? '完成' : '下一题'}
              <ChevronRight size={16} />
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}
