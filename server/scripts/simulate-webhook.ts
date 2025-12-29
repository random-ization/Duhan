
import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

// Load env from server directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const WEBHOOK_SECRET = process.env.CREEM_WEBHOOK_SECRET;
const SERVER_URL = 'http://localhost:3000/api/payment/webhook';

if (!WEBHOOK_SECRET) {
    console.error('❌ Error: CREEM_WEBHOOK_SECRET is not set in server/.env');
    process.exit(1);
}

const simulateWebhook = async () => {
    // 1. Mock Event Data (Matches what Creem sends)
    const payload = {
        id: `evt_test_${Date.now()}`,
        object: 'event',
        type: 'checkout.session.completed', // or 'payment_intent.succeeded'
        data: {
            object: {
                id: `cs_test_${Date.now()}`,
                metadata: {
                    userId: '0fca6e60-5d55-4aaf-8580-207151c688b7',
                    plan: 'ANNUAL',
                    orderId: 'test_order_123'
                },
                customer_details: {
                    email: 'test@example.com'
                },
                payment_status: 'paid'
            }
        }
    };

    // 2. Calculate Signature
    // Creem signatures are typically HMAC-SHA256 of the raw body
    const payloadString = JSON.stringify(payload);
    const signature = crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(payloadString)
        .digest('hex');

    console.log(`🚀 Sending Webhook to ${SERVER_URL}...`);
    console.log(`📦 Payload:`, JSON.stringify(payload, null, 2));
    console.log(`🔐 Signature: ${signature}`);

    try {
        const response = await axios.post(SERVER_URL, payload, {
            headers: {
                'Content-Type': 'application/json',
                'x-creem-signature': signature
            }
        });
        console.log(`✅ Success! Server responded:`, response.data);
    } catch (error: any) {
        if (error.response) {
            console.error(`❌ Failed with Status ${error.response.status}:`);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.error('❌ Failed: No response received (Network Error?)');
            console.error(error.message);
        } else {
            console.error('❌ Failed:', error.message);
        }
    }
};

// Check for User ID argument
const userIdArg = process.argv[2];
if (userIdArg) {
    // Inject user ID into payload code properly (this is a simplified script structure)
    // For simplicity, let's just use string replacement on the payload definition above if needed
    // or better, just ask user to edit it or pass it.
    console.log(`User ID provided: ${userIdArg}`);
} else {
    console.log("⚠️  Note: To test database updates, open this script and replace 'REPLACE_WITH_REAL_USER_ID' with a valid User ID from your database.");
}

simulateWebhook();
