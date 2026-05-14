import { internalMutation, mutation } from '../_generated/server';
import type { MutationCtx } from '../_generated/server';
import { ConvexError, v } from 'convex/values';
import type { Id } from '../_generated/dataModel';
import { getAuthUserId } from '../utils';
import {
  SENTENCE_EXPLAINER_SOURCE,
  normalizeSentenceText,
  normalizeSentenceLanguage,
  pruneExplanationPayload,
  resolveLocalizedMeaning,
} from './shared';

const SentenceTokenValidator = v.object({
  surface: v.string(),
  lemma: v.optional(v.string()),
  partOfSpeech: v.optional(v.string()),
  start: v.optional(v.number()),
  end: v.optional(v.number()),
  length: v.optional(v.number()),
  wordPosition: v.optional(v.number()),
  sentencePosition: v.optional(v.number()),
});

const SentenceVocabularyItemValidator = v.object({
  surface: v.string(),
  lemma: v.optional(v.string()),
  partOfSpeech: v.optional(v.string()),
  meaning: v.optional(v.string()),
  difficultyLevel: v.optional(v.string()),
  difficultyScore: v.optional(v.number()),
});

const SentenceGrammarItemValidator = v.object({
  pattern: v.string(),
  explanation: v.optional(v.string()),
  reason: v.optional(v.string()),
  start: v.optional(v.number()),
  end: v.optional(v.number()),
});

const SentenceExplanationPayloadValidator = v.object({
  sentence: v.string(),
  normalizedText: v.optional(v.string()),
  summary: v.optional(v.string()),
  overallMeaning: v.optional(v.string()),
  naturalTranslation: v.optional(v.string()),
  tokens: v.optional(v.array(SentenceTokenValidator)),
  vocabulary: v.optional(v.array(SentenceVocabularyItemValidator)),
  grammar: v.optional(v.array(SentenceGrammarItemValidator)),
  notes: v.optional(v.array(v.string())),
});

function resolveSource(value?: string): string {
  const trimmed = value?.trim();
  return trimmed || SENTENCE_EXPLAINER_SOURCE;
}

function resolveMeaningFields(meaning: string, language: 'zh' | 'en' | 'vi' | 'mn') {
  return {
    meaning: language === 'zh' ? meaning : '',
    meaningEn: language === 'en' ? meaning : undefined,
    meaningVi: language === 'vi' ? meaning : undefined,
    meaningMn: language === 'mn' ? meaning : undefined,
  };
}

async function ensureWord(
  ctx: MutationCtx,
  wordLike: {
    surface: string;
    lemma?: string;
    partOfSpeech?: string;
    meaning?: string;
  },
  targetLanguage: 'zh' | 'en' | 'vi' | 'mn',
  source: string,
  sourceRefId?: string
): Promise<Id<'words'>> {
  const lookupCandidates = [wordLike.lemma, wordLike.surface]
    .map(value => value?.trim())
    .filter((value): value is string => Boolean(value));

  for (const candidate of lookupCandidates) {
    const byLemma = await ctx.db
      .query('words')
      .withIndex('by_lemma', q => q.eq('lemma', candidate))
      .first();
    if (byLemma) return byLemma._id;

    const byWord = await ctx.db
      .query('words')
      .withIndex('by_word', q => q.eq('word', candidate))
      .first();
    if (byWord) return byWord._id;
  }

  const normalizedSurface = normalizeSentenceText(wordLike.surface);
  const meaning = wordLike.meaning?.trim() || normalizedSurface;
  const localizedFields = resolveMeaningFields(meaning, targetLanguage);
  return ctx.db.insert('words', {
    word: normalizedSurface,
    lemma: wordLike.lemma?.trim() || normalizedSurface,
    normalized: normalizedSurface.toLowerCase(),
    meaning: localizedFields.meaning || meaning,
    meaningEn: localizedFields.meaningEn,
    meaningVi: localizedFields.meaningVi,
    meaningMn: localizedFields.meaningMn,
    partOfSpeech: wordLike.partOfSpeech?.trim() || 'unknown',
    source,
    sourceRefId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}

async function upsertVocabProgress(
  ctx: MutationCtx,
  args: {
    userId: Id<'users'>;
    wordId: Id<'words'>;
    source: string;
    sourceRefId?: string;
  }
) {
  const now = Date.now();
  const existing = await ctx.db
    .query('user_vocab_progress')
    .withIndex('by_user_word', q => q.eq('userId', args.userId).eq('wordId', args.wordId))
    .first();

  const patch = {
    savedByUser: true,
    source: args.source,
    sourceRefId: args.sourceRefId,
    updatedAt: now,
  };

  if (existing) {
    await ctx.db.patch(existing._id, patch);
    return existing._id;
  }

  return ctx.db.insert('user_vocab_progress', {
    userId: args.userId,
    wordId: args.wordId,
    status: 'NEW',
    state: 0,
    due: now,
    nextReviewAt: now,
    lastReviewedAt: now,
    last_review: now,
    savedByUser: true,
    source: args.source,
    sourceRefId: args.sourceRefId,
    createdAt: now,
    updatedAt: now,
  });
}

async function createSentenceAssetPage(
  ctx: MutationCtx,
  args: {
    userId: Id<'users'>;
    title: string;
    payload: {
      sentence: string;
      naturalTranslation?: string;
      summary?: string;
      vocabulary?: Array<{ surface: string; meaning?: string }>;
      grammar?: Array<{ pattern: string; explanation?: string }>;
    };
    explanationId: Id<'sentence_explanations'>;
    source: string;
    sourceRefId?: string;
  }
) {
  const now = Date.now();
  const pageId = await ctx.db.insert('note_pages', {
    userId: args.userId,
    title: args.title,
    tags: ['sentence-explainer', 'learning-asset'],
    previewText: args.payload.summary || args.payload.naturalTranslation || args.payload.sentence,
    sourceModule: args.source,
    metadata: {
      kind: 'sentence_explainer_asset',
      notebookKey: 'learning_assets',
      explanationId: String(args.explanationId),
      sourceRefId: args.sourceRefId || null,
    },
    createdAt: now,
    updatedAt: now,
  });

  const blocks = [
    {
      blockKey: 'sentence',
      blockType: 'paragraph',
      content: args.payload.sentence,
      sortOrder: 0,
    },
    {
      blockKey: 'translation',
      blockType: 'paragraph',
      content: args.payload.naturalTranslation || '',
      sortOrder: 1,
    },
    {
      blockKey: 'summary',
      blockType: 'paragraph',
      content: args.payload.summary || '',
      sortOrder: 2,
    },
    {
      blockKey: 'vocabulary',
      blockType: 'bullet_list',
      content: (args.payload.vocabulary || []).map(
        item => `${item.surface} - ${item.meaning || ''}`
      ),
      sortOrder: 3,
    },
    {
      blockKey: 'grammar',
      blockType: 'bullet_list',
      content: (args.payload.grammar || []).map(
        item => `${item.pattern} - ${item.explanation || ''}`
      ),
      sortOrder: 4,
    },
  ].filter(block => {
    if (typeof block.content === 'string') return block.content.trim().length > 0;
    return Array.isArray(block.content) ? block.content.length > 0 : true;
  });

  for (const block of blocks) {
    await ctx.db.insert('note_blocks', {
      userId: args.userId,
      pageId,
      blockKey: block.blockKey,
      blockType: block.blockType,
      content: block.content,
      sortOrder: block.sortOrder,
      createdAt: now,
      updatedAt: now,
    });
  }

  return pageId;
}

export const upsertExplanationRecord = internalMutation({
  args: {
    sentenceId: v.optional(v.id('content_sentences')),
    userId: v.optional(v.id('users')),
    textHash: v.string(),
    sentence: v.string(),
    targetLanguage: v.string(),
    explanationVersion: v.optional(v.string()),
    provider: v.optional(v.string()),
    model: v.optional(v.string()),
    cacheKey: v.optional(v.string()),
    payload: SentenceExplanationPayloadValidator,
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const payload = pruneExplanationPayload(args.payload);
    const existing = await ctx.db
      .query('sentence_explanations')
      .withIndex('by_text_hash_language', q =>
        q.eq('textHash', args.textHash).eq('targetLanguage', args.targetLanguage)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        sentenceId: args.sentenceId ?? existing.sentenceId,
        userId: existing.userId ?? args.userId,
        sentence: args.sentence,
        explanationVersion: args.explanationVersion,
        provider: args.provider,
        model: args.model,
        cacheKey: args.cacheKey,
        payload,
        updatedAt: now,
      });
      return existing._id;
    }

    return ctx.db.insert('sentence_explanations', {
      sentenceId: args.sentenceId,
      userId: args.userId,
      textHash: args.textHash,
      sentence: args.sentence,
      targetLanguage: args.targetLanguage,
      explanationVersion: args.explanationVersion,
      provider: args.provider,
      model: args.model,
      cacheKey: args.cacheKey,
      payload,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const saveAssets = mutation({
  args: {
    explanationId: v.id('sentence_explanations'),
    saveSentence: v.optional(v.boolean()),
    selectedWords: v.optional(v.array(SentenceVocabularyItemValidator)),
    selectedGrammar: v.optional(v.array(SentenceGrammarItemValidator)),
    createNotePage: v.optional(v.boolean()),
    enqueueForReview: v.optional(v.boolean()),
    noteTitle: v.optional(v.string()),
    source: v.optional(v.string()),
    sourceRefId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const explanation = await ctx.db.get(args.explanationId);
    if (!explanation) {
      throw new ConvexError('SENTENCE_EXPLANATION_NOT_FOUND');
    }

    const source = resolveSource(args.source);
    const sourceRefId = args.sourceRefId?.trim() || String(args.explanationId);
    const targetLanguage = normalizeSentenceLanguage(explanation.targetLanguage);
    const payload = pruneExplanationPayload(explanation.payload);
    const now = Date.now();
    const selectedWords = args.selectedWords?.length
      ? args.selectedWords
      : payload.vocabulary || [];
    const selectedGrammar = args.selectedGrammar?.length
      ? args.selectedGrammar
      : payload.grammar || [];

    let notePageId: Id<'note_pages'> | undefined;
    if (args.createNotePage) {
      notePageId = await createSentenceAssetPage(ctx, {
        userId,
        title: args.noteTitle?.trim() || payload.sentence.slice(0, 48),
        payload: {
          sentence: payload.sentence,
          naturalTranslation: payload.naturalTranslation,
          summary: payload.summary,
          vocabulary: selectedWords.map(item => ({
            surface: item.surface,
            meaning: item.meaning,
          })),
          grammar: selectedGrammar.map(item => ({
            pattern: item.pattern,
            explanation: item.explanation,
          })),
        },
        explanationId: args.explanationId,
        source,
        sourceRefId,
      });
    }

    let savedSentenceId: Id<'user_saved_sentences'> | undefined;
    if (args.saveSentence !== false) {
      let existingSentence = null;
      if (explanation.sentenceId) {
        existingSentence = await ctx.db
          .query('user_saved_sentences')
          .withIndex('by_user_sentence', q =>
            q.eq('userId', userId).eq('sentenceId', explanation.sentenceId!)
          )
          .first();
      } else {
        existingSentence = await ctx.db
          .query('user_saved_sentences')
          .withIndex('by_user_source_ref', q =>
            q.eq('userId', userId).eq('source', source).eq('sourceRefId', sourceRefId)
          )
          .first();
      }

      if (existingSentence) {
        await ctx.db.patch(existingSentence._id, {
          explanationId: args.explanationId,
          text: payload.sentence,
          normalizedText: payload.normalizedText,
          translation: payload.naturalTranslation,
          notePageId: notePageId ?? existingSentence.notePageId,
          updatedAt: now,
        });
        savedSentenceId = existingSentence._id;
      } else {
        savedSentenceId = await ctx.db.insert('user_saved_sentences', {
          userId,
          sentenceId: explanation.sentenceId,
          explanationId: args.explanationId,
          text: payload.sentence,
          normalizedText: payload.normalizedText,
          translation: payload.naturalTranslation,
          notePageId,
          source,
          sourceRefId,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    const savedWordIds: Array<Id<'words'>> = [];
    for (const item of selectedWords) {
      const wordId = await ensureWord(
        ctx,
        {
          surface: item.surface,
          lemma: item.lemma,
          partOfSpeech: item.partOfSpeech,
          meaning: item.meaning,
        },
        targetLanguage,
        source,
        sourceRefId
      );
      await upsertVocabProgress(ctx, {
        userId,
        wordId,
        source,
        sourceRefId,
      });
      savedWordIds.push(wordId);
    }

    const savedGrammarIds: Array<Id<'user_grammar_saved'>> = [];
    for (const item of selectedGrammar) {
      const grammarKey = normalizeSentenceText(item.pattern);
      const existingGrammar = await ctx.db
        .query('user_grammar_saved')
        .withIndex('by_user_grammar_key', q => q.eq('userId', userId).eq('grammarKey', grammarKey))
        .first();

      if (existingGrammar) {
        await ctx.db.patch(existingGrammar._id, {
          explanationId: args.explanationId,
          sentenceId: explanation.sentenceId,
          explanation: item.explanation,
          notePageId: notePageId ?? existingGrammar.notePageId,
          updatedAt: now,
        });
        savedGrammarIds.push(existingGrammar._id);
        continue;
      }

      const linkedGrammar = await ctx.db
        .query('grammar_points')
        .withIndex('by_searchKey', q => q.eq('searchKey', grammarKey))
        .first()
        .catch(() => null);

      const grammarSavedId = await ctx.db.insert('user_grammar_saved', {
        userId,
        grammarId: linkedGrammar?._id,
        sentenceId: explanation.sentenceId,
        explanationId: args.explanationId,
        grammarKey,
        pattern: item.pattern,
        explanation: item.explanation || item.reason,
        notePageId,
        source,
        sourceRefId,
        createdAt: now,
        updatedAt: now,
      });
      savedGrammarIds.push(grammarSavedId);
    }

    if (notePageId && args.enqueueForReview !== false) {
      const existingQueue = await ctx.db
        .query('note_review_queue')
        .withIndex('by_user_page', q => q.eq('userId', userId).eq('pageId', notePageId!))
        .first();
      if (existingQueue) {
        await ctx.db.patch(existingQueue._id, {
          status: 'queued',
          scheduledFor: now,
          updatedAt: now,
          sourceRef: {
            explanationId: String(args.explanationId),
            sentenceId: explanation.sentenceId ? String(explanation.sentenceId) : null,
            source,
          },
        });
      } else {
        await ctx.db.insert('note_review_queue', {
          userId,
          pageId: notePageId,
          status: 'queued',
          scheduledFor: now,
          sourceRef: {
            explanationId: String(args.explanationId),
            sentenceId: explanation.sentenceId ? String(explanation.sentenceId) : null,
            source,
          },
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    const recentWords = await Promise.all(
      savedWordIds.slice(0, 5).map(async wordId => {
        const word = await ctx.db.get(wordId);
        if (!word) return null;
        return {
          id: word._id,
          word: word.word,
          meaning: resolveLocalizedMeaning(word, targetLanguage),
        };
      })
    );

    return {
      success: true,
      source,
      savedSentenceId,
      notePageId,
      savedWordCount: savedWordIds.length,
      savedGrammarCount: savedGrammarIds.length,
      recentWords: recentWords.filter((word): word is NonNullable<typeof word> => word !== null),
    };
  },
});
