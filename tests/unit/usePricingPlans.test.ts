import { describe, expect, it } from 'vitest';
import { formatPricingPlans, resolvePricingRegion } from '../../src/hooks/usePricingPlans';
import type { LemonSqueezyVariantPrices } from '../../src/utils/lemonsqueezy';

const mockVariantPrices: LemonSqueezyVariantPrices = {
  GLOBAL: {
    MONTHLY: { amount: '4.99', currency: 'USD', formatted: '$4.99' },
    QUARTERLY: { amount: '11.99', currency: 'USD', formatted: '$11.99' },
    ANNUAL: { amount: '19.99', currency: 'USD', formatted: '$19.99' },
    LIFETIME: { amount: '39.99', currency: 'USD', formatted: '$39.99' },
  },
  REGIONAL: {
    MONTHLY: { amount: '69.00', currency: 'USD', formatted: '₫69.000' },
    QUARTERLY: { amount: '199.00', currency: 'USD', formatted: '₫199.000' },
    ANNUAL: { amount: '249.00', currency: 'USD', formatted: '₫249.000' },
    LIFETIME: { amount: '499.00', currency: 'USD', formatted: '₫499.000' },
  },
};

describe('resolvePricingRegion', () => {
  it('uses the regional catalog for supported localized promo languages', () => {
    expect(resolvePricingRegion('zh')).toBe('REGIONAL');
    expect(resolvePricingRegion('vi')).toBe('REGIONAL');
    expect(resolvePricingRegion('mn')).toBe('REGIONAL');
  });

  it('uses the global catalog for default english pricing', () => {
    expect(resolvePricingRegion('en')).toBe('GLOBAL');
  });
});

describe('formatPricingPlans', () => {
  it('maps backend prices into UI-safe display values for the active region', () => {
    const formatted = formatPricingPlans(mockVariantPrices, 'en');

    expect(formatted.MONTHLY.displayAmount).toBe('4.99');
    expect(formatted.MONTHLY.currencySymbol).toBe('$');
    expect(formatted.ANNUAL.displayUnit).toBe('/ yr');
    expect(formatted.LIFETIME.displayUnit).toBe('once');
  });

  it('switches to the regional catalog for localized pricing languages', () => {
    const formatted = formatPricingPlans(mockVariantPrices, 'vi');

    expect(formatted.MONTHLY.currencySymbol).toBe('₫');
    expect(formatted.MONTHLY.displayAmount).toBe('69.000');
    expect(formatted.ANNUAL.displayUnit).toBe('/ 年');
  });
});
