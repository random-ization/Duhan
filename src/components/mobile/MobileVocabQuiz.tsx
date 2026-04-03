import React, { useEffect } from 'react';
import { Settings, Check, X, ChevronRight, HelpCircle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui';
import { Input } from '../ui';
import type {
  PendingAdvanceReason,
  QuizQuestion,
  OptionState,
  WritingState,
} from '../../features/vocab/components/VocabQuiz';
import type { Labels } from '../../utils/i18n';

interface MobileVocabQuizProps {
  readonly currentQuestion: QuizQuestion;
  readonly labels: Labels;
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
  readonly setPendingAdvanceReason: (reason: PendingAdvanceReason) => void;
  readonly nextQuestionRef: React.RefObject<() => void>;

  // Writing props
  readonly inputRef: React.RefObject<HTMLInputElement | null>;
  readonly writingInput: string;
  readonly setWritingInput: (value: string) => void;
  readonly writingState: WritingState;
  readonly handleWritingSubmit: () => void;
}

const getQuestionText = (question: QuizQuestion): string =>
  question.direction === 'NATIVE_TO_KR' ? question.targetWord.english : question.targetWord.korean;

const getPromptText = (question: QuizQuestion, isWriting: boolean, labels: Labels): string => {
  if (isWriting) {
    return question.direction === 'KR_TO_NATIVE'
      ? labels.dashboard?.quiz?.enterMeaning || 'Enter meaning...'
      : labels.dashboard?.quiz?.enterKorean || 'Enter Korean...';
  }
  return question.direction === 'KR_TO_NATIVE'
    ? labels.dashboard?.quiz?.questionMeaning || 'What does this mean?'
    : labels.dashboard?.quiz?.questionKorean || 'What is the Korean?';
};

const getOptionClass = (state: OptionState) => {
  const base =
    'relative w-full p-6 rounded-[1.8rem] border-2 font-black text-xl transition-all active:scale-[0.97] flex items-center justify-between shadow-sm overflow-hidden group';
  switch (state) {
    case 'correct':
      return cn(
        base,
        'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-400 shadow-emerald-200/50'
      );
    case 'wrong':
      return cn(
        base,
        'bg-rose-500/10 border-rose-500 text-rose-700 dark:text-rose-400 shadow-rose-200/50 animate-shake'
      );
    case 'selected':
      return cn(base, 'bg-indigo-500/10 border-indigo-500 text-indigo-700 dark:text-indigo-400');
    default:
      return cn(
        base,
        'bg-card border-border/40 text-muted-foreground hover:bg-muted/50 hover:border-border'
      );
  }
};

const WritingAnswerArea: React.FC<{
  inputRef: React.RefObject<HTMLInputElement | null>;
  writingInput: string;
  setWritingInput: (value: string) => void;
  writingState: WritingState;
  handleWritingSubmit: () => void;
  labels: Labels;
  currentQuestion: QuizQuestion;
}> = ({
  inputRef,
  writingInput,
  setWritingInput,
  writingState,
  handleWritingSubmit,
  labels,
  currentQuestion,
}) => {
  const dashboardQuiz = labels.dashboard?.quiz;
  const placeholder =
    currentQuestion.direction === 'KR_TO_NATIVE'
      ? dashboardQuiz?.enterMeaning || 'Enter meaning...'
      : dashboardQuiz?.enterKorean || 'Enter Korean...';

  return (
    <div className="space-y-6">
      <div
        className={cn(
          'relative bg-card rounded-[2.5rem] border-2 p-6 transition-all shadow-xl',
          writingState === 'CORRECT'
            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10'
            : writingState === 'WRONG'
              ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-500/10'
              : 'border-border/40 focus-within:border-indigo-500 focus-within:shadow-indigo-500/10'
        )}
      >
        <Input
          ref={inputRef}
          type="text"
          value={writingInput}
          onChange={e => setWritingInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && writingState === 'INPUT' && handleWritingSubmit()}
          className="w-full text-3xl font-black text-center bg-transparent outline-none text-foreground placeholder:text-muted-foreground italic tracking-tight"
          placeholder={placeholder}
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
          className="w-full py-5 bg-black dark:bg-zinc-800 text-white font-black rounded-[2rem] shadow-2xl active:scale-95 transition-all disabled:opacity-30 disabled:active:scale-100 flex items-center justify-center gap-2"
        >
          <span>{labels.dashboard?.quiz?.submit || 'Check Answer'}</span>
          <ChevronRight size={20} />
        </Button>
      )}

      <div className="min-h-[60px] flex items-center justify-center">
        {writingState === 'CORRECT' && (
          <div className="flex items-center justify-center gap-3 text-emerald-600 dark:text-emerald-400 font-black text-xl animate-in zoom-in slide-in-from-top-4">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
              <Check size={24} />
            </div>
            <span>{dashboardQuiz?.correct || 'Correct!'}</span>
          </div>
        )}
        {writingState === 'WRONG' && (
          <div className="text-center animate-in zoom-in slide-in-from-top-4">
            <div className="flex items-center justify-center gap-2 text-rose-600 dark:text-rose-400 font-black text-xl mb-2">
              <X size={24} /> <span>{dashboardQuiz?.incorrect || 'Oops!'}</span>
            </div>
            <p className="text-muted-foreground text-xs font-black uppercase tracking-widest mb-1 opacity-70">
              {dashboardQuiz?.correctAnswer || 'Target answer:'}
            </p>
            <p className="text-foreground font-black text-2xl italic tracking-tighter">
              {currentQuestion.direction === 'KR_TO_NATIVE'
                ? currentQuestion.targetWord.english
                : currentQuestion.targetWord.korean}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const ChoiceAnswerArea: React.FC<{
  currentQuestion: QuizQuestion;
  optionStates: readonly OptionState[];
  handleOptionClick: (index: number) => void;
  isLocked: boolean;
}> = ({ currentQuestion, optionStates, handleOptionClick, isLocked }) => (
  <div className="space-y-4">
    {currentQuestion.options?.map((option, idx) => {
      const state = optionStates[idx];
      const text = currentQuestion.direction === 'KR_TO_NATIVE' ? option.english : option.korean;
      return (
        <Button
          variant="ghost"
          size="auto"
          key={`${option.id}-${idx}`}
          onClick={() => handleOptionClick(idx)}
          className={getOptionClass(state)}
          disabled={isLocked}
        >
          <span className="italic tracking-tight">{text}</span>
          <div className="flex items-center gap-2">
            {state === 'correct' && (
              <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center scale-110 shadow-lg shadow-emerald-500/30">
                <Check size={18} strokeWidth={4} />
              </div>
            )}
            {state === 'wrong' && (
              <div className="w-8 h-8 rounded-full bg-rose-500 text-white flex items-center justify-center scale-110 shadow-lg shadow-rose-500/30">
                <X size={18} strokeWidth={4} />
              </div>
            )}
          </div>
        </Button>
      );
    })}
  </div>
);

const PendingAdvanceBar: React.FC<{
  labels: Labels;
  setPendingAdvanceReason: (reason: PendingAdvanceReason) => void;
  nextQuestionRef: React.RefObject<() => void>;
}> = ({ labels, setPendingAdvanceReason, nextQuestionRef }) => (
  <div className="fixed bottom-0 left-0 right-0 p-6 bg-card border-t border-border/50 pb-safe shadow-[0_-20px_50px_rgba(0,0,0,0.1)] rounded-t-[3rem] animate-in slide-in-from-bottom-full duration-500 z-50">
    <div className="flex items-center justify-between mb-4 px-2">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
          <HelpCircle size={20} />
        </div>
        <div>
          <p className="font-black text-foreground tracking-tight">
            {labels.dashboard?.quiz?.reviewLater || 'Review logic active'}
          </p>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-70">
            {labels.dashboard?.quiz?.reviewSoon || 'Scheduled for next cycle'}
          </p>
        </div>
      </div>
    </div>
    <Button
      variant="ghost"
      size="auto"
      onClick={() => {
        setPendingAdvanceReason(null);
        nextQuestionRef.current?.();
      }}
      className="w-full py-5 bg-black dark:bg-zinc-800 text-white font-black rounded-[2rem] shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
    >
      <span className="text-lg italic tracking-tight">
        {labels.common?.continue || 'Next Question'}
      </span>
      <ChevronRight size={22} className="group-hover:translate-x-1 transition-transform" />
    </Button>
  </div>
);

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
  const questionText = getQuestionText(currentQuestion);
  const promptText = getPromptText(currentQuestion, isWriting, labels);

  return (
    <div className="flex flex-col h-full bg-muted">
      {/* Header / Progress */}
      <div className="px-6 pt-8 pb-4 bg-card rounded-b-[2rem] border-b border-border/40 shadow-sm">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-70">
            Progress {questionIndex + 1} / {totalQuestions}
          </span>
          {!settingsLocked && (
            <Button
              variant="ghost"
              size="auto"
              onClick={() => setShowSettings(true)}
              className="p-1.5 -mr-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings size={16} strokeWidth={3} />
            </Button>
          )}
        </div>
        {/* Smooth Progress Bar */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-green-500 transition-all duration-700 ease-out rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]"
            style={{ width: `${((questionIndex + 1) / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col px-6 py-6 overflow-y-auto">
        {/* Question Card */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-[180px] max-h-[260px] mb-8 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-primary/5 blur-[60px] rounded-full -z-10" />

          <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.25em] mb-6 opacity-60">
            {promptText}
          </p>
          <h1 className="text-4xl sm:text-5xl font-black text-foreground text-center leading-tight italic tracking-tighter shadow-sm">
            {questionText}
          </h1>
        </div>

        {/* Answer Area */}
        <div className="flex-1 pb-safe-offset">
          {isWriting ? (
            <WritingAnswerArea
              inputRef={inputRef}
              writingInput={writingInput}
              setWritingInput={setWritingInput}
              writingState={writingState}
              handleWritingSubmit={handleWritingSubmit}
              labels={labels}
              currentQuestion={currentQuestion}
            />
          ) : (
            <ChoiceAnswerArea
              currentQuestion={currentQuestion}
              optionStates={optionStates}
              handleOptionClick={handleOptionClick}
              isLocked={isLocked}
            />
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
              <span>{labels.dashboard?.quiz?.dontKnow || "I don't know"}</span>
            </Button>
          )}

          {/* Continue / Next Button (if Pending Advance) */}
          {pendingAdvance && (
            <PendingAdvanceBar
              labels={labels}
              setPendingAdvanceReason={setPendingAdvanceReason}
              nextQuestionRef={nextQuestionRef}
            />
          )}
        </div>
      </div>

      <style>{`
          @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
          .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
          .pb-safe-offset { padding-bottom: calc(env(safe-area-inset-bottom) + 80px); }
        `}</style>
    </div>
  );
}
