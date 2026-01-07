import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUserId, getOptionalAuthUserId, requireAdmin } from "./utils";
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
                .withIndex("by_user_word", q => q.eq("userId", userId as any)) // This might be inefficient if user has many words across courses
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

        // 1. Get all institutes for course name lookup
        const institutes = await ctx.db.query("institutes").collect();
        const courseNameMap = new Map(institutes.map(i => [i.id, i.name]));

        // 2. If courseId is provided, filter via appearances FIRST (before limit)
        if (args.courseId) {
            const appearances = await ctx.db
                .query("vocabulary_appearances")
                .withIndex("by_course_unit", q => q.eq("courseId", args.courseId))
                .take(limit);

            // Fetch unique words for these appearances
            const wordIds = [...new Set(appearances.map(a => a.wordId))];
            const wordsArray = await Promise.all(wordIds.map(id => ctx.db.get(id)));
            const wordsMap = new Map(wordsArray.filter(Boolean).map(w => [w!._id.toString(), w!]));

            // Return one entry PER APPEARANCE (not per unique word)
            return appearances.map(app => {
                const word = wordsMap.get(app.wordId.toString());
                if (!word) return null;
                return {
                    _id: word._id,
                    id: word._id,
                    word: word.word,
                    // Per-course meanings (fallback to word if appearance doesn't have it)
                    meaning: app.meaning || word.meaning,
                    meaningEn: app.meaningEn || word.meaningEn,
                    meaningVi: app.meaningVi || word.meaningVi,
                    meaningMn: app.meaningMn || word.meaningMn,
                    partOfSpeech: word.partOfSpeech,
                    hanja: word.hanja,
                    pronunciation: word.pronunciation,
                    audioUrl: word.audioUrl,
                    courseId: args.courseId,
                    courseName: courseNameMap.get(args.courseId!) || args.courseId,
                    unitId: app.unitId || 0,
                    exampleSentence: app.exampleSentence,
                    exampleMeaning: app.exampleMeaning,
                    exampleMeaningEn: app.exampleMeaningEn,
                    exampleMeaningVi: app.exampleMeaningVi,
                    exampleMeaningMn: app.exampleMeaningMn,
                    appearanceId: app._id,
                };
            }).filter(Boolean);
        }

        // 3. No courseId filter: get all words with course associations
        const words = await ctx.db.query("words").take(limit);
        const appearances = await ctx.db.query("vocabulary_appearances").collect();

        // Build word -> appearance data map (use first appearance for display)
        const wordAppMap = new Map<string, typeof appearances[0]>();
        const wordCourseMap = new Map<string, { courseId: string; courseName: string; unitId: number }[]>();
        for (const app of appearances) {
            const wordId = app.wordId.toString();
            if (!wordAppMap.has(wordId)) {
                wordAppMap.set(wordId, app);
            }
            if (!wordCourseMap.has(wordId)) {
                wordCourseMap.set(wordId, []);
            }
            wordCourseMap.get(wordId)!.push({
                courseId: app.courseId,
                courseName: courseNameMap.get(app.courseId) || app.courseId,
                unitId: app.unitId,
            });
        }

        return words.map(word => {
            const app = wordAppMap.get(word._id.toString());
            return {
                _id: word._id,
                id: word._id,
                word: word.word,
                meaning: word.meaning,
                meaningEn: word.meaningEn,
                meaningVi: word.meaningVi,
                meaningMn: word.meaningMn,
                partOfSpeech: word.partOfSpeech,
                hanja: word.hanja,
                pronunciation: word.pronunciation,
                audioUrl: word.audioUrl,
                courses: wordCourseMap.get(word._id.toString()) || [],
                courseId: wordCourseMap.get(word._id.toString())?.[0]?.courseId || '',
                courseName: wordCourseMap.get(word._id.toString())?.[0]?.courseName || '未分类',
                unitId: wordCourseMap.get(word._id.toString())?.[0]?.unitId || 0,
                exampleSentence: app?.exampleSentence,
                exampleMeaning: app?.exampleMeaning,
                exampleMeaningEn: app?.exampleMeaningEn,
                exampleMeaningVi: app?.exampleMeaningVi,
                exampleMeaningMn: app?.exampleMeaningMn,
                appearanceId: app?._id,
            };
        });
    },
});

// Get all vocabulary for a course (Admin List or Module view)
// OPTIMIZATION: Added limit to prevent excessive queries
export const getOfCourse = query({
    args: {
        courseId: v.string(),
        limit: v.optional(v.number()), // Optional limit
    },
    handler: async (ctx, args) => {
        const userId = await getOptionalAuthUserId(ctx);

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
                            .withIndex("by_user_word", (q) => q.eq("userId", userId as any).eq("wordId", app.wordId))
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
                userId: userId as any,
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

            // Multi-language meanings
            meaningEn: v.optional(v.string()),
            meaningVi: v.optional(v.string()),
            meaningMn: v.optional(v.string()),

            courseId: v.string(),
            unitId: v.number(),
            exampleSentence: v.optional(v.string()),
            exampleMeaning: v.optional(v.string()),

            // Multi-language example translations
            exampleMeaningEn: v.optional(v.string()),
            exampleMeaningVi: v.optional(v.string()),
            exampleMeaningMn: v.optional(v.string()),

            tips: v.optional(v.any()), // JSON
        })),
        token: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx, args.token);

        let successCount = 0;
        let failedCount = 0;
        const errors: string[] = [];
        let smartFilledCount = 0;
        let newWordCount = 0;

        for (const item of args.items) {
            try {
                // 1. Check if word exists
                const existingWord = await ctx.db
                    .query("words")
                    .withIndex("by_word", (q) => q.eq("word", item.word))
                    .unique();

                let wordId;
                let smartFillData: {
                    meaning?: string;
                    meaningEn?: string;
                    meaningVi?: string;
                    meaningMn?: string;
                    exampleSentence?: string;
                    exampleMeaning?: string;
                    exampleMeaningEn?: string;
                    exampleMeaningVi?: string;
                    exampleMeaningMn?: string;
                } = {};

                if (existingWord) {
                    wordId = existingWord._id;

                    // Smart Fill: Get the most recent appearance for this word to copy data
                    const existingAppearances = await ctx.db
                        .query("vocabulary_appearances")
                        .filter((q) => q.eq(q.field("wordId"), wordId))
                        .order("desc")
                        .take(1);

                    const sourceApp = existingAppearances[0];

                    // Build smart fill data from existing appearance or word
                    smartFillData = {
                        meaning: sourceApp?.meaning || existingWord.meaning,
                        meaningEn: sourceApp?.meaningEn || existingWord.meaningEn,
                        meaningVi: sourceApp?.meaningVi || existingWord.meaningVi,
                        meaningMn: sourceApp?.meaningMn || existingWord.meaningMn,
                        exampleSentence: sourceApp?.exampleSentence,
                        exampleMeaning: sourceApp?.exampleMeaning,
                        exampleMeaningEn: sourceApp?.exampleMeaningEn,
                        exampleMeaningVi: sourceApp?.exampleMeaningVi,
                        exampleMeaningMn: sourceApp?.exampleMeaningMn,
                    };

                    smartFilledCount++;

                    // Update word only if user provided new translations
                    const wordUpdates: Record<string, string> = {};
                    if (item.meaningEn && !existingWord.meaningEn) wordUpdates.meaningEn = item.meaningEn;
                    if (item.meaningVi && !existingWord.meaningVi) wordUpdates.meaningVi = item.meaningVi;
                    if (item.meaningMn && !existingWord.meaningMn) wordUpdates.meaningMn = item.meaningMn;
                    if (Object.keys(wordUpdates).length > 0) {
                        await ctx.db.patch(existingWord._id, wordUpdates);
                    }
                } else {
                    // New word - create it
                    wordId = await ctx.db.insert("words", {
                        word: item.word,
                        meaning: item.meaning || "",
                        partOfSpeech: item.partOfSpeech || "NOUN",
                        hanja: item.hanja,
                        meaningEn: item.meaningEn,
                        meaningVi: item.meaningVi,
                        meaningMn: item.meaningMn,
                        tips: item.tips,
                    });
                    newWordCount++;
                }

                // 2. Upsert Appearance with smart fill (user data takes priority)
                const existingApp = await ctx.db
                    .query("vocabulary_appearances")
                    .withIndex("by_word_course_unit", (q) =>
                        q.eq("wordId", wordId).eq("courseId", item.courseId).eq("unitId", item.unitId)
                    )
                    .unique();

                // Final data: user-provided > smart fill
                const finalData = {
                    meaning: item.meaning || smartFillData.meaning,
                    meaningEn: item.meaningEn || smartFillData.meaningEn,
                    meaningVi: item.meaningVi || smartFillData.meaningVi,
                    meaningMn: item.meaningMn || smartFillData.meaningMn,
                    exampleSentence: item.exampleSentence || smartFillData.exampleSentence,
                    exampleMeaning: item.exampleMeaning || smartFillData.exampleMeaning,
                    exampleMeaningEn: item.exampleMeaningEn || smartFillData.exampleMeaningEn,
                    exampleMeaningVi: item.exampleMeaningVi || smartFillData.exampleMeaningVi,
                    exampleMeaningMn: item.exampleMeaningMn || smartFillData.exampleMeaningMn,
                };

                if (!existingApp) {
                    await ctx.db.insert("vocabulary_appearances", {
                        wordId,
                        courseId: item.courseId,
                        unitId: item.unitId,
                        ...finalData,
                        createdAt: Date.now(),
                    });
                } else {
                    // Update existing appearance
                    const appUpdates: Record<string, string | undefined> = {};
                    if (finalData.meaning) appUpdates.meaning = finalData.meaning;
                    if (finalData.meaningEn) appUpdates.meaningEn = finalData.meaningEn;
                    if (finalData.meaningVi) appUpdates.meaningVi = finalData.meaningVi;
                    if (finalData.meaningMn) appUpdates.meaningMn = finalData.meaningMn;
                    if (finalData.exampleSentence) appUpdates.exampleSentence = finalData.exampleSentence;
                    if (finalData.exampleMeaning) appUpdates.exampleMeaning = finalData.exampleMeaning;
                    if (finalData.exampleMeaningEn) appUpdates.exampleMeaningEn = finalData.exampleMeaningEn;
                    if (finalData.exampleMeaningVi) appUpdates.exampleMeaningVi = finalData.exampleMeaningVi;
                    if (finalData.exampleMeaningMn) appUpdates.exampleMeaningMn = finalData.exampleMeaningMn;
                    if (Object.keys(appUpdates).length > 0) {
                        await ctx.db.patch(existingApp._id, appUpdates);
                    }
                }
                successCount++;
            } catch (e: any) {
                failedCount++;
                errors.push(`${item.word}: ${e.message}`);
            }
        }

        return {
            success: true,
            results: {
                success: successCount,
                failed: failedCount,
                smartFilled: smartFilledCount,
                newWords: newWordCount,
                errors
            }
        };
    }
});

// Get words due for review (Vocab Book - SRS)
export const getDueForReview = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getOptionalAuthUserId(ctx);
        if (!userId) return [];

        // Get all user progress that is not MASTERED
        const progressItems = await ctx.db
            .query("user_vocab_progress")
            .withIndex("by_user_word", q => q.eq("userId", userId as any))
            .collect();

        // Filter: not mastered
        const notMastered = progressItems.filter(p => p.status !== 'MASTERED');

        // Fetch word details for each progress item
        const wordsWithProgress = await Promise.all(
            notMastered.map(async (progress) => {
                const word = await ctx.db.get(progress.wordId);
                if (!word) return null;

                return {
                    id: word._id,
                    word: word.word,
                    meaning: word.meaning,
                    partOfSpeech: word.partOfSpeech,
                    hanja: word.hanja,
                    pronunciation: word.pronunciation,
                    audioUrl: word.audioUrl,
                    progress: {
                        id: progress._id,
                        status: progress.status,
                        interval: progress.interval,
                        streak: progress.streak,
                        nextReviewAt: progress.nextReviewAt,
                        lastReviewedAt: progress.lastReviewedAt,
                    },
                };
            })
        );

        return wordsWithProgress.filter(w => w !== null);
    },
});

// Add word to review list (Manual add to SRS)
export const addToReview = mutation({
    args: {
        word: v.string(),
        meaning: v.string(),
        partOfSpeech: v.optional(v.string()),
        context: v.optional(v.string()),
        source: v.optional(v.string()), // e.g., "TOPIK", "READING", "MANUAL"
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        const now = Date.now();

        // 1. Check if word exists in master dictionary
        let existingWord = await ctx.db
            .query("words")
            .withIndex("by_word", q => q.eq("word", args.word))
            .unique();

        let wordId;
        if (existingWord) {
            wordId = existingWord._id;
        } else {
            // Create new word in dictionary
            wordId = await ctx.db.insert("words", {
                word: args.word,
                meaning: args.meaning,
                partOfSpeech: args.partOfSpeech || "NOUN",
            });
        }

        // 2. Check if user already has progress for this word
        const existingProgress = await ctx.db
            .query("user_vocab_progress")
            .withIndex("by_user_word", q => q.eq("userId", userId as any).eq("wordId", wordId))
            .unique();

        if (existingProgress) {
            // Already in review list - optionally reset to LEARNING
            if (existingProgress.status === 'MASTERED') {
                await ctx.db.patch(existingProgress._id, {
                    status: 'LEARNING',
                    interval: 1,
                    streak: 0,
                    nextReviewAt: now + (24 * 60 * 60 * 1000),
                });
            }
            return { success: true, wordId, action: 'updated' };
        }

        // 3. Create new progress entry
        await ctx.db.insert("user_vocab_progress", {
            userId: userId as any,
            wordId,
            status: 'NEW',
            interval: 0.5,
            streak: 0,
            lastReviewedAt: now,
            nextReviewAt: now + (12 * 60 * 60 * 1000), // 12 hours
        });

        return { success: true, wordId, action: 'created' };
    },
});

// Update vocabulary word and its appearance (Admin only)
export const updateVocab = mutation({
    args: {
        token: v.optional(v.string()),
        wordId: v.id("words"),
        appearanceId: v.optional(v.id("vocabulary_appearances")),
        // Word fields
        word: v.optional(v.string()),
        meaning: v.optional(v.string()),
        meaningEn: v.optional(v.string()),
        meaningVi: v.optional(v.string()),
        meaningMn: v.optional(v.string()),
        partOfSpeech: v.optional(v.string()),
        // Appearance fields
        unitId: v.optional(v.number()),
        exampleSentence: v.optional(v.string()),
        exampleMeaning: v.optional(v.string()),
        exampleMeaningEn: v.optional(v.string()),
        exampleMeaningVi: v.optional(v.string()),
        exampleMeaningMn: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx, args.token);

        const { wordId, appearanceId, token, ...fields } = args;

        // 1. Update word fields
        const wordFields: Record<string, string | undefined> = {};
        if (fields.word !== undefined) wordFields.word = fields.word;
        if (fields.meaning !== undefined) wordFields.meaning = fields.meaning;
        if (fields.meaningEn !== undefined) wordFields.meaningEn = fields.meaningEn;
        if (fields.meaningVi !== undefined) wordFields.meaningVi = fields.meaningVi;
        if (fields.meaningMn !== undefined) wordFields.meaningMn = fields.meaningMn;
        if (fields.partOfSpeech !== undefined) wordFields.partOfSpeech = fields.partOfSpeech;

        if (Object.keys(wordFields).length > 0) {
            await ctx.db.patch(wordId, {
                ...wordFields,
                updatedAt: Date.now(),
            });
        }

        // 2. Update appearance fields if appearanceId provided
        if (appearanceId) {
            const appFields: Record<string, string | number | undefined> = {};
            if (fields.unitId !== undefined) appFields.unitId = fields.unitId;
            if (fields.exampleSentence !== undefined) appFields.exampleSentence = fields.exampleSentence;
            if (fields.exampleMeaning !== undefined) appFields.exampleMeaning = fields.exampleMeaning;
            if (fields.exampleMeaningEn !== undefined) appFields.exampleMeaningEn = fields.exampleMeaningEn;
            if (fields.exampleMeaningVi !== undefined) appFields.exampleMeaningVi = fields.exampleMeaningVi;
            if (fields.exampleMeaningMn !== undefined) appFields.exampleMeaningMn = fields.exampleMeaningMn;

            if (Object.keys(appFields).length > 0) {
                await ctx.db.patch(appearanceId, appFields);
            }
        }

        return { success: true, wordId };
    },
});
