import { Trophy, ChevronRight, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { GrammarPointData } from '../../types';
import { getLocalizedContent } from '../../utils/languageUtils';
import ExquisiteProgressBar from './ExquisiteProgressBar';

interface MobileGrammarFeedProps {
  readonly grammarPoints: GrammarPointData[];
  readonly onSelect: (grammar: GrammarPointData) => void;
  readonly onToggleStatus: (id: string) => void;
  readonly isLoading: boolean;
}

export default function MobileGrammarFeed({
  grammarPoints,
  onSelect,
  onToggleStatus,
  isLoading,
}: MobileGrammarFeedProps) {
  const { t, i18n } = useTranslation();
  const language = (i18n.language || 'zh') as never;

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-28 bg-white rounded-3xl animate-pulse shadow-sm" />
        ))}
      </div>
    );
  }

  if (grammarPoints.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8 text-slate-200" />
        </div>
        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
          {t('grammarFeed.empty', { defaultValue: 'No grammar points found' })}
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 pb-mobile-nav space-y-4">
      <AnimatePresence mode="popLayout">
        {grammarPoints.map((point, index) => {
          const isMastered = point.status === 'MASTERED';
          const proficiency = point.proficiency || 0;

          const getThemeColor = (type: string) => {
            switch (type) {
              case 'ENDING':
                return 'text-blue-600 bg-blue-50/50 border-blue-100';
              case 'PARTICLE':
                return 'text-violet-600 bg-violet-50/50 border-violet-100';
              case 'CONNECTIVE':
                return 'text-amber-600 bg-amber-50/50 border-amber-100';
              default:
                return 'text-slate-500 bg-slate-50/50 border-slate-100';
            }
          };
          const themeClass = getThemeColor(point.type);

          return (
            <motion.div
              layout
              key={point.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <button
                type="button"
                onClick={() => onSelect(point)}
                className="group relative w-full text-left bg-white rounded-[2rem] p-5 shadow-sm hover:shadow-md border border-slate-100 active:scale-[0.98] transition-all overflow-hidden outline-none"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider ${themeClass}`}
                      >
                        {point.type}
                      </span>
                      {point.level && (
                        <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-100">
                          {point.level}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-black text-slate-900 leading-tight truncate pr-2">
                      {getLocalizedContent(point as never, 'title', language) || point.title}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      onToggleStatus(point.id);
                    }}
                    className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-all bg-slate-50 ${
                      isMastered
                        ? 'text-green-500 bg-green-50'
                        : 'text-slate-300 hover:text-slate-400'
                    }`}
                  >
                    {isMastered ? (
                      <Trophy className="w-6 h-6 fill-current" />
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-slate-200" />
                    )}
                  </button>
                </div>

                <p className="text-sm text-slate-500 font-medium line-clamp-2 mb-4 pr-6 leading-relaxed">
                  {getLocalizedContent(point as never, 'summary', language) || point.summary}
                </p>

                <div className="flex items-center gap-3 mt-auto pt-1">
                  <ExquisiteProgressBar
                    progress={isMastered ? 100 : proficiency}
                    className="flex-1"
                    height={5}
                  />
                  <span className="text-[10px] font-black text-slate-400 w-8 text-right shrink-0">
                    {isMastered ? '100' : Math.round(proficiency)}%
                  </span>
                </div>

                <ChevronRight className="absolute right-4 bottom-1/2 translate-y-[20%] w-4 h-4 text-slate-200 group-hover:text-indigo-300 transition-colors" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
