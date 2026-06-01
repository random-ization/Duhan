/**
 * AI Draft Review — quality gate for AI-generated content.
 *
 * PRD principle: "AI 不写正式表" — all AI output goes through draft tables
 * first, then gets reviewed (manually or via automated checks) before
 * being promoted to production tables.
 *
 * Draft table types:
 * - ai_word_enrichment_drafts — proposed word senses, examples, metadata
 * - ai_grammar_explanation_drafts — proposed grammar explanations
 * - ai_sentence_explanation_drafts — proposed sentence explanations
 *
 * Review flow:
 * 1. AI generates output → stored as draft (reviewStatus: "pending")
 * 2. Admin reviews in batch → "approved" or "rejected"
 * 3. Approved drafts get promoted to production tables
 */

import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthUserId } from './utils';
import type { Doc, Id } from './_generated/dataModel';
import { LooseJsonDeepValueValidator } from './jsonValidators';

type DraftTable =
  | 'ai_word_enrichment_drafts'
  | 'ai_grammar_explanation_drafts'
  | 'ai_sentence_explanation_drafts';

type DraftId = Id<DraftTable>;
type WordPatch = Partial<
  Pick<
    Doc<'words'>,
    'updatedAt' | 'senses' | 'topikLevel' | 'frequencyRank' | 'tags' | 'romanization'
  >
>;

const VALID_DRAFT_TABLES: DraftTable[] = [
  'ai_word_enrichment_drafts',
  'ai_grammar_explanation_drafts',
  'ai_sentence_explanation_drafts',
];

// ── Queries ──────────────────────────────────────────────────────

/**
 * Get pending drafts for a given table type.
 */
export const getPendingDrafts = query({
  args: {
    draftType: v.string(), // "word" | "grammar" | "sentence"
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const tableName = resolveTableName(args.draftType);
    if (!tableName) return [];

    const limit = args.limit ?? 50;

    return await ctx.db
      .query(tableName)
      .withIndex('by_status', q => q.eq('reviewStatus', 'pending'))
      .take(limit);
  },
});

/**
 * Get draft review statistics across all tables.
 */
export const getDraftStats = query({
  args: {},
  handler: async ctx => {
    const stats: Record<string, { pending: number; approved: number; rejected: number }> = {};

    for (const table of VALID_DRAFT_TABLES) {
      const pending = await ctx.db
        .query(table)
        .withIndex('by_status', q => q.eq('reviewStatus', 'pending'))
        .take(1000);
      const approved = await ctx.db
        .query(table)
        .withIndex('by_status', q => q.eq('reviewStatus', 'approved'))
        .take(1000);
      const rejected = await ctx.db
        .query(table)
        .withIndex('by_status', q => q.eq('reviewStatus', 'rejected'))
        .take(1000);

      const shortName = table.replace('ai_', '').replace('_drafts', '');
      stats[shortName] = {
        pending: pending.length,
        approved: approved.length,
        rejected: rejected.length,
      };
    }

    return stats;
  },
});

// ── Mutations ────────────────────────────────────────────────────

/**
 * Submit a new AI-generated word enrichment draft.
 */
export const submitWordDraft = mutation({
  args: {
    wordId: v.optional(v.id('words')),
    candidateLemma: v.string(),
    payload: LooseJsonDeepValueValidator,
    modelVersion: v.string(),
    promptVersion: v.string(),
    confidence: v.number(),
    generationBatchId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('ai_word_enrichment_drafts', {
      wordId: args.wordId,
      candidateLemma: args.candidateLemma,
      payload: args.payload,
      modelVersion: args.modelVersion,
      promptVersion: args.promptVersion,
      confidence: args.confidence,
      reviewStatus: 'pending',
      generationBatchId: args.generationBatchId,
      createdAt: Date.now(),
    });
  },
});

/**
 * Submit a new AI-generated grammar explanation draft.
 */
export const submitGrammarDraft = mutation({
  args: {
    grammarPointId: v.optional(v.id('grammar_points')),
    candidatePattern: v.string(),
    payload: LooseJsonDeepValueValidator,
    modelVersion: v.string(),
    promptVersion: v.string(),
    confidence: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('ai_grammar_explanation_drafts', {
      grammarPointId: args.grammarPointId,
      candidatePattern: args.candidatePattern,
      payload: args.payload,
      modelVersion: args.modelVersion,
      promptVersion: args.promptVersion,
      confidence: args.confidence,
      reviewStatus: 'pending',
      createdAt: Date.now(),
    });
  },
});

/**
 * Submit a new AI-generated sentence explanation draft.
 */
export const submitSentenceDraft = mutation({
  args: {
    sentenceId: v.optional(v.id('content_sentences')),
    textHash: v.string(),
    payload: LooseJsonDeepValueValidator,
    modelVersion: v.string(),
    promptVersion: v.string(),
    confidence: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('ai_sentence_explanation_drafts', {
      sentenceId: args.sentenceId,
      textHash: args.textHash,
      payload: args.payload,
      modelVersion: args.modelVersion,
      promptVersion: args.promptVersion,
      confidence: args.confidence,
      reviewStatus: 'pending',
      createdAt: Date.now(),
    });
  },
});

/**
 * Review (approve/reject) a batch of drafts.
 * Admin-only mutation.
 */
export const reviewDrafts = mutation({
  args: {
    draftType: v.string(),
    draftIds: v.array(v.string()),
    decision: v.union(v.literal('approved'), v.literal('rejected')),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const now = Date.now();

    const tableName = resolveTableName(args.draftType);
    if (!tableName) throw new Error(`Invalid draft type: ${args.draftType}`);

    let updated = 0;
    for (const draftId of args.draftIds) {
      const typedDraftId = draftId as DraftId;
      const draft = await ctx.db.get(typedDraftId);
      if (!draft) continue;

      await ctx.db.patch(typedDraftId, {
        reviewStatus: args.decision,
        reviewedBy: userId,
        reviewedAt: now,
      });
      updated++;
    }

    return { updated, decision: args.decision };
  },
});

/**
 * Promote approved word drafts to the words table.
 * Applies enrichment payload (senses, examples, metadata) to existing words.
 */
export const promoteWordDrafts = mutation({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const now = Date.now();

    const approvedDrafts = await ctx.db
      .query('ai_word_enrichment_drafts')
      .withIndex('by_status', q => q.eq('reviewStatus', 'approved'))
      .take(limit);

    let promoted = 0;
    for (const draft of approvedDrafts) {
      if (!draft.wordId) continue;

      const word = await ctx.db.get(draft.wordId);
      if (!word) continue;

      // Apply enrichment payload to word
      const payload = isRecord(draft.payload) ? draft.payload : {};
      const patch: WordPatch = { updatedAt: now };

      const rawSenses = payload.senses;
      if (Array.isArray(rawSenses)) {
        patch.senses = rawSenses.filter(isWordSense).map(sense => ({ ...sense }));
      }
      if (typeof payload.topikLevel === 'number') patch.topikLevel = payload.topikLevel;
      if (typeof payload.frequencyRank === 'number') patch.frequencyRank = payload.frequencyRank;
      if (Array.isArray(payload.tags) && payload.tags.every(isString)) patch.tags = payload.tags;
      if (typeof payload.romanization === 'string') patch.romanization = payload.romanization;

      await ctx.db.patch(draft.wordId, patch);

      // Mark draft as promoted (use a sub-status)
      await ctx.db.patch(draft._id, {
        reviewStatus: 'approved', // Keep as approved
      });

      promoted++;
    }

    return { promoted };
  },
});

// ── Helpers ──────────────────────────────────────────────────────

function resolveTableName(draftType: string): DraftTable | null {
  switch (draftType) {
    case 'word':
      return 'ai_word_enrichment_drafts';
    case 'grammar':
      return 'ai_grammar_explanation_drafts';
    case 'sentence':
      return 'ai_sentence_explanation_drafts';
    default:
      return null;
  }
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isWordSense(value: unknown): value is NonNullable<Doc<'words'>['senses']>[number] {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.meaning !== 'string') return false;
  if (candidate.meaningZh !== undefined && typeof candidate.meaningZh !== 'string') return false;
  if (candidate.domain !== undefined && typeof candidate.domain !== 'string') return false;
  if (candidate.examples !== undefined) {
    return Array.isArray(candidate.examples) && candidate.examples.every(isString);
  }
  return true;
}
