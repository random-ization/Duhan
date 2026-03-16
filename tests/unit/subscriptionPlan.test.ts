import { describe, expect, it } from 'vitest';
import { buildPricingDetailsPath } from '../../src/utils/subscriptionPlan';

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
});
