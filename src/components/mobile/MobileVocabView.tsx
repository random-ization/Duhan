import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import {
  Layers,
  Puzzle,
  BrainCircuit,
  ClipboardCheck,
  ChevronLeft,
  Settings,
  ChevronDown,
  X,
} from 'lucide-react';
import { ExtendedVocabItem } from '../../pages/VocabModulePage';
import { useTranslation } from 'react-i18next';
import MobileUnitSelector from './MobileUnitSelector';
import MobileFlashcardPlayer from './MobileFlashcardPlayer';
import VocabQuiz from '../../features/vocab/components/VocabQuiz';
import VocabTest from '../../features/vocab/components/VocabTest';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import type { Language } from '../../types';
import { getLabels } from '../../utils/i18n';
import VocabLearnOverlay from '../../features/vocab/components/VocabLearnOverlay';
import FlashcardSettingsModal from '../../features/vocab/components/FlashcardSettingsModal';

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
}: MobileVocabViewProps) {
  const { t } = useTranslation();
  const navigate = useLocalizedNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('flashcard');
  const [cardIndex, setCardIndex] = useState(0);
  const [focusOpen, setFocusOpen] = useState(true);
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [showFlashcardSettings, setShowFlashcardSettings] = useState(false);

  const labels = useMemo(() => getLabels(language), [language]);

  const settingsStorageKey = `mobileFlashcardSettings:${instituteId}`;
  const [flashcardSettings, setFlashcardSettings] = useState<{
    autoTTS: boolean;
    cardFront: 'KOREAN' | 'NATIVE';
    ratingMode: 'PASS_FAIL' | 'FOUR_BUTTONS';
  }>(() => {
    if (globalThis.window === undefined) {
      return { autoTTS: false, cardFront: 'KOREAN', ratingMode: 'FOUR_BUTTONS' };
    }
    try {
      const raw = window.localStorage.getItem(settingsStorageKey);
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
      window.localStorage.setItem(settingsStorageKey, JSON.stringify(flashcardSettings));
    } catch {
      // ignore
    }
  }, [flashcardSettings, settingsStorageKey]);

  // Tabs Configuration
  const tabs = [
    { id: 'flashcard', icon: Layers, label: t('vocab.flashcard', { defaultValue: 'Flashcard' }) },
    { id: 'match', icon: Puzzle, label: t('vocab.match', { defaultValue: 'Match' }) },
    { id: 'learn', icon: BrainCircuit, label: t('vocab.learn', { defaultValue: 'Learn' }) },
    { id: 'test', icon: ClipboardCheck, label: t('vocab.quiz', { defaultValue: 'Test' }) },
  ];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest?.('[data-mobile-vocab-focus-menu]')) return;
      setModeMenuOpen(false);
    };
    if (!modeMenuOpen) return;
    globalThis.addEventListener('mousedown', handler);
    return () => globalThis.removeEventListener('mousedown', handler);
  }, [modeMenuOpen]);

  const closeFocusOverlay = () => {
    setModeMenuOpen(false);
    setShowFlashcardSettings(false);
    setFocusOpen(false);
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

  const focusHeader = (
    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
      <div className="relative" data-mobile-vocab-focus-menu>
        <button
          type="button"
          onClick={() => setModeMenuOpen(prev => !prev)}
          className="h-10 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 font-black text-sm flex items-center gap-2"
        >
          {tabs.find(x => x.id === activeTab)?.label ??
            t('vocab.flashcard', { defaultValue: 'Flashcard' })}
          <ChevronDown className="w-4 h-4 text-slate-500" />
        </button>
        {modeMenuOpen && (
          <div className="absolute left-0 top-full mt-2 w-44 bg-white border-2 border-slate-200 rounded-xl shadow-lg overflow-hidden z-[96]">
            {tabs.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id as TabId);
                  setModeMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 font-black text-sm text-slate-700 hover:bg-slate-50"
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="text-xs font-black text-slate-500">
        {activeTab === 'flashcard' ? (
          <>
            {Math.min(cardIndex + 1, Math.max(filteredWords.length, 1))} /{' '}
            {Math.max(filteredWords.length, 1)}
          </>
        ) : (
          scopeTitle
        )}
      </div>

      <div className="flex items-center gap-2">
        {activeTab === 'flashcard' && (
          <button
            type="button"
            onClick={() => setShowFlashcardSettings(true)}
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
            aria-label={t('vocab.settings', { defaultValue: 'Settings' })}
          >
            <Settings className="w-5 h-5 text-slate-700" />
          </button>
        )}
        <button
          type="button"
          onClick={closeFocusOverlay}
          className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
          aria-label={t('common.close', { defaultValue: 'Close' })}
        >
          <X className="w-5 h-5 text-slate-700" />
        </button>
      </div>
    </div>
  );

  const renderFocusContent = () => {
    if (activeTab === 'flashcard') {
      return (
        <div className="h-full overflow-hidden flex flex-col p-4">
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
              <div className="rounded-xl border-2 border-slate-200 bg-white p-4 text-sm font-bold text-slate-500">
                Loading Match...
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
            onComplete={() => {}}
            onNextUnit={() => {}}
            hasNextUnit={false}
            userId={userId}
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
    <div className="min-h-screen bg-slate-50 flex flex-col pb-safe">
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
        <div className="h-full">{renderFocusContent()}</div>
      </VocabLearnOverlay>

      {/* Header */}
      <header className="bg-white px-4 py-3 border-b border-slate-200 flex items-center justify-between sticky top-0 z-20">
        <button
          onClick={() => navigate(`/course/${instituteId}`)}
          className="w-9 h-9 border-2 border-slate-200 rounded-xl flex items-center justify-center text-slate-400 active:bg-slate-50"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <MobileUnitSelector
          currentUnitId={currentUnitId}
          availableUnits={availableUnits}
          unitCounts={unitCounts}
          onSelect={u => {
            onSelectUnit(u);
            setCardIndex(0); // Reset card index on unit change
          }}
          allWordsCount={allWords.length}
        />

        {/* Mastery Donut */}
        <div className="relative w-9 h-9">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-slate-100"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="text-green-500 transition-all duration-1000 ease-out"
              strokeDasharray={`${(masteryCount / Math.max(filteredWords.length, 1)) * 100}, 100`}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-slate-900">
            {Math.round((masteryCount / Math.max(filteredWords.length, 1)) * 100)}%
          </div>
        </div>
      </header>

      {/* Tabs - Segmented Control */}
      <div className="px-4 py-4 shrink-0">
        <div className="bg-slate-200 p-1 rounded-xl flex">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as TabId);
                  setFocusOpen(true);
                }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all ${
                  isActive
                    ? 'bg-white shadow-sm text-slate-900'
                    : 'text-slate-500 hover:bg-white/50'
                }`}
              >
                <Icon className="w-3 h-3" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 px-4 pb-6">
        <button
          type="button"
          onClick={() => setFocusOpen(true)}
          className="w-full h-12 rounded-xl bg-slate-900 text-white font-black shadow-pop-sm active:translate-y-0.5 active:shadow-none transition"
        >
          {t('common.continue', { defaultValue: 'Continue' })}
        </button>
      </div>
    </div>
  );
}
