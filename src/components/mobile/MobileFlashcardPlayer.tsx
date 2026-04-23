import { useAction } from 'convex/react';
import { m as motion, useMotionValue, useTransform, useAnimation } from 'framer-motion';
import { Bookmark, Volume2, ArrowLeftRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { aRef } from '../../utils/convexRefs';
import { ExtendedVocabItem } from '../../pages/VocabModulePage';

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
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.02'/%3E%3C/svg%3E\")";

const BODY_NOISE =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.045'/%3E%3C/svg%3E\")";

const formatScheduledLabel = (days: number | undefined) => {
  if (typeof days !== 'number' || !Number.isFinite(days)) return '...';
  if (days <= 0) return '< 1m';
  if (days < 7) return `${Math.round(days)}d`;
  if (days < 30) return `${Math.round(days / 7)}w`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${Math.round(days / 365)}y`;
};

const buildPreviewCardState = (word: ExtendedVocabItem | undefined): PreviewCardState | undefined => {
  if (!word) return undefined;
  const progress = word.progress;
  const state = word.state ?? (progress?.status === 'MASTERED' ? 2 : progress?.status === 'REVIEW' ? 2 : progress?.status === 'LEARNING' ? 1 : 0);
  const due = progress?.nextReviewAt ?? Date.now();
  return {
    state,
    due,
    stability: word.stability ?? 0,
    difficulty: word.difficulty ?? 5,
    elapsed_days: word.elapsed_days ?? 0,
    scheduled_days: word.scheduled_days ?? progress?.interval ?? 0,
    learning_steps: word.learning_steps ?? 0,
    reps: word.reps ?? progress?.streak ?? 0,
    lapses: word.lapses ?? 0,
    last_review: word.last_review ?? undefined,
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
  const [preview, setPreview] = useState<SchedulingPreview | null>(null);

  const controls = useAnimation();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const rotate = useTransform(x, [-300, 300], [-15, 15]);

  const stampAgainOpacity = useTransform(x, [0, -80], [0, 1]);
  const stampAgainScale = useTransform(stampAgainOpacity, [0, 1], [0.8, 1.0]);
  
  const stampGotItOpacity = useTransform(x, [0, 80], [0, 1]);
  const stampGotItScale = useTransform(stampGotItOpacity, [0, 1], [0.8, 1.0]);

  const currentWord = words[currentIndex];
  const korean = currentWord?.korean || currentWord?.word || '';
  const nativeText = currentWord?.meaning || currentWord?.english || '';
  const heroText = settings.cardFront === 'NATIVE' ? nativeText : korean;
  const detailText = settings.cardFront === 'NATIVE' ? korean : nativeText;
  const exampleSentence = currentWord?.exampleSentence || '';
  const exampleMeaning = currentWord?.exampleMeaning || currentWord?.exampleTranslation || '';
  const pronunciation = currentWord?.pronunciation || '';
  
  const currentCardState = useMemo(() => buildPreviewCardState(currentWord), [currentWord]);
  const getSchedulingPreview = useAction(aRef<{ currentCard?: PreviewCardState; now?: number }, SchedulingPreview>('fsrs:getSchedulingPreview'));

  useEffect(() => {
    if (!settings.autoTTS || !korean) return;
    onSpeak(korean);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, settings.autoTTS]);

  useEffect(() => {
    setIsFlipped(false);
    x.set(0);
    y.set(0);
    controls.set({ x: 0, y: 0, opacity: 1, scale: 1 });
  }, [currentIndex, x, y, controls]);

  useEffect(() => {
    let cancelled = false;
    const loadPreview = async () => {
      try {
        const nextPreview = await getSchedulingPreview(currentCardState ? { currentCard: currentCardState } : {});
        if (!cancelled) setPreview(nextPreview);
      } catch {
        if (!cancelled) setPreview(null);
      }
    };
    void loadPreview();
    return () => { cancelled = true; };
  }, [currentCardState, getSchedulingPreview]);

  if (!currentWord) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center text-slate-500" style={{ backgroundImage: BODY_NOISE }}>
        <p className="font-bold">{t('vocab.noWords', { defaultValue: 'No words available' })}</p>
      </div>
    );
  }

  const handleGrade = async (quality: number) => {
    const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 400;
    
    // Animate fly out based on quality
    const flyOutX = quality <= 2 ? -windowWidth : windowWidth;
    
    await controls.start({
      x: flyOutX,
      y: y.get() + 50,
      opacity: 0,
      rotate: quality <= 2 ? -20 : 20,
      transition: { duration: 0.3, ease: 'easeOut' }
    });
    
    onReview(currentWord, quality);
  };

  const handleCardFlip = () => {
    setIsFlipped((prev) => !prev);
  };

  const handleDragEnd = async (event: any, info: any) => {
    const swipeThreshold = (typeof window !== 'undefined' ? window.innerWidth : 400) * 0.25;
    
    if (info.offset.x < -swipeThreshold) {
      await handleGrade(1);
    } else if (info.offset.x > swipeThreshold) {
      await handleGrade(3);
    } else {
      // Bounce back
      controls.start({ x: 0, y: 0, transition: { type: 'spring', stiffness: 300, damping: 20 } });
    }
  };

  const ratingButtons = [
    { quality: 1, label: t('vocab.forgot', '重来'), previewLabel: formatScheduledLabel(preview?.again.scheduled_days), color: 'again' as const, badgeClass: 'text-rose-500 bg-rose-50' },
    { quality: 3, label: t('vocab.remembered', '已掌握'), previewLabel: formatScheduledLabel(preview?.good.scheduled_days), color: 'good' as const, badgeClass: 'text-emerald-600 bg-emerald-50' },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden text-slate-900" style={{ backgroundColor: '#E6E7E9', backgroundImage: BODY_NOISE, WebkitFontSmoothing: 'antialiased', overscrollBehaviorY: 'contain' }}>
      <style>{`
        .perspective-1000 { perspective: 1200px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
        
        .card-paper-face {
            background: #FCFCFA;
            box-shadow: 0 32px 64px -16px rgba(0,0,0,0.15), 0 4px 12px -4px rgba(0,0,0,0.08), inset 0 1px 1px rgba(255,255,255,1), inset 0 -2px 1px rgba(0,0,0,0.03);
            border: 1px solid rgba(0,0,0,0.06);
            background-image: ${NOISE_BACKGROUND};
        }

        .card-stack-1 {
            background: #F3F3F1;
            box-shadow: 0 16px 32px -12px rgba(0,0,0,0.1);
            border: 1px solid rgba(0,0,0,0.04);
            transform: translateY(16px) scale(0.94);
        }
        .card-stack-2 {
            background: #EBEBE9;
            box-shadow: 0 8px 16px -8px rgba(0,0,0,0.05);
            border: 1px solid rgba(0,0,0,0.03);
            transform: translateY(30px) scale(0.88);
        }

        .letterpress-text {
            color: #1A1A1C;
            text-shadow: 0 1px 1px rgba(255,255,255,0.9);
        }

        .stamp {
            position: absolute;
            top: 40px;
            padding: 8px 16px;
            border: 4px solid;
            border-radius: 12px;
            font-size: 28px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: 0.2em;
            pointer-events: none;
            z-index: 100;
        }

        .stamp-again {
            right: 30px;
            color: #F43F5E;
            border-color: #F43F5E;
            box-shadow: inset 0 0 10px rgba(244,63,94,0.2), 0 0 10px rgba(244,63,94,0.2);
        }

        .stamp-got-it {
            left: 30px;
            color: #10B981;
            border-color: #10B981;
            box-shadow: inset 0 0 10px rgba(16,185,129,0.2), 0 0 10px rgba(16,185,129,0.2);
        }

        .btn-tactile {
            background: linear-gradient(180deg, #FFFFFF 0%, #F4F4F5 100%);
            box-shadow: 0 4px 0px #D4D4D8, 0 8px 16px rgba(0,0,0,0.08), inset 0 1px 1px #FFFFFF;
            border: 1px solid #E4E4E7;
            transition: all 0.1s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-tactile:active {
            transform: translateY(4px);
            box-shadow: 0 0px 0px #D4D4D8, 0 2px 4px rgba(0,0,0,0.05), inset 0 2px 4px rgba(0,0,0,0.05);
            background: #F4F4F5;
        }
        .key-again { border-top: 2px solid #FDA4AF; }
        .key-hard { border-top: 2px solid #FCD34D; }
        .key-good { border-top: 2px solid #93C5FD; }
        .key-easy { border-top: 2px solid #86EFAC; }
      `}</style>

      {/* Header Overlay provides spacing, so use a simple spacer */}
      <div className="h-14 shrink-0"></div>

      <main className="flex-1 relative flex items-center justify-center px-5 mt-[-20px] pointer-events-none">
        
        {/* Static Background Stacks */}
        <div className="absolute w-full max-w-[350px] aspect-[3/4] rounded-[2.5rem] card-stack-2 z-0"></div>
        <div className="absolute w-full max-w-[350px] aspect-[3/4] rounded-[2.5rem] card-stack-1 z-10"></div>

        {/* Draggable 3D Engine */}
        <div className="perspective-1000 w-full max-w-[350px] aspect-[3/4] z-20 pointer-events-auto">
          <motion.div
            id="flashcard"
            className="w-full h-full relative transform-style-3d cursor-grab active:cursor-grabbing rounded-[2.5rem]"
            style={{ x, y, rotateZ: rotate }}
            animate={controls}
            drag
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.8}
            onDragEnd={handleDragEnd}
            onClick={(e) => {
              // Prevent flip if dragging
              if (Math.abs(x.get()) > 5 || Math.abs(y.get()) > 5) return;
              handleCardFlip();
            }}
          >
            {/* Dynamic Stamps */}
            <motion.div
                className="stamp stamp-again"
                style={{ opacity: stampAgainOpacity, scale: stampAgainScale, rotate: 15 }}
            >
                需重来
            </motion.div>
            <motion.div
                className="stamp stamp-got-it"
                style={{ opacity: stampGotItOpacity, scale: stampGotItScale, rotate: -15 }}
            >
                已掌握
            </motion.div>

            <motion.div
              className="absolute inset-0 backface-hidden card-paper-face rounded-[2.5rem] flex flex-col"
              animate={{ rotateY: isFlipped ? 180 : 0 }}
              transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <div className="px-6 pt-6 pb-2 flex justify-between items-start">
                  <div className="bg-blue-50/80 text-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest border border-blue-100 uppercase shadow-sm">
                      {scopeTitle || '复习'}
                  </div>
                  <button 
                      className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 shadow-sm transition-colors hover:bg-rose-50 hover:text-rose-500" 
                      onClick={(e) => { e.stopPropagation(); onStar(currentWord.id); }}
                      onPointerDown={(e) => e.stopPropagation()}
                  >
                      <Bookmark className={`w-4 h-4 ${isStarred(currentWord.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                  </button>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center px-6 pb-10 pointer-events-none">
                  {pronunciation && (
                      <p className="text-[13px] font-bold text-slate-400 tracking-widest mb-3 font-mono">[{pronunciation}]</p>
                  )}
                  <h2 className="text-5xl font-black letterpress-text tracking-tight mb-12 text-center leading-tight">
                      {heroText}
                  </h2>
                  
                  <button 
                      className="bg-gradient-to-b from-[#7A8D9A] to-[#61717A] w-14 h-14 rounded-full flex items-center justify-center text-white shadow-[0_8px_16px_-4px_rgba(97,113,122,0.4),inset_0_1px_1px_rgba(255,255,255,0.2)] pointer-events-auto active:scale-95 transition-transform" 
                      onClick={(e) => { e.stopPropagation(); onSpeak(korean || heroText); }}
                      onPointerDown={(e) => e.stopPropagation()}
                  >
                      <Volume2 className="w-5 h-5" />
                  </button>
              </div>
              
              <div className="pb-6 text-center pointer-events-none">
                  <span className="text-[10px] font-bold text-slate-300 tracking-widest uppercase flex items-center justify-center gap-1.5">
                      <ArrowLeftRight className="w-3.5 h-3.5" /> 左右滑动 或 点击翻转
                  </span>
              </div>
            </motion.div>

            <motion.div
              className="absolute inset-0 backface-hidden card-paper-face rounded-[2.5rem] flex flex-col"
              initial={{ rotateY: -180 }}
              animate={{ rotateY: isFlipped ? 0 : -180 }}
              transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <div className="px-6 pt-6 pb-2 flex justify-between items-start">
                  <div className="bg-emerald-50/80 text-emerald-600 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest border border-emerald-100 uppercase shadow-sm">
                      释义与例句
                  </div>
                  <button 
                      className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 shadow-sm transition-colors hover:bg-rose-50 hover:text-rose-500" 
                      onClick={(e) => { e.stopPropagation(); onStar(currentWord.id); }}
                      onPointerDown={(e) => e.stopPropagation()}
                  >
                      <Bookmark className={`w-4 h-4 ${isStarred(currentWord.id) ? 'fill-rose-500 text-rose-500' : ''}`} />
                  </button>
              </div>

              <div className="flex-1 flex flex-col justify-center px-6 pointer-events-none">
                  <div className="text-center mb-6">
                      <p className="text-[14px] font-black text-slate-400 tracking-widest mb-1 font-mono">{korean || heroText}</p>
                      <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-tight">{detailText}</h2>
                  </div>
                  
                  <div className="bg-[#F8F9FA] rounded-[1.2rem] p-5 border border-slate-200/60 shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]">
                      <p className="text-[15px] font-black text-slate-800 mb-3 leading-relaxed">
                          {exampleSentence ? exampleSentence : <span className="text-slate-400">无例句</span>}
                      </p>
                      {exampleMeaning && (
                          <p className="text-[13px] font-medium text-slate-500 tracking-wide">{exampleMeaning}</p>
                      )}
                  </div>
              </div>
              
              <div className="pb-6 flex justify-center pointer-events-auto">
                  <button 
                      className="bg-slate-100 w-12 h-12 rounded-full flex items-center justify-center text-slate-500 shadow-sm border border-slate-200 active:scale-95 transition-transform" 
                      onClick={(e) => { e.stopPropagation(); onSpeak(exampleSentence || korean || heroText); }}
                      onPointerDown={(e) => e.stopPropagation()}
                  >
                      <Volume2 className="w-4 h-4" />
                  </button>
              </div>
            </motion.div>

          </motion.div>
        </div>
      </main>

      <footer className="px-4 pb-8 pt-4 z-40 bg-gradient-to-t from-[#E6E7E9] via-[#E6E7E9] to-transparent shrink-0">
        <p className="text-center text-[10px] font-bold text-slate-400 tracking-[0.2em] mb-3 uppercase">请评估记忆掌握度</p>
        <div className={`grid gap-2.5 max-w-[420px] mx-auto grid-cols-2`}>
            {ratingButtons.map((btn) => (
                <button 
                  key={btn.quality}
                  className={`btn-tactile key-${btn.color} rounded-[1.2rem] py-3.5 flex flex-col items-center justify-center space-y-1.5`}
                  onClick={() => handleGrade(btn.quality)}
                >
                    <span className="text-[14px] font-black text-slate-800 tracking-tight">{btn.label}</span>
                    <span className={`text-[10px] font-black px-1.5 rounded-[4px] ${btn.badgeClass}`}>
                        {btn.previewLabel}
                    </span>
                </button>
            ))}
        </div>
      </footer>

    </div>
  );
}
