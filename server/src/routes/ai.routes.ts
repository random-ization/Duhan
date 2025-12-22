import { Router } from 'express';
import {
    analyzeQuestion,
    analyzeSentenceHandler,
    generateTranscriptHandler,
    checkTranscriptHandler
} from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// POST /api/ai/analyze-question - 分析 TOPIK 题目
router.post('/analyze-question', authenticate, analyzeQuestion);

// POST /api/ai/analyze-sentence - 分析韩语句子
router.post('/analyze-sentence', authenticate, analyzeSentenceHandler);

// POST /api/ai/transcript - 生成播客字幕
router.post('/transcript', authenticate, generateTranscriptHandler);

// GET /api/ai/transcript/:episodeId - 检查字幕缓存
router.get('/transcript/:episodeId', authenticate, checkTranscriptHandler);

export default router;
