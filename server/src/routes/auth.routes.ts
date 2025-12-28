import { Router } from 'express';
import { register, login, getMe, verifyEmail, resendVerificationEmail, forgotPassword, resetPassword, googleLogin } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

// Apply auth rate limiter to sensitive endpoints
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/google', authLimiter, googleLogin); // Google OAuth
router.get('/me', authenticate, getMe);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', authLimiter, resendVerificationEmail);
router.post('/forgot-password', authLimiter, forgotPassword);
router.post('/reset-password', authLimiter, resetPassword);

export default router;
