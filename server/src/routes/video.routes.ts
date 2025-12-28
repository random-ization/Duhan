import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.middleware';
import {
    uploadVideo,
    updateVideo,
    deleteVideo,
    listVideos,
    getVideo,
} from '../controllers/video.controller';

const router = Router();

/**
 * Video Learning Routes
 * Base path: /api/videos
 */

// Public/User routes (require authentication)
router.get('/', authenticate, listVideos);
router.get('/:id', authenticate, getVideo);

// Admin-only routes
router.post('/', authenticate, requireAdmin, uploadVideo);
router.put('/:id', authenticate, requireAdmin, updateVideo);
router.delete('/:id', authenticate, requireAdmin, deleteVideo);

export default router;
