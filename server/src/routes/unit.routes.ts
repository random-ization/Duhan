import { Router } from 'express';
import { authenticate, optionalAuth, requireAdmin } from '../middleware/auth.middleware';
import {
    getUnitPage,
    getUnitsForCourse,
    saveUnit,
    analyzeUnit,
    saveUnitAnnotation,
    deleteUnitAnnotation
} from '../controllers/unit.controller';

const router = Router({ mergeParams: true }); // mergeParams to access :courseId from parent route

/**
 * Reading Module Unit Routes
 * 
 * Base path: /api/courses/:courseId/units
 */

// List all units for a course (admin list view)
router.get('/', optionalAuth, getUnitsForCourse);

// Get all data for a unit page (reading, vocab, grammar, annotations)
// Uses optional auth - returns data even for non-authenticated users (but no annotations)
router.get('/:unitIndex', optionalAuth, getUnitPage);

// Create/update unit content (admin only - triggers AI analysis)
router.post('/:unitIndex', authenticate, requireAdmin, saveUnit);

// Re-run AI analysis on existing unit (admin only)
router.post('/:unitIndex/analyze', authenticate, requireAdmin, analyzeUnit);

// Save annotation (requires auth)
router.post('/:unitIndex/annotation', authenticate, saveUnitAnnotation);

// Delete annotation (requires auth)
router.delete('/:unitIndex/annotation/:annotationId', authenticate, deleteUnitAnnotation);

export default router;
