import { Router } from 'express';
import * as videoController from '../controllers/video.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public/Protected Search (can be public or protected, making it protected for now to track usage)
router.get('/search', authenticate, videoController.search);

// Import/Analyze Video
router.post('/import', authenticate, videoController.importVideo);

export default router;
