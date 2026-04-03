import { Search, BookMarked } from 'lucide-react';
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
import { buildLearningPickerPath } from '../../utils/learningFlow';
import { hasSafeReturnTo, resolveSafeReturnTo } from '../../utils/navigation';
import { MobileWorkspaceHeader } from './MobileWorkspaceHeader';

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
  const switchMaterialPath = buildLearningPickerPath('grammar');

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

  return (
    <div className="min-h-screen bg-background flex flex-col pb-mobile-nav">
      <MobileWorkspaceHeader
        title={t('nav.grammar', { defaultValue: 'Grammar Library' })}
        subtitle={t('grammar.mobileSubtitle', {
          defaultValue: 'Browse patterns, search explanations, and focus on one unit at a time.',
        })}
        eyebrow="Grammar"
        onBack={handleBack}
        backLabel={t('common.back', { defaultValue: 'Back' })}
        actions={
          <button
            type="button"
            onClick={() => navigate(switchMaterialPath)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card text-slate-600 shadow-sm transition-all active:scale-95"
            title={t('learningFlow.actions.switchMaterial', { defaultValue: 'Switch textbook' })}
            aria-label={t('learningFlow.actions.switchMaterial', {
              defaultValue: 'Switch textbook',
            })}
          >
            <BookMarked className="w-5 h-5" />
          </button>
        }
        className="bg-white/80 border-slate-100"
      >
        <div className="relative group mb-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <input
            id="mobile-grammar-search"
            name="grammarSearch"
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={t('search', { defaultValue: 'Search patterns or usages...' })}
            className="w-full h-12 bg-slate-100 border-transparent rounded-[1.25rem] pl-11 pr-4 text-sm font-bold text-slate-700 outline-none ring-2 ring-transparent focus:ring-indigo-500/10 focus:bg-white transition-all"
          />
        </div>

        <MobileUnitChips
          totalUnits={totalUnits}
          selectedUnit={selectedUnit}
          onSelect={onSelectUnit}
        />
      </MobileWorkspaceHeader>

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
