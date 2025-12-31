import express from 'express';
import cors from 'cors';
import compression from 'compression';

// Routes that still need Express (file uploads, ffmpeg, RSS parsing)
import authRoutes from './routes/auth.routes';
import uploadRoutes from './routes/upload.routes';
import aiRoutes from './routes/ai.routes';  // Transcript generation needs ffmpeg
import podcastRoutes from './routes/podcast.routes';  // RSS parsing
import videoRoutes from './routes/video.routes';  // Video upload to S3

import { apiLimiter } from './middleware/rateLimit.middleware';

const app = express();

// Middleware
app.use(compression());
app.use(cors());

// JSON Parsing with Raw Body Verify
app.use(express.json({
  limit: '10mb',
  verify: (req: any, res, buf) => {
    req.rawBody = buf.toString();
  }
}) as any);

// Rate limiting
app.use('/api', apiLimiter);

// Routes - Only those that require Express (file handling, ffmpeg, external APIs)
console.log('[Server] Registering routes...');

app.use('/api/auth', authRoutes);
console.log('[Server] /api/auth registered');

app.use('/api/upload', uploadRoutes);
console.log('[Server] /api/upload registered');

app.use('/api/ai', aiRoutes);
console.log('[Server] /api/ai registered');

app.use('/api/podcasts', podcastRoutes);
console.log('[Server] /api/podcasts registered');

app.use('/api/videos', videoRoutes);
console.log('[Server] /api/videos registered');

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Global Error Handler
import { errorHandler } from './middleware/error.middleware';
app.use(errorHandler);

export default app;

