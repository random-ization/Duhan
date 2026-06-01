import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { Settings, ChevronDown, X, BookMarked, Layers, RotateCcw } from 'lucide-react';
import { ExtendedVocabItem } from '../../pages/VocabModulePage';
import { useGlobalSettings } from '../../hooks/useGlobalSettings';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import MobileUnitSelector from './MobileUnitSelector';
import MobileFlashcardPlayer from './MobileFlashcardPlayer';
import { MobileLearnMode } from './MobileLearnMode';
import VocabTest, { VocabTestSessionSnapshot } from '../../features/vocab/components/VocabTest';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import type { Language } from '../../types';
import { getLabels } from '../../utils/i18n';
import { recommendVocabStage } from '../../utils/learningFlow';
import VocabLearnOverlay from '../../features/vocab/components/VocabLearnOverlay';
import { safeGetLocalStorageItem, safeSetLocalStorageItem } from '../../utils/browserStorage';
import { hasSafeReturnTo, resolveSafeReturnTo } from '../../utils/navigation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../ui';
import { KT } from './ksoft/ksoft';
import { CoursePickerSheet, CoursePickerInstituteLite } from './CoursePickerSheet';

export type MobileVocabResume = { completed: number; total: number } | null;
type StageId = 'learn' | 'flashcard' | 'test';

interface MobileVocabViewProps {
  // Data
  readonly allWords: ExtendedVocabItem[];
  readonly filteredWords: ExtendedVocabItem[];
  readonly gameWords: MobileVocabGameWord[];

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
  readonly onFsrsReview: (wordId: string, isCorrect: boolean) => void;

  // Navigation
  readonly instituteId: string;
  readonly courseName?: string;
  readonly institutes?: CoursePickerInstituteLite[];
  readonly language: Language;
  readonly userId?: string;
  readonly initialMode?: TabId;
  readonly onRequestTestMode?: () => Promise<boolean>;

  // Session resume — surfaced from VocabModulePage queries
  readonly flashcardResume?: MobileVocabResume;
  readonly learnResume?: MobileVocabResume;
  readonly testResume?: MobileVocabResume;
  readonly testResumeSnapshot?: VocabTestSessionSnapshot | null;
  readonly onAbandonActiveSession?: (mode: StageId) => void;
  readonly onSessionSnapshot?: (mode: StageId, completed: number, total: number) => void;
  readonly onCompleteSession?: (mode: StageId) => void;
}

type TabId = 'flashcard' | 'match' | 'learn' | 'test';
type MobileVocabGameWord = {
  id: string;
  korean: string;
  english: string;
  unit: number;
  partOfSpeech?: ExtendedVocabItem['partOfSpeech'];
  pos?: string;
};

// K-Soft Hanja labels for each tab mode
const TAB_META: Record<TabId, { hanja: string }> = {
  flashcard: { hanja: '閃' },
  match: { hanja: '配' },
  learn: { hanja: '學' },
  test: { hanja: '試' },
};

// Stage progression — Learn (cognitive intake) → Flashcard (reinforcement) → Test (verification)
const STAGES: ReadonlyArray<{ id: StageId; fallbackLabel: string }> = [
  { id: 'learn', fallbackLabel: 'Learn' },
  { id: 'flashcard', fallbackLabel: 'Flashcard' },
  { id: 'test', fallbackLabel: 'Test' },
];

const STAGE_INDEX: Record<StageId, number> = { learn: 0, flashcard: 1, test: 2 };

const isRecommendedAhead = (current: StageId, recommended: StageId): boolean => {
  return STAGE_INDEX[recommended] >= STAGE_INDEX[current];
};

const VocabMatch = lazy(() => import('../../features/vocab/components/VocabMatch'));

// ── Shared icon-button style ──────────────────────────────────────────────────
const iconBtn: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 12,
  background: KT.card,
  border: `1px solid ${KT.line2}`,
  boxShadow: KT.shSm,
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
  flexShrink: 0,
};

const closeBtn: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 12,
  background: KT.ink,
  border: 'none',
  boxShadow: KT.shSm,
  display: 'grid',
  placeItems: 'center',
  cursor: 'pointer',
  flexShrink: 0,
};

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
  courseName,
  institutes,
  language,
  userId: _userId,
  initialMode,
  onRequestTestMode: _onRequestTestMode,
  flashcardResume = null,
  learnResume = null,
  testResume = null,
  testResumeSnapshot = null,
  onAbandonActiveSession,
  onSessionSnapshot,
  onCompleteSession,
}: MobileVocabViewProps) {
  const { t } = useTranslation();
  const navigate = useLocalizedNavigate();
  const [searchParams] = useSearchParams();
  const recommendedStage = useMemo(() => recommendVocabStage(filteredWords), [filteredWords]);
  const tabStorageKey = `mobileVocabActiveTab:${instituteId}`;
  const [activeTab, setActiveTab] = useState<TabId>(() => {
    if (initialMode) return initialMode;
    if (globalThis.window === undefined) return recommendedStage;
    const saved = safeGetLocalStorageItem(tabStorageKey);
    if (saved === 'match' || saved === 'learn' || saved === 'test' || saved === 'flashcard') {
      return saved;
    }
    return recommendedStage;
  });
  const [cardIndex, setCardIndex] = useState(0);
  const [focusOpen, setFocusOpen] = useState(true);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [showFlashcardSettings, setShowFlashcardSettings] = useState(false);
  const [coursePickerOpen, setCoursePickerOpen] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const appliedInitialModeRef = useRef<TabId | null>(null);
  const focusRootRef = useRef<HTMLDivElement | null>(null);

  const labels = useMemo(() => getLabels(language), [language]);

  const currentResume: MobileVocabResume = (() => {
    if (activeTab === 'flashcard') return flashcardResume;
    if (activeTab === 'learn') return learnResume;
    if (activeTab === 'test') return testResume;
    return null;
  })();

  const { settings, updateSettings } = useGlobalSettings();
  const flashcardSettings = {
    autoTTS: settings.flashcardAutoTTS,
    cardFront: settings.flashcardFront,
    ratingMode: settings.flashcardRatingMode,
  };
  const setFlashcardSettings = (newSettings: typeof flashcardSettings) => {
    void updateSettings({
      flashcardAutoTTS: newSettings.autoTTS,
      flashcardFront: newSettings.cardFront,
      flashcardRatingMode: newSettings.ratingMode,
    });
  };

  useEffect(() => {
    if (globalThis.window === undefined) return;
    safeSetLocalStorageItem(tabStorageKey, activeTab);
  }, [activeTab, tabStorageKey]);

  useEffect(() => {
    if (!initialMode || appliedInitialModeRef.current === initialMode) return;
    appliedInitialModeRef.current = initialMode;

    const timeoutId = globalThis.window.setTimeout(() => {
      setActiveTab(initialMode);
      setFocusOpen(true);
    }, 0);
    return () => globalThis.window.clearTimeout(timeoutId);
  }, [initialMode]);

  useEffect(() => {
    if (!focusOpen) return;
    const resetScroll = () => {
      window.scrollTo({ top: 0, left: 0 });
      document.scrollingElement?.scrollTo({ top: 0, left: 0 });
      let node = focusRootRef.current?.parentElement ?? null;
      while (node) {
        node.scrollTop = 0;
        node.scrollLeft = 0;
        node = node.parentElement;
      }
      focusRootRef.current?.scrollIntoView({ block: 'start' });
    };
    let attempts = 0;
    const frame = window.requestAnimationFrame(() => {
      resetScroll();
      window.requestAnimationFrame(resetScroll);
    });
    const interval = window.setInterval(() => {
      resetScroll();
      attempts += 1;
      if (attempts >= 20) {
        window.clearInterval(interval);
      }
    }, 50);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(interval);
    };
  }, [activeTab, focusOpen]);

  const tabs = [
    { id: 'flashcard', label: t('vocab.flashcard', { defaultValue: 'Flashcard' }) },
    { id: 'match', label: t('vocab.match', { defaultValue: 'Match' }) },
    { id: 'learn', label: t('vocab.learn', { defaultValue: 'Learn' }) },
    { id: 'test', label: t('vocab.quiz', { defaultValue: 'Test' }) },
  ];

  const closeFocusOverlay = () => {
    setModeMenuOpen(false);
    setShowFlashcardSettings(false);
    const returnTo = searchParams.get('returnTo');
    if (hasSafeReturnTo(returnTo)) {
      navigate(resolveSafeReturnTo(returnTo, '/courses'));
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
    navigate('/courses');
  };

  const handleNextCard = () => {
    if (filteredWords.length === 0) return;
    setCardIndex(prev => {
      const next = prev + 1;
      if (onSessionSnapshot && activeTab === 'flashcard') {
        onSessionSnapshot('flashcard', next, filteredWords.length);
      }
      if (next >= filteredWords.length) {
        setSessionCompleted(true);
        setFocusOpen(false);
        return prev; // Stay on last card
      }
      return next;
    });
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
    setActiveTab(tabId);
    setModeMenuOpen(false);
    setFocusOpen(true);
  };

  const flashcardProgressPercent = Math.round(
    ((cardIndex + 1) / Math.max(filteredWords.length, 1)) * 100
  );
  const flashcardCurrentPosition =
    filteredWords.length > 0 ? Math.min(cardIndex + 1, filteredWords.length) : 0;

  const masteryPct = Math.round((masteryCount / Math.max(allWords.length, 1)) * 100);

  // ── Overlay headers ─────────────────────────────────────────────────────────

  const defaultFocusHeader = (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        paddingTop: 'calc(env(safe-area-inset-top) + 10px)',
        background: 'rgba(251,248,243,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${KT.line2}`,
      }}
    >
      {/* Mode selector dropdown */}
      <div style={{ position: 'relative' }}>
        <DropdownMenu open={modeMenuOpen} onOpenChange={setModeMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 999,
                background: KT.card,
                border: `1px solid ${KT.line2}`,
                boxShadow: KT.shSm,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 800,
                color: KT.ink,
                fontFamily: KT.font,
              }}
            >
              <span
                style={{ fontFamily: KT.serif, fontSize: 15, fontWeight: 500, color: KT.crimson }}
              >
                {TAB_META[activeTab].hanja}
              </span>
              {tabs.find(x => x.id === activeTab)?.label}
              <ChevronDown size={12} color={KT.sub} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            unstyled
            className="absolute left-0 top-full mt-2 w-44 overflow-hidden rounded-2xl border border-border bg-card/95 shadow-xl backdrop-blur-xl animate-in fade-in zoom-in-95 z-[96]"
          >
            {tabs.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id as TabId)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 16px',
                  background: activeTab === item.id ? `${KT.crimson}12` : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 800,
                  color: activeTab === item.id ? KT.crimson : KT.sub,
                  fontFamily: KT.font,
                  textAlign: 'left',
                }}
              >
                <span style={{ fontFamily: KT.serif, fontSize: 16, fontWeight: 500 }}>
                  {TAB_META[item.id as TabId].hanja}
                </span>
                {item.label}
              </button>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Unit selector */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          padding: '0 8px 0 12px',
          minWidth: 0,
        }}
      >
        <MobileUnitSelector
          currentUnitId={currentUnitId}
          availableUnits={availableUnits}
          unitCounts={unitCounts}
          onSelect={u => {
            onSelectUnit(u);
            setCardIndex(0);
          }}
          allWordsCount={allWords.length}
          variant="minimal"
        />
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          onClick={() => setCoursePickerOpen(true)}
          style={iconBtn}
          aria-label={t('learningFlow.actions.switchMaterial', { defaultValue: 'Switch textbook' })}
        >
          <BookMarked size={16} color={KT.sub} />
        </button>
        {activeTab === 'flashcard' && (
          <button
            type="button"
            onClick={() => setShowFlashcardSettings(true)}
            style={iconBtn}
            aria-label={t('vocab.settings', { defaultValue: 'Settings' })}
          >
            <Settings size={16} color={KT.sub} />
          </button>
        )}
        <button
          type="button"
          onClick={closeFocusOverlay}
          style={closeBtn}
          aria-label={t('common.close', { defaultValue: 'Close' })}
        >
          <X size={16} color="#fff" />
        </button>
      </div>
    </div>
  );

  const flashcardFocusHeader = (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 20px',
        paddingTop: 'calc(env(safe-area-inset-top) + 10px)',
        background: 'rgba(251,248,243,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${KT.line2}`,
      }}
    >
      {/* Close */}
      <button
        type="button"
        onClick={closeFocusOverlay}
        style={closeBtn}
        aria-label={t('common.close', { defaultValue: 'Close' })}
      >
        <X size={16} color="#fff" />
      </button>

      {/* Progress bar */}
      <div style={{ flex: 1, margin: '0 16px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 6,
            padding: '0 2px',
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              color: KT.sub,
              letterSpacing: 1,
              fontFamily: KT.font,
              textTransform: 'uppercase',
            }}
          >
            {t('dashboard.progress.title', { defaultValue: 'Progress' })}
          </span>
          <span style={{ fontSize: 12, fontWeight: 800, color: KT.ink, fontFamily: KT.font }}>
            {flashcardCurrentPosition}
            <span style={{ fontSize: 10, fontWeight: 600, color: KT.sub }}>
              /{filteredWords.length}
            </span>
          </span>
        </div>
        <div
          style={{
            height: 6,
            borderRadius: 999,
            background: KT.bg2,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${flashcardProgressPercent}%`,
              background: KT.ink,
              borderRadius: 999,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Settings */}
      <button
        type="button"
        onClick={() => setShowFlashcardSettings(true)}
        style={iconBtn}
        aria-label={t('vocab.settings', { defaultValue: 'Settings' })}
      >
        <Settings size={16} color={KT.sub} />
      </button>
    </div>
  );

  // ── Focus-overlay content ───────────────────────────────────────────────────

  const renderFocusContent = () => {
    if (activeTab === 'flashcard') {
      return (
        <div className="h-full overflow-hidden">
          <MobileFlashcardPlayer
            words={filteredWords}
            currentIndex={cardIndex}
            scopeTitle={scopeTitle}
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
        <div className="h-full overflow-hidden">
          <Suspense
            fallback={
              <div className="rounded-[2rem] border-2 border-border bg-card p-10 text-center font-black italic text-muted-foreground shadow-sm">
                {labels.vocab?.loadingMatch ||
                  t('vocab.loadingMatch', { defaultValue: 'Loading match...' })}
              </div>
            }
          >
            <VocabMatch words={gameWords} onComplete={() => {}} onClose={closeFocusOverlay} />
          </Suspense>
        </div>
      );
    }

    if (activeTab === 'learn') {
      return (
        <div className="h-full overflow-hidden">
          <MobileLearnMode
            words={gameWords}
            initialIndex={learnResume?.completed ?? 0}
            onProgressChange={(idx, total) => {
              if (onSessionSnapshot) onSessionSnapshot('learn', idx, total);
            }}
            onComplete={() => {
              setSessionCompleted(true);
              setFocusOpen(false);
            }}
            onFsrsReview={onFsrsReview}
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
          resumeSnapshot={testResumeSnapshot}
          onClose={closeFocusOverlay}
          showCloseButton={false}
          onFsrsReview={onFsrsReview}
          onComplete={() => {
            setSessionCompleted(true);
            setFocusOpen(false);
          }}
        />
      </div>
    );
  };

  const renderInlineFlashcardSettings = () => {
    if (!showFlashcardSettings) return null;
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 300,
          background: 'rgba(0,0,0,0.42)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
        onClick={() => setShowFlashcardSettings(false)}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 420,
            borderRadius: 20,
            background: KT.card,
            border: `1px solid ${KT.line2}`,
            boxShadow: KT.shLg,
            padding: 20,
          }}
          onClick={event => event.stopPropagation()}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, color: KT.ink, fontFamily: KT.font }}>
              {t('vocab.settings', { defaultValue: 'Settings' })}
            </div>
            <button
              type="button"
              onClick={() => setShowFlashcardSettings(false)}
              style={closeBtn}
              aria-label={t('common.close', { defaultValue: 'Close' })}
            >
              <X size={16} color="#fff" />
            </button>
          </div>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '12px 14px',
              borderRadius: 14,
              background: KT.bg2,
              marginBottom: 12,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700, color: KT.ink }}>
              {t('vocab.autoPlay', { defaultValue: 'Auto play pronunciation' })}
            </span>
            <input
              type="checkbox"
              checked={flashcardSettings.autoTTS}
              onChange={event =>
                setFlashcardSettings({ ...flashcardSettings, autoTTS: event.target.checked })
              }
            />
          </label>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: KT.sub, marginBottom: 8 }}>
              {t('vocab.cardFront', { defaultValue: 'Card front' })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                type="button"
                onClick={() =>
                  setFlashcardSettings({
                    ...flashcardSettings,
                    cardFront: 'KOREAN',
                  })
                }
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  border:
                    flashcardSettings.cardFront === 'KOREAN'
                      ? `2px solid ${KT.crimson}`
                      : `1px solid ${KT.line2}`,
                  background: flashcardSettings.cardFront === 'KOREAN' ? `${KT.pink}44` : KT.card,
                  color: KT.ink,
                  fontWeight: 700,
                }}
              >
                {t('vocab.koreanFront', { defaultValue: 'Korean' })}
              </button>
              <button
                type="button"
                onClick={() =>
                  setFlashcardSettings({
                    ...flashcardSettings,
                    cardFront: 'NATIVE',
                  })
                }
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  border:
                    flashcardSettings.cardFront === 'NATIVE'
                      ? `2px solid ${KT.crimson}`
                      : `1px solid ${KT.line2}`,
                  background: flashcardSettings.cardFront === 'NATIVE' ? `${KT.pink}44` : KT.card,
                  color: KT.ink,
                  fontWeight: 700,
                }}
              >
                {t('vocab.meaningFront', { defaultValue: 'Meaning' })}
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: KT.sub, marginBottom: 8 }}>
              {t('vocab.ratingMode', { defaultValue: 'Rating mode' })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                type="button"
                onClick={() =>
                  setFlashcardSettings({
                    ...flashcardSettings,
                    ratingMode: 'PASS_FAIL',
                  })
                }
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  border:
                    flashcardSettings.ratingMode === 'PASS_FAIL'
                      ? `2px solid ${KT.crimson}`
                      : `1px solid ${KT.line2}`,
                  background:
                    flashcardSettings.ratingMode === 'PASS_FAIL' ? `${KT.pink}44` : KT.card,
                  color: KT.ink,
                  fontWeight: 700,
                }}
              >
                {t('vocab.passFail', { defaultValue: 'Pass / Fail' })}
              </button>
              <button
                type="button"
                onClick={() =>
                  setFlashcardSettings({
                    ...flashcardSettings,
                    ratingMode: 'FOUR_BUTTONS',
                  })
                }
                style={{
                  padding: '10px 12px',
                  borderRadius: 12,
                  border:
                    flashcardSettings.ratingMode === 'FOUR_BUTTONS'
                      ? `2px solid ${KT.crimson}`
                      : `1px solid ${KT.line2}`,
                  background:
                    flashcardSettings.ratingMode === 'FOUR_BUTTONS' ? `${KT.pink}44` : KT.card,
                  color: KT.ink,
                  fontWeight: 700,
                }}
              >
                {t('vocab.fourButtons', { defaultValue: '4 Buttons' })}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowFlashcardSettings(false)}
            style={{
              width: '100%',
              borderRadius: 14,
              border: 'none',
              background: KT.ink,
              color: KT.card,
              fontSize: 14,
              fontWeight: 800,
              padding: '12px 14px',
            }}
          >
            {t('common.done', { defaultValue: 'Done' })}
          </button>
        </div>
      </div>
    );
  };

  if (focusOpen) {
    const focusHeader =
      activeTab === 'flashcard'
        ? flashcardFocusHeader
        : activeTab === 'learn' || activeTab === 'test' || activeTab === 'match'
          ? null
          : defaultFocusHeader;

    return (
      <div
        ref={focusRootRef}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 120,
          height: '100dvh',
          background: KT.bg,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <CoursePickerSheet
          isOpen={coursePickerOpen}
          onOpenChange={setCoursePickerOpen}
          institutes={institutes || []}
          currentCourseId={instituteId}
        />
        {renderInlineFlashcardSettings()}
        {focusHeader}
        <div className="min-h-0 flex-1 overflow-hidden bg-background">{renderFocusContent()}</div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        minHeight: '100vh',
        background: KT.bg,
        display: 'flex',
        flexDirection: 'column',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 64px)',
      }}
    >
      {/* Modals / Overlays ─────────────────────────────────────────────────── */}
      <CoursePickerSheet
        isOpen={coursePickerOpen}
        onOpenChange={setCoursePickerOpen}
        institutes={institutes || []}
        currentCourseId={instituteId}
      />
      {renderInlineFlashcardSettings()}

      <VocabLearnOverlay
        open={focusOpen}
        onClose={closeFocusOverlay}
        language={language}
        title={tabs.find(x => x.id === activeTab)?.label}
        variant="fullscreen"
        headerContent={
          activeTab === 'flashcard' ? (
            flashcardFocusHeader
          ) : activeTab === 'learn' ? (
            <></>
          ) : activeTab === 'test' ? (
            <></>
          ) : (
            defaultFocusHeader
          )
        }
      >
        <div className="h-full bg-background">{renderFocusContent()}</div>
      </VocabLearnOverlay>

      {/* ── Shell Header ─────────────────────────────────────────────────── */}
      <div
        style={{
          padding: '14px 22px 20px',
          paddingTop: 'calc(env(safe-area-inset-top) + 14px)',
        }}
      >
        {/* Back */}
        <button
          type="button"
          onClick={handleBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 16,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: KT.sub,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: KT.font,
          }}
        >
          ← {t('common.back', { defaultValue: 'Back' })}
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div
              style={{
                fontFamily: KT.serif,
                fontSize: 13,
                color: KT.crimson,
                letterSpacing: 4,
                marginBottom: 4,
                fontWeight: 500,
              }}
            >
              詞彙 · VOCAB
            </div>
            <button
              onClick={() => setCoursePickerOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: KT.ink,
                  letterSpacing: -0.6,
                  fontFamily: KT.font,
                }}
              >
                {courseName || t('dashboard.vocab.title', { defaultValue: 'Vocabulary' })}
              </span>
              <ChevronDown size={20} color={KT.sub} strokeWidth={3} />
            </button>
            <div style={{ fontSize: 13, color: KT.sub, marginTop: 4, fontFamily: KT.font }}>
              {scopeTitle}
            </div>
          </div>

          {/* Actions: switch material + mastery ring */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {/* Mastery radial ring */}
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                background: KT.card,
                border: `1px solid ${KT.line2}`,
                boxShadow: KT.shSm,
                position: 'relative',
                padding: 5,
                overflow: 'hidden',
              }}
            >
              <svg
                style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}
                viewBox="0 0 36 36"
              >
                <circle cx="18" cy="18" r="15.9155" fill="none" stroke={KT.bg2} strokeWidth="3.5" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9155"
                  fill="none"
                  stroke={KT.jade}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={`${masteryPct}, 100`}
                  style={{ transition: 'stroke-dasharray 1s ease-out' }}
                />
              </svg>
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 9,
                  fontWeight: 800,
                  color: KT.ink,
                  fontFamily: KT.font,
                }}
              >
                {masteryPct}%
              </div>
            </div>
          </div>
        </div>

        {/* Unit selector (only when overlay is closed) */}
        {!focusOpen && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
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
      </div>

      {/* ── Stage Progress Bar ────────────────────────────────────────────── */}
      <div style={{ padding: '0 18px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {STAGES.map((stage, idx) => {
            const isActive = activeTab === stage.id;
            const isRecommended = !isActive && recommendedStage === stage.id;
            const meta = TAB_META[stage.id];
            return (
              <React.Fragment key={stage.id}>
                {idx > 0 && (
                  <div
                    aria-hidden
                    style={{
                      flex: 1,
                      height: 1,
                      background: isRecommendedAhead(stage.id, recommendedStage)
                        ? KT.line2
                        : KT.line2,
                      opacity: 0.6,
                    }}
                  />
                )}
                <button
                  type="button"
                  onClick={() => handleSelectTab(stage.id)}
                  aria-pressed={isActive}
                  style={{
                    flex: '0 0 auto',
                    minWidth: 84,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                    padding: '10px 8px',
                    borderRadius: 16,
                    background: isActive ? KT.card : 'transparent',
                    border: isActive
                      ? `1px solid ${KT.line2}`
                      : isRecommended
                        ? `1px dashed ${KT.crimson}55`
                        : '1px solid transparent',
                    boxShadow: isActive ? KT.shSm : 'none',
                    cursor: 'pointer',
                    transition: 'background 0.15s, box-shadow 0.15s',
                  }}
                >
                  <span
                    style={{
                      fontFamily: KT.serif,
                      fontSize: 20,
                      color: isActive ? KT.crimson : isRecommended ? KT.ink : KT.sub,
                      fontWeight: 500,
                      lineHeight: 1,
                      opacity: isActive || isRecommended ? 1 : 0.5,
                    }}
                  >
                    {meta.hanja}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: isActive ? KT.ink : KT.sub,
                      letterSpacing: 0.5,
                      fontFamily: KT.font,
                      textTransform: 'uppercase',
                    }}
                  >
                    {t(`vocab.${stage.id}`, { defaultValue: stage.fallbackLabel })}
                  </span>
                  {isRecommended && (
                    <span
                      style={{
                        fontSize: 8,
                        fontWeight: 800,
                        color: KT.crimson,
                        letterSpacing: 0.5,
                        marginTop: 2,
                      }}
                    >
                      {t('vocab.stage.recommended', { defaultValue: 'NEXT' })}
                    </span>
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Match secondary entry */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: 10,
          }}
        >
          <button
            type="button"
            onClick={() => handleSelectTab('match')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 999,
              background: activeTab === 'match' ? KT.card : 'transparent',
              border: `1px solid ${activeTab === 'match' ? KT.line2 : KT.line}`,
              boxShadow: activeTab === 'match' ? KT.shSm : 'none',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 700,
              color: activeTab === 'match' ? KT.ink : KT.sub,
              fontFamily: KT.font,
            }}
            aria-label={t('vocab.match', { defaultValue: 'Match' })}
          >
            <Layers size={12} />
            <span style={{ fontFamily: KT.serif, fontSize: 13, fontWeight: 500 }}>
              {TAB_META.match.hanja}
            </span>
            {t('vocab.match', { defaultValue: 'Match' })}
          </button>
        </div>
      </div>

      {/* ── Continue CTA + Resume Banner ──────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          padding: '0 18px 16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          gap: 10,
        }}
      >
        {currentResume && currentResume.completed > 0 && currentResume.total > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              borderRadius: 14,
              background: `${KT.crimson}10`,
              border: `1px solid ${KT.crimson}33`,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: 0.6,
                  color: KT.crimson,
                  fontFamily: KT.font,
                  textTransform: 'uppercase',
                }}
              >
                {t('vocab.resume.label', { defaultValue: 'Resume' })}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: KT.ink, fontFamily: KT.font }}>
                {t('vocab.resume.progress', {
                  defaultValue: '{{completed}}/{{total}} completed',
                  completed: currentResume.completed,
                  total: currentResume.total,
                })}
              </div>
            </div>
            {onAbandonActiveSession && (
              <button
                type="button"
                onClick={() => onAbandonActiveSession(activeTab as StageId)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '6px 10px',
                  borderRadius: 999,
                  background: 'transparent',
                  border: `1px solid ${KT.line2}`,
                  cursor: 'pointer',
                  fontSize: 10,
                  fontWeight: 700,
                  color: KT.sub,
                  fontFamily: KT.font,
                }}
                aria-label={t('vocab.resume.restart', { defaultValue: 'Restart' })}
              >
                <RotateCcw size={11} />
                {t('vocab.resume.restart', { defaultValue: 'Restart' })}
              </button>
            )}
          </div>
        )}

        {sessionCompleted ? (
          <button
            type="button"
            onClick={() => {
              if (onCompleteSession) {
                onCompleteSession(activeTab as StageId);
              } else {
                navigate(resolveSafeReturnTo(searchParams.get('returnTo'), '/courses'));
              }
            }}
            style={{
              width: '100%',
              height: 60,
              borderRadius: 20,
              background: KT.jade,
              color: '#fff',
              fontSize: 16,
              fontWeight: 800,
              fontFamily: KT.font,
              letterSpacing: -0.3,
              border: 'none',
              cursor: 'pointer',
              boxShadow: `0 8px 20px -4px ${KT.jade}55`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {t('vocab.completeSession', { defaultValue: 'Complete Session' })}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (currentResume && currentResume.completed > 0) {
                if (activeTab === 'flashcard') {
                  setCardIndex(Math.min(currentResume.completed, filteredWords.length - 1));
                }
              }
              setFocusOpen(true);
            }}
            style={{
              width: '100%',
              height: 60,
              borderRadius: 20,
              background: KT.ink,
              color: '#fff',
              fontSize: 16,
              fontWeight: 800,
              fontFamily: KT.font,
              letterSpacing: -0.3,
              border: 'none',
              cursor: 'pointer',
              boxShadow: `0 8px 20px -4px ${KT.ink}55`,
            }}
          >
            {currentResume && currentResume.completed > 0
              ? t('vocab.resume.continue', { defaultValue: 'Continue learning' })
              : t('common.continue', { defaultValue: 'Continue' })}
          </button>
        )}
      </div>
    </div>
  );
}
