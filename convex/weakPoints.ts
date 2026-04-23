import { query } from './_generated/server';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { getOptionalAuthUserId } from './utils';

/**
 * Weak-points analytics — read-only queries that surface the user's
 * current trouble spots so the UI can show actionable "focus areas".
 *
 * Both queries are bounded (max 1000 rows scanned) and do not do any
 * writes. They rely on data already produced by FSRS (lapses) and the
 * grammar-progress table (proficiency) — no schema changes needed.
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

    const results: WeakGrammarPattern[] = [];
    for (const row of weakRows) {
      const point = await ctx.db.get(row.grammarId);
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

    for (const row of topLaspy) {
      const word = await ctx.db.get(row.wordId);
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
