import { action, mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { makeFunctionReference } from 'convex/server';
import type { FunctionReference } from 'convex/server';
import { getAuthUserId } from './utils';
import { runChatCompletionWithFallback } from './ai/chatClient';
import { parseJsonObjectFromModelContent, retryAsync } from './aiReliability';
import {
  WRITING_FEEDBACK_RESULT_VALIDATOR,
  KAGAS_ERROR_TYPES,
  kagasToLegacyType,
} from './topikWritingValidators';
import { aiLogger } from './logger';
import type { TopikWritingKiwiAnnotation } from './topikWritingCoachKiwi';

/**
 * P1-1 TOPIK Writing Coach MVP
 */

export type WritingCoachError = {
  errorType: string;
  originalText: string;
  correctedText: string;
  explanationZh: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  relatedGrammarPattern?: string;
  verified?: boolean;
  kiwiContext?: string;
};

export type WritingCoachFeedback = {
  taskType: string;
  estimatedScore: number;
  scoreBand: string;
  overallCommentZh: string;
  strengths: string[];
  weaknesses: string[];
  errors: WritingCoachError[];
  improvedVersion: string;
  usefulExpressions: Array<{ kr: string; zh: string }>;
  recommendedReview: Array<{ type: 'GRAMMAR' | 'WORD'; refId?: string; pattern: string }>;
  nextPracticeSuggestion: string;
  confidence: number;
  generatedBy?: string;
  promptVersion?: string;
};

const annotateWritingErrorsWithKiwiAction = makeFunctionReference<
  'action',
  { userAnswer: string; originalTexts: string[] },
  TopikWritingKiwiAnnotation[]
>('topikWritingCoachKiwi:annotateWritingErrorsWithKiwi') as unknown as FunctionReference<
  'action',
  'internal',
  { userAnswer: string; originalTexts: string[] },
  TopikWritingKiwiAnnotation[]
>;

function isWritingCoachError(value: unknown): value is WritingCoachError {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.errorType === 'string' &&
    typeof candidate.originalText === 'string' &&
    typeof candidate.correctedText === 'string' &&
    typeof candidate.explanationZh === 'string' &&
    (candidate.severity === 'LOW' ||
      candidate.severity === 'MEDIUM' ||
      candidate.severity === 'HIGH')
  );
}

function isWritingCoachFeedback(value: unknown): value is WritingCoachFeedback {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.taskType === 'string' &&
    typeof candidate.estimatedScore === 'number' &&
    typeof candidate.scoreBand === 'string' &&
    typeof candidate.overallCommentZh === 'string' &&
    Array.isArray(candidate.strengths) &&
    Array.isArray(candidate.weaknesses) &&
    Array.isArray(candidate.errors) &&
    candidate.errors.every(isWritingCoachError) &&
    typeof candidate.improvedVersion === 'string' &&
    Array.isArray(candidate.usefulExpressions) &&
    Array.isArray(candidate.recommendedReview) &&
    typeof candidate.nextPracticeSuggestion === 'string' &&
    typeof candidate.confidence === 'number'
  );
}

export const evaluateWritingCoach = action({
  args: {
    taskType: v.string(), // "51", "52", "53", "54"
    prompt: v.string(),
    userAnswer: v.string(),
    language: v.optional(v.string()), // target explanation language
  },
  handler: async (ctx, args) => {
    const { taskType, prompt, userAnswer, language: _language = 'zh' } = args;

    // Build KAGAS error type reference for the AI prompt
    const kagasTypeList = Object.entries(KAGAS_ERROR_TYPES)
      .map(([key, val]) => `"${key}" (${val.ko} / ${val.zh})`)
      .join(', ');

    const systemPrompt = `你是一位专业的 TOPIK II 写作教练。你的任务是评估学生的韩语作文，并提供极具建设性的结构化反馈。

评估标准：
1. 内容完成度 (Task Accomplishment)
2. 文章结构与逻辑 (Development & Structure)
3. 语言使用（词汇、语法、文体） (Language Use)
4. 稿纸格式 (Wongoji Rules) —— 仅适用于 53/54 题

错误类型分类（KAGAS 韩语写作错误体系）：
${kagasTypeList}

你必须输出严格符合以下 JSON 格式的回复，严禁包含任何 Markdown 代码块标签或其他文字：
{
  "taskType": "${taskType}",
  "estimatedScore": <根据题目满分(51/52各10分, 53题30分, 54题50分)给出的预估分数>,
  "scoreBand": "<评估等级，例如 Level 3, Level 4, Level 5+>",
  "overallCommentZh": "<简明扼要的总评，使用中文>",
  "strengths": ["点1", "点2"],
  "weaknesses": ["点1", "点2"],
  "errors": [
    {
      "errorType": "<KAGAS 错误类型，必须使用上述 KAGAS 类型之一>",
      "originalText": "<原文中的错误部分>",
      "correctedText": "<修正后的对应部分>",
      "explanationZh": "<错误的中文解释>",
      "severity": "LOW" | "MEDIUM" | "HIGH",
      "relatedGrammarPattern": "<如果适用，指出相关的语法点名称>"
    }
  ],
  "improvedVersion": "<保留学习者原意，但在表达上达到高级水平的修改后全文>",
  "usefulExpressions": [
    { "kr": "<推荐的韩语表达>", "zh": "<对应的中文解释>" }
  ],
  "recommendedReview": [
    { "type": "GRAMMAR" | "WORD", "pattern": "<语法点或单词名称>" }
  ],
  "nextPracticeSuggestion": "<针对学习者弱点的下一步练习建议，中文>",
  "confidence": <0.0 到 1.0 的置信度>
}

注意事项：
- 如果是 51/52 题，关注文体一致性（51题公文体/格式体，52题书面体/基本阶）。
- 如果是 53/54 题，关注逻辑连接词和表达的多样性。
- 错误分类务必使用 KAGAS 类型（如 JOSA_ERR, EOMI_ERR 等），不要使用旧的 GRAMMAR/VOCAB/SPELLING 分类。
- 解释必须通俗易懂，适合韩语学习者。`;

    const userPrompt = `题目要求：\n${prompt}\n\n学生提交的内容：\n${userAnswer || '(未提交内容)'}`;

    try {
      const { completion, provider } = await runChatCompletionWithFallback(
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
            { retries: 2, label: 'topik_writing_coach' }
          ),
        { label: 'topik_writing_coach', timeoutMs: 30000 }
      );

      const raw = completion.choices[0]?.message?.content ?? '{}';
      const parsed = parseJsonObjectFromModelContent(raw);

      if (!parsed || !isWritingCoachFeedback(parsed)) {
        throw new Error('AI 返回的不是有效的 JSON 格式');
      }

      // Kiwi-based validation: verify AI error positions against actual text
      if (parsed.errors.length > 0 && userAnswer) {
        try {
          const annotations = await ctx.runAction(annotateWritingErrorsWithKiwiAction, {
            userAnswer,
            originalTexts: parsed.errors.map(error => error.originalText),
          });

          for (const [index, error] of parsed.errors.entries()) {
            const annotation = annotations[index];
            if (!annotation) {
              continue;
            }
            error.verified = annotation.verified;
            if (annotation.kiwiContext) {
              error.kiwiContext = annotation.kiwiContext;
            }
          }
        } catch {
          // Kiwi validation is optional — gracefully degrade
        }
      }

      // Metadata for persistence
      return {
        ...parsed,
        generatedBy: provider.model,
        promptVersion: 'v1.1-kiwi',
      };
    } catch (error) {
      aiLogger.error('TOPIK Writing Coach AI failed', { error });
      throw error;
    }
  },
});

export const saveWritingCoachAttempt = mutation({
  args: {
    taskType: v.string(),
    prompt: v.string(),
    userAnswer: v.string(),
    feedback: WRITING_FEEDBACK_RESULT_VALIDATOR,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const { taskType, prompt, userAnswer, feedback } = args;

    const attemptId = await ctx.db.insert('topik_writing_attempts', {
      userId,
      taskType,
      prompt,
      userAnswer,
      estimatedScore: feedback.estimatedScore,
      scoreBand: feedback.scoreBand,
      feedbackSummary: feedback.overallCommentZh,
      improvedVersion: feedback.improvedVersion,
      fullFeedbackJson: JSON.stringify(feedback),
      generatedBy: feedback.generatedBy,
      promptVersion: feedback.promptVersion,
      confidence: feedback.confidence,
      createdAt: Date.now(),
    });

    // Store structured writing errors in user_mistakes
    // Support both KAGAS types and legacy types for backward compatibility
    if (Array.isArray(feedback.errors)) {
      for (const err of feedback.errors) {
        const kagasType = err.errorType as string;
        // If AI returns a KAGAS type, derive legacy type; otherwise use as-is
        const legacyType = kagasToLegacyType(kagasType);
        const isKagasType = kagasType in KAGAS_ERROR_TYPES;

        await ctx.db.insert('user_mistakes', {
          userId,
          sourceType: 'TOPIK_WRITING',
          sourceId: attemptId,
          errorType: isKagasType ? legacyType : kagasType, // Legacy-compatible
          errorTypeKagas: isKagasType ? kagasType : undefined, // Fine-grained KAGAS type
          originalText: err.originalText,
          correctedText: err.correctedText,
          explanationZh: err.explanationZh,
          severity: err.severity,
          relatedGrammarPattern: err.relatedGrammarPattern,
          status: 'ACTIVE',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
    }

    return attemptId;
  },
});

export const getWritingCoachHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx).catch(() => null);
    if (!userId) return [];

    return await ctx.db
      .query('topik_writing_attempts')
      .withIndex('by_user_createdAt', q => q.eq('userId', userId))
      .order('desc')
      .take(args.limit ?? 20);
  },
});

export const getAttemptDetails = query({
  args: {
    attemptId: v.id('topik_writing_attempts'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx).catch(() => null);
    if (!userId) return null;

    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt || attempt.userId !== userId) return null;

    // Fetch related mistakes
    const mistakes = await ctx.db
      .query('user_mistakes')
      .withIndex('by_user_status', q => q.eq('userId', userId).eq('status', 'ACTIVE'))
      .filter(q => q.eq(q.field('sourceId'), args.attemptId))
      .collect();

    return {
      ...attempt,
      mistakes,
    };
  },
});
