import express from 'express';
import cors from 'cors';
import compression from 'compression';
import contentRoutes from './routes/content.routes';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import adminRoutes from './routes/admin.routes';
import uploadRoutes from './routes/upload.routes';
import dailyPhraseRoutes from './routes/dailyPhrase.routes';
import annotationRoutes from './routes/annotation.routes';
import aiRoutes from './routes/ai.routes';
import notebookRoutes from './routes/notebook.routes';

import podcastRoutes from './routes/podcast.routes';
import videoRoutes from './routes/video.routes';
import vocabRoutes from './routes/vocab.routes';
import grammarRoutes from './routes/grammar.routes';
import unitRoutes from './routes/unit.routes';
import listeningRoutes from './routes/listening.routes';

import { apiLimiter } from './middleware/rateLimit.middleware';

const app = express();

// Middleware - compression 放在最前面
app.use(compression());
app.use(cors());

// JSON Parsing with Raw Body Verify (Required for Webhook Signature)
app.use(express.json({
  limit: '10mb',
  verify: (req: any, res, buf) => {
    req.rawBody = buf.toString();
  }
}) as any);

// Rate limiting - protect all API routes
app.use('/api', apiLimiter);

// Routes (mount admin AFTER app is created and after middleware)
console.log('[Server] Registering routes...');
app.use('/api/auth', authRoutes);
console.log('[Server] /api/auth registered');
app.use('/api/user', userRoutes);
console.log('[Server] /api/user registered');
app.use('/api/content', contentRoutes);
console.log('[Server] /api/content registered');
app.use('/api/admin', adminRoutes);
console.log('[Server] /api/admin registered');
app.use('/api/upload', uploadRoutes);
console.log('[Server] /api/upload registered');
app.use('/api/daily-phrase', dailyPhraseRoutes);
console.log('[Server] /api/daily-phrase registered');
app.use('/api/annotation', annotationRoutes);
console.log('[Server] /api/annotation registered');
app.use('/api/annotations', annotationRoutes);  // 别名，兼容复数形式
console.log('[Server] /api/annotations registered');
app.use('/api/ai', aiRoutes);
console.log('[Server] /api/ai registered');
app.use('/api/notebook', notebookRoutes);
console.log('[Server] /api/notebook registered');
app.use('/api/podcasts', podcastRoutes);
console.log('[Server] /api/podcasts registered');
app.use('/api/vocab', vocabRoutes);
console.log('[Server] /api/vocab registered');
app.use('/api/grammar', grammarRoutes);
console.log('[Server] /api/grammar registered');
app.use('/api/courses/:courseId/units', unitRoutes);
console.log('[Server] /api/courses/:courseId/units registered');
app.use('/api/courses/:courseId/listening', listeningRoutes);
console.log('[Server] /api/courses/:courseId/listening registered');
app.use('/api/videos', videoRoutes);
console.log('[Server] /api/videos registered');

// Payment Routes (Registered specifically to handle raw body for webhooks if needed, though here we use a global middleware trick)
import paymentRoutes from './routes/payment.routes';
app.use('/api/payment', paymentRoutes);
console.log('[Server] /api/payment registered');

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Global Error Handler (MUST be last middleware)
import { errorHandler } from './middleware/error.middleware';
app.use(errorHandler);

export default app;
