import express from 'express';
import cors from 'cors';
import contentRoutes from './routes/content.routes';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import adminRoutes from './routes/admin.routes';
import uploadRoutes from './routes/upload.routes';

const app = express();

// Middleware
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

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Debug endpoint to test API routing
app.get('/api/debug', (req, res) => {
  res.json({
    message: 'API routes are working!',
    path: req.path,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl
  });
});

export default app;
