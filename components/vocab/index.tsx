import React, { useState, useEffect, useCallback } from 'react';
import {
  Beaker,
  Filter,
  Layers,
  Brain,
  List as ListIcon,
  Settings as SettingsIcon,
} from 'lucide-react';
import { CourseSelection, VocabularyItem, Language, TextbookContent } from '../../types';
import { getLabels } from '../../utils/i18n';
import { useApp } from '../../contexts/AppContext';
// import { getMockVocabulary } from '../../services/geminiService';
import FlashcardView from './FlashcardView';
import LearnModeView from './LearnModeView';
import ListView from './ListView';

// Stub
const getMockVocabulary = async () => [];
import VocabSettingsModal from './VocabSettingsModal';
import SessionSummary from './SessionSummary';
import { ExtendedVocabularyItem, VocabSettings, LearningMode, SessionStats } from './types';
import { shuffleArray } from './utils';

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
  course,
  instituteName,
  language,
  levelContexts,
  customWordList,
  customListType,
  onRecordMistake,
  onSaveWord,
}) => {
  const { logActivity } = useApp();
  const labels = getLabels(language);

  // Data State
  const [allWords, setAllWords] = useState<ExtendedVocabularyItem[]>([]);
  const [filteredWords, setFilteredWords] = useState<ExtendedVocabularyItem[]>([]);
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<number | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);

  // View State
  const [viewMode, setViewMode] = useState<LearningMode>('CARDS');
  const [showSettings, setShowSettings] = useState(false);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [sessionStats, setSessionStats] = useState<SessionStats>({ correct: [], incorrect: [] });
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());

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

  // Parse and combine words
  const parseAndCombineWords = useCallback(() => {
    setLoading(true);
    const combined: ExtendedVocabularyItem[] = [];

    if (customWordList && customWordList.length > 0) {
      // Use provided custom list
      customWordList.forEach((item, idx) => {
        combined.push({ ...item, unit: item.unit || 0, id: `custom-${idx}` });
      });
    } else {
      // Parse from context
      Object.keys(levelContexts).forEach(unitStr => {
        const unit = parseInt(unitStr);
        const content = levelContexts[unit];
        if (content && content.vocabularyList && content.vocabularyList.startsWith('[')) {
          try {
            const parsed: VocabularyItem[] = JSON.parse(content.vocabularyList);
            parsed.forEach((item, idx) => {
              combined.push({ ...item, unit, id: `${unit}-${idx}` });
            });
          } catch (e) {
            console.warn(`Failed to parse vocab for unit ${unit}`, e);
          }
        }
      });
    }

    setAllWords(combined);
    setLoading(false);
  }, [levelContexts, customWordList]);

  useEffect(() => {
    parseAndCombineWords();
  }, [parseAndCombineWords]);

  // Handle filtering
  useEffect(() => {
    let filtered = allWords;
    if (selectedUnitFilter !== 'ALL') {
      filtered = allWords.filter(w => w.unit === selectedUnitFilter);
    }
    setFilteredWords(filtered);
  }, [allWords, selectedUnitFilter]);

  const loadMockData = async () => {
    setLoading(true);
    try {
      const mockWords = await getMockVocabulary();
      const extended: ExtendedVocabularyItem[] = mockWords.map((item, idx) => ({
        ...item,
        unit: Math.floor(idx / 20) + 1,
        id: `mock-${idx}`,
      }));
      setAllWords(extended);
    } catch (error) {
      console.error('Failed to load mock data:', error);
    }
    setLoading(false);
  };

  const handleSessionComplete = useCallback(
    (stats: SessionStats) => {
      setSessionStats(stats);
      setIsSessionComplete(true);

      // Log activity
      const duration = Math.round((Date.now() - sessionStartTime) / 60000);
      const itemsStudied = stats.correct.length + stats.incorrect.length;
      logActivity('VOCAB', duration, itemsStudied);
    },
    [sessionStartTime, logActivity]
  );

  const handleNewSession = () => {
    setIsSessionComplete(false);
    setSessionStats({ correct: [], incorrect: [] });
    setSessionStartTime(Date.now());
  };

  const handleReviewIncorrect = () => {
    setIsSessionComplete(false);
    setFilteredWords(sessionStats.incorrect);
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-slate-500">{labels.loadingVocab}</p>
      </div>
    );
  }

  const availableUnits: number[] = Array.from(new Set(allWords.map(w => w.unit).filter((u): u is number => typeof u === 'number')));
  availableUnits.sort((a, b) => a - b);

  if (allWords.length === 0) {
    return (
      <div className="text-center p-12 bg-slate-50 rounded-xl border border-slate-200">
        <p className="text-slate-600 mb-6">{labels.noWords}</p>
        <button
          onClick={loadMockData}
          className="inline-flex items-center px-6 py-3 border border-indigo-200 shadow-sm text-base font-medium rounded-md text-indigo-700 bg-white hover:bg-indigo-50"
        >
          <Beaker className="w-5 h-5 mr-2" />
          {labels.loadMockData}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            {customWordList
              ? customListType === 'SAVED'
                ? labels.vocabBook
                : labels.mistakeBook
              : labels.vocabLabel}
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
              onChange={e =>
                setSelectedUnitFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
              }
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
