import { Check, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
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
                return 'TOPIK II';
              default:
                return 'TOPIK II';
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
              <div
                onClick={() => onSelect(point)}
                className="card-paper rounded-[2rem] p-6 relative select-none w-full text-left"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-[6px] text-[9px] font-black tracking-widest uppercase shadow-[inset_0_1px_1px_rgba(255,255,255,1)]">
                    {point.type} • {point.level || 'Lv.3'}
                  </span>
                  
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      onToggleStatus(point.id);
                    }}
                    className={`w-8 h-8 rounded-full border flex items-center justify-center mastery-btn outline-none transition-colors ${
                      isMastered
                        ? 'border-emerald-600 text-emerald-100 bg-emerald-500 mastered'
                        : 'border-slate-200 text-slate-300 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <Check className="w-4 h-4" strokeWidth={3} />
                  </button>
                </div>

                <h3 className="text-3xl font-black text-slate-900 tracking-tight mb-2 drop-shadow-sm pr-4">
                  {getLocalizedContent(point as never, 'title', language) || point.title}
                </h3>
                <p className="text-[12px] font-bold text-slate-500 tracking-wide mb-6 leading-relaxed line-clamp-2">
                  {getLocalizedContent(point as never, 'summary', language) || point.summary}
                </p>

                <div className="flex items-center space-x-3">
                    <div className="flex-1 h-1.5 bg-slate-200/60 rounded-full overflow-hidden shadow-inner">
                        <div 
                           className="h-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all duration-500" 
                           style={{ width: `${isMastered ? 100 : proficiency}%` }}
                        ></div>
                    </div>
                    <span className={`text-[10px] font-black font-mono w-8 text-right shrink-0 ${isMastered ? 'text-emerald-500' : 'text-slate-400'}`}>
                        {isMastered ? 100 : Math.round(proficiency)}%
                    </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
