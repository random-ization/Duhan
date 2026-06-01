import { query } from './_generated/server';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { getOptionalAuthUserId } from './utils';
import { KAGAS_ERROR_TYPES, type KagasErrorType } from './topikWritingValidators';

/**
 * Weak-points analytics — read-only queries that surface the user's
 * current trouble spots so the UI can show actionable "focus areas".
 *
 * Queries are bounded (max 1000 rows scanned) and do not do any writes.
 * Data sources:
 * - FSRS lapses (user_vocab_progress)
 * - Grammar proficiency (user_grammar_progress)
 * - Writing errors with KAGAS classification (user_mistakes)
 */

export type WeakGrammarPattern = {
  grammarId: Id<'grammar_points'>;
  title: string;
  proficiency: number; // 0-100
  lastStudiedAt: number;
  level?: string;
};

export type WeakVocabCategory = {
  /** Part-of-speech bucket label, e.g. "형용사". Empty string when unknown. */
  partOfSpeech: string;
  totalLapses: number;
  wordCount: number;
  /** Up to 3 concrete sample words users struggled with most. */
  samples: Array<{
    wordId: Id<'words'>;
    word: string;
    meaning: string;
    lapses: number;
  }>;
};

const MAX_GRAMMAR_SCAN = 1000;
const MAX_VOCAB_SCAN = 1000;
const WEAK_GRAMMAR_PROFICIENCY_CEILING = 60;
const MIN_LAPSES_TO_COUNT = 1;

function localizedGrammarTitle(
  point: {
    title: string;
    titleEn?: string;
    titleZh?: string;
    titleVi?: string;
    titleMn?: string;
  },
  language: string
): string {
  if (language.startsWith('zh')) return point.titleZh || point.title;
  if (language.startsWith('vi')) return point.titleVi || point.titleEn || point.title;
  if (language.startsWith('mn')) return point.titleMn || point.titleEn || point.title;
  return point.titleEn || point.title;
}

function localizedMeaning(
  word: {
    meaning: string;
    meaningEn?: string;
    meaningVi?: string;
    meaningMn?: string;
  },
  language: string
): string {
  if (language.startsWith('zh')) return word.meaning;
  if (language.startsWith('vi')) return word.meaningVi || word.meaningEn || word.meaning;
  if (language.startsWith('mn')) return word.meaningMn || word.meaningEn || word.meaning;
  return word.meaningEn || word.meaning;
}

export const getWeakGrammarPatterns = query({
  args: {
    limit: v.optional(v.number()),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<WeakGrammarPattern[]> => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return [];

    const limit = Math.max(1, Math.min(args.limit ?? 3, 10));
    const language = args.language ?? 'en';

    const progress = await ctx.db
      .query('user_grammar_progress')
      .withIndex('by_user_grammar', q => q.eq('userId', userId))
      .take(MAX_GRAMMAR_SCAN);

    const weakRows = progress
      .filter(
        row =>
          row.status !== 'NOT_STARTED' &&
          typeof row.proficiency === 'number' &&
          row.proficiency < WEAK_GRAMMAR_PROFICIENCY_CEILING
      )
      .sort((a, b) => (a.proficiency ?? 0) - (b.proficiency ?? 0))
      .slice(0, limit);

    // Parallel batch — was sequential `await` in a loop, which serialised every db.get.
    const points = await Promise.all(weakRows.map(row => ctx.db.get(row.grammarId)));
    const results: WeakGrammarPattern[] = [];
    for (let i = 0; i < weakRows.length; i++) {
      const row = weakRows[i];
      const point = points[i];
      if (!point) continue;
      results.push({
        grammarId: row.grammarId,
        title: localizedGrammarTitle(point, language),
        proficiency: row.proficiency ?? 0,
        lastStudiedAt: row.lastStudiedAt,
        level: point.level,
      });
    }
    return results;
  },
});

export const getWeakVocabCategories = query({
  args: {
    limit: v.optional(v.number()),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<WeakVocabCategory[]> => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return [];

    const limit = Math.max(1, Math.min(args.limit ?? 3, 10));
    const language = args.language ?? 'en';

    const progress = await ctx.db
      .query('user_vocab_progress')
      .withIndex('by_user', q => q.eq('userId', userId))
      .take(MAX_VOCAB_SCAN);

    const laspyRows = progress.filter(
      row => typeof row.lapses === 'number' && row.lapses >= MIN_LAPSES_TO_COUNT
    );

    // Bucket by part-of-speech; keep a top-3 sample list per bucket.
    type Bucket = {
      partOfSpeech: string;
      totalLapses: number;
      wordCount: number;
      samples: WeakVocabCategory['samples'];
    };
    const buckets = new Map<string, Bucket>();

    // Bounded: cap to 300 rows to resolve words for POS — users with
    // thousands of lapses still get a fair picture from the worst 300.
    const topLaspy = laspyRows.sort((a, b) => (b.lapses ?? 0) - (a.lapses ?? 0)).slice(0, 300);

    // Parallel batch — was sequential `await` in a loop, which made this query
    // serially block on 300 db.get calls during onboarding / daily task generation.
    const words = await Promise.all(topLaspy.map(row => ctx.db.get(row.wordId)));

    for (let i = 0; i < topLaspy.length; i++) {
      const row = topLaspy[i];
      const word = words[i];
      if (!word) continue;
      const pos = (word.partOfSpeech || '').trim() || 'other';
      const lapses = row.lapses ?? 0;
      const bucket: Bucket = buckets.get(pos) ?? {
        partOfSpeech: pos,
        totalLapses: 0,
        wordCount: 0,
        samples: [],
      };
      bucket.totalLapses += lapses;
      bucket.wordCount += 1;
      if (bucket.samples.length < 3) {
        bucket.samples.push({
          wordId: row.wordId,
          word: word.word,
          meaning: localizedMeaning(word, language),
          lapses,
        });
      }
      buckets.set(pos, bucket);
    }

    return Array.from(buckets.values())
      .sort((a, b) => b.totalLapses - a.totalLapses)
      .slice(0, limit);
  },
});

// ── Writing Error Analysis (KAGAS) ──────────────────────────────────────────

export type WritingErrorSummary = {
  /** KAGAS type key, e.g. "JOSA_ERR" */
  kagasType: string;
  /** Korean label */
  labelKo: string;
  /** Chinese label */
  labelZh: string;
  /** Legacy parent category */
  legacyCategory: string;
  /** Number of occurrences */
  count: number;
  /** Number of HIGH severity errors */
  highSeverityCount: number;
  /** Recent example (most recent error of this type) */
  recentExample?: {
    originalText: string;
    correctedText: string;
    explanationZh: string;
  };
};

export type CrossDimensionWeakPoint = {
  dimension: 'vocab' | 'grammar' | 'writing';
  label: string;
  severity: number; // 0-100 composite score (higher = weaker)
  details: string;
};

const MAX_MISTAKES_SCAN = 500;

/**
 * Get writing errors aggregated by KAGAS error type.
 * Returns error types sorted by frequency, with recent examples.
 */
export const getWritingErrorsByKagas = query({
  args: {
    limit: v.optional(v.number()),
    daysBack: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<WritingErrorSummary[]> => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return [];

    const limit = Math.max(1, Math.min(args.limit ?? 10, 14));
    const daysBack = args.daysBack ?? 30;
    const cutoff = Date.now() - daysBack * 24 * 60 * 60 * 1000;

    // Use the index range directly — the previous `.filter(q.gte(...))` after
    // `.withIndex(...).eq(userId)` forced Convex to scan every user_mistakes row
    // for this user before filtering by date.
    const mistakes = await ctx.db
      .query('user_mistakes')
      .withIndex('by_user_createdAt', q => q.eq('userId', userId).gte('createdAt', cutoff))
      .take(MAX_MISTAKES_SCAN);

    // Aggregate by KAGAS type (or fall back to legacy errorType)
    const buckets = new Map<
      string,
      {
        count: number;
        highCount: number;
        recentExample?: {
          originalText: string;
          correctedText: string;
          explanationZh: string;
        };
      }
    >();

    for (const m of mistakes) {
      const kagasType = m.errorTypeKagas || m.errorType;
      const bucket = buckets.get(kagasType) || { count: 0, highCount: 0 };
      bucket.count += 1;
      if (m.severity === 'HIGH') bucket.highCount += 1;
      // Keep the most recent example
      if (!bucket.recentExample) {
        bucket.recentExample = {
          originalText: m.originalText,
          correctedText: m.correctedText,
          explanationZh: m.explanationZh,
        };
      }
      buckets.set(kagasType, bucket);
    }

    const results: WritingErrorSummary[] = [];
    for (const [type, bucket] of buckets) {
      const kagasInfo = KAGAS_ERROR_TYPES[type as KagasErrorType];
      results.push({
        kagasType: type,
        labelKo: kagasInfo?.ko || type,
        labelZh: kagasInfo?.zh || type,
        legacyCategory: kagasInfo?.category || type,
        count: bucket.count,
        highSeverityCount: bucket.highCount,
        recentExample: bucket.recentExample,
      });
    }

    return results.sort((a, b) => b.count - a.count).slice(0, limit);
  },
});

/**
 * Cross-dimensional weak point summary.
 * Combines vocab lapses, grammar proficiency, and writing errors
 * into a unified ranking of the user's weakest areas.
 */
export const getCrossDimensionWeakPoints = query({
  args: {
    language: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<CrossDimensionWeakPoint[]> => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return [];

    const language = args.language ?? 'zh';
    const points: CrossDimensionWeakPoint[] = [];

    // 1. Vocab dimension: aggregate lapses
    const vocabProgress = await ctx.db
      .query('user_vocab_progress')
      .withIndex('by_user', q => q.eq('userId', userId))
      .take(500);

    const totalLapses = vocabProgress.reduce((sum, row) => sum + (row.lapses ?? 0), 0);
    const lapsyWords = vocabProgress.filter(r => (r.lapses ?? 0) >= 2).length;
    if (totalLapses > 0) {
      points.push({
        dimension: 'vocab',
        label: language.startsWith('zh') ? '词汇遗忘' : 'Vocabulary Lapses',
        severity: Math.min(100, Math.round((totalLapses / Math.max(vocabProgress.length, 1)) * 50)),
        details: language.startsWith('zh')
          ? `${lapsyWords} 个单词反复遗忘，共 ${totalLapses} 次`
          : `${lapsyWords} words with repeated lapses, ${totalLapses} total`,
      });
    }

    // 2. Grammar dimension: low proficiency
    const grammarProgress = await ctx.db
      .query('user_grammar_progress')
      .withIndex('by_user_grammar', q => q.eq('userId', userId))
      .take(500);

    const weakGrammar = grammarProgress.filter(
      r => r.status !== 'NOT_STARTED' && (r.proficiency ?? 0) < WEAK_GRAMMAR_PROFICIENCY_CEILING
    );
    if (weakGrammar.length > 0) {
      const avgProf =
        weakGrammar.reduce((s, r) => s + (r.proficiency ?? 0), 0) / weakGrammar.length;
      points.push({
        dimension: 'grammar',
        label: language.startsWith('zh') ? '语法薄弱' : 'Grammar Weakness',
        severity: Math.min(100, Math.round(100 - avgProf)),
        details: language.startsWith('zh')
          ? `${weakGrammar.length} 个语法点熟练度低于 ${WEAK_GRAMMAR_PROFICIENCY_CEILING}%`
          : `${weakGrammar.length} grammar points below ${WEAK_GRAMMAR_PROFICIENCY_CEILING}% proficiency`,
      });
    }

    // 3. Writing dimension: recent errors
    const recentMistakes = await ctx.db
      .query('user_mistakes')
      .withIndex('by_user_createdAt', q => q.eq('userId', userId))
      .order('desc')
      .take(100);

    const highSeverity = recentMistakes.filter(m => m.severity === 'HIGH').length;
    if (recentMistakes.length > 0) {
      points.push({
        dimension: 'writing',
        label: language.startsWith('zh') ? '写作错误' : 'Writing Errors',
        severity: Math.min(
          100,
          Math.round(
            (highSeverity / Math.max(recentMistakes.length, 1)) * 100 + recentMistakes.length
          )
        ),
        details: language.startsWith('zh')
          ? `近期 ${recentMistakes.length} 个错误，其中 ${highSeverity} 个严重`
          : `${recentMistakes.length} recent errors, ${highSeverity} high severity`,
      });
    }

    return points.sort((a, b) => b.severity - a.severity);
  },
});
