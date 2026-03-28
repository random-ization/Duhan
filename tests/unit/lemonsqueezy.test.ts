import { describe, expect, it } from 'vitest';
import { isSafeCheckoutUrl } from '../../src/utils/lemonsqueezy';

describe('isSafeCheckoutUrl', () => {
  it('accepts https checkout urls', () => {
    expect(isSafeCheckoutUrl('https://checkout.example.com/session')).toBe(true);
  });

  it('rejects javascript urls', () => {
    expect(isSafeCheckoutUrl('javascript:alert(1)')).toBe(false);
  });

  it('rejects malformed urls', () => {
    expect(isSafeCheckoutUrl('not-a-url')).toBe(false);
  });
});
