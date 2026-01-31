'use node';
import { action } from './_generated/server';
import { v } from 'convex/values';
import crypto from 'node:crypto';
import { makeFunctionReference } from 'convex/server';
import type { FunctionReference } from 'convex/server';
import { toErrorMessage } from './errors';
import { getPath, isRecord, parseJson, readString } from './validation';

const readStringish = (value: unknown, path: readonly string[]): string | undefined => {
  const v = getPath(value, path);
  if (typeof v === 'string') return v;
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return undefined;
};

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

// Environment variable names
const API_KEY_ENV = 'LEMONSQUEEZY_API_KEY';
const WEBHOOK_SECRET_ENV = 'LEMONSQUEEZY_WEBHOOK_SECRET';
const STORE_ID_ENV = 'LEMONSQUEEZY_STORE_ID';

// Variant IDs for each plan
// Variant IDs for each plan
const VARIANT_MAP: Record<string, Record<string, string>> = {
  GLOBAL: {
    MONTHLY: process.env.LEMONSQUEEZY_VARIANT_MONTHLY || '',
    SEMIANNUAL: process.env.LEMONSQUEEZY_VARIANT_SEMIANNUAL || '',
    QUARTERLY: process.env.LEMONSQUEEZY_VARIANT_QUARTERLY || '',
    ANNUAL: process.env.LEMONSQUEEZY_VARIANT_ANNUAL || '',
    LIFETIME: process.env.LEMONSQUEEZY_VARIANT_LIFETIME || '',
  },
  REGIONAL: {
    MONTHLY: process.env.LEMONSQUEEZY_VARIANT_MONTHLY_REGIONAL || '',
    SEMIANNUAL: process.env.LEMONSQUEEZY_VARIANT_SEMIANNUAL_REGIONAL || '',
    QUARTERLY: process.env.LEMONSQUEEZY_VARIANT_QUARTERLY_REGIONAL || '',
    ANNUAL: process.env.LEMONSQUEEZY_VARIANT_ANNUAL_REGIONAL || '',
    LIFETIME: process.env.LEMONSQUEEZY_VARIANT_LIFETIME_REGIONAL || '',
  },
};

const LEMONSQUEEZY_API_URL = 'https://api.lemonsqueezy.com/v1';

/**
 * Create a Lemon Squeezy checkout session
 */
export const createCheckout = action({
  args: {
    plan: v.string(), // "MONTHLY" | "ANNUAL" | "LIFETIME"
    userId: v.optional(v.string()),
    userEmail: v.optional(v.string()),
    userName: v.optional(v.string()),
    region: v.optional(v.string()), // "GLOBAL" | "REGIONAL"
  },
  handler: async (ctx, args) => {
    const apiKey = process.env[API_KEY_ENV];
    const storeId = process.env[STORE_ID_ENV];

    if (!apiKey) {
      throw new Error(`Missing ${API_KEY_ENV} environment variable`);
    }
    if (!storeId) {
      throw new Error(`Missing ${STORE_ID_ENV} environment variable`);
    }

    const region = args.region === 'REGIONAL' ? 'REGIONAL' : 'GLOBAL';
    const variantId = VARIANT_MAP[region]?.[args.plan];

    if (!variantId) {
      throw new Error(`Invalid plan: ${args.plan} for region ${region}. No variant ID configured.`);
    }

    const appUrl = process.env.VITE_APP_URL || 'http://localhost:3000';

    // Build checkout request body (JSON:API format)
    const requestBody = {
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            email: args.userEmail || undefined,
            name: args.userName || undefined,
            custom: {
              user_id: args.userId || '',
              plan: args.plan,
            },
          },
          product_options: {
            redirect_url: `${appUrl}/payment/success?provider=lemonsqueezy`,
          },
        },
        relationships: {
          store: {
            data: {
              type: 'stores',
              id: storeId,
            },
          },
          variant: {
            data: {
              type: 'variants',
              id: variantId,
            },
          },
        },
      },
    };

    console.log('[LemonSqueezy] Creating checkout for plan:', args.plan);

    try {
      const response = await fetch(`${LEMONSQUEEZY_API_URL}/checkouts`, {
        method: 'POST',
        headers: {
          Accept: 'application/vnd.api+json',
          'Content-Type': 'application/vnd.api+json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[LemonSqueezy] API Error:', response.status, errorText);
        throw new Error(`Lemon Squeezy API error: ${response.status}`);
      }

      const data = await response.json();
      const checkoutUrl = data.data?.attributes?.url;

      if (!checkoutUrl) {
        throw new Error('No checkout URL returned from Lemon Squeezy');
      }

      console.log('[LemonSqueezy] Checkout created:', checkoutUrl);
      return { checkoutUrl };
    } catch (error: unknown) {
      console.error('[LemonSqueezy] Error creating checkout:', toErrorMessage(error));
      throw error instanceof Error ? error : new Error(toErrorMessage(error));
    }
  },
});

/**
 * Verify webhook signature from Lemon Squeezy
 */
function verifySignature(payload: string, signature: string, secret: string): boolean {
  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(payload).digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(digest, 'utf8'), Buffer.from(signature, 'utf8'));
  } catch {
    return false;
  }
}

/**
 * Handle Lemon Squeezy webhook events
 */
export const handleWebhook = action({
  args: {
    body: v.string(),
    signature: v.string(),
  },
  handler: async (ctx, args) => {
    const webhookSecret = process.env[WEBHOOK_SECRET_ENV];

    if (!webhookSecret) {
      console.error(`Missing ${WEBHOOK_SECRET_ENV} environment variable`);
      return { success: false, error: 'Webhook secret not configured' };
    }

    // Verify signature
    if (!verifySignature(args.body, args.signature, webhookSecret)) {
      console.error('[LemonSqueezy] Invalid webhook signature');
      return { success: false, error: 'Invalid signature' };
    }

    // Parse webhook payload
    let payload: unknown;
    try {
      payload = parseJson(args.body);
    } catch {
      console.error('[LemonSqueezy] Failed to parse webhook body');
      return { success: false, error: 'Invalid JSON' };
    }

    const eventName = readString(payload, ['meta', 'event_name']);
    const customData = getPath(payload, ['meta', 'custom_data']);
    const attributes = getPath(payload, ['data', 'attributes']);
    const userEmail = readString(payload, ['data', 'attributes', 'user_email']);
    const userId = isRecord(customData) ? readString(customData, ['user_id']) : undefined;
    const planFromCustom = isRecord(customData) ? readString(customData, ['plan']) : undefined;
    const customerId = readStringish(payload, ['data', 'attributes', 'customer_id']);
    const subscriptionOrOrderId = readStringish(payload, ['data', 'id']);

    console.log(`[LemonSqueezy] Webhook received: ${eventName ?? 'unknown'}`);

    try {
      await processWebhookEvent(ctx, eventName, {
        userEmail,
        userId,
        planFromCustom,
        customerId,
        subscriptionOrOrderId,
        attributes,
      });

      return { success: true };
    } catch (error: unknown) {
      console.error('[LemonSqueezy] Error processing webhook:', toErrorMessage(error));
      return { success: false, error: toErrorMessage(error) };
    }
  },
});


// Helper for Lemon Squeezy webhook processing

async function processWebhookEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  eventName: string | undefined,
  data: {
    userEmail: string | undefined;
    userId: string | undefined;
    planFromCustom: string | undefined;
    customerId: string | undefined;
    subscriptionOrOrderId: string | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    attributes: any;
  }
) {
  const { userEmail, userId, planFromCustom, customerId, subscriptionOrOrderId, attributes } = data;

  if (eventName === 'order_created') {
    if (userEmail) {
      await ctx.runMutation(grantAccessMutation, {
        customerEmail: userEmail,
        plan: planFromCustom ?? 'LIFETIME',
        userId,
        lemonSqueezyCustomerId: customerId,
      });
      console.log(`[LemonSqueezy] Granted access for order: ${userEmail}`);
    }
    return;
  }

  if (eventName?.startsWith('subscription_')) {
    await handleSubscriptionEvent(ctx, eventName, {
      userEmail,
      userId,
      planFromCustom,
      customerId,
      subscriptionOrOrderId,
      attributes,
    });
  } else {
    console.log(`[LemonSqueezy] Unhandled event: ${eventName}`);
  }
}

async function handleSubscriptionEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  eventName: string,
  data: {
    userEmail: string | undefined;
    userId: string | undefined;
    planFromCustom: string | undefined;
    customerId: string | undefined;
    subscriptionOrOrderId: string | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    attributes: any;
  }
) {
  const { userEmail, userId, planFromCustom, customerId, subscriptionOrOrderId, attributes } = data;

  switch (eventName) {
    case 'subscription_created':
    case 'subscription_payment_success':
    case 'subscription_resumed':
    case 'subscription_unpaused':
      if (userEmail) {
        const variantName = readString(attributes, ['variant_name']);
        const plan =
          planFromCustom ??
          (variantName?.toLowerCase().includes('annual') ? 'ANNUAL' : 'MONTHLY');

        await ctx.runMutation(grantAccessMutation, {
          customerEmail: userEmail,
          plan,
          userId,
          lemonSqueezyCustomerId: customerId,
          lemonSqueezySubscriptionId: subscriptionOrOrderId,
        });
        console.log(`[LemonSqueezy] Granted subscription access: ${userEmail}`);
      }
      break;

    case 'subscription_cancelled':
    case 'subscription_expired':
    case 'subscription_paused':
      if (userEmail) {
        await ctx.runMutation(revokeAccessMutation, {
          customerEmail: userEmail,
          userId,
        });
        console.log(`[LemonSqueezy] Revoked access: ${userEmail}`);
      }
      break;

    case 'subscription_updated':
      await handleSubscriptionUpdated(ctx, {
        userEmail,
        userId,
        planFromCustom,
        customerId,
        subscriptionOrOrderId,
        attributes,
      });
      break;
  }
}

async function handleSubscriptionUpdated(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  data: {
    userEmail: string | undefined;
    userId: string | undefined;
    planFromCustom: string | undefined;
    customerId: string | undefined;
    subscriptionOrOrderId: string | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    attributes: any;
  }
) {
  const { userEmail, userId, planFromCustom, customerId, subscriptionOrOrderId, attributes } = data;
  const status = readString(attributes, ['status']);

  if (status === 'active' || status === 'on_trial') {
    if (userEmail) {
      await ctx.runMutation(grantAccessMutation, {
        customerEmail: userEmail,
        plan: planFromCustom ?? 'MONTHLY',
        userId,
        lemonSqueezyCustomerId: customerId,
        lemonSqueezySubscriptionId: subscriptionOrOrderId,
      });
    }
  } else if (status === 'cancelled' || status === 'expired' || status === 'paused') {
    if (userEmail) {
      await ctx.runMutation(revokeAccessMutation, {
        customerEmail: userEmail,
        userId,
      });
    }
  }
}
