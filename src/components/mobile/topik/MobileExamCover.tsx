import React from 'react';
import { TopikExam, Language } from '../../../types';
import { clsx } from 'clsx';
import { useLayout } from '../../../contexts/LayoutContext';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Play, Info, AlertCircle, Headphones, BookOpen } from 'lucide-react';

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
  const { setSidebarHidden } = useLayout();
  React.useEffect(() => {
    setSidebarHidden(true);
    // Also cleanup? No, if we navigate back, the listener in AppLayout or the back button logic should handle it.
    // But resetExam in index.tsx handles setSidebarHidden(false).
  }, [setSidebarHidden]);

  // Determine gradient and icon based on exam type
  const isListening = exam.type === 'LISTENING';
  const gradientClass = isListening
    ? 'from-indigo-600 to-blue-600'
    : 'from-emerald-600 to-teal-600';

  const Icon = isListening ? Headphones : BookOpen;
  const examTypeLabel = isListening
    ? t('dashboard.topik.listening', { defaultValue: 'Listening' })
    : t('dashboard.topik.reading', { defaultValue: 'Reading' });
  // bgPattern removed as unused

  return (
    <div className="min-h-[100dvh] bg-slate-50 relative flex flex-col">
      {/* 1. Hero Section */}
      <div
        className={clsx(
          'relative overflow-hidden pb-10 rounded-b-[40px] shadow-2xl z-10 bg-gradient-to-br',
          gradientClass
        )}
      >
        {/* Abstract Shapes */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>

        {/* Header Nav */}
        <div className="pt-safe px-4 h-16 flex items-center">
          <button
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 text-center pr-10">
            <img
              src="/logo_BnW.svg"
              alt="Logo"
              className="h-8 mx-auto opacity-80 invert brightness-0"
            />
            {/* Assuming a logo exists, or just use text if not */}
          </div>
        </div>

        {/* Main Content */}
        <div className="px-8 mt-6 text-center text-white">
          <div className="w-20 h-20 mx-auto bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-xl shadow-lg mb-6 ring-4 ring-white/10">
            <Icon className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-4xl font-black mb-2 tracking-tight">
            TOPIK II
            <div className="text-2xl font-bold opacity-90 mt-1">{examTypeLabel}</div>
          </h1>

          <p className="text-white/80 font-medium bg-white/10 inline-block px-4 py-1.5 rounded-full text-sm backdrop-blur-sm border border-white/10 mt-2">
            {t('dashboard.topik.mobile.cover.roundMock', {
              round: exam.round,
              defaultValue: 'Round {{round}} Past Exam',
            })}
          </p>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 mt-10">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
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
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <div className="text-[10px] uppercase font-bold text-white/60 mb-1 tracking-wider">
                {t('dashboard.topik.mobile.cover.items', { defaultValue: 'Items' })}
              </div>
              <div className="text-xl font-black">{exam.questions.length || 50}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <div className="text-[10px] uppercase font-bold text-white/60 mb-1 tracking-wider">
                {t('dashboard.topik.mobile.cover.score', { defaultValue: 'Score' })}
              </div>
              <div className="text-xl font-black">100</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Instructions Section */}
      <div className="flex-1 px-5 -mt-6 z-20 pb-28">
        <div className="bg-white rounded-3xl shadow-xl p-6 border border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Info className="w-5 h-5 text-slate-400" />
            {t('dashboard.topik.mobile.cover.noticeTitle', {
              defaultValue: 'Before You Start',
            })}
          </h2>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center shrink-0 text-sm border-2 border-slate-200">
                1
              </div>
              <div>
                <h3 className="font-bold text-slate-800 mb-1">
                  {t('dashboard.topik.mobile.cover.simulationTitle', {
                    defaultValue: 'Full simulation mode',
                  })}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">
                  {t('dashboard.topik.mobile.cover.simulationDesc', {
                    defaultValue:
                      'Do not leave the page during the exam. The paper will auto-submit when time runs out.',
                  })}
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center shrink-0 text-sm border-2 border-slate-200">
                2
              </div>
              <div>
                <h3 className="font-bold text-slate-800 mb-1">
                  {t('dashboard.topik.mobile.cover.submitTitle', {
                    defaultValue: 'Answer submission',
                  })}
                </h3>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">
                  {t('dashboard.topik.mobile.cover.submitDesc', {
                    defaultValue:
                      'All questions are single-choice. You can view your score and AI analysis after submission.',
                  })}
                </p>
              </div>
            </div>

            <div
              className={clsx(
                'p-4 rounded-xl flex items-start gap-3 text-sm font-medium',
                isListening ? 'bg-indigo-50 text-indigo-800' : 'bg-emerald-50 text-emerald-800'
              )}
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
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+2rem)] z-30 shadow-nav-up">
        <button
          onClick={onStart}
          className={clsx(
            'w-full py-4 text-white text-lg font-bold rounded-2xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2',
            isListening
              ? 'bg-gradient-to-r from-indigo-600 to-blue-600 shadow-indigo-200'
              : 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-200'
          )}
        >
          <Play className="w-5 h-5 fill-current" />
          {t('dashboard.topik.mobile.cover.startExam', { defaultValue: 'Start Exam' })}
        </button>
      </div>
    </div>
  );
};
