import { Router } from 'express';
import { authenticate, optionalAuth, requireAdmin } from '../middleware/auth.middleware';
import {
    getListeningUnitsForCourse,
    getListeningUnit,
    saveListeningUnit,
    deleteListeningUnit
} from '../controllers/listening.controller';

const router = Router({ mergeParams: true }); // mergeParams to access :courseId from parent route

/**
 * Listening Module Routes
 * 
 * Base path: /api/courses/:courseId/listening
 */

// List all listening units for a course
router.get('/', optionalAuth, getListeningUnitsForCourse);

// Get a single listening unit with transcript data
router.get('/:unitIndex', optionalAuth, getListeningUnit);

// Create/update listening unit (admin only)
router.post('/:unitIndex', authenticate, requireAdmin, saveListeningUnit);

// Delete listening unit (admin only)
router.delete('/:unitIndex', authenticate, requireAdmin, deleteListeningUnit);

export default router;
