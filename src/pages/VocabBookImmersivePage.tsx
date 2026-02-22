import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import { ArrowLeft, Eye, EyeOff, ChevronLeft, ChevronRight, Volume2 } from 'lucide-react';
import { motion, type PanInfo } from 'framer-motion';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useAuth } from '../contexts/AuthContext';
import { getLabels } from '../utils/i18n';
import { VOCAB } from '../utils/convexRefs';
import { useTTS } from '../hooks/useTTS';
import { notify } from '../utils/notify';
import { useIsMobile } from '../hooks/useIsMobile';
import { VocabBookImmersiveSkeleton } from '../components/common';
import { Button } from '../components/ui';

type VocabBookCategory = 'UNLEARNED' | 'DUE' | 'MASTERED' | 'ALL';
type ImmersiveMode = 'BROWSE' | 'RECALL';
const SWIPE_DISTANCE_THRESHOLD = 80;
const SWIPE_VELOCITY_THRESHOLD = 700;

interface WordCardProps {
  current: any;
  mode: ImmersiveMode;
  revealed: boolean;
  onReveal: () => void;
  onFlipBack: () => void;
  onSpeak: () => void;
  onSwipeSkip: () => void;
  onSwipeMaster: () => void;
  enableSwipe: boolean;
  layoutId?: string;
  isMastered: boolean;
  masteryPending: boolean;
  labels: any;
}

const WordCard: React.FC<WordCardProps> = ({
  current,
  mode,
  revealed,
  onReveal,
  onFlipBack,
  onSpeak,
  onSwipeSkip,
  onSwipeMaster,
  enableSwipe,
  layoutId,
  isMastered,
  masteryPending,
  labels,
}) => {
  const onDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (!enableSwipe || masteryPending) return;
    if (info.offset.x > SWIPE_DISTANCE_THRESHOLD || info.velocity.x > SWIPE_VELOCITY_THRESHOLD) {
      onSwipeMaster();
      return;
    }
    if (info.offset.x < -SWIPE_DISTANCE_THRESHOLD || info.velocity.x < -SWIPE_VELOCITY_THRESHOLD) {
      onSwipeSkip();
    }
  };

  const exampleMeaning =
    current.exampleMeaning ||
    current.exampleMeaningEn ||
    current.exampleMeaningVi ||
    current.exampleMeaningMn;

  const renderBrowseContent = (
    <div className="mt-6 space-y-4">
      <p className="text-muted-foreground text-lg font-bold">{current.meaning}</p>
      {current.exampleSentence && (
        <div className="rounded-2xl bg-muted border-2 border-border p-4">
          <p className="font-bold text-muted-foreground">{current.exampleSentence}</p>
          {exampleMeaning && (
            <p className="mt-2 text-muted-foreground font-medium">{exampleMeaning}</p>
          )}
        </div>
      )}
    </div>
  );

  return (
    <motion.div
      layoutId={layoutId}
      drag={enableSwipe ? 'x' : false}
      dragElastic={0.18}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={onDragEnd}
      whileDrag={enableSwipe ? { rotate: 1.5, scale: 0.985 } : undefined}
      className="rounded-[28px] border-[3px] border-border bg-card shadow-[0_20px_80px_rgba(15,23,42,0.12)] overflow-hidden"
    >
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-foreground">
                {current.word}
              </h1>
              {current.partOfSpeech && (
                <span className="px-3 py-1 rounded-2xl bg-muted border-2 border-border text-xs font-black text-muted-foreground">
                  {current.partOfSpeech}
                </span>
              )}
              {isMastered && (
                <span className="px-3 py-1 rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200 border-2 border-emerald-200 dark:border-emerald-300/25 text-xs font-black">
                  {labels.vocab?.mastered || 'Mastered'}
                </span>
              )}
            </div>
            {current.pronunciation && (
              <p className="text-muted-foreground font-medium mt-2">{current.pronunciation}</p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={onSpeak}
            className="p-3 rounded-2xl bg-card border-2 border-border hover:border-indigo-300 dark:hover:border-indigo-300/35 shadow-[0_2px_10px_rgba(0,0,0,0.06)]"
            aria-label={labels.dashboard?.common?.read || 'Read aloud'}
          >
            <Volume2 className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>

        {mode === 'BROWSE' ? (
          renderBrowseContent
        ) : (
          <div className="mt-6 [perspective:1400px]">
            <motion.div
              initial={false}
              animate={{ rotateY: revealed ? 180 : 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24, mass: 0.9 }}
              style={{ transformStyle: 'preserve-3d' }}
              className="relative min-h-[230px]"
            >
              <div
                style={{ backfaceVisibility: 'hidden' }}
                className="absolute inset-0 rounded-2xl bg-muted border-2 border-border p-5 flex flex-col"
              >
                <div className="flex-1">
                  {current.exampleSentence ? (
                    <p className="font-bold text-muted-foreground">{current.exampleSentence}</p>
                  ) : (
                    <p className="font-bold text-muted-foreground">
                      {labels.vocab?.noExample || 'No example'}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="auto"
                  onClick={onReveal}
                  className="mt-4 w-full py-4 rounded-2xl bg-card border-2 border-border hover:border-indigo-200 dark:hover:border-indigo-300/25"
                >
                  <p className="text-muted-foreground font-black text-base">
                    {labels.vocab?.tapToReveal || 'Tap to reveal answer'}
                  </p>
                </Button>
              </div>

              <div
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
                className="absolute inset-0 rounded-2xl bg-muted border-2 border-border p-5 flex flex-col"
              >
                <div className="flex-1">
                  <p className="text-muted-foreground text-lg font-black">{current.meaning}</p>
                  {exampleMeaning && (
                    <p className="mt-2 text-muted-foreground font-medium">{exampleMeaning}</p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="auto"
                  onClick={onFlipBack}
                  className="mt-4 w-full py-3 rounded-2xl bg-card border-2 border-border hover:border-indigo-200 dark:hover:border-indigo-300/25 text-sm font-black text-muted-foreground"
                >
                  {labels.vocab?.showPromptAgain || 'Back to prompt'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {enableSwipe && (
          <div className="mt-4 flex items-center justify-between text-[11px] font-black tracking-wide text-muted-foreground/80">
            <span>{labels.vocab?.swipeSkip || '← Swipe left to skip'}</span>
            <span>{masteryPending ? labels.common?.loading || '...' : ''}</span>
            <span>{labels.vocab?.swipeMaster || 'Swipe right to master →'}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

interface NavigationControlsProps {
  onPrev: () => void;
  onNext: () => void;
  onSpeak: () => void;
  onMaster: () => void;
  masteryPending: boolean;
  labels: any;
}

const NavigationControls: React.FC<NavigationControlsProps> = ({
  onPrev,
  onNext,
  onSpeak,
  onMaster,
  masteryPending,
  labels,
}) => (
  <div className="px-6 sm:px-8 py-5 border-t-2 border-border bg-card flex items-center justify-between">
    <Button
      type="button"
      variant="ghost"
      size="auto"
      onClick={onPrev}
      className="px-4 py-3 rounded-2xl bg-card border-2 border-border hover:border-indigo-300 dark:hover:border-indigo-300/35 font-black inline-flex items-center gap-2"
    >
      <ChevronLeft className="w-5 h-5 text-muted-foreground" />
      {labels.common?.prev || 'Previous'}
    </Button>

    <Button
      type="button"
      variant="ghost"
      size="auto"
      onClick={onSpeak}
      className="px-4 py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-400 dark:bg-indigo-400/80 dark:hover:bg-indigo-300/80 font-black inline-flex items-center gap-2 text-primary-foreground border-2 border-indigo-400 dark:border-indigo-300/35"
    >
      <Volume2 className="w-5 h-5" />
      {labels.vocab?.play || 'Play'}
    </Button>

    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        size="auto"
        onClick={onMaster}
        disabled={masteryPending}
        className="px-4 py-3 rounded-2xl bg-emerald-500/90 hover:bg-emerald-500 text-white font-black border-2 border-emerald-400 dark:border-emerald-300/35 disabled:opacity-40"
      >
        {labels.vocab?.markMastered || 'Mastered'}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="auto"
        onClick={onNext}
        className="px-4 py-3 rounded-2xl bg-card border-2 border-border hover:border-indigo-300 dark:hover:border-indigo-300/35 font-black inline-flex items-center gap-2"
      >
        {labels.common?.next || 'Next'}
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </Button>
    </div>
  </div>
);

const VocabBookImmersivePage: React.FC = () => {
  const navigate = useLocalizedNavigate();
  const { language } = useAuth();
  const isMobile = useIsMobile();
  const labels = useMemo(() => getLabels(language), [language]);
  const [params] = useSearchParams();
  const { speak, stop } = useTTS();
  const setMastery = useMutation(VOCAB.setMastery);

  useEffect(() => stop, [stop]);

  const categoryParam = (params.get('category') || 'DUE').toUpperCase();
  const focusId = params.get('focus');
  const q = params.get('q')?.trim();

  const category: VocabBookCategory =
    categoryParam === 'UNLEARNED' ||
    categoryParam === 'MASTERED' ||
    categoryParam === 'DUE' ||
    categoryParam === 'ALL'
      ? (categoryParam as VocabBookCategory)
      : 'DUE';

  const vocabBookResult = useQuery(VOCAB.getVocabBook, {
    includeMastered: true,
    search: q || undefined,
  });
  const loading = vocabBookResult === undefined;
  const items = useMemo(() => vocabBookResult ?? [], [vocabBookResult]);
  const [optimisticMastery, setOptimisticMastery] = useState<Record<string, boolean>>({});
  const [masteryPending, setMasteryPending] = useState(false);

  useEffect(() => {
    setOptimisticMastery(current => {
      if (Object.keys(current).length === 0) return current;
      let changed = false;
      const next = { ...current };
      const serverMasteryMap = new Map(
        items.map(item => [String(item.id), item.progress.status === 'MASTERED'])
      );

      Object.entries(current).forEach(([id, value]) => {
        const serverValue = serverMasteryMap.get(id);
        if (serverValue === value) {
          delete next[id];
          changed = true;
        }
      });

      return changed ? next : current;
    });
  }, [items]);

  const isWordMastered = useCallback(
    (word: any) => {
      const optimisticValue = optimisticMastery[String(word.id)];
      return typeof optimisticValue === 'boolean'
        ? optimisticValue
        : word.progress.status === 'MASTERED';
    },
    [optimisticMastery]
  );

  const filtered = useMemo(() => {
    return items.filter(item => {
      if (category === 'ALL') return true;

      const p = item.progress;
      const isMastered = isWordMastered(item);
      const isUnlearned = p.state === 0 || p.status === 'NEW';
      if (isMastered) return category === 'MASTERED';
      if (isUnlearned) return category === 'UNLEARNED';
      return category === 'DUE';
    });
  }, [items, category, isWordMastered]);

  const [mode, setMode] = useState<ImmersiveMode>('BROWSE');
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [focusConsumed, setFocusConsumed] = useState(false);

  useEffect(() => {
    setFocusConsumed(false);
  }, [focusId]);

  useEffect(() => {
    if (filtered.length === 0) {
      setIndex(0);
      return;
    }

    if (focusId && !focusConsumed) {
      const targetIndex = filtered.findIndex(item => String(item.id) === focusId);
      if (targetIndex >= 0) {
        setIndex(targetIndex);
        setFocusConsumed(true);
        return;
      }
      setFocusConsumed(true);
    }

    setIndex(prev => Math.min(prev, filtered.length - 1));
  }, [filtered, focusConsumed, focusId]);

  const total = filtered.length;
  const safeIndex = total === 0 ? 0 : Math.min(index, total - 1);
  const current = filtered[safeIndex];
  const currentLayoutId = current ? `vocab-word-card-${String(current.id)}` : undefined;
  const currentMastered = current ? isWordMastered(current) : false;

  const prev = useCallback(() => {
    if (total === 0) return;
    setIndex(() => (safeIndex - 1 + total) % total);
    setRevealed(false);
  }, [safeIndex, total]);

  const next = useCallback(() => {
    if (total === 0) return;
    setIndex(() => (safeIndex + 1) % total);
    setRevealed(false);
  }, [safeIndex, total]);

  const markCurrentMastered = useCallback(async () => {
    if (!current || masteryPending) return;
    if (isWordMastered(current)) {
      next();
      return;
    }

    const id = String(current.id);
    const previousOverride = optimisticMastery[id];
    setMasteryPending(true);
    setOptimisticMastery(prev => ({ ...prev, [id]: true }));
    setRevealed(false);

    try {
      await setMastery({ wordId: current.id, mastered: true });
    } catch {
      setOptimisticMastery(prev => {
        const nextState = { ...prev };
        if (typeof previousOverride === 'boolean') {
          nextState[id] = previousOverride;
        } else {
          delete nextState[id];
        }
        return nextState;
      });
      notify.error(labels.vocabBook?.saveFailed || 'Failed to update mastery status.');
    } finally {
      setMasteryPending(false);
    }
  }, [current, masteryPending, isWordMastered, next, optimisticMastery, setMastery, labels.vocabBook?.saveFailed]);

  const speakCurrent = useCallback(async () => {
    if (!current) return;
    await speak(current.word);
    if (current.exampleSentence) {
      await speak(current.exampleSentence);
    }
  }, [current, speak]);

  useEffect(() => {
    if (!current || loading) return;

    const isInputTarget = (target: EventTarget | null) => {
      const element = target as HTMLElement | null;
      if (!element) return false;
      const tag = element.tagName;
      return (
        element.isContentEditable ||
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT'
      );
    };

    const handler = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isInputTarget(event.target)) return;

      if (event.code === 'Space') {
        event.preventDefault();
        void speakCurrent();
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        prev();
        return;
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        next();
        return;
      }

      if (event.key === 'Enter' && mode === 'RECALL') {
        event.preventDefault();
        setRevealed(value => !value);
      }
    };

    globalThis.addEventListener('keydown', handler);
    return () => globalThis.removeEventListener('keydown', handler);
  }, [current, loading, mode, next, prev, speakCurrent]);

  const renderContent = () => {
    if (loading) {
      return <VocabBookImmersiveSkeleton />;
    }

    if (total === 0) {
      return (
        <div className="py-24 text-center">
          <p className="text-xl font-black text-muted-foreground">
            {labels.dashboard?.vocab?.noDueNow || 'No words due'}
          </p>
          <p className="text-muted-foreground font-medium mt-2">
            {labels.vocab?.tryAnotherFilter || 'Try another filter or search'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <WordCard
          current={current}
          mode={mode}
          revealed={revealed}
          onReveal={() => setRevealed(true)}
          onFlipBack={() => setRevealed(false)}
          onSpeak={speakCurrent}
          onSwipeSkip={next}
          onSwipeMaster={() => {
            void markCurrentMastered();
          }}
          enableSwipe={isMobile}
          layoutId={currentLayoutId}
          isMastered={currentMastered}
          masteryPending={masteryPending}
          labels={labels}
        />

        <NavigationControls
          onPrev={prev}
          onNext={next}
          onSpeak={speakCurrent}
          onMaster={() => {
            void markCurrentMastered();
          }}
          masteryPending={masteryPending}
          labels={labels}
        />

        <div className="flex items-center justify-between text-muted-foreground text-xs font-bold">
          <span>
            {labels.vocab?.currentFilter || 'Filter'}: {category}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={() => {
              setMode('RECALL');
              setRevealed(false);
            }}
            className="inline-flex items-center gap-2 hover:text-muted-foreground"
          >
            <Volume2 className="w-4 h-4" />
            {labels.vocab?.practiceRecall || 'Recall practice'}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-indigo-400/8 dark:via-background dark:to-indigo-300/8 text-foreground">
      <div className="sticky top-0 z-20 bg-card/70 backdrop-blur-xl border-b-[3px] border-indigo-100 dark:border-indigo-300/20">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={() => navigate('/vocab-book')}
            className="p-2.5 rounded-2xl bg-card border-[3px] border-border hover:border-indigo-300 dark:hover:border-indigo-300/35 transition-all duration-200"
            aria-label={labels.dashboard?.common?.back || 'Back'}
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Button>

          <div className="text-center">
            <p className="text-xs font-black tracking-widest text-indigo-600 dark:text-indigo-200 uppercase">
              {labels.vocab?.modeImmersive || 'Immersive'}
            </p>
            <p className="text-sm font-black text-muted-foreground">
              {total === 0 ? '0/0' : `${safeIndex + 1}/${total}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => {
                setMode(m => (m === 'BROWSE' ? 'RECALL' : 'BROWSE'));
                setRevealed(false);
              }}
              className="px-3 py-2 rounded-2xl bg-card border-[3px] border-border hover:border-indigo-300 dark:hover:border-indigo-300/35 text-xs font-black text-muted-foreground transition-all duration-200"
            >
              {mode === 'BROWSE' ? (
                <span className="inline-flex items-center gap-2">
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                  {labels.vocab?.recallMode || 'Recall'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  {labels.vocab?.browseMode || 'Browse'}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        renderContent()
      ) : (
        <div className="max-w-3xl mx-auto px-4 py-10">{renderContent()}</div>
      )}
    </div>
  );
};

export default VocabBookImmersivePage;
