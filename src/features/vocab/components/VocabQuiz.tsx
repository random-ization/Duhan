import React, { useState, memo, useRef, useEffect, useCallback } from 'react';
import { Trophy, RefreshCw, Settings, X, Check, ChevronRight } from 'lucide-react';
import { useMutation } from 'convex/react';
import type { Id } from '../../../../convex/_generated/dataModel';
import { useTTS } from '../../../hooks/useTTS';
import { getLabels } from '../../../utils/i18n';
import { Language } from '../../../types';
import { mRef } from '../../../utils/convexRefs';

interface VocabItem {
  id: string;
  korean: string;
  english: string;
  unit: number;
}

interface VocabQuizProps {
  words: VocabItem[];
  onComplete?: (stats: { correct: number; total: number }) => void;
  hasNextUnit?: boolean;
  onNextUnit?: () => void;
  currentUnitLabel?: string;
  userId?: string; // For recording progress
  language?: Language;
}

interface QuizSettings {
  multipleChoice: boolean;
  writingMode: boolean;
  mcDirection: 'KR_TO_NATIVE' | 'NATIVE_TO_KR';
  writingDirection: 'KR_TO_NATIVE' | 'NATIVE_TO_KR';
  autoTTS: boolean;
  soundEffects: boolean;
}

type QuestionType = 'MULTIPLE_CHOICE' | 'WRITING';

interface QuizQuestion {
  type: QuestionType;
  targetWord: VocabItem;
  direction: 'KR_TO_NATIVE' | 'NATIVE_TO_KR';
  options?: VocabItem[];
  correctIndex?: number;
}

type OptionState = 'normal' | 'selected' | 'correct' | 'wrong';
type GameState = 'PLAYING' | 'COMPLETE';
type WritingState = 'INPUT' | 'CORRECT' | 'WRONG';

// Shuffle helper
const shuffleArray = <T,>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

function VocabQuizComponent({
  words,
  onComplete,
  hasNextUnit,
  onNextUnit,
  currentUnitLabel: _currentUnitLabel,
  userId,
  language = 'zh',
}: VocabQuizProps) {
  const labels = getLabels(language);
  // Settings
  const [settings, setSettings] = useState<QuizSettings>({
    multipleChoice: true,
    writingMode: false,
    mcDirection: 'KR_TO_NATIVE',
    writingDirection: 'NATIVE_TO_KR',
    autoTTS: true,
    soundEffects: true,
  });
  const [showSettings, setShowSettings] = useState(false);
  const { speak: speakTTS } = useTTS();

  // Audio context for sound effects
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize audio context on first interaction
  const getAudioContext = () => {
    if (!audioContextRef.current) {
      const w = window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };
      const Ctor = window.AudioContext ?? w.webkitAudioContext;
      if (!Ctor) {
        throw new Error('AudioContext not supported');
      }
      audioContextRef.current = new Ctor();
    }
    return audioContextRef.current;
  };

  // Duolingo-style sound effects
  const playCorrectSound = () => {
    if (!settings.soundEffects) return;
    try {
      const ctx = getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Pleasant "ding" sound - two notes ascending
      oscillator.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1); // E5
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.warn('Sound effect failed:', e);
    }
  };

  const playWrongSound = () => {
    if (!settings.soundEffects) return;
    try {
      const ctx = getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Low "buzz" sound
      oscillator.frequency.setValueAtTime(200, ctx.currentTime);
      oscillator.frequency.setValueAtTime(150, ctx.currentTime + 0.1);
      oscillator.type = 'sawtooth';

      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.25);
    } catch (e) {
      console.warn('Sound effect failed:', e);
    }
  };

  // TTS function (always speaks, setting checked at call site)
  const speakWord = useCallback(
    (text: string, force: boolean = false) => {
      if (!force && !settings.autoTTS) return;
      speakTTS(text);
    },
    [settings.autoTTS, speakTTS]
  );

  // Quiz state
  const [gameState, setGameState] = useState<GameState>('PLAYING');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [optionStates, setOptionStates] = useState<OptionState[]>([
    'normal',
    'normal',
    'normal',
    'normal',
  ]);
  const [isLocked, setIsLocked] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);

  // Writing mode
  const [writingInput, setWritingInput] = useState('');
  const [writingState, setWritingState] = useState<WritingState>('INPUT');
  const inputRef = useRef<HTMLInputElement>(null);

  // Wrong words tracking for session retry
  const [wrongWords, setWrongWords] = useState<VocabItem[]>([]);
  const [masteredWordIds, setMasteredWordIds] = useState<Set<string>>(new Set()); // Words answered correctly
  const [currentBatchNum, setCurrentBatchNum] = useState(1);
  const [totalQuestionsAnswered, setTotalQuestionsAnswered] = useState(0); // Track total across all rounds

  // Timer cleanup
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    return () => {
      timersRef.current.forEach(timer => clearTimeout(timer));
      timersRef.current = [];
    };
  }, []);

  // Auto-speak Korean word when question changes (if direction is KR_TO_NATIVE)
  const currentQuestion = questions[questionIndex];
  const totalQuestions = questions.length;

  useEffect(() => {
    if (settings.autoTTS && currentQuestion && gameState === 'PLAYING') {
      // Speak Korean word if it's on the question side
      if (currentQuestion.direction === 'KR_TO_NATIVE') {
        speakWord(currentQuestion.targetWord.korean);
      }
    }
  }, [questionIndex, questions, settings.autoTTS, gameState, speakWord, currentQuestion]);

  // Generate questions
  const generateQuestions = useCallback(
    (currentSettings: QuizSettings) => {
      if (words.length < 4) return [];
      const shuffledWords = shuffleArray(words);
      const generated: QuizQuestion[] = [];

      shuffledWords.forEach((targetWord, idx) => {
        let questionType: QuestionType;
        if (currentSettings.multipleChoice && currentSettings.writingMode) {
          questionType = idx % 2 === 0 ? 'MULTIPLE_CHOICE' : 'WRITING';
        } else if (currentSettings.writingMode) {
          questionType = 'WRITING';
        } else {
          questionType = 'MULTIPLE_CHOICE';
        }

        const direction =
          questionType === 'MULTIPLE_CHOICE'
            ? currentSettings.mcDirection
            : currentSettings.writingDirection;

        if (questionType === 'MULTIPLE_CHOICE') {
          const others = words.filter(w => w.id !== targetWord.id);
          const distractors = shuffleArray(others).slice(0, 3);
          const options = shuffleArray([targetWord, ...distractors]);
          const correctIndex = options.findIndex(o => o.id === targetWord.id);
          generated.push({ type: 'MULTIPLE_CHOICE', targetWord, direction, options, correctIndex });
        } else {
          generated.push({ type: 'WRITING', targetWord, direction });
        }
      });
      return generated;
    },
    [words]
  );

  // Generate questions from specific word list (for retry round)
  const generateQuestionsFromWords = (retryWords: VocabItem[], currentSettings: QuizSettings) => {
    if (retryWords.length === 0) return [];
    const shuffledWords = shuffleArray(retryWords);
    const generated: QuizQuestion[] = [];

    shuffledWords.forEach((targetWord, idx) => {
      let questionType: QuestionType;
      if (currentSettings.multipleChoice && currentSettings.writingMode) {
        questionType = idx % 2 === 0 ? 'MULTIPLE_CHOICE' : 'WRITING';
      } else if (currentSettings.writingMode) {
        questionType = 'WRITING';
      } else {
        questionType = 'MULTIPLE_CHOICE';
      }

      const direction =
        questionType === 'MULTIPLE_CHOICE'
          ? currentSettings.mcDirection
          : currentSettings.writingDirection;

      if (questionType === 'MULTIPLE_CHOICE') {
        // Use all words as pool for distractors
        const others = words.filter(w => w.id !== targetWord.id);
        const distractors = shuffleArray(others).slice(0, 3);
        const options = shuffleArray([targetWord, ...distractors]);
        const correctIndex = options.findIndex(o => o.id === targetWord.id);
        generated.push({ type: 'MULTIPLE_CHOICE', targetWord, direction, options, correctIndex });
      } else {
        generated.push({ type: 'WRITING', targetWord, direction });
      }
    });
    return generated;
  };

  // Convex Mutation
  const updateProgressMutation = useMutation(
    mRef<{ wordId: Id<'words'>; quality: number }, void>('vocab:updateProgress')
  );

  // Initial load
  const [hasInit, setHasInit] = useState(false);
  // Initial load (adjust state during render if logical)
  if (!hasInit && words.length >= 4) {
    setHasInit(true);
    setQuestions(generateQuestions(settings));
  }

  // Apply settings and restart
  const applySettings = () => {
    setShowSettings(false);
    setQuestions(generateQuestions(settings));
    setQuestionIndex(0);
    setCorrectCount(0);
    setOptionStates(['normal', 'normal', 'normal', 'normal']);
    setIsLocked(false);
    setWritingInput('');
    setWritingState('INPUT');
    setGameState('PLAYING');
  };

  // Multiple choice handler
  const handleOptionClick = (index: number) => {
    if (isLocked || !currentQuestion || currentQuestion.type !== 'MULTIPLE_CHOICE') return;
    setIsLocked(true);
    const isCorrect = index === currentQuestion.correctIndex;
    setOptionStates(prev => prev.map((_, i) => (i === index ? 'selected' : 'normal')));

    const timer1 = setTimeout(() => {
      if (isCorrect) {
        setOptionStates(prev => prev.map((_, i) => (i === index ? 'correct' : 'normal')));
        setCorrectCount(c => c + 1);
        playCorrectSound();
        // Record progress (quality 5 = correct)
        if (userId && currentQuestion.targetWord.id) {
          updateProgressMutation({
            wordId: currentQuestion.targetWord.id as Id<'words'>,
            quality: 5,
          }).catch(console.warn);
        }
        // Mark as mastered
        setMasteredWordIds(prev => new Set([...prev, currentQuestion.targetWord.id]));
      } else {
        setOptionStates(prev =>
          prev.map((_, i) => {
            if (i === index) return 'wrong';
            if (i === currentQuestion.correctIndex) return 'correct';
            return 'normal';
          })
        );
        playWrongSound();
        // Record progress (quality 0 = wrong)
        if (userId && currentQuestion.targetWord.id) {
          updateProgressMutation({
            wordId: currentQuestion.targetWord.id as Id<'words'>,
            quality: 0,
          }).catch(console.warn);
        }
        // Add to wrong words for retry
        setWrongWords(prev => {
          if (!prev.find(w => w.id === currentQuestion.targetWord.id)) {
            return [...prev, currentQuestion.targetWord];
          }
          return prev;
        });
      }
      const timer2 = setTimeout(() => nextQuestion(), 1000);
      timersRef.current.push(timer2);
    }, 400);
    timersRef.current.push(timer1);
  };

  // Writing handler
  const handleWritingSubmit = () => {
    if (!currentQuestion || currentQuestion.type !== 'WRITING') return;
    const correctAnswer =
      currentQuestion.direction === 'KR_TO_NATIVE'
        ? currentQuestion.targetWord.english
        : currentQuestion.targetWord.korean;
    const userAnswer = writingInput.trim();
    const isCorrect =
      currentQuestion.direction === 'KR_TO_NATIVE'
        ? userAnswer.toLowerCase() === correctAnswer.toLowerCase()
        : userAnswer === correctAnswer;

    if (isCorrect) {
      setWritingState('CORRECT');
      setCorrectCount(c => c + 1);
      playCorrectSound();
      // Record progress (quality 5 = correct)
      if (userId && currentQuestion.targetWord.id) {
        updateProgressMutation({
          wordId: currentQuestion.targetWord.id as Id<'words'>,
          quality: 5,
        }).catch(console.warn);
      }
      // Mark as mastered
      setMasteredWordIds(prev => new Set([...prev, currentQuestion.targetWord.id]));
    } else {
      setWritingState('WRONG');
      playWrongSound();
      // Record progress (quality 0 = wrong)
      if (userId && currentQuestion.targetWord.id) {
        updateProgressMutation({
          wordId: currentQuestion.targetWord.id as Id<'words'>,
          quality: 0,
        }).catch(console.warn);
      }
      // Add to wrong words for retry
      setWrongWords(prev => {
        if (!prev.find(w => w.id === currentQuestion.targetWord.id)) {
          return [...prev, currentQuestion.targetWord];
        }
        return prev;
      });
    }
    const timer = setTimeout(() => nextQuestion(), 1500);
    timersRef.current.push(timer);
  };

  const nextQuestion = () => {
    // Increment total answered count
    setTotalQuestionsAnswered(t => t + 1);

    if (questionIndex >= totalQuestions - 1) {
      // End of current batch - check for wrong words and remaining words
      const remainingNewWords = words.filter(
        w => !masteredWordIds.has(w.id) && !wrongWords.find(ww => ww.id === w.id)
      );

      if (wrongWords.length > 0 || remainingNewWords.length > 0) {
        // Mix wrong words with new unseen words for next batch
        const batchSize = 20;
        const wrongToInclude = [...wrongWords];
        const newWordsNeeded = Math.max(0, batchSize - wrongToInclude.length);
        const newWordsToAdd = shuffleArray(remainingNewWords).slice(0, newWordsNeeded);

        const nextBatchWords = shuffleArray([...wrongToInclude, ...newWordsToAdd]);

        if (nextBatchWords.length > 0) {
          const nextQuestions = generateQuestionsFromWords(nextBatchWords, settings);
          setQuestions(nextQuestions);
          setQuestionIndex(0);
          setOptionStates(['normal', 'normal', 'normal', 'normal']);
          setIsLocked(false);
          setWritingInput('');
          setWritingState('INPUT');
          setWrongWords([]); // Clear wrong words for fresh tracking
          setCurrentBatchNum(b => b + 1);
          return;
        }
      }

      // All words mastered!
      setGameState('COMPLETE');
      onComplete?.({ correct: correctCount, total: totalQuestionsAnswered + 1 });
    } else {
      setQuestionIndex(q => q + 1);
      setOptionStates(['normal', 'normal', 'normal', 'normal']);
      setIsLocked(false);
      setWritingInput('');
      setWritingState('INPUT');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const restartGame = () => {
    setQuestions(generateQuestions(settings));
    setQuestionIndex(0);
    setCorrectCount(0);
    setTotalQuestionsAnswered(0);
    setOptionStates(['normal', 'normal', 'normal', 'normal']);
    setIsLocked(false);
    setWritingInput('');
    setWritingState('INPUT');
    setWrongWords([]);
    setMasteredWordIds(new Set());
    setCurrentBatchNum(1);
    setGameState('PLAYING');
  };

  // Not enough words
  if (words.length < 4) {
    return (
      <div className="bg-white rounded-[2.5rem] border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] p-12 text-center">
        <p className="text-slate-500 font-medium">
          {labels.dashboard?.quiz?.minWords || 'Need at least 4 words to start quiz'}
        </p>
      </div>
    );
  }

  // Settings Modal - inline JSX instead of nested component
  const settingsModalContent = showSettings && (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={() => setShowSettings(false)}
    >
      <div
        className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black text-slate-900">
            🎯 {labels.dashboard?.quiz?.quizSettings || 'Quiz Settings'}
          </h2>
          <button
            onClick={() => setShowSettings(false)}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Question Type */}
        <div className="mb-5">
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">
            {labels.dashboard?.quiz?.questionType || 'Question Type'}
          </h3>
          <div className="space-y-2">
            <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100">
              <span className="font-bold text-slate-700">
                {labels.dashboard?.quiz?.multipleChoice || '📝 Multiple Choice'}
              </span>
              <input
                type="checkbox"
                checked={settings.multipleChoice}
                onChange={e => setSettings(s => ({ ...s, multipleChoice: e.target.checked }))}
                className="w-5 h-5 accent-blue-500"
              />
            </label>
            <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100">
              <span className="font-bold text-slate-700">
                {labels.dashboard?.quiz?.writingFill || '✏️ Writing Fill'}
              </span>
              <input
                type="checkbox"
                checked={settings.writingMode}
                onChange={e => setSettings(s => ({ ...s, writingMode: e.target.checked }))}
                className="w-5 h-5 accent-blue-500"
              />
            </label>
          </div>
        </div>

        {/* MC Direction */}
        {settings.multipleChoice && (
          <div className="mb-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">
              {labels.dashboard?.quiz?.mcDirection || 'MC Direction'}
            </h3>
            <div className="space-y-2">
              <label
                className={`flex items-center p-3 rounded-xl cursor-pointer ${settings.mcDirection === 'KR_TO_NATIVE' ? 'bg-blue-50 border-2 border-blue-300' : 'bg-slate-50 border-2 border-transparent'}`}
              >
                <input
                  type="radio"
                  name="mc-dir"
                  checked={settings.mcDirection === 'KR_TO_NATIVE'}
                  onChange={() => setSettings(s => ({ ...s, mcDirection: 'KR_TO_NATIVE' }))}
                  className="mr-3"
                />
                <span className="font-medium">
                  {labels.dashboard?.quiz?.krToNative || 'Korean → Meaning'}
                </span>
              </label>
              <label
                className={`flex items-center p-3 rounded-xl cursor-pointer ${settings.mcDirection === 'NATIVE_TO_KR' ? 'bg-blue-50 border-2 border-blue-300' : 'bg-slate-50 border-2 border-transparent'}`}
              >
                <input
                  type="radio"
                  name="mc-dir"
                  checked={settings.mcDirection === 'NATIVE_TO_KR'}
                  onChange={() => setSettings(s => ({ ...s, mcDirection: 'NATIVE_TO_KR' }))}
                  className="mr-3"
                />
                <span className="font-medium">
                  {labels.dashboard?.quiz?.nativeToKr || 'Meaning → Korean'}
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Writing Direction */}
        {settings.writingMode && (
          <div className="mb-5">
            <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">
              {labels.dashboard?.quiz?.writingDirection || 'Writing Direction'}
            </h3>
            <div className="space-y-2">
              <label
                className={`flex items-center p-3 rounded-xl cursor-pointer ${settings.writingDirection === 'KR_TO_NATIVE' ? 'bg-purple-50 border-2 border-purple-300' : 'bg-slate-50 border-2 border-transparent'}`}
              >
                <input
                  type="radio"
                  name="writing-dir"
                  checked={settings.writingDirection === 'KR_TO_NATIVE'}
                  onChange={() => setSettings(s => ({ ...s, writingDirection: 'KR_TO_NATIVE' }))}
                  className="mr-3"
                />
                <span className="font-medium">
                  {labels.dashboard?.quiz?.krToNative || 'Korean → Meaning'}
                </span>
              </label>
              <label
                className={`flex items-center p-3 rounded-xl cursor-pointer ${settings.writingDirection === 'NATIVE_TO_KR' ? 'bg-purple-50 border-2 border-purple-300' : 'bg-slate-50 border-2 border-transparent'}`}
              >
                <input
                  type="radio"
                  name="writing-dir"
                  checked={settings.writingDirection === 'NATIVE_TO_KR'}
                  onChange={() => setSettings(s => ({ ...s, writingDirection: 'NATIVE_TO_KR' }))}
                  className="mr-3"
                />
                <span className="font-medium">
                  {labels.dashboard?.quiz?.nativeToKr || 'Meaning → Korean'}
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Audio Settings */}
        <div className="mb-5">
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">
            {labels.dashboard?.quiz?.audioSettings || 'Audio Settings'}
          </h3>
          <div className="space-y-2">
            <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100">
              <div>
                <span className="font-bold text-slate-700 block">
                  {labels.dashboard?.quiz?.autoRead || '🔊 Auto Read Words'}
                </span>
                <span className="text-xs text-slate-400">
                  {labels.dashboard?.quiz?.autoReadDesc ||
                    'Auto play Korean pronunciation each question'}
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.autoTTS}
                onChange={e => setSettings(s => ({ ...s, autoTTS: e.target.checked }))}
                className="w-5 h-5 accent-green-500"
              />
            </label>
            <label className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100">
              <div>
                <span className="font-bold text-slate-700 block">
                  {labels.dashboard?.quiz?.soundEffects || '🎵 Sound Effects'}
                </span>
                <span className="text-xs text-slate-400">
                  {labels.dashboard?.quiz?.soundEffectsDesc || 'Correct/incorrect feedback sounds'}
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.soundEffects}
                onChange={e => setSettings(s => ({ ...s, soundEffects: e.target.checked }))}
                className="w-5 h-5 accent-green-500"
              />
            </label>
          </div>
        </div>

        <button
          onClick={applySettings}
          disabled={!settings.multipleChoice && !settings.writingMode}
          className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 disabled:opacity-50"
        >
          {labels.dashboard?.quiz?.applyRestart || 'Apply & Restart'}
        </button>
      </div>
    </div>
  );

  // Complete Screen
  if (gameState === 'COMPLETE') {
    // Use totalQuestionsAnswered for accurate percentage across all rounds
    const finalTotal = totalQuestionsAnswered > 0 ? totalQuestionsAnswered : totalQuestions;
    const percentage = Math.round((correctCount / finalTotal) * 100);
    return (
      <div className="bg-white rounded-[2.5rem] border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] p-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-green-50" />
        <div className="relative z-10">
          <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
            <Trophy className="w-12 h-12 text-green-600" />
          </div>
          <h2 className="text-4xl font-black text-slate-900 mb-2">
            {labels.dashboard?.quiz?.complete || '🎉 Quiz Complete!'}
          </h2>
          <p className="text-slate-500 mb-6">
            {labels.dashboard?.quiz?.youFinished || 'You finished all questions!'}
          </p>
          <div className="grid grid-cols-2 gap-4 mb-8 max-w-sm mx-auto">
            <div className="bg-white border-2 border-slate-200 rounded-xl p-4">
              <div className="text-3xl font-black text-slate-900">
                {correctCount}/{finalTotal}
              </div>
              <div className="text-xs text-slate-400 font-bold">
                {labels.dashboard?.quiz?.correctCount || 'Correct'}
              </div>
            </div>
            <div className="bg-white border-2 border-slate-200 rounded-xl p-4">
              <div className="text-3xl font-black text-slate-900">{percentage}%</div>
              <div className="text-xs text-slate-400 font-bold">
                {labels.dashboard?.quiz?.accuracy || 'Accuracy'}
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={restartGame}
              className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-white border-2 border-slate-900 text-slate-900 font-black rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-1 transition-all"
            >
              <RefreshCw className="w-5 h-5" /> {labels.dashboard?.quiz?.again || 'Try Again'}
            </button>
            {hasNextUnit && onNextUnit && (
              <button
                onClick={onNextUnit}
                className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-green-500 border-2 border-green-600 text-white font-black rounded-xl shadow-[4px_4px_0px_0px_rgba(22,163,74,1)] hover:-translate-y-1 transition-all"
              >
                {labels.dashboard?.quiz?.nextUnit || 'Next Unit'}{' '}
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Playing
  if (!currentQuestion) return null;

  const isWriting = currentQuestion.type === 'WRITING';
  const questionText =
    currentQuestion.direction === 'KR_TO_NATIVE'
      ? currentQuestion.targetWord.korean
      : currentQuestion.targetWord.english;
  const promptText = isWriting
    ? currentQuestion.direction === 'KR_TO_NATIVE'
      ? labels.dashboard?.quiz?.enterMeaning || 'Enter meaning...'
      : labels.dashboard?.quiz?.enterKorean || 'Enter Korean...'
    : currentQuestion.direction === 'KR_TO_NATIVE'
      ? labels.dashboard?.quiz?.questionMeaning || 'What does this word mean?'
      : labels.dashboard?.quiz?.questionKorean || 'What is the Korean word?';

  return (
    <>
      {settingsModalContent}
      <div className="bg-white rounded-[2.5rem] border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] p-8">
        {/* Progress with Settings Button */}
        <div className="mb-8">
          <div className="flex justify-between items-center text-xs font-bold text-slate-400 mb-1">
            <div className="flex items-center gap-2">
              <span>{labels.dashboard?.quiz?.progress || 'Progress'}</span>
              {currentBatchNum > 1 && (
                <span className="px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full text-[10px]">
                  {labels.dashboard?.quiz?.round?.replace('{n}', currentBatchNum.toString()) ||
                    `Round ${currentBatchNum}`}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span>
                {questionIndex + 1} / {totalQuestions}
              </span>
              <button
                onClick={() => setShowSettings(true)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#4ADE80] transition-all"
              style={{ width: `${((questionIndex + 1) / totalQuestions) * 100}%` }}
            />
          </div>
        </div>

        {/* Score Badge */}
        <div className="text-center mb-4 flex items-center justify-center gap-3">
          <span className="px-4 py-1 bg-green-100 text-green-700 rounded-full font-bold text-sm">
            ✓ {correctCount} {labels.dashboard?.quiz?.correct || 'Correct'}
          </span>
          <span
            className={`px-3 py-1 rounded-full font-bold text-xs ${isWriting ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}
          >
            {isWriting
              ? `✏️ ${labels.dashboard?.quiz?.writing || 'Writing'}`
              : `📝 ${labels.dashboard?.quiz?.select || 'Select'}`}
          </span>
        </div>

        {/* Question */}
        <div className="text-center mb-10">
          <p className="text-sm text-slate-400 font-bold uppercase mb-4">{promptText}</p>
          <h2 className="text-6xl font-black text-slate-900">{questionText}</h2>
        </div>

        {/* MC Options */}
        {!isWriting && currentQuestion.options && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {currentQuestion.options.map((option, index) => {
              const state = optionStates[index];
              const displayText =
                currentQuestion.direction === 'KR_TO_NATIVE' ? option.english : option.korean;
              let btnClass =
                'w-full bg-white border-2 border-slate-900 border-b-[6px] rounded-2xl p-5 flex items-center gap-4 text-left transition-all';
              if (state === 'normal')
                btnClass += ' hover:bg-slate-50 active:border-b-2 active:translate-y-1';
              else if (state === 'selected') btnClass += ' bg-yellow-50 border-yellow-400';
              else if (state === 'correct')
                btnClass += ' bg-green-50 border-green-500 text-green-700';
              else if (state === 'wrong')
                btnClass += ' bg-red-50 border-red-500 text-red-600 animate-shake';

              return (
                <button
                  key={option.id}
                  onClick={() => handleOptionClick(index)}
                  disabled={isLocked}
                  className={btnClass}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${state === 'correct' ? 'bg-green-200 text-green-700' : state === 'wrong' ? 'bg-red-200 text-red-600' : 'bg-slate-100 text-slate-400'}`}
                  >
                    {String.fromCharCode(65 + index)}
                  </div>
                  <span className="font-bold text-lg">{displayText}</span>
                  {state === 'correct' && <span className="ml-auto text-2xl">✓</span>}
                  {state === 'wrong' && <span className="ml-auto text-2xl">✕</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Writing Input */}
        {isWriting && (
          <div className="mb-6">
            <div
              className={`p-6 rounded-2xl border-2 ${writingState === 'CORRECT' ? 'bg-green-50 border-green-400' : writingState === 'WRONG' ? 'bg-red-50 border-red-400' : 'bg-slate-50 border-slate-200'}`}
            >
              <input
                ref={inputRef}
                type="text"
                value={writingInput}
                onChange={e => setWritingInput(e.target.value)}
                onKeyDown={e =>
                  e.key === 'Enter' && writingState === 'INPUT' && handleWritingSubmit()
                }
                placeholder={
                  currentQuestion.direction === 'KR_TO_NATIVE'
                    ? labels.dashboard?.quiz?.enterMeaning || 'Enter meaning...'
                    : labels.dashboard?.quiz?.enterKorean || 'Enter Korean...'
                }
                disabled={writingState !== 'INPUT'}
                className="w-full text-2xl font-bold text-center bg-transparent outline-none"
                autoFocus
              />
              {writingState === 'CORRECT' && (
                <div className="mt-4 text-center text-green-600 font-bold flex items-center justify-center gap-2">
                  <Check className="w-6 h-6" /> {labels.dashboard?.quiz?.correct || 'Correct'}!
                </div>
              )}
              {writingState === 'WRONG' && (
                <div className="mt-4 text-center">
                  <p className="text-red-600 font-bold mb-2">
                    ✕ {labels.dashboard?.quiz?.wrong || 'Wrong'}
                  </p>
                  <p className="text-slate-600">
                    {labels.dashboard?.quiz?.correctAnswer || 'Correct Answer'}:{' '}
                    <strong className="text-green-600">
                      {currentQuestion.direction === 'KR_TO_NATIVE'
                        ? currentQuestion.targetWord.english
                        : currentQuestion.targetWord.korean}
                    </strong>
                  </p>
                </div>
              )}
            </div>
            {writingState === 'INPUT' && (
              <button
                onClick={handleWritingSubmit}
                disabled={!writingInput.trim()}
                className="w-full mt-4 py-4 bg-slate-900 text-white font-black rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-1 transition-all disabled:opacity-50"
              >
                {labels.dashboard?.quiz?.confirm || 'Confirm'}
              </button>
            )}
          </div>
        )}

        <style>{`
                    @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-8px); } 75% { transform: translateX(8px); } }
                    .animate-shake { animation: shake 0.3s ease-in-out; }
                `}</style>
      </div>
    </>
  );
}

const VocabQuiz = memo(VocabQuizComponent);
export default VocabQuiz;
