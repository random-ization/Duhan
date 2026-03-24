import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  lazy,
  Suspense,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { useParams } from 'react-router-dom';
import { ChevronLeft, ChevronDown, BookOpen } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLearningActions, useLearningSelection } from '../contexts/LearningContext';
import { useData } from '../contexts/DataContext';
import { UserWordProgress, VocabularyItem } from '../types';
import EmptyState from '../components/common/EmptyState';
import { useQuery, useMutation } from 'convex/react';
import { useTTS } from '../hooks/useTTS';
import { getLabel, getLabels } from '../utils/i18n';
import { getLocalizedContent } from '../utils/languageUtils';
import { VocabModuleSkeleton } from '../components/common';
import { VOCAB, mRef } from '../utils/convexRefs';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import type { Id } from '../../convex/_generated/dataModel';
import VocabProgressSections from '../features/vocab/components/VocabProgressSections';
import VocabLearnOverlay from '../features/vocab/components/VocabLearnOverlay';
import VocabTest from '../features/vocab/components/VocabTest';
import { useFSRSBatchProgress } from '../features/vocab/hooks/useVocabProgress';

const FlashcardView = lazy(() => import('../features/vocab/components/FlashcardView'));
const VocabQuiz = lazy(() => import('../features/vocab/components/VocabQuiz'));
const VocabMatch = lazy(() => import('../features/vocab/components/VocabMatch'));
import MobileVocabView from '../components/mobile/MobileVocabView';
import { useIsMobile } from '../hooks/useIsMobile';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../components/ui';
import { Button } from '../components/ui';
import { AppBreadcrumb } from '../components/common/AppBreadcrumb';

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

const fallbackString = (value: string | undefined, fallback: string): string => value ?? fallback;

const getReviewDeckArgs = (instituteId: string | undefined) =>
  instituteId ? { courseId: instituteId } : ('skip' as const);

const getFsrsPersistKey = (instituteId: string | undefined): string =>
  instituteId ? `fsrs-progress-queue:${instituteId}` : 'fsrs-progress-queue:default';

const isWordsLoading = (queryResult: unknown, institutesLoading: boolean): boolean =>
  queryResult === undefined || institutesLoading;

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
  if (course?.name) return course.name;
  if (instituteId) return instituteId;
  return 'Course';
}

const isLevelConfig = (value: unknown): value is LevelConfig => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as { level?: unknown; units?: unknown };
  return typeof candidate.level === 'number' && typeof candidate.units === 'number';
};

// Extracted constants for styles to prevent recreation on every render
const BACKGROUND_STYLE = {
  backgroundColor: '#F0F4F8',
  backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)',
  backgroundSize: '24px 24px',
} as const;

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

export default function VocabModulePage() {
  // Force Rebuild Trigger: 2026-01-02
  const navigate = useLocalizedNavigate();
  const { instituteId } = useParams<{ instituteId: string }>();
  const { user, language } = useAuth();
  const { selectedLevel } = useLearningSelection();
  const { setSelectedInstitute, setSelectedLevel } = useLearningActions();
  const { institutes, isLoading: institutesLoading } = useData();
  const { speak: speakTTS } = useTTS();
  const isMobile = useIsMobile();
  const labels = getLabels(language);

  useSyncInstituteSelection({
    instituteId,
    selectedLevel,
    setSelectedInstitute,
    setSelectedLevel,
  });

  const course = institutes?.find(i => i.id === instituteId);

  // State - Merged related states for better performance
  const [selectedUnitId, setSelectedUnitId] = useState<number | 'ALL'>('ALL');
  const [viewState, setViewState] = useState({
    mode: 'flashcard' as ViewMode,
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
        console.error('FSRS queue error:', err);
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
      });
    },
    [addToReviewMutation, language, starredIds, wordById]
  );

  const speakWord = useCallback(
    (text: string) => {
      void speakTTS(text);
    },
    [speakTTS]
  );

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
        language={language}
        userId={user?.id}
      />
    );
  }

  const renderTopBar = () => (
    <div className="flex items-center justify-between mb-6 z-50 relative">
      <div className="flex items-center gap-4">
        {/* Back Button */}
        <Button
          type="button"
          variant="ghost"
          size="auto"
          onClick={() => {
            void flushQueue();
            navigate(`/course/${instituteId}`);
          }}
          className="w-10 h-10 bg-card border-2 border-border rounded-xl flex items-center justify-center hover:border-foreground transition-colors shadow-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        {/* Scope Dropdown */}
        <div className="relative">
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="auto"
                className="flex items-center gap-3 bg-card border-2 border-foreground rounded-xl px-4 py-2 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] transition-all active:translate-y-0 active:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]"
              >
                <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-400/14 border border-green-200 dark:border-green-300/25 flex items-center justify-center text-lg">
                  📚
                </div>
                <div className="text-left mr-2">
                  <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                    {labels.vocab?.currentScope || 'Current Scope'}
                  </div>
                  <div className="font-black text-foreground leading-none">
                    {selectedUnitId === 'ALL'
                      ? labels.vocab?.allUnits || 'All Units'
                      : `${labels.vocab?.unit || 'Unit'} ${selectedUnitId}`}
                  </div>
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              unstyled
              className="absolute top-full left-0 mt-2 w-64 bg-card border-2 border-foreground rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] overflow-hidden z-50"
            >
              <div className="p-2 space-y-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="auto"
                  onClick={() => {
                    setSelectedUnitId('ALL');
                    setDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg font-bold text-sm flex justify-between items-center ${selectedUnitId === 'ALL' ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-400/12 dark:text-green-200 dark:border-green-300/25' : 'hover:bg-muted text-muted-foreground'}`}
                >
                  <span>📚 {labels.vocab?.allUnits || 'All Units'} (Level 1A)</span>
                  <span
                    className={`px-1.5 rounded text-[10px] ${selectedUnitId === 'ALL' ? 'bg-card border border-green-200 dark:border-green-300/25' : 'text-muted-foreground'}`}
                  >
                    {allWords.length}
                  </span>
                </Button>
                <div className="h-px bg-muted my-1" />
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
                        setSelectedUnitId(u);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg font-medium text-sm flex justify-between items-center ${(() => {
                        if (selectedUnitId === u)
                          return 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-400/12 dark:text-green-200 dark:border-green-300/25';
                        if (disabled) return 'text-muted-foreground cursor-not-allowed';
                        return 'hover:bg-muted text-muted-foreground hover:text-foreground';
                      })()}`}
                    >
                      <span>
                        {(() => {
                          if (u === 0) return labels.vocab?.unassigned || 'Unassigned';
                          return `${labels.vocab?.unit || 'Unit'} ${u}`;
                        })()}
                      </span>
                      <span className="text-muted-foreground text-xs">{count}</span>
                    </Button>
                  );
                })}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mastery */}
      <div className="hidden md:flex items-center gap-3 bg-card px-4 py-2 rounded-xl border border-border">
        <div className="text-right">
          <div className="text-[10px] font-bold text-muted-foreground uppercase">
            {labels.vocab?.mastery || 'Mastery'}
          </div>
          <div className="font-black text-sm text-foreground">
            {masteryCount} / {filteredWords.length}
          </div>
        </div>
        <div className="w-10 h-10 relative">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#f1f5f9" strokeWidth="4" />
            <circle
              cx="18"
              cy="18"
              r="15.9155"
              fill="none"
              stroke="#4ADE80"
              strokeWidth="4"
              strokeDasharray={`${(masteryCount / Math.max(filteredWords.length, 1)) * 100} 100`}
            />
          </svg>
        </div>
      </div>
    </div>
  );

  const handleTabClick = (tabId: TabId) => {
    if (tabId === 'learn') {
      setLearnOpen(true);
      return;
    }
    if (tabId === 'test') {
      setTestOpen(true);
      return;
    }
    setViewState(prev => ({ ...prev, mode: tabId }));
  };

  const renderModeTabs = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            className={`bg-card border-2 rounded-xl p-3 flex items-center justify-center gap-2 relative overflow-hidden transition-all ${
              isActive
                ? 'border-foreground shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]'
                : 'border-transparent hover:border-foreground shadow-sm hover:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]'
            }`}
          >
            {isActive && <div className="absolute inset-0 bg-green-50 dark:bg-green-400/12 z-0" />}
            {isActive && (
              <div className="absolute bottom-0 left-0 w-full h-1 bg-[#4ADE80] dark:bg-green-300" />
            )}
            <span className="relative z-10 text-xl">{tab.emoji}</span>
            <span
              className={`relative z-10 font-black text-sm ${
                isActive ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              {tab.label}
            </span>
          </Button>
        );
      })}
    </div>
  );

  const renderOverlays = () => (
    <>
      <VocabLearnOverlay
        open={learnOpen}
        onClose={() => {
          void flushQueue();
          setLearnOpen(false);
        }}
        language={language}
        title={labels.learn || 'Learn'}
        variant="fullscreen"
      >
        <div className="p-4 sm:p-6">
          <Suspense fallback={<VocabModuleSkeleton />}>
            <VocabQuiz
              key={`learn-${selectedUnitId}-${gameWords.length}`}
              words={gameWords}
              courseId={instituteId}
              onComplete={stats => {
                console.log('Learn completed:', stats);
                void flushQueue();
              }}
              hasNextUnit={
                typeof selectedUnitId === 'number' &&
                availableUnits.indexOf(selectedUnitId) < availableUnits.length - 1
              }
              onNextUnit={() => {
                if (typeof selectedUnitId === 'number') {
                  const currentIdx = availableUnits.indexOf(selectedUnitId);
                  if (currentIdx < availableUnits.length - 1) {
                    setSelectedUnitId(availableUnits[currentIdx + 1]);
                  }
                }
              }}
              currentUnitLabel={
                selectedUnitId === 'ALL'
                  ? labels.vocab?.allUnits || 'All Units'
                  : `${labels.vocab?.unit || 'Unit'} ${selectedUnitId}`
              }
              userId={user?.id}
              language={language}
              variant="learn"
              onFsrsReview={(wordId, isCorrect) => {
                const w = wordById.get(wordId);
                if (w) handleReview(w, isCorrect);
              }}
            />
          </Suspense>
        </div>
      </VocabLearnOverlay>

      <VocabLearnOverlay
        open={testOpen}
        onClose={() => {
          void flushQueue();
          setTestOpen(false);
        }}
        language={language}
        title={labels.vocab?.quiz || 'Test'}
        variant="fullscreen"
      >
        <VocabTest
          words={filteredWords}
          language={language}
          scopeTitle={scopeTitle}
          onClose={() => setTestOpen(false)}
          showCloseButton={false}
          onFsrsReview={(wordId, isCorrect) => {
            const w = wordById.get(wordId);
            if (w) {
              handleReview(w, isCorrect);
            }
          }}
        />
      </VocabLearnOverlay>
    </>
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

  const renderFlashcardCompletionPanel = () => (
    <div className="bg-card rounded-[1.5rem] border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] overflow-hidden min-h-[500px] flex flex-col relative z-0">
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-green-50 to-white dark:from-green-400/12 dark:to-card">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-400/14 rounded-full flex items-center justify-center mb-6">
          <span className="text-4xl">🎉</span>
        </div>
        <h2 className="text-3xl font-black text-foreground mb-2">
          {labels.sessionComplete || 'Session Complete!'}
        </h2>
        <p className="text-muted-foreground mb-2">
          {filteredWords.length} {labels.wordsUnit || 'words'}{' '}
          {labels.vocab?.reviewed || 'reviewed'}
        </p>
        <div className="flex gap-2 mb-8">
          <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-400/14 dark:text-green-200 rounded-full text-sm font-bold">
            ✓ {labels.vocab?.remembered || 'Remembered'} {masteredIds.size}
          </span>
          <span className="px-3 py-1 bg-red-100 text-red-700 dark:bg-red-400/14 dark:text-red-200 rounded-full text-sm font-bold">
            ✕ {labels.vocab?.forgot || 'Forgot'} {filteredWords.length - masteredIds.size}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={() => setLearnOpen(true)}
            className="px-6 py-3 bg-card border-2 border-foreground text-foreground font-black rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-1 transition-all"
          >
            🧠 {labels.learn || 'Learn'}
          </Button>
          {typeof selectedUnitId === 'number' &&
            availableUnits.indexOf(selectedUnitId) < availableUnits.length - 1 && (
              <Button
                type="button"
                variant="ghost"
                size="auto"
                onClick={() => {
                  const currentIdx = availableUnits.indexOf(selectedUnitId);
                  if (currentIdx < availableUnits.length - 1) {
                    setSelectedUnitId(availableUnits[currentIdx + 1]);
                  }
                }}
                className="px-6 py-3 bg-green-500 dark:bg-green-400/80 border-2 border-green-600 dark:border-green-300/35 text-primary-foreground font-black rounded-xl shadow-[4px_4px_0px_0px_rgba(22,163,74,1)] dark:shadow-[4px_4px_0px_0px_rgba(74,222,128,0.28)] hover:-translate-y-1 transition-all"
              >
                {labels.common?.next || 'Next Unit'} →
              </Button>
            )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="auto"
          onClick={() => {
            setViewState(prev => ({ ...prev, cardIndex: 0, flashcardComplete: false }));
            setMasteredIds(new Set());
          }}
          className="mt-4 text-sm text-muted-foreground hover:text-muted-foreground"
        >
          🔄 {labels.vocab?.restart || 'Restart'}
        </Button>
      </div>
    </div>
  );

  const renderFlashcardDeck = () => (
    <Suspense fallback={<VocabModuleSkeleton />}>
      <FlashcardView
        key={`${instituteId}:${selectedUnitId}`}
        words={filteredWords}
        language={language}
        courseId={instituteId}
        progressKey={`${instituteId}:${selectedUnitId}`}
        settings={{
          flashcard: {
            batchSize: 200,
            random: false,
            autoTTS: false,
            cardFront: 'KOREAN',
          },
          learn: {
            batchSize: 20,
            random: true,
            ratingMode: 'PASS_FAIL',
            types: { multipleChoice: true, writing: true },
            answers: { korean: true, native: true },
          },
        }}
        onComplete={stats => {
          void flushQueue();
          setViewState(prev => ({ ...prev, flashcardComplete: true }));
          const newMastered = new Set(masteredIds);
          stats.correct.forEach(w => newMastered.add(w.id));
          setMasteredIds(newMastered);
        }}
        onSaveWord={word => {
          if (!starredIds.has(word.id)) {
            toggleStar(word.id);
          }
        }}
        onRequestNavigate={target => {
          if (target === 'learn') {
            setLearnOpen(true);
            return;
          }
          if (target === 'test') {
            setTestOpen(true);
            return;
          }
          setViewState(prev => ({ ...prev, mode: target as ViewMode }));
        }}
        onSpeak={speakWord}
        onCardReview={handleReview}
      />
    </Suspense>
  );

  const renderFlashcardContent = () => (
    <>
      <div className="w-full max-w-4xl mb-10 z-0">
        {viewState.flashcardComplete ? renderFlashcardCompletionPanel() : renderFlashcardDeck()}
      </div>
      <div className="w-full max-w-4xl mb-10">
        <VocabProgressSections
          words={filteredWords}
          language={language}
          redEyeEnabled={redSheetActive}
          onRedEyeEnabledChange={setRedSheetActive}
          starredIds={starredIds}
          onToggleStar={toggleStar}
          onSpeak={speakWord}
        />
      </div>
    </>
  );

  const renderMatchContent = () => (
    <div className="w-full max-w-4xl">
      <Suspense fallback={<VocabModuleSkeleton />}>
        <VocabMatch
          key={`match-${selectedUnitId}-${gameWords.length}`}
          words={gameWords}
          onComplete={(time, moves) => console.log('Match completed:', time, moves)}
        />
      </Suspense>
    </div>
  );

  const renderContent = () => {
    if (filteredWords.length === 0) return renderEmptyContent();

    return (
      <>
        {viewState.mode === 'flashcard' ? renderFlashcardContent() : null}
        {viewState.mode === 'match' ? renderMatchContent() : null}
      </>
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-6 px-4" style={BACKGROUND_STYLE}>
      <div className="w-full max-w-4xl mb-6">
        <AppBreadcrumb
          className="mb-4"
          items={[
            { label: labels.coursesOverview?.pageTitle || 'Courses', to: '/courses' },
            {
              label: resolveCourseBreadcrumbLabel(course, language, instituteId),
              to: instituteId ? `/course/${instituteId}` : '/courses',
            },
            { label: labels.vocab?.flashcard || 'Vocab' },
          ]}
        />
        {/* Top Bar */}
        {renderTopBar()}

        {/* Mode Tabs */}
        {renderModeTabs()}
      </div>

      {renderContent()}

      {renderOverlays()}

      <style>{`
                .perspective-1000 { perspective: 1000px; }
                .transform-style-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; }
                .rotate-y-180 { transform: rotateY(180deg); }
                .card-content { transform-origin: center center; }
            `}</style>
    </div>
  );
}
