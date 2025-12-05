import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { getMockVocabulary } from '../services/geminiService';
import { CourseSelection, VocabularyItem, Language, TextbookContent } from '../types';
import {
  RefreshCw,
  Volume2,
  RotateCcw,
  Brain,
  Layers,
  List as ListIcon,
  Check,
  X,
  Beaker,
  Filter,
  Eye,
  EyeOff,
  XCircle,
  CheckCircle,
  Play,
  Settings as SettingsIcon,
  Pencil,
  Keyboard,
  Shuffle,
  AlignLeft,
  MoveRight,
  MoveLeft,
  Hand,
  Trophy,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { getLabels } from '../utils/i18n';
import { useApp } from '../contexts/AppContext';

interface VocabModuleProps {
  course: CourseSelection;
  instituteName: string;
  language: Language;
  levelContexts: Record<number, TextbookContent>;
  customWordList?: VocabularyItem[]; // For saved words or mistakes
  customListType?: 'SAVED' | 'MISTAKES';
  onRecordMistake?: (word: VocabularyItem) => void;
  onSaveWord?: (word: VocabularyItem) => void; // "Don't know" in flashcards adds to saved
}

type LearningMode = 'CARDS' | 'LEARN' | 'LIST';

interface ExtendedVocabularyItem extends VocabularyItem {
  unit: number;
  id: string; // Unique ID for tracking
}

// Configuration Types
interface VocabSettings {
  flashcard: {
    batchSize: number;
    random: boolean;
    cardFront: 'KOREAN' | 'NATIVE';
    autoTTS: boolean;
  };
  learn: {
    batchSize: number;
    random: boolean;
    types: {
      multipleChoice: boolean;
      writing: boolean;
    };
    answers: {
      korean: boolean; // Means Answer is Korean (Prompt is Native)
      native: boolean; // Means Answer is Native (Prompt is Korean)
    };
  };
}

// Question Type for Learn Mode
type QuestionType = 'CHOICE_K_TO_N' | 'CHOICE_N_TO_K' | 'WRITING_N_TO_K' | 'WRITING_K_TO_N';

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

  // Helper to calculate session duration in minutes
  const getSessionDuration = useCallback((startTime: number) => {
    return Math.round((Date.now() - startTime) / 60000);
  }, []);

  // --- Data State ---
  const [allWords, setAllWords] = useState<ExtendedVocabularyItem[]>([]);
  const [filteredWords, setFilteredWords] = useState<ExtendedVocabularyItem[]>([]);
  const [selectedUnitFilter, setSelectedUnitFilter] = useState<number | 'ALL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());

  // --- View State ---
  const [viewMode, setViewMode] = useState<LearningMode>('CARDS');
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'FLASHCARD' | 'LEARN'>('FLASHCARD');

  // Default Settings
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

  // --- Session State (Shared) ---
  const [sessionStats, setSessionStats] = useState<{
    correct: ExtendedVocabularyItem[];
    incorrect: ExtendedVocabularyItem[];
  }>({ correct: [], incorrect: [] });
  const [isSessionComplete, setIsSessionComplete] = useState(false);

  // --- Flashcard State ---
  const [cardIndex, setCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardQueue, setCardQueue] = useState<ExtendedVocabularyItem[]>([]);

  // Drag State
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // --- Learn Mode State ---
  const [learnQueue, setLearnQueue] = useState<ExtendedVocabularyItem[]>([]);
  const [currentLearnItem, setCurrentLearnItem] = useState<ExtendedVocabularyItem | null>(null);

  // Learn - Question State
  const [currentQuestionType, setCurrentQuestionType] = useState<QuestionType>('CHOICE_K_TO_N');
  const [quizOptions, setQuizOptions] = useState<ExtendedVocabularyItem[]>([]);
  const [quizState, setQuizState] = useState<'QUESTION' | 'CORRECT' | 'WRONG'>('QUESTION');
  const [selectedOptionIdx, setSelectedOptionIdx] = useState<number | null>(null);
  const [writingInput, setWritingInput] = useState('');
  const [showWritingAnswer, setShowWritingAnswer] = useState(false);

  // --- List Mode State ---
  const [revealedListItems, setRevealedListItems] = useState<Set<string>>(new Set());

  // --- Refs ---
  const writingInputRef = useRef<HTMLInputElement>(null);

  // --- Common Helpers ---
  const labels = getLabels(language);
  const speak = (text: string) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR';
    u.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  const getPosStyle = (pos: string | undefined) => {
    if (!pos) return 'hidden';
    const lower = pos.toLowerCase();

    // Verbs (Red/Pink)
    if (lower.includes('动') || lower.includes('verb')) return 'bg-red-100 text-red-700';

    // Nouns/Pronouns (Blue)
    if (
      lower.includes('名') ||
      lower.includes('noun') ||
      lower.includes('代') ||
      lower.includes('pronoun')
    )
      return 'bg-blue-100 text-blue-700';

    // Adjectives (Green)
    if (lower.includes('形') || lower.includes('adj')) return 'bg-green-100 text-green-700';

    // Adverbs (Amber)
    if (lower.includes('副') || lower.includes('adv')) return 'bg-amber-100 text-amber-800';

    // Others (Gray)
    return 'bg-slate-100 text-slate-600';
  };

  // --- Initialization ---
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

  // Handle Filtering
  useEffect(() => {
    let filtered = allWords;
    if (selectedUnitFilter !== 'ALL') {
      filtered = allWords.filter(w => w.unit === selectedUnitFilter);
    }
    setFilteredWords(filtered);

    // Initialize Flashcards
    initializeCardQueue(filtered);
  }, [allWords, selectedUnitFilter]);

  // Whenever Flashcard settings change (that affect queue), re-init
  useEffect(() => {
    initializeCardQueue(filteredWords);
  }, [settings.flashcard.batchSize, settings.flashcard.random]);

  const initializeCardQueue = (words: ExtendedVocabularyItem[]) => {
    let queue = [...words];
    if (settings.flashcard.random) {
      queue.sort(() => 0.5 - Math.random());
    }
    // Apply batch size
    queue = queue.slice(0, settings.flashcard.batchSize);
    setCardQueue(queue);
    setCardIndex(0);
    setIsFlipped(false);
    setSessionStats({ correct: [], incorrect: [] });
    setIsSessionComplete(false);
    setSessionStartTime(Date.now()); // Reset session timer
    resetDrag();
  };

  const resetLearnSession = (words: ExtendedVocabularyItem[]) => {
    let queue = [...words];
    if (settings.learn.random) {
      queue.sort(() => 0.5 - Math.random());
    }
    // Apply batch size
    queue = queue.slice(0, settings.learn.batchSize);

    setLearnQueue(queue);
    setSessionStats({ correct: [], incorrect: [] });
    setIsSessionComplete(false);
    setSessionStartTime(Date.now()); // Reset session timer
    setQuizState('QUESTION');
    setSelectedOptionIdx(null);
    setWritingInput('');
    setShowWritingAnswer(false);

    if (queue.length > 0) prepareNextQuestion(queue[0], words);
  };

  const loadMockData = () => {
    const mock = getMockVocabulary(language);
    const extendedMock = mock.map((m, i) => ({ ...m, unit: 1, id: `mock-${i}` }));
    setAllWords(extendedMock);
  };

  // --- Question Generation Logic ---
  const determineQuestionType = (): QuestionType => {
    const { types, answers } = settings.learn;
    const possibleTypes: QuestionType[] = [];

    if (answers.korean) {
      if (types.multipleChoice) possibleTypes.push('CHOICE_N_TO_K');
      if (types.writing) possibleTypes.push('WRITING_N_TO_K');
    }

    if (answers.native) {
      if (types.multipleChoice) possibleTypes.push('CHOICE_K_TO_N');
      if (types.writing) possibleTypes.push('WRITING_K_TO_N');
    }

    if (possibleTypes.length === 0) return 'CHOICE_K_TO_N';

    return possibleTypes[Math.floor(Math.random() * possibleTypes.length)];
  };

  const prepareNextQuestion = (target: ExtendedVocabularyItem, pool: ExtendedVocabularyItem[]) => {
    setCurrentLearnItem(target);
    const qType = determineQuestionType();
    setCurrentQuestionType(qType);

    setQuizState('QUESTION');
    setSelectedOptionIdx(null);
    setWritingInput('');
    setShowWritingAnswer(false);

    if (qType.startsWith('WRITING')) {
      setTimeout(() => writingInputRef.current?.focus(), 100);
      if (qType === 'WRITING_K_TO_N' && settings.flashcard.autoTTS) {
        speak(target.korean);
      }
    } else {
      // Prepare Distractors
      const distractors = pool.filter(w => w.id !== target.id);
      const shuffledDistractors = [...distractors].sort(() => 0.5 - Math.random()).slice(0, 3);
      const options = [...shuffledDistractors, target].sort(() => 0.5 - Math.random());
      setQuizOptions(options);

      if (qType === 'CHOICE_K_TO_N' && settings.flashcard.autoTTS) {
        speak(target.korean);
      }
    }
  };

  // --- Handlers ---

  const handleLearnOptionClick = (option: ExtendedVocabularyItem, idx: number) => {
    if (quizState !== 'QUESTION' || !currentLearnItem) return;

    setSelectedOptionIdx(idx);
    const isCorrect = option.id === currentLearnItem.id;

    if (settings.flashcard.autoTTS) speak(currentLearnItem.korean);

    if (isCorrect) {
      setQuizState('CORRECT');
      setSessionStats(prev => ({ ...prev, correct: [...prev.correct, currentLearnItem] }));
    } else {
      setQuizState('WRONG');
      setSessionStats(prev => ({ ...prev, incorrect: [...prev.incorrect, currentLearnItem] }));
      if (onRecordMistake) onRecordMistake(currentLearnItem);
    }

    const delay = isCorrect ? 800 : 2500;
    setTimeout(advanceLearnQueue, delay);
  };

  const handleWritingSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (quizState !== 'QUESTION' || !currentLearnItem) return;

    const input = writingInput.trim().replace(/\s+/g, '').toLowerCase();

    let correct = '';
    if (currentQuestionType === 'WRITING_N_TO_K')
      correct = currentLearnItem.korean.replace(/\s+/g, '');
    else correct = currentLearnItem.english.replace(/\s+/g, '').toLowerCase();

    if (settings.flashcard.autoTTS) speak(currentLearnItem.korean);

    const isCorrect =
      input === correct ||
      (currentQuestionType === 'WRITING_K_TO_N' &&
        currentLearnItem.english.toLowerCase().includes(input));

    if (isCorrect) {
      setQuizState('CORRECT');
      setSessionStats(prev => ({ ...prev, correct: [...prev.correct, currentLearnItem] }));
      setTimeout(advanceLearnQueue, 800);
    } else {
      setQuizState('WRONG');
      setShowWritingAnswer(true);
      setSessionStats(prev => ({ ...prev, incorrect: [...prev.incorrect, currentLearnItem] }));
      if (onRecordMistake) onRecordMistake(currentLearnItem);
    }
  };

  const handleWritingContinue = () => {
    advanceLearnQueue();
  };

  const advanceLearnQueue = () => {
    setLearnQueue(prev => {
      const remaining = prev.slice(1);
      if (remaining.length === 0) {
        setIsSessionComplete(true);
        // Log vocabulary learning activity - add 1 for current item
        const totalItems = sessionStats.correct.length + sessionStats.incorrect.length + 1;
        logActivity('VOCAB', getSessionDuration(sessionStartTime), totalItems);
        return [];
      }
      prepareNextQuestion(remaining[0], filteredWords.length >= 4 ? filteredWords : allWords);
      return remaining;
    });
  };

  const restartIncorrect = () => {
    const incorrectWords = sessionStats.incorrect;
    if (incorrectWords.length > 0) {
      if (viewMode === 'CARDS') {
        setCardQueue(incorrectWords);
        setCardIndex(0);
        setSessionStats({ correct: [], incorrect: [] });
        setIsSessionComplete(false);
        setIsFlipped(false);
      } else {
        resetLearnSession(incorrectWords);
      }
    }
  };

  // --- Flashcard Logic ---

  // NOTE: handleCardRate is used by both click buttons and keyboard/gestures
  const handleCardRate = useCallback(
    (known: boolean) => {
      const current = cardQueue[cardIndex];
      if (!current) return;

      if (!known) {
        if (onSaveWord) onSaveWord(current);
        setSessionStats(prev => ({ ...prev, incorrect: [...prev.incorrect, current] }));
      } else {
        setSessionStats(prev => ({ ...prev, correct: [...prev.correct, current] }));
      }

      setIsFlipped(false);
      // Reset drag styles immediately
      setDragOffset({ x: 0, y: 0 });

      if (cardIndex < cardQueue.length - 1) {
        // Add a small delay for animation continuity if needed,
        // but for snappy feel we move immediately or with very short delay
        setTimeout(() => setCardIndex(prev => prev + 1), 150);
      } else {
        setIsSessionComplete(true);
        // Log vocabulary flashcard activity
        logActivity('VOCAB', getSessionDuration(sessionStartTime), cardQueue.length);
      }
    },
    [cardIndex, cardQueue, onSaveWord, sessionStartTime, logActivity, getSessionDuration]
  );

  // --- Flashcard Gestures & Keyboard ---

  const resetDrag = () => {
    setDragStart(null);
    setDragOffset({ x: 0, y: 0 });
    setIsDragging(false);
  };

  // Keyboard Support
  useEffect(() => {
    if (viewMode === 'CARDS' && !isSessionComplete) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft') handleCardRate(false);
        if (e.key === 'ArrowRight') handleCardRate(true);
        if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowDown')
          setIsFlipped(prev => !prev);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [viewMode, isSessionComplete, handleCardRate]);

  // Touch/Mouse Handlers
  const handleDragStart = (clientX: number, clientY: number) => {
    setDragStart({ x: clientX, y: clientY });
    setIsDragging(true);
  };

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDragging || !dragStart) return;
    setDragOffset({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y,
    });
  };

  const handleDragEnd = () => {
    if (!isDragging) return;

    const threshold = 100; // px to trigger swipe
    if (dragOffset.x > threshold) {
      handleCardRate(true); // Swipe Right -> Know
    } else if (dragOffset.x < -threshold) {
      handleCardRate(false); // Swipe Left -> Don't Know
    } else {
      // Reset if threshold not met
      setDragOffset({ x: 0, y: 0 });
    }
    setIsDragging(false);
    setDragStart(null);
  };

  // --- List Logic ---
  const toggleListReveal = (id: string, textToSpeak: string) => {
    setRevealedListItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
        if (settings.flashcard.autoTTS) speak(textToSpeak);
      }
      return newSet;
    });
  };

  // --- Settings Logic ---
  const toggleLearnType = (type: 'multipleChoice' | 'writing') => {
    setSettings(prev => {
      const newTypes = { ...prev.learn.types, [type]: !prev.learn.types[type] };
      if (!newTypes.multipleChoice && !newTypes.writing) return prev;
      return { ...prev, learn: { ...prev.learn, types: newTypes } };
    });
  };

  const toggleLearnAnswer = (lang: 'korean' | 'native') => {
    setSettings(prev => {
      const newAnswers = { ...prev.learn.answers, [lang]: !prev.learn.answers[lang] };
      if (!newAnswers.korean && !newAnswers.native) return prev;
      return { ...prev, learn: { ...prev.learn, answers: newAnswers } };
    });
  };

  // --- Switch Component Helper ---
  const Switch = ({
    checked,
    onChange,
    label,
  }: {
    checked: boolean;
    onChange: () => void;
    label?: string;
  }) => (
    <div className="flex items-center justify-between py-3">
      {label && <span className="text-sm font-medium text-slate-700">{label}</span>}
      <button
        onClick={onChange}
        className={`w-12 h-7 flex items-center rounded-full transition-colors duration-200 focus:outline-none ${checked ? 'bg-indigo-600' : 'bg-slate-300'}`}
      >
        <div
          className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-200 ${checked ? 'translate-x-6' : 'translate-x-1'}`}
        />
      </button>
    </div>
  );

  // --- Settings UI ---
  const renderSettingsModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-lg text-slate-800 flex items-center">
            <SettingsIcon className="w-5 h-5 mr-2 text-indigo-600" />
            {labels.settings}
          </h3>
          <button
            onClick={() => setShowSettings(false)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setSettingsTab('FLASHCARD')}
            className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors ${settingsTab === 'FLASHCARD' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {labels.flashcards}
          </button>
          <button
            onClick={() => setSettingsTab('LEARN')}
            className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-colors ${settingsTab === 'LEARN' ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {labels.learn}
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {settingsTab === 'FLASHCARD' && (
            <div className="space-y-6">
              {/* Flashcard Specific */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                  {labels.flashcards}
                </label>

                <Switch
                  label={labels.shuffle}
                  checked={settings.flashcard.random}
                  onChange={() =>
                    setSettings(s => ({
                      ...s,
                      flashcard: { ...s.flashcard, random: !s.flashcard.random },
                    }))
                  }
                />
                <Switch
                  label={labels.autoTTS}
                  checked={settings.flashcard.autoTTS}
                  onChange={() =>
                    setSettings(s => ({
                      ...s,
                      flashcard: { ...s.flashcard, autoTTS: !s.flashcard.autoTTS },
                    }))
                  }
                />

                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-700">{labels.cardFront}</span>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button
                        onClick={() =>
                          setSettings(s => ({
                            ...s,
                            flashcard: { ...s.flashcard, cardFront: 'KOREAN' },
                          }))
                        }
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${settings.flashcard.cardFront === 'KOREAN' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                      >
                        {labels.korean}
                      </button>
                      <button
                        onClick={() =>
                          setSettings(s => ({
                            ...s,
                            flashcard: { ...s.flashcard, cardFront: 'NATIVE' },
                          }))
                        }
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${settings.flashcard.cardFront === 'NATIVE' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                      >
                        {labels.native}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {labels.batchSize}
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="5"
                    value={settings.flashcard.batchSize}
                    onChange={e =>
                      setSettings(s => ({
                        ...s,
                        flashcard: { ...s.flashcard, batchSize: parseInt(e.target.value) },
                      }))
                    }
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>5</span>
                    <span className="font-bold text-indigo-600">
                      {settings.flashcard.batchSize}
                    </span>
                    <span>50</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {settingsTab === 'LEARN' && (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                  {labels.learn}
                </label>

                <Switch
                  label={labels.shuffle}
                  checked={settings.learn.random}
                  onChange={() =>
                    setSettings(s => ({ ...s, learn: { ...s.learn, random: !s.learn.random } }))
                  }
                />

                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {labels.batchSize}
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="5"
                    value={settings.learn.batchSize}
                    onChange={e =>
                      setSettings(s => ({
                        ...s,
                        learn: { ...s.learn, batchSize: parseInt(e.target.value) },
                      }))
                    }
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>5</span>
                    <span className="font-bold text-indigo-600">{settings.learn.batchSize}</span>
                    <span>50</span>
                  </div>
                </div>
              </div>

              <hr className="border-slate-100" />

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                  {labels.questionTypes}
                </label>
                <Switch
                  label={labels.multipleChoice}
                  checked={settings.learn.types.multipleChoice}
                  onChange={() => toggleLearnType('multipleChoice')}
                />
                <Switch
                  label={labels.writtenQuestion}
                  checked={settings.learn.types.writing}
                  onChange={() => toggleLearnType('writing')}
                />
              </div>

              <hr className="border-slate-100" />

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                  {labels.answers}
                </label>
                <Switch
                  label={labels.korean}
                  checked={settings.learn.answers.korean}
                  onChange={() => toggleLearnAnswer('korean')}
                />
                <Switch
                  label={labels.native}
                  checked={settings.learn.answers.native}
                  onChange={() => toggleLearnAnswer('native')}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100">
          <button
            onClick={() => {
              setShowSettings(false);
              if (viewMode === 'LEARN') resetLearnSession(filteredWords);
              if (viewMode === 'CARDS') initializeCardQueue(filteredWords);
            }}
            className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
          >
            {labels.done}
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-slate-500">{labels.loadingVocab}</p>
      </div>
    );
  }

  const availableUnits = Array.from(new Set(allWords.map(w => w.unit))).sort((a, b) => a - b);

  if (allWords.length === 0) {
    return (
      <div className="text-center p-12 bg-slate-50 rounded-xl border border-slate-200">
        <p className="text-slate-600 mb-6">{labels.noWords}</p>
        <button
          onClick={loadMockData}
          className="inline-flex items-center px-6 py-3 border border-indigo-200 shadow-sm text-base font-medium rounded-md text-indigo-700 bg-white hover:bg-indigo-50"
        >
          <Beaker className="w-5 h-5 mr-2" />
          {labels.loadMock}
        </button>
      </div>
    );
  }

  // --- Render ---
  const currentCard = cardQueue[cardIndex];

  // Calculate Progress for Learn Mode
  const answeredCount = sessionStats.correct.length + sessionStats.incorrect.length;
  // Total logic differs slightly between modes
  const totalCount = viewMode === 'CARDS' ? cardQueue.length : answeredCount + learnQueue.length;
  const progressPercent = totalCount > 0 ? (answeredCount / totalCount) * 100 : 0;

  // --- SESSION COMPLETE SUMMARY ---
  if (isSessionComplete) {
    return (
      <div className="max-w-4xl mx-auto w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 border-b-4 border-indigo-500 animate-in zoom-in-95">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-10 h-10" />
            </div>
            <h3 className="text-3xl font-bold text-slate-800 mb-2">{labels.sessionComplete}</h3>
            <p className="text-slate-500">{labels.sessionSummary}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Incorrect List */}
            <div className="bg-red-50 rounded-xl p-6">
              <div className="flex items-center mb-4 text-red-700 font-bold">
                <XCircle className="w-5 h-5 mr-2" />
                {labels.incorrect} ({sessionStats.incorrect.length})
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {sessionStats.incorrect.length === 0 ? (
                  <p className="text-sm text-red-400 italic">{labels.noneGreatJob}</p>
                ) : (
                  sessionStats.incorrect.map((w, i) => (
                    <div
                      key={i}
                      className="flex justify-between bg-white p-3 rounded-lg border border-red-100 text-sm"
                    >
                      <span className="font-bold">{w.korean}</span>
                      <span className="text-slate-600 truncate max-w-[50%]">{w.english}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Correct List */}
            <div className="bg-emerald-50 rounded-xl p-6">
              <div className="flex items-center mb-4 text-emerald-700 font-bold">
                <CheckCircle className="w-5 h-5 mr-2" />
                {labels.correct} ({sessionStats.correct.length})
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {sessionStats.correct.map((w, i) => (
                  <div
                    key={i}
                    className="flex justify-between bg-white p-3 rounded-lg border border-emerald-100 text-sm"
                  >
                    <span className="font-bold">{w.korean}</span>
                    <span className="text-slate-600 truncate max-w-[50%]">{w.english}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <button
              onClick={() => {
                if (viewMode === 'CARDS') initializeCardQueue(filteredWords);
                else resetLearnSession(filteredWords);
              }}
              className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center shadow-lg shadow-indigo-200"
            >
              {labels.newSession} <ChevronRight className="w-5 h-5 ml-2" />
            </button>
            {sessionStats.incorrect.length > 0 && (
              <button
                onClick={restartIncorrect}
                className="flex-1 py-4 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
              >
                {labels.reviewIncorrect}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN RENDER ---
  return (
    <div className="w-full max-w-[1920px] mx-auto">
      {showSettings && renderSettingsModal()}

      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {customWordList
                ? customListType === 'SAVED'
                  ? labels.vocabBook
                  : labels.mistakeBook
                : labels.vocab}
            </h2>
            <p className="text-sm text-slate-500">
              {filteredWords.length} {labels.term}
            </p>
          </div>
          <button
            onClick={() => {
              setShowSettings(true);
              if (viewMode === 'LEARN') setSettingsTab('LEARN');
              else setSettingsTab('FLASHCARD');
            }}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
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
                initializeCardQueue(filteredWords);
              }}
              className={`flex-1 lg:flex-none flex items-center justify-center px-4 py-2 rounded-md transition-all whitespace-nowrap ${viewMode === 'CARDS' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Layers className="w-4 h-4 mr-2" />
              {labels.flashcards}
            </button>
            <button
              onClick={() => {
                setViewMode('LEARN');
                resetLearnSession(filteredWords);
              }}
              className={`flex-1 lg:flex-none flex items-center justify-center px-4 py-2 rounded-md transition-all whitespace-nowrap ${viewMode === 'LEARN' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Brain className="w-4 h-4 mr-2" />
              {labels.learn}
            </button>
            <button
              onClick={() => setViewMode('LIST')}
              className={`flex-1 lg:flex-none flex items-center justify-center px-4 py-2 rounded-md transition-all whitespace-nowrap ${viewMode === 'LIST' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <ListIcon className="w-4 h-4 mr-2" />
              {labels.list}
            </button>
          </div>
        </div>
      </div>

      {/* --- FLASHCARD MODE --- */}
      {viewMode === 'CARDS' && currentCard && (
        <div className="flex flex-col items-center">
          {/* Keyboard Hint */}
          <div className="hidden md:flex gap-8 text-xs font-bold text-slate-400 mb-4 uppercase tracking-widest">
            <span className="flex items-center">
              <Keyboard className="w-3 h-3 mr-1" /> {labels.keyLeft}
            </span>
            <span className="flex items-center">
              <Keyboard className="w-3 h-3 mr-1" /> {labels.keySpace}
            </span>
            <span className="flex items-center">
              <Keyboard className="w-3 h-3 mr-1" /> {labels.keyRight}
            </span>
          </div>

          <div
            className="perspective-1000 w-full max-w-2xl h-96 relative cursor-pointer group mb-8 select-none touch-none"
            onClick={() => !isDragging && setIsFlipped(!isFlipped)}
            onMouseDown={e => handleDragStart(e.clientX, e.clientY)}
            onMouseMove={e => handleDragMove(e.clientX, e.clientY)}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onTouchStart={e => handleDragStart(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchMove={e => handleDragMove(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchEnd={handleDragEnd}
            ref={cardRef}
          >
            <div
              className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}
              style={{
                transform: isDragging
                  ? `translateX(${dragOffset.x}px) rotate(${dragOffset.x * 0.05}deg) ${isFlipped ? 'rotateY(180deg)' : ''}`
                  : undefined,
                transition: isDragging ? 'none' : 'transform 0.5s',
              }}
            >
              {/* Drag Overlays */}
              {isDragging && dragOffset.x > 50 && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-emerald-500/20 rounded-2xl border-4 border-emerald-500">
                  <CheckCircle className="w-32 h-32 text-emerald-600 opacity-50" />
                </div>
              )}
              {isDragging && dragOffset.x < -50 && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-red-500/20 rounded-2xl border-4 border-red-500">
                  <XCircle className="w-32 h-32 text-red-600 opacity-50" />
                </div>
              )}

              {/* Front */}
              <div className="absolute w-full h-full backface-hidden bg-white rounded-2xl shadow-xl border-b-4 border-indigo-100 flex flex-col items-center justify-center p-8 text-center">
                <div className="absolute top-6 left-6 text-slate-400 text-xs font-bold uppercase tracking-widest bg-slate-100 px-2 py-1 rounded">
                  {labels.unit} {currentCard.unit}
                </div>

                {settings.flashcard.cardFront === 'KOREAN' ? (
                  <>
                    <h3 className="text-5xl font-bold text-slate-900 leading-tight mb-6">
                      {currentCard.korean}
                    </h3>
                    <div
                      className="p-3 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
                      onClick={e => {
                        e.stopPropagation();
                        speak(currentCard.korean);
                      }}
                      onMouseDown={e => e.stopPropagation()} // Prevent drag
                    >
                      <Volume2 className="w-6 h-6" />
                    </div>
                  </>
                ) : (
                  <h3 className="text-4xl font-medium text-slate-800 leading-tight">
                    {currentCard.english}
                  </h3>
                )}

                <div className="absolute bottom-8 text-slate-400 text-sm font-medium flex items-center gap-2">
                  <Hand className="w-4 h-4" />
                  {labels.clickToFlip}
                </div>
              </div>

              {/* Back */}
              <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-white rounded-2xl shadow-xl border-b-4 border-emerald-100 flex flex-col items-center justify-center p-8 text-center">
                {settings.flashcard.cardFront === 'KOREAN' ? (
                  <>
                    <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">
                      {labels.definition}
                    </div>
                    <p className="text-3xl font-medium text-indigo-600 mb-6">
                      {currentCard.english}
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-5xl font-bold text-indigo-600 mb-4">
                      {currentCard.korean}
                    </h3>
                    <div
                      className="mb-6 p-2 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 inline-block"
                      onClick={e => {
                        e.stopPropagation();
                        speak(currentCard.korean);
                      }}
                      onMouseDown={e => e.stopPropagation()}
                    >
                      <Volume2 className="w-5 h-5" />
                    </div>
                  </>
                )}

                {currentCard.exampleSentence && (
                  <div className="bg-slate-50 p-4 rounded-lg w-full max-w-lg">
                    <p className="text-slate-800 text-lg mb-1">{currentCard.exampleSentence}</p>
                    {currentCard.exampleTranslation && (
                      <p className="text-slate-500 text-sm">{currentCard.exampleTranslation}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Flashcard Controls (X / O) */}
          <div className="flex gap-6 w-full max-w-sm justify-center">
            <button
              onClick={() => handleCardRate(false)}
              className="flex-1 flex flex-col items-center justify-center py-4 bg-white border border-red-100 rounded-xl shadow-sm hover:bg-red-50 hover:border-red-200 transition-all group active:scale-95"
            >
              <XCircle className="w-8 h-8 text-red-400 group-hover:text-red-500 mb-2" />
              <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
                {labels.donTKnow}
              </span>
            </button>
            <button
              onClick={() => handleCardRate(true)}
              className="flex-1 flex flex-col items-center justify-center py-4 bg-white border border-emerald-100 rounded-xl shadow-sm hover:bg-emerald-50 hover:border-emerald-200 transition-all group active:scale-95"
            >
              <CheckCircle className="w-8 h-8 text-emerald-400 group-hover:text-emerald-500 mb-2" />
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                {labels.know}
              </span>
            </button>
          </div>

          <div className="mt-4 text-slate-400 text-sm font-medium">
            {cardIndex + 1} / {cardQueue.length}
          </div>
        </div>
      )}

      {/* --- LEARN MODE --- */}
      {viewMode === 'LEARN' && currentLearnItem && (
        <div className="w-full max-w-4xl mx-auto">
          <div className="flex flex-col gap-6">
            {/* Progress Bar */}
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className="bg-indigo-500 h-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Question Card */}
            <div className="bg-[#E4DBCF] rounded-2xl p-8 min-h-[500px] flex flex-col relative shadow-sm">
              {/* Question Prompt */}
              <div className="flex-1 flex flex-col items-center justify-center mb-8">
                <div className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                  {currentQuestionType.startsWith('WRITING') ? (
                    <Pencil className="w-4 h-4" />
                  ) : (
                    <AlignLeft className="w-4 h-4" />
                  )}
                  {currentQuestionType.startsWith('WRITING')
                    ? labels.writingMode
                    : labels.multipleChoice}
                </div>

                <h3 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-4 text-center">
                  {/* If Prompt is Korean */}
                  {currentQuestionType === 'CHOICE_K_TO_N' ||
                  currentQuestionType === 'WRITING_K_TO_N'
                    ? currentLearnItem.korean
                    : currentLearnItem.english}
                </h3>

                {/* Audio button if prompt is Korean */}
                {(currentQuestionType === 'CHOICE_K_TO_N' ||
                  currentQuestionType === 'WRITING_K_TO_N' ||
                  settings.flashcard.autoTTS) && (
                  <button
                    className="p-2 rounded-full bg-white/50 hover:bg-white text-slate-700 transition-colors"
                    onClick={() => speak(currentLearnItem.korean)}
                  >
                    <Volume2 className="w-6 h-6" />
                  </button>
                )}
              </div>

              {/* Options / Input Area */}
              <div className="flex-1 flex flex-col justify-end">
                {currentQuestionType.startsWith('CHOICE') ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {quizOptions.map((option, idx) => {
                      let stateClass =
                        'border-transparent bg-white hover:border-indigo-300 hover:bg-indigo-50';
                      if (quizState !== 'QUESTION') {
                        if (option.id === currentLearnItem.id)
                          stateClass =
                            'border-emerald-500 bg-emerald-50 text-emerald-700 font-bold ring-1 ring-emerald-500';
                        else if (selectedOptionIdx === idx)
                          stateClass = 'border-red-500 bg-red-50 text-red-700 opacity-60';
                        else stateClass = 'opacity-40 bg-slate-50';
                      }

                      return (
                        <button
                          key={idx}
                          disabled={quizState !== 'QUESTION'}
                          onClick={() => handleLearnOptionClick(option, idx)}
                          className={`p-4 rounded-xl border-2 shadow-sm transition-all text-left group ${stateClass}`}
                        >
                          <div className="text-lg font-medium text-slate-800">
                            {currentQuestionType === 'CHOICE_K_TO_N'
                              ? option.english
                              : option.korean}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="max-w-md mx-auto w-full">
                    <form onSubmit={handleWritingSubmit} className="relative">
                      <input
                        ref={writingInputRef}
                        type="text"
                        value={writingInput}
                        onChange={e => setWritingInput(e.target.value)}
                        placeholder={
                          currentQuestionType === 'WRITING_N_TO_K'
                            ? labels.typeAnswer
                            : labels.typeMeaning
                        }
                        disabled={quizState !== 'QUESTION'}
                        className={`w-full p-4 pr-12 text-xl font-bold text-center rounded-xl border-2 outline-none shadow-sm transition-all ${
                          quizState === 'CORRECT'
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : quizState === 'WRONG'
                              ? 'border-red-500 bg-red-50 text-red-700'
                              : 'border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10'
                        }`}
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={!writingInput.trim() || quizState !== 'QUESTION'}
                        className="absolute right-2 top-2 bottom-2 aspect-square bg-indigo-600 text-white rounded-lg disabled:opacity-0 disabled:scale-90 transition-all flex items-center justify-center hover:bg-indigo-700"
                      >
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </form>

                    {showWritingAnswer && (
                      <div className="mt-4 text-center animate-in slide-in-from-top-2">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                          {labels.correctAnswer}
                        </div>
                        <div className="text-xl font-bold text-indigo-600">
                          {currentQuestionType === 'WRITING_N_TO_K'
                            ? currentLearnItem.korean
                            : currentLearnItem.english}
                        </div>
                        <button
                          onClick={handleWritingContinue}
                          className="mt-4 px-6 py-2 bg-slate-800 text-white rounded-lg font-bold text-sm hover:bg-slate-900 transition-colors"
                        >
                          {labels.continue}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Feedback Overlay (for Choice) */}
              {quizState !== 'QUESTION' && !currentQuestionType.startsWith('WRITING') && (
                <div
                  className={`absolute inset-x-0 bottom-0 p-4 rounded-b-2xl flex justify-center items-center gap-2 animate-in slide-in-from-bottom-2 ${quizState === 'CORRECT' ? 'bg-emerald-100/90 text-emerald-700' : 'bg-red-100/90 text-red-700'}`}
                >
                  {quizState === 'CORRECT' ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                  <span className="font-bold">
                    {quizState === 'CORRECT' ? labels.correct : labels.incorrect}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- LIST MODE --- */}
      {viewMode === 'LIST' && (
        <div className="max-w-4xl mx-auto space-y-4">
          {filteredWords.map((word, idx) => (
            <div
              key={idx}
              className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4"
            >
              <div className="flex flex-col items-center justify-center gap-2 pt-1">
                <button
                  onClick={() => speak(word.korean)}
                  className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center hover:bg-indigo-100 transition-colors"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
                <div className="text-xs text-slate-400 font-mono">{word.unit}</div>
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-bold text-slate-800">{word.korean}</h3>
                  {word.pos && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${getPosStyle(word.pos)}`}
                    >
                      {word.pos}
                    </span>
                  )}
                </div>

                {revealedListItems.has(word.id) ? (
                  <div className="animate-in fade-in duration-200">
                    <p className="text-lg font-medium text-indigo-700 mb-2">{word.english}</p>
                    {word.exampleSentence && (
                      <div className="bg-slate-50 p-3 rounded-lg text-sm border border-slate-100">
                        <p className="text-slate-800 mb-0.5">{word.exampleSentence}</p>
                        <p className="text-slate-500">{word.exampleTranslation}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => toggleListReveal(word.id, word.korean)}
                    className="text-slate-400 text-sm font-medium flex items-center hover:text-indigo-600 transition-colors py-1"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {labels.clickToReveal}
                  </button>
                )}
              </div>

              <button
                onClick={() => toggleListReveal(word.id, word.korean)}
                className="text-slate-300 hover:text-slate-500 p-2"
              >
                {revealedListItems.has(word.id) ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VocabModule;
