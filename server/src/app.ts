import express from 'express';
import cors from 'cors';
import contentRoutes from './routes/content.routes';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import adminRoutes from './routes/admin.routes';

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }) as any);

// Routes (mount admin AFTER app is created and after middleware)
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/admin', adminRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

export default app;
