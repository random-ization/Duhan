import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get Grammar stats for sidebar
export const getStats = query({
    args: {
        courseId: v.string(),
        userId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // 1. Get all CourseGrammar links for this course
        const courseGrammars = await ctx.db
            .query("course_grammars")
            .withIndex("by_course_unit", (q) => q.eq("courseId", args.courseId))
            .collect();

        if (!args.userId) return { total: courseGrammars.length, mastered: 0 };

        // 2. Fetch progress
        // Note: Ideally we'd do a join or batch fetch here, but for now we'll do this
        const progress = await ctx.db
            .query("user_grammar_progress")
            .filter((q) => q.eq(q.field("userId"), args.userId))
            .collect();

        // Count mastered
        const mastered = progress.filter(p => p.status === 'MASTERED').length;

        return {
            total: courseGrammars.length,
            mastered,
        };
    },
});

export const getUnitGrammar = query({
    args: {
        courseId: v.string(),
        unitId: v.number(),
        userId: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        // 1. Get links
        const courseGrammars = await ctx.db
            .query("course_grammars")
            .withIndex("by_course_unit", (q) =>
                q.eq("courseId", args.courseId).eq("unitId", args.unitId)
            )
            .collect();

        // 2. Sort by displayOrder
        courseGrammars.sort((a, b) => a.displayOrder - b.displayOrder);

        // 3. Fetch Details
        const results = await Promise.all(courseGrammars.map(async (link) => {
            const grammar = await ctx.db.get(link.grammarId);
            if (!grammar) return null;

            let userProgress = null;
            if (args.userId) {
                userProgress = await ctx.db
                    .query("user_grammar_progress")
                    .withIndex("by_user_grammar", q =>
                        q.eq("userId", args.userId!).eq("grammarId", link.grammarId)
                    )
                    .unique();
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
    }
});

export const updateStatus = mutation({
    args: {
        userId: v.string(),
        grammarId: v.id("grammar_points"),
        status: v.string(), // "LEARNING", "MASTERED"
    },
    handler: async (ctx, args) => {
        const { userId, grammarId, status } = args;
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
