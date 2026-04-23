import { useAction } from 'convex/react';
import { motion } from 'framer-motion';
import { Bookmark, Check, Volume2, X } from 'lucide-react';
import type { TouchEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { aRef } from '../../utils/convexRefs';
import { ExtendedVocabItem } from '../../pages/VocabModulePage';
import { Button } from '../ui';
import { Chip, KT } from './ksoft/ksoft';

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
type SwipeDirection = 'left' | 'right';

const GRADE_BUTTON_STYLES: Record<
  RatingButtonColor,
  { readonly bg: string; readonly fg: string; readonly shadow: string }
> = {
  again: {
    bg: KT.pink,
    fg: KT.pinkDeep,
    shadow: '0 10px 24px -18px rgba(201,122,110,0.75)',
  },
  hard: {
    bg: KT.butter,
    fg: KT.butterDeep,
    shadow: '0 10px 24px -18px rgba(168,135,46,0.72)',
  },
  good: {
    bg: KT.mint,
    fg: KT.mintDeep,
    shadow: '0 10px 24px -18px rgba(91,132,114,0.72)',
  },
  easy: {
    bg: KT.sky,
    fg: KT.skyDeep,
    shadow: '0 10px 24px -18px rgba(63,106,133,0.72)',
  },
};

const SWIPE_HINT_STYLES: Record<
  SwipeDirection,
  {
    readonly bg: string;
    readonly fg: string;
    readonly border: string;
    readonly icon: typeof X;
  }
> = {
  left: {
    bg: `${KT.pink}D9`,
    fg: KT.pinkDeep,
    border: `1px solid ${KT.pinkDeep}22`,
    icon: X,
  },
  right: {
    bg: `${KT.mint}D9`,
    fg: KT.mintDeep,
    border: `1px solid ${KT.mintDeep}22`,
    icon: Check,
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

const getPartOfSpeechLabel = (word: ExtendedVocabItem | undefined, fallback: string) => {
  if (!word) return fallback;
  if (typeof word.partOfSpeech === 'string' && word.partOfSpeech.trim()) {
    return word.partOfSpeech;
  }
  if (typeof word.pos === 'string' && word.pos.trim()) {
    return word.pos;
  }
  return fallback;
};

const getDecorativeSeal = (word: ExtendedVocabItem | undefined) => {
  const hanja = word?.hanja?.trim();
  if (hanja) {
    return hanja.slice(0, 2);
  }
  return '詞';
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
  const [flipState, setFlipState] = useState<{ index: number | null; visible: boolean }>({
    index: null,
    visible: false,
  });
  const [swipeHint, setSwipeHint] = useState<SwipeDirection | null>(null);
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
  const partOfSpeechLabel = getPartOfSpeechLabel(
    currentWord,
    t('vocab.word', { defaultValue: 'Word' })
  );
  const decorativeSeal = getDecorativeSeal(currentWord);
  const currentCardState = useMemo(() => buildPreviewCardState(currentWord), [currentWord]);
  const isFlipped = flipState.visible && flipState.index === currentIndex;

  const getSchedulingPreview = useAction(
    aRef<{ currentCard?: PreviewCardState; now?: number }, SchedulingPreview>(
      'fsrs:getSchedulingPreview'
    )
  );

  useEffect(() => {
    if (!settings.autoTTS || !korean) return;
    onSpeak(korean);
  }, [currentIndex, korean, onSpeak, settings.autoTTS]);

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
        className="flex h-full flex-col items-center justify-center px-6 text-center"
        style={{
          background: `radial-gradient(ellipse at 20% 0%, ${KT.bg2} 0%, ${KT.bg} 60%)`,
          color: KT.sub,
          fontFamily: KT.font,
        }}
      >
        <p className="text-sm font-bold">
          {t('vocab.noWords', { defaultValue: 'No words available' })}
        </p>
      </div>
    );
  }

  const handleGrade = (quality: number) => {
    setFlipState({ index: null, visible: false });
    onReview(currentWord, quality);
  };

  const handleCardFlip = () => {
    if (swipeTriggeredRef.current) {
      return;
    }
    setFlipState(previous =>
      previous.visible && previous.index === currentIndex
        ? { index: null, visible: false }
        : { index: currentIndex, visible: true }
    );
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

  const rightHint = SWIPE_HINT_STYLES.right;
  const leftHint = SWIPE_HINT_STYLES.left;
  const RightHintIcon = rightHint.icon;
  const LeftHintIcon = leftHint.icon;

  return (
    <div
      className="flex h-full flex-col overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at 20% 0%, ${KT.bg2} 0%, ${KT.bg} 60%)`,
        color: KT.ink,
        fontFamily: KT.font,
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <main className="relative flex flex-1 items-center justify-center px-5 pb-4 pt-3">
        <motion.div
          initial={false}
          animate={{
            opacity: swipeHint === 'left' ? 1 : 0,
            x: swipeHint === 'left' ? -18 : -6,
            scale: swipeHint === 'left' ? 1 : 0.94,
          }}
          transition={{ duration: 0.18 }}
          style={{
            position: 'absolute',
            left: 6,
            top: '50%',
            zIndex: 30,
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 12px',
            borderRadius: 18,
            background: leftHint.bg,
            color: leftHint.fg,
            border: leftHint.border,
            boxShadow: KT.shSm,
            pointerEvents: 'none',
          }}
        >
          <LeftHintIcon size={16} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.5 }}>
              {t('vocab.swipeLeft', { defaultValue: 'Swipe Left' })}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700 }}>
              {t('vocab.swipeMistakeHint', { defaultValue: 'Did not recall' })}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={false}
          animate={{
            opacity: swipeHint === 'right' ? 1 : 0,
            x: swipeHint === 'right' ? 18 : 6,
            scale: swipeHint === 'right' ? 1 : 0.94,
          }}
          transition={{ duration: 0.18 }}
          style={{
            position: 'absolute',
            right: 6,
            top: '50%',
            zIndex: 30,
            transform: 'translateY(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 12px',
            borderRadius: 18,
            background: rightHint.bg,
            color: rightHint.fg,
            border: rightHint.border,
            boxShadow: KT.shSm,
            pointerEvents: 'none',
          }}
        >
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.5 }}>
              {t('vocab.swipeRight', { defaultValue: 'Swipe Right' })}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700 }}>
              {t('vocab.swipeCorrectHint', { defaultValue: 'Recalled it' })}
            </div>
          </div>
          <RightHintIcon size={16} />
        </motion.div>

        <div
          className="relative z-20 flex w-full max-w-[360px] items-center justify-center"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          role="presentation"
          style={{ perspective: '1000px' }}
        >
          <motion.div
            animate={{
              rotate: swipeHint === 'left' ? -2 : swipeHint === 'right' ? 2 : 0,
              x: swipeHint === 'left' ? -12 : swipeHint === 'right' ? 12 : 0,
            }}
            transition={{ duration: 0.28, type: 'spring', stiffness: 240, damping: 20 }}
            className="relative flex min-h-[66vh] max-h-[72vh] w-full cursor-grab flex-col overflow-hidden rounded-[2rem] active:cursor-grabbing"
            style={{
              background: KT.card,
              boxShadow: KT.shLg,
              border: `1px solid ${KT.line}`,
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
                setFlipState({ index: null, visible: false });
                onPrev();
              }
              if (event.key === 'ArrowRight') {
                event.preventDefault();
                setFlipState({ index: null, visible: false });
                onNext();
              }
            }}
            role="button"
            aria-label={t('vocab.flipCard', { defaultValue: 'Flip flashcard' })}
            aria-pressed={isFlipped}
          >
            <div
              style={{
                position: 'relative',
                height: '100%',
                width: '100%',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                transformStyle: 'preserve-3d',
                transition: 'transform 600ms cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 18,
                    right: 22,
                    fontFamily: KT.serif,
                    fontSize: 52,
                    color: KT.crimson,
                    opacity: 0.14,
                    fontWeight: 500,
                    lineHeight: 1,
                  }}
                >
                  {decorativeSeal}
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '22px 22px 0',
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, minWidth: 0 }}>
                    <Chip tone="pink">{partOfSpeechLabel}</Chip>
                    <Chip tone="muted">{scopeTitle}</Chip>
                    {currentWord.hanja ? <Chip tone="butter">{currentWord.hanja}</Chip> : null}
                  </div>

                  <button
                    type="button"
                    onClick={event => {
                      event.stopPropagation();
                      onStar(currentWord.id);
                    }}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      border: `1px solid ${KT.line}`,
                      background: KT.bg,
                      color: isStarred(currentWord.id) ? KT.crimson : KT.sub,
                      display: 'grid',
                      placeItems: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                    aria-label={t('vocabBook.save', { defaultValue: 'Save word' })}
                  >
                    <Bookmark size={16} fill={isStarred(currentWord.id) ? KT.crimson : 'none'} />
                  </button>
                </div>

                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    padding: '18px 28px 18px',
                  }}
                >
                  {(pronunciation || currentWord.hanja) && (
                    <div
                      style={{
                        fontFamily: KT.serif,
                        fontSize: 13,
                        color: KT.crimson,
                        letterSpacing: 2.5,
                        marginBottom: 12,
                        fontWeight: 500,
                        textAlign: 'center',
                      }}
                    >
                      {pronunciation ? `[${pronunciation}]` : currentWord.hanja}
                    </div>
                  )}

                  <div
                    style={{
                      fontSize: heroText.length > 10 ? 42 : 54,
                      fontWeight: 800,
                      color: KT.ink,
                      letterSpacing: heroText.length > 10 ? -1.2 : -2,
                      lineHeight: 1.05,
                      textAlign: 'center',
                      wordBreak: 'keep-all',
                    }}
                  >
                    {heroText}
                  </div>

                  <div
                    style={{
                      fontSize: 13,
                      color: KT.sub,
                      textAlign: 'center',
                      marginTop: 16,
                      lineHeight: 1.6,
                      fontWeight: 500,
                    }}
                  >
                    {t('vocab.tapToReveal', { defaultValue: 'Tap to reveal' })}
                  </div>
                </div>

                <div style={{ padding: '0 0 24px', display: 'flex', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={event => {
                      event.stopPropagation();
                      onSpeak(korean || heroText);
                    }}
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 21,
                      border: 'none',
                      background: KT.bg2,
                      color: KT.ink,
                      display: 'grid',
                      placeItems: 'center',
                      cursor: 'pointer',
                    }}
                    aria-label={t('vocab.listenAgain', { defaultValue: 'Listen again' })}
                  >
                    <Volume2 size={18} />
                  </button>
                </div>
              </div>

              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '22px 22px 0',
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, minWidth: 0 }}>
                    <Chip tone="mint">
                      {t('vocab.cardBackMeaning', { defaultValue: 'Meaning & Example' })}
                    </Chip>
                    {currentWord.hanja ? <Chip tone="butter">{currentWord.hanja}</Chip> : null}
                  </div>

                  <button
                    type="button"
                    onClick={event => {
                      event.stopPropagation();
                      onStar(currentWord.id);
                    }}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 12,
                      border: `1px solid ${KT.line}`,
                      background: KT.bg,
                      color: isStarred(currentWord.id) ? KT.crimson : KT.sub,
                      display: 'grid',
                      placeItems: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                    aria-label={t('vocabBook.save', { defaultValue: 'Save word' })}
                  >
                    <Bookmark size={16} fill={isStarred(currentWord.id) ? KT.crimson : 'none'} />
                  </button>
                </div>

                <div
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    padding: '18px 24px 20px',
                  }}
                >
                  <div style={{ textAlign: 'center', marginBottom: 18 }}>
                    <div
                      style={{
                        fontFamily: KT.serif,
                        fontSize: 13,
                        color: KT.crimson,
                        letterSpacing: 2.5,
                        marginBottom: 8,
                        fontWeight: 500,
                      }}
                    >
                      {korean || heroText}
                    </div>
                    <div
                      style={{
                        fontSize: 30,
                        fontWeight: 800,
                        color: KT.ink,
                        lineHeight: 1.2,
                        letterSpacing: -0.8,
                      }}
                    >
                      {detailText}
                    </div>
                  </div>

                  <div
                    style={{
                      background: KT.bg,
                      borderRadius: 20,
                      padding: 18,
                      border: `1px solid ${KT.line}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: KT.sub,
                        letterSpacing: 1,
                        marginBottom: 8,
                      }}
                    >
                      {t('vocab.example', { defaultValue: 'Example' })}
                    </div>
                    <div
                      style={{
                        fontSize: 15,
                        color: KT.ink,
                        lineHeight: 1.6,
                        fontWeight: 600,
                      }}
                    >
                      {exampleSentence || (
                        <span style={{ color: KT.sub }}>
                          {t('vocab.noExample', { defaultValue: 'No example sentence' })}
                        </span>
                      )}
                    </div>
                    {exampleMeaning ? (
                      <div
                        style={{
                          fontSize: 12,
                          color: KT.sub,
                          lineHeight: 1.5,
                          marginTop: 8,
                        }}
                      >
                        {exampleMeaning}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div style={{ padding: '0 0 24px', display: 'flex', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={event => {
                      event.stopPropagation();
                      onSpeak(korean || heroText);
                    }}
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 21,
                      border: 'none',
                      background: KT.ink,
                      color: KT.card,
                      display: 'grid',
                      placeItems: 'center',
                      cursor: 'pointer',
                    }}
                    aria-label={t('vocab.listenAgain', { defaultValue: 'Listen again' })}
                  >
                    <Volume2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <footer
        style={{
          padding: '0 18px calc(env(safe-area-inset-bottom) + 18px)',
          background: `linear-gradient(180deg, rgba(245,239,229,0) 0%, ${KT.bg2} 30%, ${KT.bg2} 100%)`,
        }}
      >
        <div style={{ maxWidth: 420, margin: '0 auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                borderRadius: 18,
                background: `${KT.pink}B3`,
                color: KT.pinkDeep,
                border: `1px solid ${KT.pinkDeep}22`,
              }}
            >
              <X size={16} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.4 }}>
                  {t('vocab.didNotRecall', { defaultValue: 'Missed' })}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700 }}>
                  {t('vocab.didNotRecallHint', { defaultValue: 'Use Again / Hard' })}
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: 8,
                padding: '10px 12px',
                borderRadius: 18,
                background: `${KT.mint}B3`,
                color: KT.mintDeep,
                border: `1px solid ${KT.mintDeep}22`,
              }}
            >
              <div style={{ minWidth: 0, textAlign: 'right' }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.4 }}>
                  {t('vocab.recalled', { defaultValue: 'Recalled' })}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700 }}>
                  {t('vocab.recalledHint', { defaultValue: 'Use Good / Easy' })}
                </div>
              </div>
              <Check size={16} />
            </div>
          </div>

          {!isFlipped ? (
            <button
              type="button"
              onClick={() => setFlipState({ index: currentIndex, visible: true })}
              style={{
                width: '100%',
                padding: '16px 18px',
                borderRadius: 18,
                border: 'none',
                background: KT.ink,
                color: KT.card,
                fontSize: 15,
                fontWeight: 800,
                fontFamily: KT.font,
                letterSpacing: 0.3,
                cursor: 'pointer',
                boxShadow: '0 10px 24px -18px rgba(31,27,23,0.7)',
              }}
            >
              {t('vocab.showMeaning', { defaultValue: 'Show answer' })}
            </button>
          ) : (
            <>
              <p
                style={{
                  marginBottom: 10,
                  textAlign: 'center',
                  fontSize: 10,
                  fontWeight: 800,
                  color: KT.sub,
                  letterSpacing: 1,
                }}
              >
                {t('vocab.rateMemory', { defaultValue: 'Rate your recall' })}
              </p>

              <div
                className={
                  settings.ratingMode === 'PASS_FAIL'
                    ? 'grid grid-cols-2 gap-2.5'
                    : 'grid grid-cols-4 gap-2.5'
                }
              >
                {ratingButtons.map(button => (
                  <GradeButton
                    key={`${button.color}-${button.quality}`}
                    label={button.label}
                    previewLabel={button.previewLabel}
                    color={button.color}
                    onClick={() => handleGrade(button.quality)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </footer>
    </div>
  );
}

function GradeButton({
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
  const style = GRADE_BUTTON_STYLES[color];

  return (
    <Button
      variant="ghost"
      size="auto"
      type="button"
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-1.5 rounded-[18px] px-2 py-3 transition-transform duration-100 active:scale-[0.98]"
      style={{
        background: style.bg,
        color: style.fg,
        boxShadow: style.shadow,
        border: 'none',
      }}
    >
      <span
        style={{
          fontSize: 13,
          fontWeight: 800,
          color: style.fg,
          letterSpacing: -0.2,
        }}
      >
        {label}
      </span>
      <span
        style={{
          display: 'inline-block',
          fontSize: 10,
          fontWeight: 800,
          color: style.fg,
          background: 'rgba(255,255,255,0.55)',
          padding: '2px 8px',
          borderRadius: 999,
          letterSpacing: 0.3,
          minWidth: 36,
          textAlign: 'center',
        }}
      >
        {previewLabel}
      </span>
    </Button>
  );
}
