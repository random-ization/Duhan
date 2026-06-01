import {
  action,
  mutation,
  query,
  internalMutation,
  internalQuery,
  type QueryCtx,
} from './_generated/server';
import { v } from 'convex/values';
import { api, internal } from './_generated/api';
import { getAuthUserId } from './utils';
import { runChatCompletionWithFallback } from './ai/chatClient';
import { parseJsonObjectFromModelContent, retryAsync } from './aiReliability';
import { aiLogger } from './logger';
import { splitKoreanSentences } from './contentImport/splitter';
import {
  importedContentAnalysisValidator,
  type ImportedContentAnalysis,
} from './contentImport/shared';
import type { Doc, Id } from './_generated/dataModel';
import { createTextHash } from './textHash';

/**
 * P1-2 Text Import Learning (upgraded with Korean-aware sentence splitting)
 */

export type ImportedContentRecord = Doc<'imported_contents'>;
export type ImportedContentSentenceRecord = Doc<'content_sentences'>;
export type ImportedContentListItem = ImportedContentRecord;
export type ImportedContentWithSentences = ImportedContentRecord & {
  sentences: ImportedContentSentenceRecord[];
  savedSentenceIds: string[];
  nextSentenceId?: Id<'content_sentences'>;
};
export type ImportedContentStudyState = {
  contentId: Id<'imported_contents'>;
  title: string;
  sourceType: string;
  sourceUrl?: string;
  sourceHost?: string;
  tags: string[];
  folderName?: string;
  createdAt: number;
  difficultyLevel?: string;
  estimatedMinutes?: number;
  sentenceCount: number;
  savedSentenceCount: number;
  savedWordCount: number;
  savedGrammarCount: number;
  completedSentenceCount: number;
  remainingSentenceCount: number;
  dailySentenceTarget: number;
  estimatedStudyDays: number;
  readingTimeSeconds: number;
  readingCompletedAt?: number;
  nextSentenceId?: Id<'content_sentences'>;
  nextSentenceText?: string;
  progressPercent: number;
};

function getSourceHost(sourceUrl?: string): string | undefined {
  if (!sourceUrl) return undefined;
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

function buildStudyPlanFields(sentenceCount: number, completedSentenceCount: number) {
  const remainingSentenceCount = Math.max(0, sentenceCount - completedSentenceCount);
  const dailySentenceTarget =
    remainingSentenceCount > 0 ? Math.min(5, Math.max(2, remainingSentenceCount)) : 0;
  const estimatedStudyDays =
    dailySentenceTarget > 0 ? Math.ceil(remainingSentenceCount / dailySentenceTarget) : 0;

  return {
    remainingSentenceCount,
    dailySentenceTarget,
    estimatedStudyDays,
  };
}

function normalizeContentTags(tags: string[]): string[] {
  const normalizedTags: string[] = [];
  const seenTags = new Set<string>();

  for (const rawTag of tags) {
    const tag = rawTag.trim().replace(/\s+/g, ' ');
    if (!tag || seenTags.has(tag)) continue;
    normalizedTags.push(tag.slice(0, 24));
    seenTags.add(tag);
    if (normalizedTags.length >= 8) break;
  }

  return normalizedTags;
}

function normalizeContentFolder(folderName: string): string | undefined {
  const normalizedFolderName = folderName.trim().replace(/\s+/g, ' ').slice(0, 32);
  return normalizedFolderName || undefined;
}

export const importTextContent = mutation({
  args: {
    title: v.string(),
    rawText: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const { title, rawText } = args;

    // 1. Create the imported content record
    const contentId = await ctx.db.insert('imported_contents', {
      userId,
      title,
      rawText,
      sourceType: 'USER_PASTE',
      createdAt: Date.now(),
    });

    // 2. Split into sentences using Korean-aware splitter
    const sentences = splitKoreanSentences(rawText);
    const now = Date.now();
    for (let i = 0; i < sentences.length; i++) {
      const text = sentences[i].trim();
      if (!text) continue;
      const textHash = createTextHash(text);
      await ctx.db.insert('content_sentences', {
        contentRefId: contentId,
        contentType: 'IMPORTED',
        sentenceIndex: i + 1,
        text,
        normalizedText: text.replace(/\s+/g, ' ').trim(),
        textHash,
        language: 'ko',
        source: 'user_paste',
        createdAt: now,
        updatedAt: now,
      });
    }

    // 3. Trigger AI analysis in the background
    await ctx.scheduler.runAfter(0, api.importedContent.analyzeImportedContent, {
      contentId,
    });

    return contentId;
  },
});

export const updateContentTags = mutation({
  args: {
    contentId: v.id('imported_contents'),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<string[]> => {
    const userId = await getAuthUserId(ctx);
    const content = await ctx.db.get(args.contentId);
    if (!content || content.userId !== userId) {
      throw new Error('IMPORTED_CONTENT_NOT_FOUND');
    }

    const tags = normalizeContentTags(args.tags);
    await ctx.db.patch(args.contentId, {
      tags,
    });
    return tags;
  },
});

export const updateContentFolder = mutation({
  args: {
    contentId: v.id('imported_contents'),
    folderName: v.string(),
  },
  handler: async (ctx, args): Promise<string | undefined> => {
    const userId = await getAuthUserId(ctx);
    const content = await ctx.db.get(args.contentId);
    if (!content || content.userId !== userId) {
      throw new Error('IMPORTED_CONTENT_NOT_FOUND');
    }

    const folderName = normalizeContentFolder(args.folderName);
    await ctx.db.patch(args.contentId, {
      folderName,
    });
    return folderName;
  },
});

export const analyzeImportedContent = action({
  args: {
    contentId: v.id('imported_contents'),
  },
  handler: async (ctx, args) => {
    const { contentId } = args;

    // 1. Get the content
    const content = await ctx.runQuery(internal.importedContent.getContentInternal, {
      contentId,
    });
    if (!content) return;

    const systemPrompt = `你是一个韩语学习助手。请分析以下导入的内容，并提供摘要、难度评估和预估阅读时间。

输出 JSON 格式：
{
  "summaryZh": "<内容的中文摘要>",
  "difficultyLevel": "TOPIK 1" | "TOPIK 2" | "TOPIK 3" | "TOPIK 4" | "TOPIK 5" | "TOPIK 6",
  "estimatedMinutes": <阅读所需的预估分钟数>,
  "wordCount": <预估单词数>,
  "sentenceCount": <句子数>
}`;

    const userPrompt = `内容标题：${content.title}\n\n内容全文：\n${content.rawText}`;

    try {
      const { completion } = await runChatCompletionWithFallback(
        ({ client, provider: activeProvider }) =>
          retryAsync(
            () =>
              client.chat.completions.create({
                model: activeProvider.model,
                temperature: 0.3,
                response_format: { type: 'json_object' },
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: userPrompt },
                ],
              }),
            { retries: 2, label: 'analyze_imported_content' }
          ),
        { label: 'analyze_imported_content', timeoutMs: 20000 }
      );

      const raw = completion.choices[0]?.message?.content ?? '{}';
      const parsed = parseJsonObjectFromModelContent(raw);

      if (parsed) {
        await ctx.runMutation(internal.importedContent.updateContentAnalysis, {
          contentId,
          analysis: parsed,
        });
      }
    } catch (error) {
      aiLogger.error('Failed to analyze imported content', { error });
    }
  },
});

// Internal helpers
export const getContentInternal = internalQuery({
  args: { contentId: v.id('imported_contents') },
  handler: async (ctx, args) => await ctx.db.get(args.contentId),
});

export const updateContentAnalysis = internalMutation({
  args: {
    contentId: v.id('imported_contents'),
    analysis: importedContentAnalysisValidator,
  },
  handler: async (ctx, args) => {
    const { contentId, analysis } = args;
    const patch: ImportedContentAnalysis = {
      difficultyLevel: analysis.difficultyLevel,
      estimatedMinutes: analysis.estimatedMinutes,
      sentenceCount: analysis.sentenceCount,
      summaryZh: analysis.summaryZh,
      wordCount: analysis.wordCount,
    };
    await ctx.db.patch(contentId, {
      ...patch,
    });
  },
});

// Public queries
export const listImportedContents = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx).catch(() => null);
    if (!userId) return [];

    return await ctx.db
      .query('imported_contents')
      .withIndex('by_user_createdAt', q => q.eq('userId', userId))
      .order('desc')
      .take(args.limit ?? 50);
  },
});

async function buildImportedContentStudyState(
  ctx: QueryCtx,
  userId: Id<'users'>,
  content: ImportedContentRecord
): Promise<ImportedContentStudyState> {
  const sentences = await ctx.db
    .query('content_sentences')
    .withIndex('by_content_ref', q =>
      q.eq('contentType', 'IMPORTED').eq('contentRefId', content._id)
    )
    .collect();
  const sortedSentences = sentences.sort((a, b) => a.sentenceIndex - b.sentenceIndex);
  const sentenceIdSet = new Set(sortedSentences.map(sentence => String(sentence._id)));

  const savedSentences = await ctx.db
    .query('user_saved_sentences')
    .withIndex('by_user_createdAt', q => q.eq('userId', userId))
    .collect();
  const savedSentenceIds = new Set(
    savedSentences
      .filter(item => {
        const sentenceId = item.sentenceId ? String(item.sentenceId) : null;
        const sourceRefId = item.sourceRefId ?? null;
        return (
          (sentenceId !== null && sentenceIdSet.has(sentenceId)) ||
          (sourceRefId !== null && sentenceIdSet.has(sourceRefId))
        );
      })
      .map(item => String(item.sentenceId ?? item.sourceRefId))
  );

  const savedWords = await ctx.db
    .query('user_vocab_progress')
    .withIndex('by_user_source', q => q.eq('userId', userId).eq('source', 'content_import'))
    .collect();
  const savedWordIds = new Set(
    savedWords
      .filter(item => item.sourceRefId !== undefined && sentenceIdSet.has(item.sourceRefId))
      .map(item => String(item.wordId))
  );

  const savedGrammar = await ctx.db
    .query('user_grammar_saved')
    .withIndex('by_user_createdAt', q => q.eq('userId', userId))
    .collect();
  const savedGrammarIds = new Set(
    savedGrammar
      .filter(item => item.sourceRefId !== undefined && sentenceIdSet.has(item.sourceRefId))
      .map(item => String(item._id))
  );

  const sentenceCount = content.sentenceCount ?? sortedSentences.length;
  const savedSentenceCount = savedSentenceIds.size;
  const readingProgress = await ctx.db
    .query('user_reading_progress')
    .withIndex('by_user_content', q =>
      q
        .eq('userId', userId)
        .eq('contentType', 'imported_content')
        .eq('contentId', String(content._id))
    )
    .first();
  const readingCompletedSentenceCount =
    readingProgress?.completedAt !== undefined
      ? sentenceCount
      : Math.min(sentenceCount, readingProgress?.completedSentenceCount ?? 0);
  const completedSentenceCount = Math.max(savedSentenceCount, readingCompletedSentenceCount);
  const studyPlanFields = buildStudyPlanFields(sentenceCount, completedSentenceCount);
  const nextSentence =
    sortedSentences.find(
      sentence =>
        sentence.sentenceIndex > completedSentenceCount &&
        !savedSentenceIds.has(String(sentence._id))
    ) ?? sortedSentences.find(sentence => !savedSentenceIds.has(String(sentence._id)));

  return {
    contentId: content._id,
    title: content.title,
    sourceType: content.sourceType,
    sourceUrl: content.sourceUrl,
    sourceHost: getSourceHost(content.sourceUrl),
    tags: content.tags ?? [],
    folderName: content.folderName,
    createdAt: content.createdAt,
    difficultyLevel: content.difficultyLevel,
    estimatedMinutes: content.estimatedMinutes,
    sentenceCount,
    savedSentenceCount,
    savedWordCount: savedWordIds.size,
    savedGrammarCount: savedGrammarIds.size,
    completedSentenceCount,
    ...studyPlanFields,
    readingTimeSeconds: readingProgress?.readingTimeSeconds ?? 0,
    readingCompletedAt: readingProgress?.completedAt,
    nextSentenceId: nextSentence?._id,
    nextSentenceText: nextSentence?.text,
    progressPercent:
      sentenceCount > 0
        ? Math.min(100, Math.round((completedSentenceCount / sentenceCount) * 100))
        : 0,
  };
}

export const listStudyStates = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args): Promise<ImportedContentStudyState[]> => {
    const userId = await getAuthUserId(ctx).catch(() => null);
    if (!userId) return [];

    const contents = await ctx.db
      .query('imported_contents')
      .withIndex('by_user_createdAt', q => q.eq('userId', userId))
      .order('desc')
      .take(Math.min(args.limit ?? 5, 12));

    const states = await Promise.all(
      contents.map(content => buildImportedContentStudyState(ctx, userId, content))
    );

    return states;
  },
});

export const getImportedContentWithSentences = query({
  args: { contentId: v.id('imported_contents') },
  handler: async (ctx, args): Promise<ImportedContentWithSentences | null> => {
    const userId = await getAuthUserId(ctx).catch(() => null);
    if (!userId) return null;

    const content = await ctx.db.get(args.contentId);
    if (!content || content.userId !== userId) return null;

    const sentences = await ctx.db
      .query('content_sentences')
      .withIndex('by_content_ref', q =>
        q.eq('contentType', 'IMPORTED').eq('contentRefId', args.contentId)
      )
      .collect();
    const sortedSentences = sentences.sort((a, b) => a.sentenceIndex - b.sentenceIndex);
    const sentenceIdSet = new Set(sortedSentences.map(sentence => String(sentence._id)));
    const savedSentences = await ctx.db
      .query('user_saved_sentences')
      .withIndex('by_user_createdAt', q => q.eq('userId', userId))
      .collect();
    const savedSentenceIds = Array.from(
      new Set(
        savedSentences
          .filter(item => {
            const sentenceId = item.sentenceId ? String(item.sentenceId) : null;
            const sourceRefId = item.sourceRefId ?? null;
            return (
              (sentenceId !== null && sentenceIdSet.has(sentenceId)) ||
              (sourceRefId !== null && sentenceIdSet.has(sourceRefId))
            );
          })
          .map(item => String(item.sentenceId ?? item.sourceRefId))
      )
    );
    const nextSentence = sortedSentences.find(
      sentence => !savedSentenceIds.includes(String(sentence._id))
    );

    return {
      ...content,
      sentences: sortedSentences,
      savedSentenceIds,
      nextSentenceId: nextSentence?._id,
    };
  },
});

export const getImportedSentence = query({
  args: { sentenceId: v.id('content_sentences') },
  handler: async (ctx, args): Promise<ImportedContentSentenceRecord | null> => {
    const userId = await getAuthUserId(ctx).catch(() => null);
    if (!userId) return null;

    const sentence = await ctx.db.get(args.sentenceId);
    if (!sentence || sentence.contentType !== 'IMPORTED') return null;

    const content = await ctx.db.get(sentence.contentRefId as Id<'imported_contents'>);
    if (!content || content.userId !== userId) return null;

    return sentence;
  },
});

// Legacy splitter kept for reference — now using splitKoreanSentences from contentImport/splitter.ts
