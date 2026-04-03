import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import {
  Layers,
  Puzzle,
  BrainCircuit,
  ClipboardCheck,
  Settings,
  ChevronDown,
  X,
  BookMarked,
} from 'lucide-react';
import { ExtendedVocabItem } from '../../pages/VocabModulePage';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import MobileUnitSelector from './MobileUnitSelector';
import MobileFlashcardPlayer from './MobileFlashcardPlayer';
import VocabQuiz from '../../features/vocab/components/VocabQuiz';
import VocabTest from '../../features/vocab/components/VocabTest';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import type { Language } from '../../types';
import { getLabels } from '../../utils/i18n';
import { buildLearningPickerPath } from '../../utils/learningFlow';
import VocabLearnOverlay from '../../features/vocab/components/VocabLearnOverlay';
import FlashcardSettingsModal from '../../features/vocab/components/FlashcardSettingsModal';
import { safeGetLocalStorageItem, safeSetLocalStorageItem } from '../../utils/browserStorage';
import { hasSafeReturnTo, resolveSafeReturnTo } from '../../utils/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../ui';
import { Button } from '../ui';
import { MobileWorkspaceHeader } from './MobileWorkspaceHeader';

interface MobileVocabViewProps {
  // Data
  readonly allWords: ExtendedVocabItem[]; // Current filtered words
  readonly filteredWords: ExtendedVocabItem[];
  readonly gameWords: any[]; // ExtendedVocabItem serialized for games

  // State
  readonly currentUnitId: number | 'ALL';
  readonly availableUnits: number[];
  readonly unitCounts: Map<number, number>;
  readonly masteryCount: number;

  // Actions
  readonly onSelectUnit: (unitId: number | 'ALL') => void;
  readonly onReview: (word: ExtendedVocabItem, quality: number) => void;
  readonly onStar: (id: string) => void;
  readonly onSpeak: (text: string) => void;
  readonly isStarred: (id: string) => boolean;
  readonly onFsrsReview: (wordId: string, isCorrect: boolean) => void; // For Test mode

  // Navigation
  readonly instituteId: string;
  readonly language: Language;
  readonly userId?: string;
  readonly onRequestTestMode?: () => Promise<boolean>;
}

type TabId = 'flashcard' | 'match' | 'learn' | 'test';

const VocabMatch = lazy(() => import('../../features/vocab/components/VocabMatch'));

export default function MobileVocabView({
  allWords,
  filteredWords,
  gameWords,
  currentUnitId,
  availableUnits,
  unitCounts,
  masteryCount,
  onSelectUnit,
  onReview,
  onStar,
  onSpeak,
  isStarred,
  onFsrsReview,
  instituteId,
  language,
  userId,
  onRequestTestMode,
}: MobileVocabViewProps) {
  const { t } = useTranslation();
  const navigate = useLocalizedNavigate();
  const [searchParams] = useSearchParams();
  const tabStorageKey = `mobileVocabActiveTab:${instituteId}`;
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    if (globalThis.window === undefined) return 'flashcard';
    const saved = safeGetLocalStorageItem(tabStorageKey);
    if (saved === 'match' || saved === 'learn' || saved === 'test') return saved;
    return 'flashcard';
  });
  const [cardIndex, setCardIndex] = useState(0);
  const [focusOpen, setFocusOpen] = useState(true);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [showFlashcardSettings, setShowFlashcardSettings] = useState(false);

  const labels = useMemo(() => getLabels(language), [language]);

  const settingsStorageKey = `mobileFlashcardSettings:${instituteId}`;
  const switchMaterialPath = buildLearningPickerPath('vocabulary');
  const [flashcardSettings, setFlashcardSettings] = useState<{
    autoTTS: boolean;
    cardFront: 'KOREAN' | 'NATIVE';
    ratingMode: 'PASS_FAIL' | 'FOUR_BUTTONS';
  }>(() => {
    if (globalThis.window === undefined) {
      return { autoTTS: false, cardFront: 'KOREAN', ratingMode: 'FOUR_BUTTONS' };
    }
    try {
      const raw = safeGetLocalStorageItem(settingsStorageKey);
      if (!raw) return { autoTTS: false, cardFront: 'KOREAN', ratingMode: 'FOUR_BUTTONS' };
      const parsed = JSON.parse(raw) as Partial<{
        autoTTS: boolean;
        cardFront: 'KOREAN' | 'NATIVE';
        ratingMode: 'PASS_FAIL' | 'FOUR_BUTTONS';
      }>;
      return {
        autoTTS: typeof parsed.autoTTS === 'boolean' ? parsed.autoTTS : false,
        cardFront: parsed.cardFront === 'NATIVE' ? 'NATIVE' : 'KOREAN',
        ratingMode: parsed.ratingMode === 'PASS_FAIL' ? 'PASS_FAIL' : 'FOUR_BUTTONS',
      };
    } catch {
      return { autoTTS: false, cardFront: 'KOREAN', ratingMode: 'FOUR_BUTTONS' };
    }
  });

  useEffect(() => {
    if (globalThis.window === undefined) return;
    try {
      safeSetLocalStorageItem(settingsStorageKey, JSON.stringify(flashcardSettings));
    } catch {
      // ignore
    }
  }, [flashcardSettings, settingsStorageKey]);

  useEffect(() => {
    if (globalThis.window === undefined) return;
    safeSetLocalStorageItem(tabStorageKey, activeTab);
  }, [activeTab, tabStorageKey]);

  // Tabs Configuration
  const tabs = [
    { id: 'flashcard', icon: Layers, label: t('vocab.flashcard', { defaultValue: 'Flashcard' }) },
    { id: 'match', icon: Puzzle, label: t('vocab.match', { defaultValue: 'Match' }) },
    { id: 'learn', icon: BrainCircuit, label: t('vocab.learn', { defaultValue: 'Learn' }) },
    { id: 'test', icon: ClipboardCheck, label: t('vocab.quiz', { defaultValue: 'Test' }) },
  ];

  const closeFocusOverlay = () => {
    setModeMenuOpen(false);
    setShowFlashcardSettings(false);
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

  const handleNextCard = () => {
    if (filteredWords.length === 0) return;
    setCardIndex(prev => (prev + 1) % filteredWords.length);
  };

  const handlePrevCard = () => {
    if (filteredWords.length === 0) return;
    setCardIndex(prev => (prev - 1 + filteredWords.length) % filteredWords.length);
  };

  const scopeTitle =
    currentUnitId === 'ALL'
      ? t('vocab.allUnits', { defaultValue: 'All Units' })
      : `${t('vocab.unit', { defaultValue: 'Unit' })} ${currentUnitId}`;

  const handleSelectTab = (tabId: TabId) => {
    if (tabId === 'test' && onRequestTestMode) {
      void (async () => {
        const allowed = await onRequestTestMode();
        if (!allowed) return;
        setActiveTab(tabId);
        setModeMenuOpen(false);
        setFocusOpen(true);
      })();
      return;
    }

    setActiveTab(tabId);
    setModeMenuOpen(false);
    setFocusOpen(true);
  };

  const focusHeader = (
    <div className="flex items-center justify-between px-4 py-4 border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-30">
      <div className="relative">
        <DropdownMenu open={modeMenuOpen} onOpenChange={setModeMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="auto"
              type="button"
              className="h-11 px-4 rounded-full bg-muted/50 hover:bg-muted text-foreground font-black italic text-sm flex items-center gap-2 border border-border/50 transition-all active:scale-95 shadow-sm"
            >
              {tabs.find(x => x.id === activeTab)?.label ??
                t('vocab.flashcard', { defaultValue: 'Flashcard' })}
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            unstyled
            className="absolute left-0 top-full mt-2 w-48 bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-xl overflow-hidden z-[96] animate-in fade-in zoom-in-95"
          >
            {tabs.map(item => (
              <Button
                variant="ghost"
                size="auto"
                key={item.id}
                type="button"
                onClick={() => {
                  handleSelectTab(item.id as TabId);
                }}
                className={`w-full text-left px-4 py-3 font-black text-sm transition-colors ${
                  activeTab === item.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted/50'
                }`}
              >
                {item.label}
              </Button>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex-1 flex justify-center min-w-0 px-2 pl-4">
        <MobileUnitSelector
          currentUnitId={currentUnitId}
          availableUnits={availableUnits}
          unitCounts={unitCounts}
          onSelect={u => {
            onSelectUnit(u);
            setCardIndex(0); // Reset card index on unit change
          }}
          allWordsCount={allWords.length}
          variant="minimal"
        />
      </div>

      <div className="flex items-center gap-2 pl-2">
        <Button
          variant="ghost"
          size="auto"
          type="button"
          onClick={() => navigate(switchMaterialPath)}
          className="w-11 h-11 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center border border-border/50 active:scale-90 transition-all"
          aria-label={t('learningFlow.actions.switchMaterial', { defaultValue: 'Switch textbook' })}
        >
          <BookMarked className="w-5 h-5 text-muted-foreground" />
        </Button>
        {activeTab === 'flashcard' && (
          <Button
            variant="ghost"
            size="auto"
            type="button"
            onClick={() => setShowFlashcardSettings(true)}
            className="w-11 h-11 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center border border-border/50 active:scale-90 transition-all"
            aria-label={t('vocab.settings', { defaultValue: 'Settings' })}
          >
            <Settings className="w-5 h-5 text-muted-foreground" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="auto"
          type="button"
          onClick={closeFocusOverlay}
          className="w-11 h-11 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center border border-border/50 active:scale-90 transition-all"
          aria-label={t('common.close', { defaultValue: 'Close' })}
        >
          <X className="w-5 h-5 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );

  const renderFocusContent = () => {
    if (activeTab === 'flashcard') {
      return (
        <div className="h-full overflow-hidden flex flex-col p-4 md:p-6">
          <MobileFlashcardPlayer
            words={filteredWords}
            currentIndex={cardIndex}
            settings={flashcardSettings}
            onReview={(w, q) => {
              onReview(w, q);
              handleNextCard();
            }}
            onStar={onStar}
            onSpeak={onSpeak}
            isStarred={isStarred}
            onNext={handleNextCard}
            onPrev={handlePrevCard}
          />
        </div>
      );
    }

    if (activeTab === 'match') {
      return (
        <div className="h-full overflow-auto p-4">
          <Suspense
            fallback={
              <div className="rounded-[2rem] border-2 border-border bg-card p-10 text-center font-black italic text-muted-foreground shadow-sm">
                {labels.vocab?.loadingMatch ||
                  t('vocab.loadingMatch', { defaultValue: 'Loading match...' })}
              </div>
            }
          >
            <VocabMatch words={gameWords} onComplete={() => {}} />
          </Suspense>
        </div>
      );
    }

    if (activeTab === 'learn') {
      return (
        <div className="h-full overflow-auto p-4">
          <VocabQuiz
            words={gameWords}
            courseId={instituteId}
            onComplete={() => {}}
            onNextUnit={() => {}}
            hasNextUnit={false}
            userId={userId}
            onFsrsReview={onFsrsReview}
            language={language}
            variant="learn"
            currentUnitLabel={scopeTitle}
          />
        </div>
      );
    }

    return (
      <div className="h-full overflow-auto">
        <VocabTest
          words={filteredWords}
          language={language}
          scopeTitle={scopeTitle}
          onClose={closeFocusOverlay}
          showCloseButton={false}
          onFsrsReview={onFsrsReview}
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-mobile-nav">
      <FlashcardSettingsModal
        isOpen={showFlashcardSettings}
        onClose={() => setShowFlashcardSettings(false)}
        settings={flashcardSettings}
        onUpdate={s => setFlashcardSettings(s)}
        labels={labels}
      />

      <VocabLearnOverlay
        open={focusOpen}
        onClose={closeFocusOverlay}
        language={language}
        title={tabs.find(x => x.id === activeTab)?.label}
        variant="fullscreen"
        headerContent={focusHeader}
      >
        <div className="h-full bg-background mesh-gradient grain-overlay">
          {renderFocusContent()}
        </div>
      </VocabLearnOverlay>

      <MobileWorkspaceHeader
        title={t('dashboard.vocab.title', { defaultValue: 'Vocab' })}
        subtitle={scopeTitle}
        eyebrow={t('nav.learn', { defaultValue: 'Learning' })}
        onBack={handleBack}
        backLabel={t('common.back', { defaultValue: 'Back' })}
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="auto"
              onClick={() => navigate(switchMaterialPath)}
              className="grid h-11 w-11 place-items-center rounded-2xl border border-border bg-card shadow-sm active:scale-90 active:bg-muted transition-all"
              title={t('learningFlow.actions.switchMaterial', { defaultValue: 'Switch textbook' })}
              aria-label={t('learningFlow.actions.switchMaterial', {
                defaultValue: 'Switch textbook',
              })}
            >
              <BookMarked className="w-5 h-5 text-muted-foreground/80" />
            </Button>
            <div className="relative h-11 w-11 rounded-2xl border border-white/10 bg-card/50 shadow-xl p-1.5 overflow-hidden rim-light">
              <svg
                className="w-full h-full -rotate-90 drop-shadow-[0_0_12px_rgba(34,197,94,0.4)]"
                viewBox="0 0 36 36"
              >
                <circle
                  className="text-muted/20"
                  cx="18"
                  cy="18"
                  r="15.9155"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                />
                <circle
                  className="text-emerald-500 transition-all duration-1000 ease-out"
                  strokeDasharray={`${(masteryCount / Math.max(allWords.length, 1)) * 100}, 100`}
                  cx="18"
                  cy="18"
                  r="15.9155"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-[9px] font-black italic tracking-tighter text-foreground drop-shadow-sm">
                {Math.round((masteryCount / Math.max(allWords.length, 1)) * 100)}%
              </div>
            </div>
          </div>
        }
      >
        {!focusOpen && (
          <div className="flex justify-center -mt-2">
            <MobileUnitSelector
              currentUnitId={currentUnitId}
              availableUnits={availableUnits}
              unitCounts={unitCounts}
              onSelect={u => {
                onSelectUnit(u);
                setCardIndex(0);
              }}
              allWordsCount={allWords.length}
            />
          </div>
        )}
      </MobileWorkspaceHeader>

      {/* Tabs - Segmented Control */}
      <div className="px-6 py-6 shrink-0">
        <div className="bg-muted/50 p-1.5 rounded-[2rem] flex border border-border/50 shadow-inner">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <Button
                variant="ghost"
                size="auto"
                key={tab.id}
                onClick={() => handleSelectTab(tab.id as TabId)}
                className={`flex-1 py-3 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                  isActive
                    ? 'bg-card shadow-sm text-foreground ring-1 ring-border/50'
                    : 'text-muted-foreground/60 hover:text-foreground hover:bg-card/30'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${isActive ? 'text-primary' : 'text-muted-foreground/40'}`}
                />
                {tab.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 px-8 pb-10 flex flex-col justify-end">
        <Button
          variant="ghost"
          size="auto"
          type="button"
          onClick={() => setFocusOpen(true)}
          className="w-full h-16 rounded-[2rem] bg-primary text-primary-foreground font-black italic text-lg tracking-tighter shadow-[0_8px_16px_-4px_rgba(var(--primary-rgb),0.3)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-3"
        >
          {t('common.continue', { defaultValue: 'Continue' })}
        </Button>
      </div>
    </div>
  );
}
