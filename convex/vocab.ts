import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUserId, getOptionalAuthUserId, getUserByTokenOrId, requireAdmin } from "./utils";
import { DEFAULT_VOCAB_LIMIT } from "./queryLimits";

// Get Vocabulary Stats (Dashboard)
export const getStats = query({
    args: {
        courseId: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getOptionalAuthUserId(ctx);

        // 1. Get total words for course
        const MAX_STATS_LIMIT = 2000;
        const appearances = await ctx.db
            .query("vocabulary_appearances")
            .withIndex("by_course_unit", (q) => q.eq("courseId", args.courseId))
            .take(MAX_STATS_LIMIT);

        const total = appearances.length;

        // 2. Get user progress count
        let mastered = 0;
        if (userId) {
            const progress = await ctx.db
                .query("user_vocab_progress")
                .withIndex("by_user_word", q => q.eq("userId", userId)) // This might be inefficient if user has many words across courses
                // Ideally we filter by course, but progress doesn't have courseId directly.
                // We rely on matching wordIds from appearances.
                .collect();

            // OPTIMIZATION: Use a Set for faster lookup
            const courseWordIds = new Set(appearances.map(a => a.wordId));
            mastered = progress.filter(p => courseWordIds.has(p.wordId) && p.status === 'MASTERED').length;
        }

        return { total, mastered };
    },
});

// Get all vocabulary (Admin Dashboard - shows all words with course info)
export const getAll = query({
    args: {
        limit: v.optional(v.number()),
        courseId: v.optional(v.string()), // Optional filter by course
    },
    handler: async (ctx, args) => {
        const limit = args.limit || 1000;

        // 1. Get all words first (master dictionary)
        const words = await ctx.db.query("words").take(limit);

        // 2. Get all appearances to find course associations
        const appearances = await ctx.db.query("vocabulary_appearances").collect();

        // 3. Get all institutes for course name lookup
        const institutes = await ctx.db.query("institutes").collect();
        const courseNameMap = new Map(institutes.map(i => [i.id, i.name]));

        // 4. Build word -> courses map
        const wordCourseMap = new Map<string, { courseId: string; courseName: string; unitId: number }[]>();
        for (const app of appearances) {
            const wordId = app.wordId.toString();
            if (!wordCourseMap.has(wordId)) {
                wordCourseMap.set(wordId, []);
            }
            wordCourseMap.get(wordId)!.push({
                courseId: app.courseId,
                courseName: courseNameMap.get(app.courseId) || app.courseId,
                unitId: app.unitId,
            });
        }

        // 5. Filter by courseId if provided
        let filteredWords = words;
        if (args.courseId) {
            const courseWordIds = new Set(
                appearances
                    .filter(a => a.courseId === args.courseId)
                    .map(a => a.wordId.toString())
            );
            filteredWords = words.filter(w => courseWordIds.has(w._id.toString()));
        }

        // 6. Return words with course info
        return filteredWords.map(word => ({
            _id: word._id,
            id: word._id,
            word: word.word,
            meaning: word.meaning,
            partOfSpeech: word.partOfSpeech,
            hanja: word.hanja,
            pronunciation: word.pronunciation,
            audioUrl: word.audioUrl,
            // Course associations
            courses: wordCourseMap.get(word._id.toString()) || [],
            // Primary course (first one)
            courseId: wordCourseMap.get(word._id.toString())?.[0]?.courseId || '',
            courseName: wordCourseMap.get(word._id.toString())?.[0]?.courseName || '未分类',
            unitId: wordCourseMap.get(word._id.toString())?.[0]?.unitId || 0,
        }));
    },
});

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
        const limit = args.limit || DEFAULT_VOCAB_LIMIT;
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
        await requireAdmin(ctx);

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
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);

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

// Bulk Import (Admin)
export const bulkImport = mutation({
    args: {
        items: v.array(v.object({
            word: v.string(),
            meaning: v.string(),
            partOfSpeech: v.string(),
            hanja: v.optional(v.string()),

            courseId: v.string(),
            unitId: v.number(),
            exampleSentence: v.optional(v.string()),
            exampleMeaning: v.optional(v.string()),
            tips: v.optional(v.any()), // JSON
        })),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);

        let successCount = 0;
        let failedCount = 0;
        const errors: string[] = [];

        for (const item of args.items) {
            try {
                // 1. Upsert Word
                const existingWord = await ctx.db
                    .query("words")
                    .withIndex("by_word", (q) => q.eq("word", item.word))
                    .unique();

                let wordId;
                if (existingWord) {
                    wordId = existingWord._id;
                } else {
                    wordId = await ctx.db.insert("words", {
                        word: item.word,
                        meaning: item.meaning,
                        partOfSpeech: item.partOfSpeech,
                        hanja: item.hanja,
                        tips: item.tips,
                    });
                }

                // 2. Upsert Appearance
                const existingApp = await ctx.db
                    .query("vocabulary_appearances")
                    .withIndex("by_word_course_unit", (q) =>
                        q.eq("wordId", wordId).eq("courseId", item.courseId).eq("unitId", item.unitId)
                    )
                    .unique();

                if (!existingApp) {
                    await ctx.db.insert("vocabulary_appearances", {
                        wordId,
                        courseId: item.courseId,
                        unitId: item.unitId,
                        exampleSentence: item.exampleSentence,
                        exampleMeaning: item.exampleMeaning,
                        createdAt: Date.now(),
                    });
                } else {
                    if (item.exampleSentence) {
                        await ctx.db.patch(existingApp._id, {
                            exampleSentence: item.exampleSentence,
                            exampleMeaning: item.exampleMeaning,
                        });
                    }
                }
                successCount++;
            } catch (e: any) {
                failedCount++;
                errors.push(`${item.word}: ${e.message}`);
            }
        }

        return { success: true, results: { success: successCount, failed: failedCount, errors } };
    }
});
