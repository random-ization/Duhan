import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Settings, ChevronDown, X, BookMarked } from 'lucide-react';
import { ExtendedVocabItem } from '../../pages/VocabModulePage';
import { useGlobalSettings } from '../../hooks/useGlobalSettings';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import MobileUnitSelector from './MobileUnitSelector';
import MobileFlashcardPlayer from './MobileFlashcardPlayer';
import { MobileLearnMode } from './MobileLearnMode';
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
import { KT } from './ksoft/ksoft';

interface MobileVocabViewProps {
  // Data
  readonly allWords: ExtendedVocabItem[];
  readonly filteredWords: ExtendedVocabItem[];
  readonly gameWords: any[];

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
  readonly language: Language;
  readonly userId?: string;
  readonly onRequestTestMode?: () => Promise<boolean>;
}

type TabId = 'flashcard' | 'match' | 'learn' | 'test';

// K-Soft Hanja labels for each tab mode
const TAB_META: Record<TabId, { hanja: string }> = {
  flashcard: { hanja: '閃' },
  match: { hanja: '配' },
  learn: { hanja: '學' },
  test: { hanja: '試' },
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
  const switchMaterialPath = buildLearningPickerPath('vocabulary');

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
          onClick={() => navigate(switchMaterialPath)}
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
        <div className="h-full overflow-hidden">
          <MobileLearnMode
            words={gameWords}
            onComplete={() => setFocusOpen(false)}
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
          onClose={closeFocusOverlay}
          showCloseButton={false}
          onFsrsReview={onFsrsReview}
        />
      </div>
    );
  };

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
        headerContent={activeTab === 'flashcard' ? flashcardFocusHeader : activeTab === 'learn' ? <></> : defaultFocusHeader}
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
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: KT.ink,
                letterSpacing: -0.6,
              }}
            >
              {t('dashboard.vocab.title', { defaultValue: '단어장' })}
            </div>
            <div style={{ fontSize: 13, color: KT.sub, marginTop: 4 }}>{scopeTitle}</div>
          </div>

          {/* Actions: switch material + mastery ring */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => navigate(switchMaterialPath)}
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                background: KT.card,
                border: `1px solid ${KT.line2}`,
                boxShadow: KT.shSm,
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
              }}
              aria-label={t('learningFlow.actions.switchMaterial', {
                defaultValue: 'Switch textbook',
              })}
            >
              <BookMarked size={18} color={KT.sub} />
            </button>

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

      {/* ── Mode Tabs ─────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: '0 18px 16px',
          display: 'flex',
          gap: 8,
        }}
      >
        {tabs.map(tab => {
          const meta = TAB_META[tab.id as TabId];
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleSelectTab(tab.id as TabId)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                padding: '10px 6px',
                borderRadius: 16,
                background: isActive ? KT.card : 'transparent',
                border: isActive ? `1px solid ${KT.line2}` : '1px solid transparent',
                boxShadow: isActive ? KT.shSm : 'none',
                cursor: 'pointer',
                transition: 'background 0.15s, box-shadow 0.15s',
              }}
            >
              <span
                style={{
                  fontFamily: KT.serif,
                  fontSize: 20,
                  color: isActive ? KT.crimson : KT.sub,
                  fontWeight: 500,
                  lineHeight: 1,
                  opacity: isActive ? 1 : 0.5,
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
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Continue CTA ──────────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          padding: '0 18px 16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
        }}
      >
        <button
          type="button"
          onClick={() => setFocusOpen(true)}
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
          {t('common.continue', { defaultValue: 'Continue' })}
        </button>
      </div>
    </div>
  );
}
