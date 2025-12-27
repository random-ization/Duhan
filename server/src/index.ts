import app from './app';
import dotenv from 'dotenv';
import grammarRoutes from './routes/grammar.routes';
import statsRoutes from './routes/stats.routes';

dotenv.config();

// Register Routes
app.use('/api/grammar', grammarRoutes);
app.use('/api/stats', statsRoutes);
console.log('[Server] /api/stats registered');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
