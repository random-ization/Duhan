import React, { useMemo, useState } from 'react';
import { Input } from '../ui';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import { Search, ChevronDown, CheckCircle2 } from 'lucide-react';

interface GrammarDirectorySidebarProps {
  courseGrammars: any[]; // GrammarItemDto from convex
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedGrammarId?: string;
  onSelectGrammar: (grammarId: string, unitId: number) => void;
}

const GrammarDirectorySidebar: React.FC<GrammarDirectorySidebarProps> = ({
  courseGrammars,
  searchQuery,
  onSearchChange,
  selectedGrammarId,
  onSelectGrammar,
}) => {
  const { t } = useTranslation();
  const [expandedUnits, setExpandedUnits] = useState<Set<number>>(new Set([1]));
  const selectedUnitId = useMemo(() => {
    if (!selectedGrammarId) return null;
    const grammar = courseGrammars.find(g => g.id === selectedGrammarId);
    return grammar?.unitId ?? null;
  }, [courseGrammars, selectedGrammarId]);
  const effectiveExpandedUnits = useMemo(() => {
    if (selectedUnitId === null || expandedUnits.has(selectedUnitId)) {
      return expandedUnits;
    }
    return new Set(expandedUnits).add(selectedUnitId);
  }, [expandedUnits, selectedUnitId]);

  const getUnitName = (unitId: number) => {
    const units: Record<number, string> = {
      1: t('grammarModule.units.unit1', 'Speculation & inference'),
      2: t('grammarModule.units.unit2', 'Contrast & shifts'),
      3: t('grammarModule.units.unit3', 'Cause & reason'),
      4: t('grammarModule.units.unit4', 'Purpose & intent'),
      5: t('grammarModule.units.unit5', 'Progress & completion'),
      6: t('grammarModule.units.unit6', 'State & continuity'),
      7: t('grammarModule.units.unit7', 'Degree & limits'),
      8: t('grammarModule.units.unit8', 'Hypothesis & assumption'),
      9: t('grammarModule.units.unit9', 'Concession & inclusion'),
      10: t('grammarModule.units.unit10', 'Chance & change'),
      11: t('grammarModule.units.unit11', 'Reported speech'),
      12: t('grammarModule.units.unit12', 'Necessity & experience'),
      13: t('grammarModule.units.unit13', 'Listing & sequence'),
      14: t('grammarModule.units.unit14', 'Standards & range'),
      15: t('grammarModule.units.unit15', 'Particles & nuance'),
    };
    return units[unitId] || `${t('grammarModule.unitLabel', 'Unit')} ${unitId}`;
  };

  // Group grammars by unit ID and calculate stats
  const { unitsMap, unitStats } = useMemo(() => {
    const map = new Map<number, any[]>();
    const stats = new Map<number, { total: number; completed: number }>();

    const q = searchQuery.toLowerCase().trim();
    const filtered = q
      ? courseGrammars.filter(
          g =>
            g.title.toLowerCase().includes(q) || (g.summary && g.summary.toLowerCase().includes(q))
        )
      : courseGrammars;

    filtered.forEach(g => {
      if (!map.has(g.unitId)) {
        map.set(g.unitId, []);
        stats.set(g.unitId, { total: 0, completed: 0 });
      }
      map.get(g.unitId)!.push(g);

      const currentStats = stats.get(g.unitId)!;
      currentStats.total++;
      if (g.status === 'MASTERED') {
        currentStats.completed++;
      }
    });

    return { unitsMap: map, unitStats: stats };
  }, [courseGrammars, searchQuery]);

  const sortedUnitIds = Array.from(unitsMap.keys()).sort((a, b) => a - b);

  const toggleUnit = (unitId: number) => {
    setExpandedUnits(prev => {
      const next = new Set(prev);
      if (next.has(unitId)) {
        next.delete(unitId);
      } else {
        next.add(unitId);
      }
      return next;
    });
  };

  return (
    <aside className="w-80 bg-card border-r-2 border-slate-900 dark:border-border shadow-[4px_0px_0px_0px_#0f172a] dark:shadow-[4px_0px_0px_0px_rgba(148,163,184,0.26)] flex flex-col z-20 shrink-0 m-4 rounded-xl overflow-hidden">
      <div className="p-4 border-b-2 border-slate-900 dark:border-border bg-slate-50 dark:bg-slate-900/50">
        <h1 className="font-black text-xl italic tracking-tight text-foreground flex items-center gap-2">
          <span className="bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 px-1.5 rounded leading-none pt-0.5">
            H
          </span>
          {t('grammarModule.directoryTitle', 'Grammar workbook')}
        </h1>
        <div className="relative mt-4">
          <Input
            type="text"
            placeholder={t('grammarModule.searchPlaceholder', 'Search grammar points...')}
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full pl-10 py-2 border-2 border-slate-900 dark:border-border rounded-xl text-sm font-bold focus-visible:shadow-[4px_4px_0px_0px_#0f172a] dark:focus-visible:shadow-[4px_4px_0px_0px_rgba(148,163,184,0.26)] outline-none bg-background shadow-none transition-shadow"
          />
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin scrollbar-thumb-slate-900 scrollbar-track-transparent dark:scrollbar-thumb-slate-100">
        {sortedUnitIds.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 opacity-50">
            <Search className="w-10 h-10 mb-2" />
            <p className="text-sm font-bold text-muted-foreground">
              {t('common.noMatches', 'No matches')}
            </p>
          </div>
        )}

        {sortedUnitIds.map(unitId => {
          const items = unitsMap.get(unitId)!;
          const stats = unitStats.get(unitId)!;
          const isExpanded = effectiveExpandedUnits.has(unitId);
          const progress = Math.round((stats.completed / stats.total) * 100);

          return (
            <div
              key={unitId}
              className="border-2 border-slate-900 dark:border-border rounded-xl overflow-hidden bg-background shadow-[2px_2px_0px_0px_#0f172a] dark:shadow-[2px_2px_0px_0px_rgba(148,163,184,0.26)]"
            >
              <button
                onClick={() => toggleUnit(unitId)}
                className="w-full px-4 py-3 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="flex flex-col items-start gap-1">
                  <span className="text-xs font-black text-foreground text-left leading-tight">
                    {getUnitName(unitId)}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-900 dark:bg-slate-100 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">
                      {stats.completed}/{stats.total}
                    </span>
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                />
              </button>

              {isExpanded && (
                <ul className="p-2 space-y-1 bg-white dark:bg-slate-950 border-t-2 border-slate-900 dark:border-border">
                  {items.map((g, index) => {
                    const isActive = selectedGrammarId === g.id;
                    const isMastered = g.status === 'MASTERED';
                    return (
                      <li
                        key={g.id}
                        onClick={() => onSelectGrammar(g.id, g.unitId)}
                        className={`
                                                    group/item
                                                    px-3 py-2 rounded-lg font-bold text-sm cursor-pointer transition-all border-2
                                                    ${
                                                      isActive
                                                        ? 'bg-slate-900 text-white border-slate-900 shadow-[2px_2px_0px_0px_#0f172a] dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100 dark:shadow-[2px_2px_0px_0px_rgba(148,163,184,0.26)]'
                                                        : 'text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                                                    }
                                                `}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`text-[9px] w-4 h-4 flex items-center justify-center rounded-full border shrink-0 ${isActive ? 'bg-white/20 border-white/30' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'}`}
                            >
                              {index + 1}
                            </span>
                            <span className="truncate">
                              {i18n.language === 'zh'
                                ? g.titleZh || g.title
                                : i18n.language === 'vi'
                                  ? g.titleVi || g.title
                                  : i18n.language === 'mn'
                                    ? g.titleMn || g.title
                                    : g.titleEn || g.title}
                            </span>
                          </div>
                          {isMastered && (
                            <CheckCircle2
                              className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}
                            />
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
};

export default GrammarDirectorySidebar;
