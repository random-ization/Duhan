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

const app = express();

// Middleware - compression 放在最前面
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }) as any);

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

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

export default app;
