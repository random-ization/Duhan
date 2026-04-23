import React from 'react';
import { useTranslation } from 'react-i18next';
import { BottomSheet } from '../common/BottomSheet';
import { KT } from './ksoft/ksoft';

interface MobileQuestionNavProps {
  totalQuestions: number;
  currentQuestionIndex: number;
  userAnswers: Record<number, number>;
  onSelectQuestion: (index: number) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MobileQuestionNav: React.FC<MobileQuestionNavProps> = ({
  totalQuestions,
  currentQuestionIndex,
  userAnswers,
  onSelectQuestion,
  isOpen,
  onOpenChange,
}) => {
  const { t } = useTranslation();
  const questions = Array.from({ length: totalQuestions }, (_, i) => i);
  const answeredCount = Object.keys(userAnswers).length;

  const handleClose = () => onOpenChange(false);

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={handleClose}
      height="half"
      title={t('mobileQuestionNav.title', { defaultValue: '문제 목록' })}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          fontFamily: KT.font,
        }}
      >
        {/* summary */}
        <div
          style={{
            display: 'flex',
            gap: 16,
            padding: '0 4px 16px',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: KT.ink }}>{answeredCount}</div>
            <div style={{ fontSize: 10, color: KT.sub, fontWeight: 600, marginTop: 2 }}>
              {t('mobileQuestionNav.answered', { defaultValue: '답함' })}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: KT.sub }}>
              {totalQuestions - answeredCount}
            </div>
            <div style={{ fontSize: 10, color: KT.sub, fontWeight: 600, marginTop: 2 }}>
              {t('mobileQuestionNav.unanswered', { defaultValue: '미답' })}
            </div>
          </div>
          <div
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: KT.line2,
              overflow: 'hidden',
              alignSelf: 'center',
              marginTop: -10,
            }}
          >
            <div
              style={{
                width: `${(answeredCount / totalQuestions) * 100}%`,
                height: '100%',
                background: KT.mintDeep,
                borderRadius: 2,
              }}
            />
          </div>
        </div>

        {/* grid */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            paddingBottom: 16,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 10,
            }}
          >
            {questions.map(index => {
              const isAnswered = userAnswers[index] !== undefined;
              const isCurrent = currentQuestionIndex === index;

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    onSelectQuestion(index);
                    handleClose();
                  }}
                  style={{
                    aspectRatio: '1/1',
                    borderRadius: 12,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 800,
                    fontFamily: KT.font,
                    transform: isCurrent ? 'scale(1.1)' : 'scale(1)',
                    transition: 'transform 0.15s',
                    background: isCurrent ? KT.ink : isAnswered ? KT.mint : KT.card,
                    color: isCurrent ? KT.bg : isAnswered ? KT.mintDeep : KT.sub,
                    boxShadow: isCurrent ? '0 4px 12px rgba(31,27,23,0.2)' : KT.shSm,
                  }}
                >
                  {index + 1}
                  {isCurrent && (
                    <div
                      style={{
                        position: 'absolute',
                        top: -3,
                        right: -3,
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: KT.crimson,
                        border: `1.5px solid ${KT.bg}`,
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </BottomSheet>
  );
};
