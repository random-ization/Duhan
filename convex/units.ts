import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get unit list for course (includes all content for admin editing)
export const getByCourse = query({
    args: { courseId: v.string() },
    handler: async (ctx, args) => {
        const units = await ctx.db
            .query("textbook_units")
            .withIndex("by_course_unit_article", (q) => q.eq("courseId", args.courseId))
            .collect();

        // Return all fields for admin editing, exclude archived
        return units
            .filter(u => !u.isArchived)
            .map((u) => ({
                _id: u._id,
                courseId: u.courseId,
                unitIndex: u.unitIndex,
                articleIndex: u.articleIndex,
                title: u.title,
                readingText: u.readingText,
                translation: u.translation,
                translationEn: u.translationEn,
                translationVi: u.translationVi,
                translationMn: u.translationMn,
                audioUrl: u.audioUrl,
                transcriptData: u.transcriptData,
                analysisData: u.analysisData,
                createdAt: u.createdAt,
            }));
    },
});

import { getUserByTokenOrId } from "./utils";

export const getDetails = query({
    args: {
        token: v.optional(v.string()), // Added token support for Shim
        courseId: v.string(),
        unitIndex: v.number(),
    },
    handler: async (ctx, args) => {
        // Resolve user via Token (Shim) or Auth (Native)
        const user = await getUserByTokenOrId(ctx, args.token);
        const convexUserId = user?._id;

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
        translationEn: v.optional(v.string()),
        translationVi: v.optional(v.string()),
        translationMn: v.optional(v.string()),
        audioUrl: v.optional(v.string()),
        analysisData: v.optional(v.any()),
        transcriptData: v.optional(v.any()), // JSON transcript
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
                translationEn: args.translationEn,
                translationVi: args.translationVi,
                translationMn: args.translationMn,
                audioUrl: args.audioUrl,
                analysisData: args.analysisData,
                transcriptData: args.transcriptData,
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
                translationEn: args.translationEn,
                translationVi: args.translationVi,
                translationMn: args.translationMn,
                audioUrl: args.audioUrl,
                analysisData: args.analysisData,
                transcriptData: args.transcriptData,
                createdAt: Date.now(),
            });
        }
    },
});

// Bulk Import Reading Articles (Admin)
export const bulkImport = mutation({
    args: {
        items: v.array(v.object({
            unitIndex: v.number(),
            articleIndex: v.number(),
            title: v.string(),
            readingText: v.string(),
            translation: v.optional(v.string()),
            translationEn: v.optional(v.string()),
            translationVi: v.optional(v.string()),
            translationMn: v.optional(v.string()),
            audioUrl: v.optional(v.string()),
        })),
        courseId: v.string(),
        token: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Verify admin via token if provided
        if (args.token) {
            const user = await ctx.db
                .query("users")
                .withIndex("by_token", (q) => q.eq("token", args.token))
                .unique();
            if (!user || user.role !== "ADMIN") {
                throw new Error("Unauthorized");
            }
        }

        let success = 0;
        let failed = 0;
        let created = 0;
        let updated = 0;
        const errors: string[] = [];

        for (const item of args.items) {
            try {
                // Check if article already exists (use first() to handle duplicates)
                const existing = await ctx.db
                    .query("textbook_units")
                    .withIndex("by_course_unit_article", (q) =>
                        q.eq("courseId", args.courseId)
                            .eq("unitIndex", item.unitIndex)
                            .eq("articleIndex", item.articleIndex)
                    )
                    .first();

                if (existing) {
                    // Update existing
                    await ctx.db.patch(existing._id, {
                        title: item.title,
                        readingText: item.readingText,
                        translation: item.translation,
                        translationEn: item.translationEn,
                        translationVi: item.translationVi,
                        translationMn: item.translationMn,
                        audioUrl: item.audioUrl,
                    });
                    updated++;
                } else {
                    // Create new
                    await ctx.db.insert("textbook_units", {
                        courseId: args.courseId,
                        unitIndex: item.unitIndex,
                        articleIndex: item.articleIndex,
                        title: item.title,
                        readingText: item.readingText,
                        translation: item.translation,
                        translationEn: item.translationEn,
                        translationVi: item.translationVi,
                        translationMn: item.translationMn,
                        audioUrl: item.audioUrl,
                        createdAt: Date.now(),
                    });
                    created++;
                }
                success++;
            } catch (e: any) {
                failed++;
                errors.push(`Unit ${item.unitIndex}-${item.articleIndex}: ${e.message}`);
            }
        }

        return {
            success: true,
            results: {
                success,
                failed,
                created,
                updated,
                errors: errors.slice(0, 5), // Limit error messages
            },
        };
    },
});

