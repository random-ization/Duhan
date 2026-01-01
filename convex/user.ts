import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

import { getUserByTokenOrId } from "./utils";


// Save a word to user's personal list
export const saveSavedWord = mutation({
    args: {
        token: v.string(), // User Token
        korean: v.string(),
        english: v.string(),
        exampleSentence: v.optional(v.string()),
        exampleTranslation: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { token, korean, english, exampleSentence, exampleTranslation } = args;
        const user = await getUserByTokenOrId(ctx, token);
        if (!user) throw new ConvexError({ code: "USER_NOT_FOUND" });

        await ctx.db.insert("saved_words", {
            userId: user._id,
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
        token: v.string(),
        wordId: v.optional(v.string()), // ID if from vocab
        korean: v.string(),
        english: v.string(),
        context: v.optional(v.string()), // e.g. "ToPIK Exam"
    },
    handler: async (ctx, args) => {
        const { token, wordId, korean, english, context } = args;
        const user = await getUserByTokenOrId(ctx, token);
        if (!user) throw new ConvexError({ code: "USER_NOT_FOUND" });

        await ctx.db.insert("mistakes", {
            userId: user._id,
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
        token: v.string(),
        examId: v.string(),
        score: v.number(),
        totalQuestions: v.number(),
        sectionScores: v.optional(v.any()), // JSON object
        duration: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { token, examId, score, totalQuestions, sectionScores, duration } = args;
        const user = await getUserByTokenOrId(ctx, token);
        if (!user) throw new ConvexError({ code: "USER_NOT_FOUND" });

        await ctx.db.insert("exam_attempts", {
            userId: user._id,
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
        token: v.string(),
        activityType: v.string(), // VOCAB, READING, LISTENING, EXAM
        duration: v.optional(v.number()),
        itemsStudied: v.optional(v.number()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const { token, activityType, duration, itemsStudied, metadata } = args;
        const user = await getUserByTokenOrId(ctx, token);
        if (!user) throw new ConvexError({ code: "USER_NOT_FOUND" });

        await ctx.db.insert("activity_logs", {
            userId: user._id,
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
        token: v.string(),
        lastInstitute: v.optional(v.string()),
        lastLevel: v.optional(v.number()),
        lastUnit: v.optional(v.number()),
        lastModule: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { token, lastInstitute, lastLevel, lastUnit, lastModule } = args;
        const user = await getUserByTokenOrId(ctx, token);
        if (!user) throw new ConvexError({ code: "USER_NOT_FOUND" });

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
        token: v.optional(v.string()), // Require token for auth
        attemptId: v.id("exam_attempts"),
    },
    handler: async (ctx, args) => {
        // 1. Authenticate (Unified)
        // getUserByTokenOrId handles both explicit token and context auth fallback
        const user = await getUserByTokenOrId(ctx, args.token);

        if (!user) {
            throw new ConvexError({ code: "UNAUTHORIZED" });
        }

        // 2. Fetch Attempt
        const attempt = await ctx.db.get(args.attemptId);
        if (!attempt) {
            return { success: false, error: "Attempt not found" };
        }

        // 3. Verify Ownership
        if (attempt.userId !== user._id) {
            throw new ConvexError({ code: "FORBIDDEN", message: "You can only delete your own attempts" });
        }

        // 4. Delete
        await ctx.db.delete(args.attemptId);
        return { success: true };
    }
});
