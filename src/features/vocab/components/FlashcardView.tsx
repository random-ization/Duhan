import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  Volume2,
  CheckCircle,
  XCircle,
  Undo2,
  Shuffle,
  Settings,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { ExtendedVocabularyItem, VocabSettings } from '../types';
import { Language } from '../../../types';
import { getLabels } from '../../../utils/i18n';
import { getLocalizedContent } from '../../../utils/languageUtils';
import { useTTS } from '../../../hooks/useTTS';
import { useLayout } from '../../../contexts/LayoutContext';
import { useFlashcardKeyboard } from '../hooks/useFlashcardKeyboard';
import FlashcardSettingsModal from './FlashcardSettingsModal';
import FlashcardFullscreenOverlay from './FlashcardFullscreenOverlay';
import { Button } from '../../../components/ui';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '../../../components/ui';

interface FlashcardViewProps {
  words: ExtendedVocabularyItem[];
  settings: VocabSettings;
  language: Language;
  onComplete: (stats: {
    correct: ExtendedVocabularyItem[];
    incorrect: ExtendedVocabularyItem[];
  }) => void;
  onSaveWord?: (word: ExtendedVocabularyItem) => void;
  onCardReview?: (word: ExtendedVocabularyItem, result: boolean | number) => void;
  onRequestNavigate?: (target: 'flashcard' | 'learn' | 'test' | 'match') => void;
  onSpeak?: (text: string) => void;
  courseId?: string;
  progressKey?: string;
}

const useFlashcardSettings = (settings: VocabSettings) => {
  const [localSettings, setLocalSettings] = useState(() => ({
    autoTTS: settings.flashcard.autoTTS,
    cardFront: settings.flashcard.cardFront,
    ratingMode: (settings.flashcard as any).ratingMode || 'PASS_FAIL',
  }));
  const [showSettings, setShowSettings] = useState(false);
  return { localSettings, setLocalSettings, showSettings, setShowSettings };
};

const useFlashcardDrag = (onRate: (result: boolean) => void) => {
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const resetDrag = useCallback(() => {
    setDragStart(null);
    setDragOffset({ x: 0, y: 0 });
    setIsDragging(false);
  }, []);

  const handleDragStart = useCallback((x: number, y: number) => {
    setDragStart({ x, y });
    setIsDragging(true);
  }, []);

  const handleDragMove = useCallback(
    (x: number, y: number) => {
      if (!dragStart) return;
      setDragOffset({ x: x - dragStart.x, y: y - dragStart.y });
    },
    [dragStart]
  );

  const handleDragEnd = useCallback(() => {
    if (!dragStart) return;
    const threshold = 100;
    if (dragOffset.x > threshold) {
      onRate(true);
    } else if (dragOffset.x < -threshold) {
      onRate(false);
    }
    resetDrag();
  }, [dragStart, dragOffset.x, onRate, resetDrag]);

  return { dragOffset, isDragging, handleDragStart, handleDragMove, handleDragEnd };
};

const useFlashcardFullscreen = (
  setSidebarHidden: (hidden: boolean) => void,
  sidebarHidden: boolean
) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenMenuOpen, setFullscreenMenuOpen] = useState(false);
  const sidebarHiddenRef = useRef(sidebarHidden);

  useEffect(() => {
    if (isFullscreen) return;
    sidebarHiddenRef.current = sidebarHidden;
  }, [sidebarHidden, isFullscreen]);

  useEffect(() => {
    if (!isFullscreen) return;
    const previous = sidebarHiddenRef.current;
    setSidebarHidden(true);
    return () => setSidebarHidden(previous);
  }, [isFullscreen, setSidebarHidden]);

  useEffect(() => {
    if (!isFullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFullscreen]);

  const toggleFullscreen = useCallback(() => setIsFullscreen(prev => !prev), []);

  return {
    isFullscreen,
    setIsFullscreen,
    fullscreenMenuOpen,
    setFullscreenMenuOpen,
    toggleFullscreen,
  };
};

const useFlashcardStats = (
  initialWords: ExtendedVocabularyItem[],
  settings: VocabSettings,
  storageKey: string | null,
  onComplete: (stats: {
    correct: ExtendedVocabularyItem[];
    incorrect: ExtendedVocabularyItem[];
  }) => void,
  onSaveWord?: (word: ExtendedVocabularyItem) => void,
  onCardReview?: (word: ExtendedVocabularyItem, result: boolean | number) => void
) => {
  const [isRandom, setIsRandom] = useState(settings.flashcard.random);
  const [words, setWords] = useState<ExtendedVocabularyItem[]>(() =>
    settings.flashcard.random ? [...initialWords].sort(() => Math.random() - 0.5) : initialWords
  );

  const [cardIndex, setCardIndex] = useState(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const { index } = JSON.parse(saved);
          if (typeof index === 'number' && index < initialWords.length) {
            return index;
          }
        } catch {
          /* ignore */
        }
      }
    }
    return 0;
  });

  const [isFlipped, setIsFlipped] = useState(false);
  const [history, setHistory] = useState<number[]>([]);
  const [trackProgress, setTrackProgress] = useState(true);
  const [sessionStats, setSessionStats] = useState<{
    correct: ExtendedVocabularyItem[];
    incorrect: ExtendedVocabularyItem[];
  }>(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const { stats } = JSON.parse(saved);
          if (stats) return stats;
        } catch {
          /* ignore */
        }
      }
    }
    return { correct: [], incorrect: [] };
  });

  useEffect(() => {
    if (storageKey && trackProgress && cardIndex > 0) {
      localStorage.setItem(storageKey, JSON.stringify({ index: cardIndex, stats: sessionStats }));
    }
  }, [storageKey, trackProgress, cardIndex, sessionStats]);

  const currentCard = words[cardIndex];

  const handleCardRate = useCallback(
    (result: boolean | number) => {
      if (!currentCard) return;

      if (onCardReview) {
        onCardReview(currentCard, result);
      }

      const isPass = typeof result === 'boolean' ? result : result > 1;
      setHistory(prev => [...prev, cardIndex]);

      const nextStats = {
        correct: isPass ? [...sessionStats.correct, currentCard] : sessionStats.correct,
        incorrect: isPass ? sessionStats.incorrect : [...sessionStats.incorrect, currentCard],
      };

      setSessionStats(nextStats);

      if (isPass) {
        // No additional action for correct
      } else if (onSaveWord) {
        onSaveWord(currentCard);
      }

      const nextIndex = cardIndex + 1;
      if (nextIndex < words.length) {
        setCardIndex(nextIndex);
        setIsFlipped(false);
      } else {
        if (storageKey) localStorage.removeItem(storageKey);
        onComplete(nextStats);
      }
    },
    [
      cardIndex,
      currentCard,
      storageKey,
      onComplete,
      onSaveWord,
      sessionStats,
      words.length,
      onCardReview,
    ]
  );

  const handleUndo = useCallback(() => {
    const prevIndex = history.at(-1);
    if (prevIndex === undefined) return;
    const prevCard = words[prevIndex];
    setSessionStats(prev => ({
      correct: prev.correct.filter(w => w.id !== prevCard.id),
      incorrect: prev.incorrect.filter(w => w.id !== prevCard.id),
    }));
    setHistory(prev => prev.slice(0, -1));
    setCardIndex(prevIndex);
    setIsFlipped(false);
  }, [history, words]);

  const toggleRandom = useCallback(() => {
    setIsRandom(prev => {
      const newRandom = !prev;
      if (newRandom) {
        setWords([...initialWords].sort(() => Math.random() - 0.5));
      } else {
        setWords(initialWords);
      }
      setCardIndex(0);
      setHistory([]);
      setSessionStats({ correct: [], incorrect: [] });
      return newRandom;
    });
  }, [initialWords]);

  return {
    words,
    cardIndex,
    setCardIndex,
    isFlipped,
    setIsFlipped,
    history,
    trackProgress,
    setTrackProgress,
    sessionStats,
    isRandom,
    currentCard,
    handleCardRate,
    handleUndo,
    toggleRandom,
  };
};

interface FlashcardProps {
  card: ExtendedVocabularyItem;
  isFlipped: boolean;
  isDragging: boolean;
  dragOffset: { x: number; y: number };
  language: Language;
  cardFront: 'KOREAN' | 'NATIVE';
  onFlip: () => void;
  onSpeak: (text: string) => void;
  onDragStart: (x: number, y: number) => void;
  onDragMove: (x: number, y: number) => void;
  onDragEnd: () => void;
}

interface FlashcardToolbarProps {
  cardIndex: number;
  totalCards: number;
  trackProgress: boolean;
  ratingMode: 'PASS_FAIL' | 'FOUR_BUTTONS';
  isRandom: boolean;
  canUndo: boolean;
  labels: ReturnType<typeof getLabels>;
  onRate: (result: boolean | number) => void;
  onUndo: () => void;
  onToggleRandom: () => void;
  onToggleTrackProgress: () => void;
  onToggleFullscreen: () => void;
  onShowSettings: () => void;
  isFullscreen?: boolean;
}

const Flashcard: React.FC<FlashcardProps> = ({
  card,
  isFlipped,
  isDragging,
  dragOffset,
  language,
  cardFront,
  onFlip,
  onSpeak,
  onDragStart,
  onDragMove,
  onDragEnd,
}) => {
  const meaning = getLocalizedContent(card, 'meaning', language) || card.english;
  const exampleTranslation = getLocalizedContent(card, 'exampleTranslation', language);

  const getPosClass = (pos: string) => {
    if (pos === 'VERB_T') return 'bg-blue-100 text-blue-700';
    if (pos === 'VERB_I') return 'bg-red-100 text-red-700';
    if (pos === 'ADJ') return 'bg-purple-100 text-purple-700';
    if (pos === 'NOUN') return 'bg-green-100 text-green-700';
    return 'bg-muted text-muted-foreground';
  };

  let transformStyle = '';
  if (isDragging) {
    transformStyle = `translateX(${dragOffset.x}px) rotate(${dragOffset.x * 0.05}deg)`;
    if (isFlipped) {
      transformStyle += ' rotateY(180deg)';
    }
  }

  const transform = isDragging ? transformStyle : undefined;

  const transitionStyle = isDragging ? 'none' : 'transform 0.5s';

  const speakerButton = (text: string) => (
    <Button
      variant="ghost"
      size="auto"
      type="button"
      className="absolute top-4 right-4 p-2 rounded-full text-muted-foreground hover:bg-muted hover:text-indigo-600 transition-colors z-10"
      onClick={e => {
        e.stopPropagation();
        onSpeak(text);
      }}
      onMouseDown={e => e.stopPropagation()}
      aria-label="Speak"
    >
      <Volume2 className="w-5 h-5" />
    </Button>
  );

  return (
    <Button
      variant="ghost"
      size="auto"
      type="button"
      className="perspective-1000 w-full max-w-2xl h-96 relative group select-none touch-none bg-transparent border-none p-0 outline-none"
      onClick={onFlip}
      onMouseDown={e => onDragStart(e.clientX, e.clientY)}
      onMouseMove={e => onDragMove(e.clientX, e.clientY)}
      onMouseUp={onDragEnd}
      onMouseLeave={onDragEnd}
      onTouchStart={e => onDragStart(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={e => onDragMove(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={onDragEnd}
    >
      <div
        className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}
        style={{ transform, transition: transitionStyle }}
      >
        {/* Drag Overlays */}
        {isDragging && dragOffset.x > 50 && (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center bg-emerald-500/20 rounded-2xl border-4 border-emerald-500"
            aria-hidden="true"
          >
            <CheckCircle className="w-32 h-32 text-emerald-600 opacity-50" />
          </div>
        )}
        {isDragging && dragOffset.x < -50 && (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center bg-red-500/20 rounded-2xl border-4 border-red-500"
            aria-hidden="true"
          >
            <XCircle className="w-32 h-32 text-red-600 opacity-50" />
          </div>
        )}

        {/* Front */}
        <div className="absolute w-full h-full backface-hidden bg-card rounded-2xl shadow-xl border border-border flex flex-col items-center justify-center p-8 text-center">
          {speakerButton(card.korean)}
          {cardFront === 'KOREAN' ? (
            <h3 className="text-5xl font-bold text-foreground leading-tight">{card.korean}</h3>
          ) : (
            <h3 className="text-4xl font-medium text-muted-foreground leading-tight">{meaning}</h3>
          )}
        </div>

        {/* Back */}
        <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-card rounded-2xl shadow-xl border border-border flex flex-col items-center justify-center p-6 text-center overflow-y-auto">
          {speakerButton(card.korean)}
          {card.partOfSpeech && (
            <div
              className={`mb-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getPosClass(card.partOfSpeech)}`}
            >
              {card.partOfSpeech}
            </div>
          )}
          {cardFront === 'KOREAN' ? (
            <>
              <p className="text-3xl font-medium text-indigo-600 mb-2">{meaning}</p>
              {card.hanja && (
                <p className="text-lg text-muted-foreground mb-4">
                  {labels.hanja || 'Hanja'}: {card.hanja}
                </p>
              )}
            </>
          ) : (
            <>
              <h3 className="text-5xl font-bold text-indigo-600 mb-2">{card.korean}</h3>
              {card.hanja && (
                <p className="text-lg text-muted-foreground mb-2">
                  {labels.hanja || 'Hanja'}: {card.hanja}
                </p>
              )}
            </>
          )}
          {card.exampleSentence && (
            <div className="bg-muted p-3 rounded-lg w-full max-w-lg mt-4">
              <p className="text-muted-foreground text-base mb-1">{card.exampleSentence}</p>
              {exampleTranslation && (
                <p className="text-muted-foreground text-sm">{exampleTranslation}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </Button>
  );
};

const FlashcardToolbar: React.FC<FlashcardToolbarProps> = ({
  cardIndex,
  totalCards,
  trackProgress,
  ratingMode,
  isRandom,
  canUndo,
  labels,
  onRate,
  onUndo,
  onToggleRandom,
  onToggleTrackProgress,
  onToggleFullscreen,
  onShowSettings,
  isFullscreen,
}) => {
  const containerClass = isFullscreen
    ? 'flex items-center justify-between max-w-4xl mx-auto'
    : 'w-full max-w-4xl bg-card rounded-2xl border border-border px-4 py-3 flex items-center justify-between gap-4';

  const rateButtons =
    ratingMode === 'PASS_FAIL' ? (
      <>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="auto"
              onClick={() => onRate(false)}
              aria-label="Forgot (Left Arrow)"
              className="w-12 h-12 flex items-center justify-center rounded-xl border-2 border-red-200 text-red-500 hover:bg-red-50 transition-colors"
            >
              <XCircle className="w-6 h-6" />
            </Button>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent side="top">Forgot (Left Arrow)</TooltipContent>
          </TooltipPortal>
        </Tooltip>
        <span className="px-4 py-2 text-muted-foreground font-medium">
          {cardIndex + 1} / {totalCards}
        </span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="auto"
              onClick={() => onRate(true)}
              aria-label="Remembered (Right Arrow)"
              className="w-12 h-12 flex items-center justify-center rounded-xl border-2 border-green-200 text-green-500 hover:bg-green-50 transition-colors"
            >
              <CheckCircle className="w-6 h-6" />
            </Button>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent side="top">Remembered (Right Arrow)</TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </>
    ) : (
      <div className="flex items-center gap-2">
        <span className="mr-2 text-muted-foreground font-medium text-sm">
          {cardIndex + 1} / {totalCards}
        </span>
        {(
          [
            { val: 1, label: 'Again', color: 'red' },
            { val: 2, label: 'Hard', color: 'orange' },
            { val: 3, label: 'Good', color: 'blue' },
            { val: 4, label: 'Easy', color: 'green' },
          ] as const
        ).map(b => (
          <Button
            variant="ghost"
            size="auto"
            key={b.val}
            onClick={() => onRate(b.val)}
            className={`px-3 py-2 rounded-lg bg-${b.color}-50 text-${b.color}-600 font-bold hover:bg-${b.color}-100 transition-colors`}
          >
            {b.val}. {b.label}
          </Button>
        ))}
      </div>
    );

  return (
    <div className={containerClass}>
      <Button
        variant="ghost"
        size="auto"
        type="button"
        className="flex items-center gap-2 cursor-pointer select-none group"
        onClick={onToggleTrackProgress}
      >
        <span className="text-sm font-medium text-muted-foreground group-hover:text-muted-foreground transition-colors">
          {labels.trackProgress || 'Track progress'}
        </span>
        <div
          className={`w-10 h-6 rounded-full transition-colors relative ${trackProgress ? 'bg-indigo-600' : 'bg-muted'}`}
        >
          <div
            className={`absolute top-1 w-4 h-4 bg-card rounded-full shadow transition-transform ${trackProgress ? 'translate-x-5' : 'translate-x-1'}`}
          />
        </div>
      </Button>

      <div className="flex items-center gap-2">{rateButtons}</div>

      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="auto"
              onClick={onUndo}
              aria-label={labels.undo || 'Undo'}
              className={`p-2.5 rounded-lg transition-colors ${canUndo ? 'text-muted-foreground hover:bg-muted hover:text-muted-foreground' : 'text-muted-foreground cursor-not-allowed'}`}
              disabled={!canUndo}
            >
              <Undo2 className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent side="top">{labels.undo || 'Undo'}</TooltipContent>
          </TooltipPortal>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="auto"
              onClick={onToggleRandom}
              aria-label={labels.randomMode || 'Random mode'}
              className={`p-2.5 rounded-lg transition-colors ${isRandom ? 'bg-indigo-100 text-indigo-600' : 'text-muted-foreground hover:bg-muted hover:text-muted-foreground'}`}
            >
              <Shuffle className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent side="top">{labels.randomMode || 'Random mode'}</TooltipContent>
          </TooltipPortal>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="auto"
              onClick={onShowSettings}
              aria-label={labels.settings || 'Settings'}
              className="p-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-muted-foreground transition-colors"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent side="top">{labels.settings || 'Settings'}</TooltipContent>
          </TooltipPortal>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="auto"
              onClick={onToggleFullscreen}
              aria-label={labels.fullscreen || 'Fullscreen'}
              className="p-2.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-muted-foreground transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </Button>
          </TooltipTrigger>
          <TooltipPortal>
            <TooltipContent side="top">{labels.fullscreen || 'Fullscreen'}</TooltipContent>
          </TooltipPortal>
        </Tooltip>
      </div>
    </div>
  );
};

const FlashcardView: React.FC<FlashcardViewProps> = React.memo(
  ({
    words: initialWords,
    settings,
    language,
    onComplete,
    onSaveWord,
    onCardReview,
    onRequestNavigate,
    onSpeak,
    courseId,
    progressKey,
  }) => {
    const labels = useMemo(() => getLabels(language), [language]);
    const { speak: speakTTS, stop: stopTTS } = useTTS();
    const { sidebarHidden, setSidebarHidden } = useLayout();

    const { localSettings, setLocalSettings, showSettings, setShowSettings } =
      useFlashcardSettings(settings);

    const storageKey = useMemo(() => {
      if (progressKey) return `flashcard_progress_${progressKey}`;
      if (courseId) return `flashcard_progress_${courseId}`;
      return null;
    }, [courseId, progressKey]);

    const {
      words,
      cardIndex,
      isFlipped,
      setIsFlipped,
      history,
      trackProgress,
      setTrackProgress,
      sessionStats,
      isRandom,
      currentCard,
      handleCardRate,
      handleUndo,
      toggleRandom,
    } = useFlashcardStats(initialWords, settings, storageKey, onComplete, onSaveWord, onCardReview);

    const { dragOffset, isDragging, handleDragStart, handleDragMove, handleDragEnd } =
      useFlashcardDrag(handleCardRate);

    const {
      isFullscreen,
      setIsFullscreen,
      fullscreenMenuOpen,
      setFullscreenMenuOpen,
      toggleFullscreen,
    } = useFlashcardFullscreen(setSidebarHidden, sidebarHidden);

    useEffect(() => stopTTS, [stopTTS]);

    const speakKorean = useCallback(
      (text: string) => {
        if (onSpeak) {
          onSpeak(text);
        } else {
          void speakTTS(text);
        }
      },
      [onSpeak, speakTTS]
    );

    // Use the extracted keyboard hook
    useFlashcardKeyboard({
      isFullscreen,
      setIsFullscreen,
      handleUndo,
      isFlipped,
      setIsFlipped,
      handleCardRate,
      ratingMode: localSettings.ratingMode,
    });

    // Auto TTS
    useEffect(() => {
      if (localSettings.autoTTS && currentCard && !isFlipped) {
        if (onSpeak) {
          onSpeak(currentCard.korean);
        } else {
          speakKorean(currentCard.korean);
        }
      }
    }, [cardIndex, localSettings.autoTTS, currentCard, isFlipped, onSpeak, speakKorean]);

    const onToggleTrackProgress = useCallback(() => {
      setTrackProgress(prev => !prev);
    }, [setTrackProgress]);

    if (!currentCard) {
      return <div className="text-center text-muted-foreground">{labels.noWords}</div>;
    }

    const toolbar = (
      <FlashcardToolbar
        cardIndex={cardIndex}
        totalCards={words.length}
        trackProgress={trackProgress}
        ratingMode={localSettings.ratingMode}
        isRandom={isRandom}
        canUndo={history.length > 0}
        labels={labels}
        onRate={handleCardRate}
        onUndo={handleUndo}
        onToggleRandom={toggleRandom}
        onToggleTrackProgress={onToggleTrackProgress}
        onToggleFullscreen={toggleFullscreen}
        onShowSettings={() => setShowSettings(true)}
        isFullscreen={isFullscreen}
      />
    );

    const flashcard = (
      <Flashcard
        card={currentCard}
        isFlipped={isFlipped}
        isDragging={isDragging}
        dragOffset={dragOffset}
        language={language}
        cardFront={localSettings.cardFront}
        onFlip={() => !isDragging && setIsFlipped(!isFlipped)}
        onSpeak={speakKorean}
        onDragStart={handleDragStart}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
      />
    );

    // Fullscreen mode - use extracted component
    if (isFullscreen) {
      return (
        <FlashcardFullscreenOverlay
          words={words}
          cardIndex={cardIndex}
          sessionStats={sessionStats}
          language={language}
          showSettings={showSettings}
          fullscreenMenuOpen={fullscreenMenuOpen}
          localSettings={localSettings}
          flashcard={flashcard}
          toolbar={toolbar}
          onSetShowSettings={setShowSettings}
          onSetFullscreenMenuOpen={setFullscreenMenuOpen}
          onToggleFullscreen={toggleFullscreen}
          onRequestNavigate={onRequestNavigate}
          onUpdateSettings={setLocalSettings}
        />
      );
    }

    // Normal mode
    return (
      <div className="flex flex-col items-center">
        <FlashcardSettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          settings={localSettings}
          onUpdate={setLocalSettings}
          labels={labels}
        />
        {flashcard}
        <div className="mt-6">{toolbar}</div>
      </div>
    );
  }
);
FlashcardView.displayName = 'FlashcardView';
console.log('FlashcardView v2 loaded');

export default FlashcardView;
