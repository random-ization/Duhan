import React from 'react';
import { Edit2, Trash2, Globe, Lock } from 'lucide-react';
import { Id } from '../../../convex/_generated/dataModel';

interface TypingListProps {
  texts: any[];
  onEdit: (text: any) => void;
  onDelete: (id: Id<'typing_texts'>) => void;
}

export const TypingList: React.FC<TypingListProps> = ({ texts, onEdit, onDelete }) => {
  return (
    <table className="w-full text-left">
      <thead className="bg-zinc-50 border-b-2 border-zinc-900">
        <tr>
          <th className="px-6 py-3 font-black text-xs uppercase text-zinc-500 tracking-wider">
            标题
          </th>
          <th className="px-6 py-3 font-black text-xs uppercase text-zinc-500 tracking-wider">
            分类
          </th>
          <th className="px-6 py-3 font-black text-xs uppercase text-zinc-500 tracking-wider">
            状态
          </th>
          <th className="px-6 py-3 font-black text-xs uppercase text-zinc-500 tracking-wider text-right">
            操作
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-100">
        {texts.map(text => (
          <tr key={text._id} className="group hover:bg-zinc-50 transition-colors">
            <td className="px-6 py-4">
              <div className="font-bold text-zinc-900">{text.title}</div>
              <div className="text-xs text-zinc-500 mt-0.5 truncate max-w-[300px]">
                {text.description || (text.type === 'ARTICLE' ? 'No description' : text.content)}
              </div>
            </td>
            <td className="px-6 py-4">
              {text.category ? (
                <span className="inline-flex items-center px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
                  {text.category}
                </span>
              ) : (
                <span className="text-zinc-400 text-xs">-</span>
              )}
            </td>
            <td className="px-6 py-4">
              {text.isPublic ? (
                <span className="inline-flex items-center gap-1 text-green-600 text-xs font-bold">
                  <Globe size={12} /> 公开
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-zinc-400 text-xs font-bold">
                  <Lock size={12} /> 私密
                </span>
              )}
            </td>
            <td className="px-6 py-4 text-right">
              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onEdit(text)}
                  className="p-2 rounded-lg bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-900 hover:text-zinc-900 shadow-sm"
                  aria-label={`Edit ${text.title}`}
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => onDelete(text._id)}
                  className="p-2 rounded-lg bg-white border border-zinc-200 text-red-500 hover:border-red-500 hover:bg-red-50 shadow-sm"
                  aria-label={`Delete ${text.title}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
