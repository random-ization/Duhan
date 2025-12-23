import { Router } from 'express';
import { register, login, getMe, verifyEmail, resendVerificationEmail, forgotPassword, resetPassword, googleLogin } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin); // Google OAuth
router.get('/me', authenticate, getMe);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;

