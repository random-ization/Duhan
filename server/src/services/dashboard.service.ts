import { prisma } from '../lib/prisma';

/**
 * Dashboard Service
 * Aggregates statistics for admin dashboard
 */

interface DashboardStats {
    totalUsers: number;
    totalInstitutes: number;
    activeLearnersLast7Days: number;
    paidUsers: number;
    monthlyAiCost: number;
}

interface UserGrowthData {
    date: string;
    count: number;
}

interface ActivityHeatmapData {
    date: string;
    count: number;
}

/**
 * Get core dashboard statistics
 */
export const getStats = async (): Promise<DashboardStats> => {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
        totalUsers,
        totalInstitutes,
        activeLearnersResult,
        paidUsers,
        monthlyAiCostResult
    ] = await Promise.all([
        // Total users
        prisma.user.count(),

        // Total institutes
        prisma.institute.count(),

        // Active learners (distinct users with activity in last 7 days)
        prisma.learningActivity.findMany({
            where: {
                createdAt: { gte: sevenDaysAgo }
            },
            select: { userId: true },
            distinct: ['userId']
        }),

        // Paid users (subscriptionType != FREE)
        prisma.user.count({
            where: {
                subscriptionType: { not: 'FREE' }
            }
        }),

        // Monthly AI cost aggregation
        (prisma as any).aiUsageLog.aggregate({
            where: {
                createdAt: { gte: startOfMonth }
            },
            _sum: { cost: true }
        })
    ]);

    return {
        totalUsers,
        totalInstitutes,
        activeLearnersLast7Days: activeLearnersResult.length,
        paidUsers,
        monthlyAiCost: monthlyAiCostResult._sum?.cost ?? 0
    };
};

/**
 * Get user growth trend (past 30 days, daily new users)
 */
export const getUserGrowthTrend = async (): Promise<UserGrowthData[]> => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get all users created in the past 30 days
    const users = await prisma.user.findMany({
        where: {
            createdAt: { gte: thirtyDaysAgo }
        },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' }
    });

    // Group by day
    const dailyCounts: Record<string, number> = {};

    // Initialize all 30 days with 0
    for (let i = 0; i < 30; i++) {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        const dateStr = date.toISOString().split('T')[0];
        dailyCounts[dateStr] = 0;
    }

    // Count users per day
    for (const user of users) {
        const dateStr = user.createdAt.toISOString().split('T')[0];
        if (dailyCounts[dateStr] !== undefined) {
            dailyCounts[dateStr]++;
        }
    }

    return Object.entries(dailyCounts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count }));
};

/**
 * Get activity heatmap (past 6 months, daily activity count)
 */
export const getActivityHeatmap = async (): Promise<ActivityHeatmapData[]> => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Get all learning activities in the past 6 months
    const activities = await prisma.learningActivity.findMany({
        where: {
            createdAt: { gte: sixMonthsAgo }
        },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' }
    });

    // Group by day
    const dailyCounts: Record<string, number> = {};

    for (const activity of activities) {
        const dateStr = activity.createdAt.toISOString().split('T')[0];
        dailyCounts[dateStr] = (dailyCounts[dateStr] || 0) + 1;
    }

    return Object.entries(dailyCounts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count }));
};

/**
 * Get content statistics
 */
export const getContentStats = async () => {
    const [
        vocabCount,
        grammarCount,
        unitCount,
        examCount
    ] = await Promise.all([
        (prisma as any).word?.count() ?? Promise.resolve(0),
        (prisma as any).grammarPoint?.count() ?? Promise.resolve(0),
        (prisma as any).textbookUnit?.count() ?? Promise.resolve(0),
        prisma.topikExam.count()
    ]);

    return {
        vocabulary: vocabCount || 0,
        grammar: grammarCount || 0,
        units: unitCount || 0,
        exams: examCount
    };
};

/**
 * Get AI usage breakdown by feature
 */
export const getAiUsageBreakdown = async (days: number = 30) => {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const logs = await (prisma as any).aiUsageLog.findMany({
        where: {
            createdAt: { gte: since }
        },
        orderBy: { createdAt: 'desc' }
    });

    // Aggregate by feature
    const byFeature: Record<string, { calls: number; tokens: number; cost: number }> = {};

    for (const log of logs) {
        if (!byFeature[log.feature]) {
            byFeature[log.feature] = { calls: 0, tokens: 0, cost: 0 };
        }
        byFeature[log.feature].calls++;
        byFeature[log.feature].tokens += log.inputTokens + log.outputTokens;
        byFeature[log.feature].cost += log.cost;
    }

    // Daily breakdown
    const dailyStats: Record<string, { calls: number; cost: number }> = {};
    for (const log of logs) {
        const day = log.createdAt.toISOString().split('T')[0];
        if (!dailyStats[day]) {
            dailyStats[day] = { calls: 0, cost: 0 };
        }
        dailyStats[day].calls++;
        dailyStats[day].cost += log.cost;
    }

    return {
        byFeature,
        daily: Object.entries(dailyStats)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, stats]) => ({ date, ...stats }))
    };
};
