import { Router } from 'express';
import {
    getOverviewStats,
    getAiUsageStats,
    getRecentActivity
} from '../controllers/stats.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// All stats routes require admin authentication
router.get('/overview', authenticate, requireAdmin, getOverviewStats);
router.get('/ai-usage', authenticate, requireAdmin, getAiUsageStats);
router.get('/recent-activity', authenticate, requireAdmin, getRecentActivity);

export default router;
