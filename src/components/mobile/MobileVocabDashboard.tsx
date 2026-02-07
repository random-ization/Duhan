import React from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, Play, ChevronRight } from 'lucide-react';

interface MobileVocabDashboardProps {
  readonly unitId: string;
  readonly instituteName: string;
  readonly words: any[];
  readonly masteredCount: number;
  readonly language: string;
  readonly onStartLearn: () => void;
  readonly onStartTest: () => void;
  readonly onManageList: () => void;
}

export const MobileVocabDashboard: React.FC<MobileVocabDashboardProps> = ({
  unitId,
  instituteName,
  words,
  masteredCount,
  language: _language,
  onStartLearn,
  onStartTest,
  onManageList,
}) => {
  const { t } = useTranslation();
  const total = words.length;
  const progress = total > 0 ? (masteredCount / total) * 100 : 0;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white p-6 pb-8 border-b border-slate-200 rounded-b-[2rem] shadow-sm relative overflow-hidden">
        {/* Decor */}
        <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-green-100 rounded-full opacity-50 z-0" />

        <div className="relative z-10">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
            {instituteName}
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-1">
            {unitId === 'ALL'
              ? t('vocab.allUnits') || 'All Units'
              : `${t('vocab.unit') || 'Unit'} ${unitId}`}
          </h1>
          <p className="text-slate-500 font-medium">
            {total} {t('vocab.wordsUnit') || 'words'}
          </p>

          {/* Progress Card */}
          <div className="mt-6 bg-slate-900 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
            <div className="flex justify-between items-end mb-2">
              <div>
                <div className="text-3xl font-black text-green-400">{Math.round(progress)}%</div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {t('vocab.mastered') || 'Mastered'}
                </div>
              </div>
              <Trophy className="w-8 h-8 text-yellow-400" />
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Actions */}
      <div className="p-6 grid gap-4">
        {/* Learn Button */}
        <button
          onClick={onStartLearn}
          className="group w-full bg-white border-2 border-slate-200 rounded-2xl p-1 shadow-[4px_4px_0px_0px_rgba(226,232,240,1)] active:translate-y-1 active:shadow-none transition-all"
        >
          <div className="bg-white rounded-xl p-5 flex items-center justify-between group-hover:bg-green-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                <BrainIcon />
              </div>
              <div className="text-left">
                <div className="font-black text-lg text-slate-900">
                  {t('vocab.learn') || 'Start Learning'}
                </div>
                <div className="text-xs font-bold text-slate-400">
                  {t('vocab.flashcards') || 'Flashcards'}
                </div>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full border-2 border-slate-100 flex items-center justify-center group-hover:border-green-200 group-hover:bg-white">
              <Play className="w-4 h-4 text-green-500 ml-0.5" />
            </div>
          </div>
        </button>

        {/* Quiz Button */}
        <button
          onClick={onStartTest}
          className="group w-full bg-white border-2 border-slate-200 rounded-2xl p-1 shadow-[4px_4px_0px_0px_rgba(226,232,240,1)] active:translate-y-1 active:shadow-none transition-all"
        >
          <div className="bg-white rounded-xl p-5 flex items-center justify-between group-hover:bg-indigo-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                <Trophy className="w-6 h-6" />
              </div>
              <div className="text-left">
                <div className="font-black text-lg text-slate-900">
                  {t('vocab.quiz') || 'Take Quiz'}
                </div>
                <div className="text-xs font-bold text-slate-400">
                  {t('vocab.testMode') || 'Challenge yourself'}
                </div>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full border-2 border-slate-100 flex items-center justify-center group-hover:border-indigo-200 group-hover:bg-white">
              <ChevronRight className="w-5 h-5 text-indigo-500" />
            </div>
          </div>
        </button>

        {/* Word List Preview or Manage */}
        <button
          onClick={onManageList}
          className="mt-2 w-full bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <ListIcon className="w-5 h-5 text-slate-400" />
            <span className="font-bold text-slate-700">{t('vocab.wordList') || 'Word List'}</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300" />
        </button>
      </div>
    </div>
  );
};

// Simple Icon
const BrainIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z" />
    <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z" />
    <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4" />
    <path d="M17.599 6.5a3 3 0 0 0 .399-1.375" />
    <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5" />
    <path d="M3.477 10.896a4 4 0 0 1 .585-.396" />
    <path d="M19.938 10.5a4 4 0 0 1 .585.396" />
    <path d="M6 18a4 4 0 0 1-1.97-3.284" />
    <path d="M17.97 14.716A4 4 0 0 1 18 18" />
  </svg>
);

// List Icon
const ListIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="8" x2="21" y1="6" y2="6" />
    <line x1="8" x2="21" y1="12" y2="12" />
    <line x1="8" x2="21" y1="18" y2="18" />
    <line x1="3" x2="3.01" y1="6" y2="6" />
    <line x1="3" x2="3.01" y1="12" y2="12" />
    <line x1="3" x2="3.01" y1="18" y2="18" />
  </svg>
);
