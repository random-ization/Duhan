import React from 'react';
import { Search, ChevronLeft } from 'lucide-react';
import { GrammarPointData } from '../../types';
import { useTranslation } from 'react-i18next';
import MobileUnitChips from './MobileUnitChips';
import MobileGrammarFeed from './MobileGrammarFeed';
import MobileGrammarDetailSheet from './MobileGrammarDetailSheet';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';

interface MobileGrammarViewProps {
  readonly selectedUnit: number;
  readonly totalUnits: number;
  readonly onSelectUnit: (unit: number) => void;
  readonly grammarPoints: GrammarPointData[];
  readonly searchQuery: string;
  readonly onSearchChange: (query: string) => void;
  readonly selectedGrammar: GrammarPointData | null;
  readonly onSelectGrammar: (grammar: GrammarPointData | null) => void;
  readonly onToggleStatus: (id: string) => void;
  readonly isLoading: boolean;
  readonly onProficiencyUpdate: (
    id: string,
    prof: number,
    status: GrammarPointData['status']
  ) => void;
  readonly instituteId: string;
}

export default function MobileGrammarView({
  selectedUnit,
  totalUnits,
  onSelectUnit,
  grammarPoints,
  searchQuery,
  onSearchChange,
  selectedGrammar,
  onSelectGrammar,
  onToggleStatus,
  isLoading,
  onProficiencyUpdate,
  instituteId,
}: MobileGrammarViewProps) {
  const { t } = useTranslation();
  const navigate = useLocalizedNavigate();

  // Filter grammar points based on search query
  const filteredPoints = grammarPoints.filter(g => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      g.title.toLowerCase().includes(query) ||
      g.summary.toLowerCase().includes(query) ||
      g.explanation.toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header with Search */}
      <div className="bg-white px-4 py-3 sticky top-0 z-20 border-b border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => navigate(`/course/${instituteId}`)}
            className="w-9 h-9 border-2 border-slate-100 rounded-xl flex items-center justify-center text-slate-400 active:bg-slate-50 shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              placeholder={t('search', { defaultValue: 'Search grammar...' })}
              className="w-full bg-slate-100 border-2 border-transparent focus:bg-white focus:border-slate-900 rounded-xl pl-9 pr-4 py-2 text-sm font-bold transition-all outline-none"
            />
          </div>
        </div>

        {/* Unit Chips */}
        <MobileUnitChips
          totalUnits={totalUnits}
          selectedUnit={selectedUnit}
          onSelect={onSelectUnit}
        />
      </div>

      {/* Feed */}
      <div className="flex-1">
        <MobileGrammarFeed
          grammarPoints={filteredPoints}
          onSelect={onSelectGrammar}
          onToggleStatus={onToggleStatus}
          isLoading={isLoading}
        />
      </div>

      {/* Detail Sheet */}
      <MobileGrammarDetailSheet
        grammar={selectedGrammar}
        onClose={() => onSelectGrammar(null)}
        onProficiencyUpdate={onProficiencyUpdate}
      />
    </div>
  );
}
