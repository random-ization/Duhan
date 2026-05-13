import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  lazy,
  Suspense,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronDown, BookOpen } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLearningActions, useLearningSelection } from '../contexts/LearningContext';
import { logInfo, logError, logWarn } from '../utils/logger';
import { useData } from '../contexts/DataContext';
import { UserWordProgress, VocabularyItem } from '../types';
import EmptyState from '../components/common/EmptyState';
import { useQuery, useMutation } from 'convex/react';
import { useTTS } from '../hooks/useTTS';
import { getLabel, getLabels } from '../utils/i18n';
import { getLocalizedContent } from '../utils/languageUtils';
import { VocabModuleSkeleton } from '../components/common';
import { ENTITLEMENTS, VOCAB, mRef } from '../utils/convexRefs';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { resolveSafeReturnTo } from '../utils/navigation';
import type { Id } from '../../convex/_generated/dataModel';
import VocabProgressSections from '../features/vocab/components/VocabProgressSections';

import { useFSRSBatchProgress } from '../features/vocab/hooks/useVocabProgress';
import { useUpgradeFlow } from '../hooks/useUpgradeFlow';
import { resolveInstituteDefaultLevel } from '../utils/learningFlow';
import { createLearningSessionId, useLearningAnalytics } from '../hooks/useLearningAnalytics';
import { getEntitlementErrorData } from '../utils/entitlements';
import { notify } from '../utils/notify';
import { useGlobalSettings } from '../hooks/useGlobalSettings';

const DesktopVocabModulePage = lazy(() => import('./desktop/DesktopVocabModulePage'));

import MobileVocabView from '../components/mobile/MobileVocabView';
import { useIsMobile } from '../hooks/useIsMobile';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../components/ui';
import { Button } from '../components/ui';
import VocabLearnOverlay from '../features/vocab/components/VocabLearnOverlay';
import VocabQuiz from '../features/vocab/components/VocabQuiz';
import VocabTest from '../features/vocab/components/VocabTest';
import type { Language } from '../types';
import type { LearningSessionSnapshot } from '../features/vocab/components/VocabQuiz';
import type { VocabTestSessionSnapshot } from '../features/vocab/components/VocabTest';
import type { FlashcardSessionSnapshot } from '../features/vocab/components/FlashcardView';

export interface ExtendedVocabItem extends VocabularyItem {
  id: string;
  unit: number;
  mastered?: boolean;
  exampleTranslation?: string;
  // FSRS Fields
  state?: number;
  stability?: number;
  difficulty?: number;
  elapsed_days?: number;
  scheduled_days?: number;
  reps?: number;
  learning_steps?: number;
  lapses?: number;
  last_review?: number | null;
}

type ViewMode = 'flashcard' | 'match';
type TabId = ViewMode | 'learn' | 'test';
type VocabModeParam = TabId;
type SessionMode = 'FLASHCARD' | 'LEARN' | 'TEST';
type LevelConfig = { level: number; units: number };
type ViewState = {
  mode: ViewMode;
  cardIndex: number;
  isFlipped: boolean;
  flashcardComplete: boolean;
};
type ExtendedWordProgress = UserWordProgress & {
  lastReviewedAt?: number | null;
  state?: number;
  due?: number | null;
  stability?: number;
  difficulty?: number;
  elapsed_days?: number;
  scheduled_days?: number;
  learning_steps?: number;
  reps?: number;
  lapses?: number;
  last_review?: number | null;
};

type InstituteLite = {
  id?: string;
  name?: string;
  nameEn?: string;
  nameZh?: string;
  nameVi?: string;
  nameMn?: string;
  volume?: string;
  levels?: unknown[];
};
type LocalizedLanguageArg = Parameters<typeof getLocalizedContent>[2];

const ALL_UNIT_SESSION_ID = -1;

type ActiveLearningSession = {
  id: string;
  instituteId: string;
  unitId: number;
  mode: SessionMode;
  status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
  snapshot?: unknown;
  startedAt: number;
  updatedAt: number;
  completedAt?: number;
};

type ResumeCandidate = {
  mode: SessionMode;
  sessionId: string;
  completed: number;
  remaining: number;
  total: number;
  progressPercent: number;
};

const fallbackString = (value: string | undefined, fallback: string): string => value ?? fallback;

const isVocabModeParam = (value: string | null): value is VocabModeParam =>
  value === 'flashcard' || value === 'test' || value === 'learn' || value === 'match';

const toSessionMode = (mode: VocabModeParam): SessionMode | null => {
  if (mode === 'flashcard') return 'FLASHCARD';
  if (mode === 'learn') return 'LEARN';
  if (mode === 'test') return 'TEST';
  return null;
};

const getReviewDeckArgs = (instituteId: string | undefined) =>
  instituteId ? { courseId: instituteId } : ('skip' as const);

const getFsrsPersistKey = (instituteId: string | undefined): string =>
  instituteId ? `fsrs-progress-queue:${instituteId}` : 'fsrs-progress-queue:default';

const isWordsLoading = (queryResult: unknown, institutesLoading: boolean): boolean =>
  queryResult === undefined || institutesLoading;

const normalizeUnitForSession = (unitId: number | 'ALL'): number =>
  unitId === 'ALL' ? ALL_UNIT_SESSION_ID : unitId;

const isLearningSessionSnapshot = (value: unknown): value is LearningSessionSnapshot => {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as Partial<LearningSessionSnapshot>;
  return (
    Array.isArray(snapshot.wordIds) &&
    typeof snapshot.questionIndex === 'number' &&
    Array.isArray(snapshot.wrongWordIds) &&
    typeof snapshot.correctCount === 'number' &&
    typeof snapshot.totalAnswered === 'number' &&
    typeof snapshot.currentBatchNum === 'number' &&
    !!snapshot.settings &&
    typeof snapshot.timestamp === 'number'
  );
};

const isVocabTestSessionSnapshot = (value: unknown): value is VocabTestSessionSnapshot => {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as Partial<VocabTestSessionSnapshot>;
  return (
    snapshot.stage === 'RUNNING' &&
    typeof snapshot.questionCount === 'number' &&
    typeof snapshot.activeCardIndex === 'number' &&
    Array.isArray(snapshot.cards) &&
    typeof snapshot.timestamp === 'number'
  );
};

const isFlashcardSessionSnapshot = (value: unknown): value is FlashcardSessionSnapshot => {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as Partial<FlashcardSessionSnapshot>;
  return (
    typeof snapshot.cardIndex === 'number' &&
    typeof snapshot.isRandom === 'boolean' &&
    typeof snapshot.trackProgress === 'boolean' &&
    Array.isArray(snapshot.orderedWordIds) &&
    !!snapshot.stats &&
    Array.isArray(snapshot.stats.correctWordIds) &&
    Array.isArray(snapshot.stats.incorrectWordIds) &&
    typeof snapshot.timestamp === 'number'
  );
};

function buildTabs(
  labels: ReturnType<typeof getLabels>
): { id: TabId; label: string; emoji: string }[] {
  return [
    {
      id: 'flashcard',
      label: fallbackString(labels.vocab?.flashcard, 'Flashcard'),
      emoji: '🎴',
    },
    {
      id: 'learn',
      label: fallbackString(labels.learn, 'Learn'),
      emoji: '🧠',
    },
    {
      id: 'test',
      label: fallbackString(labels.vocab?.quiz, 'Test'),
      emoji: '📝',
    },
    {
      id: 'match',
      label: fallbackString(getLabel(labels, ['vocab', 'match']), 'Match'),
      emoji: '🧩',
    },
  ];
}

function resolveCourseBreadcrumbLabel(
  course: InstituteLite | undefined,
  language: LocalizedLanguageArg,
  instituteId: string | undefined
): string {
  const localized = course ? getLocalizedContent(course, 'name', language) : undefined;
  if (localized) return localized;
  if (course?.name) {
    let name = course.nameZh || course.name;
    let levelDisplay = (course as any).displayLevel || '';
    if (levelDisplay) {
      if (/^\d+$/.test(levelDisplay)) {
        levelDisplay = `${levelDisplay}级`;
      } else if (levelDisplay.includes('-')) {
        const [l, v] = levelDisplay.split('-');
        levelDisplay = `${l}级 ${v}册`;
      }
    }
    const volume = (course as any).volume || '';
    return [name, levelDisplay, volume].filter(Boolean).join(' ');
  }
  if (instituteId) return instituteId;
  return 'Course';
}

const isLevelConfig = (value: unknown): value is LevelConfig => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { level?: unknown; units?: unknown };
  return typeof candidate.level === 'number' && typeof candidate.units === 'number';
};

// Standard background class
const CONTAINER_CLASS = "min-h-screen bg-k-bg";

function useSyncInstituteSelection(params: {
  instituteId: string | undefined;
  selectedLevel: number | null | undefined;
  setSelectedInstitute: (instituteId: string) => void;
  setSelectedLevel: (level: number) => void;
}) {
  const { instituteId, selectedLevel, setSelectedInstitute, setSelectedLevel } = params;
  useEffect(() => {
    if (!instituteId) return;
    setSelectedInstitute(instituteId);
    if (!selectedLevel) setSelectedLevel(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instituteId]);
}

function useInitializeWordSets(
  allWords: ExtendedVocabItem[],
  setMasteredIds: Dispatch<SetStateAction<Set<string>>>,
  setStarredIds: Dispatch<SetStateAction<Set<string>>>
) {
  useEffect(() => {
    if (allWords.length === 0) return;
    const mastered = new Set(
      allWords.filter(w => w.mastered || w.progress?.status === 'MASTERED').map(w => w.id)
    );
    setMasteredIds(mastered);
  }, [allWords, setMasteredIds]);

  useEffect(() => {
    if (allWords.length === 0) return;
    const starred = new Set(allWords.filter(w => w.progress != null).map(w => w.id));
    setStarredIds(starred);
  }, [allWords, setStarredIds]);
}

function usePersistLearningProgress(params: {
  instituteId: string | undefined;
  progressUnit: number;
  updateLearningProgressMutation: (value: {
    lastInstitute?: string;
    lastUnit?: number;
    lastModule?: string;
  }) => Promise<unknown>;
}) {
  const { instituteId, progressUnit, updateLearningProgressMutation } = params;
  useEffect(() => {
    if (!instituteId) return;
    void updateLearningProgressMutation({
      lastInstitute: instituteId,
      lastUnit: progressUnit,
      lastModule: 'VOCAB',
    });
  }, [updateLearningProgressMutation, instituteId, progressUnit]);
}

function useResetFlashcardViewOnUnitChange(
  selectedUnitId: number | 'ALL',
  setViewState: Dispatch<SetStateAction<ViewState>>
) {
  useEffect(() => {
    setViewState(prev => ({ ...prev, cardIndex: 0, isFlipped: false, flashcardComplete: false }));
  }, [selectedUnitId, setViewState]);
}

function useFlushQueueOnUnmount(flushQueue: () => Promise<void>) {
  useEffect(() => {
    return () => {
      void flushQueue();
    };
  }, [flushQueue]);
}

function VocabModulePage() {
  // Force Rebuild Trigger: 2026-01-02
  const navigate = useLocalizedNavigate();
  const { instituteId } = useParams<{ instituteId: string }>();
  const [searchParams] = useSearchParams();
  const { user, language } = useAuth();
  const { settings: globalSettings, updateSettings: updateGlobalSettings } = useGlobalSettings();
  const { startUpgradeFlow } = useUpgradeFlow();
  const { selectedLevel } = useLearningSelection();
  const { setRecentMaterial, setSelectedInstitute, setSelectedLevel } = useLearningActions();
  const { institutes, isLoading: institutesLoading } = useData();
  const { speak: speakTTS } = useTTS();
  const { trackLearningEvent } = useLearningAnalytics();
  const isMobile = useIsMobile();
  const labels = getLabels(language);
  const initialUnitFromQuery = Number(searchParams.get('unit'));
  const rawModeParam = searchParams.get('mode');
  const requestedMode: VocabModeParam | null = isVocabModeParam(rawModeParam) ? rawModeParam : null;
  const initialSelectedUnitId: number | 'ALL' =
    Number.isFinite(initialUnitFromQuery) && initialUnitFromQuery > 0
      ? Math.floor(initialUnitFromQuery)
      : 'ALL';

  useSyncInstituteSelection({
    instituteId,
    selectedLevel,
    setSelectedInstitute,
    setSelectedLevel,
  });

  const course = institutes?.find(i => i.id === instituteId);

  // State - Merged related states for better performance
  const [selectedUnitId, setSelectedUnitId] = useState<number | 'ALL'>(initialSelectedUnitId);
  const [viewState, setViewState] = useState({
    mode: (requestedMode === 'match' ? 'match' : 'flashcard') as ViewMode,
    cardIndex: 0,
    isFlipped: false,
    flashcardComplete: false,
  });
  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set());
  const [starredIds, setStarredIds] = useState<Set<string>>(new Set());
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [redSheetActive, setRedSheetActive] = useState(true);
  const [learnOpen, setLearnOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [resumeModePrompt, setResumeModePrompt] = useState<SessionMode | null>(null);
  const [resumeCandidate, setResumeCandidate] = useState<ResumeCandidate | null>(null);
  const [pendingUnitSwitch, setPendingUnitSwitch] = useState<number | 'ALL' | null>(null);

  const [learnResumeSnapshotOverride, setLearnResumeSnapshotOverride] = useState<
    LearningSessionSnapshot | null | undefined
  >(undefined);
  const [flashcardResumeSnapshotOverride, setFlashcardResumeSnapshotOverride] = useState<
    FlashcardSessionSnapshot | null | undefined
  >(undefined);
  const [testResumeSnapshotOverride, setTestResumeSnapshotOverride] = useState<
    VocabTestSessionSnapshot | null | undefined
  >(undefined);
  const [learnSessionIdOverride, setLearnSessionIdOverride] = useState<string | null | undefined>(
    undefined
  );
  const [flashcardSessionIdOverride, setFlashcardSessionIdOverride] = useState<
    string | null | undefined
  >(undefined);
  const [testSessionIdOverride, setTestSessionIdOverride] = useState<string | null | undefined>(
    undefined
  );
  const latestLearnSnapshotRef = useRef<LearningSessionSnapshot | null>(null);
  const latestFlashcardSnapshotRef = useRef<FlashcardSessionSnapshot | null>(null);
  const latestTestSnapshotRef = useRef<VocabTestSessionSnapshot | null>(null);
  const autoOpenedModeRef = useRef<string | null>(null);

  const selectedSessionUnitId = normalizeUnitForSession(selectedUnitId);

  useEffect(() => {
    if (!instituteId) return;
    setRecentMaterial('vocabulary', {
      instituteId,
      level: course ? resolveInstituteDefaultLevel(course) : selectedLevel || 1,
      unit: selectedSessionUnitId,
    });
  }, [course, instituteId, selectedLevel, selectedSessionUnitId, setRecentMaterial]);

  // Flashcard settings

  // Convex Integration
  // Pass user ID (token or Convex ID) to ensure progress data is loaded
  const convexWordsQuery = useQuery(VOCAB.getReviewDeck, getReviewDeckArgs(instituteId));
  const addToReviewMutation = useMutation(VOCAB.addToReview);
  const updateLearningProgressMutation = useMutation(
    mRef<
      { lastInstitute?: string; lastLevel?: number; lastUnit?: number; lastModule?: string },
      unknown
    >('user:updateLearningProgress')
  );
  const upsertLearningSessionMutation = useMutation(VOCAB.upsertLearningSession);
  const completeLearningSessionMutation = useMutation(VOCAB.completeLearningSession);
  const abandonLearningSessionMutation = useMutation(VOCAB.abandonLearningSession);
  const consumeVocabTestAttemptMutation = useMutation(ENTITLEMENTS.consumeVocabTestAttempt);
  const activeLearnSession = useQuery(
    VOCAB.getActiveLearningSession,
    instituteId ? { instituteId, unitId: selectedSessionUnitId, mode: 'LEARN' } : 'skip'
  ) as ActiveLearningSession | null | undefined;
  const activeFlashcardSession = useQuery(
    VOCAB.getActiveLearningSession,
    instituteId ? { instituteId, unitId: selectedSessionUnitId, mode: 'FLASHCARD' } : 'skip'
  ) as ActiveLearningSession | null | undefined;
  const activeTestSession = useQuery(
    VOCAB.getActiveLearningSession,
    instituteId ? { instituteId, unitId: selectedSessionUnitId, mode: 'TEST' } : 'skip'
  ) as ActiveLearningSession | null | undefined;
  const { enqueueReview, flushQueue, optimisticProgressMap } = useFSRSBatchProgress({
    maxBatchSize: 10,
    flushDebounceMs: 4000,
    persistKey: getFsrsPersistKey(instituteId),
  });

  // Derive loading state and allWords directly from query - no extra state needed
  const isLoading = isWordsLoading(convexWordsQuery, institutesLoading);
  type ReviewDeckWord = NonNullable<typeof convexWordsQuery>[number];

  const normalizeUnitId = (unitId: unknown): number => {
    const parsed = typeof unitId === 'number' ? unitId : Number(unitId);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const buildBaseProgress = useCallback((word: ReviewDeckWord): ExtendedWordProgress | null => {
    if (!word.progress) return null;
    return {
      ...word.progress,
      id: String(word.progress.id),
      status: (word.progress.status || 'LEARNING') as UserWordProgress['status'],
      interval: word.progress.interval ?? word.progress.scheduled_days ?? 1,
      streak: word.progress.streak ?? word.progress.reps ?? 0,
      nextReviewAt: word.progress.nextReviewAt ?? word.progress.due ?? null,
      lastReviewedAt: word.progress.lastReviewedAt ?? word.progress.last_review ?? null,
    };
  }, []);

  const mergeOptimisticProgress = useCallback(
    (wordId: string, baseProgress: ExtendedWordProgress | null): ExtendedWordProgress | null => {
      const optimistic = optimisticProgressMap[wordId];
      if (!optimistic) return baseProgress;

      return {
        id: baseProgress?.id || `optimistic-${wordId}`,
        status: optimistic.status as UserWordProgress['status'],
        interval: optimistic.interval,
        streak: optimistic.streak,
        nextReviewAt: optimistic.nextReviewAt,
        lastReviewedAt: optimistic.lastReviewedAt,
        state: optimistic.state,
        due: optimistic.due,
        stability: optimistic.stability,
        difficulty: optimistic.difficulty,
        elapsed_days: optimistic.elapsed_days,
        scheduled_days: optimistic.scheduled_days,
        learning_steps: optimistic.learning_steps,
        reps: optimistic.reps,
        lapses: optimistic.lapses,
        last_review: optimistic.last_review,
      };
    },
    [optimisticProgressMap]
  );

  const allWords = useMemo<ExtendedVocabItem[]>(() => {
    if (!convexWordsQuery) return [];
    return convexWordsQuery.map(word => {
      const normalizedUnit = normalizeUnitId(word.unitId);
      const wordId = String(word._id);
      const baseProgress = buildBaseProgress(word);
      const mergedProgress = mergeOptimisticProgress(wordId, baseProgress);

      return {
        id: wordId,
        korean: word.word,
        english: word.meaning,
        word: word.word,
        meaning: word.meaning,
        meaningEn: word.meaningEn,
        meaningVi: word.meaningVi,
        meaningMn: word.meaningMn,
        pronunciation: word.pronunciation,
        hanja: word.hanja,
        partOfSpeech: word.partOfSpeech as VocabularyItem['partOfSpeech'],
        tips: word.tips,
        exampleSentence: word.exampleSentence,
        exampleMeaning: word.exampleMeaning,
        exampleTranslation: word.exampleMeaning,
        exampleTranslationEn: word.exampleMeaningEn,
        exampleTranslationVi: word.exampleMeaningVi,
        exampleTranslationMn: word.exampleMeaningMn,
        unit: normalizedUnit,
        courseId: instituteId,
        unitId: String(normalizedUnit),
        progress: mergedProgress,
        state: mergedProgress?.state,
        stability: mergedProgress?.stability,
        difficulty: mergedProgress?.difficulty,
        elapsed_days: mergedProgress?.elapsed_days,
        scheduled_days: mergedProgress?.scheduled_days,
        learning_steps: mergedProgress?.learning_steps,
        reps: mergedProgress?.reps,
        lapses: mergedProgress?.lapses,
        last_review: mergedProgress?.last_review ?? null,
        mastered: mergedProgress?.status === 'MASTERED' || word.mastered || false,
      };
    });
  }, [buildBaseProgress, convexWordsQuery, instituteId, mergeOptimisticProgress]);

  useInitializeWordSets(allWords, setMasteredIds, setStarredIds);

  const unitCounts = useMemo(() => {
    const map = new Map<number, number>();
    for (const w of allWords) {
      const u = typeof w.unit === 'number' ? w.unit : Number(w.unit);
      if (Number.isNaN(u)) continue;
      map.set(u, (map.get(u) || 0) + 1);
    }
    return map;
  }, [allWords]);

  const filteredWords = useMemo(() => {
    if (selectedUnitId === 'ALL') return allWords;
    return allWords.filter(w => w.unit === selectedUnitId);
  }, [allWords, selectedUnitId]);

  const progressUnit = useMemo(() => {
    if (typeof selectedUnitId === 'number') return selectedUnitId;
    const firstValid = allWords.find(w => Number.isFinite(w.unit) && w.unit > 0)?.unit;
    return firstValid || 1;
  }, [selectedUnitId, allWords]);

  usePersistLearningProgress({ instituteId, progressUnit, updateLearningProgressMutation });
  useResetFlashcardViewOnUnitChange(selectedUnitId, setViewState);
  useFlushQueueOnUnmount(flushQueue);

  const availableUnits = useMemo(() => {
    // Check if this is a Volume 2 course
    const isVolume2 =
      (course?.volume &&
        (course.volume === '2' || course.volume === 'B' || course.volume === '\u4E0B')) ||
      (course?.id &&
        (course.id.includes('_1b') || course.id.includes('_2b') || course.id.endsWith('b'))) ||
      (course?.name && (course.name.includes('1B') || course.name.includes('2B')));

    const startUnit = isVolume2 ? 11 : 1;
    // If it's volume 2, we assume units are 11-20 (or similar range)
    // If totalUnits is e.g. 10 (per book), then Vol 1 is 1-10, Vol 2 is 11-20.
    // If totalUnits is 20 (legacy default), we might want to cap it.
    // Let's assume standard 10 units per volume for Yonsei-like courses.
    const firstLevel = course?.levels?.[0];
    const count = isLevelConfig(firstLevel) ? firstLevel.units || 10 : 10;

    const base = Array.from({ length: count }, (_, i) => startUnit + i);

    if (unitCounts.has(0)) base.unshift(0);
    return base;
  }, [course, unitCounts]);

  const masteryCount = useMemo(() => {
    return filteredWords.filter(w => {
      const p = w.progress as (UserWordProgress & { state?: number; stability?: number }) | null;
      if (!p) return false;
      if (typeof p.state === 'number') {
        if (p.state !== 2) return false;
        if (typeof p.stability === 'number') return p.stability > 30;
      }
      return w.mastered || p.status === 'MASTERED';
    }).length;
  }, [filteredWords]);

  // Memoized words for Quiz/Match to prevent re-renders
  const gameWords = useMemo(
    () =>
      filteredWords.map(w => ({
        id: w.id,
        korean: w.korean,
        english: getLocalizedContent(w, 'meaning', language) || w.english,
        unit: w.unit,
        partOfSpeech: w.partOfSpeech,
        pos: w.pos,
      })),
    [filteredWords, language]
  );

  const wordById = useMemo(() => {
    return new Map(filteredWords.map(w => [w.id, w]));
  }, [filteredWords]);

  const getFSRSState = (word: ExtendedVocabItem) => {
    if (word.state === undefined) return undefined;

    return {
      state: word.state,
      due: word.progress?.nextReviewAt || Date.now(),
      stability: word.stability || 0,
      difficulty: word.difficulty || 0,
      elapsed_days: word.elapsed_days || 0,
      scheduled_days: word.scheduled_days || 0,
      learning_steps: word.learning_steps || 0,
      reps: word.reps || 0,
      lapses: word.lapses || 0,
      last_review: word.last_review ?? null,
    };
  };

  const handleReview = useCallback(
    (word: ExtendedVocabItem, result: boolean | number) => {
      if (!user) return;

      const isCorrect = typeof result === 'boolean' ? result : result > 1;
      if (isCorrect) {
        setMasteredIds(prev => new Set([...prev, word.id]));
      } else {
        setMasteredIds(prev => {
          const next = new Set(prev);
          next.delete(word.id);
          return next;
        });
      }

      let rating = 1;
      if (typeof result === 'number') {
        rating = result;
      } else {
        rating = result ? 3 : 1;
      }

      try {
        enqueueReview({
          wordId: word.id as Id<'words'>,
          rating,
          currentCard: getFSRSState(word),
        });
      } catch (err) {
        logError('FSRS queue error:', err);
      }
    },
    [enqueueReview, user]
  );

  const toggleStar = useCallback(
    (id: string) => {
      if (starredIds.has(id)) return;
      setStarredIds(prev => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });

      const w = wordById.get(id);
      if (!w) return;
      const meaning = getLocalizedContent(w, 'meaning', language) || w.meaning || w.english;
      void addToReviewMutation({
        word: w.korean,
        meaning,
        partOfSpeech: w.partOfSpeech,
        source: 'TEXTBOOK',
      }).catch(error => {
        const entitlementError = getEntitlementErrorData(error);
        if (entitlementError?.upgradeSource) {
          startUpgradeFlow({
            plan: 'ANNUAL',
            source: entitlementError.upgradeSource,
          });
          return;
        }
        notify.error(labels.vocab?.saveWordFailed || 'Unable to save this word right now.');
      });
    },
    [
      addToReviewMutation,
      labels.vocab?.saveWordFailed,
      language,
      starredIds,
      startUpgradeFlow,
      wordById,
    ]
  );

  const speakWord = useCallback(
    (text: string) => {
      void speakTTS(text);
    },
    [speakTTS]
  );

  const queriedLearnSnapshot = useMemo(() => {
    const maybeSnapshot = activeLearnSession?.snapshot;
    return isLearningSessionSnapshot(maybeSnapshot) ? maybeSnapshot : null;
  }, [activeLearnSession]);

  const queriedFlashcardSnapshot = useMemo(() => {
    const maybeSnapshot = activeFlashcardSession?.snapshot;
    return isFlashcardSessionSnapshot(maybeSnapshot) ? maybeSnapshot : null;
  }, [activeFlashcardSession]);

  const queriedTestSnapshot = useMemo(() => {
    const maybeSnapshot = activeTestSession?.snapshot;
    return isVocabTestSessionSnapshot(maybeSnapshot) ? maybeSnapshot : null;
  }, [activeTestSession]);

  const learnResumeSnapshot =
    learnResumeSnapshotOverride !== undefined ? learnResumeSnapshotOverride : queriedLearnSnapshot;
  const flashcardResumeSnapshot =
    flashcardResumeSnapshotOverride !== undefined
      ? flashcardResumeSnapshotOverride
      : queriedFlashcardSnapshot;
  const testResumeSnapshot =
    testResumeSnapshotOverride !== undefined ? testResumeSnapshotOverride : queriedTestSnapshot;
  const learnSessionId =
    learnSessionIdOverride !== undefined
      ? learnSessionIdOverride
      : (activeLearnSession?.id ?? null);
  const flashcardSessionId =
    flashcardSessionIdOverride !== undefined
      ? flashcardSessionIdOverride
      : (activeFlashcardSession?.id ?? null);
  const testSessionId =
    testSessionIdOverride !== undefined ? testSessionIdOverride : (activeTestSession?.id ?? null);

  const persistLearningSnapshot = useCallback(
    async (
      mode: SessionMode,
      snapshot: LearningSessionSnapshot | VocabTestSessionSnapshot | FlashcardSessionSnapshot
    ) => {
      if (!instituteId) return;
      const result = await upsertLearningSessionMutation({
        instituteId,
        unitId: selectedSessionUnitId,
        mode,
        snapshot,
      });
      if (mode === 'FLASHCARD') {
        if (!isFlashcardSessionSnapshot(snapshot)) return;
        latestFlashcardSnapshotRef.current = snapshot;
        setFlashcardSessionIdOverride(result.sessionId);
      } else if (mode === 'LEARN') {
        if (!isLearningSessionSnapshot(snapshot)) return;
        latestLearnSnapshotRef.current = snapshot;
        setLearnSessionIdOverride(result.sessionId);
      } else {
        if (!isVocabTestSessionSnapshot(snapshot)) return;
        latestTestSnapshotRef.current = snapshot;
        setTestSessionIdOverride(result.sessionId);
      }
    },
    [instituteId, selectedSessionUnitId, upsertLearningSessionMutation]
  );

  const getOrCreateSessionId = useCallback(
    (mode: SessionMode) => {
      const current =
        mode === 'FLASHCARD'
          ? flashcardSessionId
          : mode === 'LEARN'
            ? learnSessionId
            : testSessionId;
      if (current) return current;

      const created = createLearningSessionId(
        `vocab-${mode.toLowerCase()}-${instituteId || 'course'}-${selectedSessionUnitId}`
      );
      if (mode === 'FLASHCARD') {
        setFlashcardSessionIdOverride(created);
      } else if (mode === 'LEARN') {
        setLearnSessionIdOverride(created);
      } else {
        setTestSessionIdOverride(created);
      }
      return created;
    },
    [flashcardSessionId, instituteId, learnSessionId, selectedSessionUnitId, testSessionId]
  );

  const completeSessionForMode = useCallback(
    async (mode: SessionMode) => {
      const sessionId =
        mode === 'FLASHCARD'
          ? flashcardSessionId
          : mode === 'LEARN'
            ? learnSessionId
            : testSessionId;
      if (!sessionId) return;
      await trackLearningEvent({
        sessionId,
        module: 'VOCAB',
        surface: 'VOCAB_MODULE',
        courseId: instituteId,
        unitId: selectedSessionUnitId === ALL_UNIT_SESSION_ID ? undefined : selectedSessionUnitId,
        contentId: `${instituteId || 'course'}:${selectedSessionUnitId}:${mode}`,
        eventName: 'review_completed',
        source: 'vocab_module',
        result: 'completed',
      });
      await completeLearningSessionMutation({ sessionId });
      if (mode === 'FLASHCARD') {
        setFlashcardSessionIdOverride(null);
        setFlashcardResumeSnapshotOverride(null);
        latestFlashcardSnapshotRef.current = null;
      } else if (mode === 'LEARN') {
        setLearnSessionIdOverride(null);
        setLearnResumeSnapshotOverride(null);
        latestLearnSnapshotRef.current = null;
      } else {
        setTestSessionIdOverride(null);
        setTestResumeSnapshotOverride(null);
        latestTestSnapshotRef.current = null;
      }
    },
    [
      completeLearningSessionMutation,
      flashcardSessionId,
      instituteId,
      learnSessionId,
      selectedSessionUnitId,
      testSessionId,
      trackLearningEvent,
    ]
  );

  const requestFreshVocabTestAttempt = useCallback(async (): Promise<boolean> => {
    try {
      await consumeVocabTestAttemptMutation({});
      return true;
    } catch (error) {
      const entitlementError = getEntitlementErrorData(error);
      if (entitlementError?.upgradeSource) {
        startUpgradeFlow({
          plan: 'ANNUAL',
          source: entitlementError.upgradeSource,
        });
        return false;
      }
      notify.error(labels.vocab?.testStartFailed || 'Unable to start test mode right now.');
      return false;
    }
  }, [consumeVocabTestAttemptMutation, labels.vocab?.testStartFailed, startUpgradeFlow]);

  const requestOpenSessionMode = useCallback(
    async (mode: SessionMode) => {
      if (
        mode === 'FLASHCARD' &&
        flashcardResumeSnapshot &&
        flashcardResumeSnapshot.orderedWordIds.length >= 4
      ) {
        const total = Math.max(flashcardResumeSnapshot.orderedWordIds.length, 1);
        const completed = Math.max(0, Math.min(flashcardResumeSnapshot.cardIndex, total));
        const remaining = Math.max(0, total - completed);
        const progressPercent = Math.round((completed / total) * 100);
        setResumeCandidate({
          mode,
          sessionId: flashcardSessionId || '',
          completed,
          remaining,
          total,
          progressPercent,
        });
        setResumeModePrompt(mode);
        return;
      }
      if (mode === 'LEARN' && learnResumeSnapshot && learnResumeSnapshot.wordIds.length >= 4) {
        const total = Math.max(learnResumeSnapshot.wordIds.length, 1);
        const completed = Math.max(0, Math.min(learnResumeSnapshot.totalAnswered, total));
        const remaining = Math.max(0, total - completed);
        const progressPercent = Math.round((completed / total) * 100);
        setResumeCandidate({
          mode,
          sessionId: learnSessionId || '',
          completed,
          remaining,
          total,
          progressPercent,
        });
        setResumeModePrompt(mode);
        return;
      }
      if (mode === 'TEST' && testResumeSnapshot && testResumeSnapshot.cards.length > 0) {
        const total = Math.max(testResumeSnapshot.cards.length, 1);
        const answered = Object.keys(testResumeSnapshot.answers || {}).length;
        const completed = Math.max(0, Math.min(answered, total));
        const remaining = Math.max(0, total - completed);
        const progressPercent = Math.round((completed / total) * 100);
        setResumeCandidate({
          mode,
          sessionId: testSessionId || '',
          completed,
          remaining,
          total,
          progressPercent,
        });
        setResumeModePrompt(mode);
        return;
      }
      if (mode === 'TEST') {
        const allowed = await requestFreshVocabTestAttempt();
        if (!allowed) {
          return;
        }
      }
      const sessionId = getOrCreateSessionId(mode);
      await trackLearningEvent({
        sessionId,
        module: 'VOCAB',
        surface: 'VOCAB_MODULE',
        courseId: instituteId,
        unitId: selectedSessionUnitId === ALL_UNIT_SESSION_ID ? undefined : selectedSessionUnitId,
        contentId: `${instituteId || 'course'}:${selectedSessionUnitId}:${mode}`,
        eventName: 'review_started',
        source: 'vocab_module',
        metadata: {
          mode,
        },
      });
      if (mode === 'FLASHCARD') {
        setViewState(prev => ({ ...prev, mode: 'flashcard' }));
      } else if (mode === 'LEARN') {
        setLearnOpen(true);
      } else {
        setTestOpen(true);
      }
    },
    [
      flashcardResumeSnapshot,
      learnResumeSnapshot,
      testResumeSnapshot,
      flashcardSessionId,
      learnSessionId,
      testSessionId,
      requestFreshVocabTestAttempt,
      getOrCreateSessionId,
      instituteId,
      selectedSessionUnitId,
      trackLearningEvent,
    ]
  );

  useEffect(() => {
    if (!requestedMode || isMobile) return;

    const autoOpenKey = `${selectedSessionUnitId}:${requestedMode}`;
    if (autoOpenedModeRef.current === autoOpenKey) return;
    autoOpenedModeRef.current = autoOpenKey;

    if (requestedMode === 'match') {
      const timeoutId = globalThis.window.setTimeout(() => {
        setLearnOpen(false);
        setTestOpen(false);
        setViewState(prev => ({ ...prev, mode: 'match' }));
      }, 0);
      return () => globalThis.window.clearTimeout(timeoutId);
    }

    const sessionMode = toSessionMode(requestedMode);
    if (!sessionMode) return;
    const timeoutId = globalThis.window.setTimeout(() => {
      void requestOpenSessionMode(sessionMode);
    }, 0);
    return () => globalThis.window.clearTimeout(timeoutId);
  }, [isMobile, requestedMode, requestOpenSessionMode, selectedSessionUnitId]);

  const requestUnitSwitch = useCallback(
    (nextUnit: number | 'ALL') => {
      if (nextUnit === selectedUnitId) {
        setDropdownOpen(false);
        return;
      }
      const hasFlashcardInProgress = viewState.mode === 'flashcard' && !viewState.flashcardComplete;
      if (learnOpen || testOpen || hasFlashcardInProgress) {
        setPendingUnitSwitch(nextUnit);
        setDropdownOpen(false);
        return;
      }
      setSelectedUnitId(nextUnit);
      setDropdownOpen(false);
    },
    [learnOpen, testOpen, selectedUnitId, viewState.mode, viewState.flashcardComplete]
  );

  const confirmUnitSwitchWithSave = useCallback(async () => {
    const nextUnit = pendingUnitSwitch;
    if (nextUnit === null) return;

    try {
      if (
        viewState.mode === 'flashcard' &&
        !viewState.flashcardComplete &&
        latestFlashcardSnapshotRef.current
      ) {
        await persistLearningSnapshot('FLASHCARD', latestFlashcardSnapshotRef.current);
      }
      if (learnOpen && latestLearnSnapshotRef.current) {
        await persistLearningSnapshot('LEARN', latestLearnSnapshotRef.current);
      }
      if (testOpen && latestTestSnapshotRef.current) {
        await persistLearningSnapshot('TEST', latestTestSnapshotRef.current);
      }
    } catch (error) {
      logWarn('Failed to persist session before switching unit:', error);
    }

    setLearnOpen(false);
    setTestOpen(false);
    setSelectedUnitId(nextUnit);
    setPendingUnitSwitch(null);
  }, [
    learnOpen,
    testOpen,
    pendingUnitSwitch,
    persistLearningSnapshot,
    viewState.mode,
    viewState.flashcardComplete,
  ]);

  const continueFromResumePrompt = useCallback(() => {
    if (!resumeModePrompt) return;
    const sessionId =
      resumeModePrompt === 'FLASHCARD'
        ? flashcardSessionId
        : resumeModePrompt === 'LEARN'
          ? learnSessionId
          : testSessionId;
    if (sessionId) {
      void trackLearningEvent({
        sessionId,
        module: 'VOCAB',
        surface: 'VOCAB_MODULE',
        courseId: instituteId,
        unitId: selectedSessionUnitId === ALL_UNIT_SESSION_ID ? undefined : selectedSessionUnitId,
        contentId: `${instituteId || 'course'}:${selectedSessionUnitId}:${resumeModePrompt}`,
        eventName: 'session_resumed',
        source: 'vocab_module',
      });
    }
    if (resumeModePrompt === 'FLASHCARD') {
      setViewState(prev => ({ ...prev, mode: 'flashcard' }));
    } else if (resumeModePrompt === 'LEARN') {
      setLearnOpen(true);
    } else {
      setTestOpen(true);
    }
    setResumeModePrompt(null);
    setResumeCandidate(null);
  }, [
    flashcardSessionId,
    instituteId,
    learnSessionId,
    resumeModePrompt,
    selectedSessionUnitId,
    testSessionId,
    trackLearningEvent,
  ]);

  const restartFromResumePrompt = useCallback(async () => {
    if (!resumeModePrompt) return;
    if (resumeModePrompt === 'FLASHCARD') {
      if (flashcardSessionId) {
        await trackLearningEvent({
          sessionId: flashcardSessionId,
          module: 'VOCAB',
          surface: 'VOCAB_MODULE',
          courseId: instituteId,
          unitId: selectedSessionUnitId === ALL_UNIT_SESSION_ID ? undefined : selectedSessionUnitId,
          contentId: `${instituteId || 'course'}:${selectedSessionUnitId}:FLASHCARD`,
          eventName: 'session_abandoned',
          source: 'vocab_module',
          result: 'restart',
        });
        await abandonLearningSessionMutation({ sessionId: flashcardSessionId });
      }
      setFlashcardResumeSnapshotOverride(null);
      latestFlashcardSnapshotRef.current = null;
      setFlashcardSessionIdOverride(null);
      setViewState(prev => ({
        ...prev,
        mode: 'flashcard',
        cardIndex: 0,
        flashcardComplete: false,
      }));
    } else if (resumeModePrompt === 'LEARN') {
      if (learnSessionId) {
        await trackLearningEvent({
          sessionId: learnSessionId,
          module: 'VOCAB',
          surface: 'VOCAB_MODULE',
          courseId: instituteId,
          unitId: selectedSessionUnitId === ALL_UNIT_SESSION_ID ? undefined : selectedSessionUnitId,
          contentId: `${instituteId || 'course'}:${selectedSessionUnitId}:LEARN`,
          eventName: 'session_abandoned',
          source: 'vocab_module',
          result: 'restart',
        });
        await abandonLearningSessionMutation({ sessionId: learnSessionId });
      }
      setLearnResumeSnapshotOverride(null);
      latestLearnSnapshotRef.current = null;
      setLearnSessionIdOverride(null);
      setLearnOpen(true);
    } else {
      if (testSessionId) {
        await trackLearningEvent({
          sessionId: testSessionId,
          module: 'VOCAB',
          surface: 'VOCAB_MODULE',
          courseId: instituteId,
          unitId: selectedSessionUnitId === ALL_UNIT_SESSION_ID ? undefined : selectedSessionUnitId,
          contentId: `${instituteId || 'course'}:${selectedSessionUnitId}:TEST`,
          eventName: 'session_abandoned',
          source: 'vocab_module',
          result: 'restart',
        });
        await abandonLearningSessionMutation({ sessionId: testSessionId });
      }
      setTestResumeSnapshotOverride(null);
      latestTestSnapshotRef.current = null;
      setTestSessionIdOverride(null);
      setTestOpen(true);
    }
    setResumeModePrompt(null);
    setResumeCandidate(null);
  }, [
    abandonLearningSessionMutation,
    resumeModePrompt,
    flashcardSessionId,
    instituteId,
    learnSessionId,
    testSessionId,
    selectedSessionUnitId,
    trackLearningEvent,
  ]);

  const scopeTitle = (() => {
    if (selectedUnitId === 'ALL') {
      const localizedCourseName = course ? getLocalizedContent(course, 'name', language) : '';
      return localizedCourseName || course?.name || labels.vocab?.allUnits || 'All Units';
    }
    if (selectedUnitId === 0) {
      return labels.vocab?.unassigned ?? 'Unassigned';
    }
    return `${labels.vocab?.unit ?? 'Unit'} ${selectedUnitId}`;
  })();

  const tabs = useMemo(() => buildTabs(labels), [labels]);

  if (isLoading) {
    return <VocabModuleSkeleton />;
  }

  if (isMobile) {
    const flashcardResumeForMobile =
      flashcardResumeSnapshot && flashcardResumeSnapshot.orderedWordIds.length >= 4
        ? {
          completed: Math.max(
            0,
            Math.min(
              flashcardResumeSnapshot.cardIndex,
              flashcardResumeSnapshot.orderedWordIds.length
            )
          ),
          total: flashcardResumeSnapshot.orderedWordIds.length,
        }
        : null;
    const learnResumeForMobile =
      learnResumeSnapshot && learnResumeSnapshot.wordIds.length >= 4
        ? {
          completed: Math.max(
            0,
            Math.min(learnResumeSnapshot.totalAnswered, learnResumeSnapshot.wordIds.length)
          ),
          total: learnResumeSnapshot.wordIds.length,
        }
        : null;
    const testResumeForMobile =
      testResumeSnapshot && testResumeSnapshot.cards.length > 0
        ? {
          completed: Math.max(
            0,
            Math.min(
              Object.keys(testResumeSnapshot.answers || {}).length,
              testResumeSnapshot.cards.length
            )
          ),
          total: testResumeSnapshot.cards.length,
        }
        : null;
    const handleAbandonActiveSession = (mode: 'flashcard' | 'learn' | 'test') => {
      const sessionMode: SessionMode =
        mode === 'flashcard' ? 'FLASHCARD' : mode === 'learn' ? 'LEARN' : 'TEST';
      const sessionId =
        sessionMode === 'FLASHCARD'
          ? flashcardSessionId
          : sessionMode === 'LEARN'
            ? learnSessionId
            : testSessionId;
      if (!sessionId) return;
      void abandonLearningSessionMutation({ sessionId });
      if (sessionMode === 'FLASHCARD') {
        setFlashcardSessionIdOverride(null);
        setFlashcardResumeSnapshotOverride(null);
        latestFlashcardSnapshotRef.current = null;
      } else if (sessionMode === 'LEARN') {
        setLearnSessionIdOverride(null);
        setLearnResumeSnapshotOverride(null);
        latestLearnSnapshotRef.current = null;
      } else {
        setTestSessionIdOverride(null);
        setTestResumeSnapshotOverride(null);
        latestTestSnapshotRef.current = null;
      }
    };
    return (
      <MobileVocabView
        allWords={allWords}
        filteredWords={filteredWords}
        gameWords={gameWords}
        currentUnitId={selectedUnitId}
        availableUnits={availableUnits}
        unitCounts={unitCounts}
        masteryCount={masteryCount}
        onSelectUnit={setSelectedUnitId}
        onReview={handleReview}
        onStar={toggleStar}
        onSpeak={speakWord}
        isStarred={id => starredIds.has(id)}
        onFsrsReview={(wordId, isCorrect) => {
          const w = wordById.get(wordId);
          if (w) {
            handleReview(w, isCorrect);
          }
        }}
        instituteId={instituteId || ''}
        courseName={resolveCourseBreadcrumbLabel(course, language, instituteId)}
        institutes={institutes || []}
        language={language}
        userId={user?.id}
        initialMode={requestedMode ?? undefined}
        onRequestTestMode={requestFreshVocabTestAttempt}
        flashcardResume={flashcardResumeForMobile}
        learnResume={learnResumeForMobile}
        testResume={testResumeForMobile}
        testResumeSnapshot={testResumeSnapshot}
        onAbandonActiveSession={handleAbandonActiveSession}
        onSessionSnapshot={(mode: 'flashcard' | 'learn' | 'test', completed: number, total: number) => {
          let snapshot:
            | FlashcardSessionSnapshot
            | LearningSessionSnapshot
            | Partial<VocabTestSessionSnapshot>
            | undefined;
          if (mode === 'flashcard') {
            snapshot = {
              cardIndex: completed,
              isRandom: false,
              trackProgress: true,
              orderedWordIds: filteredWords.map(w => w.id),
              history: [],
              stats: { correctWordIds: [], incorrectWordIds: [] },
              timestamp: Date.now(),
            } satisfies FlashcardSessionSnapshot;
          } else if (mode === 'learn') {
            snapshot = {
              wordIds: filteredWords.map(w => w.id),
              questionIndex: completed,
              wrongWordIds: [],
              correctCount: completed,
              totalAnswered: completed,
              currentBatchNum: 1,
              settings: {
                multipleChoice: true,
                writingMode: false,
                mcDirection: 'KR_TO_NATIVE',
                writingDirection: 'KR_TO_NATIVE',
                autoTTS: true,
                soundEffects: true,
              },
              timestamp: Date.now(),
            } satisfies LearningSessionSnapshot;
          } else if (mode === 'test') {
            snapshot = {
              stage: 'RUNNING',
              questionCount: total,
              activeCardIndex: completed,
              cards: filteredWords.map(w => ({ wordId: w.id })),
              timestamp: Date.now(),
            } as any;
          }
          if (snapshot) {
            void persistLearningSnapshot(
              mode === 'flashcard' ? 'FLASHCARD' : mode === 'learn' ? 'LEARN' : 'TEST',
              snapshot as any
            );
          }
        }}
        onCompleteSession={(mode: 'flashcard' | 'learn' | 'test') => {
          const sessionMode: SessionMode =
            mode === 'flashcard' ? 'FLASHCARD' : mode === 'learn' ? 'LEARN' : 'TEST';
          void completeSessionForMode(sessionMode).then(() => {
            const flow = searchParams.get('flow');
            if (flow === 'today') {
              navigate('/dashboard?flow=today&auto=1', { replace: true });
            } else {
              navigate(resolveSafeReturnTo(searchParams.get('returnTo'), '/courses'));
            }
          });
        }}
      />
    );
  }

  const renderTopBar = () => (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
      <div className="flex items-center gap-3">
        {/* Back Button */}
        <Button
          type="button"
          variant="ghost"
          size="auto"
          onClick={() => {
            void flushQueue();
            navigate(`/course/${instituteId}`);
          }}
          className="w-10 h-10 bg-k-card border border-k-divider rounded-xl flex items-center justify-center hover:border-k-crimson hover:text-k-crimson transition-colors shadow-sm"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        {/* Scope Dropdown */}
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="auto"
              className="flex items-center gap-3 bg-k-card border border-k-divider rounded-xl px-4 py-1.5 hover:border-k-crimson transition-all shadow-sm"
            >
              <div className="w-7 h-7 rounded-lg bg-k-mint-deep/10 flex items-center justify-center text-base">
                📚
              </div>
              <div className="text-left">
                <div className="text-[10px] text-k-sub font-bold uppercase tracking-wider leading-tight">
                  {labels.vocab?.currentScope || 'Current Scope'}
                </div>
                <div className="font-extrabold text-k-ink text-[13px] leading-tight">
                  {selectedUnitId === 'ALL'
                    ? labels.vocab?.allUnits || 'All Units'
                    : `${labels.vocab?.unit || 'Unit'} ${selectedUnitId}`}
                </div>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-k-sub transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
              />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            unstyled
            className="w-64 bg-k-card border border-k-divider rounded-xl shadow-xl overflow-hidden z-50 p-2 space-y-1"
          >
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => {
                requestUnitSwitch('ALL');
                setDropdownOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg font-bold text-sm flex justify-between items-center ${selectedUnitId === 'ALL' ? 'bg-k-mint-deep/10 text-k-ink border border-k-divider' : 'hover:bg-k-bg2 text-k-sub'}`}
            >
              <span>📚 {labels.vocab?.allUnits || 'All Units'}</span>
              <span className="text-[10px] font-bold text-k-sub bg-k-bg px-1.5 py-0.5 rounded border border-k-divider">
                {allWords.length}
              </span>
            </Button>
            <div className="h-px bg-k-divider my-1 mx-2" />
            <div className="max-h-60 overflow-y-auto pr-1">
              {availableUnits.map(u => {
                const count = unitCounts.get(u) || 0;
                const disabled = count === 0;
                return (
                  <Button
                    key={u}
                    type="button"
                    variant="ghost"
                    size="auto"
                    onClick={() => {
                      if (disabled) return;
                      requestUnitSwitch(u);
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg font-bold text-sm flex justify-between items-center mb-1 ${selectedUnitId === u ? 'bg-k-mint-deep/10 text-k-ink border border-k-divider' : 'hover:bg-k-bg2 text-k-sub'}`}
                  >
                    <span>{u === 0 ? labels.vocab?.unassigned || 'Unassigned' : `${labels.vocab?.unit || 'Unit'} ${u}`}</span>
                    <span className="text-[10px] text-k-sub">{count}</span>
                  </Button>
                );
              })}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-3">
        {/* Mastery Stats */}
        <div className="flex items-center gap-3 bg-k-card px-4 py-1.5 rounded-xl border border-k-divider shadow-sm">
          <div className="text-right">
            <div className="text-[10px] font-bold text-k-sub uppercase leading-tight">
              {labels.vocab?.mastery || 'Mastery'}
            </div>
            <div className="font-extrabold text-[13px] text-k-ink leading-tight">
              {masteryCount} / {filteredWords.length}
            </div>
          </div>
          <div className="w-8 h-8 relative">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9155" fill="none" stroke="var(--color-k-bg2)" strokeWidth="4" />
              <circle
                cx="18"
                cy="18"
                r="15.9155"
                fill="none"
                stroke="var(--color-k-mint-deep)"
                strokeWidth="4"
                strokeDasharray={`${(masteryCount / Math.max(filteredWords.length, 1)) * 100} 100`}
              />
            </svg>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="auto"
          onClick={() => navigate('/courses')}
          className="rounded-xl border border-k-divider bg-k-card px-4 py-2 text-[12px] font-bold text-k-sub hover:text-k-crimson hover:border-k-crimson transition-all shadow-sm"
        >
          {labels.learningFlow?.actions?.switchMaterial || 'Switch textbook'}
        </Button>
      </div>
    </div>
  );

  const renderOverlays = () => (
    <>
      {learnOpen && (
        <VocabLearnOverlay
          open={learnOpen}
          onClose={() => setLearnOpen(false)}
          language={language as Language}
          title={labels.vocab?.learn || 'Learn'}
          variant="panel"
        >
          <VocabQuiz
            words={gameWords}
            courseId={instituteId}
            onComplete={() => {
              void flushQueue();
              void completeSessionForMode('LEARN');
            }}
            variant="learn"
            resumeSnapshot={learnResumeSnapshot}
            onSessionSnapshot={snapshot => {
              latestLearnSnapshotRef.current = snapshot;
              void persistLearningSnapshot('LEARN', snapshot);
            }}
            language={language as Language}
          />
        </VocabLearnOverlay>
      )}
      {testOpen && (
        <VocabLearnOverlay
          open={testOpen}
          onClose={() => setTestOpen(false)}
          language={language as Language}
          title={labels.vocab?.quiz || 'Test'}
          variant="panel"
        >
          <VocabTest
            words={filteredWords}
            language={language as Language}
            scopeTitle={resolveCourseBreadcrumbLabel(course, language, instituteId)}
            resumeSnapshot={testResumeSnapshot}
            onClose={() => setTestOpen(false)}
            onSessionSnapshot={snapshot => {
              latestTestSnapshotRef.current = snapshot;
              void persistLearningSnapshot('TEST', snapshot);
            }}
            onComplete={() => completeSessionForMode('TEST')}
          />
        </VocabLearnOverlay>
      )}
    </>
  );

  const handleTabClick = (tabId: TabId) => {
    if (tabId === 'flashcard') {
      requestOpenSessionMode('FLASHCARD');
      return;
    }
    if (tabId === 'learn') {
      requestOpenSessionMode('LEARN');
      return;
    }
    if (tabId === 'test') {
      requestOpenSessionMode('TEST');
      return;
    }
    setViewState(prev => ({ ...prev, mode: tabId }));
  };

  const renderModeTabs = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
      {tabs.map(tab => {
        let isActive = false;
        if (tab.id === 'learn') {
          isActive = learnOpen;
        } else if (tab.id === 'test') {
          isActive = testOpen;
        } else {
          isActive = viewState.mode === tab.id;
        }
        return (
          <Button
            key={tab.id}
            type="button"
            variant="ghost"
            size="auto"
            onClick={() => handleTabClick(tab.id)}
            className={`bg-k-card border rounded-2xl p-4 flex items-center justify-center gap-3 relative overflow-hidden transition-all shadow-sm ${isActive
                ? 'border-k-crimson ring-1 ring-k-crimson/20 bg-k-crimson/5'
                : 'border-k-divider hover:border-k-crimson/50 hover:bg-k-bg2'
              }`}
          >
            <span className="text-2xl">{tab.emoji}</span>
            <span
              className={`font-extrabold text-[14px] ${isActive ? 'text-k-crimson' : 'text-k-sub'
                }`}
            >
              {tab.label}
            </span>
          </Button>
        );
      })}
    </div>
  );



  const renderEmptyContent = () => (
    <div className="w-full max-w-4xl py-12">
      <EmptyState
        icon={BookOpen}
        title={
          selectedUnitId === 'ALL'
            ? labels.vocab?.noWords || 'No Words'
            : `${labels.vocab?.unit || 'Unit'} ${selectedUnitId} ${labels.vocab?.noWords || 'No Words'}`
        }
        description={labels.vocab?.noWordsDesc || 'No vocabulary content added yet.'}
        actionLabel={
          selectedUnitId === 'ALL'
            ? labels.coursesOverview?.backToHome || 'Back to Home'
            : labels.vocab?.allUnits || 'View All Units'
        }
        onAction={() =>
          selectedUnitId === 'ALL' ? navigate('/dashboard') : setSelectedUnitId('ALL')
        }
      />
    </div>
  );



  return (
    <Suspense fallback={<VocabModuleSkeleton />}>
      <DesktopVocabModulePage
        labels={labels}
        course={course}
        language={language}
        instituteId={instituteId}
        selectedUnitId={selectedUnitId}
        availableUnits={availableUnits}
        setSelectedUnitId={setSelectedUnitId}
        viewState={viewState}
        setViewState={setViewState}
        filteredWords={filteredWords}
        masteredIds={masteredIds}
        setMasteredIds={setMasteredIds}
        flashcardResumeSnapshot={flashcardResumeSnapshot}
        latestFlashcardSnapshotRef={latestFlashcardSnapshotRef}
        persistLearningSnapshot={persistLearningSnapshot}
        flushQueue={flushQueue}
        completeSessionForMode={completeSessionForMode}
        globalSettings={globalSettings}
        updateGlobalSettings={updateGlobalSettings}
        speakWord={speakWord}
        toggleStar={toggleStar}
        starredIds={starredIds}
        requestOpenSessionMode={requestOpenSessionMode}
        handleReview={handleReview}
        gameWords={gameWords}
        learnOpen={learnOpen}
        latestLearnSnapshotRef={latestLearnSnapshotRef}
        setLearnOpen={setLearnOpen}
        learnResumeSnapshot={learnResumeSnapshot}
        testOpen={testOpen}
        latestTestSnapshotRef={latestTestSnapshotRef}
        setTestOpen={setTestOpen}
        testResumeSnapshot={testResumeSnapshot}
        resumeModePrompt={resumeModePrompt}
        setResumeModePrompt={setResumeModePrompt}
        resumeCandidate={resumeCandidate}
        setResumeCandidate={setResumeCandidate}
        user={user}
        navigate={navigate}
        backPath={resolveSafeReturnTo(searchParams.get('returnTo'), '/courses')}


        resolveCourseBreadcrumbLabel={resolveCourseBreadcrumbLabel}
        getLabel={getLabel}
        restartFromResumePrompt={restartFromResumePrompt}
        continueFromResumePrompt={continueFromResumePrompt}
        pendingUnitSwitch={pendingUnitSwitch}
        setPendingUnitSwitch={setPendingUnitSwitch}
        confirmUnitSwitchWithSave={confirmUnitSwitchWithSave}
        renderEmptyContent={renderEmptyContent}
        renderTopBar={renderTopBar}
        renderModeTabs={renderModeTabs}
        renderOverlays={renderOverlays}
      />
    </Suspense>
  );
}

export default React.memo(VocabModulePage);
