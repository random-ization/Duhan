import React from 'react';
import { CheckCircle } from 'lucide-react';

interface UnitListItemProps {
  unit: {
    unitIndex: number;
    title: string;
    hasAnalysis: boolean;
  };
  isActive: boolean;
  onSelect: () => void;
}

export const UnitListItem: React.FC<UnitListItemProps> = ({ unit, isActive, onSelect }) => {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left p-3 border-2 rounded-lg cursor-pointer transition-all ${
        isActive
          ? 'border-zinc-900 bg-lime-100 shadow-[2px_2px_0px_0px_#18181B]'
          : 'border-transparent hover:bg-zinc-50'
      }`}
      aria-label={`第 ${unit.unitIndex} 课: ${unit.title || '(未命名)'}`}
    >
      <div className="flex items-center gap-2">
        <span className="font-black text-sm">第 {unit.unitIndex} 课</span>
        {unit.hasAnalysis && <CheckCircle className="w-4 h-4 text-green-500" />}
      </div>
      <div className="text-xs text-zinc-700 truncate">{unit.title || '(未命名)'}</div>
    </button>
  );
};
