import { mutation, query, internalMutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import { getAuthUserId } from "./utils";

// ============================================
// TOPIK Exam CRUD Functions
// ============================================

// Get all exams (metadata only, no questions)
export const getExams = query({
    args: {},
    handler: async (ctx) => {
        const exams = await ctx.db.query("topik_exams")
            .order("desc")
            .collect();

        return exams.map(exam => ({
            id: exam.legacyId,
            _id: exam._id,
            title: exam.title,
            round: exam.round,
            type: exam.type,
            paperType: exam.paperType,
            timeLimit: exam.timeLimit,
            audioUrl: exam.audioUrl,
            description: exam.description,
            isPaid: exam.isPaid,
            createdAt: exam.createdAt,
            // No questions array - loaded separately
        }));
    }
});

// Get single exam by legacy ID
export const getExamById = query({
    args: {
        examId: v.string(), // Legacy ID like "exam-123456"
    },
    handler: async (ctx, args) => {
        const exam = await ctx.db.query("topik_exams")
            .withIndex("by_legacy_id", q => q.eq("legacyId", args.examId))
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
            audioUrl: exam.audioUrl,
            description: exam.description,
            isPaid: exam.isPaid,
            createdAt: exam.createdAt,
        };
    }
});

// Get questions for an exam
export const getExamQuestions = query({
    args: {
        examId: v.string(), // Legacy ID
    },
    handler: async (ctx, args) => {
        // Find exam by legacy ID
        const exam = await ctx.db.query("topik_exams")
            .withIndex("by_legacy_id", q => q.eq("legacyId", args.examId))
            .first();

        if (!exam) return [];

        // Get all questions for this exam
        const questions = await ctx.db.query("topik_questions")
            .withIndex("by_exam", q => q.eq("examId", exam._id))
            .collect();

        // Sort by number and format for frontend
        return questions
            .sort((a, b) => a.number - b.number)
            .map(q => ({
                id: q.number,
                number: q.number,
                passage: q.passage || "",
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
            }));
    }
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
        const exam = await ctx.db.query("topik_exams")
            .withIndex("by_legacy_id", q => q.eq("legacyId", args.examId))
            .first();

        if (!exam) {
            throw new ConvexError({ code: "EXAM_NOT_FOUND" });
        }

        // Find user by token/subject
        let user = await ctx.db.query("users")
            .withIndex("by_token", q => q.eq("token", userId))
            .first();
        if (!user) {
            user = await ctx.db.query("users")
                .withIndex("by_postgresId", q => q.eq("postgresId", userId))
                .first();
        }
        if (!user) {
            throw new ConvexError({ code: "USER_NOT_FOUND" });
        }

        // Check if an active session already exists for this user+exam
        const existingSession = await ctx.db.query("exam_sessions")
            .withIndex("by_user_exam", q => q.eq("userId", user!._id).eq("examId", exam._id))
            .first();

        if (existingSession && existingSession.status === "IN_PROGRESS") {
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
        const sessionId = await ctx.db.insert("exam_sessions", {
            userId: user._id,
            examId: exam._id,
            status: "IN_PROGRESS",
            startTime: now,
            endTime,
            answers: {},
            createdAt: now,
        });

        // Schedule auto-submit job at endTime
        const scheduledJobId = await ctx.scheduler.runAt(
            endTime,
            internal.topik.autoSubmit,
            { sessionId }
        );

        // Update session with scheduled job ID
        await ctx.db.patch(sessionId, { scheduledJobId });

        return {
            sessionId,
            startTime: now,
            endTime,
            answers: {},
            status: "IN_PROGRESS",
            resuming: false,
        };
    }
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
        const exam = await ctx.db.query("topik_exams")
            .withIndex("by_legacy_id", q => q.eq("legacyId", args.examId))
            .first();
        if (!exam) return null;

        // Find user
        let user = await ctx.db.query("users")
            .withIndex("by_token", q => q.eq("token", identity.subject))
            .first();
        if (!user) {
            user = await ctx.db.query("users")
                .withIndex("by_postgresId", q => q.eq("postgresId", identity.subject))
                .first();
        }
        if (!user) return null;

        // Find session
        const session = await ctx.db.query("exam_sessions")
            .withIndex("by_user_exam", q => q.eq("userId", user!._id).eq("examId", exam._id))
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
    }
});

// Update answers during exam (saves progress)
export const updateAnswers = mutation({
    args: {
        sessionId: v.id("exam_sessions"),
        answers: v.any(), // { [questionNumber]: selectedOption }
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);

        const session = await ctx.db.get(args.sessionId);
        if (!session) {
            throw new ConvexError({ code: "SESSION_NOT_FOUND" });
        }

        // Verify session is still in progress
        if (session.status !== "IN_PROGRESS") {
            throw new ConvexError({ code: "SESSION_ALREADY_COMPLETED" });
        }

        // Verify time hasn't expired
        if (Date.now() > session.endTime) {
            throw new ConvexError({ code: "SESSION_EXPIRED" });
        }

        // Update answers
        await ctx.db.patch(args.sessionId, { answers: args.answers });

        return { success: true };
    }
});

// Submit exam manually (before timer expires)
export const submitExam = mutation({
    args: {
        sessionId: v.id("exam_sessions"),
        answers: v.any(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);

        const session = await ctx.db.get(args.sessionId);
        if (!session) {
            throw new ConvexError({ code: "SESSION_NOT_FOUND" });
        }

        if (session.status !== "IN_PROGRESS") {
            throw new ConvexError({ code: "SESSION_ALREADY_COMPLETED" });
        }

        // Get exam and questions to calculate score
        const exam = await ctx.db.get(session.examId);
        if (!exam) {
            throw new ConvexError({ code: "EXAM_NOT_FOUND" });
        }

        const questions = await ctx.db.query("topik_questions")
            .withIndex("by_exam", q => q.eq("examId", exam._id))
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
            status: "COMPLETED",
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
                console.warn("Could not cancel scheduled job:", e);
            }
        }

        return {
            success: true,
            score,
            totalQuestions: questions.length,
            completedAt: now,
        };
    }
});

// Internal mutation for auto-submit (called by scheduler)
export const autoSubmit = internalMutation({
    args: {
        sessionId: v.id("exam_sessions"),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) {
            console.log("[autoSubmit] Session not found:", args.sessionId);
            return;
        }

        // Only auto-submit if still in progress
        if (session.status !== "IN_PROGRESS") {
            console.log("[autoSubmit] Session already completed:", session.status);
            return;
        }

        // Get exam and questions
        const exam = await ctx.db.get(session.examId);
        if (!exam) {
            console.log("[autoSubmit] Exam not found");
            return;
        }

        const questions = await ctx.db.query("topik_questions")
            .withIndex("by_exam", q => q.eq("examId", exam._id))
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
            status: "AUTO_SUBMITTED",
            score,
            completedAt: Date.now(),
        });

        console.log("[autoSubmit] Session auto-submitted:", args.sessionId, "Score:", score);
    }
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
        questions: v.array(v.object({
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
        })),
    },
    handler: async (ctx, args) => {
        const { id, questions, ...examData } = args;

        // Check if exam exists
        let exam = await ctx.db.query("topik_exams")
            .withIndex("by_legacy_id", q => q.eq("legacyId", id))
            .first();

        let examConvexId: any;

        if (exam) {
            // Update existing exam
            await ctx.db.patch(exam._id, {
                ...examData,
                isPaid: examData.isPaid ?? false,
            });
            examConvexId = exam._id;

            // Delete existing questions for this exam
            const existingQuestions = await ctx.db.query("topik_questions")
                .withIndex("by_exam", q => q.eq("examId", exam._id))
                .collect();

            await Promise.all(existingQuestions.map(q => ctx.db.delete(q._id)));
        } else {
            // Create new exam
            examConvexId = await ctx.db.insert("topik_exams", {
                legacyId: id,
                ...examData,
                isPaid: examData.isPaid ?? false,
                createdAt: Date.now(),
            });
        }

        // Insert all questions
        await Promise.all(questions.map(q =>
            ctx.db.insert("topik_questions", {
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
        ));

        return { success: true, examId: id };
    }
});

// Delete exam and all its questions
export const deleteExam = mutation({
    args: {
        examId: v.string(), // Legacy ID
    },
    handler: async (ctx, args) => {
        // Find exam
        const exam = await ctx.db.query("topik_exams")
            .withIndex("by_legacy_id", q => q.eq("legacyId", args.examId))
            .first();

        if (!exam) {
            return { success: false, error: "Exam not found" };
        }

        // Delete all questions first
        const questions = await ctx.db.query("topik_questions")
            .withIndex("by_exam", q => q.eq("examId", exam._id))
            .collect();

        await Promise.all(questions.map(q => ctx.db.delete(q._id)));

        // Delete exam
        await ctx.db.delete(exam._id);

        return { success: true };
    }
});

