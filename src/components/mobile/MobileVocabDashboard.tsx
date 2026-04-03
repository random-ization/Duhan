import React from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, Play, ChevronRight } from 'lucide-react';
import { Button } from '../ui';

interface MobileVocabDashboardProps {
  readonly unitId: string;
  readonly instituteName: string;
  readonly words: readonly unknown[];
  readonly totalWords?: number;
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
  totalWords,
  masteredCount,
  language: _language,
  onStartLearn,
  onStartTest,
  onManageList,
}) => {
  const { t } = useTranslation();
  const total = typeof totalWords === 'number' ? totalWords : words.length;
  const progress = total > 0 ? (masteredCount / total) * 100 : 0;

  return (
    <div className="min-h-[100dvh] bg-background pb-mobile-nav">
      {/* Header */}
      <header className="relative overflow-hidden border-b border-border/50 bg-background p-6 pt-10 pb-12 shadow-sm">
        {/* Glow Effects */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-green-500/10 blur-[80px] rounded-full" />
        <div className="absolute top-10 -left-10 w-32 h-32 bg-primary/5 blur-[50px] rounded-full" />

        <div className="relative z-10">
          <div className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-3 opacity-70">
            {instituteName}
          </div>
          <h1 className="text-3xl font-black text-foreground mb-1 italic tracking-tighter">
            {unitId === 'ALL'
              ? t('vocab.allUnits', { defaultValue: 'All Units' })
              : `Unit ${unitId}`}
          </h1>
          <p className="text-muted-foreground font-bold text-sm tracking-tight opacity-80">
            {total} {t('vocab.wordsUnit', { defaultValue: 'words' })}
          </p>

          {/* Progress Card (Hero style) */}
          <div className="mt-8 bg-black dark:bg-zinc-900 rounded-[2.5rem] p-6 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-transparent opacity-50 transition-opacity group-hover:opacity-100" />
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="text-4xl font-black text-green-400 italic tracking-tighter">
                    {Math.round(progress)}%
                  </div>
                  <div className="text-[10px] font-black text-white/50 uppercase tracking-[0.15em] mt-1">
                    {t('vocab.mastered', { defaultValue: 'Mastered' })}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10">
                  <Trophy className="w-6 h-6 text-yellow-400" />
                </div>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-green-400 to-emerald-400 transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(74,222,128,0.5)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Actions */}
      <div className="p-6 pt-8 grid gap-5">
        {/* Learn Button */}
        <Button
          variant="ghost"
          size="auto"
          onClick={onStartLearn}
          className="group w-full bg-card border border-border/40 rounded-[2rem] p-1 shadow-sm active:scale-[0.98] transition-all hover:border-green-500/30"
        >
          <div className="bg-card rounded-[1.8rem] p-6 flex items-center justify-between group-hover:bg-green-50/50 dark:group-hover:bg-green-500/5 transition-colors">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-[1.2rem] bg-green-100 dark:bg-green-500/20 flex items-center justify-center text-green-600 dark:text-green-400 shadow-inner group-hover:scale-110 transition-transform">
                <BrainIcon />
              </div>
              <div className="text-left">
                <div className="font-black text-xl text-foreground italic tracking-tight">
                  {t('vocab.learn', { defaultValue: 'Start Learning' })}
                </div>
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider opacity-70">
                  {t('vocab.flashcards', { defaultValue: 'Flashcards' })}
                </div>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center group-hover:border-green-500/50 group-hover:bg-white dark:group-hover:bg-zinc-800 transition-all shadow-sm">
              <Play className="w-4 h-4 text-green-500 ml-0.5" />
            </div>
          </div>
        </Button>

        {/* Quiz Button */}
        <Button
          variant="ghost"
          size="auto"
          onClick={onStartTest}
          className="group w-full bg-card border border-border/40 rounded-[2rem] p-1 shadow-sm active:scale-[0.98] transition-all hover:border-indigo-500/30"
        >
          <div className="bg-card rounded-[1.8rem] p-6 flex items-center justify-between group-hover:bg-indigo-50/50 dark:group-hover:bg-indigo-500/5 transition-colors">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-[1.2rem] bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner group-hover:scale-110 transition-transform">
                <Trophy className="w-7 h-7" />
              </div>
              <div className="text-left">
                <div className="font-black text-xl text-foreground italic tracking-tight">
                  {t('vocab.quiz', { defaultValue: 'Take Quiz' })}
                </div>
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider opacity-70">
                  {t('vocab.testMode', { defaultValue: 'Challenge' })}
                </div>
              </div>
            </div>
            <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center group-hover:border-indigo-500/50 group-hover:bg-white dark:group-hover:bg-zinc-800 transition-all shadow-sm">
              <ChevronRight className="w-5 h-5 text-indigo-500" />
            </div>
          </div>
        </Button>

        {/* Word List Preview or Manage */}
        <Button
          variant="ghost"
          size="auto"
          onClick={onManageList}
          className="mt-2 w-full bg-muted/50 p-5 rounded-[1.5rem] border border-border/40 flex items-center justify-between hover:bg-card transition-all active:scale-[0.99]"
        >
          <div className="flex items-center gap-3">
            <ListIcon className="w-5 h-5 text-muted-foreground opacity-70" />
            <span className="font-black text-muted-foreground text-sm tracking-tight">
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
