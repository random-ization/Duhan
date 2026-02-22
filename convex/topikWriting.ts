import { mutation, query } from './_generated/server';
import { ConvexError, v } from 'convex/values';
import { getAuthUserId, requireAdmin } from './utils';
import type { Id } from './_generated/dataModel';
import { api } from './_generated/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const EXAM_DURATION_MS = 50 * 60 * 1000; // 50 minutes in milliseconds
const WRITING_QUESTION_TYPE_VALIDATOR = v.union(
    v.literal('FILL_BLANK'),
    v.literal('GRAPH_ESSAY'),
    v.literal('OPINION_ESSAY'),
);

// ─── Admin: writing exam upload ──────────────────────────────────────────────

export const saveWritingExam = mutation({
    args: {
        id: v.string(), // legacy exam id (route id)
        title: v.string(),
        round: v.number(),
        timeLimit: v.number(),
        description: v.optional(v.string()),
        isPaid: v.optional(v.boolean()),
        questions: v.array(
            v.object({
                number: v.number(),
                questionType: WRITING_QUESTION_TYPE_VALIDATOR,
                instruction: v.optional(v.string()),
                contextBox: v.optional(v.string()),
                image: v.optional(v.string()),
                score: v.number(),
                modelAnswer: v.optional(v.string()),
                gradingCriteria: v.optional(v.any()),
            }),
        ),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        const { id, questions, ...examData } = args;

        const existingExam = await ctx.db
            .query('topik_exams')
            .withIndex('by_legacy_id', q => q.eq('legacyId', id))
            .first();

        let examId: Id<'topik_exams'>;
        if (existingExam) {
            await ctx.db.patch(existingExam._id, {
                ...examData,
                type: 'WRITING',
                isPaid: examData.isPaid ?? false,
            });
            examId = existingExam._id;

            const existingWritingQuestions = await ctx.db
                .query('topik_writing_questions')
                .withIndex('by_exam', q => q.eq('examId', examId))
                .collect();
            await Promise.all(existingWritingQuestions.map(q => ctx.db.delete(q._id)));

            // Safety cleanup when an exam was previously created as objective type.
            const existingObjectiveQuestions = await ctx.db
                .query('topik_questions')
                .withIndex('by_exam', q => q.eq('examId', examId))
                .collect();
            await Promise.all(existingObjectiveQuestions.map(q => ctx.db.delete(q._id)));
        } else {
            examId = await ctx.db.insert('topik_exams', {
                legacyId: id,
                ...examData,
                type: 'WRITING',
                isPaid: examData.isPaid ?? false,
                createdAt: Date.now(),
            });
        }

        const orderedQuestions = [...questions].sort((a, b) => a.number - b.number);
        const question51 = orderedQuestions.find(q => q.number === 51);
        if (!question51) {
            throw new ConvexError({
                code: 'WRITING_Q51_REQUIRED',
                message: '第51题是必填题，并且必须包含图片。',
            });
        }
        if (!question51.image || !question51.image.trim()) {
            throw new ConvexError({
                code: 'WRITING_Q51_IMAGE_REQUIRED',
                message: '第51题必须上传图片。',
            });
        }

        const question53 = orderedQuestions.find(q => q.number === 53);
        if (!question53) {
            throw new ConvexError({
                code: 'WRITING_Q53_REQUIRED',
                message: '第53题是必填题，并且必须包含图表图片。',
            });
        }
        if (question53.questionType !== 'GRAPH_ESSAY') {
            throw new ConvexError({
                code: 'WRITING_Q53_TYPE_INVALID',
                message: '第53题题型必须是 GRAPH_ESSAY。',
            });
        }
        if (!question53.image || !question53.image.trim()) {
            throw new ConvexError({
                code: 'WRITING_Q53_IMAGE_REQUIRED',
                message: '第53题必须上传图片。',
            });
        }

        await Promise.all(
            orderedQuestions.map(q =>
                ctx.db.insert('topik_writing_questions', {
                    examId,
                    number: q.number,
                    questionType: q.questionType,
                    instruction: q.instruction,
                    contextBox: q.contextBox,
                    image: q.image,
                    score: q.score,
                    modelAnswer: q.modelAnswer,
                    gradingCriteria: q.gradingCriteria,
                }),
            ),
        );

        return {
            success: true,
            examId: id,
            questionCount: orderedQuestions.length,
        };
    },
});

// ─── mutations ────────────────────────────────────────────────────────────────

/**
 * startSession
 * Checks for an existing IN_PROGRESS session for this user+exam.
 * Returns the existing session if found, otherwise creates a new one.
 */
export const startSession = mutation({
    args: {
        examId: v.id('topik_exams'),
    },
    handler: async (ctx, { examId }): Promise<Id<'topik_writing_sessions'>> => {
        const userId = await getAuthUserId(ctx);
        const now = Date.now();

        // Check for an existing in-progress session
        const existing = await ctx.db
            .query('topik_writing_sessions')
            .withIndex('by_user_exam', q => q.eq('userId', userId).eq('examId', examId))
            .filter(q => q.eq(q.field('status'), 'IN_PROGRESS'))
            .first();

        if (existing !== null) {
            return existing._id;
        }

        // Create a fresh session with 50-minute window
        const sessionId = await ctx.db.insert('topik_writing_sessions', {
            userId,
            examId,
            status: 'IN_PROGRESS',
            answers: {},
            startTime: now,
            endTime: now + EXAM_DURATION_MS,
        });

        return sessionId;
    },
});

/**
 * saveDraft
 * Persists draft answers for an in-progress session.
 * Silently no-ops if the session has expired or is no longer IN_PROGRESS
 * (safe to call via debounced auto-save without special error handling).
 */
export const saveDraft = mutation({
    args: {
        sessionId: v.id('topik_writing_sessions'),
        answers: v.record(v.string(), v.string()), // e.g. { "51": "답안 텍스트..." }
    },
    handler: async (ctx, { sessionId, answers }) => {
        const userId = await getAuthUserId(ctx);
        const now = Date.now();

        const session = await ctx.db.get(sessionId);
        if (session === null) return { saved: false, reason: 'not_found' };
        if (session.userId !== userId) return { saved: false, reason: 'forbidden' };
        if (session.status !== 'IN_PROGRESS') return { saved: false, reason: 'not_in_progress' };
        if (now > session.endTime) return { saved: false, reason: 'expired' };

        await ctx.db.patch(sessionId, { answers });
        return { saved: true };
    },
});

/**
 * submitSession
 * Marks the session as EVALUATING (ready for AI grading in next phase).
 * Also works as a forced-submit when the timer expires.
 */
export const submitSession = mutation({
    args: {
        sessionId: v.id('topik_writing_sessions'),
    },
    handler: async (ctx, { sessionId }) => {
        const userId = await getAuthUserId(ctx);
        const now = Date.now();

        const session = await ctx.db.get(sessionId);
        if (session === null) throw new Error('Session not found');
        if (session.userId !== userId) throw new Error('Forbidden');
        if (session.status === 'EVALUATED') {
            // Already submitted — idempotent
            return { submitted: true, alreadySubmitted: true };
        }
        if (session.status === 'EVALUATING') {
            // Self-heal: if evaluation worker failed previously, allow retrigger.
            await ctx.scheduler.runAfter(0, api.aiWritingEvaluation.evaluateSubmission, {
                sessionId,
            });
            return { submitted: true, alreadySubmitted: true };
        }

        await ctx.db.patch(sessionId, {
            status: 'EVALUATING',
            completedAt: now,
        });
        await ctx.scheduler.runAfter(0, api.aiWritingEvaluation.evaluateSubmission, {
            sessionId,
        });

        return { submitted: true, alreadySubmitted: false };
    },
});

/**
 * getSession
 * Returns the current session document for a given sessionId.
 * Used by the frontend to hydrate state on mount/reload.
 */
export const getSession = query({
    args: {
        sessionId: v.id('topik_writing_sessions'),
    },
    handler: async (ctx, { sessionId }) => {
        const userId = await getAuthUserId(ctx).catch(() => null);
        if (userId === null) return null;

        const session = await ctx.db.get(sessionId);
        if (session === null || session.userId !== userId) return null;
        return session;
    },
});

/**
 * getWritingQuestions
 * Returns all writing questions for a given examId, ordered by question number.
 */
export const getWritingQuestions = query({
    args: {
        examId: v.id('topik_exams'),
    },
    handler: async (ctx, { examId }) => {
        const questions = await ctx.db
            .query('topik_writing_questions')
            .withIndex('by_exam', q => q.eq('examId', examId))
            .collect();

        return questions.sort((a, b) => a.number - b.number);
    },
});

/**
 * getUserSessions
 * Returns past writing sessions for the current user, mapped to match
 * the basic fields of an ExamAttempt to be displayed on the TopikPage.
 */
export const getUserSessions = query({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx).catch(() => null);
        if (userId === null) return [];

        const limit = args.limit ?? 200;

        const sessions = await ctx.db
            .query('topik_writing_sessions')
            .withIndex('by_user', q => q.eq('userId', userId))
            .filter(q => q.neq(q.field('status'), 'IN_PROGRESS'))
            .order('desc')
            .take(limit);

        const results = [];
        for (const session of sessions) {
            const exam = await ctx.db.get(session.examId);
            if (!exam) continue;

            results.push({
                id: session._id,
                examId: exam.legacyId,
                examTitle: exam.title,
                score: session.totalScore || 0,
                maxScore: 100, // TOPIK II Writing is out of 100
                timestamp: session.completedAt || session.endTime,
                userAnswers: {},
                isWriting: true, // flag to identify writing exams if needed
            });
        }

        return results;
    },
});
