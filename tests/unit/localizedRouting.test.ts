import { describe, expect, it } from 'vitest';
import { localizeInternalPath } from '../../src/utils/localizedRouting';

describe('localizeInternalPath', () => {
  it('adds the active language prefix to internal paths', () => {
    expect(localizeInternalPath('/dashboard', 'zh')).toBe('/zh/dashboard');
  });

  it('keeps already localized paths stable', () => {
    expect(localizeInternalPath('/en/review', 'zh')).toBe('/en/review');
  });

  it('leaves external URLs unchanged', () => {
    expect(localizeInternalPath('https://example.com/billing', 'zh')).toBe(
      'https://example.com/billing'
    );
  });

  it('preserves query strings for internal routes', () => {
    expect(localizeInternalPath('/media?tab=videos', 'mn')).toBe('/mn/media?tab=videos');
  });
});
