import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { uploadAvatar } from '../lib/storage';
import {
  saveWord,
  saveMistake,
  saveAnnotation,
  saveExamAttempt,
  deleteExamAttempt,
  logActivity,
  updateLearningProgress,
  updateProfileAvatar,
  updateProfile,
  changePassword,
  getUserStats,
  getMyStats
} from '../controllers/user.controller';

const router = Router();

router.use(authenticate);

router.get('/stats', getUserStats);
router.get('/me/stats', getMyStats);
router.post('/word', saveWord);
router.post('/mistake', saveMistake);
router.post('/annotation', saveAnnotation);
router.post('/exam', saveExamAttempt);
router.delete('/exam/:id', deleteExamAttempt);
router.post('/activity', logActivity);
router.post('/progress', updateLearningProgress);
router.post('/avatar', uploadAvatar.single('avatar'), updateProfileAvatar);
router.put('/profile', updateProfile);
router.put('/password', changePassword);

export default router;
