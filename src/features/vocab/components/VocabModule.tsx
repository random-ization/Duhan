import React, { useState, useCallback, useMemo } from 'react';
import { Filter, Layers, Brain, List as ListIcon, Settings as SettingsIcon } from 'lucide-react';
import { CourseSelection, VocabularyItem, Language, TextbookContent } from '../../../types';
import { getLabels } from '../../../utils/i18n';
import { useApp } from '../../../contexts/AppContext';
import FlashcardView from './FlashcardView';
import LearnModeView from './LearnModeView';
import ListView from './ListView';

import VocabSettingsModal from './VocabSettingsModal';
import SessionSummary from './SessionSummary';
import { ExtendedVocabularyItem, VocabSettings, LearningMode, SessionStats } from '../types';
import { shuffleArray } from '../utils';
import { logger } from '../../../utils/logger';

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
  const { logActivity } = useApp();
  const labels = getLabels(language);

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
  const [settings, setSettings] = useState<VocabSettings>({
    flashcard: {
      batchSize: 20,
      random: false,
      cardFront: 'KOREAN',
      autoTTS: true,
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

  const handleSessionComplete = useCallback(
    (stats: SessionStats) => {
      setSessionStats(stats);
      setIsSessionComplete(true);

      // Log activity
      const duration = Math.round((Date.now() - sessionStartTime) / 60000);
      const itemsStudied = stats.correct.length + stats.incorrect.length;
      logActivity('VOCAB', duration, itemsStudied);
    },
    [sessionStartTime, logActivity, setIsSessionComplete]
  );

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

  const getSessionWords = (): ExtendedVocabularyItem[] => {
    const batchSize =
      viewMode === 'CARDS' ? settings.flashcard.batchSize : settings.learn.batchSize;
    const shouldShuffle = viewMode === 'CARDS' ? settings.flashcard.random : settings.learn.random;

    let words = [...filteredWords];
    if (shouldShuffle) {
      words = shuffleArray(words);
    }
    return words.slice(0, batchSize);
  };

  const availableUnits: number[] = Array.from(
    new Set(allWords.map(w => w.unit).filter((u): u is number => typeof u === 'number'))
  );
  availableUnits.sort((a, b) => a - b);

  if (allWords.length === 0) {
    return (
      <div className="text-center p-12 bg-slate-50 rounded-xl border border-slate-200">
        <p className="text-slate-600">{labels.noWords}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            {customWordList ? getCustomListTitle(customListType, labels) : labels.vocabLabel}
          </h2>
          <p className="text-sm text-slate-500">
            {filteredWords.length} {labels.term}
          </p>
        </div>
        <button
          onClick={() => {
            setShowSettings(true);
          }}
          className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"
        >
          <SettingsIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {!customWordList && (
          <div className="relative flex-1 lg:flex-none min-w-[200px]">
            <select
              value={selectedUnitFilter}
              onChange={e => {
                setSelectedUnitFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value));
                setReviewingIncorrect(false);
              }}
              className="w-full appearance-none bg-white border border-slate-300 text-slate-700 py-2 pl-4 pr-10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
            >
              <option value="ALL">{labels.allUnits}</option>
              {availableUnits.map(u => (
                <option key={u} value={u}>
                  {labels.unit} {u}
                </option>
              ))}
            </select>
            <Filter className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
          </div>
        )}

        <div className="bg-slate-100 p-1 rounded-lg flex text-sm font-medium overflow-x-auto w-full lg:w-auto">
          <button
            onClick={() => {
              setViewMode('CARDS');
              setIsSessionComplete(false);
              setReviewingIncorrect(false);
            }}
            className={`flex-1 lg:flex-none flex items-center justify-center px-4 py-2 rounded-md transition-all whitespace-nowrap ${viewMode === 'CARDS'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            <Layers className="w-4 h-4 mr-2" />
            {labels.flashcards}
          </button>
          <button
            onClick={() => {
              setViewMode('LEARN');
              setIsSessionComplete(false);
              setReviewingIncorrect(false);
            }}
            className={`flex-1 lg:flex-none flex items-center justify-center px-4 py-2 rounded-md transition-all whitespace-nowrap ${viewMode === 'LEARN'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            <Brain className="w-4 h-4 mr-2" />
            {labels.learn}
          </button>
          <button
            onClick={() => {
              setViewMode('LIST');
              setIsSessionComplete(false);
              setReviewingIncorrect(false);
            }}
            className={`flex-1 lg:flex-none flex items-center justify-center px-4 py-2 rounded-md transition-all whitespace-nowrap ${viewMode === 'LIST'
              ? 'bg-white text-indigo-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            <ListIcon className="w-4 h-4 mr-2" />
            {labels.list}
          </button>
        </div>
      </div>

      {/* Content */}
      {isSessionComplete ? (
        <SessionSummary
          sessionStats={sessionStats}
          language={language}
          onNewSession={handleNewSession}
          onReviewIncorrect={handleReviewIncorrect}
        />
      ) : (
        <>
          {viewMode === 'CARDS' && (
            <FlashcardView
              words={getSessionWords()}
              settings={settings}
              language={language}
              onComplete={handleSessionComplete}
              onSaveWord={onSaveWord}
            />
          )}

          {viewMode === 'LEARN' && (
            <LearnModeView
              words={getSessionWords()}
              settings={settings}
              language={language}
              allWords={allWords}
              onComplete={handleSessionComplete}
              onRecordMistake={onRecordMistake}
            />
          )}

          {viewMode === 'LIST' && (
            <ListView words={filteredWords} settings={settings} language={language} />
          )}
        </>
      )}

      {/* Settings Modal */}
      <VocabSettingsModal
        isOpen={showSettings}
        settings={settings}
        language={language}
        initialTab={viewMode === 'LEARN' ? 'LEARN' : 'FLASHCARD'}
        onClose={() => setShowSettings(false)}
        onUpdate={newSettings => {
          setSettings(newSettings);
          setIsSessionComplete(false); // Reset session when settings change
        }}
      />
    </div>
  );
};

export default VocabModule;
