import React from 'react';
import { BookOpen } from 'lucide-react';

interface CoverPlaceholderProps {
  readonly title: string;
  readonly level: number;
  readonly themeColor?: string;
  readonly publisher?: string;
  readonly className?: string;
}

export default function CoverPlaceholder({
  title,
  level,
  themeColor = '#6366f1', // Indigo-500 default
  publisher,
  className = '',
}: CoverPlaceholderProps) {
  return (
    <div
      className={`relative w-full h-full overflow-hidden flex flex-col items-center justify-center p-4 text-white ${className}`}
      style={{
        background: `linear-gradient(135deg, ${themeColor}, ${themeColor}cc)`,
      }}
    >
      {/* Decorative patterns */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
            backgroundSize: '12px 12px',
          }}
        />
      </div>

      {/* Abstract geometric shapes */}
      <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full blur-2xl opacity-40 bg-white/30" />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full blur-3xl opacity-30 bg-black/20" />

      {/* Book Title/Info */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3 shadow-sm border border-white/30">
          <BookOpen className="w-5 h-5 text-white" />
        </div>

        <div className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-80">
          Lesson Series
        </div>

        <div className="text-[10px] font-bold max-w-[90%] truncate opacity-90 mb-1">{title}</div>

        <div className="text-4xl md:text-5xl font-black mb-1 drop-shadow-md">{level}</div>

        <div className="text-[9px] font-bold uppercase tracking-widest bg-white/15 px-2 py-0.5 rounded border border-white/10">
          Level
        </div>
      </div>

      {/* Publisher footer */}
      {publisher && (
        <div className="absolute bottom-4 left-0 right-0 px-4 text-center">
          <p className="text-[8px] font-black uppercase tracking-wider opacity-60 truncate">
            {publisher}
          </p>
        </div>
      )}

      {/* Side spine simulation */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-black/10 shadow-sm" />
    </div>
  );
}
