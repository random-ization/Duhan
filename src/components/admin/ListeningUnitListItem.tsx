import React from 'react';
import { Headphones } from 'lucide-react';

export interface UnitListItem {
  id: string;
  unitIndex: number;
  title: string;
  hasAudio: boolean;
}

interface ListeningUnitListItemProps {
  unit: UnitListItem;
  isActive: boolean;
  onSelect: (unit: UnitListItem) => void;
}

export const ListeningUnitListItem: React.FC<ListeningUnitListItemProps> = ({
  unit,
  isActive,
  onSelect,
}) => {
  return (
    <button
      type="button"
      onClick={() => onSelect(unit)}
      className={`w-full text-left p-3 border-2 rounded-lg cursor-pointer transition-all ${
        isActive
          ? 'border-zinc-900 bg-lime-100 shadow-[2px_2px_0px_0px_#18181B]'
          : 'border-transparent hover:bg-zinc-50'
      }`}
      aria-label={`第 ${unit.unitIndex} 课: ${unit.title || '(未命名)'}`}
    >
      <div className="flex items-center gap-2">
        <Headphones className="w-4 h-4 text-lime-600" />
        <span className="font-black text-sm">第 {unit.unitIndex} 课</span>
        {unit.hasAudio && <span className="text-xs text-green-500" aria-label="包含音频">🎵</span>}
      </div>
      <div className="text-xs text-zinc-700 truncate">{unit.title || '(未命名)'}</div>
    </button>
  );
};
