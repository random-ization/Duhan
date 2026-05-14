import React, { useState, useEffect, useMemo } from 'react';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { RefreshCw, Play } from 'lucide-react';
import { useKoreanTyping, TypingStats } from '../../features/typing/hooks/useKoreanTyping';
import { HiddenInput } from '../../features/typing/components/HiddenInput';
import {
  PRACTICE_CATEGORIES,
  PracticeCategory,
  PRACTICE_PARAGRAPHS,
  PracticeParagraph,
} from '../../features/typing/data/practiceTexts';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Dialog, DialogContent, DialogPortal, Select } from '../ui';
import { hasSafeReturnTo, resolveSafeReturnTo } from '../../utils/navigation';
import { safeGetLocalStorageItem, safeSetLocalStorageItem } from '../../utils/browserStorage';
import { VOCAB } from '../../utils/convexRefs';
import { KT, Chip, HanjaSeal, PageShell } from './ksoft/ksoft';

type TypingMode = 'sentence' | 'word' | 'paragraph';
type GameState = 'lobby' | 'playing' | 'results';
type WordPracticeSelection = { courseId: string; unitId: number };
type TypingGameData = PracticeCategory | PracticeParagraph | WordPracticeSelection;
type TypingUserStats = {
  totalTests: number;
  averageWpm: number;
  averageAccuracy: number;
  highestWpm: number;
  totalTime: number;
  recentWpm: Array<{ wpm: number; date: number }>;
  sessionsThisWeek: number;
  lastPracticeMode: string | null;
  lastCategoryId: string | null;
  latestAccuracy: number | null;
};

function isWordPracticeSelection(data: TypingGameData): data is WordPracticeSelection {
  return 'courseId' in data;
}

function isPracticeCategory(data: TypingGameData): data is PracticeCategory {
  return 'sentences' in data;
}

function isPracticeParagraph(data: TypingGameData): data is PracticeParagraph {
  return 'text' in data;
}

function getPracticeModeLabel(
  mode: string | null,
  t: ReturnType<typeof useTranslation>['t']
): string {
  if (mode === 'word') {
    return t('typingLobby.word.title', { defaultValue: 'Word' });
  }
  if (mode === 'paragraph') {
    return t('typingLobby.paragraph.title', { defaultValue: 'Paragraph' });
  }
  return t('typingLobby.sentence.title', { defaultValue: 'Sentence' });
}

function getTypingErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    if ('data' in error) {
      const data = error.data;
      if (typeof data === 'object' && data !== null && 'message' in data) {
        const message = data.message;
        if (typeof message === 'string' && message.length > 0) {
          return message;
        }
      }
    }
    if ('message' in error) {
      const message = error.message;
      if (typeof message === 'string' && message.length > 0) {
        return message;
      }
    }
  }
  return fallback;
}

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

// ─── Hanja mapping for modes ──────────────────────────────
const MODE_META: Record<TypingMode, { hanja: string; tone: 'sky' | 'lilac' | 'butter' }> = {
  sentence: { hanja: '文', tone: 'sky' },
  word: { hanja: '詞', tone: 'lilac' },
  paragraph: { hanja: '段', tone: 'butter' },
};

// ─── 1. LOBBY ─────────────────────────────────────────────
const MobileLobby = ({
  onStart,
  activeTab,
  setActiveTab,
  onBack,
}: {
  onStart: (mode: TypingMode, data: TypingGameData) => void;
  activeTab: TypingMode;
  setActiveTab: (m: TypingMode) => void;
  onBack: () => void;
}) => {
  const { t } = useTranslation();
  const typingStats = useQuery(api.typing.getUserStats) as TypingUserStats | null | undefined;

  const rawCourses = useQuery(api.institutes.getAll);
  const courses = useMemo(() => rawCourses || [], [rawCourses]);
  const coursesByName = useMemo(() => {
    const groups: Record<string, typeof courses> = {};
    courses.forEach(c => {
      if (!groups[c.name]) groups[c.name] = [];
      groups[c.name].push(c);
    });
    return groups;
  }, [courses]);
  const [selectedCourseName, setSelectedCourseName] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const courseNames = useMemo(() => Object.keys(coursesByName), [coursesByName]);
  const effectiveCourseName = selectedCourseName || courseNames[0] || '';
  const effectiveCourseId = selectedCourseId || coursesByName[effectiveCourseName]?.[0]?._id || '';

  const modes: TypingMode[] = ['sentence', 'word', 'paragraph'];
  const hasTypingStats = Boolean(typingStats && typingStats.totalTests > 0);
  const lastModeLabel = getPracticeModeLabel(typingStats?.lastPracticeMode ?? null, t);

  return (
    <PageShell>
      {/* ── Header ─────────────────────────────────── */}
      <div
        style={{
          padding: '14px 22px 20px',
          paddingTop: 'calc(env(safe-area-inset-top) + 14px)',
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 16,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: KT.sub,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: KT.font,
          }}
        >
          ← {t('common.back', { defaultValue: 'Back' })}
        </button>
        <div
          style={{
            fontFamily: KT.serif,
            fontSize: 13,
            color: KT.crimson,
            letterSpacing: 4,
            marginBottom: 4,
            fontWeight: 500,
          }}
        >
          寫 · TYPING
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, color: KT.ink, letterSpacing: -0.6 }}>
          {t('typingLobby.title', { defaultValue: 'Typing practice' })}
        </div>
        <div style={{ fontSize: 13, color: KT.sub, marginTop: 4 }}>
          {t('typing.mobile.lobbyIntro', {
            defaultValue: 'Build rhythm with sentence, word, and paragraph drills.',
          })}
        </div>

        <div
          style={{
            marginTop: 18,
            background: KT.card,
            borderRadius: 20,
            boxShadow: KT.sh,
            padding: '18px 16px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <span
            style={{
              position: 'absolute',
              right: 10,
              top: 2,
              fontFamily: KT.serif,
              fontSize: 54,
              color: KT.sky,
              opacity: 0.16,
              lineHeight: 1,
              pointerEvents: 'none',
            }}
          >
            記
          </span>

          {typingStats === undefined ? (
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ width: 140, height: 12, borderRadius: 999, background: KT.line2 }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {Array.from({ length: 3 }, (_, index) => (
                  <div
                    key={index}
                    style={{
                      height: 76,
                      borderRadius: 16,
                      background: KT.bg2,
                    }}
                  />
                ))}
              </div>
            </div>
          ) : hasTypingStats && typingStats ? (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: KT.serif,
                      fontSize: 12,
                      color: KT.crimson,
                      letterSpacing: 2,
                      fontWeight: 500,
                      marginBottom: 4,
                    }}
                  >
                    記錄 · PROGRESS
                  </div>
                  <div style={{ fontSize: 19, fontWeight: 800, color: KT.ink }}>
                    {t('typing.mobile.personalBest', { defaultValue: 'Personal best' })}
                  </div>
                </div>
                <Chip tone="sky">
                  {t('typing.mobile.thisWeekCount', {
                    count: typingStats.sessionsThisWeek,
                    defaultValue: `${typingStats.sessionsThisWeek} this week`,
                  })}
                </Chip>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 8,
                  marginTop: 14,
                }}
              >
                {[
                  {
                    seal: '速',
                    label: t('typing.mobile.bestWpm', { defaultValue: 'Best WPM' }),
                    value: `${typingStats.highestWpm}`,
                    tone: KT.ink,
                  },
                  {
                    seal: '均',
                    label: t('typing.mobile.averageWpm', { defaultValue: 'Average' }),
                    value: `${typingStats.averageWpm}`,
                    tone: KT.indigo,
                  },
                  {
                    seal: '精',
                    label: t('typingGame.accuracy', { defaultValue: 'Accuracy' }),
                    value: `${typingStats.averageAccuracy}%`,
                    tone: KT.mintDeep,
                  },
                ].map(item => (
                  <div
                    key={item.seal}
                    style={{
                      background: KT.bg2,
                      borderRadius: 16,
                      padding: '14px 10px',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: KT.serif,
                        fontSize: 14,
                        color: KT.crimson,
                        opacity: 0.82,
                        marginBottom: 4,
                      }}
                    >
                      {item.seal}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: item.tone }}>
                      {item.value}
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        color: KT.sub,
                        fontWeight: 700,
                        marginTop: 2,
                        fontFamily: KT.font,
                      }}
                    >
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  fontSize: 11,
                  color: KT.sub,
                  fontWeight: 700,
                  fontFamily: KT.font,
                }}
              >
                <span>
                  {t('typing.mobile.lastDrill', { defaultValue: 'Last drill' })}: {lastModeLabel}
                </span>
                <span>
                  {t('typing.mobile.totalSessions', {
                    count: typingStats.totalTests,
                    defaultValue: `${typingStats.totalTests} sessions`,
                  })}
                </span>
              </div>
            </>
          ) : (
            <>
              <div
                style={{
                  fontFamily: KT.serif,
                  fontSize: 12,
                  color: KT.crimson,
                  letterSpacing: 2,
                  fontWeight: 500,
                  marginBottom: 4,
                }}
              >
                記錄 · READY
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: KT.ink }}>
                {t('typing.mobile.firstSessionTitle', {
                  defaultValue: 'Set your first typing record',
                })}
              </div>
              <div
                style={{
                  marginTop: 6,
                  fontSize: 13,
                  color: KT.sub,
                  fontWeight: 500,
                  lineHeight: 1.5,
                  maxWidth: '88%',
                }}
              >
                {t('typing.mobile.firstSessionSubtitle', {
                  defaultValue:
                    'Finish one drill and your best speed, weekly sessions, and accuracy will appear here.',
                })}
              </div>
            </>
          )}
        </div>

        {/* ── Mode tabs ────────────────────────────── */}
        <div
          style={{
            marginTop: 18,
            display: 'flex',
            background: 'rgba(31,27,23,0.06)',
            borderRadius: 16,
            padding: 4,
            gap: 4,
            position: 'relative',
          }}
        >
          {modes.map(mode => {
            const isActive = activeTab === mode;
            const meta = MODE_META[mode];
            const label =
              mode === 'sentence'
                ? t('typingLobby.sentence.title', { defaultValue: 'Sentence' })
                : mode === 'word'
                  ? t('typingLobby.word.title', { defaultValue: 'Word' })
                  : t('typingLobby.paragraph.title', { defaultValue: 'Paragraph' });
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setActiveTab(mode)}
                style={{
                  flex: 1,
                  padding: '10px 4px',
                  borderRadius: 12,
                  border: 'none',
                  background: isActive ? KT.card : 'transparent',
                  cursor: 'pointer',
                  boxShadow: isActive ? KT.shSm : 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 3,
                }}
              >
                <span
                  style={{
                    fontFamily: KT.serif,
                    fontSize: 16,
                    color: isActive ? KT.crimson : KT.sub,
                    fontWeight: 500,
                    lineHeight: 1,
                  }}
                >
                  {meta.hanja}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: isActive ? 800 : 600,
                    color: isActive ? KT.ink : KT.sub,
                    fontFamily: KT.font,
                  }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────── */}
      <div style={{ padding: '0 18px 100px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* 1. Sentence mode */}
        {activeTab === 'sentence' &&
          PRACTICE_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onStart('sentence', cat)}
              style={{
                width: '100%',
                background: KT.card,
                borderRadius: 22,
                boxShadow: KT.sh,
                padding: '20px 18px',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* watermark */}
              <span
                style={{
                  position: 'absolute',
                  right: 12,
                  top: 8,
                  fontFamily: KT.serif,
                  fontSize: 64,
                  color: KT.sky,
                  opacity: 0.18,
                  lineHeight: 1,
                  pointerEvents: 'none',
                }}
              >
                文
              </span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}
              >
                <Chip tone="sky">
                  {t('typing.mobile.sets', {
                    count: cat.sentences.length,
                    defaultValue: `${cat.sentences.length} Sets`,
                  })}
                </Chip>
                <span style={{ fontSize: 16, color: KT.sub }}>→</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: KT.ink, marginBottom: 4 }}>
                {cat.title}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: KT.sub,
                  fontWeight: 500,
                  lineHeight: 1.5,
                  maxWidth: '85%',
                }}
              >
                {cat.description}
              </div>
            </button>
          ))}

        {/* 2. Word mode */}
        {activeTab === 'word' && (
          <div
            style={{
              background: KT.card,
              borderRadius: 22,
              boxShadow: KT.sh,
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div
              style={{
                fontFamily: KT.serif,
                fontSize: 13,
                color: KT.crimson,
                letterSpacing: 2,
                fontWeight: 500,
              }}
            >
              詞 · 단어 선택
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label
                  htmlFor="typing-course-select"
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: KT.sub,
                    letterSpacing: 1,
                    display: 'block',
                    marginBottom: 6,
                    fontFamily: KT.font,
                  }}
                >
                  {t('typingGame.course', { defaultValue: 'Course' })}
                </label>
                <Select
                  id="typing-course-select"
                  value={effectiveCourseName}
                  onChange={e => {
                    const name = e.target.value;
                    setSelectedCourseName(name);
                    const variants = coursesByName[name];
                    if (variants?.[0]) setSelectedCourseId(variants[0]._id);
                  }}
                  className="w-full !h-auto !p-4 !rounded-2xl !border-0 font-bold focus-visible:!ring-2 focus-visible:!ring-primary outline-none appearance-none !shadow-none"
                  style={{ background: KT.bg2 }}
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
                  <label
                    htmlFor="typing-level-select"
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      color: KT.sub,
                      letterSpacing: 1,
                      display: 'block',
                      marginBottom: 6,
                      fontFamily: KT.font,
                    }}
                  >
                    {t('typingGame.volumeLevel', { defaultValue: 'Volume / Level' })}
                  </label>
                  <Select
                    id="typing-level-select"
                    value={effectiveCourseId}
                    onChange={e => setSelectedCourseId(e.target.value)}
                    className="w-full !h-auto !p-4 !rounded-2xl !border-0 font-bold focus-visible:!ring-2 focus-visible:!ring-primary outline-none appearance-none !shadow-none"
                    style={{ background: KT.bg2 }}
                  >
                    {coursesByName[effectiveCourseName]?.map(c => (
                      <option key={c._id} value={c._id}>
                        {c.volume || c.displayLevel || 'Standard'}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => onStart('word', { courseId: effectiveCourseId, unitId: 1 })}
              disabled={!effectiveCourseId}
              style={{
                width: '100%',
                padding: '14px 0',
                borderRadius: 16,
                border: 'none',
                background: KT.ink,
                color: KT.bg,
                fontSize: 14,
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontFamily: KT.font,
                opacity: effectiveCourseId ? 1 : 0.4,
              }}
            >
              <Play size={15} fill={KT.bg} />
              {t('typing.mobile.startWordPractice', { defaultValue: 'Start Word Practice' })}
            </button>
          </div>
        )}

        {/* 3. Paragraph mode */}
        {activeTab === 'paragraph' &&
          PRACTICE_PARAGRAPHS.map(para => (
            <button
              key={para.id}
              type="button"
              onClick={() => onStart('paragraph', para)}
              style={{
                width: '100%',
                background: KT.card,
                borderRadius: 22,
                boxShadow: KT.sh,
                padding: '20px 18px',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  right: 12,
                  top: 8,
                  fontFamily: KT.serif,
                  fontSize: 64,
                  color: KT.butter,
                  opacity: 0.25,
                  lineHeight: 1,
                  pointerEvents: 'none',
                }}
              >
                段
              </span>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 12,
                }}
              >
                <Chip tone="butter">
                  {t('typing.mobile.longText', { defaultValue: 'Long Text' })}
                </Chip>
                <span style={{ fontSize: 16, color: KT.sub }}>→</span>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: KT.ink, marginBottom: 4 }}>
                {para.title}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: KT.sub,
                  fontWeight: 500,
                  lineHeight: 1.5,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {para.description}
              </div>
            </button>
          ))}
      </div>
    </PageShell>
  );
};

// ─── 2. SESSION ────────────────────────────────────────────
const MobileSession = ({
  mode,
  data,
  onFinish,
  onExit,
}: {
  mode: TypingMode;
  data: TypingGameData;
  onFinish: (stats: TypingStats) => void;
  onExit: () => void;
}) => {
  const { t } = useTranslation();
  const [queueIndex, setQueueIndex] = useState(0);

  const courseWords = useQuery(
    VOCAB.getOfCourse,
    mode === 'word' && isWordPracticeSelection(data) && data.courseId
      ? { courseId: data.courseId, unitId: 1 }
      : 'skip'
  );

  const queue = useMemo(() => {
    if (mode === 'sentence' && isPracticeCategory(data)) {
      const cat = data;
      return deterministicShuffle(cat.sentences);
    }
    if (mode === 'paragraph' && isPracticeParagraph(data)) {
      const para = data;
      return [para.text];
    }
    if (mode === 'word' && courseWords && isWordPracticeSelection(data)) {
      return deterministicShuffle(
        courseWords.flatMap(word =>
          typeof word.word === 'string' && word.word.length > 0 ? [word.word] : []
        )
      );
    }
    return [];
  }, [mode, data, courseWords]);

  const targetText = queue[queueIndex] || '';
  const { userInput, completedIndex, phase, stats, inputRef, reset, checkInput } = useKoreanTyping(
    targetText,
    mode
  );

  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  const ensureFocus = () => {
    inputRef.current?.focus();
    setIsKeyboardOpen(true);
  };

  useEffect(() => {
    if (phase === 'finish') {
      const timer = setTimeout(() => {
        if (queueIndex < queue.length - 1) {
          setQueueIndex(prev => prev + 1);
          reset();
        } else {
          onFinish(stats);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [phase, queueIndex, queue.length, reset, onFinish, stats]);

  const progressPct = targetText.length ? (completedIndex / targetText.length) * 100 : 0;
  const meta = MODE_META[mode];
  const targetCharacters = useMemo(() => Array.from(targetText), [targetText]);
  const characterStates = useMemo(
    () =>
      targetCharacters.map((char, index) => {
        const inputChar = userInput[index];
        const isTyped = index < userInput.length;
        const isCurrent = index === userInput.length;
        const status = isTyped
          ? checkInput(char, inputChar, targetCharacters[index + 1])
          : 'pending';
        let color: string = KT.subLight;
        let textDecoration: string = 'none';

        if (isTyped) {
          color = status === 'correct' ? KT.ink : KT.pinkDeep;
          if (status !== 'correct') {
            textDecoration = 'underline';
          }
        }

        return {
          char,
          index,
          isCurrent,
          color,
          textDecoration,
        };
      }),
    [checkInput, targetCharacters, userInput]
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: KT.bg,
        display: 'flex',
        flexDirection: 'column',
        fontFamily: KT.font,
      }}
      onClick={ensureFocus}
    >
      {/* Header bar */}
      <div
        style={{
          padding: '10px 18px 10px',
          paddingTop: 'calc(env(safe-area-inset-top) + 10px)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: KT.card,
          borderBottom: `1px solid ${KT.line}`,
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={onExit}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            border: 'none',
            background: KT.bg2,
            fontSize: 16,
            cursor: 'pointer',
            boxShadow: KT.shSm,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          ×
        </button>

        {/* progress bar */}
        <div
          style={{
            flex: 1,
            height: 5,
            borderRadius: 3,
            background: KT.line2,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${progressPct}%`,
              height: '100%',
              background: KT.ink,
              borderRadius: 3,
              transition: 'width 0.2s',
            }}
          />
        </div>

        {/* mini stats */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { n: `${stats.wpm}`, l: 'WPM', color: KT.ink },
            { n: `${stats.accuracy}%`, l: '정확', color: KT.mintDeep },
          ].map(s => (
            <div
              key={s.l}
              style={{
                background: KT.bg2,
                borderRadius: 10,
                padding: '5px 9px',
                textAlign: 'center',
                boxShadow: KT.shSm,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 800, color: s.color, letterSpacing: -0.3 }}>
                {s.n}
              </div>
              <div style={{ fontSize: 8, color: KT.sub, fontWeight: 700 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main typing area */}
      <div
        style={{
          flex: 1,
          padding: '20px 22px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
          paddingBottom: isKeyboardOpen ? '42vh' : 'calc(env(safe-area-inset-bottom) + 80px)',
        }}
      >
        {/* Text card */}
        <div
          style={{
            background: KT.card,
            borderRadius: 22,
            boxShadow: KT.sh,
            padding: 22,
          }}
        >
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            <Chip tone={meta.tone}>
              {meta.hanja} · {mode.toUpperCase()}
            </Chip>
            <Chip tone="muted">TOPIK</Chip>
          </div>
          <div
            style={{
              fontSize: 13,
              color: KT.sub,
              marginBottom: 16,
              fontWeight: 600,
            }}
          >
            {t('typingGame.tapToStartTyping', { defaultValue: 'Type the sentence to start' })}
          </div>

          {/* Typing text with character highlighting */}
          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              lineHeight: 1.6,
              letterSpacing: -0.4,
              color: KT.subLight,
              fontFamily: KT.font,
            }}
          >
            {characterStates.map(({ char, index, isCurrent, color, textDecoration }) => (
              <span
                key={index}
                style={{
                  color,
                  background: isCurrent ? KT.butter : 'transparent',
                  borderRadius: isCurrent ? 3 : 0,
                  padding: isCurrent ? '0 2px' : 0,
                  textDecoration,
                  transition: 'color 0.08s',
                }}
              >
                {char === ' ' ? '\u00A0' : char}
              </span>
            ))}
          </div>
        </div>

        {/* Tap hint */}
        {!isKeyboardOpen && (
          <div
            style={{
              textAlign: 'center',
              fontSize: 11,
              color: KT.sub,
              fontWeight: 700,
              letterSpacing: 1.5,
              opacity: 0.7,
            }}
          >
            {t('typingGame.tapToStartTyping', { defaultValue: 'TAP TO START TYPING' })}
          </div>
        )}
      </div>

      <HiddenInput ref={inputRef} onBlur={() => {}} />
    </div>
  );
};

// ─── 3. RESULTS ────────────────────────────────────────────
const MobileResults = ({
  stats,
  onRetry,
  onExit,
}: {
  stats: TypingStats;
  onRetry: () => void;
  onExit: () => void;
}) => {
  const { t } = useTranslation();
  const isHighScore = stats.wpm > 60;

  return (
    <Dialog open onOpenChange={open => !open && onExit()}>
      <DialogPortal>
        <DialogContent
          unstyled
          closeOnEscape={false}
          lockBodyScroll={false}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            background: KT.bg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
            fontFamily: KT.font,
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 360,
              background: KT.card,
              borderRadius: 28,
              boxShadow: KT.shLg,
              overflow: 'hidden',
            }}
          >
            {/* Result header */}
            <div
              style={{
                background: `linear-gradient(135deg, ${KT.indigo} 0%, #4A5A90 100%)`,
                padding: '28px 24px 24px',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  right: 12,
                  top: 4,
                  fontFamily: KT.serif,
                  fontSize: 80,
                  color: 'rgba(255,255,255,0.07)',
                  lineHeight: 1,
                }}
              >
                成
              </span>
              <div style={{ position: 'relative' }}>
                <HanjaSeal
                  c={isHighScore ? '優' : '成'}
                  size={64}
                  bg="rgba(255,255,255,0.18)"
                  round={18}
                />
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: '#fff',
                    marginTop: 14,
                    letterSpacing: -0.3,
                  }}
                >
                  {isHighScore
                    ? t('typing.mobile.greatJob', { defaultValue: 'Great job!' })
                    : t('typing.mobile.sessionComplete', { defaultValue: 'Complete' })}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.65)',
                    marginTop: 4,
                    fontWeight: 600,
                  }}
                >
                  {t('typing.mobile.gettingFaster', { defaultValue: "You're getting faster!" })}
                </div>
              </div>
            </div>

            {/* Stats */}
            <div style={{ padding: '24px 24px 20px' }}>
              {[
                {
                  k: '速',
                  l: t('typing.speed', { defaultValue: 'Speed' }),
                  v: `${stats.wpm}`,
                  u: 'WPM',
                  bar: Math.min(stats.wpm / 3, 100),
                  barColor: KT.indigo,
                },
                {
                  k: '精',
                  l: t('typingGame.accuracy', { defaultValue: 'Accuracy' }),
                  v: `${stats.accuracy}`,
                  u: '%',
                  bar: stats.accuracy,
                  barColor: stats.accuracy >= 95 ? KT.mintDeep : KT.butterDeep,
                },
              ].map(s => (
                <div key={s.k} style={{ marginBottom: 20 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <span
                        style={{
                          fontFamily: KT.serif,
                          fontSize: 16,
                          color: KT.crimson,
                          fontWeight: 500,
                          opacity: 0.8,
                        }}
                      >
                        {s.k}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: KT.sub }}>{s.l}</span>
                    </div>
                    <span
                      style={{ fontSize: 26, fontWeight: 800, color: KT.ink, letterSpacing: -0.5 }}
                    >
                      {s.v}
                      <span style={{ fontSize: 12, color: KT.sub, marginLeft: 2 }}>{s.u}</span>
                    </span>
                  </div>
                  <div
                    style={{ height: 6, background: KT.bg2, borderRadius: 3, overflow: 'hidden' }}
                  >
                    <div
                      style={{
                        width: `${s.bar}%`,
                        height: '100%',
                        background: s.barColor,
                        borderRadius: 3,
                        transition: 'width 0.8s ease',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div
              style={{
                padding: '0 20px 24px',
                display: 'flex',
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={onExit}
                style={{
                  flex: 1,
                  padding: '13px 0',
                  borderRadius: 14,
                  border: `1px solid ${KT.line2}`,
                  background: KT.bg2,
                  color: KT.sub,
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontFamily: KT.font,
                }}
              >
                {t('typing.mobile.lobby', { defaultValue: 'Lobby' })}
              </button>
              <button
                type="button"
                onClick={onRetry}
                style={{
                  flex: 1,
                  padding: '13px 0',
                  borderRadius: 14,
                  border: 'none',
                  background: KT.ink,
                  color: KT.bg,
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  fontFamily: KT.font,
                }}
              >
                <RefreshCw size={13} />
                {t('typing.mobile.retry', { defaultValue: 'Retry' })}
              </button>
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

// ─── MAIN PAGE ─────────────────────────────────────────────
export const MobileTypingPage: React.FC = () => {
  const { t } = useTranslation();
  const typingTabStorageKey = 'mobileTypingActiveTab';
  const navigate = useLocalizedNavigate();
  const [searchParams] = useSearchParams();
  const [gameState, setGameState] = useState<GameState>('lobby');
  const [activeTab, setActiveTab] = useState<TypingMode>(() => {
    if (globalThis.window === undefined) return 'sentence';
    const saved = safeGetLocalStorageItem(typingTabStorageKey);
    if (saved === 'word' || saved === 'paragraph') return saved;
    return 'sentence';
  });
  const [gameMode, setGameMode] = useState<TypingMode>('sentence');
  const [gameData, setGameData] = useState<TypingGameData | null>(null);
  const [lastStats, setLastStats] = useState<TypingStats | null>(null);

  const saveRecord = useMutation(api.typing.saveRecord);

  const handleStart = (mode: TypingMode, data: TypingGameData) => {
    setGameMode(mode);
    setGameData(data);
    setGameState('playing');
  };

  const handleFinish = async (stats: TypingStats) => {
    setLastStats(stats);
    setGameState('results');

    const duration = stats.startTime ? Date.now() - stats.startTime : 0;
    const targetWpm = 40;
    const isTargetAchieved = stats.wpm >= targetWpm;
    let categoryId = 'unknown';
    if (gameMode === 'sentence' && gameData && isPracticeCategory(gameData)) {
      categoryId = gameData.id;
    } else if (gameMode === 'paragraph' && gameData && isPracticeParagraph(gameData)) {
      categoryId = gameData.id;
    } else if (gameMode === 'word' && gameData && isWordPracticeSelection(gameData)) {
      categoryId = gameData.courseId || 'vocab';
    }

    try {
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
      toast.success(t('typing.mobile.resultSaved', { defaultValue: 'Result saved!' }));
    } catch (error: unknown) {
      const msg = getTypingErrorMessage(
        error,
        t('typing.mobile.unknownError', { defaultValue: 'Unknown error' })
      );
      toast.error(t('typing.mobile.failedToSave', { msg, defaultValue: `Failed to save: ${msg}` }));
    }
  };

  useEffect(() => {
    if (globalThis.window === undefined) return;
    safeSetLocalStorageItem(typingTabStorageKey, activeTab);
  }, [activeTab]);

  const handleBack = () => {
    const returnTo = searchParams.get('returnTo');
    if (hasSafeReturnTo(returnTo)) {
      navigate(resolveSafeReturnTo(returnTo, '/courses'));
      return;
    }
    navigate('/courses');
  };

  return (
    <div style={{ height: '100dvh', width: '100%', overflow: 'hidden' }}>
      {gameState === 'lobby' && (
        <MobileLobby
          onStart={handleStart}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onBack={handleBack}
        />
      )}
      {gameState === 'playing' && gameData && (
        <MobileSession
          mode={gameMode}
          data={gameData}
          onFinish={handleFinish}
          onExit={() => setGameState('lobby')}
        />
      )}
      {gameState === 'results' && lastStats && (
        <MobileResults
          stats={lastStats}
          onRetry={() => setGameState('playing')}
          onExit={() => setGameState('lobby')}
        />
      )}
    </div>
  );
};
