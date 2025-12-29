
import express from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = express.Router();

// Protected: Create Checkout
router.post('/checkout', authenticate, PaymentController.createCheckoutSession);

// Public: Verify Session
router.get('/verify', PaymentController.verifySession);

// Public: Webhook (Must be handled carefully in app.ts to preserve raw body)
router.post('/webhook', PaymentController.handleWebhook);

export default router;
