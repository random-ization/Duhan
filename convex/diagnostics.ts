import { query } from "./_generated/server";

// Return diagnostic data for all courses
export const getHealthStats = query({
    args: {},
    handler: async (ctx) => {
        const start = Date.now();

        // 1. Get Institutes
        const institutes = await ctx.db.query("institutes").collect();

        // 2. Get User Count (for latency check context)
        const userCount = (await ctx.db.query("users").collect()).length;
        
        // Batch query all vocabulary appearances
        const allVocabAppearances = await ctx.db.query("vocabulary_appearances").collect();
        const vocabCountMap = new Map<string, number>();
        allVocabAppearances.forEach(app => {
            vocabCountMap.set(app.courseId, (vocabCountMap.get(app.courseId) || 0) + 1);
        });

        // Batch query all units
        const allUnits = await ctx.db.query("textbook_units").collect();
        const unitCountMap = new Map<string, number>();
        allUnits.forEach(unit => {
            unitCountMap.set(unit.courseId, (unitCountMap.get(unit.courseId) || 0) + 1);
        });

        // Build data in memory
        const data = institutes.map((ins) => {
            const courseId = ins.id;

            return {
                id: courseId,
                name: ins.name,
                publisher: ins.publisher || null,
                totalUnitsSetting: ins.totalUnits || null,
                vocabCount: vocabCountMap.get(courseId) || 0,
                unitCount: unitCountMap.get(courseId) || 0
            };
        });

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
