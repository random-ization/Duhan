import React, { useState, useEffect, useMemo } from 'react';
import { CourseSelection, GrammarPoint, Language, TextbookContent } from '../types';
import { BookOpen, Search, X } from 'lucide-react';
import { getLabels } from '../utils/i18n';
import { getLocalizedContent } from '../utils/languageUtils';
import { logger } from '../utils/logger';

// Stub for deleted service
const generateGrammarLesson = async (
  _institute: string,
  _level: number,
  _unit: number,
  _lang: Language,
  _content: TextbookContent
): Promise<GrammarPoint[]> => {
  logger.warn('AI Generation unavailable: geminiService deleted');
  return [];
};

/**
 * Checks if a grammar point matches the search query.
 * Extracted to reduce function nesting levels.
 */
const matchesSearchQuery = (point: GrammarPoint, query: string): boolean => {
  const q = query.toLowerCase();
  if (point.pattern.toLowerCase().includes(q)) return true;
  if (point.explanation.toLowerCase().includes(q)) return true;

  return point.usages.some(usage =>
    usage.example.toLowerCase().includes(q) ||
    usage.translation.toLowerCase().includes(q)
  );
};

interface GrammarModuleProps {
  course: CourseSelection;
  instituteName: string;
  language: Language;
  levelContexts: Record<number, TextbookContent>;
}

const GrammarModule: React.FC<GrammarModuleProps> = ({
  course,
  instituteName,
  language,
  levelContexts,
}) => {
  // Map Unit Number -> Points
  const [groupedPoints, setGroupedPoints] = useState<Record<number, GrammarPoint[]>>({});
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const labels = getLabels(language);

  useEffect(() => {
    const fetchGrammar = async () => {
      setLoading(true);
      const newGroups: Record<number, GrammarPoint[]> = {};

      const units = Object.keys(levelContexts)
        .map(Number)
        .sort((a, b) => a - b);

      for (const unit of units) {
        try {
          const content = levelContexts[unit];
          const data = await generateGrammarLesson(
            instituteName,
            course.level,
            unit,
            language,
            content
          );
          if (data.length > 0) {
            newGroups[unit] = data;
          }
        } catch (e) {
          console.error('[GrammarModule] Fetch error:', e);
        }
      }
      setGroupedPoints(newGroups);
      setLoading(false);
    };

    fetchGrammar();
  }, [instituteName, course.level, language, levelContexts]);

  // Filter Logic
  const filteredData = useMemo(() => {
    const query = searchQuery.trim();
    if (!query) return groupedPoints;

    const result: Record<number, GrammarPoint[]> = {};
    Object.entries(groupedPoints).forEach(([unitKey, points]) => {
      const matches = points.filter(p => matchesSearchQuery(p, query));
      if (matches.length > 0) {
        result[Number(unitKey)] = matches;
      }
    });
    return result;
  }, [groupedPoints, searchQuery]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-slate-500">{labels.analyzingGrammar}</p>
      </div>
    );
  }

  const units = Object.keys(filteredData)
    .map(Number)
    .sort((a, b) => a - b);

  const totalPoints = Object.values(filteredData).reduce(
    (acc: number, curr: GrammarPoint[]) => acc + curr.length,
    0
  );

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header with Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{labels.grammar}</h2>
          <p className="text-slate-500 text-sm mt-1">
            {instituteName} Level {course.level} • {totalPoints} Points
          </p>
        </div>
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search grammar..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 pr-8 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-full sm:w-72 bg-white shadow-sm transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {units.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200 text-slate-500">
          {searchQuery ? `No results found for "${searchQuery}"` : labels.noGrammar}
        </div>
      ) : (
        <div className="space-y-12">
          {units.map(unit => (
            <div key={`unit-${unit}`}>
              <div className="flex items-center mb-6">
                <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm font-bold mr-4">
                  {labels.unit} {unit}
                </span>
                <div className="h-px bg-slate-200 flex-1"></div>
              </div>

              <div className="grid gap-6">
                {filteredData[unit].map((point) => (
                  <div
                    key={`point-${unit}-${point.pattern}`}
                    className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:border-indigo-300 transition-colors"
                  >
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center">
                      <BookOpen className="w-5 h-5 text-indigo-600 mr-3" />
                      <h3 className="text-xl font-bold text-slate-800">{point.pattern}</h3>
                    </div>

                    <div className="p-6">
                      <p className="text-slate-700 mb-6 text-lg">
                        {getLocalizedContent(point, 'explanation', language)}
                      </p>

                      <div className="space-y-4">
                        {point.usages.map((usage) => (
                          <div
                            key={`usage-${point.pattern}-${usage.example}`}
                            className="bg-slate-50 p-4 rounded-lg border border-slate-100"
                          >
                            <div className="flex items-center mb-2">
                              <span className="text-xs font-bold text-white bg-slate-400 px-2 py-0.5 rounded-full mr-2">
                                {usage.situation}
                              </span>
                            </div>
                            <p className="font-medium text-slate-800 text-lg mb-1">
                              {usage.example}
                            </p>
                            <p className="text-slate-500 italic">
                              {getLocalizedContent(usage, 'translation', language)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GrammarModule;
