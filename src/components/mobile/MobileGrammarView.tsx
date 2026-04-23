import { useEffect, useRef, useState } from 'react';
import { Search, ChevronLeft } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { GrammarPointData } from '../../types';
import { useTranslation } from 'react-i18next';
import { getLocalizedContent } from '../../utils/languageUtils';
import {
  sanitizeGrammarDisplayText,
  sanitizeGrammarMarkdown,
} from '../../utils/grammarDisplaySanitizer';
import MobileUnitChips from './MobileUnitChips';
import MobileGrammarFeed from './MobileGrammarFeed';
import MobileGrammarDetailSheet from './MobileGrammarDetailSheet';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { hasSafeReturnTo, resolveSafeReturnTo } from '../../utils/navigation';

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
  const { t, i18n } = useTranslation();
  const language = (i18n.language || 'zh') as never;
  const navigate = useLocalizedNavigate();
  const [searchParams] = useSearchParams();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen]);

  const handleBack = () => {
    const returnTo = searchParams.get('returnTo');
    if (hasSafeReturnTo(returnTo)) {
      navigate(resolveSafeReturnTo(returnTo, '/courses'));
      return;
    }
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/courses');
  };

  // Filter grammar points based on search query
  const filteredPoints = grammarPoints.filter(g => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const title = sanitizeGrammarDisplayText(
      getLocalizedContent(g as never, 'title', language) || g.title
    ).toLowerCase();
    const summary = sanitizeGrammarDisplayText(
      getLocalizedContent(g as never, 'summary', language) || g.summary
    ).toLowerCase();
    const explanation = sanitizeGrammarMarkdown(
      getLocalizedContent(g as never, 'explanation', language) || g.explanation
    ).toLowerCase();
    return title.includes(query) || summary.includes(query) || explanation.includes(query);
  });
  const isSearchVisible = isSearchOpen || searchQuery.length > 0;

  return (
    <div className="min-h-screen flex flex-col pb-mobile-nav text-slate-900 bg-transparent grammar-mobile-root relative w-full">
      <style>{`
        .grammar-mobile-root {
            background-color: #E6E7E9;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.045'/%3E%3C/svg%3E");
            font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "SF Pro Display", sans-serif;
            -webkit-font-smoothing: antialiased;
            overflow-x: hidden;
        }

        .header-glass {
            background: rgba(230, 231, 233, 0.85);
            backdrop-filter: blur(24px) saturate(150%);
            border-bottom: 1px solid rgba(255,255,255,0.4);
        }

        .card-paper {
            background: #FCFCFA;
            box-shadow: 
                0 16px 32px -12px rgba(0,0,0,0.08),
                inset 0 1px 1px rgba(255,255,255,1),
                inset 0 -2px 1px rgba(0,0,0,0.03);
            border: 1px solid rgba(0,0,0,0.06);
            transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.15s;
            cursor: pointer;
        }
        .card-paper:active {
            transform: scale(0.98);
            box-shadow: 0 4px 12px -4px rgba(0,0,0,0.06), inset 0 1px 1px rgba(255,255,255,1);
        }

        .unit-chip {
            background: linear-gradient(180deg, #FFFFFF 0%, #F8F9FA 100%);
            border: 1px solid rgba(0,0,0,0.08);
            box-shadow: 0 3px 0px #E2E8F0, 0 4px 8px rgba(0,0,0,0.04);
            transition: all 0.1s;
        }
        .unit-chip.active {
            transform: translateY(3px);
            box-shadow: 0 0px 0px #E2E8F0, inset 0 2px 4px rgba(0,0,0,0.04);
            background: #2A2D33;
            border-color: #0F0F10;
            color: white;
        }

        .sheet-sage {
            background: linear-gradient(160deg, #37413A 0%, #1F2622 100%);
            box-shadow: 0 -24px 64px rgba(0,0,0,0.4), inset 0 1px 1px rgba(230, 255, 235, 0.15);
            border-top: 1px solid rgba(255,255,255,0.05);
            color: #ffffff;
        }

        .frosted-slot {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.2), 0 1px 0 rgba(255,255,255,0.05);
        }

        .mastery-btn {
            box-shadow: 0 4px 0 rgba(0,0,0,0.1), inset 0 1px 1px rgba(255,255,255,0.2);
            transition: all 0.15s;
        }
        .mastery-btn:active, .mastery-btn.mastered {
            transform: translateY(4px);
            box-shadow: 0 0px 0 rgba(0,0,0,0.1), inset 0 2px 4px rgba(0,0,0,0.2);
        }
        .mastery-btn.mastered {
            background: linear-gradient(180deg, #10B981 0%, #059669 100%);
            border-color: #047857;
            color: white;
        }

        .red-eye-mask {
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
        }
        .red-eye-mask.red-eye-active {
            filter: blur(6px) grayscale(50%);
            opacity: 0.4;
            user-select: none;
        }
        .red-eye-mask.red-eye-active:active {
            filter: blur(0px) grayscale(0%);
            opacity: 1;
        }
      `}</style>

      <header className="fixed top-0 left-0 right-0 pt-14 z-40 header-glass flex flex-col">
        <div className="px-5 pb-3 flex items-center justify-between">
            <button onClick={handleBack} className="w-10 h-10 rounded-[12px] bg-white/60 border border-slate-200 text-slate-700 shadow-sm flex items-center justify-center active:scale-95 transition-transform">
                <ChevronLeft className="w-4.5 h-4.5" strokeWidth={2.5} />
            </button>
            <div className="flex flex-col items-center">
                <span className="text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase">{t('nav.grammar', { defaultValue: '语法枢纽' })}</span>
                <span className="text-[12px] font-black text-slate-800 tracking-wider">TOPIK II 核心语法</span>
            </div>
            <button 
                onClick={() => {
                   setIsSearchOpen(open => (open && searchQuery.length === 0 ? false : true));
                }} 
                aria-label={t('search', { defaultValue: 'Search patterns or usages...' })}
                className="w-10 h-10 rounded-[12px] bg-white/60 border border-slate-200 text-slate-700 shadow-sm flex items-center justify-center active:scale-95 transition-transform"
            >
                <Search className="w-4 h-4" strokeWidth={2.5} />
            </button>
        </div>

        <div className="px-5 pb-2 transition-all duration-300 overflow-hidden" style={{ maxHeight: isSearchVisible ? '60px' : '0px', opacity: isSearchVisible ? 1 : 0 }}>
            <div className="relative group">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
              <input
                ref={searchInputRef}
                id="mobile-grammar-search"
                name="grammarSearch"
                type="text"
                value={searchQuery}
                onBlur={event => {
                  if (!event.target.value) {
                    onSearchChange('');
                    setIsSearchOpen(false);
                  }
                }}
                onChange={e => onSearchChange(e.target.value)}
                placeholder={t('search', { defaultValue: 'Search patterns or usages...' })}
                className="w-full h-10 bg-white/50 border border-slate-200 rounded-[12px] pl-10 pr-4 text-xs font-bold text-slate-700 outline-none focus:bg-white transition-all shadow-inner"
              />
            </div>
        </div>

        <MobileUnitChips
            totalUnits={totalUnits}
            selectedUnit={selectedUnit}
            onSelect={onSelectUnit}
        />
      </header>
      
      <div className="h-40 shrink-0"></div>

      {/* Feed Area */}
      <main className="flex-1">
        <MobileGrammarFeed
          grammarPoints={filteredPoints}
          onSelect={onSelectGrammar}
          onToggleStatus={onToggleStatus}
          isLoading={isLoading}
        />
      </main>

      {/* Details (Overlay) */}
      <MobileGrammarDetailSheet
        grammar={selectedGrammar}
        onClose={() => onSelectGrammar(null)}
        onProficiencyUpdate={onProficiencyUpdate}
        instituteId={instituteId}
      />
    </div>
  );
}
