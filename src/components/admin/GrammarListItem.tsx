import React from 'react';
import { Sparkles, Trash2 } from 'lucide-react';

interface GrammarListItemProps {
  g: { id: string; title: string; summary?: string };
  onEdit: (id: string) => void;
  onRemove: (id: string) => void;
}

export const GrammarListItem: React.FC<GrammarListItemProps> = ({
  g,
  onEdit,
  onRemove,
}) => (
  <div className="p-3 border-2 border-zinc-200 rounded-lg flex items-start justify-between hover:border-zinc-400 transition-colors">
    <div className="flex-1">
      <div className="font-bold text-zinc-900">{g.title}</div>
      <div className="text-xs text-zinc-500 truncate">{g.summary}</div>
    </div>
    <div className="ml-2 flex flex-col gap-1">
      <button
        onClick={() => onEdit(g.id)}
        className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded transition-colors"
        title="编辑匹配模式"
        aria-label={`编辑 ${g.title} 的匹配模式`}
      >
        <Sparkles className="w-4 h-4" />
      </button>
      <button
        onClick={() => onRemove(g.id)}
        className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
        title="从单元移除"
        aria-label={`从单元移除 ${g.title}`}
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  </div>
);
