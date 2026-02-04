import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronLeft, ChevronDown, BookOpen } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLearning } from '../contexts/LearningContext';
import { useData } from '../contexts/DataContext';
import { UserWordProgress, VocabularyItem } from '../types';
import EmptyState from '../components/common/EmptyState';
import { useQuery, useMutation, useAction } from 'convex/react';
import { useTTS } from '../hooks/useTTS';
import { useApp } from '../contexts/AppContext';
import { getLabel, getLabels } from '../utils/i18n';
import { getLocalizedContent } from '../utils/languageUtils';
import { VocabModuleSkeleton } from '../components/common';
import { FSRS, VOCAB } from '../utils/convexRefs';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import type { Id } from '../../convex/_generated/dataModel';
import VocabProgressSections from '../features/vocab/components/VocabProgressSections';
import VocabLearnOverlay from '../features/vocab/components/VocabLearnOverlay';
import VocabTest from '../features/vocab/components/VocabTest';

const FlashcardView = lazy(() => import('../features/vocab/components/FlashcardView'));
const VocabQuiz = lazy(() => import('../features/vocab/components/VocabQuiz'));
const VocabMatch = lazy(() => import('../features/vocab/components/VocabMatch'));

interface ExtendedVocabItem extends VocabularyItem {
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

// Extracted constants for styles to prevent recreation on every render
const BACKGROUND_STYLE = {
  backgroundColor: '#F0F4F8',
  backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)',
  backgroundSize: '24px 24px',
} as const;

export default function VocabModulePage() {
  // Force Rebuild Trigger: 2026-01-02
  const navigate = useLocalizedNavigate();
  const { instituteId } = useParams<{ instituteId: string }>();
  const { user } = useAuth();
  const { setSelectedInstitute, selectedLevel, setSelectedLevel } = useLearning();
  const { institutes } = useData();
  const { speak: speakTTS } = useTTS();
  const { language } = useApp();
  const labels = getLabels(language);

  // Sync instituteId to context - only run when instituteId changes
  useEffect(() => {
    if (instituteId) {
      setSelectedInstitute(instituteId);
      // Only set level if it's not already set
      if (!selectedLevel) {
        setSelectedLevel(1);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instituteId]); // Only depend on instituteId to prevent loops

  const course = institutes.find(i => i.id === instituteId);

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
  const convexWordsQuery = useQuery(
    VOCAB.getOfCourse,
    instituteId ? { courseId: instituteId } : 'skip'
  );
  const updateProgressMutation = useMutation(VOCAB.updateProgress);
  const updateProgressV2Mutation = useMutation(VOCAB.updateProgressV2);
  const addToReviewMutation = useMutation(VOCAB.addToReview);
  const calculateNextSchedule = useAction(FSRS.calculateNextSchedule);

  // Derive loading state and allWords directly from query - no extra state needed
  const isLoading = convexWordsQuery === undefined;
  const allWords = useMemo<ExtendedVocabItem[]>(() => {
    if (!convexWordsQuery) return [];
    return convexWordsQuery.map(w => {
      const unit = typeof w.unitId === 'number' ? w.unitId : Number(w.unitId);
      const normalizedUnit = Number.isNaN(unit) ? 0 : unit;
      return {
        id: w._id,
        korean: w.word,
        english: w.meaning,
        word: w.word,
        meaning: w.meaning,
        meaningEn: w.meaningEn,
        meaningVi: w.meaningVi,
        meaningMn: w.meaningMn,
        pronunciation: w.pronunciation,
        hanja: w.hanja,
        partOfSpeech: w.partOfSpeech as VocabularyItem['partOfSpeech'],
        tips: w.tips as VocabularyItem['tips'],
        exampleSentence: w.exampleSentence,
        exampleMeaning: w.exampleMeaning,
        exampleTranslation: w.exampleMeaning,
        exampleTranslationEn: w.exampleMeaningEn,
        exampleTranslationVi: w.exampleMeaningVi,
        exampleTranslationMn: w.exampleMeaningMn,
        unit: normalizedUnit,
        courseId: instituteId,
        unitId: String(normalizedUnit),
        progress: w.progress
          ? {
              ...w.progress,
              status: w.progress.status as UserWordProgress['status'],
            }
          : null,
        mastered: w.mastered || false,
      };
    });
  }, [convexWordsQuery, instituteId]);

  // Initialize Mastered IDs when data arrives
  useEffect(() => {
    if (allWords.length > 0) {
      const mastered = new Set(
        allWords.filter(w => w.mastered || w.progress?.status === 'MASTERED').map(w => w.id)
      );
      setMasteredIds(mastered);
    }
  }, [allWords]);

  useEffect(() => {
    if (allWords.length > 0) {
      const starred = new Set(allWords.filter(w => w.progress != null).map(w => w.id));
      setStarredIds(starred);
    }
  }, [allWords]);

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

  useEffect(() => {
    setViewState(prev => ({ ...prev, cardIndex: 0, isFlipped: false, flashcardComplete: false }));
  }, [selectedUnitId]);

  const availableUnits = useMemo(() => {
    // Check if this is a Volume 2 course
    const isVolume2 =
      (course?.volume &&
        (course.volume === '2' || course.volume === 'B' || course.volume === '下')) ||
      (course?.id &&
        (course.id.includes('_1b') || course.id.includes('_2b') || course.id.endsWith('b'))) ||
      (course?.name && (course.name.includes('1B') || course.name.includes('2B')));

    const startUnit = isVolume2 ? 11 : 1;
    // If it's volume 2, we assume units are 11-20 (or similar range)
    // If totalUnits is e.g. 10 (per book), then Vol 1 is 1-10, Vol 2 is 11-20.
    // If totalUnits is 20 (legacy default), we might want to cap it.
    // Let's assume standard 10 units per volume for Yonsei-like courses.
    const count =
      course?.levels?.[0] && typeof course.levels[0] === 'object'
        ? (course.levels[0] as any).units || 10
        : 10;

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
      last_review: word.last_review ?? undefined,
    };
  };

  const handleReview = useCallback(
    async (word: ExtendedVocabItem, result: boolean | number) => {
      if (!user?.id) return;

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

      try {
        let rating = 1;
        if (typeof result === 'number') {
          rating = result;
        } else {
          rating = result ? 3 : 1;
        }

        const currentCardState = getFSRSState(word);

        const nextState = await calculateNextSchedule({
          currentCard: currentCardState,
          rating,
        });

        const fsrsState = { ...nextState };
        delete (fsrsState as any).review_log;

        await updateProgressV2Mutation({
          wordId: word.id as Id<'words'>,
          rating,
          fsrsState,
        });
      } catch (err) {
        console.error('FSRS Error:', err);
        if (typeof result === 'boolean') {
          updateProgressMutation({ wordId: word.id, quality: result ? 5 : 0 });
        }
      }
    },
    [calculateNextSchedule, updateProgressMutation, updateProgressV2Mutation, user?.id]
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
      void addToReviewMutation({
        word: w.korean,
        meaning: w.meaning || w.english,
        partOfSpeech: w.partOfSpeech,
        source: 'TEXTBOOK',
      });
    },
    [addToReviewMutation, starredIds, wordById]
  );

  const speakWord = useCallback(
    (text: string) => {
      void speakTTS(text);
    },
    [speakTTS]
  );

  const scopeTitle = useMemo(() => {
    if (selectedUnitId === 'ALL') {
      return (
        course?.nameZh || course?.nameEn || course?.name || labels.vocab?.allUnits || 'All Units'
      );
    }
    if (selectedUnitId === 0) {
      return labels.vocab?.unassigned || 'Unassigned';
    }
    return `${labels.vocab?.unit || 'Unit'} ${selectedUnitId}`;
  }, [
    course?.name,
    course?.nameEn,
    course?.nameZh,
    labels.vocab?.unit,
    labels.vocab?.allUnits,
    labels.vocab?.unassigned,
    selectedUnitId,
  ]);

  const tabs: { id: TabId; label: string; emoji: string }[] = [
    {
      id: 'flashcard',
      label: labels.vocab?.flashcard || 'Flashcard',
      emoji: '🎴',
    },
    {
      id: 'learn',
      label: labels.learn || 'Learn',
      emoji: '🧠',
    },
    {
      id: 'test',
      label: labels.vocab?.quiz || 'Test',
      emoji: '📝',
    },
    { id: 'match', label: getLabel(labels, ['vocab', 'match']) || 'Match', emoji: '🧩' },
  ];

  if (isLoading) {
    return <VocabModuleSkeleton />;
  }

  const renderTopBar = () => (
    <div className="flex items-center justify-between mb-6 z-50 relative">
      <div className="flex items-center gap-4">
        {/* Back Button */}
        <button
          onClick={() => navigate(`/course/${instituteId}`)}
          className="w-10 h-10 bg-white border-2 border-slate-200 rounded-xl flex items-center justify-center hover:border-slate-900 transition-colors shadow-sm text-slate-400 hover:text-slate-900"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Scope Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 bg-white border-2 border-slate-900 rounded-xl px-4 py-2 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-0.5 hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] transition-all active:translate-y-0 active:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]"
          >
            <div className="w-8 h-8 rounded-lg bg-green-100 border border-green-200 flex items-center justify-center text-lg">
              📚
            </div>
            <div className="text-left mr-2">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                {labels.vocab?.currentScope || 'Current Scope'}
              </div>
              <div className="font-black text-slate-900 leading-none">
                {selectedUnitId === 'ALL'
                  ? labels.vocab?.allUnits || 'All Units'
                  : `${labels.vocab?.unit || 'Unit'} ${selectedUnitId}`}
              </div>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-white border-2 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] overflow-hidden z-50">
              <div className="p-2 space-y-1">
                <button
                  onClick={() => {
                    setSelectedUnitId('ALL');
                    setDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg font-bold text-sm flex justify-between items-center ${selectedUnitId === 'ALL' ? 'bg-green-50 text-green-800 border border-green-200' : 'hover:bg-slate-50 text-slate-600'}`}
                >
                  <span>📚 {labels.vocab?.allUnits || 'All Units'} (Level 1A)</span>
                  <span
                    className={`px-1.5 rounded text-[10px] ${selectedUnitId === 'ALL' ? 'bg-white border border-green-200' : 'text-slate-300'}`}
                  >
                    {allWords.length}
                  </span>
                </button>
                <div className="h-px bg-slate-100 my-1" />
                {availableUnits.map(u => {
                  const count = unitCounts.get(u) || 0;
                  const disabled = count === 0;
                  return (
                    <button
                      key={u}
                      onClick={() => {
                        if (disabled) return;
                        setSelectedUnitId(u);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg font-medium text-sm flex justify-between items-center ${(() => {
                        if (selectedUnitId === u)
                          return 'bg-green-50 text-green-800 border border-green-200';
                        if (disabled) return 'text-slate-300 cursor-not-allowed';
                        return 'hover:bg-slate-50 text-slate-600 hover:text-slate-900';
                      })()}`}
                    >
                      <span>
                        {(() => {
                          if (u === 0) return labels.vocab?.unassigned || 'Unassigned';
                          return `${labels.vocab?.unit || 'Unit'} ${u}`;
                        })()}
                      </span>
                      <span className="text-slate-300 text-xs">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mastery */}
      <div className="hidden md:flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200">
        <div className="text-right">
          <div className="text-[10px] font-bold text-slate-400 uppercase">
            {labels.vocab?.mastery || 'Mastery'}
          </div>
          <div className="font-black text-sm text-slate-900">
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
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`bg-white border-2 rounded-xl p-3 flex items-center justify-center gap-2 relative overflow-hidden transition-all ${
              isActive
                ? 'border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]'
                : 'border-transparent hover:border-slate-900 shadow-sm hover:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]'
            }`}
          >
            {isActive && <div className="absolute inset-0 bg-green-50 z-0" />}
            {isActive && <div className="absolute bottom-0 left-0 w-full h-1 bg-[#4ADE80]" />}
            <span className="relative z-10 text-xl">{tab.emoji}</span>
            <span
              className={`relative z-10 font-black text-sm ${
                isActive ? 'text-slate-900' : 'text-slate-500'
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );

  const renderOverlays = () => (
    <>
      <VocabLearnOverlay
        open={learnOpen}
        onClose={() => setLearnOpen(false)}
        language={language}
        title={labels.learn || 'Learn'}
        variant="fullscreen"
      >
        <div className="p-4 sm:p-6">
          <Suspense fallback={<VocabModuleSkeleton />}>
            <VocabQuiz
              key={`learn-${selectedUnitId}-${gameWords.length}`}
              words={gameWords}
              onComplete={stats => console.log('Learn completed:', stats)}
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
            />
          </Suspense>
        </div>
      </VocabLearnOverlay>

      <VocabLearnOverlay
        open={testOpen}
        onClose={() => setTestOpen(false)}
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

  const renderContent = () => {
    if (filteredWords.length === 0) {
      return (
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
    }

    return (
      <>
        {/* Flashcard View */}
        {viewState.mode === 'flashcard' && (
          <div className="w-full max-w-4xl mb-10 z-0">
            {viewState.flashcardComplete ? (
              /* Completion Card */
              <div className="bg-white rounded-[1.5rem] border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] overflow-hidden min-h-[500px] flex flex-col relative z-0">
                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gradient-to-b from-green-50 to-white">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                    <span className="text-4xl">🎉</span>
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 mb-2">
                    {labels.sessionComplete || 'Session Complete!'}
                  </h2>
                  <p className="text-slate-500 mb-2">
                    {filteredWords.length} {labels.wordsUnit || 'words'} reviewed
                  </p>
                  <div className="flex gap-2 mb-8">
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-bold">
                      ✓ {labels.vocab?.remembered || 'Remembered'} {masteredIds.size}
                    </span>
                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-bold">
                      ✕ {labels.vocab?.forgot || 'Forgot'} {filteredWords.length - masteredIds.size}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => setLearnOpen(true)}
                      className="px-6 py-3 bg-white border-2 border-slate-900 text-slate-900 font-black rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-1 transition-all"
                    >
                      🧠 {labels.learn || 'Learn'}
                    </button>
                    {typeof selectedUnitId === 'number' &&
                      availableUnits.indexOf(selectedUnitId) < availableUnits.length - 1 && (
                        <button
                          onClick={() => {
                            const currentIdx = availableUnits.indexOf(selectedUnitId);
                            if (currentIdx < availableUnits.length - 1) {
                              setSelectedUnitId(availableUnits[currentIdx + 1]);
                            }
                          }}
                          className="px-6 py-3 bg-green-500 border-2 border-green-600 text-white font-black rounded-xl shadow-[4px_4px_0px_0px_rgba(22,163,74,1)] hover:-translate-y-1 transition-all"
                        >
                          {labels.common?.next || 'Next Unit'} →
                        </button>
                      )}
                  </div>
                  <button
                    onClick={() => {
                      setViewState(prev => ({ ...prev, cardIndex: 0, flashcardComplete: false }));
                      setMasteredIds(new Set());
                    }}
                    className="mt-4 text-sm text-slate-400 hover:text-slate-600"
                  >
                    🔄 {labels.vocab?.restart || 'Restart'}
                  </button>
                </div>
              </div>
            ) : (
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
            )}
          </div>
        )}

        {viewState.mode === 'flashcard' && (
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
        )}

        {/* Match Mode */}
        {viewState.mode === 'match' && (
          <div className="w-full max-w-4xl">
            <Suspense fallback={<VocabModuleSkeleton />}>
              <VocabMatch
                key={`match-${selectedUnitId}-${gameWords.length}`}
                words={gameWords}
                onComplete={(time, moves) => console.log('Match completed:', time, moves)}
              />
            </Suspense>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-6 px-4" style={BACKGROUND_STYLE}>
      <div className="w-full max-w-4xl mb-6">
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
