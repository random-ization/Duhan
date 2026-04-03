import React from 'react';
import { BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

interface MobilePictureBookCardProps {
  readonly title: string;
  readonly author?: string;
  readonly coverUrl?: string;
  readonly level: string;
  readonly onClick: () => void;
  readonly ariaLabel?: string;
}

export const MobilePictureBookCard: React.FC<MobilePictureBookCardProps> = ({
  title,
  author,
  coverUrl,
  level,
  onClick,
  ariaLabel,
}) => {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex flex-col gap-4 min-w-[160px] max-w-[160px] text-left group relative"
      aria-label={ariaLabel || title}
    >
      {/* Book Cover Container */}
      <div className="relative aspect-[10/13] w-full rounded-[2rem] overflow-hidden border border-white/20 bg-muted shadow-2xl transition-all duration-300 group-hover:shadow-indigo-500/20 group-hover:-translate-y-2 rim-light grain-overlay">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-500/10 to-purple-500/10 flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-indigo-200/50" />
          </div>
        )}

        {/* Level Badge Overlay */}
        <div className="absolute top-3 left-3 px-2.5 py-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-border/50 rounded-xl shadow-lg">
          <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
            {level}
          </span>
        </div>

        {/* Subtle Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>

      {/* Book Info */}
      <div className="px-1 space-y-1">
        <h4 className="text-sm font-black text-foreground leading-tight italic tracking-tight line-clamp-2 transition-colors group-hover:text-indigo-600">
          {title}
        </h4>
        {author && (
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 truncate">
            {author}
          </p>
        )}
      </div>
    </motion.button>
  );
};
