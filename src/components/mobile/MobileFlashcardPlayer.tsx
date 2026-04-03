import { Volume2, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { ExtendedVocabItem } from '../../pages/VocabModulePage';
import { useTranslation } from 'react-i18next';
import type { TouchEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../ui';
import { getPosColorClass } from '../../utils/posColors';

interface MobileFlashcardPlayerProps {
  readonly words: ExtendedVocabItem[]; // Current filtered words
  readonly currentIndex: number;
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

export default function MobileFlashcardPlayer({
  words,
  currentIndex,
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
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const swipeTriggeredRef = useRef(false);
  const suppressClickRef = useRef(false);
  const currentWord = words[currentIndex];
  const korean = currentWord?.korean || currentWord?.word || '';
  const nativeText = currentWord?.meaning || currentWord?.english || '';
  const frontText = settings.cardFront === 'NATIVE' ? nativeText : korean;
  const backText = settings.cardFront === 'NATIVE' ? korean : nativeText;

  useEffect(() => {
    setIsFlipped(false);
    if (!settings.autoTTS) return;
    if (!korean) return;
    onSpeak(korean);
    // Only rerun on index changes or when TTS toggles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, settings.autoTTS]);

  if (!currentWord) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <p>{t('vocab.noWords', { defaultValue: 'No words available' })}</p>
      </div>
    );
  }

  const handleGrade = (quality: number) => {
    onReview(currentWord, quality);
    setIsFlipped(false); // Reset flip for next card (managed by parent index change)
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
    suppressClickRef.current = true;
    setIsFlipped(false);
    setSwipeHint(dx > 0 ? 'right' : 'left');
    if (dx > 0) {
      onPrev();
    } else {
      onNext();
    }
    globalThis.setTimeout(() => {
      suppressClickRef.current = false;
      setSwipeHint(null);
    }, 160);
  };

  const handleCardClick = () => {
    if (suppressClickRef.current || swipeTriggeredRef.current) {
      swipeTriggeredRef.current = false;
      return;
    }
    setIsFlipped(prev => !prev);
  };

  return (
    <div className="flex flex-col h-full mesh-gradient grain-overlay p-4 rounded-[3rem]">
      {/* Card Container */}
      <div
        className="flex-1 relative mb-10 min-h-[380px] max-h-[460px] h-[55vh] perspective-1000"
        onClick={handleCardClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        role="button"
        tabIndex={0}
        aria-label={t('vocab.flashcardGestureHint', {
          defaultValue: 'Tap to flip. Swipe left or right to change card.',
        })}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsFlipped(prev => !prev);
          }
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            setIsFlipped(false);
            onPrev();
          }
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            setIsFlipped(false);
            onNext();
          }
        }}
      >
        <motion.div
          className="absolute inset-0 transform-style-3d"
          animate={{
            rotateY: isFlipped ? 180 : 0,
            rotateZ: swipeHint === 'left' ? -2 : swipeHint === 'right' ? 2 : 0,
            x: swipeHint === 'left' ? -12 : swipeHint === 'right' ? 12 : 0,
          }}
          transition={{ duration: 0.6, type: 'spring', stiffness: 260, damping: 20 }}
          style={{
            transformStyle: 'preserve-3d',
            WebkitTransformStyle: 'preserve-3d',
            willChange: 'transform',
          }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 backface-hidden bg-card/80 backdrop-blur-xl rounded-[3.5rem] border border-white/20 shadow-2xl overflow-hidden rim-light grain-overlay"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          >
            {/* Glow backgrounds */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full -mr-16 -mt-16" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -ml-16 -mb-16" />

            <div
              className={`absolute top-6 left-8 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-current/10 ${getPosColorClass(currentWord.partOfSpeech || 'Word')}`}
            >
              {currentWord.partOfSpeech || 'Word'}
            </div>

            <Button
              variant="ghost"
              size="auto"
              className="absolute top-6 right-8 text-muted-foreground/60 hover:text-yellow-400 active:scale-90 transition-all"
              onClick={e => {
                e.stopPropagation();
                onStar(currentWord.id);
              }}
            >
              <Star
                className={`w-7 h-7 ${isStarred(currentWord.id) ? 'fill-yellow-400 text-yellow-400' : ''}`}
              />
            </Button>

            <div className="w-full h-full pt-16 grid grid-rows-[1fr,auto,auto]">
              <div className="px-10 text-center flex flex-col items-center justify-center">
                <h2 className="text-5xl font-black italic tracking-tighter text-foreground mb-4 break-words leading-[1.1]">
                  {frontText}
                </h2>
                {currentWord.pronunciation && (
                  <p className="text-lg text-muted-foreground/80 font-bold tracking-tight bg-muted/50 px-3 py-0.5 rounded-full">
                    [{currentWord.pronunciation}]
                  </p>
                )}
              </div>

              <div className="w-full flex justify-center pb-8">
                <Button
                  variant="ghost"
                  size="auto"
                  className="w-14 h-14 bg-muted/50 backdrop-blur-sm border border-border/50 rounded-full flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all active:scale-90 shadow-sm"
                  onClick={e => {
                    e.stopPropagation();
                    onSpeak(korean || frontText);
                  }}
                >
                  <Volume2 className="w-7 h-7" />
                </Button>
              </div>

              <div className="pb-10 px-8">
                <div className="w-full h-px bg-gradient-to-r from-transparent via-border/50 to-transparent mb-4" />
                <div className="text-[10px] text-muted-foreground/60 font-black uppercase tracking-[0.2em] text-center">
                  {swipeHint === 'left'
                    ? t('vocab.swipeNext', { defaultValue: 'Next card' })
                    : swipeHint === 'right'
                      ? t('vocab.swipePrev', { defaultValue: 'Previous card' })
                      : t('vocab.tapAndSwipeHint', {
                          defaultValue: 'Tap to Flip • Swipe to Navigation',
                        })}
                </div>
              </div>
            </div>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 backface-hidden rotate-y-180 bg-gradient-to-br from-indigo-600 to-indigo-900 rounded-[3.5rem] border border-white/20 shadow-[0_20px_50px_-20px_rgba(79,70,229,0.4)] flex flex-col items-center justify-center p-10 text-center overflow-hidden rim-light"
            style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}
          >
            {/* Pattern Overlay */}
            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                backgroundSize: '16px 16px',
              }}
            />

            <div className="flex-1 flex flex-col items-center justify-center relative z-10 w-full">
              <h2 className="text-3xl font-black italic tracking-tighter text-white mb-6 leading-tight drop-shadow-sm">
                {backText}
              </h2>
              {currentWord.exampleSentence && (
                <div className="text-sm bg-white/10 backdrop-blur-md rounded-[2rem] p-6 w-full border border-white/20 shadow-inner">
                  <p className="mb-2 text-white font-medium leading-relaxed">
                    &quot;{currentWord.exampleSentence}&quot;
                  </p>
                  <p className="text-xs text-white/70 font-bold uppercase tracking-wider">
                    {currentWord.exampleMeaning}
                  </p>
                </div>
              )}
            </div>

            <div className="absolute bottom-10 w-full flex justify-center z-10">
              <Button
                variant="ghost"
                size="auto"
                className="flex items-center gap-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border border-white/10"
                onClick={e => {
                  e.stopPropagation();
                  onSpeak(korean);
                }}
              >
                <Volume2 className="w-4 h-4" />{' '}
                {t('vocab.listenAgain', { defaultValue: 'Listen Again' })}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Controls */}
      <div className="px-2">
        {settings.ratingMode === 'PASS_FAIL' ? (
          <div className="grid grid-cols-2 gap-4">
            <GradeButton
              label={t('vocab.forgot', { defaultValue: 'Forgot' })}
              color="again"
              onClick={() => handleGrade(1)}
            />
            <GradeButton
              label={t('vocab.remembered', { defaultValue: 'Remembered' })}
              color="good"
              onClick={() => handleGrade(3)}
            />
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2">
            <GradeButton
              label={t('vocab.rating.again', { defaultValue: 'Again' })}
              color="again"
              onClick={() => handleGrade(1)}
            />
            <GradeButton
              label={t('vocab.rating.hard', { defaultValue: 'Hard' })}
              color="hard"
              onClick={() => handleGrade(2)}
            />
            <GradeButton
              label={t('vocab.rating.good', { defaultValue: 'Good' })}
              color="good"
              onClick={() => handleGrade(3)}
            />
            <GradeButton
              label={t('vocab.rating.easy', { defaultValue: 'Easy' })}
              color="easy"
              onClick={() => handleGrade(4)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function GradeButton({
  label,
  color,
  onClick,
}: {
  readonly label: string;
  readonly color: 'again' | 'hard' | 'good' | 'easy';
  readonly onClick: () => void;
}) {
  const colorStyles = {
    again:
      'bg-rose-500/10 text-rose-600 border-rose-500/20 active:bg-rose-500/20 active:border-rose-500/30',
    hard: 'bg-orange-500/10 text-orange-600 border-orange-500/20 active:bg-orange-500/20 active:border-orange-500/30',
    good: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 active:bg-indigo-500/20 active:border-indigo-500/30',
    easy: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 active:bg-emerald-500/20 active:border-emerald-500/30',
  };

  return (
    <Button
      variant="ghost"
      size="auto"
      onClick={onClick}
      className={`flex flex-col items-center justify-center py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest border border-white/10 backdrop-blur-md active:scale-90 active:rotate-1 transition-all h-20 whitespace-nowrap shadow-xl rim-light grain-overlay ${colorStyles[color]}`}
    >
      <span className="opacity-90 drop-shadow-sm">{label}</span>
    </Button>
  );
}
