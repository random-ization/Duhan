// convex/polyglot.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const TABLE_NAME = "grammar_points";

export const getItems = query({
    handler: async (ctx) => {
        return await ctx.db.query(TABLE_NAME).collect();
    },
});

export const updateItem = mutation({
    args: {
        id: v.id(TABLE_NAME),
        titleEn: v.optional(v.string()),
        titleZh: v.optional(v.string()),
        titleVi: v.optional(v.string()),
        titleMn: v.optional(v.string()),
        summaryEn: v.optional(v.string()),
        summaryVi: v.optional(v.string()),
        summaryMn: v.optional(v.string()),
        explanationEn: v.optional(v.string()),
        explanationVi: v.optional(v.string()),
        explanationMn: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, ...data } = args;
        // Remove undefined fields
        const patch: Record<string, string> = {};
        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined) patch[key] = value;
        }
        if (Object.keys(patch).length > 0) {
            await ctx.db.patch(id, patch);
        }
    },
});

/**
 * Replace content of a target grammar with content from a source (TOPIK) grammar.
 * Preserves the target's title, slug, searchKey, and searchPatterns.
 */
export const replaceGrammarContent = mutation({
    args: {
        sourceId: v.id(TABLE_NAME),
        targetId: v.id(TABLE_NAME),
    },
    handler: async (ctx, args) => {
        const source = await ctx.db.get(args.sourceId);
        if (!source) throw new Error(`Source grammar not found: ${args.sourceId}`);

        const target = await ctx.db.get(args.targetId);
        if (!target) throw new Error(`Target grammar not found: ${args.targetId}`);

        // Copy TOPIK's rich content fields, preserving target's identity
        const patch: Record<string, unknown> = {
            // Core content
            summary: source.summary,
            explanation: source.explanation,
            examples: source.examples,

            // Multi-language summaries
            summaryEn: source.summaryEn,
            summaryVi: source.summaryVi,
            summaryMn: source.summaryMn,

            // Multi-language explanations
            explanationEn: source.explanationEn,
            explanationVi: source.explanationVi,
            explanationMn: source.explanationMn,

            // Rich sections (TOPIK-specific)
            sections: source.sections,
            quizItems: source.quizItems,
            sourceMeta: source.sourceMeta,

            // Title translations from TOPIK
            titleEn: source.titleEn ?? target.titleEn,
            titleZh: source.titleZh ?? target.titleZh,
            titleVi: source.titleVi ?? target.titleVi,
            titleMn: source.titleMn ?? target.titleMn,

            // Conjugation rules
            conjugationRules: source.conjugationRules ?? target.conjugationRules,

            updatedAt: Date.now(),
        };

        await ctx.db.patch(args.targetId, patch);

        return {
            targetId: args.targetId,
            targetTitle: target.title,
            sourceId: args.sourceId,
            sourceTitle: source.title,
            fieldsUpdated: Object.keys(patch).length,
        };
    },
});

/**
 * Get all course_grammar links for a given course.
 */
export const getAllCourseGrammarLinks = query({
    args: {
        courseId: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("course_grammars")
            .withIndex("by_course_unit", (q) => q.eq("courseId", args.courseId))
            .collect();
    },
});
