import React, { useState, useEffect, useMemo } from 'react';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { ArrowLeft, X, RefreshCw, ChevronRight, Play } from 'lucide-react';
import { useKoreanTyping, TypingStats } from '../../features/typing/hooks/useKoreanTyping';
import { HiddenInput } from '../../features/typing/components/HiddenInput';
import {
  PRACTICE_CATEGORIES,
  PracticeCategory,
  PRACTICE_PARAGRAPHS,
  PracticeParagraph,
} from '../../features/typing/data/practiceTexts'; // Import data
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import { Dialog, DialogContent, DialogPortal } from '../ui';
import { Button, Select } from '../ui';

// --- TYPES ---
type TypingMode = 'sentence' | 'word' | 'paragraph';
type GameState = 'lobby' | 'playing' | 'results';

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function deterministicShuffle(items: string[]): string[] {
  return items
    .map((value, index) => ({ value, rank: hashString(`${value}:${index}`) }))
    .sort((a, b) => a.rank - b.rank)
    .map(item => item.value);
}

// --- COMPONENTS ---

// 1. LOBBY COMPONENT
const MobileLobby = ({
  onStart,
  activeTab,
  setActiveTab,
}: {
  onStart: (mode: TypingMode, data: any) => void;
  activeTab: TypingMode;
  setActiveTab: (m: TypingMode) => void;
}) => {
  const navigate = useLocalizedNavigate();

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
  const courseNames = useMemo(() => Object.keys(coursesByName), [coursesByName]);
  const effectiveCourseName = selectedCourseName || courseNames[0] || '';
  const effectiveCourseId = selectedCourseId || coursesByName[effectiveCourseName]?.[0]?._id || '';

  return (
    <div className="flex flex-col h-full bg-muted">
      {/* Header */}
      <div className="px-6 pt-8 pb-4 bg-card/80 backdrop-blur-md sticky top-0 z-20 border-b border-border/50 flex items-center justify-between">
        <Button
          variant="ghost"
          size="auto"
          onClick={() => navigate('/practice')}
          className="p-2 -ml-2 rounded-full active:bg-muted text-muted-foreground"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-xl font-black text-muted-foreground tracking-tight">Hangyeol Typing</h1>
        <div className="w-8"></div>
      </div>

      {/* Tabs */}
      <div className="px-6 mt-6 mb-2 sticky top-[72px] z-10 bg-muted pb-2">
        <div className="flex p-1 bg-muted/60 rounded-2xl relative">
          {/* Animated Background Indicator */}
          <div
            className="absolute top-1 bottom-1 bg-card rounded-xl shadow-sm transition-all duration-300 ease-out"
            style={{
              left: activeTab === 'sentence' ? '1%' : activeTab === 'word' ? '34%' : '67%',
              width: '32%',
            }}
          />

          <Button
            variant="ghost"
            size="auto"
            onClick={() => setActiveTab('sentence')}
            className={clsx(
              'flex-1 relative z-10 py-2.5 text-sm transition-colors',
              activeTab === 'sentence'
                ? 'font-bold text-muted-foreground'
                : 'font-medium text-muted-foreground'
            )}
          >
            Sentence
          </Button>
          <Button
            variant="ghost"
            size="auto"
            onClick={() => setActiveTab('word')}
            className={clsx(
              'flex-1 relative z-10 py-2.5 text-sm transition-colors',
              activeTab === 'word'
                ? 'font-bold text-muted-foreground'
                : 'font-medium text-muted-foreground'
            )}
          >
            Word
          </Button>
          <Button
            variant="ghost"
            size="auto"
            onClick={() => setActiveTab('paragraph')}
            className={clsx(
              'flex-1 relative z-10 py-2.5 text-sm transition-colors',
              activeTab === 'paragraph'
                ? 'font-bold text-muted-foreground'
                : 'font-medium text-muted-foreground'
            )}
          >
            Paragraph
          </Button>
        </div>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 pb-24 no-scrollbar">
        {/* 1. Sentence Mode */}
        {activeTab === 'sentence' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {PRACTICE_CATEGORIES.map(cat => (
              <Button
                variant="ghost"
                size="auto"
                key={cat.id}
                onClick={() => onStart('sentence', cat)}
                className="w-full group bg-card p-6 rounded-[2rem] border border-indigo-50 dark:border-indigo-300/20 shadow-sm active:scale-[0.98] transition-all text-left relative overflow-hidden !block !whitespace-normal"
              >
                <div className="absolute top-0 right-0 p-8 opacity-5 text-6xl select-none group-active:scale-110 transition-transform">
                  {cat.icon}
                </div>
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <span className="bg-indigo-50 text-indigo-600 dark:bg-indigo-400/14 dark:text-indigo-200 text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                    {cat.sentences.length} Sets
                  </span>
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-indigo-50 dark:group-hover:bg-indigo-400/12 transition-colors">
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-300" />
                  </div>
                </div>
                <h3 className="text-xl font-black text-muted-foreground mb-1 relative z-10">
                  {cat.title}
                </h3>
                <p className="text-sm text-muted-foreground font-medium leading-relaxed relative z-10 max-w-[85%]">
                  {cat.description}
                </p>
              </Button>
            ))}
          </div>
        )}

        {/* 2. Word Mode */}
        {activeTab === 'word' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Course Selectors */}
            <div className="bg-card p-6 rounded-[2rem] border border-border shadow-sm space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase ml-1 mb-1.5 block">
                  Course
                </label>
                <Select
                  value={effectiveCourseName}
                  onChange={e => {
                    const name = e.target.value;
                    setSelectedCourseName(name);
                    const variants = coursesByName[name];
                    if (variants?.[0]) setSelectedCourseId(variants[0]._id);
                  }}
                  className="w-full !h-auto !p-4 !rounded-2xl !bg-muted !border-0 font-bold text-muted-foreground focus-visible:!ring-2 focus-visible:!ring-primary outline-none appearance-none !shadow-none"
                >
                  {courseNames.map(name => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </Select>
              </div>

              {effectiveCourseName && (
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase ml-1 mb-1.5 block">
                    Volume / Level
                  </label>
                  <Select
                    value={effectiveCourseId}
                    onChange={e => setSelectedCourseId(e.target.value)}
                    className="w-full !h-auto !p-4 !rounded-2xl !bg-muted !border-0 font-bold text-muted-foreground focus-visible:!ring-2 focus-visible:!ring-primary outline-none appearance-none !shadow-none"
                  >
                    {coursesByName[effectiveCourseName]?.map(c => (
                      <option key={c._id} value={c._id}>
                        {c.volume || c.displayLevel || 'Standard'}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              <Button
                variant="ghost"
                size="auto"
                onClick={() => onStart('word', { courseId: effectiveCourseId, unitId: 1 })}
                disabled={!effectiveCourseId}
                className="w-full py-4 bg-indigo-600 dark:bg-indigo-400/80 text-primary-foreground rounded-2xl font-bold shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 active:scale-95 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:scale-100"
              >
                <Play className="w-5 h-5 fill-current" />
                Start Word Practice
              </Button>
            </div>

            <div className="px-4 text-center">
              <p className="text-sm text-muted-foreground font-medium">
                Practice vocabulary from your enrolled courses.
              </p>
            </div>
          </div>
        )}

        {/* 3. Paragraph Mode */}
        {activeTab === 'paragraph' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {PRACTICE_PARAGRAPHS.map(para => (
              <Button
                variant="ghost"
                size="auto"
                key={para.id}
                onClick={() => onStart('paragraph', para)}
                className="w-full group bg-card p-6 rounded-[2rem] border border-pink-50 dark:border-pink-300/20 shadow-sm active:scale-[0.98] transition-all text-left relative overflow-hidden !block !whitespace-normal"
              >
                <div className="flex justify-between items-start mb-4 relative z-10">
                  <span className="bg-pink-50 text-pink-600 dark:bg-pink-400/14 dark:text-pink-200 text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider">
                    Long Text
                  </span>
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-pink-50 dark:group-hover:bg-pink-400/12 transition-colors">
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-pink-600 dark:group-hover:text-pink-300" />
                  </div>
                </div>
                <h3 className="text-xl font-black text-muted-foreground mb-1 relative z-10">
                  {para.title}
                </h3>
                <p className="text-sm text-muted-foreground font-medium leading-relaxed relative z-10 line-clamp-2">
                  {para.description}
                </p>
              </Button>
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
  onExit,
}: {
  mode: TypingMode;
  data: any;
  onFinish: (stats: TypingStats) => void;
  onExit: () => void;
}) => {
  const [queueIndex, setQueueIndex] = useState(0);

  // Init Setup
  const courseWords = useQuery(
    api.vocab.getOfCourse,
    mode === 'word' && data.courseId ? { courseId: data.courseId, unitId: 1 } : 'skip'
  );

  const queue = useMemo(() => {
    if (mode === 'sentence') {
      const cat = data as PracticeCategory;
      return deterministicShuffle(cat.sentences);
    }

    if (mode === 'paragraph') {
      const para = data as PracticeParagraph;
      return [para.text];
    }

    if (mode === 'word' && courseWords) {
      const words = courseWords.map(w => w.word).filter(Boolean);
      return deterministicShuffle(words);
    }

    return [];
  }, [mode, data, courseWords]);
  const targetText = queue[queueIndex] || '';

  // -- TYPING HOOK --
  const { userInput, completedIndex, phase, stats, inputRef, reset, checkInput } = useKoreanTyping(
    targetText,
    mode
  );

  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

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
        if (queueIndex < queue.length - 1) {
          setQueueIndex(prev => prev + 1);
          reset();
        } else {
          onFinish(stats);
        }
      }, 500); // 500ms delay to seeing "green" completion
      return () => clearTimeout(timer);
    }
  }, [phase, queueIndex, queue.length, reset, onFinish, stats]);

  // Visualize Typing
  const renderTypingText = () => {
    const chars = targetText.split('');

    return (
      <div className="text-center leading-relaxed break-keep select-none w-full max-w-lg">
        {chars.map((char, i) => {
          const inputChar = userInput[i];
          const status = checkInput(char, inputChar, targetText[i + 1]);

          let colorClass = 'text-muted-foreground'; // Pending / Future

          if (i < userInput.length) {
            if (status === 'correct') {
              colorClass = 'text-muted-foreground';
            } else if (status === 'incorrect') {
              colorClass = 'text-red-500 dark:text-red-300';
            } else if (status === 'pending') {
              colorClass = 'text-muted-foreground';
            }
          }

          // Cursor Logic
          const isCursor = i === userInput.length;

          return (
            <span key={i} className="relative inline-block">
              <span
                className={clsx(
                  'text-2xl md:text-3xl font-bold transition-colors duration-100',
                  colorClass,
                  status === 'correct' && 'border-b-2 border-foreground/10'
                )}
              >
                {char === ' ' ? '\u00A0' : char}
              </span>
              {isCursor && (
                <span className="absolute -bottom-1 left-0 w-full h-1 bg-indigo-500 dark:bg-indigo-300 rounded-full animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.5)] dark:shadow-[0_0_10px_rgba(165,180,252,0.35)]" />
              )}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className={clsx('flex flex-col h-[100dvh] bg-muted relative overflow-hidden transition-all')}
      onClick={ensureFocus}
    >
      {/* 1. Stats Header */}
      <div className="flex items-center justify-between px-6 pt-8 pb-4 bg-card/90 backdrop-blur-sm z-30 border-b border-border">
        <Button
          variant="ghost"
          size="auto"
          onClick={e => {
            e.stopPropagation();
            onExit();
          }}
          className="p-2 -ml-2 text-muted-foreground hover:text-muted-foreground rounded-full active:bg-muted"
        >
          <X className="w-6 h-6" />
        </Button>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              WPM
            </span>
            <span className="text-xl font-black text-muted-foreground leading-none font-mono">
              {stats.wpm}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              ACC
            </span>
            <span
              className={clsx(
                'text-xl font-black leading-none font-mono',
                stats.accuracy >= 98
                  ? 'text-green-500 dark:text-green-300'
                  : stats.accuracy >= 90
                    ? 'text-indigo-500 dark:text-indigo-300'
                    : 'text-amber-500 dark:text-amber-300'
              )}
            >
              {stats.accuracy}%
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Content */}
      <div
        className={clsx(
          'flex-1 flex flex-col items-center justify-center px-6 transition-all duration-300 relative',
          isKeyboardOpen ? 'pb-[40vh]' : 'pb-20' // Add safe padding for keyboard
        )}
      >
        {/* Progress Line */}
        <div className="absolute top-0 left-0 w-full h-1 bg-muted">
          <div
            className="h-full bg-indigo-500 dark:bg-indigo-300 transition-all duration-500"
            style={{
              width: `${targetText.length ? (completedIndex / targetText.length) * 100 : 0}%`,
            }}
          />
        </div>

        {/* Text Card */}
        <div className="w-full py-12 flex flex-col items-center justiy-center">
          {renderTypingText()}
        </div>

        {/* English Translation (If available in sentence obj? Currently practice texts are string[]) */}
        {/* <p className="mt-8 text-sm font-medium text-muted-foreground">
                    Translations coming soon...
                </p> */}

        {/* Hint Message */}
        {!isKeyboardOpen && (
          <div className="absolute bottom-20 text-muted-foreground text-xs font-bold uppercase tracking-widest animate-pulse">
            Tap here to start typing
          </div>
        )}
      </div>

      <HiddenInput ref={inputRef} onBlur={handleBlur} />
    </div>
  );
};

// 3. RESULTS COMPONENT
const MobileResults = ({
  stats,
  onRetry,
  onExit,
}: {
  stats: TypingStats;
  onRetry: () => void;
  onExit: () => void;
}) => {
  const isHighScore = stats.wpm > 200; // Arbitrary target

  return (
    <Dialog open onOpenChange={open => !open && onExit()}>
      <DialogPortal>
        <DialogContent
          unstyled
          closeOnEscape={false}
          lockBodyScroll={false}
          className="fixed inset-0 z-50 bg-muted flex flex-col items-center justify-center p-6"
        >
          <div className="w-full max-w-sm bg-card rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-[0_20px_40px_-18px_rgba(148,163,184,0.28)] overflow-hidden border border-border">
            {/* Header */}
            <div className="bg-primary p-8 text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 dark:from-indigo-300/16 dark:to-purple-300/16" />
              <div className="relative z-10">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner ring-4 ring-slate-800 border-2 border-border">
                  <span className="text-4xl">{isHighScore ? '🏆' : '👍'}</span>
                </div>
                <h2 className="text-2xl font-black text-primary-foreground mb-1">
                  {isHighScore ? 'Great Job!' : 'Session Complete'}
                </h2>
                <p className="text-primary-foreground/75 font-medium text-sm">
                  You&apos;re getting faster!
                </p>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                  Speed
                </span>
                <div className="text-right">
                  <span className="text-3xl font-black text-muted-foreground mr-1">
                    {stats.wpm}
                  </span>
                  <span className="text-xs font-bold text-muted-foreground">WPM</span>
                </div>
              </div>
              {/* Bar */}
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 dark:bg-indigo-300 rounded-full"
                  style={{ width: `${Math.min(stats.wpm / 3, 100)}%` }} // 300 wpm max scale
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                  Accuracy
                </span>
                <div className="text-right">
                  <span
                    className={clsx(
                      'text-3xl font-black mr-1',
                      stats.accuracy >= 95
                        ? 'text-green-500 dark:text-green-300'
                        : 'text-amber-500 dark:text-amber-300'
                    )}
                  >
                    {stats.accuracy}%
                  </span>
                </div>
              </div>
              {/* Bar */}
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className={clsx(
                    'h-full rounded-full',
                    stats.accuracy >= 95
                      ? 'bg-green-500 dark:bg-green-300'
                      : 'bg-amber-500 dark:bg-amber-300'
                  )}
                  style={{ width: `${stats.accuracy}%` }}
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 bg-muted flex gap-4">
              <Button
                variant="ghost"
                size="auto"
                onClick={onExit}
                className="flex-1 py-4 rounded-xl text-muted-foreground font-bold bg-card border border-border shadow-sm active:scale-95 transition-transform"
              >
                Lobby
              </Button>
              <Button
                variant="ghost"
                size="auto"
                onClick={onRetry}
                className="flex-1 py-4 rounded-xl text-primary-foreground font-bold bg-indigo-600 dark:bg-indigo-400/80 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </Button>
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

// --- MAIN PAGE COMPONENT ---
export const MobileTypingPage: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('lobby');
  const [activeTab, setActiveTab] = useState<TypingMode>('sentence');
  const [gameMode, setGameMode] = useState<TypingMode>('sentence');
  const [gameData, setGameData] = useState<any>(null); // CourseId, Category object, etc
  const [lastStats, setLastStats] = useState<TypingStats | null>(null);

  const saveRecord = useMutation(api.typing.saveRecord);

  const handleStart = (mode: TypingMode, data: any) => {
    setGameMode(mode);
    setGameData(data);
    setGameState('playing');
  };

  const handleFinish = async (stats: TypingStats) => {
    setLastStats(stats);
    setGameState('results');

    // Save Record
    const duration = stats.startTime ? Date.now() - stats.startTime : 0;
    const targetWpm = 40; // Default target
    const isTargetAchieved = stats.wpm >= targetWpm;

    // Determine Category ID
    let categoryId = 'unknown';
    if (gameMode === 'sentence' || gameMode === 'paragraph') {
      categoryId = gameData?.id || 'unknown';
    } else if (gameMode === 'word') {
      categoryId = gameData?.courseId || 'vocab';
    }

    try {
      console.log('[MobileTypingPage] Saving record...', {
        practiceMode: gameMode,
        categoryId,
        wpm: stats.wpm,
        accuracy: stats.accuracy,
        errorCount: stats.errorCount,
        duration,
        charactersTyped: Math.round((stats.wpm * 5 * duration) / 60000) || 0,
        sentencesCompleted: 1,
        targetWpm,
        isTargetAchieved,
      });

      await saveRecord({
        practiceMode: gameMode,
        categoryId,
        wpm: stats.wpm,
        accuracy: stats.accuracy,
        errorCount: stats.errorCount,
        duration,
        charactersTyped: Math.round((stats.wpm * 5 * duration) / 60000) || 0,
        sentencesCompleted: 1,
        targetWpm,
        isTargetAchieved,
      });
      console.log('[MobileTypingPage] Record saved successfully');
      toast.success('Result saved!');
    } catch (e: any) {
      console.error('Failed to save record:', e);
      const msg = e.data?.message || e.message || 'Unknown error';
      toast.error(`Failed to save: ${msg}`);
    }
  };

  const handleExit = () => {
    setGameState('lobby');
  };

  const handleRetry = () => {
    setGameState('playing');
  };

  return (
    <div className="h-[100dvh] w-full bg-muted overflow-hidden font-sans">
      {gameState === 'lobby' && (
        <MobileLobby onStart={handleStart} activeTab={activeTab} setActiveTab={setActiveTab} />
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
        <MobileResults stats={lastStats} onRetry={handleRetry} onExit={handleExit} />
      )}
    </div>
  );
};
