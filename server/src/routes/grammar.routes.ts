import { Router } from 'express';
import { getUnitGrammar, checkSentence } from '../controllers/grammar.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// GET /api/grammar/courses/:courseId/units/:unitId/grammar
// Get all grammar points for a course unit with user progress
router.get('/courses/:courseId/units/:unitId/grammar', authenticate, getUnitGrammar);

// POST /api/grammar/:grammarId/check
// AI-powered sentence checking for a specific grammar point
router.post('/:grammarId/check', authenticate, checkSentence);

export default router;
