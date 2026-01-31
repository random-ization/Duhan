import React from 'react';
import { Trash2 } from 'lucide-react';

interface Institute {
  id: string;
  name: string;
  nameZh?: string;
  nameEn?: string;
  nameVi?: string;
  nameMn?: string;
  coverUrl?: string;
  themeColor?: string;
  publisher?: string;
  displayLevel?: string;
  volume?: string;
  totalUnits?: number;
}

interface InstituteListItemProps {
  inst: Institute;
  isEditing: boolean;
  onEdit: (inst: Institute) => void;
  onDelete: (id: string, name: string) => void;
}

export const InstituteListItem: React.FC<InstituteListItemProps> = ({
  inst,
  isEditing,
  onEdit,
  onDelete,
}) => {
  return (
    <button
      type="button"
      className={`w-full text-left p-4 border-2 rounded-xl flex items-center gap-4 transition-all cursor-pointer ${
        isEditing
          ? 'border-zinc-900 bg-lime-50 shadow-[2px_2px_0px_0px_#18181B]'
          : 'border-zinc-200 hover:border-zinc-400'
      }`}
      onClick={() => onEdit(inst)}
      aria-label={`编辑教材 ${inst.name}`}
    >
      {/* Color indicator */}
      <div
        className="w-3 h-12 rounded-full shrink-0"
        style={{ backgroundColor: inst.themeColor || '#6366f1' }}
      />

      <div className="flex-1 min-w-0">
        <div className="font-bold text-zinc-900 truncate">
          {inst.name}
          {inst.displayLevel && (
            <span className="text-zinc-500 font-normal ml-1">{inst.displayLevel}</span>
          )}
          {inst.volume && <span className="text-zinc-500 font-normal ml-1">{inst.volume}</span>}
        </div>
        <div className="text-xs text-zinc-500 truncate">
          {inst.publisher || '未设置出版社'}
          {inst.totalUnits ? ` · ${inst.totalUnits}课` : ''}
        </div>
      </div>

      <button
        type="button"
        onClick={e => {
          e.stopPropagation();
          onDelete(inst.id, inst.name);
        }}
        className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
        aria-label={`删除教材 ${inst.name}`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </button>
  );
};
