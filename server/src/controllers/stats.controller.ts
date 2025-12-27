import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';

/**
 * GET /api/stats/overview
 * Get dashboard overview statistics
 */
export const getOverviewStats = async (req: AuthRequest, res: Response) => {
    try {
        // Get counts in parallel
        const [
            userCount,
            instituteCount,
            wordCount,
            grammarCount,
            unitCount,
            examCount
        ] = await Promise.all([
            prisma.user.count(),
            prisma.institute.count(),
            (prisma as any).word?.count() ?? 0,
            (prisma as any).grammarPoint?.count() ?? 0,
            (prisma as any).textbookUnit?.count() ?? 0,
            prisma.topikExam.count()
        ]);

        return res.json({
            success: true,
            data: {
                users: userCount,
                institutes: instituteCount,
                vocabulary: wordCount,
                grammar: grammarCount,
                units: unitCount,
                exams: examCount
            }
        });
    } catch (error) {
        console.error('[Stats] getOverviewStats error:', error);
        return res.status(500).json({ error: 'Failed to get overview stats' });
    }
};

/**
 * GET /api/stats/ai-usage
 * Get AI usage and cost statistics
 */
export const getAiUsageStats = async (req: AuthRequest, res: Response) => {
    try {
        const { days = '30' } = req.query;
        const daysNum = parseInt(days as string, 10) || 30;

        const since = new Date();
        since.setDate(since.getDate() - daysNum);

        // Get aggregated stats
        const usageLogs = await (prisma as any).aiUsageLog.findMany({
            where: {
                createdAt: { gte: since }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Aggregate by feature
        const byFeature: Record<string, { calls: number; tokens: number; cost: number }> = {};
        let totalCalls = 0;
        let totalTokens = 0;
        let totalCost = 0;

        for (const log of usageLogs) {
            const feature = log.feature;
            if (!byFeature[feature]) {
                byFeature[feature] = { calls: 0, tokens: 0, cost: 0 };
            }
            byFeature[feature].calls += 1;
            byFeature[feature].tokens += log.inputTokens + log.outputTokens;
            byFeature[feature].cost += log.cost;

            totalCalls += 1;
            totalTokens += log.inputTokens + log.outputTokens;
            totalCost += log.cost;
        }

        // Daily breakdown
        const dailyStats: Record<string, { calls: number; cost: number }> = {};
        for (const log of usageLogs) {
            const day = log.createdAt.toISOString().split('T')[0];
            if (!dailyStats[day]) {
                dailyStats[day] = { calls: 0, cost: 0 };
            }
            dailyStats[day].calls += 1;
            dailyStats[day].cost += log.cost;
        }

        return res.json({
            success: true,
            data: {
                period: `${daysNum} days`,
                summary: {
                    totalCalls,
                    totalTokens,
                    totalCost: Math.round(totalCost * 10000) / 10000 // Round to 4 decimals
                },
                byFeature,
                daily: Object.entries(dailyStats)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([date, stats]) => ({ date, ...stats }))
            }
        });
    } catch (error) {
        console.error('[Stats] getAiUsageStats error:', error);
        return res.status(500).json({ error: 'Failed to get AI usage stats' });
    }
};

/**
 * GET /api/stats/recent-activity
 * Get recent learning activity summary
 */
export const getRecentActivity = async (req: AuthRequest, res: Response) => {
    try {
        const { limit = '20' } = req.query;
        const limitNum = Math.min(parseInt(limit as string, 10) || 20, 100);

        const activities = await prisma.learningActivity.findMany({
            take: limitNum,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                activityType: true,
                duration: true,
                itemsStudied: true,
                createdAt: true,
                userId: true
            }
        });

        // Activity by type summary
        const byType: Record<string, number> = {};
        for (const act of activities) {
            byType[act.activityType] = (byType[act.activityType] || 0) + 1;
        }

        return res.json({
            success: true,
            data: {
                recent: activities,
                summary: byType
            }
        });
    } catch (error) {
        console.error('[Stats] getRecentActivity error:', error);
        return res.status(500).json({ error: 'Failed to get recent activity' });
    }
};

/**
 * Helper: Log AI usage (to be called from ai.service.ts)
 */
export const logAiUsage = async (
    feature: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
    userId?: string
) => {
    try {
        // Cost calculation (approximate rates as of Dec 2024)
        let costPerInputToken = 0;
        let costPerOutputToken = 0;

        if (model.includes('gpt-4o-mini')) {
            costPerInputToken = 0.00000015; // $0.15 per 1M tokens
            costPerOutputToken = 0.0000006; // $0.60 per 1M tokens
        } else if (model.includes('gpt-4o')) {
            costPerInputToken = 0.0000025; // $2.50 per 1M tokens
            costPerOutputToken = 0.00001; // $10 per 1M tokens
        } else if (model.includes('gpt-4')) {
            costPerInputToken = 0.00003;
            costPerOutputToken = 0.00006;
        } else if (model.includes('gpt-3.5')) {
            costPerInputToken = 0.0000005;
            costPerOutputToken = 0.0000015;
        }

        const cost = (inputTokens * costPerInputToken) + (outputTokens * costPerOutputToken);

        await (prisma as any).aiUsageLog.create({
            data: {
                feature,
                model,
                inputTokens,
                outputTokens,
                cost,
                userId
            }
        });

        console.log(`[AI Usage] ${feature} | ${model} | ${inputTokens + outputTokens} tokens | $${cost.toFixed(6)}`);
    } catch (error) {
        console.error('[AI Usage] Failed to log:', error);
        // Don't throw - logging failure shouldn't break the main operation
    }
};
