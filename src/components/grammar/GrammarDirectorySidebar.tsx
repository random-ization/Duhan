import React, { useMemo, useState } from 'react';
import { Button, Input } from '../ui';
import { useTranslation } from 'react-i18next';
import { Search, ChevronDown, CheckCircle2 } from 'lucide-react';

interface GrammarDirectorySidebarProps {
  courseGrammars: any[]; // GrammarItemDto from convex
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedGrammarId?: string;
  onSelectGrammar: (grammarId: string, unitId: number) => void;
  embedded?: boolean;
}

type SupportedLanguage = 'zh' | 'en' | 'vi' | 'mn';

function resolveSupportedLanguage(language?: string): SupportedLanguage {
  const normalized = (language || '').toLowerCase();
  if (normalized.startsWith('en')) return 'en';
  if (normalized.startsWith('vi')) return 'vi';
  if (normalized.startsWith('mn')) return 'mn';
  return 'zh';
}

function getLocalizedGrammarTitle(
  grammar: {
    title: string;
    titleEn?: string;
    titleZh?: string;
    titleVi?: string;
    titleMn?: string;
  },
  language: SupportedLanguage
): string {
  if (language === 'en') return grammar.titleEn || grammar.title;
  if (language === 'vi') return grammar.titleVi || grammar.title;
  if (language === 'mn') return grammar.titleMn || grammar.title;
  return grammar.titleZh || grammar.title;
}

function getLocalizedGrammarSummary(
  grammar: { summary?: string; summaryEn?: string; summaryVi?: string; summaryMn?: string },
  language: SupportedLanguage
): string {
  const candidates =
    language === 'en'
      ? [grammar.summaryEn, grammar.summary, grammar.summaryVi, grammar.summaryMn]
      : language === 'vi'
        ? [grammar.summaryVi, grammar.summaryEn, grammar.summary, grammar.summaryMn]
        : language === 'mn'
          ? [grammar.summaryMn, grammar.summaryEn, grammar.summary, grammar.summaryVi]
          : [grammar.summary, grammar.summaryEn, grammar.summaryVi, grammar.summaryMn];
  return candidates.find(text => typeof text === 'string' && text.trim().length > 0) || '';
}

const GrammarDirectorySidebar: React.FC<GrammarDirectorySidebarProps> = ({
  courseGrammars,
  searchQuery,
  onSearchChange,
  selectedGrammarId,
  onSelectGrammar,
  embedded = false,
}) => {
  const { t, i18n } = useTranslation();
  const language = resolveSupportedLanguage(i18n.language);
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
            getLocalizedGrammarTitle(g, language).toLowerCase().includes(q) ||
            getLocalizedGrammarSummary(g, language).toLowerCase().includes(q)
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
  }, [courseGrammars, searchQuery, language]);

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
    <aside
      className={
        embedded
          ? 'w-full bg-card border border-border shadow-sm flex flex-col overflow-hidden rounded-xl'
          : 'w-80 bg-card border-2 border-border shadow-pop-sm flex flex-col z-20 shrink-0 rounded-xl overflow-hidden h-full'
      }
    >
      <div className="p-4 border-b-2 border-border bg-muted/40">
        <h1 className="font-black text-xl italic tracking-tight text-foreground flex items-center gap-2">
          <span className="bg-primary text-primary-foreground px-1.5 rounded leading-none pt-0.5">
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
            className="w-full pl-10 py-2 border-2 border-border rounded-xl text-sm font-bold focus-visible:shadow-pop-sm outline-none bg-background shadow-none transition-shadow"
          />
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
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
              className="border-2 border-border rounded-xl overflow-hidden bg-background shadow-pop-sm"
            >
              <Button
                type="button"
                variant="ghost"
                size="auto"
                onClick={() => toggleUnit(unitId)}
                className="w-full px-4 py-3 flex items-center justify-between bg-muted/40 hover:bg-muted transition-colors"
              >
                <div className="flex flex-col items-start gap-1">
                  <span className="text-xs font-black text-foreground text-left leading-tight">
                    {getUnitName(unitId)}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground">
                      {stats.completed}/{stats.total}
                    </span>
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                />
              </Button>

              {isExpanded && (
                <ul className="p-2 space-y-1 bg-card border-t-2 border-border">
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
                                                        ? 'bg-primary text-primary-foreground border-primary shadow-pop-sm'
                                                        : 'text-muted-foreground border-transparent hover:bg-muted hover:border-border'
                                                    }
                                                `}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`text-[9px] w-4 h-4 flex items-center justify-center rounded-full border shrink-0 ${isActive ? 'bg-primary-foreground/20 border-primary-foreground/30' : 'bg-muted border-border text-muted-foreground'}`}
                            >
                              {index + 1}
                            </span>
                            <span className="truncate">
                              {getLocalizedGrammarTitle(g, language)}
                            </span>
                          </div>
                          {isMastered && (
                            <CheckCircle2
                              className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-primary-foreground' : 'text-foreground'}`}
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
