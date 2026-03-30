import { capturePostHogEvent } from './posthog';

export const ANALYTICS_EVENTS = [
  'landing_cta_click',
  'signup_start',
  'signup_success',
  'checkout_start',
  'checkout_success',
  'payment_activation_success',
  'day1_retention',
  'dashboard_learning_module_selected',
  'learning_material_selected',
  'learning_resource_opened',
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
    provider: 'lemonsqueezy';
  };
  day1_retention: {
    language: string;
    userTier: string;
    daysSinceSignup: number;
  };
  dashboard_learning_module_selected: {
    language: string;
    module: 'grammar' | 'vocabulary' | 'listening' | 'reading';
    entryPoint: 'dashboard_desktop' | 'dashboard_mobile';
  };
  learning_material_selected: {
    language: string;
    module: 'grammar' | 'vocabulary' | 'listening' | 'reading';
    courseId: string;
    source: 'recent' | 'recommended' | 'manual';
  };
  learning_resource_opened: {
    language: string;
    module: 'grammar' | 'vocabulary' | 'listening' | 'reading';
    resourceId: string;
    resourcePath: string;
    courseId?: string;
  };
};

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: unknown[]) => void;
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

  capturePostHogEvent(event, enrichedPayload);

  if (import.meta.env.DEV && import.meta.env.VITE_ANALYTICS_DEBUG === 'true') {
    console.info('[analytics:event]', event, enrichedPayload);
  }
}
