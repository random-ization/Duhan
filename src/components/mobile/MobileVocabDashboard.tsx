import React from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, Play, ChevronRight } from 'lucide-react';
import { Button } from '../ui';

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
    <div className="min-h-screen bg-muted pb-20">
      {/* Header */}
      <header className="bg-card p-6 pb-8 border-b border-border rounded-b-[2rem] shadow-sm relative overflow-hidden">
        {/* Decor */}
        <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-green-100 dark:bg-green-400/12 rounded-full opacity-50 z-0" />

        <div className="relative z-10">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
            {instituteName}
          </div>
          <h1 className="text-3xl font-black text-foreground mb-1">
            {unitId === 'ALL'
              ? t('vocab.allUnits', { defaultValue: 'All Units' })
              : `${t('vocab.unit', { defaultValue: 'Unit' })} ${unitId}`}
          </h1>
          <p className="text-muted-foreground font-medium">
            {total} {t('vocab.wordsUnit', { defaultValue: 'words' })}
          </p>

          {/* Progress Card */}
          <div className="mt-6 bg-primary rounded-2xl p-5 text-primary-foreground shadow-lg relative overflow-hidden">
            <div className="flex justify-between items-end mb-2">
              <div>
                <div className="text-3xl font-black text-green-400 dark:text-green-300">
                  {Math.round(progress)}%
                </div>
                <div className="text-xs font-bold text-primary-foreground/75 uppercase tracking-wider">
                  {t('vocab.mastered', { defaultValue: 'Mastered' })}
                </div>
              </div>
              <Trophy className="w-8 h-8 text-yellow-400 dark:text-yellow-300" />
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 dark:bg-green-300 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Actions */}
      <div className="p-6 grid gap-4">
        {/* Learn Button */}
        <Button
          variant="ghost"
          size="auto"
          onClick={onStartLearn}
          className="group w-full bg-card border-2 border-border rounded-2xl p-1 shadow-[4px_4px_0px_0px_rgba(226,232,240,1)] active:translate-y-1 active:shadow-none transition-all"
        >
          <div className="bg-card rounded-xl p-5 flex items-center justify-between group-hover:bg-green-50 dark:group-hover:bg-green-400/12 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-400/14 flex items-center justify-center text-green-600 dark:text-green-300">
                <BrainIcon />
              </div>
              <div className="text-left">
                <div className="font-black text-lg text-foreground">
                  {t('vocab.learn', { defaultValue: 'Start Learning' })}
                </div>
                <div className="text-xs font-bold text-muted-foreground">
                  {t('vocab.flashcards', { defaultValue: 'Flashcards' })}
                </div>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full border-2 border-border flex items-center justify-center group-hover:border-green-200 dark:group-hover:border-green-300/30 group-hover:bg-card">
              <Play className="w-4 h-4 text-green-500 dark:text-green-300 ml-0.5" />
            </div>
          </div>
        </Button>

        {/* Quiz Button */}
        <Button
          variant="ghost"
          size="auto"
          onClick={onStartTest}
          className="group w-full bg-card border-2 border-border rounded-2xl p-1 shadow-[4px_4px_0px_0px_rgba(226,232,240,1)] active:translate-y-1 active:shadow-none transition-all"
        >
          <div className="bg-card rounded-xl p-5 flex items-center justify-between group-hover:bg-indigo-50 dark:group-hover:bg-indigo-400/12 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-400/14 flex items-center justify-center text-indigo-600 dark:text-indigo-300">
                <Trophy className="w-6 h-6" />
              </div>
              <div className="text-left">
                <div className="font-black text-lg text-foreground">
                  {t('vocab.quiz', { defaultValue: 'Take Quiz' })}
                </div>
                <div className="text-xs font-bold text-muted-foreground">
                  {t('vocab.testMode', { defaultValue: 'Challenge yourself' })}
                </div>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full border-2 border-border flex items-center justify-center group-hover:border-indigo-200 dark:group-hover:border-indigo-300/30 group-hover:bg-card">
              <ChevronRight className="w-5 h-5 text-indigo-500 dark:text-indigo-300" />
            </div>
          </div>
        </Button>

        {/* Word List Preview or Manage */}
        <Button
          variant="ghost"
          size="auto"
          onClick={onManageList}
          className="mt-2 w-full bg-card p-4 rounded-xl border border-border flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <ListIcon className="w-5 h-5 text-muted-foreground" />
            <span className="font-bold text-muted-foreground">
              {t('vocab.wordList', { defaultValue: 'Word List' })}
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </Button>
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
