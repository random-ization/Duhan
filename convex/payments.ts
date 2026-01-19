'use node';
import { action } from './_generated/server';
import { v } from 'convex/values';
import { toErrorMessage } from './errors';
import { readString } from './validation';
import { makeFunctionReference } from 'convex/server';
import type { FunctionReference } from 'convex/server';

type GrantAccessArgs = {
  customerEmail: string;
  plan: string;
  creemCustomerId?: string;
  creemSubscriptionId?: string;
  lemonSqueezyCustomerId?: string;
  lemonSqueezySubscriptionId?: string;
  userId?: string;
};

type RevokeAccessArgs = {
  customerEmail: string;
  userId?: string;
};

const grantAccessMutation = makeFunctionReference<
  'mutation',
  GrantAccessArgs,
  { success: boolean; error?: string }
>('paymentsMutations:grantAccess') as unknown as FunctionReference<
  'mutation',
  'internal',
  GrantAccessArgs,
  { success: boolean; error?: string }
>;

const revokeAccessMutation = makeFunctionReference<
  'mutation',
  RevokeAccessArgs,
  { success: boolean; error?: string }
>('paymentsMutations:revokeAccess') as unknown as FunctionReference<
  'mutation',
  'internal',
  RevokeAccessArgs,
  { success: boolean; error?: string }
>;

// Lazy import creem_io to avoid bundling issues
async function getCreemClient() {
  const { createCreem } = await import('creem_io');
  return createCreem({
    apiKey: process.env.CREEM_API_KEY!,
    webhookSecret: process.env.CREEM_WEBHOOK_SECRET,
    testMode: process.env.CREEM_TEST_MODE === 'true',
  });
}

const PRODUCT_MAP: Record<string, string> = {
  MONTHLY: process.env.CREEM_PRODUCT_MONTHLY || '',
  ANNUAL: process.env.CREEM_PRODUCT_ANNUAL || '',
  LIFETIME: process.env.CREEM_PRODUCT_LIFETIME || '',
};

// Create a Creem checkout session
export const createCheckoutSession = action({
  args: {
    plan: v.string(), // "MONTHLY" | "ANNUAL" | "LIFETIME"
    userId: v.optional(v.string()),
    userEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const productId = PRODUCT_MAP[args.plan];

    console.log('[Checkout] Creating session for plan:', args.plan);
    if (!productId) {
      throw new Error(`Invalid plan: ${args.plan}. No product ID configured.`);
    }

    const appUrl = process.env.VITE_APP_URL || 'http://localhost:3000';
    const isTestMode =
      process.env.CREEM_API_KEY?.startsWith('creem_test_') ||
      process.env.CREEM_TEST_MODE === 'true';

    try {
      const creem = await getCreemClient();
      const checkout = await creem.checkouts.create({
        productId,
        successUrl: `${appUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        customer: args.userEmail ? { email: args.userEmail } : undefined,
        metadata: {
          userId: args.userId || '',
          plan: args.plan,
        },
      });

      console.log('[Checkout] Success! URL:', checkout.checkoutUrl);
      return { checkoutUrl: checkout.checkoutUrl };
    } catch (error: unknown) {
      console.error('[Checkout] API Error:', toErrorMessage(error));

      // Fallback to direct payment link if API fails
      const paymentPath = isTestMode ? 'test/payment' : 'payment';
      const directUrl = `https://www.creem.io/${paymentPath}/${productId}`;
      console.log('[Checkout] Using fallback direct link:', directUrl);

      return { checkoutUrl: directUrl };
    }
  },
});

// Verify a payment session (called after redirect back)
export const verifyPaymentSession = action({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const creem = await getCreemClient();

    try {
      const checkout = await creem.checkouts.get({
        checkoutId: args.sessionId,
      });

      if (checkout.status === 'completed') {
        return { success: true, status: 'completed' };
      }

      return { success: false, status: checkout.status };
    } catch (error: unknown) {
      console.error('Error verifying payment session:', toErrorMessage(error));
      return { success: false, error: toErrorMessage(error) };
    }
  },
});

// Handle Creem webhook (called by HTTP handler)
export const handleWebhook = action({
  args: {
    body: v.string(),
    signature: v.string(),
  },
  handler: async (ctx, args) => {
    const { createCreem } = await import('creem_io');

    const creem = createCreem({
      apiKey: process.env.CREEM_API_KEY!,
      webhookSecret: process.env.CREEM_WEBHOOK_SECRET!,
    });

    try {
      await creem.webhooks.handleEvents(args.body, args.signature, {
        // Called when subscription becomes active, trialing, or paid
        onGrantAccess: async (event: unknown) => {
          const reason = readString(event, ['reason']) ?? 'unknown';
          const customerEmail = readString(event, ['customer', 'email']);
          const customerId = readString(event, ['customer', 'id']);
          const plan = readString(event, ['metadata', 'plan']) ?? 'MONTHLY';
          const userId = readString(event, ['metadata', 'userId']);

          console.log(`[Webhook] Grant access: ${reason} for ${customerEmail ?? 'unknown'}`);

          if (customerEmail) {
            await ctx.runMutation(grantAccessMutation, {
              customerEmail,
              plan,
              creemCustomerId: customerId,
              userId,
            });
          }
        },

        // Called when subscription is paused or expired
        onRevokeAccess: async (event: unknown) => {
          const reason = readString(event, ['reason']) ?? 'unknown';
          const customerEmail = readString(event, ['customer', 'email']);
          const userId = readString(event, ['metadata', 'userId']);

          console.log(`[Webhook] Revoke access: ${reason} for ${customerEmail ?? 'unknown'}`);

          if (customerEmail) {
            await ctx.runMutation(revokeAccessMutation, {
              customerEmail,
              userId,
            });
          }
        },

        // Called when checkout is completed
        onCheckoutCompleted: async (event: unknown) => {
          const customerEmail = readString(event, ['customer', 'email']);
          console.log(`[Webhook] Checkout completed for ${customerEmail ?? 'unknown'}`);
        },
      });

      return { success: true };
    } catch (error: unknown) {
      console.error('Webhook processing error:', toErrorMessage(error));
      return { success: false, error: toErrorMessage(error) };
    }
  },
});
