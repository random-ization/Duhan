
import { Request, Response } from 'express';
import { PaymentService } from '../services/payment.service';
import { AuthRequest } from '../middleware/auth.middleware';
import crypto from 'crypto';

export class PaymentController {

    static async createCheckoutSession(req: Request, res: Response) {
        try {
            const { plan } = req.body;
            const authReq = req as AuthRequest;
            const userId = authReq.user?.userId;

            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            if (!plan) {
                return res.status(400).json({ error: 'Plan is required' });
            }

            const result = await PaymentService.createCheckoutSession({
                userId,
                plan: plan as 'MONTHLY' | 'ANNUAL' | 'LIFETIME'
            });

            res.json(result);
        } catch (error: any) {
            console.error('Create Checkout Error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    static async handleWebhook(req: Request, res: Response) {
        // 1. Verify Signature
        const signature = req.headers['x-creem-signature'] as string;
        const secret = process.env.CREEM_WEBHOOK_SECRET;

        if (!secret) {
            console.error('Webhook Secret not configured');
            return res.status(500).json({ error: 'Server configuration error' });
        }

        if (!signature) {
            return res.status(400).json({ error: 'Missing signature' });
        }

        // Verify: The body must be the RAW buffer
        // IMPORTANT: In app.ts, we need to ensure this route gets the raw body
        const rawBody = (req as any).rawBody;

        if (!rawBody) {
            console.warn("Raw body missing. Make sure body-parser is configured correctly for webhooks.");
            // fallback: try using JSON.stringify if rawBody isn't attached (unreliable if spacing/keys differ)
        }

        const computedSignature = crypto
            .createHmac('sha256', secret)
            .update(rawBody || JSON.stringify(req.body)) // Fallback to body if raw missing (risky)
            .digest('hex');

        if (computedSignature !== signature) {
            console.warn('Invalid Webhook Signature');
            return res.status(400).json({ error: 'Invalid signature' });
        }

        try {
            const event = req.body; // Parsed JSON
            await PaymentService.handleWebhook(event);
            res.json({ received: true });
        } catch (error: any) {
            console.error('Webhook Error:', error);
            res.status(500).json({ error: 'Webhook processing failed' });
        }
    }

    static async verifySession(req: Request, res: Response) {
        try {
            const sessionId = req.query.session_id as string;
            const result = await PaymentService.verifySession(sessionId);
            res.json(result);
        } catch (error: any) {
            console.error('Verify Session Error:', error);
            res.status(500).json({ error: error.message });
        }
    }
}
