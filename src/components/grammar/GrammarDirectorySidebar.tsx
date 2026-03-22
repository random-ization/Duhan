import React, { useMemo, useState } from 'react';
import { Badge, Button, Card, CardContent, CardHeader, Input } from '../ui';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, ChevronDown, Circle, Search } from 'lucide-react';
import { sanitizeGrammarDisplayText } from '../../utils/grammarDisplaySanitizer';

type GrammarStatus = 'NEW' | 'LEARNING' | 'MASTERED';

interface GrammarDirectoryItem {
  id: string;
  title: string;
  titleEn?: string;
  titleZh?: string;
  titleVi?: string;
  titleMn?: string;
  summary?: string;
  summaryEn?: string;
  summaryVi?: string;
  summaryMn?: string;
  unitId: number;
  status?: string;
}

interface GrammarDirectorySidebarProps {
  courseGrammars: GrammarDirectoryItem[];
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

function normalizeStatus(value?: string): GrammarStatus {
  if (value === 'MASTERED') return 'MASTERED';
  if (value === 'LEARNING') return 'LEARNING';
  return 'NEW';
}

function getLocalizedGrammarTitle(
  grammar: Pick<GrammarDirectoryItem, 'title' | 'titleEn' | 'titleZh' | 'titleVi' | 'titleMn'>,
  language: SupportedLanguage
): string {
  const raw =
    language === 'en'
      ? grammar.titleEn || grammar.title
      : language === 'vi'
        ? grammar.titleVi || grammar.title
        : language === 'mn'
          ? grammar.titleMn || grammar.title
          : grammar.titleZh || grammar.title;
  return sanitizeGrammarDisplayText(raw);
}

function getLocalizedGrammarSummary(
  grammar: Pick<GrammarDirectoryItem, 'summary' | 'summaryEn' | 'summaryVi' | 'summaryMn'>,
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
  const raw = candidates.find(text => typeof text === 'string' && text.trim().length > 0) || '';
  return sanitizeGrammarDisplayText(raw);
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

  const visibleExpandedUnits = useMemo(() => {
    if (selectedUnitId === null || expandedUnits.has(selectedUnitId)) return expandedUnits;
    const next = new Set(expandedUnits);
    next.add(selectedUnitId);
    return next;
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

  const { unitsMap, unitStats, masteredCount, totalCount } = useMemo(() => {
    const map = new Map<number, GrammarDirectoryItem[]>();
    const stats = new Map<number, { total: number; mastered: number }>();

    const q = searchQuery.toLowerCase().trim();
    const filtered = q
      ? courseGrammars.filter(
          g =>
            getLocalizedGrammarTitle(g, language).toLowerCase().includes(q) ||
            getLocalizedGrammarSummary(g, language).toLowerCase().includes(q)
        )
      : courseGrammars;

    let mastered = 0;
    filtered.forEach(g => {
      const status = normalizeStatus(g.status);
      if (!map.has(g.unitId)) {
        map.set(g.unitId, []);
        stats.set(g.unitId, { total: 0, mastered: 0 });
      }

      map.get(g.unitId)!.push(g);

      const currentStats = stats.get(g.unitId)!;
      currentStats.total += 1;

      if (status === 'MASTERED') {
        currentStats.mastered += 1;
        mastered += 1;
      }
    });

    return {
      unitsMap: map,
      unitStats: stats,
      masteredCount: mastered,
      totalCount: filtered.length,
    };
  }, [courseGrammars, language, searchQuery]);

  const sortedUnitIds = useMemo(
    () => Array.from(unitsMap.keys()).sort((a, b) => a - b),
    [unitsMap]
  );

  const progressPercent = totalCount > 0 ? Math.round((masteredCount / totalCount) * 100) : 0;

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

  const statusMeta = (status: GrammarStatus) => {
    if (status === 'MASTERED') {
      return {
        icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
        label: t('grammarModule.statusMastered', { defaultValue: 'Mastered' }),
      };
    }
    if (status === 'LEARNING') {
      return {
        icon: <Circle className="h-3.5 w-3.5 fill-blue-500 text-blue-500" />,
        label: t('grammarModule.statusLearning', { defaultValue: 'Learning' }),
      };
    }
    return {
      icon: <Circle className="h-3.5 w-3.5 fill-slate-300 text-slate-300" />,
      label: t('grammarModule.statusNew', { defaultValue: 'New' }),
    };
  };

  return (
    <aside
      className={
        embedded
          ? 'w-full min-w-0 border border-slate-200 bg-white rounded-xl overflow-hidden flex flex-col'
          : 'w-[250px] min-h-0 shrink-0 border-r border-slate-200 bg-slate-50/80 flex flex-col h-full'
      }
    >
      <div className="p-4 border-b border-slate-200 space-y-3">
        <Card className="border-slate-200 shadow-none">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-slate-500">
                {t('grammarModule.totalProgressLabel', { defaultValue: 'Total progress' })}
              </p>
              <Badge variant="outline" className="border-slate-200 text-slate-600 bg-white">
                {masteredCount}/{totalCount || 0}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            placeholder={t('grammarModule.searchPlaceholder', 'Search grammar points...')}
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-9 h-10 border-slate-200 bg-white shadow-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {sortedUnitIds.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Search className="h-8 w-8 mb-2" />
            <p className="text-sm font-medium">{t('common.noMatches', 'No matches')}</p>
          </div>
        )}

        {sortedUnitIds.map(unitId => {
          const items = unitsMap.get(unitId) || [];
          const stats = unitStats.get(unitId) || { total: 0, mastered: 0 };
          const progress = stats.total > 0 ? Math.round((stats.mastered / stats.total) * 100) : 0;
          const isExpanded = visibleExpandedUnits.has(unitId);

          return (
            <Card key={unitId} className="border-slate-200 shadow-none bg-white overflow-hidden">
              <Button
                variant="ghost"
                size="auto"
                className="w-full px-3 py-2 rounded-none text-left hover:bg-slate-50"
                onClick={() => toggleUnit(unitId)}
              >
                <div className="w-full flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700 truncate">
                      {getUnitName(unitId)}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 w-16 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {stats.mastered}/{stats.total}
                      </span>
                    </div>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </div>
              </Button>

              {isExpanded && (
                <div className="border-t border-slate-200 p-1.5 space-y-1 bg-white">
                  {items.map((item, index) => {
                    const isActive = selectedGrammarId === item.id;
                    const status = normalizeStatus(item.status);
                    const meta = statusMeta(status);

                    return (
                      <Button
                        key={item.id}
                        variant="ghost"
                        size="auto"
                        onClick={() => onSelectGrammar(item.id, item.unitId)}
                        className={`w-full justify-start rounded-lg px-2.5 py-2 h-auto transition-colors border ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-white text-slate-700 border-transparent hover:bg-slate-50 hover:border-slate-200'
                        }`}
                      >
                        <span
                          className={`h-8 w-1 rounded-full mr-2 ${isActive ? 'bg-blue-500' : 'bg-transparent'}`}
                          aria-hidden
                        />
                        <span className="mr-2 text-xs text-slate-400 w-5 text-left">
                          {index + 1}
                        </span>
                        <span className="min-w-0 flex-1 text-left">
                          <span className="block truncate text-sm font-medium">
                            {getLocalizedGrammarTitle(item, language)}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                            {meta.icon}
                            <span>{meta.label}</span>
                          </span>
                        </span>
                      </Button>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </aside>
  );
};

export default GrammarDirectorySidebar;
