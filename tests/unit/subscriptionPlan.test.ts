import { describe, expect, it } from 'vitest';
import { buildPricingDetailsPath, isCheckoutPlan } from '../../src/utils/subscriptionPlan';

describe('buildPricingDetailsPath', () => {
  it('returns base path when plan is missing', () => {
    expect(buildPricingDetailsPath()).toBe('/pricing/details');
  });

  it('appends monthly plan query', () => {
    expect(buildPricingDetailsPath('MONTHLY')).toBe('/pricing/details?plan=MONTHLY');
  });

  it('appends annual plan query', () => {
    expect(buildPricingDetailsPath('ANNUAL')).toBe('/pricing/details?plan=ANNUAL');
  });

  it('appends source and return target when provided', () => {
    expect(
      buildPricingDetailsPath({
        plan: 'ANNUAL',
        source: 'dashboard_banner',
        returnTo: '/topik',
      })
    ).toBe('/pricing/details?plan=ANNUAL&source=dashboard_banner&returnTo=%2Ftopik');
  });
});

describe('isCheckoutPlan', () => {
  it('accepts known checkout plans', () => {
    expect(isCheckoutPlan('ANNUAL')).toBe(true);
  });

  it('rejects unknown checkout plans', () => {
    expect(isCheckoutPlan('WEEKLY')).toBe(false);
  });
});
