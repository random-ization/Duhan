import { mutation, query, internalMutation } from './_generated/server';
import { v, ConvexError } from 'convex/values';
import { paginationOptsValidator, makeFunctionReference } from 'convex/server';
import type { FunctionReference } from 'convex/server';
import { getAuthUserId, requireAdmin } from './utils';
import type { Id } from './_generated/dataModel';

type AutoSubmitArgs = { sessionId: Id<'exam_sessions'> };

const autoSubmitMutation = makeFunctionReference<'mutation', AutoSubmitArgs, void>(
  'topik:autoSubmit'
) as unknown as FunctionReference<'mutation', 'internal', AutoSubmitArgs, void>;

type StorageResolverContext = {
  storage: {
    getUrl: (storageId: string) => Promise<string | null>;
  };
};

// Helper to resolve storage URL (handles ID or stale URL)
async function resolveUrl(ctx: StorageResolverContext, urlOrId?: string) {
  if (!urlOrId) return undefined;

  // If it's effectively a URL
  if (urlOrId.startsWith('http')) {
    // Check if it's a convex storage URL (format: .../api/storage/<ID>)
    const match = urlOrId.match(/\/api\/storage\/([^/]+)$/);
    if (match && match[1]) {
      // Refresh the signed URL using the ID
      return (await ctx.storage.getUrl(match[1])) || urlOrId;
    }
    return urlOrId;
  }

  // Assume it's a Storage ID
  return (await ctx.storage.getUrl(urlOrId)) || undefined;
}

// ============================================
// TOPIK DTOs
// ============================================

export type TopikQuestionDto = {
  id: number;
  number: number;
  passage: string;
  question: string;
  contextBox?: string;
  options: string[];
  correctAnswer: number;
  image?: string;
  optionImages?: string[];
  explanation?: string;
  score: number;
  instruction?: string;
  layout?: string;
  groupCount?: number;
};

export type TopikExamDto = {
  id: string; // Legacy ID
  _id: string;
  title: string;
  round: number;
  type: string;
  paperType?: string;
  timeLimit: number;
  audioUrl?: string;
  description?: string;
  isPaid?: boolean;
  createdAt: number;
};

// ============================================
// TOPIK Exam CRUD Functions
// ============================================

// Get all exams (metadata only, no questions) - supports pagination
export const getExams = query({
  args: {
    paginationOpts: v.optional(paginationOptsValidator),
  },
  handler: async (ctx, args) => {
    const query = ctx.db.query('topik_exams').order('desc');

    if (args.paginationOpts) {
      const results = await query.paginate(args.paginationOpts);

      const pageWithUrls = await Promise.all(
        results.page.map(
          async exam =>
            ({
              id: exam.legacyId,
              _id: exam._id,
              title: exam.title,
              round: exam.round,
              type: exam.type,
              paperType: exam.paperType,
              timeLimit: exam.timeLimit,
              audioUrl: await resolveUrl(ctx, exam.audioUrl),
              description: exam.description,
              isPaid: exam.isPaid,
              createdAt: exam.createdAt,
            }) as TopikExamDto
        )
      );

      return {
        ...results,
        page: pageWithUrls,
      };
    }

    const exams: Awaited<ReturnType<typeof query.paginate>>['page'] = [];
    let cursor: string | null = null;
    do {
      const batch = await query.paginate({ numItems: 200, cursor });
      exams.push(...batch.page);
      cursor = batch.isDone ? null : batch.continueCursor;
    } while (cursor);

    return Promise.all(
      exams.map(
        async exam =>
          ({
            id: exam.legacyId,
            _id: exam._id,
            title: exam.title,
            round: exam.round,
            type: exam.type,
            paperType: exam.paperType,
            timeLimit: exam.timeLimit,
            audioUrl: await resolveUrl(ctx, exam.audioUrl),
            description: exam.description,
            isPaid: exam.isPaid,
            createdAt: exam.createdAt,
            // No questions array - loaded separately
          }) as TopikExamDto
      )
    );
  },
});

// Get single exam by legacy ID
export const getExamById = query({
  args: {
    examId: v.string(), // Legacy ID like "exam-123456"
  },
  handler: async (ctx, args): Promise<TopikExamDto | null> => {
    const exam = await ctx.db
      .query('topik_exams')
      .withIndex('by_legacy_id', q => q.eq('legacyId', args.examId))
      .first();

    if (!exam) return null;

    return {
      id: exam.legacyId,
      _id: exam._id,
      title: exam.title,
      round: exam.round,
      type: exam.type,
      paperType: exam.paperType,
      timeLimit: exam.timeLimit,
      audioUrl: await resolveUrl(ctx, exam.audioUrl),
      description: exam.description,
      isPaid: exam.isPaid,
      createdAt: exam.createdAt,
    };
  },
});

// Get questions for an exam
export const getExamQuestions = query({
  args: {
    examId: v.string(), // Legacy ID
  },
  handler: async (ctx, args): Promise<TopikQuestionDto[]> => {
    // Find exam by legacy ID
    const exam = await ctx.db
      .query('topik_exams')
      .withIndex('by_legacy_id', q => q.eq('legacyId', args.examId))
      .first();

    if (!exam) return [];

    // Get all questions for this exam
    const questions = await ctx.db
      .query('topik_questions')
      .withIndex('by_exam', q => q.eq('examId', exam._id))
      .collect();

    // Sort by number and format for frontend
    const sortedQuestions = questions.slice().sort((a, b) => a.number - b.number);

    return Promise.all(
      sortedQuestions.map(async q => ({
        id: q.number,
        number: q.number,
        passage: q.passage || '',
        question: q.question,
        contextBox: q.contextBox,
        options: q.options,
        correctAnswer: q.correctAnswer,
        image: await resolveUrl(ctx, q.image),
        optionImages: q.optionImages
          ? ((await Promise.all(q.optionImages.map(img => resolveUrl(ctx, img)))) as string[])
          : undefined,
        explanation: q.explanation,
        score: q.score,
        instruction: q.instruction,
        layout: q.layout,
        groupCount: q.groupCount,
      }))
    );
  },
});

// ============================================
// Exam Session Management (Server-Side Timer)
// ============================================

// Start an exam session - creates session with fixed endTime
export const startExam = mutation({
  args: {
    examId: v.string(), // Legacy ID
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    // Find the exam by legacy ID
    const exam = await ctx.db
      .query('topik_exams')
      .withIndex('by_legacy_id', q => q.eq('legacyId', args.examId))
      .first();

    if (!exam) {
      throw new ConvexError({ code: 'EXAM_NOT_FOUND' });
    }

    // Check if an active session already exists for this user+exam
    const existingSession = await ctx.db
      .query('exam_sessions')
      .withIndex('by_user_exam', q => q.eq('userId', userId).eq('examId', exam._id))
      .first();

    if (existingSession?.status === 'IN_PROGRESS') {
      // Return existing active session
      return {
        sessionId: existingSession._id,
        startTime: existingSession.startTime,
        endTime: existingSession.endTime,
        answers: existingSession.answers || {},
        status: existingSession.status,
        resuming: true,
      };
    }

    // Calculate times
    const now = Date.now();
    const durationMs = (exam.timeLimit || 70) * 60 * 1000; // Convert minutes to ms
    const endTime = now + durationMs;

    // Create new session
    const sessionId = await ctx.db.insert('exam_sessions', {
      userId: userId,
      examId: exam._id,
      status: 'IN_PROGRESS',
      startTime: now,
      endTime,
      answers: {},
      createdAt: now,
    });

    // Schedule auto-submit job at endTime
    const scheduledJobId = await ctx.scheduler.runAt(endTime, autoSubmitMutation, { sessionId });

    // Update session with scheduled job ID
    await ctx.db.patch(sessionId, { scheduledJobId });

    return {
      sessionId,
      startTime: now,
      endTime,
      answers: {},
      status: 'IN_PROGRESS',
      resuming: false,
    };
  },
});

// Get current session for an exam
export const getSession = query({
  args: {
    examId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    // Find exam
    const exam = await ctx.db
      .query('topik_exams')
      .withIndex('by_legacy_id', q => q.eq('legacyId', args.examId))
      .first();
    if (!exam) return null;

    // Find user
    let user = await ctx.db
      .query('users')
      .withIndex('by_token', q => q.eq('token', identity.subject))
      .first();
    user ??= await ctx.db
      .query('users')
      .withIndex('by_postgresId', q => q.eq('postgresId', identity.subject))
      .first();
    if (!user) return null;

    // Find session
    const session = await ctx.db
      .query('exam_sessions')
      .withIndex('by_user_exam', q => q.eq('userId', user._id).eq('examId', exam._id))
      .first();

    if (!session) return null;

    return {
      sessionId: session._id,
      status: session.status,
      startTime: session.startTime,
      endTime: session.endTime,
      answers: session.answers || {},
      score: session.score,
      completedAt: session.completedAt,
    };
  },
});

// Update answers during exam (saves progress)
export const updateAnswers = mutation({
  args: {
    sessionId: v.id('exam_sessions'),
    answers: v.any(), // { [questionNumber]: selectedOption }
  },
  handler: async (ctx, args) => {
    await getAuthUserId(ctx); // Verify authentication

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new ConvexError({ code: 'SESSION_NOT_FOUND' });
    }

    // Verify session is still in progress
    if (session.status !== 'IN_PROGRESS') {
      throw new ConvexError({ code: 'SESSION_ALREADY_COMPLETED' });
    }

    // Verify time hasn't expired
    if (Date.now() > session.endTime) {
      throw new ConvexError({ code: 'SESSION_EXPIRED' });
    }

    // Update answers
    await ctx.db.patch(args.sessionId, { answers: args.answers });

    return { success: true };
  },
});

// Submit exam manually (before timer expires)
export const submitExam = mutation({
  args: {
    sessionId: v.id('exam_sessions'),
    answers: v.any(),
  },
  handler: async (ctx, args) => {
    await getAuthUserId(ctx); // Verify authentication

    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new ConvexError({ code: 'SESSION_NOT_FOUND' });
    }

    if (session.status !== 'IN_PROGRESS') {
      throw new ConvexError({ code: 'SESSION_ALREADY_COMPLETED' });
    }

    // Get exam and questions to calculate score
    const exam = await ctx.db.get(session.examId);
    if (!exam) {
      throw new ConvexError({ code: 'EXAM_NOT_FOUND' });
    }

    const questions = await ctx.db
      .query('topik_questions')
      .withIndex('by_exam', q => q.eq('examId', exam._id))
      .collect();

    // Calculate score
    let score = 0;
    const answers = args.answers || {};
    for (const q of questions) {
      if (answers[q.number] === q.correctAnswer) {
        score += q.score;
      }
    }

    // Mark session as completed
    const now = Date.now();
    await ctx.db.patch(args.sessionId, {
      status: 'COMPLETED',
      answers,
      score,
      completedAt: now,
    });

    // Cancel the scheduled auto-submit if it exists
    if (session.scheduledJobId) {
      try {
        await ctx.scheduler.cancel(session.scheduledJobId);
      } catch (e) {
        // Job may have already run or been cancelled
        console.warn('Could not cancel scheduled job:', e);
      }
    }

    return {
      success: true,
      score,
      totalQuestions: questions.length,
      completedAt: now,
    };
  },
});

// Internal mutation for auto-submit (called by scheduler)
export const autoSubmit = internalMutation({
  args: {
    sessionId: v.id('exam_sessions'),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      console.log('[autoSubmit] Session not found:', args.sessionId);
      return;
    }

    // Only auto-submit if still in progress
    if (session.status !== 'IN_PROGRESS') {
      console.log('[autoSubmit] Session already completed:', session.status);
      return;
    }

    // Get exam and questions
    const exam = await ctx.db.get(session.examId);
    if (!exam) {
      console.log('[autoSubmit] Exam not found');
      return;
    }

    const questions = await ctx.db
      .query('topik_questions')
      .withIndex('by_exam', q => q.eq('examId', exam._id))
      .collect();

    // Calculate score from saved answers
    let score = 0;
    const answers = session.answers || {};
    for (const q of questions) {
      if (answers[q.number] === q.correctAnswer) {
        score += q.score;
      }
    }

    // Mark as auto-submitted
    await ctx.db.patch(args.sessionId, {
      status: 'AUTO_SUBMITTED',
      score,
      completedAt: Date.now(),
    });

    console.log('[autoSubmit] Session auto-submitted:', args.sessionId, 'Score:', score);
  },
});

// ============================================
// Admin Functions (CRUD)
// ============================================

// Save exam (create or update) with questions
export const saveExam = mutation({
  args: {
    id: v.string(), // Legacy ID
    title: v.string(),
    round: v.number(),
    type: v.string(),
    paperType: v.optional(v.string()),
    timeLimit: v.number(),
    audioUrl: v.optional(v.string()),
    description: v.optional(v.string()),
    isPaid: v.optional(v.boolean()),
    questions: v.array(
      v.object({
        id: v.number(),
        number: v.optional(v.number()),
        passage: v.optional(v.string()),
        question: v.string(),
        contextBox: v.optional(v.string()),
        options: v.array(v.string()),
        correctAnswer: v.number(),
        image: v.optional(v.string()),
        optionImages: v.optional(v.array(v.string())),
        explanation: v.optional(v.string()),
        score: v.number(),
        instruction: v.optional(v.string()),
        layout: v.optional(v.string()),
        groupCount: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, questions, ...examData } = args;

    // Check if exam exists
    const exam = await ctx.db
      .query('topik_exams')
      .withIndex('by_legacy_id', q => q.eq('legacyId', id))
      .first();

    let examConvexId: Id<'topik_exams'>;

    if (exam) {
      // Update existing exam
      await ctx.db.patch(exam._id, {
        ...examData,
        isPaid: examData.isPaid ?? false,
      });
      examConvexId = exam._id;

      // Delete existing questions for this exam
      const existingQuestions = await ctx.db
        .query('topik_questions')
        .withIndex('by_exam', q => q.eq('examId', exam._id))
        .collect();

      await Promise.all(existingQuestions.map(q => ctx.db.delete(q._id)));
    } else {
      // Create new exam
      examConvexId = await ctx.db.insert('topik_exams', {
        legacyId: id,
        ...examData,
        isPaid: examData.isPaid ?? false,
        createdAt: Date.now(),
      });
    }

    // Insert all questions
    await Promise.all(
      questions.map(q =>
        ctx.db.insert('topik_questions', {
          examId: examConvexId,
          number: q.number ?? q.id,
          passage: q.passage,
          question: q.question,
          contextBox: q.contextBox,
          options: q.options,
          correctAnswer: q.correctAnswer,
          image: q.image,
          optionImages: q.optionImages,
          explanation: q.explanation,
          score: q.score,
          instruction: q.instruction,
          layout: q.layout,
          groupCount: q.groupCount,
        })
      )
    );

    return { success: true, examId: id };
  },
});

// Delete exam and all its questions
export const deleteExam = mutation({
  args: {
    examId: v.string(), // Legacy ID
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    // Find exam
    const exam = await ctx.db
      .query('topik_exams')
      .withIndex('by_legacy_id', q => q.eq('legacyId', args.examId))
      .first();

    if (!exam) {
      return { success: false, error: 'Exam not found' };
    }

    // Delete all questions first
    const questions = await ctx.db
      .query('topik_questions')
      .withIndex('by_exam', q => q.eq('examId', exam._id))
      .collect();

    await Promise.all(questions.map(q => ctx.db.delete(q._id)));

    // Delete exam
    await ctx.db.delete(exam._id);

    return { success: true };
  },
});

// Migration: Update Q46 question text for all exams
export const updateQ46QuestionText = mutation({
  args: {},
  handler: async ctx => {
    await requireAdmin(ctx);
    const newQuestionText = '위 글에서 <보기>의 글이 들어가기에 가장 알맞은 곳을 고르십시오.';

    // Get all Q46 questions across all exams
    const allQuestions = await ctx.db.query('topik_questions').collect();
    const q46Questions = allQuestions.filter(q => q.number === 46);

    console.log(`Found ${q46Questions.length} Q46 questions to update`);

    let updatedCount = 0;
    for (const q of q46Questions) {
      await ctx.db.patch(q._id, { question: newQuestionText });
      updatedCount++;
    }

    return {
      success: true,
      message: `Updated ${updatedCount} Q46 questions to: "${newQuestionText}"`,
    };
  },
});

// Diagnostic: Check for duplicate questions in an exam
export const checkExamQuestions = mutation({
  args: {
    round: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    // Find exam by round
    const exam = await ctx.db
      .query('topik_exams')
      .filter(q => q.eq(q.field('round'), args.round))
      .first();

    if (!exam) {
      return { success: false, error: `Exam with round ${args.round} not found` };
    }

    // Get all questions for this exam
    const questions = await ctx.db
      .query('topik_questions')
      .withIndex('by_exam', q => q.eq('examId', exam._id))
      .collect();

    // Check for duplicates by question number
    const numberCounts: Record<number, number> = {};
    const duplicates: number[] = [];

    for (const q of questions) {
      numberCounts[q.number] = (numberCounts[q.number] || 0) + 1;
      if (numberCounts[q.number] > 1) {
        duplicates.push(q.number);
      }
    }

    return {
      success: true,
      examId: exam.legacyId,
      examTitle: exam.title,
      totalQuestions: questions.length,
      questionNumbers: questions.map(q => q.number).sort((a, b) => a - b),
      duplicateNumbers: [...new Set(duplicates)],
      hasDuplicates: duplicates.length > 0,
    };
  },
});

// Fix: Remove duplicate questions from an exam
export const removeDuplicateQuestions = mutation({
  args: {
    round: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    // Find exam by round
    const exam = await ctx.db
      .query('topik_exams')
      .filter(q => q.eq(q.field('round'), args.round))
      .first();

    if (!exam) {
      return { success: false, error: `Exam with round ${args.round} not found` };
    }

    // Get all questions for this exam
    const questions = await ctx.db
      .query('topik_questions')
      .withIndex('by_exam', q => q.eq('examId', exam._id))
      .collect();

    // Find and remove duplicates (keep the first one for each number)
    const seen: Record<number, boolean> = {};
    let removedCount = 0;

    for (const q of questions) {
      if (seen[q.number]) {
        // This is a duplicate, remove it
        await ctx.db.delete(q._id);
        removedCount++;
      } else {
        seen[q.number] = true;
      }
    }

    return {
      success: true,
      message: `Removed ${removedCount} duplicate questions from exam round ${args.round}`,
      removedCount,
    };
  },
});

// Migration: Update Q39-41 for specific exam rounds (91, 96) - new format without 보기
export const updateQ39to41ForNewFormat = mutation({
  args: {
    round: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const newInstruction =
      '※ [39～41] 주어진 문장이 들어갈 곳으로 가장 알맞은 것을 고르십시오. (각 2점)';

    // Find exam by round
    const exam = await ctx.db
      .query('topik_exams')
      .filter(q => q.eq(q.field('round'), args.round))
      .first();

    if (!exam) {
      return { success: false, error: `Exam with round ${args.round} not found` };
    }

    // Get Q39-41 for this exam
    const questions = await ctx.db
      .query('topik_questions')
      .withIndex('by_exam', q => q.eq('examId', exam._id))
      .collect();

    const q39to41 = questions.filter(q => q.number >= 39 && q.number <= 41);

    let updatedCount = 0;
    for (const q of q39to41) {
      // Only update instruction - keep contextBox as is
      await ctx.db.patch(q._id, {
        instruction: newInstruction,
      });
      updatedCount++;
    }

    return {
      success: true,
      message: `Updated instruction for ${updatedCount} questions (Q39-41) for exam round ${args.round}`,
      examTitle: exam.title,
    };
  },
});
