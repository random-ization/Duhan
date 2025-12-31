import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

// Helper to resolve user ID safely (via Token or ID)
async function getUser(ctx: any, tokenOrId: string): Promise<Doc<"users"> | null> {
    // 1. Try by token (Preferred/Secure)
    const byToken = await ctx.db.query("users")
        .withIndex("by_token", q => q.eq("token", tokenOrId))
        .first();
    if (byToken) return byToken;

    // 2. Try as proper ID (Legacy/Internal)
    try {
        const user = await ctx.db.get(tokenOrId as Id<"users">);
        if (user) return user;
    } catch (e) {
        // invalid id format, ignore
    }

    // 3. Fallback to postgresId
    return await ctx.db.query("users")
        .withIndex("by_postgresId", q => q.eq("postgresId", tokenOrId))
        .first();
}

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
        const user = await getUser(ctx, token);
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
        const user = await getUser(ctx, token);
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
        const user = await getUser(ctx, token);
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
        const user = await getUser(ctx, token);
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
        const user = await getUser(ctx, token);
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
export const deleteExamAttempt = mutation({
    args: {
        attemptId: v.id("exam_attempts"),
    },
    handler: async (ctx, args) => {
        // TODO: In production, verify ownership via a token argument here too
        await ctx.db.delete(args.attemptId);
        return { success: true };
    }
});
