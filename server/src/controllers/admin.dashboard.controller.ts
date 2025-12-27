import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as dashboardService from '../services/dashboard.service';

/**
 * GET /api/admin/dashboard/stats
 * Get comprehensive dashboard data for admin panel
 */
export const getDashboardData = async (req: AuthRequest, res: Response) => {
    try {
        // Fetch all data in parallel
        const [stats, contentStats, userTrend, activityHeatmap, aiUsage] = await Promise.all([
            dashboardService.getStats(),
            dashboardService.getContentStats(),
            dashboardService.getUserGrowthTrend(),
            dashboardService.getActivityHeatmap(),
            dashboardService.getAiUsageBreakdown(30)
        ]);

        return res.json({
            success: true,
            data: {
                stats: {
                    ...stats,
                    ...contentStats
                },
                charts: {
                    userTrend,
                    activityHeatmap
                },
                aiUsage
            }
        });
    } catch (error) {
        console.error('[Admin Dashboard] getDashboardData error:', error);
        return res.status(500).json({ error: 'Failed to get dashboard data' });
    }
};

/**
 * GET /api/admin/dashboard/ai-costs
 * Get detailed AI cost breakdown
 */
export const getAiCostsDetail = async (req: AuthRequest, res: Response) => {
    try {
        const { days = '30' } = req.query;
        const daysNum = parseInt(days as string, 10) || 30;

        const aiUsage = await dashboardService.getAiUsageBreakdown(daysNum);

        return res.json({
            success: true,
            data: aiUsage
        });
    } catch (error) {
        console.error('[Admin Dashboard] getAiCostsDetail error:', error);
        return res.status(500).json({ error: 'Failed to get AI costs' });
    }
};
