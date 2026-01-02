import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId, getOptionalAuthUserId } from "./utils";

// Get Grammar stats for sidebar
export const getStats = query({
    args: {
        courseId: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getOptionalAuthUserId(ctx);

        // 1. Get all CourseGrammar links for this course
        // OPTIMIZATION: Limit to prevent excessive queries
        const MAX_GRAMMAR_POINTS = 500;
        const courseGrammars = await ctx.db
            .query("course_grammars")
            .withIndex("by_course_unit", (q) => q.eq("courseId", args.courseId))
            .take(MAX_GRAMMAR_POINTS);

        if (!userId) return { total: courseGrammars.length, mastered: 0 };
        // ...

        // 2. Fetch progress
        // OPTIMIZATION: Limit to prevent excessive queries
        const MAX_PROGRESS_ITEMS = 500;
        const progress = await ctx.db
            .query("user_grammar_progress")
            .filter((q) => q.eq(q.field("userId"), userId))
            .take(MAX_PROGRESS_ITEMS);

        // Count mastered
        const mastered = progress.filter(p => p.status === 'MASTERED').length;

        return {
            total: courseGrammars.length,
            mastered,
        };
    },
});

// Get all grammars for a course (Student View)
export const getByCourse = query({
    args: {
        courseId: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getOptionalAuthUserId(ctx);

        const links = await ctx.db
            .query("course_grammars")
            .withIndex("by_course_unit", (q) => q.eq("courseId", args.courseId))
            .collect();

        const results = await Promise.all(links.map(async (link) => {
            const grammar = await ctx.db.get(link.grammarId);
            if (!grammar) return null;

            let userStatus = 'NOT_STARTED';
            if (userId) {
                const progress = await ctx.db
                    .query("user_grammar_progress")
                    .withIndex("by_user_grammar", q =>
                        q.eq("userId", userId).eq("grammarId", link.grammarId)
                    )
                    .unique();
                if (progress) userStatus = progress.status;
            }

            return {
                id: grammar._id,
                title: grammar.title,
                summary: grammar.summary,
                unitId: link.unitId,
                status: userStatus,
            };
        }));

        return results.filter(g => g !== null).sort((a, b) => a.unitId - b.unitId);
    },
});

export const getUnitGrammar = query({
    args: {
        courseId: v.string(),
        unitId: v.number(),
    },
    handler: async (ctx, args) => {
        try {
            const userId = await getOptionalAuthUserId(ctx);

            // 1. Get links
            // OPTIMIZATION: Limit to prevent excessive queries
            const MAX_UNIT_GRAMMAR = 100;
            const courseGrammars = await ctx.db
                .query("course_grammars")
                .withIndex("by_course_unit", (q) =>
                    q.eq("courseId", args.courseId).eq("unitId", args.unitId)
                )
                .take(MAX_UNIT_GRAMMAR);

            // 2. Sort by displayOrder (copy to avoid mutating readonly array)
            const sortedGrammars = [...courseGrammars].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

            // 3. Fetch Details
            const results = await Promise.all(sortedGrammars.map(async (link) => {
                const grammar = await ctx.db.get(link.grammarId);
                if (!grammar) return null;

                let userProgress = null;
                if (userId) {
                    userProgress = await ctx.db
                        .query("user_grammar_progress")
                        .withIndex("by_user_grammar", q =>
                            q.eq("userId", userId).eq("grammarId", link.grammarId)
                        )
                        .first(); // Use .first() instead of .unique() to avoid error
                }

                return {
                    ...grammar,
                    id: grammar._id,
                    // Course Context
                    customNote: link.customNote,
                    unitId: link.unitId,
                    // Progress
                    status: userProgress?.status || "NOT_STARTED",
                    proficiency: userProgress?.proficiency || 0,
                };
            }));

            return results.filter(g => g !== null);
        } catch (error: any) {
            console.error("[getUnitGrammar] Error:", error?.message || error);
            throw error;
        }
    }
});

export const updateStatus = mutation({
    args: {
        grammarId: v.id("grammar_points"),
        status: v.string(), // "LEARNING", "MASTERED"
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);

        const { grammarId, status } = args;
        const now = Date.now();

        const existing = await ctx.db
            .query("user_grammar_progress")
            .withIndex("by_user_grammar", q => q.eq("userId", userId).eq("grammarId", grammarId))
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, {
                status,
                lastStudiedAt: now,
                proficiency: status === 'MASTERED' ? 100 : existing.proficiency
            });
            return { status, proficiency: status === 'MASTERED' ? 100 : existing.proficiency };
        } else {
            await ctx.db.insert("user_grammar_progress", {
                userId,
                grammarId,
                status,
                proficiency: status === 'MASTERED' ? 100 : 0,
                lastStudiedAt: now
            });
            return { status, proficiency: status === 'MASTERED' ? 100 : 0 };
        }
    }
});
// Search Grammar (Admin)
export const search = query({
    args: { query: v.string() },
    handler: async (ctx, args) => {
        if (!args.query) return [];
        return await ctx.db
            .query("grammar_points")
            .withSearchIndex("search_title", (q) => q.search("title", args.query))
            .take(20);
    },
});

export const create = mutation({
    args: {
        title: v.string(),
        summary: v.string(),
        explanation: v.string(),
        type: v.string(),
        level: v.string(),
    },
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("grammar_points", {
            ...args,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            examples: [],
            conjugationRules: [],
        });
        return { id };
    },
});

export const assignToUnit = mutation({
    args: {
        courseId: v.string(),
        unitId: v.number(),
        grammarId: v.id("grammar_points"),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("course_grammars")
            .withIndex("by_course_unit", (q) =>
                q.eq("courseId", args.courseId).eq("unitId", args.unitId)
            )
            .filter((q) => q.eq(q.field("grammarId"), args.grammarId))
            .unique();

        if (existing) return existing._id;

        // Get max display order
        const currentParams = await ctx.db
            .query("course_grammars")
            .withIndex("by_course_unit", (q) =>
                q.eq("courseId", args.courseId).eq("unitId", args.unitId)
            )
            .collect();

        const maxOrder = currentParams.reduce((max, p) => Math.max(max, p.displayOrder || 0), 0);

        return await ctx.db.insert("course_grammars", {
            courseId: args.courseId,
            unitId: args.unitId,
            grammarId: args.grammarId,
            displayOrder: maxOrder + 1,
        });
    },
});

export const removeFromUnit = mutation({
    args: {
        courseId: v.string(),
        unitId: v.number(),
        grammarId: v.id("grammar_points"),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("course_grammars")
            .withIndex("by_course_unit", (q) =>
                q.eq("courseId", args.courseId).eq("unitId", args.unitId)
            )
            .filter((q) => q.eq(q.field("grammarId"), args.grammarId))
            .unique();

        if (existing) {
            await ctx.db.delete(existing._id);
        }
    },
});
