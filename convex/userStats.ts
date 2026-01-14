import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "./utils";

// Get user stats for dashboard
export const getStats = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx).catch(() => null);
        if (!userId) {
            // Return empty stats if not logged in
            return {
                streak: 0,
                weeklyMinutes: [0, 0, 0, 0, 0, 0, 0],
                dailyMinutes: 0,
                dailyGoal: 30,
                dailyProgress: 0,
                todayActivities: { wordsLearned: 0, readingsCompleted: 0, listeningsCompleted: 0 },
                courseProgress: [],
                vocabStats: { total: 0, dueReviews: 0, mastered: 0 },
                grammarStats: { total: 0, mastered: 0 },
            };
        }

        // Fetch all progress stats concurrently
        const [courseProgress, vocabProgress, grammarProgress] = await Promise.all([
            // Get user's course progress
            ctx.db
                .query("user_course_progress")
                .withIndex("by_user", (q) => q.eq("userId", userId))
                .collect(),

            // Get vocab progress stats
            ctx.db
                .query("user_vocab_progress")
                .withIndex("by_user_next_review", (q) => q.eq("userId", userId))
                .collect(),

            // Get grammar progress stats
            ctx.db
                .query("user_grammar_progress")
                .withIndex("by_user_grammar", (q) => q.eq("userId", userId))
                .collect(),
        ]);

        const now = Date.now();
        const dueReviews = vocabProgress.filter((v) => v.nextReviewAt && v.nextReviewAt <= now).length;
        const masteredWords = vocabProgress.filter((v) => v.status === "MASTERED").length;

        const masteredGrammar = grammarProgress.filter((g) => g.status === "MASTERED").length;

        // Calculate streak (simplified - could be more complex)
        const lastAccess = courseProgress.length > 0
            ? Math.max(...courseProgress.map(p => p.lastAccessAt || 0))
            : 0;

        const oneDayMs = 24 * 60 * 60 * 1000;
        const daysSinceLastAccess = Math.floor((now - lastAccess) / oneDayMs);
        const streak = daysSinceLastAccess <= 1 ? 1 : 0; // Simplified streak logic

        // OPTIMIZATION: Batch fetch course details
        const courseIds = [...new Set(courseProgress.map(p => p.courseId))];
        const institutesArray = await Promise.all(
            courseIds.map(courseId =>
                ctx.db.query("institutes")
                    .withIndex("by_legacy_id", q => q.eq("id", courseId))
                    .first()
            )
        );
        const institutesMap = new Map(institutesArray.filter(Boolean).map(i => [i!.id, i!]));

        // Get course details for progress display in memory
        const courseDetails = courseProgress.map((p) => {
            const institute = institutesMap.get(p.courseId);

            return {
                courseId: p.courseId,
                courseName: institute?.name || p.courseId,
                completedUnits: (p.completedUnits || []).length,
                totalUnits: institute?.totalUnits || 0,
                lastAccessAt: new Date(p.lastAccessAt || now).toISOString(),
            };
        });

        // Determine currentProgress (most recently accessed course)
        let currentProgress = null;
        if (courseDetails.length > 0) {
            // Sort by lastAccessAt descending
            const sortedCourses = [...courseDetails].sort((a, b) =>
                new Date(b.lastAccessAt).getTime() - new Date(a.lastAccessAt).getTime()
            );
            const recent = sortedCourses[0];
            currentProgress = {
                instituteName: recent.courseName, // Use the actual name, not ID
                level: 1, // Default level
                unit: recent.completedUnits + 1, // Current unit = completed + 1
                module: 'vocab', // Default to vocab
            };
        }

        return {
            streak,
            weeklyMinutes: [0, 0, 0, 0, 0, 0, 0], // Placeholder - would need activity tracking
            dailyMinutes: 0,
            dailyGoal: 30,
            dailyProgress: 0,
            todayActivities: {
                wordsLearned: masteredWords,
                readingsCompleted: courseProgress.reduce((sum, p) => sum + (p.completedUnits || []).length, 0),
                listeningsCompleted: 0,
            },
            courseProgress: courseDetails,
            currentProgress, // Add this for LearnerDashboard
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
        activityType: v.string(),
        duration: v.optional(v.number()),
        itemsStudied: v.optional(v.number()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);

        // For now, just update the lastAccessAt in course progress
        // In a full implementation, would store activity logs
        const { activityType } = args;

        console.log(`[Activity] User ${userId}: ${activityType}`);

        return { success: true };
    }
});
