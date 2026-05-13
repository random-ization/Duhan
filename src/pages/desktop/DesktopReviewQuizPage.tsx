import React, { useState } from 'react';
import { useMutation } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { VOCAB } from '../../utils/convexRefs';
import { 
  calculateFSRSReview, 
  deserializeCard, 
  serializeCard, 
  createEmptyCard,
  type Grade 
} from '../../utils/srsAlgorithm';
import { DesktopCard } from '../../components/desktop/ui/DesktopCard';
import { DesignChip } from '../../components/desktop/ui/DesignChip';
import type { Id } from '../../../convex/_generated/dataModel';

type VocabWord = {
  _id: Id<'words'>;
  word: string;
  meaning: string;
  meaningZh: string;
  pronunciation?: string;
  partOfSpeech: string;
  example?: string;
};

type ReviewStats = {
  dueNow: number;
  totalReviews: number;
  completedToday: number;
};

function DRail({ kanji, title, action, children, pad = 14 }: { kanji?: string; title: string; action?: string; children: React.ReactNode; pad?: number }) {
  return (
    <div className="mb-[22px]">
      <div className="mb-2.5 flex items-baseline px-0.5">
        {kanji && (
          <span className="mr-1.5 font-k-serif text-[14px] font-medium text-k-crimson">
            {kanji}
          </span>
        )}
        <span className="text-[11px] font-extrabold tracking-[0.4px] text-k-ink">
          {title}
        </span>
        {action && (
          <span className="ml-auto text-[10px] font-bold text-k-sub cursor-pointer hover:text-k-ink">
            {action}
          </span>
        )}
      </div>
      <div className="rounded-[14px] bg-k-card shadow-k-sh-sm" style={{ padding: pad }}>
        {children}
      </div>
    </div>
  );
}

interface DesktopReviewQuizProps {
  modeLabel: string;
  loading: boolean;
  words: any[];
  labels: any;
  dueItems: any[];
  mode: string;
  language: string;
  navigate: (path: string) => void;
  t: any;
}

export default function DesktopReviewQuizPage({
  modeLabel,
  loading,
  words = [],
  labels,
  dueItems,
  mode,
  language,
  navigate,
  t: passedT,
}: DesktopReviewQuizProps) {
  const { t: localT } = useTranslation();
  const t = passedT || localT;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  const submitReview = useMutation(VOCAB.updateProgressV2);

  const word = words[currentIndex] || {
    id: 'demo',
    korean: '벚꽃',
    english: 'cherry blossom',
    meaning: 'cherry blossom',
    meaningZh: t('common.cherryBlossom', 'Cherry Blossom'),
    partOfSpeech: t('common.noun', 'Noun'),
  };

  const handleReview = async (quality: number) => {
    if (!word || word.id === 'demo' || !word._id) {
      // Demo mode or no words left
      if (currentIndex < words.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setShowAnswer(false);
      } else {
        navigate('/review');
      }
      return;
    }

    try {
      const rating = quality as Grade;
      const now = new Date();
      
      // Get current card state or create new
      const currentCard = word.progress ? deserializeCard(word.progress) : createEmptyCard(now);
      
      // Calculate next state
      const result = calculateFSRSReview(rating, currentCard, now);
      const fsrsState = serializeCard(result.card);

      await submitReview({
        wordId: word._id,
        rating: quality,
        fsrsState,
      });
      
      setCompletedCount(prev => prev + 1);
      
      if (currentIndex < words.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setShowAnswer(false);
      } else {
        // Finished
        navigate('/review');
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
    }
  };

  const dueCount = words.length;

  const content = (
    <div className="grid grid-cols-2 items-start gap-[18px]">
      {/* Card */}
      <div>
        <div className="mb-4 flex items-center gap-3">
          <DesignChip tone="ink" size="sm">{t('coursesOverview.desktop.quiz.reviewing')} · {completedCount} / {dueCount}</DesignChip>
          <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--color-k-line2)' }}>
            <div className="h-full w-[29%] bg-k-crimson" />
          </div>
          <span className="text-[11px] font-bold text-k-sub">09:42 / 12:00</span>
        </div>

        <DesktopCard
          pad={0}
          className="relative grid aspect-[4/3] place-items-center overflow-hidden bg-k-bg2"
        >
          <div className="absolute right-[22px] top-[18px]">
            <DesignChip tone="butter" size="sm">{t('coursesOverview.desktop.quiz.reviewNum', { count: 4 })}</DesignChip>
          </div>
          <div className="absolute left-[22px] top-[18px] font-k-serif text-[80px] font-medium leading-[1] text-[rgba(31,27,23,0.06)]">
            春
          </div>
          <div className="p-8 text-center">
            <div className="font-k-serif text-[64px] font-medium leading-[1.1] tracking-[-1.5px] text-k-ink">
              {word.korean || word.word}
            </div>
            <div className="mt-3 text-[14px] font-bold tracking-[0.5px] text-k-sub">
              {word.pronunciation ? `[ ${word.pronunciation} ] · ` : ''} {word.partOfSpeech}
            </div>
            {word.example && (
              <div className="mt-[18px] max-w-[420px] rounded-[12px] bg-k-card px-[18px] py-[12px] text-[13px] italic text-k-ink2">
                {word.example}
              </div>
            )}
            {!showAnswer && (
              <button 
                onClick={() => setShowAnswer(true)}
                className="mt-8 cursor-pointer rounded-full bg-k-ink px-8 py-3 text-[14px] font-extrabold text-k-bg transition-transform hover:scale-105"
              >
                {t('coursesOverview.desktop.quiz.revealAnswer', { defaultValue: 'Show Answer' })}
              </button>
            )}
          </div>
        </DesktopCard>

        {showAnswer && (
          <div className="mt-[14px] grid grid-cols-4 gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {[
              { l: t('coursesOverview.desktop.quiz.again'), s: t('coursesOverview.desktop.quiz.timeUnit.minute'), tone: 'var(--color-k-crimson)', kbd: '1', quality: 0 },
              { l: t('coursesOverview.desktop.quiz.hard'), s: t('coursesOverview.desktop.quiz.timeUnit.minutes', { count: 6 }), tone: 'var(--color-k-pink-deep)', kbd: '2', quality: 1 },
              { l: t('coursesOverview.desktop.quiz.good'), s: t('coursesOverview.desktop.quiz.timeUnit.day'), tone: 'var(--color-k-mint-deep)', kbd: '3', quality: 3 },
              { l: t('coursesOverview.desktop.quiz.easy'), s: t('coursesOverview.desktop.quiz.timeUnit.days', { count: 5 }), tone: 'var(--color-k-indigo)', kbd: '4', quality: 5 },
            ].map((b, i) => (
              <button
                key={i}
                onClick={() => handleReview(b.quality)}
                className="flex cursor-pointer flex-col items-center gap-1 rounded-[12px] border-none px-2 py-[14px] text-k-card transition-transform hover:-translate-y-1"
                style={{ background: b.tone }}
              >
                <span className="text-[13px] font-extrabold">{b.l}</span>
                <span className="text-[10px] font-bold opacity-85">{b.s}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right — answer + meta */}
      <div>
        {showAnswer ? (
          <DesktopCard pad={24} className="mb-[14px] animate-in fade-in slide-in-from-right-4 duration-300">
            <DesignChip tone="mint" size="sm">{t('coursesOverview.desktop.quiz.revealed')}</DesignChip>
            <div className="mt-3 font-k-serif text-[36px] font-medium tracking-[-0.8px] text-k-ink">
              {word.meaningZh || word.meaning}
            </div>
            <div className="mt-1 text-[13px] font-semibold text-k-sub">
              {word.meaning}
            </div>
            {word.example && (
              <div className="mt-4 rounded-[12px] bg-k-bg2 px-[16px] py-[14px]">
                <div className="font-k-serif text-[15px] leading-[1.7] text-k-ink">
                  {word.example}
                </div>
              </div>
            )}
          </DesktopCard>
        ) : (
          <DesktopCard pad={24} className="mb-[14px] flex flex-col items-center justify-center py-12 text-center opacity-40">
            <div className="text-[14px] font-bold text-k-sub">
              {t('coursesOverview.desktop.quiz.pressToReveal', { defaultValue: 'Reveal to see meaning' })}
            </div>
          </DesktopCard>
        )}

        <DRail kanji="關" title={t('coursesOverview.desktop.quiz.relatedVocab')} pad={0}>
          {[
            { w: '꽃', m: t('common.flower', 'Flower') },
            { w: '봄', m: t('common.spring', 'Spring') },
            { w: '벚나무', m: t('common.cherryTree', 'Cherry Tree') },
          ].map((v, i, a) => (
            <div
              key={i}
              className="flex justify-between px-[14px] py-[7px]"
              style={{ borderBottom: i < a.length - 1 ? '1px solid var(--color-k-line)' : 'none' }}
            >
              <span className="text-[13px] font-extrabold tracking-[-0.2px] text-k-ink">{v.w}</span>
              <span className="text-[11px] font-semibold text-k-sub">{v.m}</span>
            </div>
          ))}
        </DRail>

        <DRail kanji="歷" title={t('coursesOverview.desktop.quiz.reviewHistory')} pad={0}>
          <div className="flex gap-1.5 px-[14px] py-[10px]">
            {[40, 65, 85, 55, 70, 90, 75].map((v, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm"
                style={{
                  height: `${v * 0.6}px`,
                  background: v > 70 ? 'var(--color-k-mint-deep)' : v > 50 ? 'var(--color-k-butter)' : 'var(--color-k-crimson)',
                }}
              />
            ))}
          </div>
          <div className="px-[14px] pb-[8px] text-[10px] font-bold text-k-sub">
            {t('coursesOverview.desktop.quiz.accuracyRate')}
          </div>
        </DRail>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-4 text-[12px] font-bold text-k-sub">
        {t('coursesOverview.desktop.review.title').toUpperCase()} · {t('coursesOverview.desktop.quiz.fsrsReview')}
      </div>
      {content}
    </div>
  );
}
