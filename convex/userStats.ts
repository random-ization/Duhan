import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get user stats for dashboard
export const getStats = query({
    args: {
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        const { userId } = args;

        // Get user's course progress
        const courseProgress = await ctx.db.query("user_course_progress")
            .withIndex("by_user", q => q.eq("userId", userId))
            .collect();

        // Get vocab progress stats
        const vocabProgress = await ctx.db.query("user_vocab_progress")
            .withIndex("by_user_next_review", q => q.eq("userId", userId))
            .collect();

        const now = Date.now();
        const dueReviews = vocabProgress.filter(v => v.nextReviewAt && v.nextReviewAt <= now).length;
        const masteredWords = vocabProgress.filter(v => v.status === "MASTERED").length;

        // Get grammar progress stats
        const grammarProgress = await ctx.db.query("user_grammar_progress")
            .withIndex("by_user_grammar", q => q.eq("userId", userId))
            .collect();

        const masteredGrammar = grammarProgress.filter(g => g.status === "MASTERED").length;

        // Calculate streak (simplified - could be more complex)
        const lastAccess = courseProgress.length > 0
            ? Math.max(...courseProgress.map(p => p.lastAccessAt))
            : 0;

        const oneDayMs = 24 * 60 * 60 * 1000;
        const daysSinceLastAccess = Math.floor((now - lastAccess) / oneDayMs);
        const streak = daysSinceLastAccess <= 1 ? 1 : 0; // Simplified streak logic

        // Get course details for progress display
        const courseDetails = await Promise.all(courseProgress.map(async (p) => {
            const institute = await ctx.db.query("institutes")
                .withIndex("by_legacy_id", q => q.eq("id", p.courseId))
                .first();

            return {
                courseId: p.courseId,
                courseName: institute?.name || p.courseId,
                completedUnits: p.completedUnits.length,
                totalUnits: institute?.totalUnits || 0,
                lastAccessAt: new Date(p.lastAccessAt).toISOString(),
            };
        }));

        return {
            streak,
            weeklyMinutes: [0, 0, 0, 0, 0, 0, 0], // Placeholder - would need activity tracking
            dailyMinutes: 0,
            dailyGoal: 30,
            dailyProgress: 0,
            todayActivities: {
                wordsLearned: masteredWords,
                readingsCompleted: courseProgress.reduce((sum, p) => sum + p.completedUnits.length, 0),
                listeningsCompleted: 0,
            },
            courseProgress: courseDetails,
            vocabStats: {
                total: vocabProgress.length,
                dueReviews,
                mastered: masteredWords,
            },
            grammarStats: {
                total: grammarProgress.length,
                mastered: masteredGrammar,
            },
        };
    }
});

// Log user activity (for streak tracking)
export const logActivity = mutation({
    args: {
        userId: v.string(),
        activityType: v.string(),
        duration: v.optional(v.number()),
        itemsStudied: v.optional(v.number()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        // For now, just update the lastAccessAt in course progress
        // In a full implementation, would store activity logs
        const { userId, activityType } = args;

        console.log(`[Activity] User ${userId}: ${activityType}`);

        return { success: true };
    }
});
