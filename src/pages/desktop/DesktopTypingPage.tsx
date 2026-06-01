import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../convex/_generated/api';
import { TYPING, VOCAB } from '../../utils/convexRefs';
import { DesktopCard } from '../../components/desktop/ui/DesktopCard';
import { DesignChip } from '../../components/desktop/ui/DesignChip';
import { useKoreanTyping } from '../../features/typing/hooks/useKoreanTyping';
import { DesktopKeyboardHints } from '../../features/typing/components/DesktopKeyboardHints';
import {
  PRACTICE_CATEGORIES,
  PRACTICE_PARAGRAPHS,
  PracticeCategory,
  PracticeParagraph,
} from '../../features/typing/data/practiceTexts';
import { RefreshCw, ArrowLeft, Play, Trophy, Keyboard, Type, FileText } from 'lucide-react';

type GameState = 'lobby' | 'category-selection' | 'practicing' | 'results';
type TypingMode = 'sentence' | 'word' | 'paragraph';
type TypingGameData = PracticeCategory | PracticeParagraph | { courseId: string; title: string };
type TypingSessionResults = {
  wpm: number;
  accuracy: number;
  errorCount: number;
  startTime?: number | null;
};

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

export default function DesktopTypingPage() {
  const { t } = useTranslation('public');
  const [gameState, setGameState] = useState<GameState>('lobby');
  const [mode, setMode] = useState<TypingMode>('sentence');
  const [selectedData, setSelectedData] = useState<TypingGameData | null>(null);

  // Results and Session State
  const [queue, setQueue] = useState<string[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [sessionResults, setSessionResults] = useState<TypingSessionResults | null>(null);

  // Stats from DB
  const userStats = useQuery(api.typing.getUserStats);
  const saveRecord = useMutation(TYPING.saveRecord);

  // Course Data for Word Mode
  const rawCourses = useQuery(api.institutes.getAll);
  const courses = useMemo(() => rawCourses || [], [rawCourses]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  const targetText = queue[queueIndex] || '';
  const { userInput, completedIndex, phase, stats, inputRef, reset, getNextJamo } = useKoreanTyping(
    targetText,
    mode
  );

  const handleCompleteSession = useCallback(async () => {
    setGameState('results');
    setSessionResults(stats);

    try {
      await saveRecord({
        practiceMode: mode,
        wpm: stats.wpm,
        accuracy: stats.accuracy,
        errorCount: stats.errorCount,
        duration: Math.floor((Date.now() - (stats.startTime || Date.now())) / 1000),
        charactersTyped: completedIndex,
        sentencesCompleted: queue.length,
        targetWpm: 40,
        isTargetAchieved: stats.wpm >= 40,
      });
    } catch (e) {
      console.error('Failed to save record:', e);
    }
  }, [completedIndex, mode, queue.length, saveRecord, stats]);

  // Practice logic: Next item or Finish
  useEffect(() => {
    if (phase === 'finish' && gameState === 'practicing') {
      const timer = setTimeout(() => {
        if (queueIndex < queue.length - 1) {
          setQueueIndex(prev => prev + 1);
          reset();
        } else {
          void handleCompleteSession();
        }
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [gameState, handleCompleteSession, phase, queue.length, queueIndex, reset]);

  const startPracticing = (selectedMode: TypingMode, data: TypingGameData, textList: string[]) => {
    if (textList.length === 0) return;
    setMode(selectedMode);
    setSelectedData(data);
    const shuffled = deterministicShuffle(textList);
    setQueue(selectedMode === 'paragraph' ? [textList[0]] : shuffled.slice(0, 10)); // Limit to 10 for word/sentence
    setQueueIndex(0);
    setGameState('practicing');
    reset();
    // Ensure focus after state change
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Helper to get words for a course
  const courseWords = useQuery(
    VOCAB.getOfCourse,
    mode === 'word' && selectedCourseId ? { courseId: selectedCourseId, unitId: 1 } : 'skip'
  );
  const selectedCourseWords = useMemo(
    () =>
      courseWords?.flatMap(word =>
        typeof word.word === 'string' && word.word.length > 0 ? [word.word] : []
      ) ?? [],
    [courseWords]
  );
  const isWordQueueReady = mode !== 'word' || !selectedCourseId || selectedCourseWords.length > 0;
  const targetCharacters = useMemo(() => Array.from(targetText), [targetText]);
  const currentTargetChar = targetCharacters[completedIndex] || '';
  const nextTargetChar = targetCharacters[completedIndex + 1];
  const nextJamo = useMemo(
    () => getNextJamo(currentTargetChar, userInput[completedIndex] || '', nextTargetChar),
    [completedIndex, currentTargetChar, getNextJamo, nextTargetChar, userInput]
  );
  const characterStates = useMemo(
    () =>
      targetCharacters.map((char, idx) => {
        const isCompleted = idx < completedIndex;
        const isCurrent = idx === completedIndex;
        let color = 'rgba(31,27,23,0.3)';
        let bgColor = 'transparent';

        if (isCompleted) color = 'var(--color-k-mint-deep)';
        if (isCurrent) {
          color = 'var(--color-k-ink)';
          bgColor = 'var(--color-k-butter)';
        }

        return {
          char,
          idx,
          isCurrent,
          color,
          bgColor,
        };
      }),
    [completedIndex, targetCharacters]
  );

  const renderLobby = () => (
    <div className="max-w-[1000px] mx-auto py-8 px-6">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <div className="text-[12px] font-bold text-k-crimson tracking-[3px] mb-1">
            寫 · TYPING
          </div>
          <h1 className="text-[32px] font-extrabold text-k-ink tracking-[-0.8px]">
            {t('typingLobby.title', 'Typing Practice')}
          </h1>
          <p className="text-k-sub mt-1 font-medium">
            {t(
              'typing.mobile.lobbyIntro',
              'Build rhythm with sentence, word, and paragraph drills.'
            )}
          </p>
        </div>

        {userStats && (
          <div className="flex gap-4">
            <DesktopCard pad={14} className="min-w-[120px] text-center">
              <div className="text-[10px] font-bold text-k-sub uppercase mb-1 tracking-wider">
                {t('typing.mobile.bestWpm', 'Best WPM')}
              </div>
              <div className="text-[22px] font-black text-k-ink">{userStats.highestWpm}</div>
            </DesktopCard>
            <DesktopCard pad={14} className="min-w-[120px] text-center">
              <div className="text-[10px] font-bold text-k-sub uppercase mb-1 tracking-wider">
                {t('typingGame.accuracy', 'Accuracy')}
              </div>
              <div className="text-[22px] font-black text-k-mint-deep">
                {userStats.averageAccuracy}%
              </div>
            </DesktopCard>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {[
          {
            id: 'word',
            title: t('typingLobby.word.title', 'Word'),
            desc: t('typingLobby.word.desc', 'Practice individual words to build muscle memory.'),
            icon: <Type className="w-8 h-8" />,
            tone: 'var(--color-k-lilac)',
          },
          {
            id: 'sentence',
            title: t('typingLobby.sentence.title', 'Sentence'),
            desc: t('typingLobby.sentence.desc', 'Type common phrases and daily expressions.'),
            icon: <Keyboard className="w-8 h-8" />,
            tone: 'var(--color-k-sky)',
          },
          {
            id: 'paragraph',
            title: t('typingLobby.paragraph.title', 'Paragraph'),
            desc: t('typingLobby.paragraph.desc', 'Immerse yourself in poems and longer texts.'),
            icon: <FileText className="w-8 h-8" />,
            tone: 'var(--color-k-butter)',
          },
        ].map(m => (
          <button
            key={m.id}
            onClick={() => {
              setMode(m.id as TypingMode);
              setGameState('category-selection');
            }}
            className="group relative flex flex-col text-left transition-all hover:-translate-y-1 active:scale-[0.98]"
          >
            <DesktopCard
              pad={32}
              className="h-full border-2 border-transparent hover:border-k-line transition-colors overflow-hidden"
            >
              <div
                className="w-16 h-16 rounded-[22px] flex items-center justify-center mb-6 transition-transform group-hover:scale-110"
                style={{ backgroundColor: m.tone, color: '#FFFFFF' }}
              >
                {m.icon}
              </div>
              <h3 className="text-[22px] font-black text-k-ink mb-3 tracking-tight">{m.title}</h3>
              <p className="text-k-sub leading-relaxed font-medium text-[14px]">{m.desc}</p>

              <div className="mt-8 flex items-center text-k-ink font-bold text-[13px]">
                {t('common.start', 'Start Now')}{' '}
                <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
              </div>

              {/* Decorative element */}
              <div className="absolute -bottom-4 -right-4 opacity-[0.03] pointer-events-none transform rotate-12 scale-150">
                {m.icon}
              </div>
            </DesktopCard>
          </button>
        ))}
      </div>
    </div>
  );

  const renderCategorySelection = () => (
    <div className="max-w-[1000px] mx-auto py-8 px-6">
      <button
        onClick={() => setGameState('lobby')}
        className="flex items-center gap-2 text-k-sub hover:text-k-ink font-bold text-[14px] mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> {t('common.back', 'Back to Lobby')}
      </button>

      <h2 className="text-[28px] font-black text-k-ink mb-8 tracking-tight">
        {mode === 'word'
          ? t('typingLobby.word.title')
          : mode === 'sentence'
            ? t('typingLobby.sentence.title')
            : t('typingLobby.paragraph.title')}{' '}
        · {t('common.select', 'Select Content')}
      </h2>

      {mode === 'word' ? (
        <div className="grid grid-cols-2 gap-6">
          {courses.map(course => (
            <div
              key={course._id}
              onClick={() => {
                setSelectedCourseId(course._id);
                // In a real app, you'd wait for courseWords or pass a callback
              }}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setSelectedCourseId(course._id);
                }
              }}
              role="button"
              tabIndex={0}
              className="group text-left cursor-pointer"
            >
              <DesktopCard
                pad={24}
                className={`transition-all hover:border-k-ink/30 border-2 ${selectedCourseId === course._id ? 'border-k-ink bg-k-ink/5' : 'border-transparent'}`}
              >
                <div className="flex items-center justify-between mb-4">
                  <DesignChip tone="lilac">{course.displayLevel || 'Level'}</DesignChip>
                  {selectedCourseId === course._id && (
                    <div className="text-k-ink font-bold text-xs">SELECTED</div>
                  )}
                </div>
                <div className="text-[18px] font-black text-k-ink mb-1">{course.name}</div>
                <div className="text-k-sub font-medium text-sm">
                  {course.volume || 'Standard Volume'}
                </div>

                {selectedCourseId === course._id && (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      startPracticing(
                        'word',
                        { courseId: course._id, title: course.name },
                        selectedCourseWords
                      );
                    }}
                    disabled={!isWordQueueReady}
                    className="mt-6 w-full py-3 bg-k-ink text-k-bg rounded-xl font-bold flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]"
                  >
                    <Play className="w-4 h-4 fill-current" />{' '}
                    {isWordQueueReady
                      ? t('typing.mobile.startWordPractice')
                      : t('common.loading', 'Loading...')}
                  </button>
                )}
              </DesktopCard>
            </div>
          ))}
        </div>
      ) : mode === 'sentence' ? (
        <div className="grid grid-cols-2 gap-6">
          {PRACTICE_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => startPracticing('sentence', cat, cat.sentences)}
              className="group text-left"
            >
              <DesktopCard
                pad={24}
                className="h-full border-2 border-transparent hover:border-k-sky/30 transition-all hover:-translate-y-1"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl">{cat.icon}</span>
                  <DesignChip tone="sky">
                    {cat.sentences.length} {t('typing.mobile.sets')}
                  </DesignChip>
                </div>
                <div className="text-[20px] font-black text-k-ink mb-2">{cat.title}</div>
                <p className="text-k-sub font-medium text-sm leading-relaxed">{cat.description}</p>
              </DesktopCard>
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          {PRACTICE_PARAGRAPHS.map(para => (
            <button
              key={para.id}
              onClick={() => startPracticing('paragraph', para, [para.text])}
              className="group text-left"
            >
              <DesktopCard
                pad={24}
                className="h-full border-2 border-transparent hover:border-k-butter/30 transition-all hover:-translate-y-1"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl">📜</span>
                  <DesignChip tone="butter">{t('typing.mobile.longText')}</DesignChip>
                </div>
                <div className="text-[20px] font-black text-k-ink mb-2">{para.title}</div>
                <p className="text-k-sub font-medium text-sm leading-relaxed line-clamp-2">
                  {para.description}
                </p>
              </DesktopCard>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderPracticing = () => {
    return (
      <div className="max-w-[900px] mx-auto py-10 px-6">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DesignChip
              tone={mode === 'word' ? 'lilac' : mode === 'sentence' ? 'sky' : 'butter'}
              size="sm"
            >
              {mode.toUpperCase()}
            </DesignChip>
            <div className="text-[13px] font-bold text-k-sub">
              {selectedData?.title || 'Practice'} · {queueIndex + 1} / {queue.length}
            </div>
          </div>

          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-[10px] font-bold text-k-sub uppercase tracking-wider">WPM</div>
              <div className="text-[20px] font-black text-k-ink tabular-nums">{stats.wpm}</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] font-bold text-k-sub uppercase tracking-wider">ACC</div>
              <div className="text-[20px] font-black text-k-mint-deep tabular-nums">
                {stats.accuracy}%
              </div>
            </div>
          </div>
        </div>

        <DesktopCard
          pad={40}
          className="relative mb-10 min-h-[260px] flex flex-col justify-center overflow-hidden"
        >
          {/* Practice Text Rendering */}
          <div className="relative z-10 font-k-serif text-[32px] leading-[1.6] tracking-tight flex flex-wrap gap-y-2">
            {characterStates.map(({ char, idx, isCurrent, color, bgColor }) => (
              <span
                key={idx}
                className={`relative transition-all duration-150 ${isCurrent ? 'scale-110 font-bold' : ''}`}
                style={{ color, backgroundColor: bgColor, borderRadius: 4, padding: '0 2px' }}
              >
                {char}
              </span>
            ))}
          </div>

          <div className="mt-12 pt-8 border-t border-k-line/30">
            <div className="text-[11px] font-bold text-k-sub uppercase tracking-[2px] mb-4">
              {t('coursesOverview.desktop.typing.yourInput', 'Your Input')}
            </div>
            <div className="relative h-[40px] flex items-center">
              <input
                ref={inputRef}
                type="text"
                autoFocus
                autoComplete="off"
                className="absolute inset-0 opacity-0 cursor-default"
                value={userInput}
                onChange={() => {}} // Handled by useKoreanTyping internal listeners
              />
              <div
                className="text-[24px] font-medium text-k-ink tracking-wide font-k-serif"
                onClick={() => inputRef.current?.focus()}
              >
                {userInput || (
                  <span className="text-k-line">
                    {t('coursesOverview.desktop.typing.clickToStart')}
                  </span>
                )}
                <span className="ml-1 inline-block w-[2px] h-[24px] bg-k-crimson animate-pulse align-middle" />
              </div>
            </div>
          </div>

          {/* Background decoration */}
          <div className="absolute top-4 right-4 text-[120px] font-black text-k-ink/5 pointer-events-none select-none font-k-serif">
            {completedIndex === targetText.length
              ? '✓'
              : mode === 'word'
                ? '詞'
                : mode === 'sentence'
                  ? '文'
                  : '段'}
          </div>
        </DesktopCard>

        {/* Keyboard Hints */}
        <div className="mt-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <DesktopKeyboardHints
            nextJamo={nextJamo}
            targetChar={targetText[completedIndex] || ''}
            hasError={false} // Hook doesn't expose error state directly in this simple version
          />
        </div>

        <div className="mt-8 flex justify-center gap-4">
          <button
            onClick={() => {
              if (confirm('Quit practice?')) setGameState('lobby');
            }}
            className="px-6 py-3 rounded-xl border border-k-line font-bold text-k-sub hover:bg-k-bg2 transition-colors"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            onClick={() => {
              reset();
              inputRef.current?.focus();
            }}
            className="px-6 py-3 rounded-xl border border-k-line font-bold text-k-ink hover:bg-k-bg2 transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> {t('common.restart', 'Restart')}
          </button>
        </div>
      </div>
    );
  };

  const renderResults = () => (
    <div className="max-w-[800px] mx-auto py-16 px-6 text-center">
      <div className="mb-8 inline-flex p-6 rounded-full bg-k-butter/20 text-k-butter">
        <Trophy className="w-16 h-16 fill-current" />
      </div>

      <h2 className="text-[40px] font-black text-k-ink tracking-tighter mb-2">
        {t('typing.mobile.resultsTitle', 'Great Practice!')}
      </h2>
      <p className="text-k-sub font-medium text-lg mb-12">
        {t('typing.mobile.resultsSubtitle', 'Consistency is the key to mastering Korean typing.')}
      </p>

      <div className="grid grid-cols-3 gap-6 mb-12">
        <DesktopCard pad={24}>
          <div className="text-[12px] font-bold text-k-sub uppercase tracking-wider mb-2">
            {t('coursesOverview.desktop.typing.speed')}
          </div>
          <div className="text-[32px] font-black text-k-ink">
            {sessionResults?.wpm} <span className="text-sm font-bold text-k-sub">WPM</span>
          </div>
        </DesktopCard>
        <DesktopCard pad={24}>
          <div className="text-[12px] font-bold text-k-sub uppercase tracking-wider mb-2">
            {t('coursesOverview.desktop.typing.accuracy')}
          </div>
          <div className="text-[32px] font-black text-k-mint-deep">{sessionResults?.accuracy}%</div>
        </DesktopCard>
        <DesktopCard pad={24}>
          <div className="text-[12px] font-bold text-k-sub uppercase tracking-wider mb-2">
            {t('typingGame.errorCount', 'Errors')}
          </div>
          <div className="text-[32px] font-black text-k-crimson">{sessionResults?.errorCount}</div>
        </DesktopCard>
      </div>

      <div className="flex flex-col items-center gap-4">
        <button
          onClick={() => {
            setGameState('practicing');
            setQueueIndex(0);
            reset();
            setTimeout(() => inputRef.current?.focus(), 100);
          }}
          className="w-[240px] py-4 bg-k-ink text-k-bg rounded-2xl font-black text-[16px] shadow-lg hover:scale-[1.02] transition-transform"
        >
          {t('common.tryAgain', 'Try Again')}
        </button>
        <button
          onClick={() => setGameState('lobby')}
          className="w-[240px] py-4 bg-transparent text-k-sub rounded-2xl font-bold text-[15px] hover:text-k-ink transition-colors"
        >
          {t('common.backToDashboard', 'Back to Lobby')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500">
      {gameState === 'lobby' && renderLobby()}
      {gameState === 'category-selection' && renderCategorySelection()}
      {gameState === 'practicing' && renderPracticing()}
      {gameState === 'results' && renderResults()}

      {/* Global CSS for some effects */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
