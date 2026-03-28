import type { CheckoutPlan } from './subscriptionPlan';

export type LemonSqueezyPriceEntry = {
  amount: string;
  currency: string;
  formatted: string;
};

export type LemonSqueezyVariantPrices = {
  GLOBAL: Record<string, LemonSqueezyPriceEntry>;
  REGIONAL: Record<string, LemonSqueezyPriceEntry>;
};

export type LemonSqueezyCheckoutRequest = {
  plan: CheckoutPlan;
  userId?: string;
  userEmail?: string;
  userName?: string;
  region?: string;
  locale?: string;
  source?: string;
  returnTo?: string;
};

export type LemonSqueezyCheckoutResult = {
  checkoutUrl: string;
};

export function isSafeCheckoutUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}
