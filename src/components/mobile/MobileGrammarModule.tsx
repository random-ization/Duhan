import React, { useState, useMemo } from 'react';
import { CourseSelection, GrammarPoint, Language } from '../../types';
import { BookOpen, Search, X, ChevronRight, GraduationCap } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { getLocalizedContent } from '../../utils/languageUtils';
import { BottomSheet } from '../common/BottomSheet';
import { useTranslation } from 'react-i18next';

// Must align with what Desktop uses
const matchesSearchQuery = (point: GrammarPoint, query: string): boolean => {
  const q = query.toLowerCase();
  if (point.pattern.toLowerCase().includes(q)) return true;
  if (point.explanation.toLowerCase().includes(q)) return true;
  return point.usages.some(
    usage => usage.example.toLowerCase().includes(q) || usage.translation.toLowerCase().includes(q)
  );
};

interface MobileGrammarModuleProps {
  course: CourseSelection;
  instituteName: string;
  language: Language;
  groupedPoints: Record<number, GrammarPoint[]>;
}

export const MobileGrammarModule: React.FC<MobileGrammarModuleProps> = ({
  course,
  instituteName,
  language,
  groupedPoints,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPoint, setSelectedPoint] = useState<GrammarPoint | null>(null);

  // Filter Logic
  const filteredData = useMemo(() => {
    const query = searchQuery.trim();
    if (!query) return groupedPoints;
    const result: Record<number, GrammarPoint[]> = {};
    Object.entries(groupedPoints).forEach(([unitKey, points]) => {
      const matches = points.filter(p => matchesSearchQuery(p, query));
      if (matches.length > 0) result[Number(unitKey)] = matches;
    });
    return result;
  }, [groupedPoints, searchQuery]);

  const units = Object.keys(filteredData)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className="pb-24 pt-4 px-4 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-black text-slate-900 mb-1">{t('grammar')}</h2>
        <p className="text-slate-500 text-sm font-medium">
          {instituteName} {t('textbook.level', { level: course.level })}
        </p>
      </div>

      {/* Search Bar */}
      <div className="sticky top-0 z-10 bg-slate-50 pb-4">
        <div className="relative shadow-sm rounded-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            type="text"
            placeholder={t('common.search') || 'Search...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 pr-9 py-3 text-base rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
          />
          {searchQuery && (
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 p-1"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Content List */}
      {units.length === 0 ? (
        <div className="text-center py-10 text-slate-400">
          <p>{searchQuery ? t('common.noMatches') : t('noGrammar')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {units.map(unit => (
            <div key={unit} className="space-y-3">
              <div className="flex items-center gap-2 pl-1">
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider">
                  {t('unit')} {unit}
                </span>
                <div className="h-px bg-slate-200 flex-1" />
              </div>

              <div className="grid gap-2">
                {filteredData[unit].map(point => (
                  <button
                    key={`${unit}-${point.pattern}`}
                    onClick={() => setSelectedPoint(point)}
                    className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm active:scale-[0.99] transition-transform text-left flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0 text-indigo-500">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 truncate pr-2">{point.pattern}</h3>
                        <p className="text-xs text-slate-500 truncate mt-0.5 max-w-[200px]">
                          {getLocalizedContent(point, 'explanation', language)}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-300" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Bottom Sheet */}
      <BottomSheet
        isOpen={!!selectedPoint}
        onClose={() => setSelectedPoint(null)}
        height="auto"
        title={selectedPoint?.pattern || ''}
      >
        {selectedPoint && (
          <div className="pb-8 space-y-6">
            {/* Explanation */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <GraduationCap className="w-3 h-3" />
                {t('grammarTraining.explanation')}
              </h4>
              <p className="text-lg text-slate-800 leading-relaxed font-medium">
                {getLocalizedContent(selectedPoint, 'explanation', language)}
              </p>
            </div>

            {/* Examples */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <BookOpen className="w-3 h-3" />
                {t('grammarTraining.examples')}
              </h4>
              <div className="space-y-3">
                {selectedPoint.usages?.map((usage, idx) => (
                  <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-base font-bold text-slate-900 mb-1 leading-snug">
                      {usage.example}
                    </p>
                    <p className="text-sm text-slate-500 leading-snug">
                      {getLocalizedContent(usage, 'translation', language)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <Button
              className="w-full h-12 rounded-xl text-lg font-bold bg-slate-900 text-white shadow-lg mt-2"
              onClick={() => setSelectedPoint(null)}
            >
              {t('common.gotIt')}
            </Button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
};
