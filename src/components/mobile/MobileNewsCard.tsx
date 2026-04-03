import React from 'react';
import { ChevronRight, Globe, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

interface MobileNewsCardProps {
  readonly title: string;
  readonly source: string;
  readonly summary?: string;
  readonly difficulty: 'L1' | 'L2' | 'L3';
  readonly wordCount: number;
  readonly dateLabel: string;
  readonly onClick: () => void;
  readonly ariaLabel?: string;
}

export const MobileNewsCard: React.FC<MobileNewsCardProps> = ({
  title,
  source,
  summary,
  difficulty,
  wordCount,
  dateLabel,
  onClick,
  ariaLabel,
}) => {
  const getDifficultyStyles = (level: string) => {
    switch (level) {
      case 'L1':
        return 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-400/12 dark:text-emerald-300';
      case 'L2':
        return 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-400/12 dark:text-blue-300';
      default:
        return 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-400/12 dark:text-indigo-300';
    }
  };

  return (
    <motion.button
      whileTap={{ scale: 0.96, rotate: 1 }}
      onClick={onClick}
      className="w-full bg-card/70 dark:bg-card/40 rounded-[2.5rem] p-6 border border-white/10 shadow-2xl transition-all duration-300 hover:shadow-indigo-500/10 hover:-translate-y-1 text-left group relative backdrop-blur-md rim-light grain-overlay"
      aria-label={ariaLabel || title}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-muted dark:bg-slate-800 flex items-center justify-center text-slate-400 border border-border/50">
            <Globe className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">
              {source}
            </span>
            <span className="text-[10px] font-black italic text-indigo-600/60 dark:text-indigo-400/60">
              {dateLabel}
            </span>
          </div>
        </div>

        <div
          className={`px-3 py-1 rounded-xl border text-[10px] font-black uppercase tracking-widest bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-sm ${getDifficultyStyles(difficulty)}`}
        >
          {difficulty === 'L1' ? 'Beginner' : difficulty === 'L2' ? 'Intermediate' : 'Advanced'}
        </div>
      </div>

      <h3 className="text-lg font-black text-foreground leading-tight mb-2 group-hover:text-indigo-600 transition-colors italic tracking-tight">
        {title}
      </h3>

      {summary && (
        <p className="text-xs text-muted-foreground font-semibold line-clamp-2 mb-5 leading-relaxed opacity-80">
          {summary}
        </p>
      )}

      <div className="flex items-center justify-between mt-auto pt-5 border-t border-border/30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>{wordCount} words study extract</span>
          </div>
        </div>

        <div className="h-8 w-8 rounded-full bg-slate-900 dark:bg-indigo-600 flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110">
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </motion.button>
  );
};
