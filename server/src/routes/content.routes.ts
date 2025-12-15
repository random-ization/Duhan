import { Router } from 'express';
import {
  getInstitutes,
  createInstitute,
  updateInstitute,
  deleteInstitute,
  getContent,
  saveContent,
  getTopikExams,
  getTopikExamById,
  getTopikExamQuestions,
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
router.get('/topik', getTopikExams); // 列表（不含 questions）
router.get('/topik/:id', getTopikExamById); // 单个详情（含 questionsUrl）
router.get('/topik/:id/questions', getTopikExamQuestions); // 代理获取题目数据 (避免 CORS)
router.get('/legal/:type', getLegalDocument); // Public access to legal documents

// Admin write access
router.post('/institutes', authenticate, createInstitute);
router.put('/institutes/:id', authenticate, updateInstitute);
router.delete('/institutes/:id', authenticate, deleteInstitute);
router.post('/textbook', authenticate, saveContent);
router.post('/topik', authenticate, saveTopikExam);
router.delete('/topik/:id', authenticate, deleteTopikExam);
router.post('/legal/:type', authenticate, saveLegalDocument); // Admin-only write access

export default router;
