import { Router } from 'express';
import {
  getInstitutes,
  createInstitute,
  getContent,
  saveContent,
  getTopikExams,
  saveTopikExam,
  deleteTopikExam,
  getLegalDocument,
  saveLegalDocument,
} from '../controllers/content.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Public read access (or protected depending on requirements, usually public for learners)
router.get('/institutes', getInstitutes);
router.get('/textbook', getContent); // Get all context map for simplicity in this demo
router.get('/topik', getTopikExams);
router.get('/legal/:type', getLegalDocument); // Public access to legal documents

// Admin write access
router.post('/institutes', authenticate, createInstitute);
router.post('/textbook', authenticate, saveContent);
router.post('/topik', authenticate, saveTopikExam);
router.delete('/topik/:id', authenticate, deleteTopikExam);
router.post('/legal/:type', authenticate, saveLegalDocument); // Admin-only write access

export default router;
