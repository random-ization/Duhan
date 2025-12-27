import { prisma } from '../lib/prisma';

/**
 * User Dashboard Service
 * Aggregates personalized learning statistics for users
 */

interface UserDashboardStats {
    streak: number;           // Consecutive days with learning activity
    todayMinutes: number;     // Total learning time today (minutes)
    dailyGoal: number;        // Daily goal in minutes (default 30)
    wordsToReview: number;    // Words due for review
    totalWordsLearned: number;
    totalGrammarLearned: number;
    weeklyActivity: { day: string; minutes: number }[];
}

/**
 * Calculate consecutive days streak
 */
const calculateStreak = async (userId: string): Promise<number> => {
    // Get all learning activities ordered by date descending
    const activities = await prisma.learningActivity.findMany({
        where: { userId },
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' }
    });

    if (activities.length === 0) return 0;

    // Group by date
    const dates = new Set<string>();
    for (const act of activities) {
        dates.add(act.createdAt.toISOString().split('T')[0]);
    }

    const sortedDates = Array.from(dates).sort((a, b) => b.localeCompare(a));

    // Check if today or yesterday has activity
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (sortedDates[0] !== today && sortedDates[0] !== yesterday) {
        return 0; // Streak broken
    }

    // Count consecutive days
    let streak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
        const prevDate = new Date(sortedDates[i - 1]);
        const currDate = new Date(sortedDates[i]);
        const diffDays = Math.floor((prevDate.getTime() - currDate.getTime()) / 86400000);

        if (diffDays === 1) {
            streak++;
        } else {
            break;
        }
    }

    return streak;
};

/**
 * Get today's total learning minutes
 */
const getTodayMinutes = async (userId: string): Promise<number> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activities = await prisma.learningActivity.findMany({
        where: {
            userId,
            createdAt: { gte: today }
        },
        select: { duration: true }
    });

    const totalSeconds = activities.reduce((sum, a) => sum + (a.duration || 0), 0);
    return Math.round(totalSeconds / 60);
};

/**
 * Get weekly activity (last 7 days)
 */
const getWeeklyActivity = async (userId: string): Promise<{ day: string; minutes: number }[]> => {
    const result: { day: string; minutes: number }[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const activities = await prisma.learningActivity.findMany({
            where: {
                userId,
                createdAt: { gte: date, lt: nextDate }
            },
            select: { duration: true }
        });

        const totalSeconds = activities.reduce((sum, a) => sum + (a.duration || 0), 0);
        const dayNames = ['日', '一', '二', '三', '四', '五', '六'];

        result.push({
            day: dayNames[date.getDay()],
            minutes: Math.round(totalSeconds / 60)
        });
    }

    return result;
};

/**
 * Get user dashboard statistics
 */
export const getUserDashboardStats = async (userId: string): Promise<UserDashboardStats> => {
    const now = new Date();

    // Get all stats in parallel
    const [
        streak,
        todayMinutes,
        weeklyActivity,
        wordsProgress,
        grammarProgress,
        wordsToReviewResult
    ] = await Promise.all([
        calculateStreak(userId),
        getTodayMinutes(userId),
        getWeeklyActivity(userId),

        // Total words learned (status != NEW)
        (prisma as any).userWordProgress?.count({
            where: { userId, status: { not: 'NEW' } }
        }) ?? Promise.resolve(0),

        // Total grammar learned
        (prisma as any).userGrammarProgress?.count({
            where: { userId, status: { not: 'NEW' } }
        }) ?? Promise.resolve(0),

        // Words to review (nextReviewAt <= now)
        (prisma as any).userWordProgress?.count({
            where: {
                userId,
                status: { not: 'NEW' },
                nextReviewAt: { lte: now }
            }
        }) ?? Promise.resolve(0)
    ]);

    return {
        streak,
        todayMinutes,
        dailyGoal: 30, // Default daily goal: 30 minutes
        wordsToReview: wordsToReviewResult || 0,
        totalWordsLearned: wordsProgress || 0,
        totalGrammarLearned: grammarProgress || 0,
        weeklyActivity
    };
};

/**
 * Get user's current learning progress (for "Continue Learning" card)
 */
export const getCurrentProgress = async (userId: string) => {
    // Get user's last learning progress from User model
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            lastInstitute: true,
            lastLevel: true,
            lastUnit: true,
            lastModule: true
        }
    });

    if (!user || !user.lastInstitute) {
        return null;
    }

    // Get institute info
    const institute = await prisma.institute.findUnique({
        where: { id: user.lastInstitute }
    });

    return {
        instituteName: institute?.name || user.lastInstitute,
        level: user.lastLevel || 1,
        unit: user.lastUnit || 1,
        module: user.lastModule || 'vocab'
    };
};
