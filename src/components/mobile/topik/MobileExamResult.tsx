import React, { useMemo } from 'react';
import { CheckCircle2, Eye, RotateCcw, Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { type Language, type TopikExam } from '../../../types';
import { KT } from '../ksoft/ksoft';
import { MobileImmersiveHeader } from '../MobileImmersiveHeader';

interface MobileExamResultProps {
  exam: TopikExam;
  result: {
    score: number;
    totalScore: number;
    correctCount: number;
    totalQuestions: number;
  };
  language: Language;
  onReview: () => void;
  onTryAgain: () => void;
  onBackToList: () => void;
}

export const MobileExamResult: React.FC<MobileExamResultProps> = ({
  exam,
  result,
  language: _language,
  onReview,
  onTryAgain,
  onBackToList,
}) => {
  const { t } = useTranslation();
  const percentage = useMemo(() => {
    if (result.totalScore <= 0) return 0;
    return Math.round((result.score / result.totalScore) * 100);
  }, [result.score, result.totalScore]);
  const passed = percentage >= 60;

  return (
    <div
      className="flex min-h-[100dvh] flex-col"
      style={{
        background: `radial-gradient(ellipse at 20% 0%, ${KT.bg2} 0%, ${KT.bg} 62%)`,
        color: KT.ink,
        fontFamily: KT.font,
      }}
    >
      <MobileImmersiveHeader
        title={t('dashboard.topik.mobile.result.title', { defaultValue: 'Exam Result' })}
        subtitle={exam.title}
        eyebrow={t('nav.topik', { defaultValue: 'TOPIK' })}
        onBack={onBackToList}
        backLabel={t('dashboard.topik.result.backToList', { defaultValue: 'Back to List' })}
        status={
          <span
            className="rounded-2xl border px-3 py-2 text-xs font-black shadow-sm"
            style={{
              background: passed ? KT.mint : KT.pink,
              borderColor: passed ? KT.mintDeep : KT.pinkDeep,
              color: passed ? KT.jade : KT.crimson,
            }}
          >
            {passed
              ? t('dashboard.topik.result.passTitle', { defaultValue: 'Passed' })
              : t('dashboard.topik.result.keepTitle', { defaultValue: 'Keep Going' })}
          </span>
        }
        className="sticky top-0 z-20"
      />

      <div className="flex-1 overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+108px)] pt-4">
        <div
          className="rounded-[26px] border p-6"
          style={{ background: KT.card, borderColor: KT.line, boxShadow: KT.shLg }}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-bold" style={{ color: KT.sub }}>
              {t('dashboard.topik.result.yourScore', { defaultValue: 'Your Score' })}
            </div>
            <Trophy className="h-5 w-5" style={{ color: KT.butterDeep }} />
          </div>
          <div className="mb-5 flex items-end gap-2">
            <div className="text-5xl font-black" style={{ color: passed ? KT.jade : KT.ink }}>
              {result.score}
            </div>
            <div className="pb-1 text-lg font-bold" style={{ color: KT.sub }}>
              / {result.totalScore}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <div
              className="rounded-2xl border p-3 text-center"
              style={{ background: KT.bg2, borderColor: KT.line }}
            >
              <div className="text-lg font-black" style={{ color: KT.ink }}>
                {percentage}%
              </div>
              <div className="text-[11px] font-bold" style={{ color: KT.sub }}>
                {t('dashboard.topik.result.accuracy', { defaultValue: 'Accuracy' })}
              </div>
            </div>
            <div
              className="rounded-2xl border p-3 text-center"
              style={{ background: KT.mint, borderColor: KT.mintDeep }}
            >
              <div className="text-lg font-black" style={{ color: KT.jade }}>
                {result.correctCount}
              </div>
              <div className="text-[11px] font-bold" style={{ color: KT.jade }}>
                {t('dashboard.topik.result.correct', { defaultValue: 'Correct' })}
              </div>
            </div>
            <div
              className="rounded-2xl border p-3 text-center"
              style={{ background: KT.pink, borderColor: KT.pinkDeep }}
            >
              <div className="text-lg font-black" style={{ color: KT.crimson }}>
                {result.totalQuestions - result.correctCount}
              </div>
              <div className="text-[11px] font-bold" style={{ color: KT.crimson }}>
                {t('dashboard.topik.result.incorrect', { defaultValue: 'Incorrect' })}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border px-4 py-3" style={{ background: KT.card, borderColor: KT.line }}>
          <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: KT.sub }}>
            <CheckCircle2 className="h-4 w-4" />
            {passed
              ? t('dashboard.topik.result.passSubtitle', {
                  defaultValue: 'You have reached the passing standard.',
                })
              : t('dashboard.topik.result.keepSubtitle', {
                  defaultValue: 'You are getting closer to your target.',
                })}
          </div>
        </div>
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t px-5 pb-mobile-safe pt-3"
        style={{
          background: `${KT.card}ee`,
          borderColor: KT.line,
          boxShadow: '0 -12px 34px rgba(31,27,23,0.08)',
        }}
      >
        <button
          type="button"
          onClick={onReview}
          className="mb-2.5 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-extrabold"
          style={{ background: KT.ink, color: KT.card }}
        >
          <Eye className="h-4 w-4" />
          {t('dashboard.topik.result.reviewDetails', { defaultValue: 'View Detailed Analysis' })}
        </button>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onTryAgain}
            className="flex items-center justify-center gap-1.5 rounded-xl border py-3 text-sm font-bold"
            style={{ background: KT.bg2, borderColor: KT.line, color: KT.sub }}
          >
            <RotateCcw className="h-4 w-4" />
            {t('dashboard.topik.result.tryAgain', { defaultValue: 'Try Again' })}
          </button>
          <button
            type="button"
            onClick={onBackToList}
            className="rounded-xl border py-3 text-sm font-bold"
            style={{ background: KT.card, borderColor: KT.line2, color: KT.ink }}
          >
            {t('dashboard.topik.result.backToList', { defaultValue: 'Back to List' })}
          </button>
        </div>
      </div>
    </div>
  );
};
