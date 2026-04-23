import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { TopikExam, Language } from '../../types';
import { QuestionRenderer } from '../topik/QuestionRenderer';
import { MobileQuestionNav } from './MobileQuestionNav';
import { BottomSheet } from '../common/BottomSheet';
import { sanitizeStrictHtml } from '../../utils/sanitize';
import { getLabels } from '../../utils/i18n';
import { formatTopikLabel } from '../../utils/topik';
import { KT, Chip, HanjaSeal } from './ksoft/ksoft';

interface MobileExamSessionProps {
  exam: TopikExam;
  language: Language;
  userAnswers: Record<number, number>;
  timeLeft: number;
  onAnswerChange: (questionIndex: number, optionIndex: number) => void;
  onSubmit: () => void;
  onExit?: () => void;
}

const TYPE_HANJA: Record<string, string> = {
  READING: '讀',
  LISTENING: '聽',
  WRITING: '述',
};

export const MobileExamSession: React.FC<MobileExamSessionProps> = ({
  exam,
  language,
  userAnswers,
  timeLeft,
  onAnswerChange,
  onSubmit,
  onExit: _onExit,
}) => {
  const labels = getLabels(language);
  const sessionCopy = labels.dashboard?.topik?.mobile?.session;
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [showPassage, setShowPassage] = useState(false);

  const totalQuestions = exam.questions.length;
  const currentQuestion = exam.questions[currentQuestionIndex];

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isLowTime = minutes < 5;

  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentQuestionIndex]);

  const hasPassage = Boolean(currentQuestion?.passage);
  const answeredCount = Object.keys(userAnswers).length;
  const answeredLabel = sessionCopy?.answeredCount
    ? sessionCopy.answeredCount
        .replace('{{current}}', String(answeredCount))
        .replace('{{total}}', String(totalQuestions))
    : `${answeredCount}/${totalQuestions}`;
  const passageLabel =
    sessionCopy?.passageFor
      ?.replace('{{start}}', String(currentQuestionIndex + 1))
      .replace('{{end}}', String(currentQuestionIndex + 1)) || '지문';

  const examTypeHanja = TYPE_HANJA[exam.type ?? 'READING'] ?? '試';

  const handlePrev = () => {
    if (currentQuestionIndex > 0) setCurrentQuestionIndex(i => i - 1);
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) setCurrentQuestionIndex(i => i + 1);
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: KT.bg,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: KT.font,
        color: KT.ink,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '0 22px 14px',
          paddingTop: 'calc(env(safe-area-inset-top) + 14px)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: KT.bg,
          borderBottom: `1px solid ${KT.line}`,
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={onSubmit}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            border: 'none',
            background: KT.card,
            color: KT.ink,
            fontSize: 18,
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: KT.shSm,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
          aria-label="Close"
        >
          ×
        </button>

        <div style={{ flex: 1, textAlign: 'center' }}>
          <div
            style={{
              fontSize: 11,
              color: KT.sub,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            {formatTopikLabel(exam.level)} ·{' '}
            {exam.type?.charAt(0) + (exam.type?.slice(1).toLowerCase() ?? '')}
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: KT.ink,
              marginTop: 2,
            }}
          >
            {currentQuestionIndex + 1} / {totalQuestions}
          </div>
        </div>

        <div
          style={{
            padding: '7px 13px',
            borderRadius: 16,
            background: isLowTime ? KT.crimson : KT.ink,
            color: KT.card,
            fontSize: 14,
            fontWeight: 800,
            fontFamily: KT.font,
            letterSpacing: 0.5,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <HanjaSeal c={examTypeHanja} size={18} bg="rgba(255,255,255,0.15)" round={4} />
          <span>
            {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
          </span>
        </div>
      </div>

      {/* Question number strip */}
      <div
        style={{
          padding: '10px 22px',
          display: 'flex',
          gap: 5,
          overflowX: 'auto',
          flexShrink: 0,
          borderBottom: `1px solid ${KT.line}`,
        }}
        className="no-scrollbar"
      >
        {Array.from({ length: Math.min(totalQuestions, 20) }, (_, i) => {
          const n = i;
          const isCurrent = n === currentQuestionIndex;
          const isAnswered = userAnswers[n] !== undefined;
          return (
            <button
              key={n}
              type="button"
              onClick={() => setCurrentQuestionIndex(n)}
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                display: 'grid',
                placeItems: 'center',
                background: isCurrent ? KT.ink : isAnswered ? KT.mint : KT.card,
                color: isCurrent ? KT.bg : isAnswered ? KT.mintDeep : KT.sub,
                fontSize: 11,
                fontWeight: 800,
                flexShrink: 0,
                border: 'none',
                cursor: 'pointer',
                boxShadow: !isCurrent && !isAnswered ? KT.shSm : 'none',
              }}
            >
              {n + 1}
            </button>
          );
        })}
        {totalQuestions > 20 && (
          <button
            type="button"
            onClick={() => setIsNavOpen(true)}
            style={{
              minWidth: 44,
              height: 30,
              borderRadius: 8,
              display: 'grid',
              placeItems: 'center',
              background: KT.card,
              color: KT.sub,
              fontSize: 10,
              fontWeight: 800,
              flexShrink: 0,
              border: `1px solid ${KT.line}`,
              cursor: 'pointer',
              padding: '0 8px',
            }}
          >
            +{totalQuestions - 20}
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {hasPassage && (
          <div style={{ position: 'absolute', top: 14, right: 18, zIndex: 30 }}>
            <button
              type="button"
              onClick={() => setShowPassage(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 20,
                border: `1px solid ${KT.line2}`,
                background: KT.card,
                color: KT.sub,
                fontSize: 11,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: KT.shSm,
                fontFamily: KT.font,
              }}
            >
              <FileText size={13} />
              {passageLabel}
            </button>
          </div>
        )}

        <div
          ref={contentRef}
          style={{
            height: '100%',
            overflowY: 'auto',
            padding: '16px 18px 100px',
          }}
        >
          <div
            style={{
              background: KT.card,
              borderRadius: 24,
              boxShadow: KT.sh,
              padding: 20,
            }}
          >
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <Chip tone="lilac">問 {currentQuestionIndex + 1}</Chip>
              {currentQuestion?.score && <Chip tone="muted">{currentQuestion.score}점</Chip>}
            </div>
            <QuestionRenderer
              question={currentQuestion}
              questionIndex={currentQuestionIndex}
              userAnswer={userAnswers[currentQuestionIndex]}
              language={language}
              showCorrect={false}
              onAnswerChange={optIdx => onAnswerChange(currentQuestionIndex, optIdx)}
              hidePassage={hasPassage}
              showInlineNumber
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginTop: 12,
              padding: '0 4px',
            }}
          >
            <div
              style={{
                fontSize: 10,
                color: KT.sub,
                fontWeight: 700,
                letterSpacing: 0.5,
              }}
            >
              {answeredLabel}
            </div>
            <div
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                background: KT.line2,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${(answeredCount / totalQuestions) * 100}%`,
                  height: '100%',
                  background: KT.mintDeep,
                  borderRadius: 2,
                  transition: 'width 0.3s',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom navigation */}
      <div
        style={{
          padding: '12px 18px',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)',
          display: 'flex',
          gap: 8,
          borderTop: `1px solid ${KT.line}`,
          background: KT.bg,
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentQuestionIndex === 0}
          style={{
            flex: 0.3,
            padding: 14,
            borderRadius: 16,
            border: `1px solid ${KT.line2}`,
            background: 'transparent',
            fontSize: 13,
            fontWeight: 800,
            cursor: currentQuestionIndex === 0 ? 'default' : 'pointer',
            opacity: currentQuestionIndex === 0 ? 0.4 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: KT.ink,
          }}
        >
          <ChevronLeft size={18} />
        </button>

        <button
          type="button"
          onClick={() => setIsNavOpen(true)}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: 16,
            border: `1px solid ${KT.line}`,
            background: KT.card,
            fontSize: 13,
            fontWeight: 800,
            cursor: 'pointer',
            color: KT.sub,
            boxShadow: KT.shSm,
          }}
        >
          {sessionCopy?.questionMap || '문제 목록'}
        </button>

        <button
          type="button"
          onClick={currentQuestionIndex === totalQuestions - 1 ? onSubmit : handleNext}
          style={{
            flex: 1,
            padding: 14,
            borderRadius: 16,
            border: 'none',
            background: KT.ink,
            color: KT.bg,
            fontSize: 14,
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          {currentQuestionIndex === totalQuestions - 1 ? (
            sessionCopy?.finish || '제출하기'
          ) : (
            <>
              {sessionCopy?.next || '다음 문제'}
              <ChevronRight size={16} />
            </>
          )}
        </button>
      </div>

      {/* Passage sheet */}
      <BottomSheet
        isOpen={showPassage}
        onClose={() => setShowPassage(false)}
        height="full"
        title={passageLabel}
      >
        <div
          style={{
            height: '100%',
            overflowY: 'auto',
            background: KT.bg2,
            padding: 16,
            borderRadius: 12,
          }}
        >
          <div
            style={{
              background: KT.card,
              padding: 20,
              borderRadius: 18,
              boxShadow: KT.sh,
              fontSize: 16,
              lineHeight: 1.8,
              color: KT.ink,
              fontWeight: 500,
            }}
          >
            {currentQuestion?.passage ? (
              <div
                dangerouslySetInnerHTML={{
                  __html: sanitizeStrictHtml(currentQuestion.passage),
                }}
              />
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  color: KT.sub,
                  padding: '40px 0',
                  fontWeight: 600,
                }}
              >
                {sessionCopy?.noPassage || '이 문제에는 지문이 없습니다.'}
              </div>
            )}
          </div>
        </div>
      </BottomSheet>

      {/* Question navigator */}
      <MobileQuestionNav
        totalQuestions={totalQuestions}
        currentQuestionIndex={currentQuestionIndex}
        userAnswers={userAnswers}
        onSelectQuestion={setCurrentQuestionIndex}
        isOpen={isNavOpen}
        onOpenChange={setIsNavOpen}
      />
    </div>
  );
};
