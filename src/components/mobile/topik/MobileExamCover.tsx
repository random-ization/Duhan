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
  // bgPattern removed as unused

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
      {/* 1. Hero Section */}
      <div
        className="relative overflow-hidden pb-10 rounded-b-[40px] z-10"
        style={{
          background: `linear-gradient(135deg, ${KT.ink} 0%, ${isListening ? KT.indigo : KT.jade} 100%)`,
          boxShadow: KT.shLg,
        }}
      >
        {/* Abstract Shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-card/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>

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
          tone="inverse"
          className="border-transparent bg-transparent"
        />

        {/* Main Content */}
        <div className="px-8 mt-2 text-center text-white">
          <div className="mx-auto mb-6 flex items-center justify-center gap-3">
            <HanjaSeal
              c={isListening ? '聽' : '讀'}
              size={74}
              bg="rgba(255,255,255,0.14)"
              color={KT.card}
              round={22}
            />
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center backdrop-blur-xl shadow-lg ring-4 ring-white/10"
              style={{ background: 'rgba(255,255,255,0.16)' }}
            >
              <Icon className="w-9 h-9 text-white" />
            </div>
          </div>

          <p
            className="text-white/80 font-medium inline-block px-4 py-1.5 rounded-full text-sm backdrop-blur-sm border border-white/10 mt-2"
            style={{ background: 'rgba(255,255,255,0.1)' }}
          >
            {isListening
              ? t('dashboard.topik.mobile.cover.listeningTipShort', {
                  defaultValue: 'Audio required',
                })
              : t('dashboard.topik.mobile.cover.readingTipShort', {
                  defaultValue: 'Quiet focus recommended',
                })}
          </p>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 mt-10">
            <div
              className="backdrop-blur-md rounded-2xl p-3 border border-white/10"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              <div className="text-[10px] uppercase font-bold text-white/60 mb-1 tracking-wider">
                {t('dashboard.topik.mobile.cover.time', { defaultValue: 'Time' })}
              </div>
              <div className="text-xl font-black">
                {exam.timeLimit}
                <span className="text-xs font-normal opacity-80 ml-0.5">
                  {t('dashboard.topik.mobile.minuteShort', {
                    minutes: exam.timeLimit,
                    defaultValue: 'm',
                  })}
                </span>
              </div>
            </div>
            <div
              className="backdrop-blur-md rounded-2xl p-3 border border-white/10"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              <div className="text-[10px] uppercase font-bold text-white/60 mb-1 tracking-wider">
                {t('dashboard.topik.mobile.cover.items', { defaultValue: 'Items' })}
              </div>
              <div className="text-xl font-black">{exam.questions.length || 50}</div>
            </div>
            <div
              className="backdrop-blur-md rounded-2xl p-3 border border-white/10"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              <div className="text-[10px] uppercase font-bold text-white/60 mb-1 tracking-wider">
                {t('dashboard.topik.mobile.cover.score', { defaultValue: 'Score' })}
              </div>
              <div className="text-xl font-black">100</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Instructions Section */}
      <div className="flex-1 px-5 -mt-6 z-20 pb-[calc(var(--mobile-safe-bottom)+7rem)]">
        <div
          className="rounded-3xl p-6 border"
          style={{ background: KT.card, borderColor: KT.line, boxShadow: KT.shLg }}
        >
          <h2 className="text-lg font-bold mb-6 flex items-center gap-2" style={{ color: KT.ink }}>
            <Info className="w-5 h-5" style={{ color: KT.crimson }} />
            {t('dashboard.topik.mobile.cover.noticeTitle', {
              defaultValue: 'Before You Start',
            })}
          </h2>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div
                className="w-10 h-10 rounded-full font-bold flex items-center justify-center shrink-0 text-sm border pb-0.5"
                style={{ background: KT.bg2, borderColor: KT.line, color: KT.crimson }}
              >
                1
              </div>
              <div>
                <h3 className="font-bold mb-1" style={{ color: KT.ink }}>
                  {t('dashboard.topik.mobile.cover.simulationTitle', {
                    defaultValue: 'Full simulation mode',
                  })}
                </h3>
                <p className="text-sm leading-relaxed font-medium" style={{ color: KT.sub }}>
                  {t('dashboard.topik.mobile.cover.simulationDesc', {
                    defaultValue:
                      'Do not leave the page during the exam. The paper will auto-submit when time runs out.',
                  })}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div
                className="w-10 h-10 rounded-full font-bold flex items-center justify-center shrink-0 text-sm border pb-0.5"
                style={{ background: KT.bg2, borderColor: KT.line, color: KT.crimson }}
              >
                2
              </div>
              <div>
                <h3 className="font-bold mb-1" style={{ color: KT.ink }}>
                  {t('dashboard.topik.mobile.cover.submitTitle', {
                    defaultValue: 'Answer submission',
                  })}
                </h3>
                <p className="text-sm leading-relaxed font-medium" style={{ color: KT.sub }}>
                  {t('dashboard.topik.mobile.cover.submitDesc', {
                    defaultValue:
                      'All questions are single-choice. You can view your score and AI analysis after submission.',
                  })}
                </p>
              </div>
            </div>

            <div
              className="p-4 rounded-xl flex items-start gap-3 text-sm font-medium"
              style={{
                background: isListening ? KT.sky : KT.mint,
                color: isListening ? KT.skyDeep : KT.jade,
              }}
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>
                {isListening
                  ? t('dashboard.topik.mobile.cover.listeningTip', {
                      defaultValue:
                        'Listening section contains audio. Please turn on your sound or use headphones.',
                    })
                  : t('dashboard.topik.mobile.cover.readingTip', {
                      defaultValue:
                        'Reading passages can be long. A quiet environment is recommended.',
                    })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Sticky Start Button */}
      <div
        className="fixed bottom-0 left-0 right-0 px-5 pt-4 pb-mobile-safe z-30"
        style={{
          background: `${KT.card}ee`,
          borderTop: `1px solid ${KT.line}`,
          boxShadow: '0 -12px 34px rgba(31,27,23,0.08)',
        }}
      >
        <Button
          variant="ghost"
          size="auto"
          onClick={onStart}
          className="w-full py-4 text-white text-lg font-bold rounded-2xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          style={{ background: KT.ink, color: KT.card, boxShadow: KT.sh }}
        >
          <Play className="w-5 h-5 fill-current" />
          {t('dashboard.topik.mobile.cover.startExam', { defaultValue: 'Start Exam' })}
        </Button>
      </div>
    </div>
  );
};
