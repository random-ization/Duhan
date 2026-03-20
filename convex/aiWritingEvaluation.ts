/**
 * convex/aiWritingEvaluation.ts
 *
 * AI evaluation pipeline for TOPIK II writing submissions.
 *
 *  • saveEvaluation  — internalMutation: persists per-question AI scores and
 *                      updates the session status to EVALUATED with a totalScore.
 *  • evaluateSubmission — action: fetches session + questions, calls OpenAI,
 *                         and calls saveEvaluation via ctx.runMutation.
 *  • getEvaluations  — query: returns all evaluation records for a session
 *                      (used by the frontend report component).
 */

import { action, internalMutation, internalQuery, query } from './_generated/server';
import { internal } from './_generated/api';
import { v } from 'convex/values';
import { getAuthUserId } from './utils';
import type { Id } from './_generated/dataModel';

// ─── Shared dimension schema ──────────────────────────────────────────────────

const dimensionsSchema = v.object({
  taskAccomplishment: v.number(),
  developmentStructure: v.number(),
  languageUse: v.number(),
  wongojiRules: v.optional(v.number()),
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface AiEvalResult {
  score: number;
  dimensions: {
    taskAccomplishment: number;
    developmentStructure: number;
    languageUse: number;
    wongojiRules?: number;
  };
  feedbackText: string;
  correctedText: string;
}

type SupportedAiResponseLanguage = 'zh' | 'en' | 'vi' | 'mn';

const AI_RESPONSE_LANGUAGE_LABELS: Record<SupportedAiResponseLanguage, string> = {
  zh: '简体中文 (Simplified Chinese)',
  en: 'English',
  vi: 'Tiếng Việt (Vietnamese)',
  mn: 'Монгол хэл (Mongolian)',
};

function normalizeAiResponseLanguage(language?: string): SupportedAiResponseLanguage {
  const normalized = (language || '').trim().toLowerCase();
  if (
    normalized === 'zh' ||
    normalized === 'zh-cn' ||
    normalized === 'zh-hans' ||
    normalized === 'cn'
  ) {
    return 'zh';
  }
  if (normalized === 'en' || normalized.startsWith('en-')) {
    return 'en';
  }
  if (normalized === 'vi' || normalized === 'vn' || normalized.startsWith('vi-')) {
    return 'vi';
  }
  if (normalized === 'mn' || normalized.startsWith('mn-')) {
    return 'mn';
  }
  return 'zh';
}

function fallbackFeedbackText(language: SupportedAiResponseLanguage): string {
  if (language === 'en') return 'Failed to generate feedback. Please try again.';
  if (language === 'vi') return 'Không thể tạo nhận xét. Vui lòng thử lại.';
  if (language === 'mn') return 'Санал хүсэлт үүсгэж чадсангүй. Дахин оролдоно уу.';
  return '评语生成失败，请重试。';
}

// ─── internalMutation: saveEvaluation ────────────────────────────────────────

export const saveEvaluation = internalMutation({
  args: {
    sessionId: v.id('topik_writing_sessions'),
    userId: v.id('users'),
    questionNumber: v.number(),
    score: v.number(),
    dimensions: dimensionsSchema,
    feedbackText: v.string(),
    correctedText: v.optional(v.string()),
    isLastQuestion: v.boolean(), // trigger session finalization when true
  },
  handler: async (ctx, args) => {
    const {
      sessionId,
      userId,
      questionNumber,
      score,
      dimensions,
      feedbackText,
      correctedText,
      isLastQuestion,
    } = args;

    const existing = await ctx.db
      .query('topik_writing_evaluations')
      .withIndex('by_session', q => q.eq('sessionId', sessionId))
      .collect();
    const existingForQuestion = existing.find(e => e.questionNumber === questionNumber);

    if (existingForQuestion) {
      await ctx.db.patch(existingForQuestion._id, {
        score,
        dimensions,
        feedbackText,
        correctedText,
        createdAt: Date.now(),
      });
    } else {
      await ctx.db.insert('topik_writing_evaluations', {
        sessionId,
        userId,
        questionNumber,
        score,
        dimensions,
        feedbackText,
        correctedText,
        createdAt: Date.now(),
      });
    }

    if (isLastQuestion) {
      // Sum all evaluation scores for this session to compute totalScore.
      const allEvals = await ctx.db
        .query('topik_writing_evaluations')
        .withIndex('by_session', q => q.eq('sessionId', sessionId))
        .collect();
      const totalScore = allEvals.reduce((sum, e) => sum + e.score, 0);

      await ctx.db.patch(sessionId, {
        status: 'EVALUATED',
        totalScore,
      });
    }
  },
});

// ─── action: evaluateSubmission ───────────────────────────────────────────────

export const evaluateSubmission = action({
  args: {
    sessionId: v.id('topik_writing_sessions'),
    language: v.optional(v.string()),
  },
  handler: async (ctx, { sessionId, language }) => {
    // 1. Fetch session — userId comes from the stored session document;
    //    no need to re-authenticate inside an action (action ctx has no db).
    const session = (await ctx.runQuery(internal.aiWritingEvaluation.getSessionInternal, {
      sessionId,
    })) as {
      _id: Id<'topik_writing_sessions'>;
      userId: Id<'users'>;
      examId: Id<'topik_exams'>;
      status: string;
      answers: Record<string, string>;
      endTime: number;
      startTime: number;
    } | null;

    if (!session) throw new Error('Session not found');
    const userId = session.userId; // trusted: stored at session creation time
    if (session.status !== 'EVALUATING') {
      throw new Error(`Session is not in EVALUATING state: ${session.status}`);
    }

    // 2. Fetch writing questions for this exam
    const questions = (await ctx.runQuery(
      internal.aiWritingEvaluation.getWritingQuestionsInternal,
      { examId: session.examId }
    )) as Array<{
      _id: string;
      number: number;
      questionType: string;
      instruction?: string;
      contextBox?: string;
      image?: string;
      score: number;
    }>;

    const answers: Record<string, string> = (session.answers as Record<string, string>) ?? {};
    const apiKey = process.env.OPENAI_API_KEY;
    const responseLanguage = normalizeAiResponseLanguage(language);

    // 3. Evaluate each question independently
    const questionsSorted = [...questions].sort((a, b) => a.number - b.number);

    for (let i = 0; i < questionsSorted.length; i++) {
      const q = questionsSorted[i];
      const answerText = answers[String(q.number)] ?? '';
      const isLast = i === questionsSorted.length - 1;

      let evalResult: AiEvalResult;

      if (!apiKey) {
        // ── MOCK fallback when no API key is set ──
        evalResult = mockEvaluation(q, answerText, responseLanguage);
      } else {
        try {
          // ── Real OpenAI call ──
          evalResult = await callOpenAI(apiKey, q, answerText, responseLanguage);
        } catch (error) {
          console.warn(`OpenAI evaluation failed for Q${q.number}, fallback to mock`, error);
          evalResult = mockEvaluation(q, answerText, responseLanguage);
        }
      }

      await ctx.runMutation(internal.aiWritingEvaluation.saveEvaluation, {
        sessionId,
        userId,
        questionNumber: q.number,
        score: evalResult.score,
        dimensions: evalResult.dimensions,
        feedbackText: evalResult.feedbackText,
        correctedText: evalResult.correctedText,
        isLastQuestion: isLast,
      });
    }

    return { success: true, questionsEvaluated: questionsSorted.length };
  },
});

// ─── internal helpers (queries) ───────────────────────────────────────────────

export const getSessionInternal = internalQuery({
  args: { sessionId: v.id('topik_writing_sessions') },
  handler: async (ctx, { sessionId }) => ctx.db.get(sessionId),
});

export const getWritingQuestionsInternal = internalQuery({
  args: { examId: v.id('topik_exams') },
  handler: async (ctx, { examId }) => {
    return ctx.db
      .query('topik_writing_questions')
      .withIndex('by_exam', q => q.eq('examId', examId))
      .collect();
  },
});

// ─── query: getEvaluations ────────────────────────────────────────────────────

export const getEvaluations = query({
  args: {
    sessionId: v.id('topik_writing_sessions'),
  },
  handler: async (ctx, { sessionId }) => {
    const userId = await getAuthUserId(ctx).catch(() => null);
    if (!userId) return null;

    // Guard: user must own the session
    const session = await ctx.db.get(sessionId);
    if (!session || session.userId !== userId) return null;

    const evals = await ctx.db
      .query('topik_writing_evaluations')
      .withIndex('by_session', q => q.eq('sessionId', sessionId))
      .collect();

    return {
      session,
      evaluations: evals.sort((a, b) => a.questionNumber - b.questionNumber),
    };
  },
});

// ─── OpenAI call helper ───────────────────────────────────────────────────────

interface RubricConfig {
  taskMax: number;
  structureMax: number;
  languageMax: number;
  totalMax: number;
  rubricText: string;
}

function clampInt(value: number, max: number): number {
  return Math.min(Math.max(0, Math.round(value)), max);
}

function toPercent(points: number, max: number): number {
  if (max <= 0) return 0;
  return clampInt((points / max) * 100, 100);
}

function getRubricConfig(question: {
  number: number;
  questionType: string;
  score: number;
}): RubricConfig {
  if (question.number === 53) {
    return {
      taskMax: 7,
      structureMax: 7,
      languageMax: 16,
      totalMax: 30,
      rubricText: `第53题（小作文）请严格按以下分值：
- 内容完成度：7分（A=7, B=6, C=4~5, D=3, E=2, F=0~1）
- 文章结构：7分（A=7, B=6, C=4~5, D=3, E=2, F=0~1）
- 语言使用：16分（A=16, B=14, C=10~12, D=8, E=6, F=0~4）`,
    };
  }

  if (question.number === 54) {
    return {
      taskMax: 12,
      structureMax: 12,
      languageMax: 26,
      totalMax: 50,
      rubricText: `第54题（大作文）请严格按以下分值：
- 内容及题目完成度：12分（A=11~12, B=9~10, C=7~8, D=5~6, E=3~4, F=0~2）
- 文章结构：12分（A=11~12, B=9~10, C=7~8, D=5~6, E=3~4, F=0~2）
- 语言使用：26分（A=24~26, B=20~22, C=16~18, D=12~14, E=8~10, F=0~6）`,
    };
  }

  if (question.number === 51) {
    return {
      taskMax: 4,
      structureMax: 3,
      languageMax: 3,
      totalMax: 10,
      rubricText: `第51题（造句）按10分制评分：
- 内容与语境匹配：4分
- 前后衔接自然：3分
- 语法与文体准确：3分
特别要求：句末优先使用格式体（如 "합니다 / ㅂ니다 / 입니다" 等）。`,
    };
  }

  if (question.number === 52) {
    return {
      taskMax: 4,
      structureMax: 3,
      languageMax: 3,
      totalMax: 10,
      rubricText: `第52题（造句）按10分制评分：
- 内容与语境匹配：4分
- 前后衔接自然：3分
- 语法与文体准确：3分
特别要求：优先使用基本阶（书写体，如 "는다/ㄴ다" 等），并关注敬语/谦词是否得当。`,
    };
  }

  // Fallback for unexpected imported question sets.
  const taskMax = Math.max(1, Math.round(question.score * 0.3));
  const structureMax = Math.max(1, Math.round(question.score * 0.3));
  const languageMax = Math.max(1, question.score - taskMax - structureMax);
  return {
    taskMax,
    structureMax,
    languageMax,
    totalMax: question.score,
    rubricText: `本题按以下分值评分：内容${taskMax}分、结构${structureMax}分、语言${languageMax}分。`,
  };
}

async function callOpenAI(
  apiKey: string,
  question: {
    number: number;
    questionType: string;
    instruction?: string;
    contextBox?: string;
    image?: string;
    score: number;
  },
  answerText: string,
  language: SupportedAiResponseLanguage
): Promise<AiEvalResult> {
  const rubric = getRubricConfig(question);
  const systemPrompt = buildSystemPrompt(question, rubric, language);
  const userPrompt = buildUserPrompt(question, answerText);
  const hasImage = Boolean(question.image?.trim());
  const userContent: Array<
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string; detail: 'low' | 'high' | 'auto' } }
  > = [{ type: 'text', text: userPrompt }];
  if (hasImage) {
    userContent.push({
      type: 'image_url',
      image_url: {
        url: question.image!.trim(),
        detail: 'high',
      },
    });
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-5-nano',
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${err}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  const raw = data.choices[0]?.message?.content ?? '{}';
  const parsed = JSON.parse(raw) as {
    score?: number;
    dimensions?: {
      taskAccomplishment?: number;
      developmentStructure?: number;
      languageUse?: number;
      wongojiRules?: number | null;
    };
    rubricScores?: {
      taskAccomplishment?: number;
      developmentStructure?: number;
      languageUse?: number;
      taskAccomplishmentPoints?: number;
      developmentStructurePoints?: number;
      languageUsePoints?: number;
    };
    feedbackText?: string;
    correctedText?: string;
  };

  const taskPointsRaw =
    parsed.rubricScores?.taskAccomplishmentPoints ?? parsed.rubricScores?.taskAccomplishment;
  const structurePointsRaw =
    parsed.rubricScores?.developmentStructurePoints ?? parsed.rubricScores?.developmentStructure;
  const languagePointsRaw =
    parsed.rubricScores?.languageUsePoints ?? parsed.rubricScores?.languageUse;

  const taskPoints = clampInt(
    taskPointsRaw ?? ((parsed.dimensions?.taskAccomplishment ?? 0) / 100) * rubric.taskMax,
    rubric.taskMax
  );
  const structurePoints = clampInt(
    structurePointsRaw ??
      ((parsed.dimensions?.developmentStructure ?? 0) / 100) * rubric.structureMax,
    rubric.structureMax
  );
  const languagePoints = clampInt(
    languagePointsRaw ?? ((parsed.dimensions?.languageUse ?? 0) / 100) * rubric.languageMax,
    rubric.languageMax
  );

  const rubricTotal = taskPoints + structurePoints + languagePoints;
  const finalScore = clampInt(rubricTotal > 0 ? rubricTotal : (parsed.score ?? 0), rubric.totalMax);

  return {
    score: finalScore,
    dimensions: {
      taskAccomplishment: toPercent(taskPoints, rubric.taskMax),
      developmentStructure: toPercent(structurePoints, rubric.structureMax),
      languageUse: toPercent(languagePoints, rubric.languageMax),
      wongojiRules:
        question.questionType !== 'FILL_BLANK'
          ? clampInt(parsed.dimensions?.wongojiRules ?? 0, 100)
          : undefined,
    },
    feedbackText: parsed.feedbackText ?? fallbackFeedbackText(language),
    correctedText: parsed.correctedText ?? answerText,
  };
}

// ─── Prompt builders ──────────────────────────────────────────────────────────

function buildSystemPrompt(
  question: { number: number; questionType: string; score: number },
  rubric: RubricConfig,
  language: SupportedAiResponseLanguage
) {
  const languageLabel = AI_RESPONSE_LANGUAGE_LABELS[language];
  return `You are an official TOPIK II writing grader.
Your task is to score and evaluate question ${question.number} strictly based on the rubric.

Question type: ${question.questionType}
Maximum score: ${rubric.totalMax}
Scoring rubric:
${rubric.rubricText}

Dimension definitions:
- taskAccomplishment: relevance to prompt and task completion
- developmentStructure: organization, progression, coherence
- languageUse: vocabulary and grammar accuracy/range
- wongojiRules: writing-sheet formatting (only for Q53/Q54, optional)

You must output JSON only (no markdown, no extra text):
{
  "rubricScores": {
    "taskAccomplishment": <integer 0-${rubric.taskMax}>,
    "developmentStructure": <integer 0-${rubric.structureMax}>,
    "languageUse": <integer 0-${rubric.languageMax}>
  },
  "score": <integer 0-${rubric.totalMax}, should equal sum of rubricScores>,
  "dimensions": {
    "taskAccomplishment": <0-100 optional>,
    "developmentStructure": <0-100 optional>,
    "languageUse": <0-100 optional>,
    "wongojiRules": <0-100 or null>
  },
  "feedbackText": "<2-3 paragraphs of detailed feedback in ${languageLabel}>",
  "correctedText": "<polished high-scoring reference answer in Korean, keep learner intent>"
}`;
}

function buildUserPrompt(
  question: { number: number; instruction?: string; contextBox?: string; image?: string },
  answerText: string
) {
  const parts: string[] = [`[Question ${question.number}]`];
  if (question.instruction) parts.push(`Prompt:\n${question.instruction}`);
  if (question.contextBox) parts.push(`Reference material:\n${question.contextBox}`);
  if (question.image?.trim())
    parts.push('Image prompt: see attached image and include it in scoring.');
  parts.push(`\nLearner answer:\n${answerText || '(No answer)'}`);
  return parts.join('\n\n');
}

// ─── Mock evaluation (no API key) ─────────────────────────────────────────────

function getStyleFactorForFillBlank(questionNumber: number, answerText: string): number {
  const text = answerText.replace(/\s+/g, ' ');
  const formalEnding = /(습니다|ㅂ니다|입니다|합니다)/;
  const writtenStyleEnding = /(는다|ㄴ다|다)([.!?]|$)/;

  if (questionNumber === 51) {
    return formalEnding.test(text) ? 1 : 0.75;
  }
  if (questionNumber === 52) {
    let factor = writtenStyleEnding.test(text) ? 1 : 0.78;
    if (formalEnding.test(text)) factor *= 0.9;
    return factor;
  }
  return 1;
}

function mockEvaluation(
  question: { number: number; questionType: string; score: number },
  answerText: string,
  language: SupportedAiResponseLanguage
): AiEvalResult {
  const rubric = getRubricConfig(question);
  const len = answerText.replace(/\s/g, '').length;
  const lenBase = question.number <= 52 ? 24 : question.number === 53 ? 120 : 220;
  const basePct = Math.min(1, len / lenBase);
  const styleFactor = getStyleFactorForFillBlank(question.number, answerText);

  const taskPoints = clampInt(rubric.taskMax * basePct, rubric.taskMax);
  const structurePoints = clampInt(rubric.structureMax * basePct, rubric.structureMax);
  const languagePoints = clampInt(rubric.languageMax * basePct * styleFactor, rubric.languageMax);
  const score = clampInt(taskPoints + structurePoints + languagePoints, rubric.totalMax);

  return {
    score,
    dimensions: {
      taskAccomplishment: toPercent(taskPoints, rubric.taskMax),
      developmentStructure: toPercent(structurePoints, rubric.structureMax),
      languageUse: toPercent(languagePoints, rubric.languageMax),
      wongojiRules:
        question.questionType !== 'FILL_BLANK' ? clampInt(80 * basePct, 100) : undefined,
    },
    feedbackText:
      language === 'en'
        ? `(Mock scoring: OPENAI_API_KEY is not configured.) Approx. ${len} chars. Scored with Q${question.number} rubric.`
        : language === 'vi'
          ? `(Chấm điểm mô phỏng: chưa cấu hình OPENAI_API_KEY.) Bài làm khoảng ${len} ký tự. Đã chấm theo thang điểm Câu ${question.number}.`
          : language === 'mn'
            ? `(Загвар үнэлгээ: OPENAI_API_KEY тохируулаагүй.) Ойролцоогоор ${len} тэмдэгт. ${question.number}-р даалгаврын рубрикаар үнэллээ.`
            : `（当前为模拟评分，未配置 OPENAI_API_KEY。）答案约 ${len} 字。评分已按第${question.number}题分项标准执行。`,
    correctedText:
      answerText ||
      (language === 'en'
        ? '(No answer)'
        : language === 'vi'
          ? '(Chưa trả lời)'
          : language === 'mn'
            ? '(Хариу оруулаагүй)'
            : '（未作答）'),
  };
}
