import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get unit list for course (List View - metadata only, no large content)
export const getByCourse = query({
    args: { courseId: v.string() },
    handler: async (ctx, args) => {
        const units = await ctx.db
            .query("textbook_units")
            .withIndex("by_course_unit_article", (q) => q.eq("courseId", args.courseId))
            .collect();

        // Return only metadata needed for list view, exclude large fields and archived
        return units
            .filter(u => !u.isArchived)
            .map((u) => ({
                _id: u._id,
                courseId: u.courseId,
                unitIndex: u.unitIndex,
                articleIndex: u.articleIndex,
                title: u.title,
                audioUrl: u.audioUrl,
                createdAt: u.createdAt,
                // Exclude: readingText, translation, transcriptData, analysisData
            }));
    },
});

export const getDetails = query({
    args: {
        courseId: v.string(),
        unitIndex: v.number(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        // userId is optional for this query - unauthenticated users can still view content
        let convexUserId: any = null;
        if (identity) {
            // Find user by identity subject
            const user = await ctx.db.query("users")
                .withIndex("by_token", q => q.eq("token", identity.subject))
                .first();
            convexUserId = user?._id;
        }

        // Fetch all top-level data concurrently
        const [articles, vocabAppearances, courseGrammars, annotations] = await Promise.all([
            // 1. Get Unit Articles
            ctx.db
                .query("textbook_units")
                .withIndex("by_course_unit_article", (q) =>
                    q.eq("courseId", args.courseId).eq("unitIndex", args.unitIndex)
                )
                .collect(),

            // 2. Get Vocabulary Appearances
            ctx.db
                .query("vocabulary_appearances")
                .withIndex("by_course_unit", (q) =>
                    q.eq("courseId", args.courseId).eq("unitId", args.unitIndex)
                )
                .collect(),

            // 3. Get Course Grammars
            ctx.db
                .query("course_grammars")
                .withIndex("by_course_unit", (q) =>
                    q.eq("courseId", args.courseId).eq("unitId", args.unitIndex)
                )
                .collect(),

            // 4. Annotations
            convexUserId
                ? ctx.db
                    .query("annotations")
                    .withIndex("by_user_context", (q) =>
                        q.eq("userId", convexUserId).eq("contextKey", `${args.courseId}_${args.unitIndex}`)
                    )
                    .collect()
                : Promise.resolve([]),
        ]);

        const mainUnit = articles[0] || null;

        // Process Vocabulary List
        const vocabList = await Promise.all(
            vocabAppearances.map(async (app) => {
                const word = await ctx.db.get(app.wordId);
                if (!word) return null;
                return {
                    id: word._id,
                    korean: word.word,
                    meaning: word.meaning,
                    pos: word.partOfSpeech,
                    pronunciation: word.pronunciation,
                    hanja: word.hanja,
                    audioUrl: word.audioUrl,
                    // Context
                    exampleSentence: app.exampleSentence,
                    exampleMeaning: app.exampleMeaning,
                };
            })
        );

        // Process Grammar List
        const grammarList = await Promise.all(
            courseGrammars.map(async (cg) => {
                const grammar = await ctx.db.get(cg.grammarId);
                if (!grammar) return null;
                return {
                    id: grammar._id,
                    title: grammar.title,
                    summary: grammar.summary,
                    explanation: grammar.explanation,
                    type: grammar.type,
                    displayOrder: cg.displayOrder,
                    customNote: cg.customNote,
                    // Add other fields as needed
                };
            })
        );

        return {
            unit: mainUnit,
            articles: articles,
            vocabList: vocabList.filter(v => v !== null),
            grammarList: grammarList.filter(g => g !== null),
            annotations: annotations,
        };
    },
});

// Save Unit (Admin)
export const save = mutation({
    args: {
        courseId: v.string(),
        unitIndex: v.number(),
        articleIndex: v.number(),
        title: v.string(),
        readingText: v.string(),
        translation: v.optional(v.string()),
        audioUrl: v.optional(v.string()),
        analysisData: v.optional(v.any()), // Can be more specific: v.array(v.object({...}))
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("textbook_units")
            .withIndex("by_course_unit_article", (q) =>
                q.eq("courseId", args.courseId).eq("unitIndex", args.unitIndex).eq("articleIndex", args.articleIndex)
            )
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, {
                title: args.title,
                readingText: args.readingText,
                translation: args.translation,
                audioUrl: args.audioUrl,
                analysisData: args.analysisData,
            });
            return existing._id;
        } else {
            return await ctx.db.insert("textbook_units", {
                courseId: args.courseId,
                unitIndex: args.unitIndex,
                articleIndex: args.articleIndex,
                title: args.title,
                readingText: args.readingText,
                translation: args.translation,
                audioUrl: args.audioUrl,
                analysisData: args.analysisData,
                createdAt: Date.now(),
            });
        }
    },
});
