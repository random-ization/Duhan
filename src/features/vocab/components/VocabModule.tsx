import React, { Suspense, lazy, useMemo, useState } from 'react';
import { Filter, Layers, Brain, List as ListIcon, Settings as SettingsIcon } from 'lucide-react';
import { CourseSelection, VocabularyItem, Language, TextbookContent } from '../../../types';
import { getLabels } from '../../../utils/i18n';
import { useActivityLogger } from '../../../hooks/useActivityLogger';
import { ExtendedVocabularyItem, VocabSettings, LearningMode, SessionStats } from '../types';
import { shuffleArray } from '../utils';
import { logger } from '../../../utils/logger';
import { Button } from '../../../components/ui';
import { Select } from '../../../components/ui';
import { useGlobalSettings } from '../../../hooks/useGlobalSettings';

const LazyFlashcardView = lazy(() => import('./FlashcardView'));
const LazyLearnModeView = lazy(() => import('./LearnModeView'));
const LazyListView = lazy(() => import('./ListView'));
const LazyVocabSettingsModal = lazy(() => import('./VocabSettingsModal'));
const LazySessionSummary = lazy(() => import('./SessionSummary'));

const VocabContentFallback: React.FC = () => (
  <div className="w-full max-w-4xl mx-auto rounded-2xl border border-border bg-card p-8 text-center text-sm font-semibold text-muted-foreground">
    Loading...
  </div>
);

interface VocabModuleProps {
  course: CourseSelection;
  instituteName: string;
  language: Language;
  levelContexts: Record<number, TextbookContent>;
  customWordList?: VocabularyItem[];
  customListType?: 'SAVED' | 'MISTAKES';
  onRecordMistake?: (word: VocabularyItem) => void;
  onSaveWord?: (word: VocabularyItem) => void;
}

const VocabModule: React.FC<VocabModuleProps> = ({
  course: _course,
  instituteName: _instituteName,
  language,
  levelContexts,
  customWordList,
  customListType,
  onRecordMistake,
  onSaveWord,
}) => {
  const { logActivity } = useActivityLogger();
  const labels = getLabels(language);
  const { settings: globalSettings, updateSettings: updateGlobalSettings } = useGlobalSettings();

  // Helper function to get custom list title
  const getCustomListTitle = (
    listType: 'SAVED' | 'MISTAKES' | undefined,
    labels: ReturnType<typeof getLabels>
  ): string => {
    return listType === 'SAVED' ? labels.vocabBook : labels.mistakeBook;
  };

  // Data State
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<number | 'ALL'>('ALL');
  const [reviewingIncorrect, setReviewingIncorrect] = useState(false);

  // View State
  const [viewMode, setViewMode] = useState<LearningMode>('CARDS');
  const [showSettings, setShowSettings] = useState(false);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [sessionStats, setSessionStats] = useState<SessionStats>({ correct: [], incorrect: [] });
  const [sessionStartTime, setSessionStartTime] = useState<number>(() => Date.now());

  // Settings
  const [localSettings, setLocalSettings] = useState<VocabSettings>({
    flashcard: {
      batchSize: 20,
      random: false,
      cardFront: 'KOREAN',
      autoTTS: true,
      ratingMode: 'PASS_FAIL',
    },
    learn: {
      batchSize: 20,
      random: true,
      ratingMode: 'PASS_FAIL', // Default: 2-button mode (Pass/Fail)
      types: {
        multipleChoice: true,
        writing: false,
      },
      answers: {
        korean: false,
        native: true,
      },
    },
  });

  const settings = useMemo<VocabSettings>(
    () => ({
      ...localSettings,
      flashcard: {
        ...localSettings.flashcard,
        autoTTS: globalSettings.flashcardAutoTTS,
        cardFront: globalSettings.flashcardFront,
        ratingMode: globalSettings.flashcardRatingMode,
      },
    }),
    [
      globalSettings.flashcardAutoTTS,
      globalSettings.flashcardFront,
      globalSettings.flashcardRatingMode,
      localSettings,
    ]
  );

  // Derived Words (sync parsing)
  const parsedWords = useMemo(() => {
    const combined: ExtendedVocabularyItem[] = [];

    if (customWordList && customWordList.length > 0) {
      // Use provided custom list
      customWordList.forEach((item, idx) => {
        combined.push({ ...item, unit: item.unit || 0, id: `custom-${idx}` });
      });
    } else {
      // Parse from context
      Object.keys(levelContexts).forEach(unitStr => {
        const unit = Number.parseInt(unitStr);
        const content = levelContexts[unit];
        if (content?.vocabularyList?.startsWith('[')) {
          try {
            const parsed: VocabularyItem[] = JSON.parse(content.vocabularyList);
            parsed.forEach((item, idx) => {
              combined.push({ ...item, unit, id: `${unit}-${idx}` });
            });
          } catch (e) {
            logger.warn(`Failed to parse vocab for unit ${unit}`, e);
          }
        }
      });
    }
    return combined;
  }, [levelContexts, customWordList]);

  const allWords = parsedWords;

  const filteredWords = useMemo(() => {
    if (reviewingIncorrect) {
      return sessionStats.incorrect;
    }
    if (selectedUnitFilter !== 'ALL') {
      return allWords.filter(w => w.unit === selectedUnitFilter);
    }
    return allWords;
  }, [allWords, selectedUnitFilter, reviewingIncorrect, sessionStats.incorrect]);

  const availableUnits = useMemo(() => {
    const units = Array.from(
      new Set(allWords.map(w => w.unit).filter((u): u is number => typeof u === 'number'))
    );
    units.sort((a, b) => a - b);
    return units;
  }, [allWords]);

  const sessionWords = useMemo((): ExtendedVocabularyItem[] => {
    const batchSize =
      viewMode === 'CARDS' ? settings.flashcard.batchSize : settings.learn.batchSize;
    const shouldShuffle = viewMode === 'CARDS' ? settings.flashcard.random : settings.learn.random;

    const baseWords = shouldShuffle ? shuffleArray([...filteredWords]) : filteredWords;
    return baseWords.slice(0, batchSize);
  }, [
    filteredWords,
    settings.flashcard.batchSize,
    settings.flashcard.random,
    settings.learn.batchSize,
    settings.learn.random,
    viewMode,
  ]);

  const handleSessionComplete = (stats: SessionStats) => {
    setSessionStats(stats);
    setIsSessionComplete(true);

    const duration = Math.round((Date.now() - sessionStartTime) / 60000);
    const itemsStudied = stats.correct.length + stats.incorrect.length;
    logActivity('VOCAB', duration, itemsStudied);
  };

  const handleNewSession = () => {
    setIsSessionComplete(false);
    setSessionStats({ correct: [], incorrect: [] });
    setSessionStartTime(Date.now());
  };

  const handleReviewIncorrect = () => {
    setIsSessionComplete(false);
    setReviewingIncorrect(true);
    setSessionStats({ correct: [], incorrect: [] });
    setSessionStartTime(Date.now());
  };

  const handleSelectViewMode = (mode: LearningMode) => {
    setViewMode(mode);
    setIsSessionComplete(false);
    setReviewingIncorrect(false);
  };

  if (allWords.length === 0) {
    return (
      <div className="text-center p-12 bg-muted rounded-xl border border-border">
        <p className="text-muted-foreground">{labels.noWords}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-card p-6 rounded-xl shadow-sm border border-border">
        <div>
          <h2 className="text-2xl font-bold text-muted-foreground">
            {customWordList ? getCustomListTitle(customListType, labels) : labels.vocabLabel}
          </h2>
          <p className="text-sm text-muted-foreground">
            {filteredWords.length} {labels.term}
          </p>
        </div>
        <Button
          variant="ghost"
          size="auto"
          onClick={() => {
            setShowSettings(true);
          }}
          className="p-2 bg-muted hover:bg-muted rounded-full text-muted-foreground transition-colors"
        >
          <SettingsIcon className="w-5 h-5" />
        </Button>
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {!customWordList && (
          <div className="relative flex-1 lg:flex-none min-w-[200px]">
            <Select
              value={selectedUnitFilter}
              onChange={e => {
                setSelectedUnitFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value));
                setReviewingIncorrect(false);
              }}
              className="w-full appearance-none bg-card border border-border text-muted-foreground py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
            >
              <option value="ALL">{labels.allUnits}</option>
              {availableUnits.map(u => (
                <option key={u} value={u}>
                  {labels.unit} {u}
                </option>
              ))}
            </Select>
            <Filter className="w-4 h-4 text-muted-foreground absolute right-3 top-2.5 pointer-events-none" />
          </div>
        )}

        <div className="bg-muted p-1 rounded-lg flex text-sm font-medium overflow-x-auto w-full lg:w-auto">
          <Button
            variant="ghost"
            size="auto"
            onClick={() => handleSelectViewMode('CARDS')}
            className={`flex-1 lg:flex-none flex items-center justify-center px-4 py-2 rounded-md transition-all whitespace-nowrap ${
              viewMode === 'CARDS'
                ? 'bg-card text-indigo-700 shadow-sm'
                : 'text-muted-foreground hover:text-muted-foreground'
            }`}
          >
            <Layers className="w-4 h-4 mr-2" />
            {labels.flashcards}
          </Button>
          <Button
            variant="ghost"
            size="auto"
            onClick={() => handleSelectViewMode('LEARN')}
            className={`flex-1 lg:flex-none flex items-center justify-center px-4 py-2 rounded-md transition-all whitespace-nowrap ${
              viewMode === 'LEARN'
                ? 'bg-card text-indigo-700 shadow-sm'
                : 'text-muted-foreground hover:text-muted-foreground'
            }`}
          >
            <Brain className="w-4 h-4 mr-2" />
            {labels.learn}
          </Button>
          <Button
            variant="ghost"
            size="auto"
            onClick={() => handleSelectViewMode('LIST')}
            className={`flex-1 lg:flex-none flex items-center justify-center px-4 py-2 rounded-md transition-all whitespace-nowrap ${
              viewMode === 'LIST'
                ? 'bg-card text-indigo-700 shadow-sm'
                : 'text-muted-foreground hover:text-muted-foreground'
            }`}
          >
            <ListIcon className="w-4 h-4 mr-2" />
            {labels.list}
          </Button>
        </div>
      </div>

      {/* Content */}
      {isSessionComplete ? (
        <Suspense fallback={<VocabContentFallback />}>
          <LazySessionSummary
            sessionStats={sessionStats}
            language={language}
            onNewSession={handleNewSession}
            onReviewIncorrect={handleReviewIncorrect}
          />
        </Suspense>
      ) : (
        <>
          {viewMode === 'CARDS' && (
            <Suspense fallback={<VocabContentFallback />}>
              <LazyFlashcardView
                words={sessionWords}
                settings={settings}
                language={language}
                onComplete={handleSessionComplete}
                onSaveWord={onSaveWord}
                onUpdateFlashcardSettings={nextSettings => {
                  void updateGlobalSettings({
                    flashcardAutoTTS: nextSettings.autoTTS,
                    flashcardFront: nextSettings.cardFront,
                    flashcardRatingMode: nextSettings.ratingMode,
                  });
                }}
              />
            </Suspense>
          )}

          {viewMode === 'LEARN' && (
            <Suspense fallback={<VocabContentFallback />}>
              <LazyLearnModeView
                words={sessionWords}
                settings={settings}
                language={language}
                allWords={allWords}
                onComplete={handleSessionComplete}
                onRecordMistake={onRecordMistake}
              />
            </Suspense>
          )}

          {viewMode === 'LIST' && (
            <Suspense fallback={<VocabContentFallback />}>
              <LazyListView words={filteredWords} settings={settings} language={language} />
            </Suspense>
          )}
        </>
      )}

      {/* Settings Modal */}
      {showSettings ? (
        <Suspense fallback={null}>
          <LazyVocabSettingsModal
            isOpen={showSettings}
            settings={settings}
            language={language}
            initialTab={viewMode === 'LEARN' ? 'LEARN' : 'FLASHCARD'}
            onClose={() => setShowSettings(false)}
            onUpdate={newSettings => {
              setLocalSettings(newSettings);
              setIsSessionComplete(false); // Reset session when settings change
              void updateGlobalSettings({
                flashcardAutoTTS: newSettings.flashcard.autoTTS,
                flashcardFront: newSettings.flashcard.cardFront,
                flashcardRatingMode: newSettings.flashcard.ratingMode,
              });
            }}
          />
        </Suspense>
      ) : null}
    </div>
  );
};

export default VocabModule;
