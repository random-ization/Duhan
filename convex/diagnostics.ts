import { query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Return diagnostic data for all courses
export const getHealthStats = query({
    args: {},
    handler: async (ctx) => {
        const start = Date.now();

        // 1. Get Institutes
        const institutes = await ctx.db.query("institutes").collect();

        // 2. Get User Count (for latency check context)
        const userCount = (await ctx.db.query("users").collect()).length;

        // 3. For each institute, count words (via appearances) and units
        const data = await Promise.all(institutes.map(async (ins) => {
            const courseId = ins.id; // Schema uses 'id' as manual ID

            // Count Vocab Appearances
            // Words are linked via vocabulary_appearances.
            // We use the "by_course_unit" index (courseId, unitId). 
            // Querying with just courseId eq works as it's the first segment.
            const vocabCount = (await ctx.db.query("vocabulary_appearances")
                .withIndex("by_course_unit", q => q.eq("courseId", courseId))
                .collect()).length;

            // Count Units
            const unitCount = (await ctx.db.query("textbook_units")
                .withIndex("by_course", q => q.eq("courseId", courseId))
                .collect()).length;

            return {
                id: courseId,
                name: ins.name,
                publisher: ins.publisher || null,
                totalUnitsSetting: ins.totalUnits || null,
                vocabCount,
                unitCount
            };
        }));

        const scanTime = Date.now() - start;

        return {
            data,
            latency: {
                ping: 0,
                scan: scanTime,
                userCount
            }
        };
    }
});
