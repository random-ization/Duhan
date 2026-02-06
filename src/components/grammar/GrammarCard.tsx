import React from 'react';
import { ArrowRight, Trophy } from 'lucide-react';
import { GrammarPointData } from '../../types';
import { Button } from '../ui/button';

interface GrammarCardProps {
  grammar: GrammarPointData;
  index: number;
  onClick: () => void;
  onToggleStatus: (e: React.MouseEvent) => void;
}

const GrammarCard: React.FC<GrammarCardProps> = ({ grammar, index, onClick, onToggleStatus }) => {
  const isMastered = grammar.status === 'MASTERED';
  const isLearning = grammar.status === 'LEARNING';
  const proficiency = grammar.proficiency ?? 0;

  // Determine colors based on type
  const typeConfig: Record<
    string,
    { barColor: string; bgColor: string; textColor: string; label: string; hoverColor: string }
  > = {
    ENDING: {
      barColor: 'bg-blue-500',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700',
      label: '终结词尾',
      hoverColor: 'group-hover:text-blue-600',
    },
    PARTICLE: {
      barColor: 'bg-purple-500',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-700',
      label: '助词',
      hoverColor: 'group-hover:text-purple-600',
    },
    CONNECTIVE: {
      barColor: 'bg-amber-500',
      bgColor: 'bg-amber-100',
      textColor: 'text-amber-700',
      label: '连接词尾',
      hoverColor: 'group-hover:text-amber-600',
    },
  };
  const config = typeConfig[grammar.type] || {
    barColor: 'bg-slate-500',
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-700',
    label: grammar.type,
    hoverColor: 'group-hover:text-slate-600',
  };

  // Card number based on displayOrder or index
  const order = grammar.displayOrder ?? index + 1;
  const cardNumber = String(order).padStart(2, '0');

  // Helper to determine progress bar color
  const getProgressBarColor = () => {
    if (isMastered) return 'bg-green-500';
    if (isLearning) return 'bg-amber-500';
    return 'bg-slate-300';
  };

  // Helper to render status content
  const renderStatus = () => {
    if (isMastered) {
      return (
        <>
          <Trophy className="w-3 h-3 text-green-600" />
          <span className="text-[10px] font-bold text-green-600">已掌握</span>
        </>
      );
    }
    if (isLearning) {
      return (
        <>
          <div className="w-1.5 h-1.5 rounded-full border border-slate-900 bg-amber-400"></div>
          <span className="text-[10px] font-bold text-amber-600">学习中</span>
        </>
      );
    }
    return (
      <>
        <div className="w-1.5 h-1.5 rounded-full border border-slate-900 bg-slate-300"></div>
        <span className="text-[10px] font-bold text-slate-500">未学习</span>
      </>
    );
  };

  return (
    <div className="group bg-white border-2 border-slate-900 rounded-xl p-0 shadow-[4px_4px_0px_0px_#0f172a] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all cursor-pointer overflow-hidden flex flex-col h-52 relative">
      {/* Main Click Action (Stretched Link) */}
      <Button
        type="button"
        variant="ghost"
        size="auto"
        onClick={onClick}
        className="absolute inset-0 w-full h-full z-0 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 rounded-xl"
        aria-label={`View details for ${grammar.title}`}
      />

      {/* Top Colored Bar */}
      <div
        className={`h-1.5 w-full ${config.barColor} border-b-2 border-slate-900 z-10 relative pointer-events-none`}
      ></div>

      <div className="p-4 flex flex-col h-full z-10 relative pointer-events-none">
        {/* Top Row: Tag + Number */}
        <div className="flex justify-between items-start mb-2">
          <span
            className={`px-1.5 py-0.5 ${config.bgColor} ${config.textColor} border border-slate-900 rounded text-[10px] font-black uppercase tracking-tight`}
          >
            {config.label}
          </span>
          <span className="text-[10px] font-bold text-slate-400">#{cardNumber}</span>
        </div>

        {/* Title */}
        <h3
          className={`text-lg font-black text-slate-900 leading-tight mb-1 ${config.hoverColor} transition-colors`}
        >
          {grammar.title}
        </h3>

        {/* Summary */}
        <p className="text-xs text-slate-500 font-bold line-clamp-2">{grammar.summary}</p>

        {/* Proficiency Bar */}
        <div className="mt-auto pt-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-300">
              <div
                className={`h-full transition-all duration-300 ${getProgressBarColor()}`}
                style={{ width: `${proficiency}%` }}
              />
            </div>
            <span className="text-[10px] font-bold text-slate-500 w-8 text-right">
              {proficiency}%
            </span>
          </div>
        </div>

        {/* Bottom Row: Status + Action */}
        <div className="flex justify-between items-end pt-2 pointer-events-auto">
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={e => {
              e.stopPropagation();
              onToggleStatus(e);
            }}
            className="flex items-center gap-1.5 z-20 relative"
          >
            {renderStatus()}
          </Button>
          <div className="w-6 h-6 rounded border-2 border-slate-900 bg-white group-hover:bg-slate-900 group-hover:text-white flex items-center justify-center transition-colors">
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default GrammarCard;
