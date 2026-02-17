import React from 'react';
import { RotateCcw } from 'lucide-react';
import { TypingStats } from '../hooks/useKoreanTyping';
import { Button } from '../../../components/ui';

interface StatsOverlayProps {
  stats: TypingStats;
  onRestart: () => void;
  visible: boolean;
}

export const StatsOverlay: React.FC<StatsOverlayProps> = ({ stats, onRestart, visible }) => {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-card/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="grid grid-cols-2 gap-12 mb-12">
        <div className="flex flex-col items-center">
          <div className="text-6xl font-black text-indigo-600 mb-2">{stats.wpm}</div>
          <div className="text-xl font-bold text-muted-foreground uppercase tracking-widest">
            WPM
          </div>
        </div>
        <div className="flex flex-col items-center">
          <div className="text-6xl font-black text-indigo-600 mb-2">{stats.accuracy}%</div>
          <div className="text-xl font-bold text-muted-foreground uppercase tracking-widest">
            Accuracy
          </div>
        </div>
      </div>

      <Button
        variant="ghost"
        size="auto"
        onClick={onRestart}
        className="group flex flex-col items-center gap-2 text-muted-foreground hover:text-indigo-600 transition-colors"
      >
        <div className="p-4 rounded-full bg-muted group-hover:bg-indigo-50 transition-colors">
          <RotateCcw className="w-8 h-8" />
        </div>
        <span className="text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-2 group-hover:translate-y-0">
          Press Tab to Restart
        </span>
      </Button>
    </div>
  );
};
