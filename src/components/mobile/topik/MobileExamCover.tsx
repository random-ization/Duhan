import React from 'react';
import { TopikExam, Language } from '../../../types';
import { useLayoutActions } from '../../../contexts/LayoutContext';
import { useTranslation } from 'react-i18next';
import { Play, Info, AlertCircle, Headphones, BookOpen } from 'lucide-react';
import { Button } from '../../ui';
import { MobileImmersiveHeader } from '../MobileImmersiveHeader';
import { formatTopikLabel } from '../../../utils/topik';
import { HanjaSeal, KT } from '../ksoft/ksoft';

interface MobileExamCoverProps {
  exam: TopikExam;
  language: Language;
  onStart: () => void;
  onBack: () => void;
}

const CoverMetric = ({
  label,
  value,
  tone = 'default',
}: {
  readonly label: string;
  readonly value: string;
  readonly tone?: 'default' | 'accent';
}) => (
  <div
    className="rounded-2xl border px-3 py-3 text-center"
    style={{
      background: tone === 'accent' ? KT.bg2 : KT.card,
      borderColor: KT.line,
      boxShadow: KT.shSm,
    }}
  >
    <div className="text-[11px] font-bold tracking-wide" style={{ color: KT.sub }}>
      {label}
    </div>
    <div className="mt-1 text-[30px] font-black leading-none" style={{ color: KT.ink }}>
      {value}
    </div>
  </div>
);

const CoverRule = ({
  index,
  title,
  description,
}: {
  readonly index: number;
  readonly title: string;
  readonly description: string;
}) => (
  <div className="flex items-start gap-3">
    <div
      className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-black"
      style={{ background: KT.bg2, borderColor: KT.line, color: KT.crimson }}
    >
      {index}
    </div>
    <div>
      <div className="text-[19px] font-black leading-tight" style={{ color: KT.ink }}>
        {title}
      </div>
      <div className="mt-1 text-[15px] font-semibold leading-snug" style={{ color: KT.sub }}>
        {description}
      </div>
    </div>
  </div>
);

export const MobileExamCover: React.FC<MobileExamCoverProps> = ({
  exam,
  language: _language,
  onStart,
  onBack,
}) => {
  const { t } = useTranslation();
  // Hide sidebar (and mobile nav) on mount, just to be safe
  const { setSidebarHidden } = useLayoutActions();
  React.useEffect(() => {
    setSidebarHidden(true);
    // Also cleanup? No, if we navigate back, the listener in AppLayout or the back button logic should handle it.
    // But resetExam in index.tsx handles setSidebarHidden(false).
  }, [setSidebarHidden]);

  const isListening = exam.type === 'LISTENING';
  const Icon = isListening ? Headphones : BookOpen;
  const examTypeLabel = isListening
    ? t('dashboard.topik.listening', { defaultValue: 'Listening' })
    : t('dashboard.topik.reading', { defaultValue: 'Reading' });

  return (
    <div
      className="relative flex min-h-[100dvh] flex-col"
      style={{
        background: `radial-gradient(ellipse at 20% 0%, ${KT.bg2} 0%, ${KT.bg} 62%)`,
        color: KT.ink,
        fontFamily: KT.font,
        width: '100%',
        maxWidth: '100vw',
        overflowX: 'hidden',
      }}
    >
      <MobileImmersiveHeader
        title={`${formatTopikLabel(exam.level)} ${examTypeLabel}`}
        subtitle={t('dashboard.topik.mobile.cover.roundMock', {
          round: exam.round,
          defaultValue: 'Round {{round}} Past Exam',
        })}
        eyebrow={t('dashboard.topik.mobile.cover.noticeTitle', {
          defaultValue: 'Before You Start',
        })}
        onBack={onBack}
        backLabel={t('common.back', { defaultValue: 'Back' })}
        className="sticky top-0 z-20"
      />

      <div className="flex-1 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom)+108px)] pt-3">
        <div
          className="rounded-[24px] border p-4"
          style={{ background: KT.card, borderColor: KT.line, boxShadow: KT.shLg }}
        >
          <div className="mb-3 flex items-center gap-3">
            <HanjaSeal
              c={isListening ? '聽' : '讀'}
              size={54}
              bg={isListening ? KT.lilacDeep : KT.jade}
              round={14}
            />
            <div
              className="flex h-[54px] w-[54px] items-center justify-center rounded-[16px]"
              style={{ background: KT.bg2, color: KT.ink }}
            >
              <Icon className="h-7 w-7" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold tracking-[0.08em]" style={{ color: KT.sub }}>
                {isListening
                  ? t('dashboard.topik.mobile.cover.listeningTipShort', {
                      defaultValue: 'Audio required',
                    })
                  : t('dashboard.topik.mobile.cover.readingTipShort', {
                      defaultValue: 'Quiet focus recommended',
                    })}
              </div>
              <div className="mt-1 text-lg font-black" style={{ color: KT.ink }}>
                TOPIK II · {examTypeLabel}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <CoverMetric
              label={t('dashboard.topik.mobile.cover.time', { defaultValue: 'Time' })}
              value={`${exam.timeLimit}`}
              tone="accent"
            />
            <CoverMetric
              label={t('dashboard.topik.mobile.cover.items', { defaultValue: 'Items' })}
              value={`${exam.questions.length || 50}`}
            />
            <CoverMetric
              label={t('dashboard.topik.mobile.cover.score', { defaultValue: 'Score' })}
              value="100"
            />
          </div>
        </div>

        <div
          className="mt-3 rounded-[24px] border p-4"
          style={{ background: KT.card, borderColor: KT.line, boxShadow: KT.shSm }}
        >
          <h2 className="mb-4 flex items-center gap-2 text-base font-black" style={{ color: KT.ink }}>
            <Info className="h-5 w-5" style={{ color: KT.crimson }} />
            {t('dashboard.topik.mobile.cover.noticeTitle', { defaultValue: 'Before You Start' })}
          </h2>

          <div className="space-y-4">
            <CoverRule
              index={1}
              title={t('dashboard.topik.mobile.cover.simulationTitle', {
                defaultValue: 'Full simulation mode',
              })}
              description={t('dashboard.topik.mobile.cover.simulationDesc', {
                defaultValue:
                  'Do not leave the page during the exam. The paper will auto-submit when time runs out.',
              })}
            />
            <CoverRule
              index={2}
              title={t('dashboard.topik.mobile.cover.submitTitle', {
                defaultValue: 'Answer submission',
              })}
              description={t('dashboard.topik.mobile.cover.submitDesc', {
                defaultValue:
                  'All questions are single-choice. You can view your score and AI analysis after submission.',
              })}
            />
            <div
              className="rounded-xl px-3 py-3 text-sm font-semibold leading-snug"
              style={{
                background: isListening ? KT.sky : KT.mint,
                color: isListening ? KT.skyDeep : KT.jade,
              }}
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {isListening
                    ? t('dashboard.topik.mobile.cover.listeningTip', {
                        defaultValue:
                          'Listening section contains audio. Please turn on your sound or use headphones.',
                      })
                    : t('dashboard.topik.mobile.cover.readingTip', {
                        defaultValue:
                          'Reading passages can be long. A quiet environment is recommended.',
                      })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 z-30 border-t px-4 pb-mobile-safe pt-3"
        style={{
          background: `${KT.card}ee`,
          borderColor: KT.line,
          boxShadow: '0 -12px 34px rgba(31,27,23,0.08)',
        }}
      >
        <Button
          variant="ghost"
          size="auto"
          onClick={onStart}
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-black text-white shadow-lg transition-all active:scale-[0.98]"
          style={{ background: KT.ink, color: KT.card, boxShadow: KT.sh }}
        >
          <Play className="h-5 w-5 fill-current" />
          {t('dashboard.topik.mobile.cover.startExam', { defaultValue: 'Start Exam' })}
        </Button>
      </div>
    </div>
  );
};
