import React from 'react';
import { Database, BarChart3, BookOpen } from 'lucide-react';

interface VocabStatsProps {
  totalWords: number;
  mastered: number;
  currentCourseName: string;
}

const VocabStats: React.FC<VocabStatsProps> = ({ totalWords, mastered, currentCourseName }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="p-4 bg-white border-2 border-zinc-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(24,24,27,0.25)] flex items-center gap-3">
        <div className="p-3 bg-zinc-900 text-white rounded-lg">
          <Database className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">词条总数</p>
          <p className="text-2xl font-black text-zinc-900">{totalWords}</p>
        </div>
      </div>
      <div className="p-4 bg-white border-2 border-zinc-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(24,24,27,0.25)] flex items-center gap-3">
        <div className="p-3 bg-emerald-600 text-white rounded-lg">
          <BarChart3 className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">精通词汇</p>
          <p className="text-2xl font-black text-zinc-900">{mastered}</p>
        </div>
      </div>
      <div className="p-4 bg-white border-2 border-zinc-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(24,24,27,0.25)] flex items-center gap-3">
        <div className="p-3 bg-indigo-600 text-white rounded-lg">
          <BookOpen className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">当前教材</p>
          <p className="text-sm font-black text-zinc-900">{currentCourseName}</p>
        </div>
      </div>
    </div>
  );
};

export default VocabStats;
