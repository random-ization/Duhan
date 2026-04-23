import { useEffect, useMemo, useRef, useState } from 'react';
import { Volume2, Bookmark, Check, X, ChevronRight, MoreVertical } from 'lucide-react';
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../ui';
import { useTTS } from '../../hooks/useTTS';

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

export interface MobileLearnModeProps {
  readonly words: readonly MobileLearnWord[];
  readonly onComplete?: () => void;
  readonly onFsrsReview?: (wordId: string, isCorrect: boolean) => void;
}

export function MobileLearnMode({ words, onComplete, onFsrsReview }: MobileLearnModeProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [selectedOptionKey, setSelectedOptionKey] = useState<string | null>(null);
  const [revealCorrect, setRevealCorrect] = useState(false);
  const [questionLang, setQuestionLang] = useState<QuestionLanguage>('KOREAN');

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

  if (!currentWord) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-slate-500">
        <p className="font-bold">无单词数据</p>
        <Button onClick={onComplete} className="mt-4">
          返回
        </Button>
      </div>
    );
  }

  const handleAnswer = (optionKey: string, isCorrect: boolean) => {
    if (hasAnswered) return;
    setHasAnswered(true);
    setSelectedOptionKey(optionKey);

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

  const handleNext = () => {
    if (!hasAnswered) return;

    if (revealTimeoutRef.current !== null) {
      window.clearTimeout(revealTimeoutRef.current);
      revealTimeoutRef.current = null;
    }

    if (currentIndex + 1 < words.length) {
      setCurrentIndex(prev => prev + 1);
      setHasAnswered(false);
      setSelectedOptionKey(null);
      setRevealCorrect(false);
    } else if (onComplete) {
      onComplete();
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-x-hidden bg-transparent text-slate-900">
      <style>{`
        .card-sage {
            background: linear-gradient(150deg, #576359 0%, #404942 100%);
            box-shadow: 
                0 24px 48px -12px rgba(64, 73, 66, 0.4), 
                inset 0 1px 1px rgba(230, 255, 235, 0.15),
                inset 0 0 0 1px rgba(255,255,255,0.05);
            color: #ffffff;
        }

        .learn-option {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
            box-shadow: 0 4px 0 rgba(0, 0, 0, 0.2), 0 4px 8px rgba(0, 0, 0, 0.1);
            transition: all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
            cursor: pointer;
        }
        
        .learn-option.active-state,
        .learn-option:active {
            transform: translateY(4px);
            box-shadow: 0 0px 0 rgba(0, 0, 0, 0.2), 0 2px 4px rgba(0, 0, 0, 0.1);
            background: rgba(255, 255, 255, 0.12);
        }

        .learn-option.correct {
            transform: translateY(4px);
            box-shadow: 0 0px 0 rgba(0,0,0,0), 0 0 24px rgba(52, 211, 153, 0.4), inset 0 2px 4px rgba(52, 211, 153, 0.2);
            background: rgba(16, 185, 129, 0.15);
            border-color: rgba(52, 211, 153, 0.8);
            color: #A7F3D0 !important;
        }
        .learn-option.correct .option-icon {
            background: #10B981;
            color: #064E3B;
            border-color: #34D399;
        }
        .learn-option.correct .option-text {
            color: #A7F3D0;
        }

        .learn-option.wrong {
            transform: translateY(4px) scale(0.98);
            box-shadow: 0 0px 0 rgba(0,0,0,0), inset 0 2px 4px rgba(244, 63, 94, 0.2);
            background: rgba(225, 29, 72, 0.15);
            border-color: rgba(251, 113, 133, 0.8);
            color: #FECDD3 !important;
            animation: shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
        }
        @keyframes shake {
            10%, 90% { transform: translate3d(-1px, 2px, 0) scale(0.98); }
            20%, 80% { transform: translate3d(2px, 2px, 0) scale(0.98); }
            30%, 50%, 70% { transform: translate3d(-3px, 2px, 0) scale(0.98); }
            40%, 60% { transform: translate3d(3px, 2px, 0) scale(0.98); }
        }
      `}</style>

      <header className="header-glass pointer-events-auto fixed left-0 right-0 top-0 z-50 flex items-center justify-between px-5 pb-4 pt-14">
        <button
          className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-slate-200 bg-white/60 text-slate-700 shadow-sm transition-transform active:scale-95"
          onClick={() => {
            if (onComplete) onComplete();
          }}
        >
          <X className="h-5 w-5 text-slate-700" strokeWidth={2.5} />
        </button>

        <div className="mx-6 flex-1">
          <div className="mb-1.5 flex items-end justify-between px-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              学习进度
            </span>
            <span className="text-[12px] font-black text-slate-800">
              {currentIndex + 1}
              <span className="text-[10px] font-bold text-slate-400">/{words.length}</span>
            </span>
          </div>
          <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-slate-300/40 shadow-inner">
            <div
              className="rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / Math.max(1, words.length)) * 100}%` }}
            />
          </div>
        </div>

        <div className="relative flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-10 w-10 items-center justify-center bg-transparent text-slate-400 outline-none transition-transform active:scale-95">
                <MoreVertical className="h-5 w-5 text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              unstyled
              className="absolute right-0 top-full z-[96] mt-2 flex w-44 flex-col gap-0.5 overflow-hidden rounded-2xl border border-border bg-card/95 p-1 shadow-xl backdrop-blur-xl"
            >
              <div className="mb-1 rounded-t-xl bg-muted/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                测验语言
              </div>
              <button
                onClick={() => {
                  if (!hasAnswered) setQuestionLang('KOREAN');
                }}
                className={`flex w-full items-center justify-between rounded-[10px] px-3 py-3 text-[13px] font-black transition-colors ${
                  questionLang === 'KOREAN'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>韩语问题</span>
                {questionLang === 'KOREAN' && <Check className="ml-2 h-4 w-4" strokeWidth={3} />}
              </button>
              <button
                onClick={() => {
                  if (!hasAnswered) setQuestionLang('NATIVE');
                }}
                className={`flex w-full items-center justify-between rounded-[10px] px-3 py-3 text-[13px] font-black transition-colors ${
                  questionLang === 'NATIVE'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>中文问题</span>
                {questionLang === 'NATIVE' && <Check className="ml-2 h-4 w-4" strokeWidth={3} />}
              </button>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex min-h-screen h-full flex-col justify-end px-5 pb-8 pt-32">
        <main className="mx-auto flex-1 w-full max-w-[420px] space-y-12 px-5 pb-24">
          <section>
            <div className="card-sage relative flex w-full flex-col overflow-hidden rounded-[2.5rem] p-7">
              <div className="pointer-events-none absolute -left-10 -top-10 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />

              <div className="relative z-10 mb-6 flex items-start justify-between">
                <span className="rounded-md border border-white/20 bg-white/5 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-white/70">
                  即时测验
                </span>
                <button className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white/60 transition-colors hover:text-white">
                  <Bookmark className="h-4 w-4" />
                </button>
              </div>

              <div className="relative z-10 mb-10 text-center">
                <h4 className="mb-4 text-5xl font-black tracking-tight text-white drop-shadow-sm">
                  {questionLang === 'KOREAN' ? korean : nativeText}
                </h4>
                <div className="flex min-h-[28px] items-center justify-center space-x-2 text-white/60">
                  {questionLang === 'KOREAN' && (
                    <button
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
                      onClick={() => {
                        void speak(korean);
                      }}
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {questionLang === 'KOREAN' && pronunciation && (
                    <p className="text-[13px] font-mono tracking-widest">[{pronunciation}]</p>
                  )}
                </div>
              </div>

              <div className="relative z-10 space-y-4">
                {options.map((option, idx) => {
                  const isSelected = selectedOptionKey === option.key;
                  const showAsCorrect = hasAnswered && revealCorrect && option.isCorrect;
                  const showAsWrong = hasAnswered && isSelected && !option.isCorrect;

                  let classNames =
                    'learn-option w-full rounded-[1.2rem] py-4 px-5 flex items-center justify-between text-left';
                  let iconContent = (
                    <span className="text-[11px] font-black text-white/50 transition-colors">
                      {['A', 'B', 'C', 'D'][idx]}
                    </span>
                  );

                  let rootOpacity = 1;
                  if (hasAnswered && !showAsCorrect && !showAsWrong) {
                    rootOpacity = 0.4;
                  }

                  if (showAsCorrect) {
                    classNames += ' correct';
                    iconContent = <Check className="h-3.5 w-3.5" strokeWidth={3} />;
                  } else if (showAsWrong) {
                    classNames += ' wrong';
                    iconContent = <X className="h-3.5 w-3.5" strokeWidth={3} />;
                  }

                  return (
                    <button
                      key={option.key}
                      onClick={() => handleAnswer(option.key, option.isCorrect)}
                      className={classNames}
                      disabled={hasAnswered}
                      style={{ opacity: rootOpacity }}
                    >
                      <span className="option-text text-[15px] font-bold tracking-wide text-white">
                        {option.text}
                      </span>
                      <span className="option-icon flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/20 transition-colors">
                        {iconContent}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div
                className={`mt-8 border-t border-white/10 pt-5 transition-opacity duration-300 ${
                  hasAnswered ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
                }`}
              >
                <button
                  onClick={handleNext}
                  className="flex w-full items-center justify-center space-x-2 rounded-[1.2rem] bg-emerald-500 py-4 text-[14px] font-black tracking-widest text-slate-900 shadow-[0_8px_20px_-8px_rgba(16,185,129,0.8)] transition-transform active:scale-95"
                >
                  <span>下一个</span>
                  <ChevronRight className="h-3.5 w-3.5" strokeWidth={3} />
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
