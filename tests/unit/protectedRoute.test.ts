import { describe, expect, it } from 'vitest';
import { buildProtectedAuthRedirectTarget } from '../../src/components/ProtectedRoute';

describe('ProtectedRoute helpers', () => {
  it('preserves the localized destination when redirecting unauthenticated users', () => {
    expect(
      buildProtectedAuthRedirectTarget('zh', '/zh/dashboard/course', '?tab=grammar', '#unit-2')
    ).toBe('/zh/auth?redirect=%2Fzh%2Fdashboard%2Fcourse%3Ftab%3Dgrammar%23unit-2');
  });

  it('keeps nested localized vocab routes intact in auth redirects', () => {
    expect(buildProtectedAuthRedirectTarget('zh', '/zh/vocab-book', '?all=true', '')).toBe(
      '/zh/auth?redirect=%2Fzh%2Fvocab-book%3Fall%3Dtrue'
    );
  });

  it('falls back to the default language when the route param is invalid', () => {
    expect(buildProtectedAuthRedirectTarget('ko', '/ko/dashboard', '', '')).toBe(
      '/en/auth?redirect=%2Fko%2Fdashboard'
    );
  });
});
