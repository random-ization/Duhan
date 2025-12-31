import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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

            for (const q of existingQuestions) {
                await ctx.db.delete(q._id);
            }
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
        for (const q of questions) {
            await ctx.db.insert("topik_questions", {
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
            });
        }

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

        for (const q of questions) {
            await ctx.db.delete(q._id);
        }

        // Delete exam
        await ctx.db.delete(exam._id);

        return { success: true };
    }
});
