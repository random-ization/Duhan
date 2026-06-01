/**
 * Content Import Module (P1-A)
 *
 * Supports:
 * - Text paste import (existing)
 * - URL import (new: fetches and extracts text from web pages)
 * - Korean-aware sentence splitting via dedicated splitter
 * - Kiwi-based difficulty estimation (replaces AI-only approach)
 * - Async AI analysis for summary generation
 *
 * Re-exports all public queries from the original importedContent.ts
 * to maintain backward compatibility.
 */

import { action, internalMutation, internalQuery } from '../_generated/server';
import { makeFunctionReference } from 'convex/server';
import type { FunctionReference } from 'convex/server';
import { ConvexError, v } from 'convex/values';
import type { Id } from '../_generated/dataModel';
import { getAuthUserId } from '@convex-dev/auth/server';
import { runChatCompletionWithFallback } from '../ai/chatClient';
import { parseJsonObjectFromModelContent, retryAsync } from '../aiReliability';
import { aiLogger } from '../logger';
import { splitKoreanSentences } from './splitter';
import {
  importedContentAnalysisValidator,
  type ImportedContentAnalysis,
  type ImportedContentUrlImportResult,
} from './shared';
import { createTextHash } from '../textHash';
import type { DifficultyEstimate } from './difficulty';

const getContentInternalQuery = makeFunctionReference<
  'query',
  { contentId: Id<'imported_contents'> },
  {
    _id: Id<'imported_contents'>;
    title: string;
    rawText: string;
    difficultyLevel?: string;
    estimatedMinutes?: number;
    wordCount?: number;
    sentenceCount?: number;
  } | null
>('contentImport:getContentInternal') as unknown as FunctionReference<
  'query',
  'internal',
  { contentId: Id<'imported_contents'> },
  {
    _id: Id<'imported_contents'>;
    title: string;
    rawText: string;
    difficultyLevel?: string;
    estimatedMinutes?: number;
    wordCount?: number;
    sentenceCount?: number;
  } | null
>;

const createContentRecordMutation = makeFunctionReference<
  'mutation',
  {
    userId: Id<'users'>;
    title: string;
    rawText: string;
    sourceType: string;
    sourceUrl?: string;
    sentenceCount?: number;
  },
  Id<'imported_contents'>
>('contentImport:createContentRecord') as unknown as FunctionReference<
  'mutation',
  'internal',
  {
    userId: Id<'users'>;
    title: string;
    rawText: string;
    sourceType: string;
    sourceUrl?: string;
    sentenceCount?: number;
  },
  Id<'imported_contents'>
>;

const insertSentencesBatchMutation = makeFunctionReference<
  'mutation',
  {
    contentId: Id<'imported_contents'>;
    contentType: string;
    sentences: Array<{ text: string; index: number }>;
    source?: string;
    sourceRefId?: string;
  },
  { inserted: number }
>('contentImport:insertSentencesBatch') as unknown as FunctionReference<
  'mutation',
  'internal',
  {
    contentId: Id<'imported_contents'>;
    contentType: string;
    sentences: Array<{ text: string; index: number }>;
    source?: string;
    sourceRefId?: string;
  },
  { inserted: number }
>;

const updateContentAnalysisMutation = makeFunctionReference<
  'mutation',
  {
    contentId: Id<'imported_contents'>;
    analysis: ImportedContentAnalysis;
  },
  void
>('contentImport:updateContentAnalysis') as unknown as FunctionReference<
  'mutation',
  'internal',
  {
    contentId: Id<'imported_contents'>;
    analysis: ImportedContentAnalysis;
  },
  void
>;

const estimateDifficultyFromTextAction = makeFunctionReference<
  'action',
  { text: string; sentenceCount: number },
  DifficultyEstimate
>('contentImport/difficulty:estimateDifficultyFromText') as unknown as FunctionReference<
  'action',
  'internal',
  { text: string; sentenceCount: number },
  DifficultyEstimate
>;

const analyzeImportedContentV2Action = makeFunctionReference<
  'action',
  { contentId: Id<'imported_contents'> },
  void
>('contentImport:analyzeImportedContentV2');

// ── Internal helpers ────────────────────────────────────────────────────────

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

export const insertSentencesBatch = internalMutation({
  args: {
    contentId: v.id('imported_contents'),
    contentType: v.string(),
    sentences: v.array(
      v.object({
        text: v.string(),
        index: v.number(),
      })
    ),
    source: v.optional(v.string()),
    sourceRefId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const s of args.sentences) {
      const textHash = createTextHash(s.text);
      await ctx.db.insert('content_sentences', {
        contentRefId: args.contentId,
        contentType: args.contentType,
        sentenceIndex: s.index,
        text: s.text,
        normalizedText: s.text.replace(/\s+/g, ' ').trim(),
        textHash,
        language: 'ko',
        source: args.source,
        sourceRefId: args.sourceRefId,
        createdAt: now,
        updatedAt: now,
      });
    }
    return { inserted: args.sentences.length };
  },
});

// ── URL Content Extraction ──────────────────────────────────────────────────

/**
 * Fetch and extract readable text from a URL.
 * Uses a simple HTML tag stripping approach.
 */
async function fetchUrlContent(url: string): Promise<{ title: string; text: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Hangyeol-ContentImport/1.0',
        Accept: 'text/html,application/xhtml+xml,text/plain',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    const rawText = await response.text();

    // Plain text — return as-is
    if (contentType.includes('text/plain')) {
      return { title: new URL(url).hostname, text: rawText };
    }

    // HTML — extract readable content
    return extractFromHtml(rawText, url);
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Simple HTML text extraction.
 * Strips tags and extracts title + body text.
 */
function extractFromHtml(html: string, url: string): { title: string; text: string } {
  // Extract <title>
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/&[^;]+;/g, ' ').trim() : new URL(url).hostname;

  // Remove script, style, nav, header, footer
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '');

  // Convert <br>, <p>, <div>, <li> to newlines
  cleaned = cleaned
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '') // Strip remaining tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&[^;]+;/g, ' '); // Other entities

  // Collapse whitespace
  const text = cleaned
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');

  return { title, text };
}

function getSummaryZh(value: unknown): string | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }

  const summaryZh = (value as Record<string, unknown>).summaryZh;
  return typeof summaryZh === 'string' && summaryZh.trim().length > 0 ? summaryZh : undefined;
}

// ── Actions ─────────────────────────────────────────────────────────────────

/**
 * Import content from a URL.
 * Fetches the page, extracts text, splits into sentences, and triggers analysis.
 */
export const importFromUrl = action({
  args: {
    url: v.string(),
    customTitle: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<ImportedContentUrlImportResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError('UNAUTHORIZED');

    const { title: extractedTitle, text } = await fetchUrlContent(args.url);
    if (!text || text.trim().length < 20) {
      return { success: false, reason: 'insufficient_content' as const };
    }

    const title = args.customTitle?.trim() || extractedTitle;
    const rawText = text.slice(0, 20_000); // Cap at 20K chars

    // Split sentences using Korean-aware splitter
    const sentences = splitKoreanSentences(rawText);

    // Create content record
    const contentId = await ctx.runMutation(createContentRecordMutation, {
      userId: userId as Id<'users'>,
      title,
      rawText,
      sourceType: 'URL',
      sourceUrl: args.url,
      sentenceCount: sentences.length,
    });

    // Insert sentences in batch
    await ctx.runMutation(insertSentencesBatchMutation, {
      contentId,
      contentType: 'IMPORTED',
      sentences: sentences.map((text, i) => ({ text, index: i + 1 })),
      source: 'url_import',
      sourceRefId: args.url,
    });

    // Run Kiwi difficulty estimation + AI summary in parallel
    const [difficultyResult] = await Promise.allSettled([
      ctx.runAction(estimateDifficultyFromTextAction, {
        text: rawText,
        sentenceCount: sentences.length,
      }),
    ]);

    const difficulty: DifficultyEstimate | null =
      difficultyResult.status === 'fulfilled' ? difficultyResult.value : null;

    if (difficulty) {
      await ctx.runMutation(updateContentAnalysisMutation, {
        contentId,
        analysis: {
          difficultyLevel: difficulty.level,
          estimatedMinutes: difficulty.metrics.estimatedMinutes,
          wordCount: difficulty.metrics.wordCount,
          sentenceCount: sentences.length,
        },
      });
    }

    // Trigger AI summary in the background
    await ctx.scheduler.runAfter(0, analyzeImportedContentV2Action, {
      contentId,
    });

    return { success: true, contentId };
  },
});

/**
 * Enhanced content analysis action (V2).
 * Uses Kiwi for deterministic difficulty, AI only for summary.
 */
export const analyzeImportedContentV2 = action({
  args: {
    contentId: v.id('imported_contents'),
  },
  handler: async (ctx, args) => {
    const content = await ctx.runQuery(getContentInternalQuery, {
      contentId: args.contentId,
    });
    if (!content) return;

    // 1. Kiwi-based difficulty estimation
    const sentences = splitKoreanSentences(content.rawText);
    let difficulty: DifficultyEstimate | null = null;
    try {
      difficulty = await ctx.runAction(estimateDifficultyFromTextAction, {
        text: content.rawText,
        sentenceCount: sentences.length,
      });
    } catch {
      // Graceful degradation
    }

    // 2. AI summary generation
    let summaryZh: string | undefined;
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
                  {
                    role: 'system',
                    content: `你是韩语学习助手。请用中文概括以下韩语文章。
输出 JSON: { "summaryZh": "<50字以内的中文摘要>" }
只返回 JSON，不要额外文字。`,
                  },
                  {
                    role: 'user',
                    content: `标题：${content.title}\n\n内容：\n${content.rawText.slice(0, 3000)}`,
                  },
                ],
              }),
            { retries: 2, label: 'import_summary' }
          ),
        { label: 'import_summary', timeoutMs: 15000 }
      );

      const raw = completion.choices[0]?.message?.content ?? '{}';
      const parsed = parseJsonObjectFromModelContent(raw);
      summaryZh = getSummaryZh(parsed);
    } catch (error) {
      aiLogger.error('Failed to generate import summary', { error });
    }

    // 3. Update content record
    await ctx.runMutation(updateContentAnalysisMutation, {
      contentId: args.contentId,
      analysis: {
        summaryZh,
        difficultyLevel: difficulty?.level || content.difficultyLevel,
        estimatedMinutes: difficulty?.metrics.estimatedMinutes || content.estimatedMinutes,
        wordCount: difficulty?.metrics.wordCount || content.wordCount,
        sentenceCount: sentences.length || content.sentenceCount,
      },
    });
  },
});

// ── Internal mutation for creating content record ───────────────────────────

export const createContentRecord = internalMutation({
  args: {
    userId: v.id('users'),
    title: v.string(),
    rawText: v.string(),
    sourceType: v.string(),
    sourceUrl: v.optional(v.string()),
    sentenceCount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert('imported_contents', {
      userId: args.userId,
      title: args.title,
      rawText: args.rawText,
      sourceType: args.sourceType,
      sourceUrl: args.sourceUrl,
      sentenceCount: args.sentenceCount,
      createdAt: Date.now(),
    });
  },
});
