import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as dashboardService from '../services/dashboard.service';
import { prisma } from '../lib/prisma';

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

/**
 * GET /api/admin/diagnostics
 * Get detailed data diagnostics
 */
export const getDataDiagnosticsEndpoint = async (req: Request, res: Response) => {
    try {
        const data = await dashboardService.getDataDiagnostics();
        res.json(data);
    } catch (error) {
        console.error('Data Diagnostics Error:', error);
        res.status(500).json({ error: 'Failed to fetch diagnostics' });
    }
};

export const getDbLatencyEndpoint = async (req: Request, res: Response) => {
    try {
        const start = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        const ping = Date.now() - start;

        const scanStart = Date.now();
        const userCount = await prisma.user.count();
        const scan = Date.now() - scanStart;

        res.json({ ping, scan, userCount });
    } catch (error) {
        console.error('DB Latency Error:', error);
        res.status(500).json({ error: String(error) });
    }
};
