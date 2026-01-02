import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUserId, getOptionalAuthUserId, getUserByTokenOrId } from "./utils";

// Get all vocabulary for a course (Admin List or Module view)
// OPTIMIZATION: Added limit to prevent excessive queries
export const getOfCourse = query({
    args: {
        courseId: v.string(),
        userId: v.optional(v.string()), // Accept token or ID
        limit: v.optional(v.number()), // Optional limit
    },
    handler: async (ctx, args) => {
        // Get user identity (try explicit arg first, then native auth)
        const user = await getUserByTokenOrId(ctx, args.userId);
        const userId = user ? user._id : null;

        // 1. Get appearances with optional limit
        const limit = args.limit || 500; // Default reasonable limit
        const appearances = await ctx.db
            .query("vocabulary_appearances")
            .withIndex("by_course_unit", (q) => q.eq("courseId", args.courseId))
            .take(limit);

        // 2. Fetch linked Words and User Progress
        const wordsWithData = await Promise.all(
            appearances.map(async (app) => {
                const [word, progress] = await Promise.all([
                    ctx.db.get(app.wordId),
                    userId
                        ? ctx.db
                            .query("user_vocab_progress")
                            .withIndex("by_user_word", (q) => q.eq("userId", userId).eq("wordId", app.wordId))
                            .unique()
                        : Promise.resolve(null),
                ]);

                if (!word) return null;

                return {
                    ...word,
                    // Merge appearance data
                    exampleSentence: app.exampleSentence,
                    exampleMeaning: app.exampleMeaning,
                    unitId: app.unitId,
                    courseId: app.courseId,
                    // Merge progress data (normalized structure for frontend)
                    progress: progress ? {
                        id: progress._id,
                        status: progress.status,
                        interval: progress.interval,
                        streak: progress.streak,
                        nextReviewAt: progress.nextReviewAt,
                    } : null,
                    mastered: progress?.status === 'MASTERED' || false,
                };
            })
        );

        return wordsWithData.filter((w) => w !== null);
    },
});

// Save a word (Upsert Logic - Admin)
export const saveWord = mutation({
    args: {
        word: v.string(),
        meaning: v.string(),
        partOfSpeech: v.string(),
        hanja: v.optional(v.string()),
        pronunciation: v.optional(v.string()),

        // Appearance context
        courseId: v.string(),
        unitId: v.number(),
        exampleSentence: v.optional(v.string()),
        exampleMeaning: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // 1. Check if Word exists (Master Dictionary)
        const existingWord = await ctx.db
            .query("words")
            .withIndex("by_word", (q) => q.eq("word", args.word))
            .unique();

        let wordId;
        if (existingWord) {
            wordId = existingWord._id;
            // Optional: Update meaning if needed? For now, assume master word is stable or update it
            await ctx.db.patch(wordId, {
                meaning: args.meaning,
                partOfSpeech: args.partOfSpeech,
                hanja: args.hanja,
                pronunciation: args.pronunciation,
            });
        } else {
            wordId = await ctx.db.insert("words", {
                word: args.word,
                meaning: args.meaning,
                partOfSpeech: args.partOfSpeech,
                hanja: args.hanja,
                pronunciation: args.pronunciation,
            });
        }

        // 2. Upsert Appearance (Link to Course/Unit)
        const existingApp = await ctx.db
            .query("vocabulary_appearances")
            .withIndex("by_word_course_unit", (q) =>
                q.eq("wordId", wordId).eq("courseId", args.courseId).eq("unitId", args.unitId)
            )
            .unique();

        if (existingApp) {
            await ctx.db.patch(existingApp._id, {
                exampleSentence: args.exampleSentence,
                exampleMeaning: args.exampleMeaning,
            });
        } else {
            await ctx.db.insert("vocabulary_appearances", {
                wordId,
                courseId: args.courseId,
                unitId: args.unitId,
                exampleSentence: args.exampleSentence,
                exampleMeaning: args.exampleMeaning,
                createdAt: Date.now(),
            });
        }
    },
});

// Update User Progress (SRS)
export const updateProgress = mutation({
    args: {
        wordId: v.id("words"),
        quality: v.number(), // 0-5
        userId: v.optional(v.string()), // Token or ID
    },
    handler: async (ctx, args) => {
        const user = await getUserByTokenOrId(ctx, args.userId);
        if (!user) throw new ConvexError({ code: "UNAUTHORIZED" });
        const userId = user._id;

        const { wordId, quality } = args;
        const now = Date.now();

        const existingProgress = await ctx.db
            .query("user_vocab_progress")
            .withIndex("by_user_word", (q) => q.eq("userId", userId).eq("wordId", wordId))
            .unique();

        let status = "LEARNING";
        let interval = 1;
        let streak = 0;

        // Simple SRS Logic
        if (existingProgress) {
            // Update existing
            if (quality >= 4) {
                // Correct
                streak = existingProgress.streak + 1;
                interval = existingProgress.interval * 2; // Simple exponential
                status = interval > 30 ? "MASTERED" : "REVIEW";
            } else {
                // Wrong
                streak = 0;
                interval = 1;
                status = "LEARNING";
            }

            await ctx.db.patch(existingProgress._id, {
                status,
                interval,
                streak,
                lastReviewedAt: now,
                nextReviewAt: now + (interval * 24 * 60 * 60 * 1000),
            });
        } else {
            // Create new
            if (quality >= 4) {
                streak = 1;
                interval = 1; // Start with 1 day
                status = "LEARNING";
            } else {
                streak = 0;
                interval = 0.5; // Half day for immediate fail
                status = "NEW";
            }

            await ctx.db.insert("user_vocab_progress", {
                userId,
                wordId,
                status,
                interval,
                streak,
                lastReviewedAt: now,
                nextReviewAt: now + (interval * 24 * 60 * 60 * 1000),
            });
        }
    },
});
