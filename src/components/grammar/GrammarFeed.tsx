import React from 'react';
import { GrammarPointData } from '../../types';
import GrammarCard from './GrammarCard';

interface GrammarFeedProps {
  grammarPoints: GrammarPointData[];
  selectedUnit: string | null;
  onSelect: (grammar: GrammarPointData) => void;
  onToggleStatus: (id: string) => void;
  isLoading?: boolean;
}

const SkeletonCard = () => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-64 flex flex-col animate-pulse">
    <div className="flex justify-between items-start mb-4">
      <div className="h-4 w-16 bg-slate-100 rounded"></div>
      <div className="h-4 w-8 bg-slate-100 rounded"></div>
    </div>
    <div className="h-8 w-3/4 bg-slate-200 rounded mb-2"></div>
    <div className="h-4 w-1/2 bg-slate-100 rounded mb-8"></div>

    <div className="mt-auto pt-4 border-t border-slate-100 flex justify-between items-center">
      <div className="h-4 w-12 bg-slate-100 rounded"></div>
      <div className="h-8 w-8 bg-slate-100 rounded"></div>
    </div>
  </div>
);

const GrammarFeed: React.FC<GrammarFeedProps> = ({
  grammarPoints,
  selectedUnit,
  onSelect,
  onToggleStatus,
  isLoading,
}) => {
  // Calculate progress
  const masteredCount = grammarPoints.filter(p => p.status === 'MASTERED').length;
  const progressPercent =
    grammarPoints.length > 0 ? (masteredCount / grammarPoints.length) * 100 : 0;

  // Extract unit title for display
  const displayTitle = selectedUnit || '全部语法点';

  return (
    <main className="flex-1 overflow-y-auto pb-20 pr-2">
      {/* Unit Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-lg font-black bg-white border-2 border-slate-900 px-3 py-1 rounded-lg shadow-[2px_2px_0px_0px_#0f172a] inline-block">
          {displayTitle}
          {!isLoading && (
            <span className="text-slate-400 font-medium ml-2 text-sm">
              {grammarPoints.length} Grammar Points
            </span>
          )}
        </h2>
        {!isLoading && (
          <div className="w-32 h-3 bg-white border-2 border-slate-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 border-r-2 border-slate-900 transition-all"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        )}
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={`skeleton-${i}`} />)
          : grammarPoints.map((point, index) => (
              <GrammarCard
                key={point.id}
                grammar={point}
                index={index}
                onClick={() => onSelect(point)}
                onToggleStatus={e => {
                  e.stopPropagation();
                  onToggleStatus(point.id);
                }}
              />
            ))}
      </div>

      {!isLoading && grammarPoints.length === 0 && (
        <div className="border-2 border-dashed border-slate-400 rounded-xl p-12 text-center bg-white">
          <p className="text-slate-400 font-bold text-lg">此单元暂无语法点</p>
        </div>
      )}
    </main>
  );
};

export default GrammarFeed;
