'use node';
import { action, type ActionCtx } from './_generated/server';
import { v } from 'convex/values';
import crypto from 'node:crypto';
import { makeFunctionReference } from 'convex/server';
import type { FunctionReference } from 'convex/server';
import { toErrorMessage } from './errors';
import { getPath, isRecord, parseJson, readString } from './validation';
import { assertProductionRuntimeEnv } from './env';
import { captureServerException, captureServerMessage } from './sentry';

assertProductionRuntimeEnv();

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

type WebhookEventData = {
  userEmail: string | undefined;
  userId: string | undefined;
  planFromCustom: string | undefined;
  customerId: string | undefined;
  subscriptionOrOrderId: string | undefined;
  attributes: unknown;
};

type VariantPrice = {
  id: string;
  priceCents: number;
  formatted: string;
};

type VariantPricesResponse = {
  GLOBAL: Record<string, { amount: string; currency: string; formatted: string }>;
  REGIONAL: Record<string, { amount: string; currency: string; formatted: string }>;
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

const LEMONSQUEEZY_SUPPORTED_LOCALES = new Set<string>([
  'bg',
  'hr',
  'cs',
  'da',
  'nl',
  'en',
  'et',
  'fil',
  'fi',
  'fr',
  'de',
  'el',
  'hu',
  'id',
  'it',
  'ja',
  'ko',
  'lv',
  'lt',
  'ms',
  'mt',
  'pl',
  'pt',
  'ro',
  'ru',
  'zh-CN',
  'sk',
  'sl',
  'es',
  'sv',
  'th',
  'tr',
  'vi',
] as const);

const normalizeCheckoutLocale = (input?: string): string => {
  const raw = (input || '').trim();
  if (!raw) return 'en';

  const lower = raw.toLowerCase();
  if (lower.startsWith('zh')) return 'zh-CN';
  if (lower.startsWith('vi')) return 'vi';
  if (lower.startsWith('mn')) return 'en';
  if (lower.startsWith('en')) return 'en';

  const base = lower.split(/[-_]/)[0];
  if (LEMONSQUEEZY_SUPPORTED_LOCALES.has(base)) {
    return base;
  }

  return 'en';
};

const parseVariantPrices = (value: unknown): VariantPrice[] => {
  const data = getPath(value, ['data']);
  if (!Array.isArray(data)) return [];

  return data.flatMap(entry => {
    if (!isRecord(entry)) return [];
    const id = readStringish(entry, ['id']);
    const rawPrice = getPath(entry, ['attributes', 'price']);
    const price =
      typeof rawPrice === 'number'
        ? rawPrice
        : typeof rawPrice === 'string'
          ? Number(rawPrice)
          : Number.NaN;
    const formatted =
      readString(entry, ['attributes', 'price_formatted']) ||
      (Number.isFinite(price) ? `$${(price / 100).toFixed(2)}` : '');

    if (!id || !Number.isFinite(price) || !formatted) {
      return [];
    }

    return [{ id, priceCents: price, formatted }];
  });
};

const emptyVariantPrices = (): VariantPricesResponse => ({
  GLOBAL: {},
  REGIONAL: {},
});

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
    locale: v.optional(v.string()),
    source: v.optional(v.string()),
    returnTo: v.optional(v.string()),
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
    const successParams = new URLSearchParams({ provider: 'lemonsqueezy' });
    if (args.source) successParams.set('source', args.source);
    if (args.returnTo) successParams.set('returnTo', args.returnTo);

    const checkoutLocale = normalizeCheckoutLocale(args.locale);

    const requestBody = {
      data: {
        type: 'checkouts',
        attributes: {
          checkout_options: {
            locale: checkoutLocale,
          },
          checkout_data: {
            email: args.userEmail || undefined,
            name: args.userName || undefined,
            custom: {
              user_id: args.userId ? String(args.userId) : 'guest',
              plan: String(args.plan),
            },
          },
          product_options: {
            redirect_url: `${appUrl}/payment/success?${successParams.toString()}`,
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
      let checkoutUrl = data.data?.attributes?.url;

      if (!checkoutUrl) {
        throw new Error('No checkout URL returned from Lemon Squeezy');
      }

      console.log('[LemonSqueezy] Checkout created:', checkoutUrl);
      return { checkoutUrl };
    } catch (error: unknown) {
      console.error('[LemonSqueezy] Error creating checkout:', toErrorMessage(error));
      await captureServerException(error, {
        module: 'lemonsqueezy',
        operation: 'createCheckout',
        plan: args.plan,
      });
      throw error instanceof Error ? error : new Error(toErrorMessage(error));
    }
  },
});

/**
 * Get pricing for all configured variants
 */
export const getVariantPrices = action({
  args: {},
  handler: async () => {
    const apiKey = process.env[API_KEY_ENV];
    if (!apiKey) {
      console.warn(`[LemonSqueezy] ${API_KEY_ENV} missing, returning empty prices.`);
      return emptyVariantPrices();
    }

    const prices = emptyVariantPrices();
    const configuredVariantIds = new Set(
      Object.values(VARIANT_MAP)
        .flatMap(regionPlans => Object.values(regionPlans))
        .filter(id => typeof id === 'string' && id.length > 0)
    );

    if (configuredVariantIds.size === 0) {
      console.warn('[LemonSqueezy] No variant IDs configured, returning empty prices.');
      return prices;
    }

    // Fetch all variants from Lemon Squeezy
    // We request 100 per page to likely get all in one go
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    let variants: VariantPrice[] = [];
    try {
      const response = await fetch(`${LEMONSQUEEZY_API_URL}/variants?page[size]=100`, {
        headers: {
          Accept: 'application/vnd.api+json',
          Authorization: `Bearer ${apiKey}`,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[LemonSqueezy] Failed to fetch variants:', response.status, errorText);
        return prices;
      }

      const data: unknown = await response.json();
      variants = parseVariantPrices(data);
    } catch (error: unknown) {
      console.error('[LemonSqueezy] Failed to load variant prices:', toErrorMessage(error));
      await captureServerException(error, {
        module: 'lemonsqueezy',
        operation: 'getVariantPrices',
      });
      return prices;
    } finally {
      clearTimeout(timeout);
    }

    // Helper to find variant data
    const findVariant = (paramsId: string | undefined) => {
      if (!paramsId) return undefined;
      return variants.find(v => String(v.id) === String(paramsId));
    };

    // Iterate over our config and fill prices
    for (const [region, plans] of Object.entries(VARIANT_MAP)) {
      for (const [plan, id] of Object.entries(plans)) {
        const variant = findVariant(id);
        if (variant) {
          const price = variant.priceCents; // integer (cents)
          const formatted = variant.formatted; // e.g. "$9.99"
          // We assume USD mostly, but LS handles currency symbol in formatted string
          // We can also just return the formatted string directly
          // Or format it manually if needed. formatted string is best for display.

          // Normalize price to decimal string (e.g. "9.99")
          const amount = (price / 100).toFixed(2);

          prices[region as keyof typeof prices][plan] = {
            amount,
            currency: 'USD', // defaulting for now, or could parse from formatted
            formatted,
          };
        }
      }
    }

    return prices;
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
      await captureServerMessage(`Missing ${WEBHOOK_SECRET_ENV}`, 'error', {
        module: 'lemonsqueezy',
        operation: 'handleWebhook',
      });
      return { success: false, error: 'Webhook secret not configured' };
    }

    // Verify signature
    if (!verifySignature(args.body, args.signature, webhookSecret)) {
      console.error('[LemonSqueezy] Invalid webhook signature');
      await captureServerMessage('Invalid LemonSqueezy webhook signature', 'warning', {
        module: 'lemonsqueezy',
        operation: 'handleWebhook',
      });
      return { success: false, error: 'Invalid signature' };
    }

    // Parse webhook payload
    let payload: unknown;
    try {
      payload = parseJson(args.body);
    } catch {
      console.error('[LemonSqueezy] Failed to parse webhook body');
      await captureServerMessage('Failed to parse LemonSqueezy webhook payload', 'warning', {
        module: 'lemonsqueezy',
        operation: 'handleWebhook',
      });
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
      await captureServerException(error, {
        module: 'lemonsqueezy',
        operation: 'handleWebhook',
      });
      return { success: false, error: toErrorMessage(error) };
    }
  },
});

// Helper for Lemon Squeezy webhook processing

async function processWebhookEvent(
  ctx: ActionCtx,
  eventName: string | undefined,
  data: WebhookEventData
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

async function handleSubscriptionEvent(ctx: ActionCtx, eventName: string, data: WebhookEventData) {
  const { userEmail, userId, planFromCustom, customerId, subscriptionOrOrderId, attributes } = data;

  switch (eventName) {
    case 'subscription_created':
    case 'subscription_payment_success':
    case 'subscription_resumed':
    case 'subscription_unpaused':
      if (userEmail) {
        const variantName = readString(attributes, ['variant_name']);
        const plan =
          planFromCustom ?? (variantName?.toLowerCase().includes('annual') ? 'ANNUAL' : 'MONTHLY');

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

async function handleSubscriptionUpdated(ctx: ActionCtx, data: WebhookEventData) {
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
