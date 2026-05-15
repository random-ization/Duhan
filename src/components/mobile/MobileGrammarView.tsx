import { Search, BookMarked } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GrammarPointData } from '../../types';
import { getLocalizedContent } from '../../utils/languageUtils';
import {
  sanitizeGrammarDisplayText,
  sanitizeGrammarMarkdown,
} from '../../utils/grammarDisplaySanitizer';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { buildLearningPickerPath } from '../../utils/learningFlow';
import { hasSafeReturnTo, resolveSafeReturnTo } from '../../utils/navigation';
import { MobileWorkspaceHeader } from './MobileWorkspaceHeader';
import MobileUnitChips from './MobileUnitChips';
import MobileGrammarFeed from './MobileGrammarFeed';
import MobileGrammarDetailSheet from './MobileGrammarDetailSheet';
import { KT, PageShell } from './ksoft/ksoft';

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
  const language = i18n.language || 'zh';
  const navigate = useLocalizedNavigate();
  const [searchParams] = useSearchParams();
  const switchMaterialPath = buildLearningPickerPath('grammar');

  const handleBack = () => {
    const returnTo = searchParams.get('returnTo');
    if (hasSafeReturnTo(returnTo)) {
      navigate(resolveSafeReturnTo(returnTo, '/courses'));
      return;
    }
    navigate('/courses');
  };

  const filteredPoints = grammarPoints.filter(grammar => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const title = sanitizeGrammarDisplayText(
      getLocalizedContent(grammar, 'title', language) || grammar.title
    ).toLowerCase();
    const summary = sanitizeGrammarDisplayText(
      getLocalizedContent(grammar, 'summary', language) || grammar.summary
    ).toLowerCase();
    const explanation = sanitizeGrammarMarkdown(
      getLocalizedContent(grammar, 'explanation', language) || grammar.explanation
    ).toLowerCase();
    return title.includes(query) || summary.includes(query) || explanation.includes(query);
  });

  return (
    <PageShell>
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
            className="flex h-11 w-11 items-center justify-center rounded-2xl transition-all active:scale-95"
            style={{
              border: `1px solid ${KT.line}`,
              background: KT.card,
              color: KT.ink,
              boxShadow: KT.shSm,
            }}
            title={t('learningFlow.actions.switchMaterial', { defaultValue: 'Switch textbook' })}
            aria-label={t('learningFlow.actions.switchMaterial', {
              defaultValue: 'Switch textbook',
            })}
          >
            <BookMarked className="w-5 h-5" />
          </button>
        }
        className="border-transparent bg-transparent shadow-none"
      >
        <div className="relative group mb-3">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 transition-colors"
            style={{ color: KT.sub }}
          />
          <input
            id="mobile-grammar-search"
            name="grammarSearch"
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder={t('search.placeholder', { defaultValue: 'Search patterns or usages...' })}
            className="w-full h-12 rounded-[1.25rem] pl-11 pr-4 text-sm font-bold outline-none transition-all"
            style={{
              background: 'rgba(255,255,255,0.9)',
              border: `1px solid ${KT.line}`,
              color: KT.ink,
              boxShadow: KT.shSm,
            }}
          />
        </div>

        <MobileUnitChips
          totalUnits={totalUnits}
          selectedUnit={selectedUnit}
          onSelect={onSelectUnit}
        />
      </MobileWorkspaceHeader>

      <main className="flex-1 pb-mobile-nav">
        <MobileGrammarFeed
          grammarPoints={filteredPoints}
          onSelect={onSelectGrammar}
          onToggleStatus={onToggleStatus}
          isLoading={isLoading}
        />
      </main>

      <MobileGrammarDetailSheet
        grammar={selectedGrammar}
        onClose={() => onSelectGrammar(null)}
        onProficiencyUpdate={onProficiencyUpdate}
        instituteId={instituteId}
      />
    </PageShell>
  );
}
