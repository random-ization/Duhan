
import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { saveWord, saveMistake, saveAnnotation, saveExamAttempt, logActivity, updateLearningProgress } from '../controllers/user.controller';

const router = Router();

router.use(authenticate); // Protect all routes

router.post('/word', saveWord);
router.post('/mistake', saveMistake);
router.post('/annotation', saveAnnotation);
router.post('/exam', saveExamAttempt);
router.post('/activity', logActivity);
router.post('/progress', updateLearningProgress);

export default router;
