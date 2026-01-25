import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "./utils";

// Get user stats for dashboard
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

        const now = Date.now();
        const startOfDay = new Date(now).setHours(0, 0, 0, 0);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _dayOfWeek = new Date(now).getDay(); // 0 = Sunday, 1 = Monday...
        // Calculate start of the week (assuming Monday start or just last 7 days? Let's do last 7 days window for "Weekly Activity" chart usually)
        // Or if the UI expects specific day buckets. Let's assume the UI maps index 0-6 to Mon-Sun or Sun-Sat. 
        // Based on typical chart usage, usually it's "This Week".

        // Let's fetch activity logs for the last 7 days
        const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

        // Fetch all progress stats concurrently
        const [courseProgress, vocabProgress, grammarProgress, recentLogs] = await Promise.all([
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

            // Get activity logs
            ctx.db
                .query("activity_logs")
                .withIndex("by_user", q => q.eq("userId", userId))
                .filter(q => q.gte(q.field("createdAt"), sevenDaysAgo))
                .collect(),
        ]);

        const dueReviews = vocabProgress.filter((v) => v.nextReviewAt && v.nextReviewAt <= now).length;
        const masteredWords = vocabProgress.filter((v) => v.status === "MASTERED").length;

        const masteredGrammar = grammarProgress.filter((g) => g.status === "MASTERED").length;

        // Calculate streak (simplified - could be more complex)
        const lastAccess = courseProgress.length > 0
            ? Math.max(...courseProgress.map(p => p.lastAccessAt || 0))
            : 0;

        const oneDayMs = 24 * 60 * 60 * 1000;
        const daysSinceLastAccess = Math.floor((now - lastAccess) / oneDayMs);
        const streak = daysSinceLastAccess <= 1 ? (daysSinceLastAccess === 0 ? 1 : 1) : 0; // Simplified streak logic - to be refined with activity logs if needed

        // Calculate Study Time
        // Daily Minutes
        const todayLogs = recentLogs.filter(log => log.createdAt >= startOfDay);
        const todayMinutes = todayLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
        const dailyProgress = Math.min(Math.round((todayMinutes / 30) * 100), 100); // 30 min goal

        // Weekly Minutes (Last 7 days buckets or Mon-Sun?)
        // Let's do Mon-Sun buckets for consistency with most calendars
        // Finding start of this week's Monday
        const date = new Date(now);
        const day = date.getDay() || 7; // Get current day number, converting Sun. 0 to 7
        if (day !== 1) date.setHours(-24 * (day - 1)); // Set to Monday
        else date.setHours(0, 0, 0, 0); // Is Monday
        const startOfWeek = date.setHours(0, 0, 0, 0);

        const weeklyMinutesArr = [0, 0, 0, 0, 0, 0, 0];
        recentLogs.forEach(log => {
            if (log.createdAt >= startOfWeek) {
                const logDate = new Date(log.createdAt);
                const logDay = logDate.getDay(); // 0=Sun, 1=Mon
                // Map to 0=Mon, 6=Sun
                const index = logDay === 0 ? 6 : logDay - 1;
                weeklyMinutesArr[index] += log.duration || 0;
            }
        });

        // Format for frontend: { day: 'Mon', minutes: 10 }
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const weeklyActivity = weeklyMinutesArr.map((mins, i) => ({
            day: days[i],
            minutes: mins
        }));

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
            weeklyActivity,
            todayMinutes,
            dailyGoal: 30, // Could be user setting
            dailyProgress,
            todayActivities: {
                wordsLearned: masteredWords,
                readingsCompleted: courseProgress.reduce((sum, p) => sum + (p.completedUnits || []).length, 0),
                listeningsCompleted: 0,
            },
            courseProgress: courseDetails,
            currentProgress,
            totalWordsLearned: masteredWords,
            totalGrammarLearned: masteredGrammar,
            wordsToReview: dueReviews,
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

        const { activityType, duration, itemsStudied, metadata } = args;

        console.log(`[Activity] User ${userId}: ${activityType}, Duration: ${duration}m`);

        await ctx.db.insert("activity_logs", {
            userId,
            activityType,
            duration: duration || 0,
            itemsStudied: itemsStudied || 0,
            metadata,
            createdAt: Date.now(),
        });

        return { success: true };
    }
});
