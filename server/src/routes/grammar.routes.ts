import { Router } from 'express';
import {
    getUnitGrammar,
    getCourseGrammar,
    checkSentence,
    searchGrammar,
    createGrammar,
    updateGrammar,
    assignGrammarToUnit,
    removeGrammarFromUnit
} from '../controllers/grammar.controller';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// ========== Public/User Routes ==========

// GET /api/grammar/courses/:courseId/all
// Get ALL grammar points for a course (all units) - used by CourseDashboard
router.get('/courses/:courseId/all', authenticate, getCourseGrammar);

// GET /api/grammar/courses/:courseId/units/:unitId/grammar
// Get all grammar points for a course unit with user progress
router.get('/courses/:courseId/units/:unitId/grammar', authenticate, getUnitGrammar);

// POST /api/grammar/:grammarId/check
// AI-powered sentence checking for a specific grammar point
router.post('/:grammarId/check', authenticate, checkSentence);

// ========== Admin Routes ==========

// GET /api/grammar/search?query=xxx
// Search grammar points globally
router.get('/search', authenticate, searchGrammar);

// POST /api/grammar
// Create a new grammar point (Admin only)
router.post('/', authenticate, requireAdmin, createGrammar);

// PUT /api/grammar/:id
// Update a grammar point (Admin only)
router.put('/:id', authenticate, requireAdmin, updateGrammar);

// POST /api/grammar/assign
// Assign grammar to a course unit (Admin only)
router.post('/assign', authenticate, requireAdmin, assignGrammarToUnit);

// DELETE /api/grammar/courses/:courseId/units/:unitIndex/grammar/:grammarId
// Remove grammar from a course unit (Admin only)
router.delete('/courses/:courseId/units/:unitIndex/grammar/:grammarId', authenticate, requireAdmin, removeGrammarFromUnit);

export default router;
