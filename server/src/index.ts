import app from './app';
import dotenv from 'dotenv';
import grammarRoutes from './routes/grammar.routes';

dotenv.config();

// Register Grammar Routes
app.use('/api', grammarRoutes);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
