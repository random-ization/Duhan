import { Router } from 'express';
import { analyzeQuestion } from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// POST /api/ai/analyze-question - 分析 TOPIK 题目
router.post('/analyze-question', authenticate, analyzeQuestion);

export default router;
