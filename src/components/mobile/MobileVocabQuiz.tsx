import React, { useEffect } from 'react';
import { Settings, Check, X, ChevronRight, HelpCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui';
import { Input } from '../ui';
import type {
  QuizQuestion,
  OptionState,
  WritingState,
} from '../../features/vocab/components/VocabQuiz';

interface MobileVocabQuizProps {
  readonly currentQuestion: QuizQuestion;
  readonly labels: any;
  readonly isLearn: boolean;
  readonly questionIndex: number;
  readonly totalQuestions: number;
  readonly settingsLocked: boolean;
  readonly setShowSettings: (show: boolean) => void;
  readonly optionStates: readonly OptionState[];
  readonly handleOptionClick: (index: number) => void;
  readonly isLocked: boolean;
  readonly handleDontKnow: () => void;
  readonly pendingAdvance: boolean;
  readonly setPendingAdvanceReason: (reason: any) => void;
  readonly nextQuestionRef: React.RefObject<() => void>;

  // Writing props
  readonly inputRef: React.RefObject<HTMLInputElement>;
  readonly writingInput: string;
  readonly setWritingInput: (value: string) => void;
  readonly writingState: WritingState;
  readonly handleWritingSubmit: () => void;
}

export function MobileVocabQuiz({
  currentQuestion,
  labels,
  isLearn,
  questionIndex,
  totalQuestions,
  settingsLocked,
  setShowSettings,
  optionStates,
  handleOptionClick,
  isLocked,
  handleDontKnow,
  pendingAdvance,
  setPendingAdvanceReason,
  nextQuestionRef,
  inputRef,
  writingInput,
  setWritingInput,
  writingState,
  handleWritingSubmit,
}: MobileVocabQuizProps) {
  // Auto focus input on writing mode
  useEffect(() => {
    if (currentQuestion.type === 'WRITING' && writingState === 'INPUT') {
      // specific to mobile, maybe we DON'T want auto focus to avoid keyboard popping up immediately?
      // But usually yes.
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [currentQuestion, writingState, inputRef]);

  const isWriting = currentQuestion.type === 'WRITING';

  const questionText =
    currentQuestion.direction === 'NATIVE_TO_KR'
      ? currentQuestion.targetWord.english
      : currentQuestion.targetWord.korean;

  const promptText = isWriting
    ? currentQuestion.direction === 'KR_TO_NATIVE'
      ? labels.dashboard?.quiz?.enterMeaning || 'Enter meaning...'
      : labels.dashboard?.quiz?.enterKorean || 'Enter Korean...'
    : currentQuestion.direction === 'KR_TO_NATIVE'
      ? labels.dashboard?.quiz?.questionMeaning || 'What does this mean?'
      : labels.dashboard?.quiz?.questionKorean || 'What is the Korean?';

  // Helper for option class
  const getOptionClass = (state: OptionState) => {
    const base =
      'relative w-full p-5 rounded-2xl border-b-4 border-2 font-bold text-lg transition-all active:scale-[0.98] flex items-center justify-between';
    switch (state) {
      case 'correct':
        return cn(base, 'bg-lime-100 border-lime-500 text-lime-800 border-b-lime-600');
      case 'wrong':
        return cn(
          base,
          'bg-rose-100 border-rose-500 text-rose-800 border-b-rose-600 animate-shake'
        );
      case 'selected':
        return cn(base, 'bg-indigo-100 border-indigo-500 text-indigo-800');
      default:
        return cn(base, 'bg-card border-border text-muted-foreground hover:bg-muted');
    }
  };

  return (
    <div className="flex flex-col h-full bg-muted">
      {/* Header / Progress */}
      <div className="px-6 pt-6 pb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-muted-foreground font-mono tracking-wider">
            {questionIndex + 1} / {totalQuestions}
          </span>
          {!settingsLocked && (
            <Button
              variant="ghost"
              size="auto"
              onClick={() => setShowSettings(true)}
              className="p-2 -mr-2 text-muted-foreground hover:text-muted-foreground"
            >
              <Settings size={18} />
            </Button>
          )}
        </div>
        {/* Smooth Progress Bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-lime-500 transition-all duration-500 ease-out rounded-full"
            style={{ width: `${((questionIndex + 1) / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col px-6 py-4 overflow-y-auto">
        {/* Question Card */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-[160px] max-h-[220px] mb-6">
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-4">
            {promptText}
          </p>
          <h1 className="text-4xl sm:text-5xl font-black text-foreground text-center leading-tight">
            {questionText}
          </h1>
        </div>

        {/* Answer Area */}
        <div className="flex-1 pb-safe-offset">
          {isWriting ? (
            <div className="space-y-4">
              <div
                className={cn(
                  'relative bg-card rounded-2xl border-2 p-4 transition-colors',
                  writingState === 'CORRECT'
                    ? 'border-lime-500 bg-lime-50'
                    : writingState === 'WRONG'
                      ? 'border-rose-500 bg-rose-50'
                      : 'border-border focus-within:border-indigo-500 shadow-sm'
                )}
              >
                <Input
                  ref={inputRef as any}
                  type="text"
                  value={writingInput}
                  onChange={e => setWritingInput(e.target.value)}
                  onKeyDown={e =>
                    e.key === 'Enter' && writingState === 'INPUT' && handleWritingSubmit()
                  }
                  className="w-full text-2xl font-bold text-center bg-transparent outline-none text-muted-foreground placeholder:text-muted-foreground"
                  placeholder={isWriting ? 'Type answer...' : ''}
                  disabled={writingState !== 'INPUT'}
                  autoCapitalize="none"
                  autoComplete="off"
                />
              </div>

              {writingState === 'INPUT' && (
                <Button
                  variant="ghost"
                  size="auto"
                  onClick={handleWritingSubmit}
                  disabled={!writingInput.trim()}
                  className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
                >
                  {labels.dashboard?.quiz?.submit || 'Check'}
                </Button>
              )}

              {/* Feedback for Writing */}
              {writingState === 'CORRECT' && (
                <div className="flex items-center justify-center gap-2 text-lime-600 font-bold animate-in zoom-in">
                  <Check size={24} />
                  <span>Correct!</span>
                </div>
              )}
              {writingState === 'WRONG' && (
                <div className="text-center animate-in zoom-in">
                  <p className="text-rose-600 font-bold mb-1 flex items-center justify-center gap-2">
                    <X size={20} /> Wrong
                  </p>
                  <p className="text-muted-foreground text-sm">Correct answer:</p>
                  <p className="text-foreground font-black text-lg">
                    {currentQuestion.direction === 'KR_TO_NATIVE'
                      ? currentQuestion.targetWord.english
                      : currentQuestion.targetWord.korean}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {currentQuestion.options?.map((option, idx) => {
                const state = optionStates[idx];
                const text =
                  currentQuestion.direction === 'KR_TO_NATIVE' ? option.english : option.korean;

                return (
                  <Button
                    variant="ghost"
                    size="auto"
                    key={`${option.id}-${idx}`}
                    onClick={() => handleOptionClick(idx)}
                    className={getOptionClass(state)}
                    disabled={isLocked}
                  >
                    <span>{text}</span>
                    {state === 'correct' && <Check className="text-lime-600" size={24} />}
                    {state === 'wrong' && <X className="text-rose-600" size={24} />}
                  </Button>
                );
              })}
            </div>
          )}

          {/* I don't know button (Learn mode only) */}
          {isLearn && !isLocked && !isWriting && (
            <Button
              variant="ghost"
              size="auto"
              onClick={handleDontKnow}
              className="w-full mt-4 py-3 text-muted-foreground font-bold text-sm hover:text-muted-foreground flex items-center justify-center gap-2"
            >
              <HelpCircle size={16} />
              <span>I&apos;t know</span>
            </Button>
          )}

          {/* Continue / Next Button (if Pending Advance) */}
          {pendingAdvance && (
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-card border-t border-border pb-safe shadow-lg animate-in slide-in-from-bottom-full z-50">
              <div className="flex items-center justify-between mb-3 px-2">
                <div>
                  <p className="font-black text-muted-foreground">Review this later</p>
                  <p className="text-xs text-muted-foreground">We&apos;ll ask you again soon.</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="auto"
                onClick={() => {
                  setPendingAdvanceReason(null);
                  nextQuestionRef.current?.();
                }}
                className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span>Continue</span>
                <ChevronRight size={20} />
              </Button>
            </div>
          )}
        </div>
      </div>

      <style>{`
          @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
          .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
          .pb-safe { padding-bottom: env(safe-area-inset-bottom); }
          .pb-safe-offset { padding-bottom: calc(env(safe-area-inset-bottom) + 80px); }
        `}</style>
    </div>
  );
}
