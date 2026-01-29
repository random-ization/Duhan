import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { useKoreanTyping, TypingMode } from '../features/typing/hooks/useKoreanTyping';
import { HiddenInput } from '../features/typing/components/HiddenInput';
import { KeyboardHints } from '../features/typing/components/KeyboardHints';
import { TypingResultsModal } from '../features/typing/components/TypingResultsModal';
import {
  PRACTICE_CATEGORIES,
  PracticeCategory,
  PRACTICE_PARAGRAPHS,
  PracticeParagraph,
} from '../features/typing/data/practiceTexts';
import { ArrowLeft, Ghost } from 'lucide-react';
import { useLayout } from '../contexts/LayoutContext';
import { useAuth } from '../contexts/AuthContext';
import { useMutation, useQuery } from 'convex/react';
import { WordPractice } from '../features/typing/components/WordPractice';
import { api } from '../../convex/_generated/api';
import { useTranslation } from 'react-i18next'; // Added i18n hook
import { useNavigate } from 'react-router-dom';

// Enhanced Keyboard & Page Theme Styles
// Enhanced Keyboard & Page Theme Styles (Soft Pop V3)
const keyboardThemeStyles = `
    /* Prevent scrolling and touch events on game container */
    .typing - practice - container {
    touch - action: none;
    user - select: none;
    -webkit - user - select: none;
    overscroll - behavior: none;
}

  /* Keyboard Container - Transparent to let background shine */
  .hg - theme -default {
    background - color: transparent!important;
    padding: 0!important;
}
  
  .hg - row {
    justify - content: center;
    gap: 3px; /* Tighter spacing */
    margin - bottom: 4px;
}

  /* Base Key Style - Soft Marshmallow Look */
  .hg - button {
    background: #ffffff!important;
    color: #475569!important; /* slate-600 */
    border: none!important;
    border - bottom: 1px solid #e2e8f0!important;
    border - radius: 0.3rem!important; /* Mini radius */
    box - shadow: 0 2px 0 #cbd5e1, 0 1px 2px rgba(0, 0, 0, 0.05)!important;

    font - weight: 600!important;
    font - size: 11px!important; /* Tiny font */
    height: 1.8rem!important; /* Ultra compact height */
    min - width: 1.6rem!important;
    margin: 0!important;

    transition: all 0.05s ease!important;
    display: flex!important;
    align - items: center!important;
    justify - content: center!important;
}

  /* Hover State */
  .hg - button:hover {
    background: #f8fafc!important;
    transform: translateY(1px);
    box - shadow: 0 2px 0 #cbd5e1!important;
}

  /* Active / Pressed State */
  .hg - button: active, .hg - activeButton {
    transform: translateY(3px)!important;
    box - shadow: 0 0 0 #cbd5e1, inset 0 2px 4px rgba(0, 0, 0, 0.05)!important;
    background: #f1f5f9!important;
}

  /* Highlighting Next Key (Guidance) */
  .active - key - highlight {
    background: #3b82f6!important; /* brand-500 */
    color: #ffffff!important;
    box - shadow: 0 3px 0 #1d4ed8, 0 4px 10px rgba(59, 130, 246, 0.4)!important;
    animation: bounce - gentle 2s infinite!important;
    z - index: 10;
}

@keyframes bounce - gentle {
    0 %, 100 % { transform: translateY(0); }
    50 % { transform: translateY(-2px); }
}

  /* Special Keys Styling */
  .hg - button[data - skbtn="{bksp}"],
  .hg - button[data - skbtn="{tab}"],
  .hg - button[data - skbtn="{lock}"],
  .hg - button[data - skbtn="{enter}"],
  .hg - button[data - skbtn="{shiftleft}"], 
  .hg - button[data - skbtn="{shiftright}"] {
    background - color: #f1f5f9!important;
    color: #94a3b8!important;
    font - size: 11px!important;
    border - bottom - color: #cbd5e1!important;
    box - shadow: 0 3px 0 #cbd5e1!important;
}

  /* Override: Special keys should also highlight when active */
  .hg - button.active - key - highlight[data - skbtn="{shiftleft}"],
  .hg - button.active - key - highlight[data - skbtn="{shiftright}"],
  .hg - button.active - key - highlight[data - skbtn="{bksp}"],
  .hg - button.active - key - highlight[data - skbtn="{enter}"],
  .hg - button.active - key - highlight[data - skbtn="{space}"] {
    background: #3b82f6!important;
    color: #ffffff!important;
    box - shadow: 0 3px 0 #1d4ed8, 0 4px 10px rgba(59, 130, 246, 0.4)!important;
    animation: bounce - gentle 2s infinite!important;
}

  .hg - button[data - skbtn="{space}"] {
    min - width: 14rem!important;
    color: transparent!important; /* Hide text on spacebar usually */
}
  .hg - button[data - skbtn="{space}"]:after {
    content: "SPACE";
    color: #cbd5e1;
    font - size: 10px;
    letter - spacing: 1px;
}

  /* Word Practice V6 Styles (Blue Compact Card) */
  .word - prompt - card {
    background: #2563eb; /* Strong solid blue */
    box - shadow: 0 20px 40px - 10px rgba(37, 99, 235, 0.4);
    transition: transform 0.3s cubic - bezier(0.34, 1.56, 0.64, 1);
}
  .word - prompt - card:hover {
    transform: scale(1.05);
}
`;

// Generate English Key Labels (QWERTY) via CSS
const englishKeys = {
  q: 'Q',
  w: 'W',
  e: 'E',
  r: 'R',
  t: 'T',
  y: 'Y',
  u: 'U',
  i: 'I',
  o: 'O',
  p: 'P',
  a: 'A',
  s: 'S',
  d: 'D',
  f: 'F',
  g: 'G',
  h: 'H',
  j: 'J',
  k: 'K',
  l: 'L',
  z: 'Z',
  x: 'X',
  c: 'C',
  v: 'V',
  b: 'B',
  n: 'N',
  m: 'M',
};

const englishKeyStyles = Object.entries(englishKeys)
  .map(
    ([key, label]) => `
    .hg - button[data - skbtn="${key}"]::after {
    content: "${label}";
    position: absolute;
    top: 2px;
    right: 4px;
    font - size: 8px;
    color: #94a3b8;
    font - weight: 500;
    line - height: normal;
}
`
  )
  .join('\n');

// Practice Mode Types
type PracticeMode = 'sentence' | 'word' | 'paragraph';
type GameState = 'lobby' | 'playing' | 'finished'; // Added GameState type

const TypingPage: React.FC = () => {
  // -- LAYOUT CONTROL --
  const { setSidebarHidden, setFooterHidden } = useLayout();

  // -- USER --
  const { user } = useAuth();

  // -- CONVEX --
  const saveTypingRecord = useMutation(api.typing.saveRecord);
  const userStats = useQuery(api.typing.getUserStats);

  // Word Practice Data
  const rawCourses = useQuery(api.institutes.getAll);
  const courses = useMemo(() => rawCourses || [], [rawCourses]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<number>(1);

  // Group courses by name for Volume selection
  const coursesByName = useMemo(() => {
    const groups: Record<string, typeof courses> = {};
    if (!courses) return groups;

    courses.forEach(c => {
      if (!groups[c.name]) {
        groups[c.name] = [];
      }
      groups[c.name].push(c);
    });

    // Sort volumes within groups? (Assuming backend order or handle here)
    return groups;
  }, [courses]);

  const [selectedCourseName, setSelectedCourseName] = useState<string>('');

  // Update selectedCourseName when courses load or selectedCourseId changes
  useEffect(() => {
    if (!courses) return;

    if (selectedCourseId) {
      const course = courses.find(c => c._id === selectedCourseId);
      if (course && course.name !== selectedCourseName) {
        // Wrap in timeout to avoid sync update during render
        setTimeout(() => setSelectedCourseName(course.name), 0);
      }
    } else if (courses.length > 0 && !selectedCourseName) {
      const firstGroup = Object.keys(coursesByName)[0];
      if (firstGroup) {
        setTimeout(() => setSelectedCourseName(firstGroup), 0);
      }
    }
  }, [selectedCourseId, courses, coursesByName, selectedCourseName]);

  const courseWords = useQuery(
    api.vocab.getOfCourse,
    selectedCourseId ? { courseId: selectedCourseId, unitId: selectedUnitId } : 'skip'
  );

  const { t } = useTranslation(); // Init translation hook
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<GameState>('lobby'); // 'lobby', 'playing', 'finished'
  const [selectedCategory, setSelectedCategory] = useState<PracticeCategory | null>(null);
  const [selectedParagraph, setSelectedParagraph] = useState<PracticeParagraph | null>(null);
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('sentence');
  const [sentenceQueue, setSentenceQueue] = useState<string[]>([]);

  // Session Tracking
  const [sentencesCompleted, setSentencesCompleted] = useState(0);
  const [totalCharactersTyped, setTotalCharactersTyped] = useState(0);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    wpm: 0,
    accuracy: 100,
    errorCount: 0,
    duration: 0,
  });
  const targetWpm = 200; // Challenge target

  // Sentence Queue Management
  // const [sentenceQueue, setSentenceQueue] = useState<string[]>([]); // Moved up
  const [targetText, setTargetText] = useState('');

  const [mode] = useState<TypingMode>('sentence');
  const [isFocused, setIsFocused] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Hide main app sidebar when playing, show when in lobby
  // Hide main app sidebar AND footer when playing/on page
  useEffect(() => {
    setSidebarHidden(gameState === 'playing');
    setFooterHidden(true); // Always hide footer on this page
    return () => {
      setSidebarHidden(false);
      setFooterHidden(false);
    };
  }, [gameState, setSidebarHidden, setFooterHidden]);

  const {
    userInput,
    // completedIndex,
    phase,
    stats,
    inputRef,
    reset,
    checkInput,
    getNextJamo,
  } = useKoreanTyping(targetText, mode);

  // -- INITIALIZATION & QUEUE LOGIC --
  const generateQueue = (category: PracticeCategory, count: number = 4) => {
    const newQueue: string[] = [];
    const sentences = category.sentences;
    for (let i = 0; i < count; i++) {
      newQueue.push(sentences[Math.floor(Math.random() * sentences.length)]);
    }
    return newQueue;
  };

  const startGame = (category: PracticeCategory) => {
    setSelectedCategory(category);
    const queue = generateQueue(category);
    setSentenceQueue(queue);
    setTargetText(queue[0]);
    setGameState('playing');
    // Reset session tracking
    setSentencesCompleted(0);
    setTotalCharactersTyped(0);
    setElapsedTime(0);
    reset();
  };

  const nextSentence = useCallback(() => {
    if (!selectedCategory) return;

    // Track completed sentence
    setSentencesCompleted(prev => prev + 1);
    setTotalCharactersTyped(prev => prev + targetText.length);

    // Remove first, add one new
    const newSentence =
      selectedCategory.sentences[Math.floor(Math.random() * selectedCategory.sentences.length)];
    const nextQueue = [...sentenceQueue.slice(1), newSentence];

    setSentenceQueue(nextQueue);
    setTargetText(nextQueue[0]);
    reset();

    // Refocus
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [selectedCategory, sentenceQueue, targetText, reset, inputRef]);

  // End session and show results
  const endSession = useCallback(async () => {
    const finalStats = {
      wpm: Math.round(stats.wpm),
      accuracy: stats.accuracy,
      errorCount: stats.errorCount,
      duration: elapsedTime,
    };
    setSessionStats(finalStats);
    setShowResultsModal(true);

    // Save to database
    try {
      if (selectedCategory) {
        await saveTypingRecord({
          practiceMode,
          categoryId: selectedCategory.id,
          wpm: finalStats.wpm,
          accuracy: finalStats.accuracy,
          errorCount: finalStats.errorCount,
          duration: finalStats.duration,
          charactersTyped: totalCharactersTyped + userInput.length,
          sentencesCompleted: sentencesCompleted,
          targetWpm,
          isTargetAchieved: finalStats.wpm >= targetWpm,
        });
      }
    } catch (error) {
      console.error('Failed to save typing record:', error);
    }
  }, [
    stats,
    elapsedTime,
    selectedCategory,
    practiceMode,
    saveTypingRecord,
    totalCharactersTyped,
    userInput.length,
    sentencesCompleted,
  ]);

  // Handle modal actions
  const handleRetry = () => {
    setShowResultsModal(false);
    if (selectedCategory) {
      startGame(selectedCategory);
    }
  };

  const handleQuit = () => {
    setShowResultsModal(false);
    setGameState('lobby');
    setSelectedCategory(null);
  };

  // Handle word practice completion
  const handleWordComplete = useCallback(
    async (resultStats: {
      wpm: number;
      accuracy: number;
      errorCount: number;
      duration: number;
      wordsCompleted: number;
    }) => {
      setSessionStats({
        wpm: resultStats.wpm,
        accuracy: resultStats.accuracy,
        errorCount: resultStats.errorCount,
        duration: resultStats.duration,
      });
      setShowResultsModal(true);

      try {
        await saveTypingRecord({
          practiceMode: 'word',
          categoryId: selectedCourseId, // Using course ID as category ID
          wpm: resultStats.wpm,
          accuracy: resultStats.accuracy,
          errorCount: resultStats.errorCount,
          duration: resultStats.duration,
          charactersTyped: 0,
          sentencesCompleted: resultStats.wordsCompleted, // Using words count as completed count
          targetWpm: 200,
          isTargetAchieved: resultStats.wpm >= 200,
        });
      } catch (error) {
        console.error('Failed to save word practice record:', error);
      }
    },
    [selectedCourseId, saveTypingRecord]
  );

  // Check for completion (auto-advance to next sentence)
  useEffect(() => {
    if (phase === 'finish') {
      const timer = setTimeout(() => {
        nextSentence();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [phase, nextSentence]);

  // Timer for elapsed time display
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (phase === 'typing' && stats.startTime) {
      interval = setInterval(() => {
        const now = Date.now();
        setElapsedTime(Math.floor((now - stats.startTime!) / 1000));
      }, 1000);
    } else if (phase === 'start') {
      setTimeout(() => setElapsedTime(0), 0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [phase, stats.startTime]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'playing') {
        if (e.key === 'Escape') {
          e.preventDefault();
          setGameState('lobby');
          setSelectedCategory(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // --- English Input Detection Warning ---
  const hasWarnedRef = useRef(false);
  useEffect(() => {
    // Detect if user is typing multiple English characters (likely forgot to switch IME)
    // Regex looks for 2+ consecutive Latin letters
    if (/[a-zA-Z]{2,}/.test(userInput)) {
      if (!hasWarnedRef.current) {
        toast.error(
          '检测到英文输入 (English Detected)\n请切换到韩语输入法 (Please switch to Korean IME)',
          {
            duration: 4000,
            position: 'top-center',
            style: {
              background: '#334155',
              color: '#fff',
              fontWeight: 'bold',
            },
          }
        );
        hasWarnedRef.current = true;
      }
    } else {
      // Reset warning if input is cleared or proper Korean is typed
      if (userInput.length === 0) {
        hasWarnedRef.current = false;
      }
    }
  }, [userInput]);

  // Helper: Get active keys for keyboard highlights
  const getCurrentTypingPosition = () => {
    for (let i = 0; i < targetText.length; i++) {
      const inputChar = userInput[i];
      const targetChar = targetText[i];
      const nextChar = i + 1 < targetText.length ? targetText[i + 1] : undefined;

      if (!inputChar) {
        return { index: i, inputChar: '', targetChar, hasError: false };
      }

      // Pass nextChar to enable consonant migration detection
      const status = checkInput(targetChar, inputChar, nextChar);
      if (status === 'pending') {
        return { index: i, inputChar, targetChar, hasError: false };
      } else if (status === 'incorrect') {
        return { index: i, inputChar, targetChar, hasError: true };
      }
    }
    return { index: targetText.length, inputChar: '', targetChar: '', hasError: false };
  };

  const {
    index: currentTypingIndex,
    inputChar: currentInputChar,
    targetChar: currentTargetChar,
    hasError,
  } = getCurrentTypingPosition();
  const nextTargetChar =
    currentTypingIndex + 1 < targetText.length ? targetText[currentTypingIndex + 1] : undefined;
  const nextJamo = currentTargetChar
    ? getNextJamo(currentTargetChar, currentInputChar, nextTargetChar)
    : null;

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')} `;
  };

  // -- RENDER: LOBBY (REDESIGN V2 - Minimalist) --
  if (gameState === 'lobby') {
    return (
      <div className="h-screen w-screen overflow-hidden bg-slate-50 flex flex-col items-center justify-center relative font-sans">
        {/* Ambient Background */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-100/50 rounded-full blur-[120px] animate-float-slow"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-50/60 rounded-full blur-[120px] animate-float-slower"></div>
        </div>

        <style>{`
    .animate - float - slow { animation: float 8s ease -in -out infinite; }
                    .animate - float - slower { animation: float 12s ease -in -out infinite reverse; }
@keyframes float {
    0 % { transform: translate(0, 0); }
    50 % { transform: translate(10px, -10px); }
    100 % { transform: translate(0, 0); }
}
`}</style>

        <main className="relative z-10 w-full max-w-6xl px-8 flex flex-col items-center">
          {/* Header */}
          <div className="text-center mb-16 space-y-3 relative w-full">
            {/* Back Button */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 hidden md:block">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all font-medium text-sm group"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                {t('typingLobby.back')}
              </button>
            </div>

            <div className="md:hidden absolute left-0 top-0">
              <button onClick={() => navigate('/dashboard')} className="p-2 text-slate-400">
                <ArrowLeft className="w-6 h-6" />
              </button>
            </div>

            <h1 className="text-5xl lg:text-7xl font-extrabold text-slate-800 tracking-tight">
              Duhan<span className="text-blue-500">.</span>
            </h1>
            <p className="text-slate-400 font-medium text-xl lg:text-2xl tracking-wide">
              {t('typingLobby.subtitle')}
            </p>
          </div>

          {/* Mode Selection Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
            {/* WORD MODE */}
            <button
              onClick={() => {
                setPracticeMode('word');
                setGameState('playing');
                // Auto-select first course if none and courses are loaded
                if (!selectedCourseId && courses.length > 0) {
                  // Default to first course of first group
                  const firstCourse = courses[0];
                  setSelectedCourseId(firstCourse._id);
                  setSelectedCourseName(firstCourse.name);
                  setSelectedUnitId(1);
                }
                // Reset stats
                reset();
                setElapsedTime(0);
                setSentencesCompleted(0);
                setTotalCharactersTyped(0);
              }}
              className="mode-card bg-white rounded-[2.5rem] p-8 lg:p-12 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col items-center text-center group relative overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="w-20 h-20 rounded-3xl bg-orange-100 text-4xl flex items-center justify-center mb-8 shadow-sm group-hover:scale-110 transition-transform duration-300 relative z-10">
                🍎
              </div>
              <h2 className="text-3xl font-bold text-slate-800 mb-3 relative z-10">
                {t('typingLobby.word.title')}
              </h2>
              <div className="text-slate-400 font-medium leading-relaxed relative z-10 whitespace-pre-wrap">
                {t('typingLobby.word.desc')}
              </div>
              <div className="mt-8 py-3 px-8 rounded-full bg-slate-50 text-slate-600 font-bold text-sm group-hover:bg-orange-500 group-hover:text-white transition-colors relative z-10">
                {t('typingLobby.word.tag')}
              </div>
            </button>

            {/* SENTENCE MODE */}
            <button
              onClick={() => {
                setPracticeMode('sentence');

                // Reset stats first
                setGameState('playing');
                reset();
                setElapsedTime(0);
                setSentencesCompleted(0);
                setTotalCharactersTyped(0);

                // Force refresh content logic
                if (!selectedCategory && PRACTICE_CATEGORIES.length > 0) {
                  // First time load
                  const cat = PRACTICE_CATEGORIES[0];
                  setSelectedCategory(cat);
                  const queue = generateQueue(cat);
                  setSentenceQueue(queue);
                  setTargetText(queue[0]);
                } else if (selectedCategory) {
                  // Re-entering mode: Ensure target text is robust
                  // If queue is empty/stale, regenerate
                  if (sentenceQueue.length === 0) {
                    const queue = generateQueue(selectedCategory);
                    setSentenceQueue(queue);
                    setTargetText(queue[0]);
                  } else {
                    // Restore from queue (fix: protect against stale state)
                    setTargetText(sentenceQueue[0]);
                  }
                }
              }}
              className="mode-card bg-white rounded-[2.5rem] p-8 lg:p-12 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col items-center text-center group relative overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ring-4 ring-blue-50/50"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="w-24 h-24 rounded-3xl bg-blue-500 text-white text-5xl flex items-center justify-center mb-8 shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform duration-300 relative z-10">
                📝
              </div>
              <h2 className="text-4xl font-extrabold text-slate-800 mb-3 relative z-10">
                {t('typingLobby.sentence.title')}
              </h2>
              <div className="text-slate-400 font-medium leading-relaxed relative z-10 whitespace-pre-wrap">
                {t('typingLobby.sentence.desc')}
              </div>
              <div className="mt-8 py-3 px-8 rounded-full bg-slate-50 text-slate-600 font-bold text-sm group-hover:bg-blue-600 group-hover:text-white transition-colors relative z-10">
                {t('typingLobby.sentence.tag')}
              </div>
            </button>

            {/* PARAGRAPH MODE */}
            <button
              onClick={() => {
                setPracticeMode('paragraph');

                // Reset stats
                setGameState('playing');
                reset();
                setElapsedTime(0);
                setSentencesCompleted(0);
                setTotalCharactersTyped(0);

                // Auto-select logic
                if (!selectedParagraph && PRACTICE_PARAGRAPHS.length > 0) {
                  const p = PRACTICE_PARAGRAPHS[0];
                  setSelectedParagraph(p);
                  setTargetText(p.text);
                } else if (selectedParagraph) {
                  // Re-enter: Force update target text to paragraph text
                  setTargetText(selectedParagraph.text);
                }
              }}
              className="mode-card bg-white rounded-[2.5rem] p-8 lg:p-12 border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col items-center text-center group relative overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="w-20 h-20 rounded-3xl bg-indigo-100 text-4xl flex items-center justify-center mb-8 shadow-sm group-hover:scale-110 transition-transform duration-300 relative z-10">
                📜
              </div>
              <h2 className="text-3xl font-bold text-slate-800 mb-3 relative z-10">
                {t('typingLobby.paragraph.title')}
              </h2>
              <div className="text-slate-400 font-medium leading-relaxed relative z-10 whitespace-pre-wrap">
                {t('typingLobby.paragraph.desc')}
              </div>
              <div className="mt-8 py-3 px-8 rounded-full bg-slate-50 text-slate-600 font-bold text-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors relative z-10">
                {t('typingLobby.paragraph.tag')}
              </div>
            </button>
          </div>

          {/* Footer */}
          <div className="mt-16 flex items-center gap-2 text-slate-300 text-sm font-medium">
            <span>{t('typingLobby.footer.press')}</span>
            <kbd className="px-2 py-0.5 rounded bg-white border border-slate-200 text-xs font-bold text-slate-500">
              TAB
            </kbd>
            <span>{t('typingLobby.footer.switch')}</span>
          </div>
        </main>
      </div>
    );
  }

  // -- RENDER: GAME (SOFT POP REDESIGN V3) --
  return (
    <div
      className="typing-practice-container flex h-screen font-sans overflow-hidden bg-white"
      onClick={() => practiceMode === 'sentence' && inputRef.current?.focus()}
    >
      <style>
        {keyboardThemeStyles} {englishKeyStyles}
      </style>
      <style>{`
    .hg - button { position: relative!important; }
`}</style>

      {/* LEFT SIDEBAR - Floating Glass Panel */}
      <aside className="w-[280px] flex-shrink-0 sidebar-glass flex flex-col z-20 shadow-sm transition-all duration-300 hidden md:flex border-r border-slate-200/60">
        {/* Back Button */}
        <div
          className="p-6 flex items-center gap-3 cursor-pointer hover:bg-slate-50/80 transition-colors border-b border-slate-100"
          onClick={() => setGameState('lobby')}
        >
          <ArrowLeft className="w-5 h-5 text-slate-400" />
          <span className="text-sm font-bold text-slate-500">Back onto Lobby</span>
        </div>

        {/* Title / Mode */}
        <div className="px-6 py-6 flex flex-col items-center">
          <div className="bg-slate-800 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-slate-200/50 mb-6 transform hover:scale-105 transition-transform">
            {practiceMode === 'word'
              ? t('typingLobby.word.title')
              : practiceMode === 'paragraph'
                ? t('typingLobby.paragraph.title')
                : t('typingLobby.sentence.title')}
          </div>

          {/* Source Selector */}
          <div className="w-full">
            {practiceMode === 'word' ? (
              <div className="space-y-2">
                {/* Course Selector */}
                {/* Course Selector Group */}
                <div className="space-y-2">
                  {/* 1. Course Name Selector */}
                  <div className="relative group">
                    <select
                      value={selectedCourseName}
                      onChange={e => {
                        const newName = e.target.value;
                        setSelectedCourseName(newName);

                        // Auto-select first volume for this course name
                        const variants = coursesByName[newName] || [];
                        if (variants.length > 0) {
                          // Sort variants if needed, or rely on fetch order (usually consistent)
                          // Optional: numeric sort by volume/level if fields are consistent
                          setSelectedCourseId(variants[0]._id);
                        }
                        setSelectedUnitId(1);
                        reset();
                      }}
                      className="w-full appearance-none bg-white rounded-2xl p-3 pl-4 pr-8 border border-slate-100 shadow-sm text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
                    >
                      <option value="" disabled>
                        Select Course
                      </option>
                      {Object.keys(coursesByName).map(name => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                      <svg
                        className="h-4 w-4 text-slate-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* 2. Volume/Level Selector (Only if course selected) */}
                  {selectedCourseName && (
                    <div className="relative group">
                      <select
                        value={selectedCourseId}
                        onChange={e => {
                          setSelectedCourseId(e.target.value);
                          setSelectedUnitId(1);
                          reset();
                        }}
                        className="w-full appearance-none bg-white rounded-2xl p-3 pl-4 pr-8 border border-slate-100 shadow-sm text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
                      >
                        {(() => {
                          const uniqueOptions = new Map<
                            string,
                            { id: string; label: string; sortKey: number }
                          >();

                          coursesByName[selectedCourseName]?.forEach(c => {
                            // Priority: displayLevel > levels array
                            let level = parseInt(c.displayLevel || '0');
                            let volume = 0;
                            let label = c.displayLevel || c.volume || '1'; // Default label base

                            // If displayLevel is missing, try extracting from levels array
                            if (level === 0 && c.levels && c.levels.length > 0) {
                              const first = c.levels[0];
                              if (typeof first === 'object' && first !== null && 'level' in first) {
                                level = first.level;
                              } else if (typeof first === 'number') {
                                level = first;
                              }
                            }

                            // Try to parse "1-1" format from volume strings
                            const levelVolMatch = c.volume?.match(/^(\d+)-(\d+)$/);

                            // Determine display Label and Sort Key
                            if (levelVolMatch) {
                              level = parseInt(levelVolMatch[1]);
                              volume = parseInt(levelVolMatch[2]);
                              label = t('typingLobby.volumeWithLevel', {
                                level: level,
                                volume: volume,
                              });
                            } else if (level > 0 && c.volume) {
                              volume = parseInt(c.volume) || 0;
                              label = t('typingLobby.volumeWithLevel', {
                                level: level,
                                volume: c.volume,
                              });
                            } else if (c.volume && !isNaN(Number(c.volume))) {
                              volume = parseInt(c.volume);
                              label = t('typingLobby.volumeOnly', { volume: c.volume });
                            } else if (c.volume) {
                              label = c.volume;
                            }

                            // Create a sort key: Level * 100 + Volume + extra for unique sorting if needed
                            // e.g. Level 1 Vol 1 -> 101, Level 1 Vol 2 -> 102
                            // Use 0 for volume if parsing failed but we have level, to ensure it sorts somehow.
                            const sortKey = level * 100 + (volume || 0);

                            // Deduplicate: If label exists, keep existing.
                            // Note: Since we fixed the level extraction, we expect unique labels for "Level X Vol Y".
                            if (!uniqueOptions.has(label)) {
                              uniqueOptions.set(label, { id: c._id, label, sortKey });
                            }
                          });

                          return Array.from(uniqueOptions.values())
                            .sort((a, b) => a.sortKey - b.sortKey)
                            .map(opt => (
                              <option key={opt.id} value={opt.id}>
                                {opt.label}
                              </option>
                            ));
                        })()}
                      </select>
                      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                        <svg
                          className="h-4 w-4 text-slate-300"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
                {/* Unit Selector */}
                <div className="relative group">
                  <select
                    value={selectedUnitId}
                    onChange={e => {
                      setSelectedUnitId(Number(e.target.value));
                      reset();
                    }}
                    className="w-full appearance-none bg-white rounded-2xl p-3 pl-4 pr-8 border border-slate-100 shadow-sm text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
                  >
                    {Array.from({ length: 20 }, (_, i) => i + 1).map(unit => (
                      <option key={unit} value={unit}>
                        Unit {unit}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                    <svg
                      className="h-4 w-4 text-slate-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            ) : practiceMode === 'paragraph' ? (
              <div className="relative group">
                <select
                  value={selectedParagraph?.id || ''}
                  onChange={e => {
                    const para = PRACTICE_PARAGRAPHS.find(p => p.id === e.target.value);
                    if (para) {
                      setSelectedParagraph(para);
                      setTargetText(para.text);
                      reset();
                      // Reset other stats if needed
                      setElapsedTime(0);
                      setSentencesCompleted(0);
                      setTotalCharactersTyped(0);
                    }
                  }}
                  className="w-full appearance-none bg-white rounded-2xl p-3 pl-4 pr-8 border border-slate-100 shadow-sm text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
                >
                  {PRACTICE_PARAGRAPHS.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                  <svg
                    className="h-4 w-4 text-slate-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            ) : (
              <div className="relative group">
                <select
                  value={selectedCategory?.id || ''}
                  onChange={e => {
                    const category = PRACTICE_CATEGORIES.find(c => c.id === e.target.value);
                    if (category && gameState === 'playing') {
                      setSelectedCategory(category);
                      const queue = generateQueue(category);
                      setSentenceQueue(queue);
                      setTargetText(queue[0]);
                      reset();
                    }
                  }}
                  className="w-full appearance-none bg-white rounded-2xl p-3 pl-12 pr-8 border border-slate-100 shadow-sm text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-lg filter grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                  {selectedCategory?.icon || '📝'}
                </div>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                  <svg
                    className="h-4 w-4 text-slate-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Progress Stats */}
        <div className="flex-1 px-6 space-y-4 overflow-y-auto">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            My Stats
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-50/50 transition-transform hover:scale-[1.02]">
            <div className="flex justify-between items-end mb-2">
              <span className="text-xs text-slate-500 font-medium">Time</span>
              <span className="text-lg font-mono font-bold text-slate-700 tabular-nums">
                {formatTime(elapsedTime)}
              </span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-blue-500 w-full h-full rounded-full origin-left animate-[progress_1s_ease-out]"
                style={{ transform: `scaleX(${Math.min(elapsedTime / 60, 1)})` }}
              ></div>
            </div>
          </div>

          {/* Progress Count (Paragraph Mode Only) */}
          {practiceMode === 'paragraph' && (
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-50/50 transition-transform hover:scale-[1.02]">
              <div className="flex justify-between items-end mb-2">
                <span className="text-xs text-slate-500 font-medium">Progress</span>
                <span className="text-sm font-bold text-slate-700 tabular-nums">
                  <span className="text-blue-600">{currentTypingIndex}</span>
                  <span className="text-slate-300 mx-1">/</span>
                  {targetText.length}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 w-full h-full rounded-full origin-left transition-transform duration-300"
                  style={{
                    transform: `scaleX(${targetText.length > 0 ? currentTypingIndex / targetText.length : 0})`,
                  }}
                ></div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-50/50 text-center transition-transform hover:scale-[1.02]">
              <div className="text-[10px] text-slate-400 font-bold mb-1">WPM</div>
              <div className="text-xl font-bold text-blue-600 tabular-nums">
                {Math.round(stats.wpm)}
              </div>
            </div>
            <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-50/50 text-center transition-transform hover:scale-[1.02]">
              <div className="text-[10px] text-slate-400 font-bold mb-1">Accuracy</div>
              <div className="text-xl font-bold text-emerald-500 tabular-nums">
                {stats.accuracy.toFixed(0)}%
              </div>
            </div>
          </div>

          {/* Highest Record */}
          <div className="bg-white/50 p-3 rounded-2xl border border-slate-50 text-center">
            <span className="text-[10px] text-slate-400">Best Record</span>
            <div className="text-sm font-bold text-slate-600">{userStats?.highestWpm || 0} WPM</div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-white/30">
          <button
            onClick={endSession}
            className="w-full py-3.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span>Stop Practice</span>
          </button>
          <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-slate-400 font-medium">
            <div className="w-6 h-6 rounded-full bg-slate-200 overflow-hidden">
              {user?.avatar ? (
                <img src={user.avatar} alt="User" className="w-full h-full object-cover" />
              ) : (
                <Ghost className="w-3 h-3 text-slate-500 m-auto mt-1.5" />
              )}
            </div>
            <span>Logged in as {user?.name || 'Guest'}</span>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col relative z-10">
        {practiceMode === 'word' ? (
          courseWords ? (
            <WordPractice
              words={courseWords.map(w => ({ id: w._id, word: w.word, meaning: w.meaning }))}
              onComplete={handleWordComplete}
              onStatsUpdate={stats => {
                setSessionStats({
                  wpm: stats.wpm,
                  accuracy: stats.accuracy,
                  errorCount: stats.errorCount,
                  duration: stats.duration,
                });
              }}
              onBack={() => setGameState('lobby')}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400 font-medium animate-pulse">
              Loading words...
            </div>
          )
        ) : practiceMode === 'paragraph' ? (
          /* PARAGRAPH MODE RENDERING */
          <div className="flex-1 flex flex-col items-center justify-start bg-white min-h-0 w-full overflow-y-auto custom-scrollbar">
            <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center gap-8 py-10 px-8 flex-1">
              {/* Paragraph Text - Frameless */}
              <div
                className="w-full leading-loose text-left relative cursor-text"
                onClick={() => inputRef.current?.focus()}
              >
                <div className="text-2xl font-medium tracking-tight break-words whitespace-pre-wrap select-none leading-relaxed">
                  {targetText.split('').map((char, idx) => {
                    const isCompleted = idx < currentTypingIndex;
                    const isCurrent = idx === currentTypingIndex;
                    // const isRemaining = idx > currentTypingIndex;

                    const hasInput = userInput[idx];

                    return (
                      <span
                        key={idx}
                        id={isCurrent ? 'active-char' : undefined}
                        className={`
transition - colors duration - 100
                                                    ${isCompleted ? 'text-slate-900' : 'text-slate-300'}
                                                    ${isCurrent ? 'bg-blue-100 text-blue-600 relative rounded-sm' : ''}
`}
                      >
                        {/* Show cursor on current char */}
                        {isCurrent && isFocused && (
                          <span className="absolute -left-[1px] top-1 bottom-1 w-[2px] bg-blue-500 animate-pulse"></span>
                        )}

                        {/* If current and has input, show input, else target */}
                        {isCurrent && hasInput ? hasInput : char === ' ' ? '\u00A0' : char}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="text-slate-400 text-sm">
                {selectedParagraph?.title} • {formatTime(elapsedTime)}
              </div>
            </div>

            {/* KEYBOARD AREA - Raised Deck (Shared Style) */}
            <div className="flex-shrink-0 bg-white border-t border-slate-100 py-3 px-4 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] z-30 w-full">
              <div className="w-full max-w-[90rem] mx-auto flex flex-col gap-3">
                {/* Helper Text */}
                <div className="flex justify-between items-center px-4">
                  <div className="text-xs font-bold text-slate-400 flex items-center gap-2">
                    <span
                      className={`w - 2 h - 2 rounded - full ${hasError ? 'bg-red-500' : 'bg-blue-500'} animate - pulse`}
                    ></span>
                    <span>Next Key:</span>
                    <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-[11px] border border-blue-100">
                      {nextJamo || 'Enter'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-300 font-mono tracking-widest">
                    2-SET KOREAN
                  </div>
                </div>

                {/* Keyboard Component */}
                <div className="p-3 bg-slate-100/50 rounded-3xl border border-slate-200/60 select-none">
                  <KeyboardHints
                    nextJamo={nextJamo}
                    targetChar={currentTargetChar}
                    hasError={hasError}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Center Stage - Flexible Layout */}
            <div className="flex-1 flex flex-col items-center justify-evenly bg-white min-h-0 w-full">
              <div className="w-full h-full flex flex-col items-center justify-center gap-4 lg:gap-10 flex-1">
                {/* Target Sentence Card - Hero Style (Full Screen) */}
                <div className="bg-white rounded-[2rem] p-8 lg:p-16 text-center relative overflow-visible shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)] border border-white/80 group w-full transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-transparent rounded-[2rem]"></div>

                  <div className="relative z-10">
                    <p className="text-lg md:text-2xl lg:text-3xl font-bold leading-relaxed tracking-tight break-keep select-none">
                      {targetText.split('').map((char, idx) => {
                        const isCompleted = idx < currentTypingIndex;
                        const isCurrent = idx === currentTypingIndex;
                        const isRemaining = idx > currentTypingIndex;

                        const hasInput = userInput[idx];

                        return (
                          <span
                            key={idx}
                            className={`
transition - all duration - 150 inline - block
                                                            ${isCompleted ? 'text-slate-800' : ''}
                                                            ${isCurrent ? 'text-slate-900 scale-110 transform cursor-text relative' : ''}
                                                            ${isRemaining ? 'text-slate-300' : ''}
`}
                            style={
                              isCurrent
                                ? {
                                    textShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                  }
                                : undefined
                            }
                          >
                            {/* If current and has input, show input. Otherwise show target char */}
                            {isCurrent && hasInput ? hasInput : char === ' ' ? '\u00A0' : char}

                            {/* Show target ghost if input is partial/different */}
                            {isCurrent && hasInput && hasInput !== char && (
                              <span className="absolute top-full left-1/2 -translate-x-1/2 text-xs text-blue-300 opacity-70 mt-1 pointer-events-none">
                                {char}
                              </span>
                            )}

                            {/* Blinking Cursor Caret */}
                            {isCurrent && isFocused && (
                              <span className="absolute -right-1 top-1 bottom-1 w-0.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_4px_rgba(59,130,246,0.6)]"></span>
                            )}
                          </span>
                        );
                      })}
                    </p>
                  </div>

                  {/* Focus Indicator */}
                  {!isFocused && (
                    <div
                      className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px] rounded-[2rem] z-20 transition-all cursor-pointer"
                      onClick={() => inputRef.current?.focus()}
                    >
                      <div className="bg-blue-500 text-white px-6 py-2 rounded-full font-bold shadow-lg transform -translate-y-2 animate-bounce">
                        Click to Focus
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Visual - Floating Pill */}
                <div
                  className={`
w - full max - w - xl bg - white rounded - 2xl p - 3 lg: p - 4 flex items - center justify - center border - 2 transition - all duration - 200
                                    ${isFocused ? 'border-blue-100 shadow-lg shadow-blue-500/5 -translate-y-1' : 'border-transparent shadow-sm'}
`}
                >
                  <span className="text-lg lg:text-xl font-medium text-slate-800 mr-1 opacity-50 select-none">
                    {userInput.slice(-15) || (
                      <span className="text-slate-300 text-sm">Start typing...</span>
                    )}
                  </span>
                  {/* Custom Cursor */}
                  {isFocused && (
                    <span className="w-0.5 h-6 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span>
                  )}
                </div>

                {/* Upcoming Sentences - Faded Stack (Expanded) */}
                <div className="flex flex-col items-center gap-1.5 lg:gap-2 w-full mt-2">
                  {sentenceQueue.slice(1, 4).map((sent, idx) => (
                    <div
                      key={idx}
                      className={`
rounded - xl text - center font - medium transition - all duration - 500 truncate
                                                ${idx === 0 ? 'w-[85%] bg-white/60 p-3 text-base text-slate-500 shadow-sm' : 'w-[75%] bg-white/30 p-2 text-sm text-slate-400'}
`}
                    >
                      <p className="truncate px-2">{sent}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* KEYBOARD AREA - Raised Deck */}
            <div className="flex-shrink-0 bg-white border-t border-slate-100 py-3 px-4 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] z-30 w-full">
              <div className="w-full max-w-[90rem] mx-auto flex flex-col gap-3">
                {/* Helper Text */}
                <div className="flex justify-between items-center px-4">
                  <div className="text-xs font-bold text-slate-400 flex items-center gap-2">
                    <span
                      className={`w - 2 h - 2 rounded - full ${hasError ? 'bg-red-500' : 'bg-blue-500'} animate - pulse`}
                    ></span>
                    <span>Next Key:</span>
                    <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-[11px] border border-blue-100">
                      {nextJamo || 'Enter'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-300 font-mono tracking-widest">
                    2-SET KOREAN
                  </div>
                </div>

                {/* Keyboard Component */}
                <div className="p-3 bg-slate-100/50 rounded-3xl border border-slate-200/60 select-none">
                  <KeyboardHints
                    nextJamo={nextJamo}
                    targetChar={currentTargetChar}
                    hasError={hasError}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        <Toaster />
      </main>

      {(practiceMode === 'sentence' || practiceMode === 'paragraph') && (
        <HiddenInput
          ref={inputRef}
          value={userInput}
          onChange={() => {}}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      )}

      {/* Existing Modal Logic Kept */}
      <TypingResultsModal
        isOpen={showResultsModal}
        onClose={handleQuit}
        onRetry={handleRetry}
        wpm={sessionStats.wpm}
        accuracy={sessionStats.accuracy}
        errorCount={sessionStats.errorCount}
        duration={sessionStats.duration}
        targetWpm={targetWpm}
        highestWpm={userStats?.highestWpm || 0}
        userAvatar={user?.avatar}
      />
    </div>
  );
};

export default TypingPage;
