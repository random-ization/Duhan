import React from 'react';
import type { TFunction } from 'i18next';
import type { Grade } from '../../utils/srsAlgorithm';
import { Card as KsoftCard, KT, PageShell } from '../../components/mobile/ksoft/ksoft';
import {
  KsoftEmptyState,
  KsoftImmersiveHeader,
} from '../../components/mobile/ksoft/KsoftMobilePrimitives';
import type { DueReviewItem } from '../../../convex/fsrsReview';

export type AssetReviewMode = 'sentences' | 'grammar';

export type AssetReviewFeedback = {
  ratingLabel: string;
  nextReviewLabel: string;
};

type AssetReviewSessionProps = {
  mode: AssetReviewMode;
  items: DueReviewItem[];
  loading: boolean;
  isMobile: boolean;
  returnActionLabel: string;
  returnActionPath: string;
  navigate: (path: string) => void;
  onReviewAsset: (item: DueReviewItem, grade: Grade) => AssetReviewFeedback;
  onCompleteTodayTask: (currentCount?: number) => void;
  t: TFunction;
};

type AssetReviewGradeOption = {
  grade: Grade;
  label: string;
  description: string;
  mobileBackground: string;
  desktopClassName: string;
};

const ASSET_REVIEW_GRADE_OPTIONS: AssetReviewGradeOption[] = [
  {
    grade: 1 as Grade,
    label: 'Still shaky',
    description: 'Show it again soon',
    mobileBackground: KT.pink,
    desktopClassName: 'bg-k-crimson text-k-bg',
  },
  {
    grade: 3 as Grade,
    label: 'Remembered',
    description: 'Review at the normal interval',
    mobileBackground: KT.ink,
    desktopClassName: 'bg-k-ink text-k-bg',
  },
  {
    grade: 4 as Grade,
    label: 'Very familiar',
    description: 'Delay the next review',
    mobileBackground: KT.mint,
    desktopClassName: 'bg-k-mint-deep text-k-bg',
  },
];

const getAssetReviewTitle = (item: DueReviewItem): string =>
  item.kind === 'sentence' ? item.text : item.pattern;

const getAssetReviewSubtitle = (item: DueReviewItem): string | undefined =>
  item.kind === 'sentence' ? item.translation : item.explanation;

export const formatAssetNextReviewLabel = (scheduledDays: number): string => {
  if (scheduledDays <= 0) return 'Later today';
  if (scheduledDays === 1) return 'Tomorrow';
  if (scheduledDays < 7) return `In ${scheduledDays} days`;
  return `In ${Math.round(scheduledDays / 7)} weeks`;
};

export default function AssetReviewSession({
  mode,
  items,
  loading,
  isMobile,
  returnActionLabel,
  returnActionPath,
  navigate,
  onReviewAsset,
  onCompleteTodayTask,
  t,
}: AssetReviewSessionProps) {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [lastFeedback, setLastFeedback] = React.useState<AssetReviewFeedback | null>(null);
  const [completed, setCompleted] = React.useState(false);
  const isSentenceMode = mode === 'sentences';
  const title = isSentenceMode ? 'Sentence Asset Review' : 'Grammar Asset Review';
  const subtitle = loading
    ? t('common.loading', { defaultValue: 'Loading...' })
    : `${items.length} ${isSentenceMode ? 'sentence' : 'grammar'} assets ready`;
  const currentItem = items[Math.min(currentIndex, Math.max(items.length - 1, 0))];
  const currentTitle = currentItem ? getAssetReviewTitle(currentItem) : '';
  const currentSubtitle = currentItem ? getAssetReviewSubtitle(currentItem) : undefined;
  const progressText =
    items.length > 0 ? `${Math.min(currentIndex + 1, items.length)} / ${items.length}` : '0 / 0';

  const handleCompleteCurrent = (grade: Grade) => {
    if (!currentItem) {
      navigate(returnActionPath);
      return;
    }
    const feedback = onReviewAsset(currentItem, grade);
    setLastFeedback(feedback);
    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1);
      return;
    }
    onCompleteTodayTask(items.length);
    setCompleted(true);
  };

  if (!loading && completed) {
    if (isMobile) {
      return (
        <PageShell bg={`linear-gradient(180deg, ${KT.bg} 0%, ${KT.bg2} 100%)`}>
          <KsoftImmersiveHeader
            eyebrow="ASSETS"
            title="Asset review complete"
            subtitle={
              lastFeedback ? `Recorded · Next review: ${lastFeedback.nextReviewLabel}` : subtitle
            }
            seal={isSentenceMode ? 'S' : 'G'}
            onBack={() => navigate(returnActionPath)}
          />
          <main style={{ padding: '2px 16px 112px' }}>
            <KsoftCard pad={22}>
              <div style={{ color: KT.ink, fontSize: 20, fontWeight: 950 }}>
                Asset review complete
              </div>
              {lastFeedback && (
                <div style={{ marginTop: 10, color: KT.sub, fontSize: 13, fontWeight: 800 }}>
                  Recorded {lastFeedback.ratingLabel} · Next review: {lastFeedback.nextReviewLabel}
                </div>
              )}
              <button
                type="button"
                onClick={() => navigate(returnActionPath)}
                style={{
                  marginTop: 22,
                  width: '100%',
                  border: 0,
                  borderRadius: 18,
                  background: KT.ink,
                  color: KT.bg,
                  fontSize: 15,
                  fontWeight: 900,
                  padding: '14px 16px',
                }}
              >
                {returnActionLabel}
              </button>
            </KsoftCard>
          </main>
        </PageShell>
      );
    }

    return (
      <div className="p-6">
        <div className="rounded-[16px] bg-k-card p-8 shadow-k-sh-sm">
          <div className="text-[12px] font-bold text-k-sub">ASSET REVIEW</div>
          <h1 className="mt-2 text-[28px] font-black text-k-ink">Asset review complete</h1>
          {lastFeedback && (
            <div className="mt-4 rounded-[14px] bg-k-bg2 px-5 py-4 text-[14px] font-bold text-k-ink2">
              Recorded {lastFeedback.ratingLabel} · Next review: {lastFeedback.nextReviewLabel}
            </div>
          )}
          <button
            type="button"
            onClick={() => navigate(returnActionPath)}
            className="mt-6 rounded-[12px] border-none bg-k-ink px-5 py-3 text-[13px] font-black text-k-bg"
          >
            {returnActionLabel}
          </button>
        </div>
      </div>
    );
  }

  if (isMobile) {
    return (
      <PageShell bg={`linear-gradient(180deg, ${KT.bg} 0%, ${KT.bg2} 100%)`}>
        <KsoftImmersiveHeader
          eyebrow="ASSETS"
          title={title}
          subtitle={subtitle}
          seal={isSentenceMode ? 'S' : 'G'}
          onBack={() => navigate(returnActionPath)}
        />
        <main style={{ padding: '2px 16px 112px' }}>
          {loading ? (
            <KsoftCard pad={22}>
              <div style={{ color: KT.sub, fontSize: 14, fontWeight: 800 }}>
                {t('common.loading', { defaultValue: 'Loading...' })}
              </div>
            </KsoftCard>
          ) : currentItem ? (
            <KsoftCard pad={22}>
              <div style={{ color: KT.sub, fontSize: 12, fontWeight: 900 }}>{progressText}</div>
              {lastFeedback && (
                <div
                  style={{
                    marginTop: 10,
                    borderRadius: 14,
                    background: KT.bg2,
                    color: KT.sub,
                    fontSize: 12,
                    fontWeight: 800,
                    padding: '10px 12px',
                  }}
                >
                  Recorded {lastFeedback.ratingLabel} · Next review: {lastFeedback.nextReviewLabel}
                </div>
              )}
              <div style={{ marginTop: 12, color: KT.ink, fontSize: 22, fontWeight: 950 }}>
                {currentTitle}
              </div>
              {currentSubtitle && (
                <div style={{ marginTop: 10, color: KT.sub, fontSize: 14, fontWeight: 700 }}>
                  {currentSubtitle}
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10, marginTop: 22 }}>
                {ASSET_REVIEW_GRADE_OPTIONS.map(option => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => handleCompleteCurrent(option.grade)}
                    style={{
                      width: '100%',
                      border: 0,
                      borderRadius: 18,
                      background: option.mobileBackground,
                      color: KT.bg,
                      fontSize: 15,
                      fontWeight: 900,
                      padding: '13px 16px',
                    }}
                  >
                    {option.label}
                    <span style={{ display: 'block', marginTop: 3, fontSize: 10, opacity: 0.78 }}>
                      {option.description}
                    </span>
                  </button>
                ))}
              </div>
            </KsoftCard>
          ) : (
            <KsoftEmptyState
              title={isSentenceMode ? 'No sentence assets ready' : 'No grammar assets ready'}
              actionLabel={returnActionLabel}
              onAction={() => navigate(returnActionPath)}
            />
          )}
        </main>
      </PageShell>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-[12px] font-bold text-k-sub">ASSET REVIEW</div>
          <h1 className="mt-1 text-[28px] font-black text-k-ink">{title}</h1>
          <p className="mt-1 text-[13px] font-semibold text-k-sub">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate(returnActionPath)}
          className="rounded-full border border-k-line bg-k-card px-4 py-2 text-[12px] font-black text-k-ink transition hover:border-k-crimson hover:text-k-crimson"
        >
          {returnActionLabel}
        </button>
      </div>
      {loading ? (
        <KsoftCard pad={22}>
          <div className="text-[14px] font-extrabold text-k-sub">
            {t('common.loading', { defaultValue: 'Loading...' })}
          </div>
        </KsoftCard>
      ) : currentItem ? (
        <div className="rounded-[16px] bg-k-card p-8 shadow-k-sh-sm">
          <div className="mb-4 text-[12px] font-black text-k-sub">{progressText}</div>
          {lastFeedback && (
            <div className="mb-5 rounded-[14px] bg-k-bg2 px-5 py-3 text-[13px] font-bold text-k-ink2">
              Recorded {lastFeedback.ratingLabel} · Next review: {lastFeedback.nextReviewLabel}
            </div>
          )}
          <div className="font-k-serif text-[40px] font-medium leading-tight text-k-ink">
            {currentTitle}
          </div>
          {currentSubtitle && (
            <div className="mt-5 rounded-[14px] bg-k-bg2 px-5 py-4 text-[15px] font-semibold leading-7 text-k-ink2">
              {currentSubtitle}
            </div>
          )}
          <div className="mt-8 grid grid-cols-3 gap-3">
            {ASSET_REVIEW_GRADE_OPTIONS.map(option => (
              <button
                key={option.label}
                type="button"
                onClick={() => handleCompleteCurrent(option.grade)}
                className={`rounded-[12px] border-none px-4 py-3 text-[14px] font-black transition hover:-translate-y-0.5 ${option.desktopClassName}`}
              >
                <span>{option.label}</span>
                <span className="mt-1 block text-[10px] font-bold opacity-75">
                  {option.description}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-[16px] bg-k-card p-8 shadow-k-sh-sm">
          <h2 className="text-[20px] font-black text-k-ink">
            {isSentenceMode ? 'No sentence assets ready' : 'No grammar assets ready'}
          </h2>
          <button
            type="button"
            onClick={() => navigate(returnActionPath)}
            className="mt-5 rounded-[12px] border-none bg-k-ink px-5 py-3 text-[13px] font-black text-k-bg"
          >
            {returnActionLabel}
          </button>
        </div>
      )}
    </div>
  );
}
