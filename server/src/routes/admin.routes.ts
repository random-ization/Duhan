import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { getUsers, updateUser, deleteUser } from '../controllers/admin.user.controller';
import { AdminVocabController } from '../controllers/admin.vocab.controller';
import { getDashboardData, getAiCostsDetail, getDataDiagnosticsEndpoint, getDbLatencyEndpoint } from '../controllers/admin.dashboard.controller';
import { uploadMedia } from '../lib/storage';

const router = Router();

// 1. Authentication
router.use(authenticate);

// 2. Authorization (Ensure Admin)
router.use((req, res, next) => {
    const u = (req as any).user;
    if (u && u.role === 'ADMIN') {
        next();
    } else {
        res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
});

// Dashboard Statistics
router.get('/dashboard/stats', getDashboardData);
router.get('/dashboard/ai-costs', getAiCostsDetail);
router.get('/diagnostics', getDataDiagnosticsEndpoint);
router.get('/db-latency', getDbLatencyEndpoint);

// User Management
router.get('/users', getUsers);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Vocabulary Management
router.get('/vocab', AdminVocabController.getList);
router.post('/vocab/bulk', AdminVocabController.bulkImport);
router.patch('/vocab/:id', AdminVocabController.updateItem);
router.delete('/vocab/:id', AdminVocabController.deleteItem);
router.post('/vocab/:id/tts', AdminVocabController.generateAudio);
router.post('/vocab/:id/upload', uploadMedia.single('file'), AdminVocabController.uploadAudio);

export default router;

