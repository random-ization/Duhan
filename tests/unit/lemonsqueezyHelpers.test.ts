import { describe, expect, it } from 'vitest';
import {
  derivePlanFromVariantName,
  resolveCheckoutBaseUrl,
  resolveCheckoutPlanFromSource,
} from '../../convex/lemonsqueezyHelpers';

const variantMap = {
  GLOBAL: {
    MONTHLY: '100',
    QUARTERLY: '200',
    SEMIANNUAL: '300',
    ANNUAL: '400',
    LIFETIME: '500',
  },
  REGIONAL: {
    MONTHLY: '600',
    QUARTERLY: '700',
    SEMIANNUAL: '800',
    ANNUAL: '900',
    LIFETIME: '1000',
  },
};

describe('resolveCheckoutBaseUrl', () => {
  it('prefers the current app origin when it is allowed', () => {
    expect(
      resolveCheckoutBaseUrl({
        appOrigin: 'https://koreanstudy.me',
        fallbackAppUrl: 'https://www.koreanstudy.me',
        siteUrl: 'https://www.koreanstudy.me',
      })
    ).toBe('https://koreanstudy.me');
  });

  it('falls back to configured origin when caller origin is not allowed', () => {
    expect(
      resolveCheckoutBaseUrl({
        appOrigin: 'https://evil.example.com',
        fallbackAppUrl: 'https://www.koreanstudy.me',
        siteUrl: 'https://koreanstudy.me',
      })
    ).toBe('https://www.koreanstudy.me');
  });
});

describe('resolveCheckoutPlanFromSource', () => {
  it('derives the plan from a configured variant id', () => {
    expect(
      resolveCheckoutPlanFromSource({
        explicitPlan: undefined,
        variantId: '500',
        variantName: undefined,
        variantMap,
        fallbackPlan: 'MONTHLY',
      })
    ).toBe('LIFETIME');
  });

  it('derives the plan from the variant name when the id is unavailable', () => {
    expect(derivePlanFromVariantName('DuHan Pro - Quarterly')).toBe('QUARTERLY');
    expect(
      resolveCheckoutPlanFromSource({
        explicitPlan: undefined,
        variantId: undefined,
        variantName: 'DuHan Pro - Semi-Annual',
        variantMap,
        fallbackPlan: 'MONTHLY',
      })
    ).toBe('SEMIANNUAL');
  });

  it('falls back to the provided default plan when nothing matches', () => {
    expect(
      resolveCheckoutPlanFromSource({
        explicitPlan: undefined,
        variantId: undefined,
        variantName: 'Unknown plan',
        variantMap,
        fallbackPlan: 'LIFETIME',
      })
    ).toBe('LIFETIME');
  });
});
