import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

// Helper to resolve user ID safely
async function getUser(ctx: any, userId: string): Promise<Doc<"users"> | null> {
    // Try as proper ID first
    try {
        const user = await ctx.db.get(userId as Id<"users">);
        if (user) return user;
    } catch (e) {
        // invalid id format, ignore
    }

    // Fallback to postgresId
    return await ctx.db.query("users")
        .withIndex("by_postgresId", q => q.eq("postgresId", userId))
        .first();
}

// Save a word to user's personal list
export const saveSavedWord = mutation({
    args: {
        userId: v.string(),
        korean: v.string(),
        english: v.string(),
        exampleSentence: v.optional(v.string()),
        exampleTranslation: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { userId, korean, english, exampleSentence, exampleTranslation } = args;
        const user = await getUser(ctx, userId);
        if (!user) throw new Error("User not found");

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
        userId: v.string(),
        wordId: v.optional(v.string()), // ID if from vocab
        korean: v.string(),
        english: v.string(),
        context: v.optional(v.string()), // e.g. "ToPIK Exam"
    },
    handler: async (ctx, args) => {
        const { userId, wordId, korean, english, context } = args;
        const user = await getUser(ctx, userId);
        if (!user) throw new Error("User not found");

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
        userId: v.string(),
        examId: v.string(),
        score: v.number(),
        totalQuestions: v.number(),
        sectionScores: v.optional(v.any()), // JSON object
        duration: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { userId, examId, score, totalQuestions, sectionScores, duration } = args;
        const user = await getUser(ctx, userId);
        if (!user) throw new Error("User not found");

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
        userId: v.string(),
        activityType: v.string(), // VOCAB, READING, LISTENING, EXAM
        duration: v.optional(v.number()),
        itemsStudied: v.optional(v.number()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const { userId, activityType, duration, itemsStudied, metadata } = args;
        const user = await getUser(ctx, userId);
        if (!user) throw new Error("User not found");

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
        userId: v.string(),
        lastInstitute: v.optional(v.string()),
        lastLevel: v.optional(v.number()),
        lastUnit: v.optional(v.number()),
        lastModule: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { userId, lastInstitute, lastLevel, lastUnit, lastModule } = args;
        const user = await getUser(ctx, userId);
        if (!user) throw new Error("User not found");

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
export const deleteExamAttempt = mutation({
    args: {
        attemptId: v.id("exam_attempts"),
    },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.attemptId);
        return { success: true };
    }
});
