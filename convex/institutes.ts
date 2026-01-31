import { query } from "./_generated/server";
import { v } from "convex/values";

export const getAll = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("institutes").collect();
    },
});

export const get = query({
    args: { id: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("institutes")
            .withIndex("by_legacy_id", (q) => q.eq("id", args.id))
            .unique();
    },
});

export const checkIntegrity = query({
    args: {},
    handler: async (ctx) => {
        const courses = await ctx.db.query('institutes').collect();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const report: any[] = [];

        for (const course of courses) {
            const reportItem = await processCourseIntegrity(ctx, course);
            if (reportItem) {
                report.push(reportItem);
            }
        }
        return report;
    },
});

// Helper functions for institutes.ts complexity reduction

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function calculateExpectedUnits(course: any): number[] {
    let expectedUnits: number[] = [];
    if (course.levels && course.levels.length > 0) {
        const firstLevel = course.levels[0];
        const count = typeof firstLevel === 'object' && 'units' in firstLevel ? firstLevel.units : 10;
        for (let i = 1; i <= count; i++) expectedUnits.push(i);
    }

    if (expectedUnits.length === 0) {
        // Default to 10 if not specified
        expectedUnits = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    }
    return expectedUnits;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processCourseIntegrity(ctx: any, course: any) {
    const expectedUnits = calculateExpectedUnits(course);
    const missingUnits: number[] = [];

    for (const unitId of expectedUnits) {
        // Handle mapping logic locally to match getUnitGrammar
        let storageUnitId = unitId;
        const isYonsei1B = course.id === 'course_yonsei_1b_appendix' || course.id === '-mk2y2qkh';
        if (isYonsei1B && unitId <= 10) {
            storageUnitId = unitId + 10;
        }

        const count = await ctx.db
            .query('course_grammars')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .withIndex('by_course_unit', (q: any) => q.eq('courseId', course.id).eq('unitId', storageUnitId))
            .collect()
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .then((res: any[]) => res.length);

        if (count === 0) {
            // Check offset 10 just in case
            const offsetCount = await ctx.db
                .query('course_grammars')
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .withIndex('by_course_unit', (q: any) => q.eq('courseId', course.id).eq('unitId', storageUnitId + 10))
                .collect()
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                .then((res: any[]) => res.length);

            if (offsetCount > 0) {
                // It exists but at offset
                missingUnits.push(-unitId); // Mark as negative to indicate "Found at +10"
            } else {
                missingUnits.push(unitId);
            }
        }
    }

    if (missingUnits.length > 0) {
        return {
            courseName: course.name,
            courseId: course.id,
            volume: course.volume,
            missingUnits
        };
    }
    return null;
}
