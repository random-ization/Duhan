import React, { useEffect } from 'react';
import { Settings, Check, X, ChevronRight, HelpCircle } from 'lucide-react';
import { Input } from '../ui';
import type {
  PendingAdvanceReason,
  QuizQuestion,
  OptionState,
  WritingState,
} from '../../features/vocab/components/VocabQuiz';
import type { Labels } from '../../utils/i18n';
import { KT } from './ksoft/ksoft';

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

const getOptionColors = (state: OptionState): { bg: string; border: string; color: string } => {
  switch (state) {
    case 'correct':
      return { bg: 'rgba(61,175,130,0.12)', border: '#3DAF82', color: '#1A7A56' };
    case 'wrong':
      return { bg: 'rgba(162,59,46,0.1)', border: KT.crimson, color: KT.crimson };
    case 'selected':
      return { bg: 'rgba(104,91,172,0.1)', border: '#6B5BAC', color: '#6B5BAC' };
    case 'normal':
    default:
      return { bg: KT.card, border: KT.line2, color: KT.ink };
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

  const borderColor =
    writingState === 'CORRECT' ? '#3DAF82' : writingState === 'WRONG' ? KT.crimson : KT.line2;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div
        style={{
          background: KT.card,
          borderRadius: 28,
          border: `2px solid ${borderColor}`,
          padding: 20,
          transition: 'border-color 0.2s',
          boxShadow: KT.sh,
        }}
      >
        <Input
          ref={inputRef}
          type="text"
          value={writingInput}
          onChange={e => setWritingInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && writingState === 'INPUT' && handleWritingSubmit()}
          style={{
            width: '100%',
            fontSize: 28,
            fontWeight: 800,
            textAlign: 'center',
            background: 'transparent',
            outline: 'none',
            border: 'none',
            color: KT.ink,
            fontFamily: KT.font,
            letterSpacing: -0.5,
          }}
          placeholder={placeholder}
          disabled={writingState !== 'INPUT'}
          autoCapitalize="none"
          autoComplete="off"
        />
      </div>

      {writingState === 'INPUT' && (
        <button
          type="button"
          onClick={handleWritingSubmit}
          disabled={!writingInput.trim()}
          style={{
            width: '100%',
            padding: '18px 0',
            background: KT.ink,
            color: KT.bg,
            borderRadius: 20,
            border: 'none',
            fontSize: 15,
            fontWeight: 800,
            cursor: writingInput.trim() ? 'pointer' : 'not-allowed',
            opacity: writingInput.trim() ? 1 : 0.35,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            fontFamily: KT.font,
            boxShadow: KT.sh,
          }}
        >
          <span>{dashboardQuiz?.submit || 'Check Answer'}</span>
          <ChevronRight size={18} />
        </button>
      )}

      <div
        style={{ minHeight: 56, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {writingState === 'CORRECT' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              color: '#1A7A56',
              fontWeight: 800,
              fontSize: 18,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgba(61,175,130,0.15)',
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <Check size={20} />
            </div>
            <span>{dashboardQuiz?.correct || 'Correct!'}</span>
          </div>
        )}
        {writingState === 'WRONG' && (
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                color: KT.crimson,
                fontWeight: 800,
                fontSize: 18,
                marginBottom: 8,
              }}
            >
              <X size={20} />
              <span>{dashboardQuiz?.incorrect || 'Oops!'}</span>
            </div>
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: KT.sub,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                marginBottom: 4,
              }}
            >
              {dashboardQuiz?.correctAnswer || 'Target answer:'}
            </p>
            <p style={{ fontSize: 22, fontWeight: 800, color: KT.ink, letterSpacing: -0.5 }}>
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
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    {currentQuestion.options?.map((option, idx) => {
      const state = optionStates[idx];
      const colors = getOptionColors(state);
      const text = currentQuestion.direction === 'KR_TO_NATIVE' ? option.english : option.korean;
      return (
        <button
          key={`${option.id}-${idx}`}
          type="button"
          onClick={() => handleOptionClick(idx)}
          disabled={isLocked}
          style={{
            width: '100%',
            padding: '18px 20px',
            borderRadius: 20,
            border: `2px solid ${colors.border}`,
            background: colors.bg,
            color: colors.color,
            fontSize: 17,
            fontWeight: 700,
            cursor: isLocked ? 'default' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: KT.font,
            transition: 'all 0.15s',
            textAlign: 'left',
            boxShadow: state === 'normal' ? KT.shSm : 'none',
          }}
        >
          <span style={{ flex: 1, minWidth: 0 }}>{text}</span>
          <div style={{ marginLeft: 10, flexShrink: 0 }}>
            {state === 'correct' && (
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: '#3DAF82',
                  color: '#fff',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Check size={16} strokeWidth={3} />
              </div>
            )}
            {state === 'wrong' && (
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: KT.crimson,
                  color: '#fff',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <X size={16} strokeWidth={3} />
              </div>
            )}
          </div>
        </button>
      );
    })}
  </div>
);

const PendingAdvanceBar: React.FC<{
  labels: Labels;
  setPendingAdvanceReason: (reason: PendingAdvanceReason) => void;
  nextQuestionRef: React.RefObject<() => void>;
}> = ({ labels, setPendingAdvanceReason, nextQuestionRef }) => (
  <div
    style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      padding: '20px 22px',
      paddingBottom: 'calc(env(safe-area-inset-bottom) + 20px)',
      background: KT.card,
      borderTop: `1px solid ${KT.line}`,
      boxShadow: '0 -8px 32px rgba(31,27,23,0.08)',
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      zIndex: 50,
      fontFamily: KT.font,
    }}
  >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        padding: '0 4px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'rgba(104,91,172,0.1)',
            color: '#6B5BAC',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <HelpCircle size={18} />
        </div>
        <div>
          <p style={{ fontWeight: 800, color: KT.ink, fontSize: 14 }}>
            {labels.dashboard?.quiz?.reviewLater || 'Review logic active'}
          </p>
          <p
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: KT.sub,
              letterSpacing: 1,
              textTransform: 'uppercase',
              marginTop: 2,
            }}
          >
            {labels.dashboard?.quiz?.reviewSoon || 'Scheduled for next cycle'}
          </p>
        </div>
      </div>
    </div>
    <button
      type="button"
      onClick={() => {
        setPendingAdvanceReason(null);
        nextQuestionRef.current?.();
      }}
      style={{
        width: '100%',
        padding: '18px 0',
        background: KT.ink,
        color: KT.bg,
        borderRadius: 20,
        border: 'none',
        fontSize: 15,
        fontWeight: 800,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        fontFamily: KT.font,
        boxShadow: KT.sh,
      }}
    >
      <span>{labels.common?.continue || 'Next Question'}</span>
      <ChevronRight size={20} />
    </button>
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
  useEffect(() => {
    if (currentQuestion.type === 'WRITING' && writingState === 'INPUT') {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [currentQuestion, writingState, inputRef]);

  const isWriting = currentQuestion.type === 'WRITING';
  const questionText = getQuestionText(currentQuestion);
  const promptText = getPromptText(currentQuestion, isWriting, labels);
  const progress = ((questionIndex + 1) / totalQuestions) * 100;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: KT.bg2,
        fontFamily: KT.font,
      }}
    >
      {/* Header / Progress */}
      <div
        style={{
          padding: '20px 22px 16px',
          background: KT.card,
          borderBottomLeftRadius: 24,
          borderBottomRightRadius: 24,
          borderBottom: `1px solid ${KT.line}`,
          boxShadow: KT.shSm,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 10,
            padding: '0 2px',
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: KT.sub,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
            }}
          >
            {questionIndex + 1} / {totalQuestions}
          </span>
          {!settingsLocked && (
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: KT.sub,
                padding: 4,
              }}
            >
              <Settings size={15} strokeWidth={2.5} />
            </button>
          )}
        </div>
        {/* Progress bar */}
        <div
          style={{
            height: 5,
            background: KT.bg2,
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: `linear-gradient(90deg, #3DAF82, #2A9E70)`,
              borderRadius: 3,
              transition: 'width 0.5s ease',
            }}
          />
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '20px 22px',
          overflowY: 'auto',
        }}
      >
        {/* Question Card */}
        <div
          style={{
            flex: '0 0 auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 160,
            maxHeight: 240,
            marginBottom: 28,
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: KT.sub,
              letterSpacing: 2,
              textTransform: 'uppercase',
              marginBottom: 16,
            }}
          >
            {promptText}
          </p>
          <h1
            style={{
              fontSize: 38,
              fontWeight: 800,
              color: KT.ink,
              textAlign: 'center',
              lineHeight: 1.2,
              letterSpacing: -1,
            }}
          >
            {questionText}
          </h1>
        </div>

        {/* Answer Area */}
        <div
          style={{
            flex: 1,
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)',
          }}
        >
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
            <button
              type="button"
              onClick={handleDontKnow}
              style={{
                width: '100%',
                marginTop: 12,
                padding: '12px 0',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                color: KT.sub,
                fontSize: 13,
                fontWeight: 700,
                fontFamily: KT.font,
              }}
            >
              <HelpCircle size={15} />
              <span>{labels.dashboard?.quiz?.dontKnow || "I don't know"}</span>
            </button>
          )}

          {pendingAdvance && (
            <PendingAdvanceBar
              labels={labels}
              setPendingAdvanceReason={setPendingAdvanceReason}
              nextQuestionRef={nextQuestionRef}
            />
          )}
        </div>
      </div>
    </div>
  );
}
