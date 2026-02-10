import React, { useState } from 'react';
import { Layers, Puzzle, BrainCircuit, ClipboardCheck, ChevronLeft } from 'lucide-react';
import { ExtendedVocabItem } from '../../pages/VocabModulePage';
import { useTranslation } from 'react-i18next';
import MobileUnitSelector from './MobileUnitSelector';
import MobileFlashcardPlayer from './MobileFlashcardPlayer';
import VocabMatch from '../../features/vocab/components/VocabMatch';
import VocabQuiz from '../../features/vocab/components/VocabQuiz';
import VocabTest from '../../features/vocab/components/VocabTest';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';

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
}

type TabId = 'flashcard' | 'match' | 'learn' | 'test';

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
}: MobileVocabViewProps) {
  const { t } = useTranslation();
  const navigate = useLocalizedNavigate();
  const [activeTab, setActiveTab] = useState<TabId>('flashcard');
  const [cardIndex, setCardIndex] = useState(0);

  // Tabs Configuration
  const tabs = [
    { id: 'flashcard', icon: Layers, label: t('vocab.flashcard') || 'Flashcard' },
    { id: 'match', icon: Puzzle, label: t('vocab.match') || 'Match' },
    { id: 'learn', icon: BrainCircuit, label: t('learn') || 'Learn' },
    { id: 'test', icon: ClipboardCheck, label: t('vocab.quiz') || 'Test' },
  ];

  const handleNextCard = () => {
    setCardIndex(prev => (prev + 1) % filteredWords.length);
  };

  const handlePrevCard = () => {
    setCardIndex(prev => (prev - 1 + filteredWords.length) % filteredWords.length);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-safe">
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
                onClick={() => setActiveTab(tab.id as TabId)}
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
      <div className="flex-1 px-4 pb-6 overflow-hidden flex flex-col">
        {activeTab === 'flashcard' && (
          <MobileFlashcardPlayer
            words={filteredWords}
            currentIndex={cardIndex}
            onReview={(w, q) => {
              onReview(w, q);
              // Automatically go to next card after review logic handled?
              // FlashcardView handles index internally usually?
              // No, usually user swipes. But here we have buttons.
              // Let's implement auto-advance for flow
              handleNextCard();
            }}
            onStar={onStar}
            onSpeak={onSpeak}
            isStarred={isStarred}
            onNext={handleNextCard}
            onPrev={handlePrevCard}
          />
        )}

        {/* Existing Components might need wrappers for height/scroll */}
        {activeTab === 'match' && (
          <div className="h-full overflow-y-auto">
            <VocabMatch
              words={gameWords}
              onComplete={() => {}} // Handle completion
              // No close needed here
            />
          </div>
        )}

        {activeTab === 'learn' && (
          <div className="h-full overflow-y-auto">
            <VocabQuiz
              words={gameWords}
              onComplete={() => {}}
              onNextUnit={() => {
                // Handle unit switch logic if needed
              }}
              hasNextUnit={false} // Simple for now
              userId="user" // Need actual user ID or it might bug out?
              language="en" // Props need to be passed
              variant="learn"
              currentUnitLabel="Unit"
            />
          </div>
        )}

        {activeTab === 'test' && (
          <div className="h-full overflow-y-auto">
            <VocabTest
              words={filteredWords}
              language="en" // Pass language
              scopeTitle="Unit"
              onClose={() => {}}
              showCloseButton={false}
              onFsrsReview={onFsrsReview}
            />
          </div>
        )}
      </div>
    </div>
  );
}
