import { mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";

import { getAuthUserId } from "./utils";


// Save a word to user's personal list
export const saveSavedWord = mutation({
    args: {
        korean: v.string(),
        english: v.string(),
        exampleSentence: v.optional(v.string()),
        exampleTranslation: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        const user = await ctx.db.get(userId as any);
        if (!user) throw new ConvexError({ code: "USER_NOT_FOUND" });

        const { korean, english, exampleSentence, exampleTranslation } = args;

        await ctx.db.insert("saved_words", {
            userId,
            korean,
            english,
            exampleSentence,
            exampleTranslation,
            createdAt: Date.now(),
        });
        return { success: true };
    }
});

// Log a mistake
export const saveMistake = mutation({
    args: {
        wordId: v.optional(v.id("words")), // ID if from vocab
        korean: v.string(),
        english: v.string(),
        context: v.optional(v.string()), // e.g. "ToPIK Exam"
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        const user = await ctx.db.get(userId as any);
        if (!user) throw new ConvexError({ code: "USER_NOT_FOUND" });

        const { wordId, korean, english, context } = args;

        await ctx.db.insert("mistakes", {
            userId,
            wordId,
            korean,
            english,
            context,
            reviewCount: 0,
            createdAt: Date.now(),
        });

        return { success: true };
    }
});

// Save Exam Attempt
export const saveExamAttempt = mutation({
    args: {
        examId: v.id("topik_exams"),
        score: v.number(),
        totalQuestions: v.number(),
        sectionScores: v.optional(v.any()), // JSON object
        duration: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        const user = await ctx.db.get(userId as any);
        if (!user) throw new ConvexError({ code: "USER_NOT_FOUND" });

        const { examId, score, totalQuestions, sectionScores, duration } = args;

        await ctx.db.insert("exam_attempts", {
            userId,
            examId,
            score,
            totalQuestions,
            sectionScores,
            duration,
            createdAt: Date.now(),
        });

        return { success: true };
    }
});

// Log User Activity
export const logActivity = mutation({
    args: {
        activityType: v.string(), // VOCAB, READING, LISTENING, EXAM
        duration: v.optional(v.number()),
        itemsStudied: v.optional(v.number()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        const user = await ctx.db.get(userId as any);
        if (!user) throw new ConvexError({ code: "USER_NOT_FOUND" });

        const { activityType, duration, itemsStudied, metadata } = args;

        await ctx.db.insert("activity_logs", {
            userId,
            activityType,
            duration,
            itemsStudied,
            metadata,
            createdAt: Date.now(),
        });

        return { success: true };
    }
});

// Update Learning Progress (Last Accessed)
export const updateLearningProgress = mutation({
    args: {
        lastInstitute: v.optional(v.string()),
        lastLevel: v.optional(v.number()),
        lastUnit: v.optional(v.number()),
        lastModule: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        const user = await ctx.db.get(userId as any);
        if (!user) throw new ConvexError({ code: "USER_NOT_FOUND" });

        const { lastInstitute, lastLevel, lastUnit, lastModule } = args;

        const updates: any = {};
        if (lastInstitute) updates.lastInstitute = lastInstitute;
        if (lastLevel) updates.lastLevel = lastLevel;
        if (lastUnit !== undefined) updates.lastUnit = lastUnit;
        if (lastModule) updates.lastModule = lastModule;

        await ctx.db.patch(user._id, updates);

        return { success: true };
    }
});

// Delete Exam Attempt
// Delete Exam Attempt
export const deleteExamAttempt = mutation({
    args: {
        attemptId: v.id("exam_attempts"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);

        // 2. Fetch Attempt
        const attempt = await ctx.db.get(args.attemptId);
        if (!attempt) {
            return { success: false, error: "Attempt not found" };
        }

        // 3. Verify Ownership
        if (attempt.userId !== userId) {
            throw new ConvexError({ code: "FORBIDDEN", message: "You can only delete your own attempts" });
        }

        // 4. Delete
        await ctx.db.delete(args.attemptId);
        return { success: true };
    }
});
