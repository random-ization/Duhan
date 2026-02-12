
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { ArrowLeft, X, RefreshCw, ChevronRight, Check, Play, Pause, RotateCcw, Award } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useKoreanTyping, TypingStats } from '../../features/typing/hooks/useKoreanTyping';
import { HiddenInput } from '../../features/typing/components/HiddenInput';
import { PRACTICE_CATEGORIES, PracticeCategory, PRACTICE_PARAGRAPHS, PracticeParagraph } from '../../features/typing/data/practiceTexts'; // Import data
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import toast, { Toaster } from 'react-hot-toast';
import { clsx } from 'clsx';
import { useAuth } from '../../contexts/AuthContext';


// --- TYPES ---
type TypingMode = 'sentence' | 'word' | 'paragraph';
type GameState = 'lobby' | 'playing' | 'results';

// --- COMPONENTS ---

// 1. LOBBY COMPONENT
const MobileLobby = ({
  onStart,
  activeTab,
  setActiveTab
}: {
  onStart: (mode: TypingMode, data: any) => void;
  activeTab: TypingMode;
  setActiveTab: (m: TypingMode) => void
}) => {
  const navigate = useLocalizedNavigate();
  const { t } = useTranslation();

  // Word Mode Data Fetching
  const rawCourses = useQuery(api.institutes.getAll);
  const courses = useMemo(() => rawCourses || [], [rawCourses]);

  // Group courses by name
  const coursesByName = useMemo(() => {
    const groups: Record<string, typeof courses> = {};
    if (!courses) return groups;
    courses.forEach(c => {
      if (!groups[c.name]) groups[c.name] = [];
      groups[c.name].push(c);
    });
    return groups;
  }, [courses]);

  // Word Selection State
  const [selectedCourseName, setSelectedCourseName] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<number>(1);

  // Initial Selection Effect
  useEffect(() => {
    if (courses.length > 0 && !selectedCourseName) {
      const firstGroup = Object.keys(coursesByName)[0];
      if (firstGroup) {
        setSelectedCourseName(firstGroup);
        const variants = coursesByName[firstGroup];
        if (variants?.[0]) {
          setSelectedCourseId(variants[0]._id);
        }
      }
    }
  }, [courses, coursesByName, selectedCourseName]);


  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="px-6 pt-8 pb-4 bg-white/80 backdrop-blur-md sticky top-0 z-20 border-b border-slate-100/50 flex items-center justify-between">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 -ml-2 rounded-full active:bg-slate-100 text-slate-400"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-black text-slate-800 tracking-tight">Hangyeol Typing</h1>
        <div className="w-8"></div>
      </div>

      {/* Tabs */}
      <div className="px-6 mt-6 mb-2 sticky top-[72px] z-10 bg-slate-50 pb-2">
        <div className="flex p-1 bg-slate-200/60 rounded-2xl relative">
          {/* Animated Background Indicator */}
          <div
            className="absolute top-1 bottom-1 bg-white rounded-xl shadow-sm transition-all duration-300 ease-out"
            style={{
              left: activeTab === 'sentence' ? '1%' : activeTab === 'word' ? '34%' : '67%',
              width: '32%'
            }}
          />

          <button
            onClick={() => setActiveTab('sentence')}
            className={clsx(
              "flex-1 relative z-10 py-2.5 text-sm transition-colors",
              activeTab === 'sentence' ? "font-bold text-slate-800" : "font-medium text-slate-500"
            )}
          >
            Sentence
          </button>
          <button
            onClick={() => setActiveTab('word')}
            className={clsx(
              "flex-1 relative z-10 py-2.5 text-sm transition-colors",
              activeTab === 'word' ? "font-bold text-slate-800" : "font-medium text-slate-500"
            )}
          >
            Word
          </button>
          <button
            onClick={() => setActiveTab('paragraph')}
            className={clsx(
              "flex-1 relative z-10 py-2.5 text-sm transition-colors",
              activeTab === 'paragraph' ? "font-bold text-slate-800" : "font-medium text-slate-500"
            )}
          >
            Paragraph
          </button>
        </div>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 pb-24 no-scrollbar">

        {/* 1. Sentence Mode */}
        {activeTab === 'sentence' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {PRACTICE_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => onStart('sentence', cat)}
                className="w-full group bg-white p-6 rounded-[2rem] border border-indigo-50 shadow-sm active:scale-[0.98] transition-all text-left relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 opacity-5 text-6xl select-none group-active:scale-110 transition-transform">
                  {cat.icon}
                </div>
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <span className="bg-indigo-50 text-indigo-600 text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                    {cat.sentences.length} Sets
                  </span>
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                  </div>
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-1 relative z-10">{cat.title}</h3>
                <p className="text-sm text-slate-400 font-medium leading-relaxed relative z-10 max-w-[85%]">
                  {cat.description}
                </p>
              </button>
            ))}
          </div>
        )}

        {/* 2. Word Mode */}
        {activeTab === 'word' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Course Selectors */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase ml-1 mb-1.5 block">Course</label>
                <select
                  value={selectedCourseName}
                  onChange={(e) => {
                    const name = e.target.value;
                    setSelectedCourseName(name);
                    const variants = coursesByName[name];
                    if (variants?.[0]) setSelectedCourseId(variants[0]._id);
                  }}
                  className="w-full p-4 rounded-2xl bg-slate-50 border-0 font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                >
                  {Object.keys(coursesByName).map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              {selectedCourseName && (
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase ml-1 mb-1.5 block">Volume / Level</label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full p-4 rounded-2xl bg-slate-50 border-0 font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                  >
                    {coursesByName[selectedCourseName]?.map(c => (
                      <option key={c._id} value={c._id}>
                        {c.volume || c.displayLevel || 'Standard'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={() => onStart('word', { courseId: selectedCourseId, unitId: selectedUnitId })}
                disabled={!selectedCourseId}
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:scale-100"
              >
                <Play className="w-5 h-5 fill-current" />
                Start Word Practice
              </button>
            </div>

            <div className="px-4 text-center">
              <p className="text-sm text-slate-400 font-medium">
                Practice vocabulary from your enrolled courses.
              </p>
            </div>
          </div>
        )}

        {/* 3. Paragraph Mode */}
        {activeTab === 'paragraph' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {PRACTICE_PARAGRAPHS.map(para => (
              <button
                key={para.id}
                onClick={() => onStart('paragraph', para)}
                className="w-full group bg-white p-6 rounded-[2rem] border border-pink-50 shadow-sm active:scale-[0.98] transition-all text-left relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <span className="bg-pink-50 text-pink-600 text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                    Long Text
                  </span>
                  <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-pink-50 transition-colors">
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-pink-600" />
                  </div>
                </div>
                <h3 className="text-xl font-black text-slate-800 mb-1 relative z-10">{para.title}</h3>
                <p className="text-sm text-slate-400 font-medium leading-relaxed relative z-10 line-clamp-2">
                  {para.description}
                </p>
              </button>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};


// 2. SESSION COMPONENT
const MobileSession = ({
  mode,
  data,
  onFinish,
  onExit
}: {
  mode: TypingMode;
  data: any;
  onFinish: (stats: TypingStats) => void;
  onExit: () => void;
}) => {
  const { t } = useTranslation();

  // -- GAME STATE --
  const [targetText, setTargetText] = useState('');
  const [queue, setQueue] = useState<string[]>([]);

  // Init Setup
  const courseWords = useQuery(
    api.vocab.getOfCourse,
    mode === 'word' && data.courseId ? { courseId: data.courseId, unitId: 1 } : 'skip'
  );

  // Initial Load Logic
  useEffect(() => {
    if (mode === 'sentence') {
      // Data is PracticeCategory
      const cat = data as PracticeCategory;
      // Shuffle
      const shuffled = [...cat.sentences].sort(() => 0.5 - Math.random());
      setQueue(shuffled);
      setTargetText(shuffled[0] || '');
    } else if (mode === 'paragraph') {
      const para = data as PracticeParagraph;
      setTargetText(para.text);
      setQueue([para.text]); // Single item queue
    } else if (mode === 'word' && courseWords) {
      // Extract Korean words
      const words = courseWords.map(w => w.word).filter(Boolean);
      const shuffled = words.sort(() => 0.5 - Math.random());
      setQueue(shuffled);
      setTargetText(shuffled[0] || '');
    }
  }, [mode, data, courseWords]);

  // -- TYPING HOOK --
  const {
    userInput,
    completedIndex,
    phase,
    stats,
    inputRef,
    reset,
    checkInput
  } = useKoreanTyping(targetText, mode);

  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Focus Management
  const ensureFocus = () => {
    inputRef.current?.focus();
    setIsKeyboardOpen(true);
  };

  const handleBlur = () => {
    // Optional: detect blur to hide keyboard UI adjustments if needed
    // setIsKeyboardOpen(false); // Often unreliable on mobile, better to keep manual
  };

  // Auto-Advance Logic
  useEffect(() => {
    if (phase === 'finish') {
      const timer = setTimeout(() => {
        // Next item
        if (queue.length > 1) {
          const nextQueue = queue.slice(1);
          setQueue(nextQueue);
          setTargetText(nextQueue[0]);
          reset();
        } else {
          // Finished completely
          onFinish(stats);
        }
      }, 500); // 500ms delay to seeing "green" completion
      return () => clearTimeout(timer);
    }
  }, [phase, queue, reset, onFinish, stats]);

  // Visualize Typing
  const renderTypingText = () => {
    const chars = targetText.split('');

    return (
      <div className="text-center leading-relaxed break-keep select-none w-full max-w-lg">
        {chars.map((char, i) => {
          const inputChar = userInput[i];
          const status = checkInput(char, inputChar, targetText[i + 1]);

          let colorClass = "text-slate-300"; // Pending / Future
          let borderClass = "border-transparent";

          if (i < userInput.length) {
            if (status === 'correct') {
              colorClass = "text-slate-800";
            } else if (status === 'incorrect') {
              colorClass = "text-red-500";
              borderClass = "border-red-200";
            } else if (status === 'pending') {
              colorClass = "text-slate-800";
            }
          }

          // Cursor Logic
          const isCursor = i === userInput.length;

          return (
            <span key={i} className="relative inline-block">
              <span className={clsx(
                "text-2xl md:text-3xl font-bold transition-colors duration-100",
                colorClass,
                status === 'correct' && "border-b-2 border-slate-900/10"
              )}>
                {char === ' ' ? '\u00A0' : char}
              </span>
              {isCursor && (
                <span className="absolute -bottom-1 left-0 w-full h-1 bg-indigo-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
              )}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className={clsx(
        "flex flex-col h-[100dvh] bg-slate-50 relative overflow-hidden transition-all",
      )}
      onClick={ensureFocus}
    >
      {/* 1. Stats Header */}
      <div className="flex items-center justify-between px-6 pt-8 pb-4 bg-white/90 backdrop-blur-sm z-30 border-b border-slate-100">
        <button
          onClick={(e) => { e.stopPropagation(); onExit(); }}
          className="p-2 -ml-2 text-slate-400 hover:text-slate-600 rounded-full active:bg-slate-100"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">WPM</span>
            <span className="text-xl font-black text-slate-800 leading-none font-mono">
              {stats.wpm}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ACC</span>
            <span className={clsx(
              "text-xl font-black leading-none font-mono",
              stats.accuracy >= 98 ? "text-green-500" : stats.accuracy >= 90 ? "text-indigo-500" : "text-amber-500"
            )}>
              {stats.accuracy}%
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Content */}
      <div className={clsx(
        "flex-1 flex flex-col items-center justify-center px-6 transition-all duration-300 relative",
        isKeyboardOpen ? "pb-[40vh]" : "pb-20" // Add safe padding for keyboard
      )}>
        {/* Progress Line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-slate-100">
          <div
            className="h-full bg-indigo-500 transition-all duration-500"
            style={{ width: `${(completedIndex / targetText.length) * 100}%` }}
          />
        </div>

        {/* Text Card */}
        <div className="w-full py-12 flex flex-col items-center justiy-center">
          {renderTypingText()}
        </div>

        {/* English Translation (If available in sentence obj? Currently practice texts are string[]) */}
        {/* <p className="mt-8 text-sm font-medium text-slate-400">
                    Translations coming soon...
                </p> */}

        {/* Hint Message */}
        {!isKeyboardOpen && (
          <div className="absolute bottom-20 text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse">
            Tap here to start typing
          </div>
        )}
      </div>

      <HiddenInput ref={inputRef} onBlur={handleBlur} />
    </div>
  );
}

// 3. RESULTS COMPONENT
const MobileResults = ({
  stats,
  onRetry,
  onExit
}: {
  stats: TypingStats;
  onRetry: () => void;
  onExit: () => void;
}) => {
  // Save record on mount
  const saveTypingRecord = useMutation(api.typing.saveRecord);
  const { user } = useAuth();

  // Convert duration (ms? No, stats doesn't have duration in hook usually, check hook)
  // Hook stats: { wpm, accuracy, startTime, errorCount }
  // We need to calculate duration from now - startTime
  const durationSec = stats.startTime ? Math.floor((Date.now() - stats.startTime) / 1000) : 0;

  // We need to save this potentially
  // (Assuming saving is handled here or previously. Let's handle it here for simplicity)
  const hasSaved = useRef(false);

  useEffect(() => {
    if (!hasSaved.current && user) {
      hasSaved.current = true;
      saveTypingRecord({
        practiceMode: 'sentence', // TODO: Pass real mode
        categoryId: 'mobile-practice', // Simplified
        wpm: stats.wpm,
        accuracy: stats.accuracy,
        errorCount: stats.errorCount,
        duration: durationSec,
        charactersTyped: 0, // Simplified
        sentencesCompleted: 1,
        targetWpm: 200,
        isTargetAchieved: stats.wpm >= 200
      }).catch(console.error);
    }
  }, [stats, user, durationSec, saveTypingRecord]);

  const isHighScore = stats.wpm > 200; // Arbitrary target

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="w-full max-w-sm bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20" />
          <div className="relative z-10">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner ring-4 ring-slate-800 border-2 border-slate-700">
              <span className="text-4xl">
                {isHighScore ? '🏆' : '👍'}
              </span>
            </div>
            <h2 className="text-2xl font-black text-white mb-1">
              {isHighScore ? 'Great Job!' : 'Session Complete'}
            </h2>
            <p className="text-slate-400 font-medium text-sm">
              You're getting faster!
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="p-8 space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Speed</span>
            <div className="text-right">
              <span className="text-3xl font-black text-slate-800 mr-1">{stats.wpm}</span>
              <span className="text-xs font-bold text-slate-400">WPM</span>
            </div>
          </div>
          {/* Bar */}
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full"
              style={{ width: `${Math.min(stats.wpm / 3, 100)}%` }} // 300 wpm max scale
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">Accuracy</span>
            <div className="text-right">
              <span className={clsx("text-3xl font-black mr-1", stats.accuracy >= 95 ? "text-green-500" : "text-amber-500")}>
                {stats.accuracy}%
              </span>
            </div>
          </div>
          {/* Bar */}
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={clsx("h-full rounded-full", stats.accuracy >= 95 ? "bg-green-500" : "bg-amber-500")}
              style={{ width: `${stats.accuracy}%` }}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-slate-50 flex gap-4">
          <button
            onClick={onExit}
            className="flex-1 py-4 rounded-xl text-slate-500 font-bold bg-white border border-slate-200 shadow-sm active:scale-95 transition-transform"
          >
            Lobby
          </button>
          <button
            onClick={onRetry}
            className="flex-1 py-4 rounded-xl text-white font-bold bg-indigo-600 shadow-lg shadow-indigo-200 active:scale-95 transition-transform flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      </div>
    </div>
  );
};


// --- MAIN PAGE COMPONENT ---
export const MobileTypingPage: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('lobby');
  const [activeTab, setActiveTab] = useState<TypingMode>('sentence');
  const [gameMode, setGameMode] = useState<TypingMode>('sentence');
  const [gameData, setGameData] = useState<any>(null); // CourseId, Category object, etc
  const [lastStats, setLastStats] = useState<TypingStats | null>(null);

  const handleStart = (mode: TypingMode, data: any) => {
    setGameMode(mode);
    setGameData(data);
    setGameState('playing');
  };

  const handleFinish = (stats: TypingStats) => {
    setLastStats(stats);
    setGameState('results');
  };

  const handleExit = () => {
    setGameState('lobby');
  };

  const handleRetry = () => {
    setGameState('playing');
  };

  return (
    <div className="h-[100dvh] w-full bg-slate-50 overflow-hidden font-sans">
      <Toaster position="top-center" />

      {gameState === 'lobby' && (
        <MobileLobby
          onStart={handleStart}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      )}

      {gameState === 'playing' && gameData && (
        <MobileSession
          mode={gameMode}
          data={gameData}
          onFinish={handleFinish}
          onExit={handleExit}
        />
      )}

      {gameState === 'results' && lastStats && (
        <MobileResults
          stats={lastStats}
          onRetry={handleRetry}
          onExit={handleExit}
        />
      )}
    </div>
  );
};
