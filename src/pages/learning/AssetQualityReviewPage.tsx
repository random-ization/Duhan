import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { ArrowLeft, CheckCircle2, ShieldCheck, XCircle } from 'lucide-react';
import type { Id } from '../../../convex/_generated/dataModel';
import type {
  SentenceQualityCorrectionInput,
  SentenceQualityQueueItem,
  SentenceQualityQueueReasonFilter,
} from '../../../convex/sentenceExplainer/quality';
import { Button, Textarea } from '../../components/ui';
import { DesktopCard } from '../../components/desktop/ui/DesktopCard';
import { DesignChip } from '../../components/desktop/ui/DesignChip';
import { HanjaSeal } from '../../components/desktop/ui/HanjaSeal';
import { SENTENCE_EXPLAINER } from '../../utils/convexRefs';
import { notify } from '../../utils/notify';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';

function formatConfidence(value?: number): string {
  return typeof value === 'number' ? `${Math.round(value * 100)}%` : 'Pending';
}

function reasonLabel(item: SentenceQualityQueueItem): string {
  return item.reason === 'low_confidence' ? 'Low confidence' : 'Needs review';
}

const AssetQualityReviewPage: React.FC = () => {
  const navigate = useLocalizedNavigate();
  const [reasonFilter, setReasonFilter] = useState<SentenceQualityQueueReasonFilter>('all');
  const queue = useQuery(SENTENCE_EXPLAINER.getQualityReviewQueue, {
    limit: 30,
    maxConfidence: 0.82,
    reason: reasonFilter,
  });
  const qualityStats = useQuery(SENTENCE_EXPLAINER.getQualityReviewStats, {
    limit: 200,
    maxConfidence: 0.82,
  });
  const reviewQualityItem = useMutation(SENTENCE_EXPLAINER.reviewQualityItem);
  const bulkReviewQualityItems = useMutation(SENTENCE_EXPLAINER.bulkReviewQualityItems);
  const [pendingId, setPendingId] = useState<Id<'sentence_explanations'> | null>(null);
  const [bulkPending, setBulkPending] = useState(false);
  const [correctionsById, setCorrectionsById] = useState<
    Record<
      string,
      {
        naturalTranslation: string;
        summary: string;
        reviewNote: string;
      }
    >
  >({});

  const getDraftForItem = (item: SentenceQualityQueueItem) =>
    correctionsById[String(item.explanationId)] ?? {
      naturalTranslation: item.naturalTranslation ?? '',
      summary: item.summary ?? '',
      reviewNote: '',
    };

  const updateDraft = (
    item: SentenceQualityQueueItem,
    patch: Partial<ReturnType<typeof getDraftForItem>>
  ) => {
    setCorrectionsById(previous => {
      const key = String(item.explanationId);
      const current = previous[key] ?? getDraftForItem(item);
      return {
        ...previous,
        [key]: {
          ...current,
          ...patch,
        },
      };
    });
  };

  const buildCorrections = (
    item: SentenceQualityQueueItem
  ): {
    corrections?: SentenceQualityCorrectionInput;
    reviewNote?: string;
  } => {
    const draft = getDraftForItem(item);
    const naturalTranslation = draft.naturalTranslation.trim();
    const summary = draft.summary.trim();
    const reviewNote = draft.reviewNote.trim();
    const corrections: SentenceQualityCorrectionInput = {};

    if (naturalTranslation && naturalTranslation !== (item.naturalTranslation ?? '')) {
      corrections.naturalTranslation = naturalTranslation;
    }
    if (summary && summary !== (item.summary ?? '')) {
      corrections.summary = summary;
    }

    return {
      corrections: Object.keys(corrections).length > 0 ? corrections : undefined,
      reviewNote: reviewNote || undefined,
    };
  };

  const handleReview = async (
    item: SentenceQualityQueueItem,
    decision: 'human_reviewed' | 'rejected'
  ) => {
    const explanationId = item.explanationId;
    setPendingId(explanationId);
    try {
      await reviewQualityItem({
        explanationId,
        decision,
        ...buildCorrections(item),
      });
      notify.success(decision === 'human_reviewed' ? 'Approved' : 'Marked as rejected');
    } catch (error) {
      console.error(error);
      notify.error('Review action failed. Please try again.');
    } finally {
      setPendingId(null);
    }
  };

  const items = useMemo(() => queue ?? [], [queue]);
  const isReviewPending = pendingId !== null || bulkPending;
  const queueStats = useMemo(() => {
    const lowConfidenceCount = items.filter(item => item.reason === 'low_confidence').length;
    const unreviewedCount = items.filter(item => item.reason === 'unreviewed').length;
    const promptProviderPairs = Array.from(
      new Set(
        items.map(item => `Prompt ${item.promptVersion ?? 'default'} / ${item.provider ?? 'auto'}`)
      )
    );

    return {
      lowConfidenceCount,
      unreviewedCount,
      promptProviderLabel: promptProviderPairs[0] ?? 'Prompt default / auto',
    };
  }, [items]);

  const handleBulkApprove = async () => {
    if (items.length === 0) return;
    setBulkPending(true);
    try {
      await bulkReviewQualityItems({
        explanationIds: items.map(item => item.explanationId),
        decision: 'human_reviewed',
        reviewNote: 'batch_review',
      });
      notify.success('Current queue approved in bulk');
    } catch (error) {
      console.error(error);
      notify.error('Bulk review failed. Please try again.');
    } finally {
      setBulkPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-k-bg p-6 md:p-12 font-k-sans pb-32">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/review')}>
            <ArrowLeft size={20} />
          </Button>
          <div className="flex items-center gap-3">
            <HanjaSeal c="Q" size={42} bg="var(--color-k-indigo)" round={10} />
            <div>
              <h1 className="text-2xl font-black text-k-ink">AI Asset Quality Review</h1>
              <p className="text-sm font-medium text-k-sub">
                Review low-confidence and unreviewed sentence explanation assets.
              </p>
            </div>
          </div>
        </div>

        <DesktopCard className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-k-sub">
              Review Queue
            </div>
            <div className="mt-1 text-xl font-black text-k-ink">{items.length} assets pending</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="gap-2 font-black"
              loading={bulkPending}
              disabled={items.length === 0 || isReviewPending}
              onClick={() => void handleBulkApprove()}
            >
              <CheckCircle2 size={16} />
              Approve current list
            </Button>
            <DesignChip tone={items.length > 0 ? 'butter' : 'mint'} size="sm">
              approve / reject
            </DesignChip>
          </div>
        </DesktopCard>

        <DesktopCard className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['all', 'All pending'],
                ['low_confidence', 'Low confidence first'],
                ['unreviewed', 'Unreviewed first'],
              ] satisfies Array<[SentenceQualityQueueReasonFilter, string]>
            ).map(([value, label]) => (
              <Button
                key={value}
                variant={reasonFilter === value ? 'default' : 'outline'}
                className="font-black"
                onClick={() => setReasonFilter(value)}
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="grid gap-1 text-right text-[11px] font-black uppercase tracking-wider text-k-sub">
            <div>
              Low confidence {queueStats.lowConfidenceCount} / Unreviewed{' '}
              {queueStats.unreviewedCount}
            </div>
            <div>{queueStats.promptProviderLabel}</div>
          </div>
        </DesktopCard>

        {qualityStats && (
          <DesktopCard className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,auto)] md:items-center">
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-k-sub">
                Quality workload
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-sm font-black text-k-ink">
                <span>Total queued {qualityStats.totalQueued}</span>
                <span>
                  Approved {qualityStats.humanReviewed} / Rejected {qualityStats.rejected}
                </span>
              </div>
            </div>
            {qualityStats.byPromptProvider.slice(0, 3).map(entry => (
              <div
                key={`${entry.promptVersion}:${entry.provider}`}
                className="rounded-k-sm bg-k-line/40 px-3 py-2 text-right"
              >
                <div className="text-xs font-black text-k-ink">
                  {entry.promptVersion} / {entry.provider}
                </div>
                <div className="mt-1 text-[11px] font-bold text-k-sub">
                  Queued {entry.queued} · Approved {entry.reviewed} · Rejected {entry.rejected} ·
                  Avg quality {formatConfidence(entry.averageConfidence)}
                </div>
              </div>
            ))}
          </DesktopCard>
        )}

        {queue === undefined ? (
          <div className="py-16 text-center text-sm font-bold text-k-sub">
            Loading review queue...
          </div>
        ) : items.length === 0 ? (
          <DesktopCard className="py-14 text-center">
            <ShieldCheck size={34} className="mx-auto text-k-mint" />
            <h2 className="mt-4 text-lg font-black text-k-ink">No low-confidence assets</h2>
            <p className="mt-2 text-sm font-medium text-k-sub">
              Newly generated unreviewed or low-confidence sentence explanations will appear here.
            </p>
          </DesktopCard>
        ) : (
          <div className="grid gap-4">
            {items.map(item => {
              const draft = getDraftForItem(item);
              return (
                <DesktopCard key={String(item.explanationId)} className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <DesignChip
                          tone={item.reason === 'low_confidence' ? 'crimson' : 'butter'}
                          size="sm"
                        >
                          {reasonLabel(item)}
                        </DesignChip>
                        <DesignChip tone="muted" size="sm">
                          {item.reviewStatus}
                        </DesignChip>
                      </div>
                      <h2 className="mt-3 text-lg font-black leading-relaxed text-k-ink">
                        {item.sentence}
                      </h2>
                      {item.naturalTranslation && (
                        <p className="mt-2 text-sm font-bold leading-relaxed text-k-sub">
                          {item.naturalTranslation}
                        </p>
                      )}
                    </div>
                    <div className="grid min-w-40 gap-2 text-[11px] font-black text-k-sub">
                      <div>AI quality {formatConfidence(item.confidence)}</div>
                      <div>Prompt {item.promptVersion ?? 'default'}</div>
                      <div>Source {item.source}</div>
                      <div>Provider {item.provider ?? 'auto'}</div>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-[11px] font-black uppercase tracking-wider text-k-sub">
                      Natural translation correction
                      <Textarea
                        aria-label="Natural translation correction"
                        value={draft.naturalTranslation}
                        onChange={event =>
                          updateDraft(item, { naturalTranslation: event.target.value })
                        }
                        className="mt-1 min-h-20 border-k-line text-sm font-bold"
                      />
                    </label>
                    <label className="text-[11px] font-black uppercase tracking-wider text-k-sub">
                      Summary correction
                      <Textarea
                        aria-label="Summary correction"
                        value={draft.summary}
                        onChange={event => updateDraft(item, { summary: event.target.value })}
                        className="mt-1 min-h-20 border-k-line text-sm font-bold"
                      />
                    </label>
                  </div>

                  <label className="block text-[11px] font-black uppercase tracking-wider text-k-sub">
                    Review note
                    <Textarea
                      aria-label="Review note"
                      value={draft.reviewNote}
                      onChange={event => updateDraft(item, { reviewNote: event.target.value })}
                      className="mt-1 min-h-16 border-k-line text-sm font-bold"
                      placeholder="Record the reason for this correction for later tracking."
                    />
                  </label>

                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      variant="outline"
                      className="gap-2 font-black"
                      loading={pendingId === item.explanationId}
                      disabled={isReviewPending}
                      onClick={() => void handleReview(item, 'rejected')}
                    >
                      <XCircle size={16} />
                      Reject
                    </Button>
                    <Button
                      className="gap-2 bg-k-ink text-k-bg hover:bg-k-ink/90"
                      loading={pendingId === item.explanationId}
                      disabled={isReviewPending}
                      onClick={() => void handleReview(item, 'human_reviewed')}
                    >
                      <CheckCircle2 size={16} />
                      Approve
                    </Button>
                  </div>
                </DesktopCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetQualityReviewPage;
