export const ANALYTICS_EVENTS = [
  'landing_cta_click',
  'signup_start',
  'signup_success',
  'checkout_start',
  'checkout_success',
  'payment_activation_success',
  'day1_retention',
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

type AnalyticsEventPayloadMap = {
  landing_cta_click: {
    language: string;
    ctaId: string;
    placement: string;
    target: string;
  };
  signup_start: {
    language: string;
    method: 'password' | 'google' | 'kakao';
    platform: 'desktop' | 'mobile';
  };
  signup_success: {
    language: string;
    method: 'password' | 'google' | 'kakao';
    platform: 'desktop' | 'mobile';
  };
  checkout_start: {
    language: string;
    plan: 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL' | 'LIFETIME';
    source: string;
  };
  checkout_success: {
    language: string;
    plan: 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL' | 'LIFETIME';
    source: string;
  };
  payment_activation_success: {
    language: string;
    provider: 'creem' | 'lemonsqueezy' | 'unknown';
  };
  day1_retention: {
    language: string;
    userTier: string;
    daysSinceSignup: number;
  };
};

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
    posthog?: {
      capture?: (event: string, payload?: Record<string, unknown>) => void;
    };
  }
}

const isBrowser = typeof globalThis.window !== 'undefined';

export function trackEvent<TName extends AnalyticsEventName>(
  event: TName,
  payload: AnalyticsEventPayloadMap[TName]
) {
  if (!isBrowser) return;

  const enrichedPayload = {
    ...payload,
    event,
    timestamp: Date.now(),
  } as const;

  if (globalThis.window.dataLayer) {
    globalThis.window.dataLayer.push(enrichedPayload);
  }

  if (typeof globalThis.window.gtag === 'function') {
    globalThis.window.gtag('event', event, enrichedPayload);
  }

  if (typeof globalThis.window.posthog?.capture === 'function') {
    globalThis.window.posthog.capture(event, enrichedPayload);
  }

  if (import.meta.env.DEV && import.meta.env.VITE_ANALYTICS_DEBUG === 'true') {
    console.info('[analytics:event]', event, enrichedPayload);
  }
}
