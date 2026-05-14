import { query } from '../_generated/server';
import { v } from 'convex/values';
import { getOptionalAuthUserId } from '../utils';
import { normalizeSentenceLanguage } from './shared';

export const getLatest = query({
  args: {
    sentenceId: v.optional(v.id('content_sentences')),
    textHash: v.optional(v.string()),
    targetLanguage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const targetLanguage = normalizeSentenceLanguage(args.targetLanguage);

    if (args.sentenceId) {
      const bySentence = await ctx.db
        .query('sentence_explanations')
        .withIndex('by_sentence_language', q =>
          q.eq('sentenceId', args.sentenceId!).eq('targetLanguage', targetLanguage)
        )
        .first();
      if (bySentence) return bySentence;
    }

    if (!args.textHash) return null;

    return ctx.db
      .query('sentence_explanations')
      .withIndex('by_text_hash_language', q =>
        q.eq('textHash', args.textHash!).eq('targetLanguage', targetLanguage)
      )
      .first();
  },
});

export const getSavedState = query({
  args: {
    explanationId: v.id('sentence_explanations'),
  },
  handler: async (ctx, args) => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) {
      return {
        hasSavedSentence: false,
        savedGrammarCount: 0,
        savedWordCount: 0,
        notePageId: null,
      };
    }

    const explanation = await ctx.db.get(args.explanationId);
    if (!explanation) {
      return {
        hasSavedSentence: false,
        savedGrammarCount: 0,
        savedWordCount: 0,
        notePageId: null,
      };
    }

    const savedSentence = await ctx.db
      .query('user_saved_sentences')
      .withIndex('by_user_sentence', q =>
        q.eq('userId', userId).eq('sentenceId', explanation.sentenceId ?? undefined)
      )
      .first()
      .catch(() => null);

    const savedGrammar = await ctx.db
      .query('user_grammar_saved')
      .withIndex('by_user_sentence', q =>
        q.eq('userId', userId).eq('sentenceId', explanation.sentenceId ?? undefined)
      )
      .collect()
      .catch(() => []);

    const savedWordCount = explanation.payload.vocabulary?.length
      ? (
          await Promise.all(
            explanation.payload.vocabulary.map(async item => {
              const candidate = item.lemma?.trim() || item.surface.trim();
              if (!candidate) return 0;
              const word = await ctx.db
                .query('words')
                .withIndex('by_word', q => q.eq('word', candidate))
                .first();
              if (!word) return 0;
              const progress = await ctx.db
                .query('user_vocab_progress')
                .withIndex('by_user_word', q => q.eq('userId', userId).eq('wordId', word._id))
                .first();
              return progress?.savedByUser ? 1 : 0;
            })
          )
        ).reduce<number>((sum, count) => sum + count, 0)
      : 0;

    return {
      hasSavedSentence: Boolean(savedSentence),
      savedGrammarCount: savedGrammar.length,
      savedWordCount,
      notePageId: savedSentence?.notePageId || null,
    };
  },
});
