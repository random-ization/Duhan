import { describe, expect, it } from 'vitest';
import { getUpgradeFlowDecision } from '../../src/hooks/useUpgradeFlow';

describe('getUpgradeFlowDecision', () => {
  it('returns loading when auth state is not ready', () => {
    expect(
      getUpgradeFlowDecision(
        {
          authLoading: true,
          hasUser: false,
          isPremiumUser: false,
        },
        {
          plan: 'ANNUAL',
          source: 'dashboard_banner',
        },
        '/dashboard'
      )
    ).toEqual({ kind: 'loading' });
  });

  it('routes signed-out users to auth with preserved pricing redirect', () => {
    expect(
      getUpgradeFlowDecision(
        {
          authLoading: false,
          hasUser: false,
          isPremiumUser: false,
        },
        {
          plan: 'ANNUAL',
          source: 'topik_locked',
          returnTo: '/topik',
        },
        '/dashboard'
      )
    ).toEqual({
      kind: 'auth',
      target:
        '/auth?redirect=%2Fpricing%2Fdetails%3Fplan%3DANNUAL%26source%3Dtopik_locked%26returnTo%3D%252Ftopik',
    });
  });

  it('routes signed-in free users to pricing details with preserved params', () => {
    expect(
      getUpgradeFlowDecision(
        {
          authLoading: false,
          hasUser: true,
          isPremiumUser: false,
        },
        {
          plan: 'LIFETIME',
          source: 'upgrade_prompt',
          returnTo: '/dashboard',
        },
        '/dashboard'
      )
    ).toEqual({
      kind: 'pricing',
      target: '/pricing/details?plan=LIFETIME&source=upgrade_prompt&returnTo=%2Fdashboard',
    });
  });
});
