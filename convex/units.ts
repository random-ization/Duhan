import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get aggregated unit details (Reading Page)
export const getByCourse = query({
    args: { courseId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("textbook_units")
            .withIndex("by_course_unit_article", (q) => q.eq("courseId", args.courseId))
            .collect();
    },
});

export const getDetails = query({
    args: {
        courseId: v.string(),
        unitIndex: v.number(),
        userId: v.optional(v.id("users")) // Pass explicitly for now or use ctx.auth later
    },
    handler: async (ctx, args) => {
        // 1. Get Unit Articles
        const articles = await ctx.db
            .query("textbook_units")
            .withIndex("by_course_unit_article", (q) =>
                q.eq("courseId", args.courseId).eq("unitIndex", args.unitIndex)
            )
            .collect();

        const mainUnit = articles[0] || null;

        // 2. Get Vocabulary (Reuse logic or direct query)
        const vocabAppearances = await ctx.db
            .query("vocabulary_appearances")
            .withIndex("by_course_unit", (q) =>
                q.eq("courseId", args.courseId).eq("unitId", args.unitIndex)
            )
            .collect();

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

        // 3. Get Grammar
        const courseGrammars = await ctx.db
            .query("course_grammars")
            .withIndex("by_course_unit", (q) =>
                q.eq("courseId", args.courseId).eq("unitId", args.unitIndex)
            )
            .collect();

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

        // 4. Annotations
        let annotations: any[] = [];
        if (args.userId) {
            annotations = await ctx.db
                .query("annotations")
                .withIndex("by_user_context", (q) =>
                    q.eq("userId", args.userId!).eq("contextKey", `${args.courseId}_${args.unitIndex}`)
                )
                .collect();
        }

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
