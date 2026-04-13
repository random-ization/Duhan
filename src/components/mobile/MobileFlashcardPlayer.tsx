import { useAction } from 'convex/react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Bookmark, Check, RotateCw, Volume2, X } from 'lucide-react';
import type { TouchEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { aRef } from '../../utils/convexRefs';
import { ExtendedVocabItem } from '../../pages/VocabModulePage';
import { Button } from '../ui';

interface MobileFlashcardPlayerProps {
  readonly words: ExtendedVocabItem[];
  readonly currentIndex: number;
  readonly scopeTitle: string;
  readonly onReview: (word: ExtendedVocabItem, quality: number) => void;
  readonly onStar: (id: string) => void;
  readonly onSpeak: (text: string) => void;
  readonly isStarred: (id: string) => boolean;
  readonly onNext: () => void;
  readonly onPrev: () => void;
  readonly settings: {
    autoTTS: boolean;
    cardFront: 'KOREAN' | 'NATIVE';
    ratingMode: 'PASS_FAIL' | 'FOUR_BUTTONS';
  };
}

type SchedulingPreview = {
  again: { scheduled_days: number; due: number };
  hard: { scheduled_days: number; due: number };
  good: { scheduled_days: number; due: number };
  easy: { scheduled_days: number; due: number };
};

type PreviewCardState = {
  state: number;
  due: number;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  last_review?: number;
};

type RatingButtonColor = 'again' | 'hard' | 'good' | 'easy';

const NOISE_BACKGROUND =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.045'/%3E%3C/svg%3E\")";

const tactileButtonStyles: Record<RatingButtonColor, { borderTop: string; badge: string }> = {
  again: {
    borderTop: '2px solid #FDA4AF',
    badge: 'bg-rose-50 text-rose-500 border border-rose-100/60',
  },
  hard: {
    borderTop: '2px solid #FCD34D',
    badge: 'bg-amber-50 text-amber-600 border border-amber-100/60',
  },
  good: {
    borderTop: '2px solid #93C5FD',
    badge: 'bg-blue-50 text-blue-600 border border-blue-100/60',
  },
  easy: {
    borderTop: '2px solid #86EFAC',
    badge: 'bg-emerald-50 text-emerald-600 border border-emerald-100/60',
  },
};

const swipeHintStyles: Record<
  NonNullable<'left' | 'right'>,
  { container: string; icon: typeof X; title: string; description: string }
> = {
  left: {
    container:
      'border-rose-200/80 bg-rose-50/92 text-rose-600 shadow-[0_16px_32px_-16px_rgba(244,63,94,0.55)]',
    icon: X,
    title: 'left',
    description: 'mistake',
  },
  right: {
    container:
      'border-emerald-200/80 bg-emerald-50/92 text-emerald-600 shadow-[0_16px_32px_-16px_rgba(16,185,129,0.5)]',
    icon: Check,
    title: 'right',
    description: 'correct',
  },
};

const formatScheduledLabel = (days: number | undefined) => {
  if (typeof days !== 'number' || !Number.isFinite(days)) {
    return '...';
  }
  if (days <= 0) {
    return '< 1m';
  }
  if (days < 7) {
    return `${Math.round(days)}d`;
  }
  if (days < 30) {
    return `${Math.round(days / 7)}w`;
  }
  if (days < 365) {
    return `${Math.round(days / 30)}mo`;
  }
  return `${Math.round(days / 365)}y`;
};

const buildPreviewCardState = (
  word: ExtendedVocabItem | undefined
): PreviewCardState | undefined => {
  if (!word) {
    return undefined;
  }

  const progress = word.progress;
  const state =
    word.state ??
    (progress?.status === 'MASTERED'
      ? 2
      : progress?.status === 'REVIEW'
        ? 2
        : progress?.status === 'LEARNING'
          ? 1
          : 0);

  const due = progress?.nextReviewAt ?? Date.now();

  const stability = word.stability ?? 0;
  const difficulty = word.difficulty ?? 5;
  const elapsedDays = word.elapsed_days ?? 0;
  const scheduledDays = word.scheduled_days ?? progress?.interval ?? 0;
  const learningSteps = word.learning_steps ?? 0;
  const reps = word.reps ?? progress?.streak ?? 0;
  const lapses = word.lapses ?? 0;
  const lastReview = word.last_review ?? undefined;

  return {
    state,
    due,
    stability,
    difficulty,
    elapsed_days: elapsedDays,
    scheduled_days: scheduledDays,
    learning_steps: learningSteps,
    reps,
    lapses,
    last_review: lastReview,
  };
};

export default function MobileFlashcardPlayer({
  words,
  currentIndex,
  scopeTitle,
  onReview,
  onStar,
  onSpeak,
  isStarred,
  onNext,
  onPrev,
  settings,
}: MobileFlashcardPlayerProps) {
  const { t } = useTranslation();
  const [isFlipped, setIsFlipped] = useState(false);
  const [swipeHint, setSwipeHint] = useState<'left' | 'right' | null>(null);
  const [preview, setPreview] = useState<SchedulingPreview | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipeTriggeredRef = useRef(false);

  const currentWord = words[currentIndex];
  const korean = currentWord?.korean || currentWord?.word || '';
  const nativeText = currentWord?.meaning || currentWord?.english || '';
  const heroText = settings.cardFront === 'NATIVE' ? nativeText : korean;
  const detailText = settings.cardFront === 'NATIVE' ? korean : nativeText;
  const exampleSentence = currentWord?.exampleSentence || '';
  const exampleMeaning = currentWord?.exampleMeaning || currentWord?.exampleTranslation || '';
  const pronunciation = currentWord?.pronunciation || '';
  const currentCardState = useMemo(() => buildPreviewCardState(currentWord), [currentWord]);

  const getSchedulingPreview = useAction(
    aRef<{ currentCard?: PreviewCardState; now?: number }, SchedulingPreview>(
      'fsrs:getSchedulingPreview'
    )
  );

  useEffect(() => {
    if (!settings.autoTTS || !korean) return;
    onSpeak(korean);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, settings.autoTTS]);

  useEffect(() => {
    setIsFlipped(false);
  }, [currentIndex]);

  useEffect(() => {
    let cancelled = false;

    const loadPreview = async () => {
      try {
        const nextPreview = await getSchedulingPreview(
          currentCardState ? { currentCard: currentCardState } : {}
        );
        if (!cancelled) {
          setPreview(nextPreview);
        }
      } catch {
        if (!cancelled) {
          setPreview(null);
        }
      }
    };

    void loadPreview();

    return () => {
      cancelled = true;
    };
  }, [currentCardState, getSchedulingPreview]);

  if (!currentWord) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center px-6 text-center text-slate-500"
        style={{ backgroundImage: NOISE_BACKGROUND }}
      >
        <p className="text-sm font-bold">
          {t('vocab.noWords', { defaultValue: 'No words available' })}
        </p>
      </div>
    );
  }

  const handleGrade = (quality: number) => {
    onReview(currentWord, quality);
  };

  const handleCardFlip = () => {
    if (swipeTriggeredRef.current) {
      return;
    }
    setIsFlipped(previous => !previous);
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    swipeTriggeredRef.current = false;
    setSwipeHint(null);
  };

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    if (!start || event.touches.length !== 1) return;
    const touch = event.touches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < 20 || Math.abs(dx) <= Math.abs(dy)) {
      setSwipeHint(null);
      return;
    }
    setSwipeHint(dx > 0 ? 'right' : 'left');
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start || event.changedTouches.length !== 1) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    const horizontalSwipe = Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.2;
    if (!horizontalSwipe) {
      setSwipeHint(null);
      return;
    }

    swipeTriggeredRef.current = true;
    if (dx > 0) {
      handleGrade(3);
    } else {
      handleGrade(1);
    }
    globalThis.setTimeout(() => {
      setSwipeHint(null);
      swipeTriggeredRef.current = false;
    }, 160);
  };

  const ratingButtons =
    settings.ratingMode === 'PASS_FAIL'
      ? [
          {
            quality: 1,
            label: t('vocab.forgot', { defaultValue: 'Forgot' }),
            previewLabel: formatScheduledLabel(preview?.again.scheduled_days),
            color: 'again' as const,
          },
          {
            quality: 3,
            label: t('vocab.remembered', { defaultValue: 'Remembered' }),
            previewLabel: formatScheduledLabel(preview?.good.scheduled_days),
            color: 'good' as const,
          },
        ]
      : [
          {
            quality: 1,
            label: t('vocab.rating.again', { defaultValue: 'Again' }),
            previewLabel: formatScheduledLabel(preview?.again.scheduled_days),
            color: 'again' as const,
          },
          {
            quality: 2,
            label: t('vocab.rating.hard', { defaultValue: 'Hard' }),
            previewLabel: formatScheduledLabel(preview?.hard.scheduled_days),
            color: 'hard' as const,
          },
          {
            quality: 3,
            label: t('vocab.rating.good', { defaultValue: 'Good' }),
            previewLabel: formatScheduledLabel(preview?.good.scheduled_days),
            color: 'good' as const,
          },
          {
            quality: 4,
            label: t('vocab.rating.easy', { defaultValue: 'Easy' }),
            previewLabel: formatScheduledLabel(preview?.easy.scheduled_days),
            color: 'easy' as const,
          },
        ];

  return (
    <div
      className="flex h-full flex-col overflow-hidden text-slate-900"
      style={{
        backgroundColor: '#E6E7E9',
        backgroundImage: NOISE_BACKGROUND,
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <main className="relative mt-[-20px] flex flex-1 items-center justify-center px-5">
        <div
          className="pointer-events-none absolute aspect-[3/4] w-full max-w-[350px] rounded-[2.5rem] border border-black/3 bg-[#EBEBE9]"
          style={{
            boxShadow: '0 8px 16px -8px rgba(0,0,0,0.05)',
            transform: 'translateY(30px) scale(0.88)',
            zIndex: 5,
          }}
        />
        <div
          className="pointer-events-none absolute aspect-[3/4] w-full max-w-[350px] rounded-[2.5rem] border border-black/4 bg-[#F3F3F1]"
          style={{
            boxShadow: '0 16px 32px -12px rgba(0,0,0,0.1)',
            transform: 'translateY(16px) scale(0.94)',
            zIndex: 10,
          }}
        />

        <div
          className="relative z-20 flex w-full max-w-[350px] items-center justify-center"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          role="presentation"
          style={{ perspective: '1000px' }}
        >
          <motion.div
            initial={false}
            animate={{
              opacity: swipeHint === 'left' ? 1 : 0,
              x: swipeHint === 'left' ? -18 : -8,
              scale: swipeHint === 'left' ? 1 : 0.92,
            }}
            transition={{ duration: 0.18 }}
            className={`pointer-events-none absolute left-[-4px] top-1/2 z-30 flex -translate-y-1/2 items-center gap-2 rounded-full border px-3 py-2 ${
              swipeHintStyles.left.container
            }`}
          >
            <X className="h-4 w-4" />
            <div className="text-left">
              <p className="text-[10px] font-black uppercase tracking-[0.22em]">
                {t('vocab.swipeLeft', { defaultValue: 'Swipe Left' })}
              </p>
              <p className="mt-0.5 text-[11px] font-bold">
                {t('vocab.swipeMistakeHint', { defaultValue: 'Did not recall' })}
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={false}
            animate={{
              opacity: swipeHint === 'right' ? 1 : 0,
              x: swipeHint === 'right' ? 18 : 8,
              scale: swipeHint === 'right' ? 1 : 0.92,
            }}
            transition={{ duration: 0.18 }}
            className={`pointer-events-none absolute right-[-4px] top-1/2 z-30 flex -translate-y-1/2 items-center gap-2 rounded-full border px-3 py-2 ${
              swipeHintStyles.right.container
            }`}
          >
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.22em]">
                {t('vocab.swipeRight', { defaultValue: 'Swipe Right' })}
              </p>
              <p className="mt-0.5 text-[11px] font-bold">
                {t('vocab.swipeCorrectHint', { defaultValue: 'Recalled it' })}
              </p>
            </div>
            <Check className="h-4 w-4" />
          </motion.div>

          <motion.div
            animate={{
              rotate: swipeHint === 'left' ? -2 : swipeHint === 'right' ? 2 : 0,
              x: swipeHint === 'left' ? -12 : swipeHint === 'right' ? 12 : 0,
            }}
            transition={{ duration: 0.28, type: 'spring', stiffness: 240, damping: 20 }}
            className="relative flex min-h-[65vh] max-h-[70vh] w-full cursor-grab flex-col overflow-hidden rounded-[2.5rem] active:cursor-grabbing"
            style={{
              background: '#FCFCFA',
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.02'/%3E%3C/svg%3E\")",
              boxShadow:
                '0 32px 64px -16px rgba(0,0,0,0.15), 0 4px 12px -4px rgba(0,0,0,0.08), inset 0 1px 1px rgba(255,255,255,1), inset 0 -2px 1px rgba(0,0,0,0.03)',
              border: '1px solid rgba(0,0,0,0.06)',
            }}
            tabIndex={0}
            onClick={handleCardFlip}
            onKeyDown={event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleCardFlip();
              }
              if (event.key === 'ArrowLeft') {
                event.preventDefault();
                onPrev();
              }
              if (event.key === 'ArrowRight') {
                event.preventDefault();
                onNext();
              }
            }}
            role="button"
            aria-label={t('vocab.flipCard', { defaultValue: 'Flip flashcard' })}
            aria-pressed={isFlipped}
          >
            <div
              className="relative h-full w-full"
              style={{
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                transformStyle: 'preserve-3d',
                transition: 'transform 600ms cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <div
                className="absolute inset-0 flex h-full flex-col"
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                }}
              >
                <div className="flex items-start justify-between px-6 pb-2 pt-6">
                  <div className="rounded-lg border border-blue-100 bg-blue-50/80 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-blue-600 shadow-sm">
                    {t('dashboard.review.title', { defaultValue: 'Review' })} • {scopeTitle}
                  </div>
                  <Button
                    variant="ghost"
                    size="auto"
                    type="button"
                    onClick={event => {
                      event.stopPropagation();
                      onStar(currentWord.id);
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-400 shadow-sm transition-colors hover:bg-rose-50 hover:text-rose-500 active:scale-90"
                    aria-label={t('vocabBook.save', { defaultValue: 'Save word' })}
                  >
                    <Bookmark
                      className={`h-4 w-4 ${isStarred(currentWord.id) ? 'fill-rose-500 text-rose-500' : ''}`}
                    />
                  </Button>
                </div>

                <div className="flex min-h-[160px] flex-1 flex-col items-center justify-center px-6 pb-10">
                  {pronunciation ? (
                    <p className="mb-3 font-mono text-[13px] font-bold tracking-widest text-slate-400">
                      [{pronunciation}]
                    </p>
                  ) : null}
                  <h2
                    className="mb-8 text-center text-5xl font-black tracking-tight text-[#1A1A1C]"
                    style={{ textShadow: '0 1px 1px rgba(255,255,255,0.9)' }}
                  >
                    {heroText}
                  </h2>

                  <Button
                    variant="ghost"
                    size="auto"
                    type="button"
                    onClick={event => {
                      event.stopPropagation();
                      onSpeak(korean || heroText);
                    }}
                    className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_8px_16px_-4px_rgba(97,113,122,0.4),inset_0_1px_1px_rgba(255,255,255,0.2)] transition-transform active:scale-90"
                    style={{ background: 'linear-gradient(to bottom, #7A8D9A, #61717A)' }}
                    aria-label={t('vocab.listenAgain', { defaultValue: 'Listen again' })}
                  >
                    <Volume2 className="h-5 w-5" />
                  </Button>
                </div>

                <div className="pb-6 text-center">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-300">
                    <RotateCw className="h-3.5 w-3.5" />
                    {t('vocab.tapToReveal', { defaultValue: 'Tap to reveal' })}
                  </span>
                </div>
              </div>

              <div
                className="absolute inset-0 flex h-full flex-col"
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                <div className="flex items-start justify-between px-6 pb-2 pt-6">
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50/80 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 shadow-sm">
                    {t('vocab.cardBackMeaning', { defaultValue: 'Meaning & Example' })}
                  </div>
                  <Button
                    variant="ghost"
                    size="auto"
                    type="button"
                    onClick={event => {
                      event.stopPropagation();
                      onStar(currentWord.id);
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-400 shadow-sm transition-colors hover:bg-rose-50 hover:text-rose-500 active:scale-90"
                    aria-label={t('vocabBook.save', { defaultValue: 'Save word' })}
                  >
                    <Bookmark
                      className={`h-4 w-4 ${isStarred(currentWord.id) ? 'fill-rose-500 text-rose-500' : ''}`}
                    />
                  </Button>
                </div>

                <div className="flex flex-1 flex-col justify-center px-6">
                  <div className="mb-6 text-center">
                    <p className="mb-1 font-mono text-[14px] font-black tracking-widest text-slate-400">
                      {korean || heroText}
                    </p>
                    <h2 className="text-center text-3xl font-black leading-tight tracking-tight text-slate-800">
                      {detailText}
                    </h2>
                  </div>

                  <div className="rounded-[1.2rem] border border-slate-200/60 bg-[#F8F9FA] p-5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
                    <p className="mb-3 text-[15px] font-black leading-relaxed text-slate-800">
                      {exampleSentence ? (
                        exampleSentence
                      ) : (
                        <span className="text-slate-400">
                          {t('vocab.noExample', { defaultValue: 'No example sentence' })}
                        </span>
                      )}
                    </p>
                    {exampleMeaning ? (
                      <p className="text-[13px] font-medium tracking-wide text-slate-500">
                        {exampleMeaning}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="flex justify-center pb-6">
                  <Button
                    variant="ghost"
                    size="auto"
                    type="button"
                    onClick={event => {
                      event.stopPropagation();
                      onSpeak(korean || heroText);
                    }}
                    className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-500 shadow-sm transition-transform active:scale-90"
                    aria-label={t('vocab.listenAgain', { defaultValue: 'Listen again' })}
                  >
                    <Volume2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <footer className="z-40 shrink-0 bg-gradient-to-t from-[#E6E7E9] via-[#E6E7E9] to-transparent px-4 pb-8 pt-4">
        <div className="mx-auto mb-3 flex max-w-[420px] items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-rose-200/70 bg-rose-50/80 px-3 py-2 text-rose-600 shadow-[0_10px_24px_-18px_rgba(244,63,94,0.55)]">
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.22em]">
                {t('vocab.didNotRecall', { defaultValue: 'Missed' })}
              </p>
              <p className="truncate text-[11px] font-bold">
                {t('vocab.didNotRecallHint', { defaultValue: 'Use Again / Hard' })}
              </p>
            </div>
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 rounded-full border border-emerald-200/70 bg-emerald-50/80 px-3 py-2 text-emerald-600 shadow-[0_10px_24px_-18px_rgba(16,185,129,0.5)]">
            <div className="min-w-0 text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.22em]">
                {t('vocab.recalled', { defaultValue: 'Recalled' })}
              </p>
              <p className="truncate text-[11px] font-bold">
                {t('vocab.recalledHint', { defaultValue: 'Use Good / Easy' })}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0" />
          </div>
        </div>

        <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
          {t('vocab.rateMemory', { defaultValue: 'Rate your recall' })}
        </p>

        <div
          className={`mx-auto grid max-w-[420px] gap-2.5 ${
            settings.ratingMode === 'PASS_FAIL' ? 'grid-cols-2' : 'grid-cols-4'
          }`}
        >
          {ratingButtons.map(button => (
            <TactileGradeButton
              key={`${button.color}-${button.quality}`}
              label={button.label}
              previewLabel={button.previewLabel}
              color={button.color}
              onClick={() => handleGrade(button.quality)}
            />
          ))}
        </div>
      </footer>
    </div>
  );
}

function TactileGradeButton({
  label,
  previewLabel,
  color,
  onClick,
}: {
  readonly label: string;
  readonly previewLabel: string;
  readonly color: RatingButtonColor;
  readonly onClick: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="auto"
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center space-y-1.5 rounded-[1.2rem] py-3.5 transition-all duration-100"
      style={{
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F4F4F5 100%)',
        boxShadow: '0 4px 0px #D4D4D8, 0 8px 16px rgba(0,0,0,0.08), inset 0 1px 1px #FFFFFF',
        border: '1px solid #E4E4E7',
        ...('borderTop' in tactileButtonStyles[color]
          ? { borderTop: tactileButtonStyles[color].borderTop }
          : {}),
      }}
    >
      <span className="text-[14px] font-black tracking-tight text-slate-800">{label}</span>
      <span
        className={`rounded-[4px] px-1.5 text-[10px] font-black shadow-sm ${tactileButtonStyles[color].badge}`}
      >
        {previewLabel}
      </span>
    </Button>
  );
}
