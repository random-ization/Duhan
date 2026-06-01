import { mutation, query } from '../_generated/server';
import { ConvexError, v } from 'convex/values';
import type { Doc, Id } from '../_generated/dataModel';
import { getAuthUserId, getOptionalAuthUserId } from '../utils';

export type SentenceQualityReviewStatus =
  | 'unreviewed'
  | 'auto_checked'
  | 'human_reviewed'
  | 'rejected';
export type SentenceQualityReviewDecision = 'human_reviewed' | 'rejected';
export type SentenceQualityQueueReason = 'low_confidence' | 'unreviewed';
export type SentenceQualityQueueReasonFilter = 'all' | SentenceQualityQueueReason;

export type SentenceQualityQueueItem = {
  explanationId: Id<'sentence_explanations'>;
  sentenceId?: Id<'content_sentences'>;
  sentence: string;
  naturalTranslation?: string;
  summary?: string;
  confidence?: number;
  promptVersion?: string;
  provider?: string;
  model?: string;
  source: string;
  sourceRefId: string;
  reviewStatus: SentenceQualityReviewStatus;
  reason: SentenceQualityQueueReason;
  createdAt: number;
};

export type SentenceQualityCorrectionInput = {
  naturalTranslation?: string;
  summary?: string;
};

export type SentenceQualityCorrectionChange = {
  field: 'naturalTranslation' | 'summary';
  before?: string;
  after: string;
};

export type SentenceQualityReviewResult = {
  success: true;
  explanationId: Id<'sentence_explanations'>;
  reviewStatus: SentenceQualityReviewDecision;
  correctionCount: number;
};

export type SentenceQualityBulkReviewResult = {
  success: true;
  updated: number;
  reviewStatus: SentenceQualityReviewDecision;
};

export type SentenceQualityPromptProviderStats = {
  promptVersion: string;
  provider: string;
  queued: number;
  reviewed: number;
  rejected: number;
  averageConfidence?: number;
};

export type SentenceQualityReviewStats = {
  totalQueued: number;
  lowConfidenceQueued: number;
  unreviewedQueued: number;
  humanReviewed: number;
  rejected: number;
  byPromptProvider: SentenceQualityPromptProviderStats[];
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const DEFAULT_STATS_LIMIT = 200;
const MAX_STATS_LIMIT = 500;
const DEFAULT_LOW_CONFIDENCE_THRESHOLD = 0.82;

function cleanOptionalText(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeReviewStatus(value?: string): SentenceQualityReviewStatus {
  if (value === 'auto_checked' || value === 'human_reviewed' || value === 'rejected') {
    return value;
  }
  return 'unreviewed';
}

function queueReasonFor(
  explanation: Doc<'sentence_explanations'>,
  threshold: number
): SentenceQualityQueueReason {
  if (typeof explanation.confidence === 'number' && explanation.confidence < threshold) {
    return 'low_confidence';
  }
  return 'unreviewed';
}

function toQueueItem(
  explanation: Doc<'sentence_explanations'>,
  threshold: number
): SentenceQualityQueueItem {
  return {
    explanationId: explanation._id,
    sentenceId: explanation.sentenceId,
    sentence: explanation.sentence,
    naturalTranslation: explanation.payload.naturalTranslation,
    summary: explanation.payload.summary,
    confidence: explanation.confidence,
    promptVersion: explanation.promptVersion,
    provider: explanation.provider,
    model: explanation.model,
    source: explanation.sentenceId ? 'content_import' : 'sentence_explainer',
    sourceRefId: String(explanation.sentenceId ?? explanation._id),
    reviewStatus: normalizeReviewStatus(explanation.reviewStatus),
    reason: queueReasonFor(explanation, threshold),
    createdAt: explanation.createdAt,
  };
}

function shouldQueueForReview(
  explanation: Doc<'sentence_explanations'>,
  threshold: number
): boolean {
  const status = normalizeReviewStatus(explanation.reviewStatus);
  if (status === 'human_reviewed' || status === 'rejected') {
    return false;
  }
  if (status === 'unreviewed') {
    return true;
  }
  return typeof explanation.confidence === 'number' && explanation.confidence < threshold;
}

function statsKey(promptVersion: string, provider: string): string {
  return `${promptVersion}\u0000${provider}`;
}

export const getQualityReviewQueue = query({
  args: {
    limit: v.optional(v.number()),
    maxConfidence: v.optional(v.number()),
    reason: v.optional(
      v.union(v.literal('all'), v.literal('low_confidence'), v.literal('unreviewed'))
    ),
  },
  handler: async (ctx, args): Promise<SentenceQualityQueueItem[]> => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return [];

    const limit = Math.max(1, Math.min(args.limit ?? DEFAULT_LIMIT, MAX_LIMIT));
    const threshold = args.maxConfidence ?? DEFAULT_LOW_CONFIDENCE_THRESHOLD;
    const reasonFilter = args.reason ?? 'all';
    const explanations = await ctx.db
      .query('sentence_explanations')
      .withIndex('by_user_createdAt', q => q.eq('userId', userId))
      .order('desc')
      .take(Math.max(limit * 5, limit));

    return explanations
      .filter(explanation => shouldQueueForReview(explanation, threshold))
      .filter(
        explanation =>
          reasonFilter === 'all' || queueReasonFor(explanation, threshold) === reasonFilter
      )
      .map(explanation => toQueueItem(explanation, threshold))
      .slice(0, limit);
  },
});

export const getQualityReviewStats = query({
  args: {
    limit: v.optional(v.number()),
    maxConfidence: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<SentenceQualityReviewStats | null> => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return null;

    const limit = Math.max(1, Math.min(args.limit ?? DEFAULT_STATS_LIMIT, MAX_STATS_LIMIT));
    const threshold = args.maxConfidence ?? DEFAULT_LOW_CONFIDENCE_THRESHOLD;
    const explanations = await ctx.db
      .query('sentence_explanations')
      .withIndex('by_user_createdAt', q => q.eq('userId', userId))
      .order('desc')
      .take(limit);

    const byPromptProvider = new Map<
      string,
      SentenceQualityPromptProviderStats & {
        confidenceTotal: number;
        confidenceCount: number;
      }
    >();
    let totalQueued = 0;
    let lowConfidenceQueued = 0;
    let unreviewedQueued = 0;
    let humanReviewed = 0;
    let rejected = 0;

    for (const explanation of explanations) {
      const status = normalizeReviewStatus(explanation.reviewStatus);
      const queued = shouldQueueForReview(explanation, threshold);
      const promptVersion = explanation.promptVersion ?? 'default';
      const provider = explanation.provider ?? 'auto';
      const key = statsKey(promptVersion, provider);
      const current = byPromptProvider.get(key) ?? {
        promptVersion,
        provider,
        queued: 0,
        reviewed: 0,
        rejected: 0,
        confidenceTotal: 0,
        confidenceCount: 0,
      };

      if (queued) {
        totalQueued += 1;
        current.queued += 1;
        if (queueReasonFor(explanation, threshold) === 'low_confidence') {
          lowConfidenceQueued += 1;
        } else {
          unreviewedQueued += 1;
        }
      }
      if (status === 'human_reviewed') {
        humanReviewed += 1;
        current.reviewed += 1;
      }
      if (status === 'rejected') {
        rejected += 1;
        current.rejected += 1;
      }
      if (typeof explanation.confidence === 'number') {
        current.confidenceTotal += explanation.confidence;
        current.confidenceCount += 1;
      }

      byPromptProvider.set(key, current);
    }

    return {
      totalQueued,
      lowConfidenceQueued,
      unreviewedQueued,
      humanReviewed,
      rejected,
      byPromptProvider: Array.from(byPromptProvider.values())
        .sort((left, right) => right.queued - left.queued || right.reviewed - left.reviewed)
        .map(({ confidenceTotal, confidenceCount, ...entry }) => ({
          ...entry,
          averageConfidence:
            confidenceCount > 0
              ? Math.round((confidenceTotal / confidenceCount) * 100) / 100
              : undefined,
        })),
    };
  },
});

export const reviewQualityItem = mutation({
  args: {
    explanationId: v.id('sentence_explanations'),
    decision: v.union(v.literal('human_reviewed'), v.literal('rejected')),
    corrections: v.optional(
      v.object({
        naturalTranslation: v.optional(v.string()),
        summary: v.optional(v.string()),
      })
    ),
    reviewNote: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<SentenceQualityReviewResult> => {
    const userId = await getAuthUserId(ctx);
    const explanation = await ctx.db.get(args.explanationId);
    if (!explanation || explanation.userId !== userId) {
      throw new ConvexError('SENTENCE_QUALITY_ITEM_NOT_FOUND');
    }

    const nextNaturalTranslation = cleanOptionalText(args.corrections?.naturalTranslation);
    const nextSummary = cleanOptionalText(args.corrections?.summary);
    const changes: SentenceQualityCorrectionChange[] = [];
    const nextPayload = { ...explanation.payload };

    if (
      nextNaturalTranslation !== undefined &&
      nextNaturalTranslation !== (explanation.payload.naturalTranslation ?? '')
    ) {
      changes.push({
        field: 'naturalTranslation',
        before: explanation.payload.naturalTranslation,
        after: nextNaturalTranslation,
      });
      nextPayload.naturalTranslation = nextNaturalTranslation;
    }

    if (nextSummary !== undefined && nextSummary !== (explanation.payload.summary ?? '')) {
      changes.push({
        field: 'summary',
        before: explanation.payload.summary,
        after: nextSummary,
      });
      nextPayload.summary = nextSummary;
    }

    const now = Date.now();
    const reviewNote = cleanOptionalText(args.reviewNote);
    const previousHistory = explanation.correctionHistory ?? [];
    const correctionHistory =
      changes.length > 0 || reviewNote
        ? [
            ...previousHistory,
            {
              reviewedBy: userId,
              reviewedAt: now,
              decision: args.decision,
              reviewNote,
              changes,
            },
          ]
        : previousHistory;

    await ctx.db.patch(args.explanationId, {
      payload: nextPayload,
      reviewStatus: args.decision,
      reviewedBy: userId,
      reviewedAt: now,
      qualityReviewNote: reviewNote,
      correctionHistory,
      updatedAt: now,
    });

    return {
      success: true,
      explanationId: args.explanationId,
      reviewStatus: args.decision,
      correctionCount: changes.length,
    };
  },
});

export const bulkReviewQualityItems = mutation({
  args: {
    explanationIds: v.array(v.id('sentence_explanations')),
    decision: v.union(v.literal('human_reviewed'), v.literal('rejected')),
    reviewNote: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<SentenceQualityBulkReviewResult> => {
    const userId = await getAuthUserId(ctx);
    const now = Date.now();
    const reviewNote = cleanOptionalText(args.reviewNote);
    let updated = 0;

    for (const explanationId of args.explanationIds) {
      const explanation = await ctx.db.get(explanationId);
      if (!explanation || explanation.userId !== userId) {
        throw new ConvexError('SENTENCE_QUALITY_ITEM_NOT_FOUND');
      }

      await ctx.db.patch(explanationId, {
        reviewStatus: args.decision,
        reviewedBy: userId,
        reviewedAt: now,
        qualityReviewNote: reviewNote,
        correctionHistory: reviewNote
          ? [
              ...(explanation.correctionHistory ?? []),
              {
                reviewedBy: userId,
                reviewedAt: now,
                decision: args.decision,
                reviewNote,
                changes: [],
              },
            ]
          : explanation.correctionHistory,
        updatedAt: now,
      });
      updated += 1;
    }

    return {
      success: true,
      updated,
      reviewStatus: args.decision,
    };
  },
});
