import { describe, expect, it } from 'vitest';
import {
  buildManagedPlanPatch,
  canExposeViewerRecord,
  matchesAdminUserFilters,
  resolveAdminPlan,
  resolveSubscriptionStatus,
} from '../../convex/adminUserUtils';

const now = new Date('2026-03-29T00:00:00.000Z').getTime();

function createUser(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'user_1',
    email: 'learner@example.com',
    name: 'Learner',
    role: 'STUDENT',
    accountStatus: 'ACTIVE',
    emailVerificationTime: undefined,
    isVerified: false,
    kycStatus: 'NONE',
    subscriptionType: undefined,
    subscriptionExpiry: undefined,
    tier: 'FREE',
    createdAt: now - 10 * 24 * 60 * 60 * 1000,
    lastActivityAt: now - 2 * 24 * 60 * 60 * 1000,
    lastLoginAt: now - 24 * 60 * 60 * 1000,
    totalStudyMinutes: 90,
    ...overrides,
  };
}

describe('adminUserUtils', () => {
  it('resolves plan and subscription status across free, pro, lifetime, and expired users', () => {
    expect(resolveAdminPlan(createUser(), now)).toBe('FREE');
    expect(resolveSubscriptionStatus(createUser(), now)).toBe('FREE');

    const proUser = createUser({
      tier: 'PREMIUM',
      subscriptionType: 'ANNUAL',
      subscriptionExpiry: new Date(now + 5 * 24 * 60 * 60 * 1000).toISOString(),
    });
    expect(resolveAdminPlan(proUser as never, now)).toBe('PRO');
    expect(resolveSubscriptionStatus(proUser as never, now)).toBe('ACTIVE');

    const lifetimeUser = createUser({
      tier: 'PREMIUM',
      subscriptionType: 'LIFETIME',
    });
    expect(resolveAdminPlan(lifetimeUser as never, now)).toBe('LIFETIME');
    expect(resolveSubscriptionStatus(lifetimeUser as never, now)).toBe('LIFETIME');

    const expiredUser = createUser({
      tier: 'PREMIUM',
      subscriptionType: 'MONTHLY',
      subscriptionExpiry: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
    });
    expect(resolveAdminPlan(expiredUser as never, now)).toBe('FREE');
    expect(resolveSubscriptionStatus(expiredUser as never, now)).toBe('EXPIRED');
  });

  it('builds managed plan patch and rejects invalid pro plan payloads', () => {
    expect(buildManagedPlanPatch({ plan: 'FREE' })).toEqual({
      tier: 'FREE',
      subscriptionType: undefined,
      subscriptionExpiry: undefined,
    });

    expect(
      buildManagedPlanPatch({
        plan: 'PRO',
        subscriptionType: 'ANNUAL',
        subscriptionExpiry: '2026-04-30',
      })
    ).toMatchObject({
      tier: 'PREMIUM',
      subscriptionType: 'ANNUAL',
    });

    expect(buildManagedPlanPatch({ plan: 'LIFETIME' })).toEqual({
      tier: 'PREMIUM',
      subscriptionType: 'LIFETIME',
      subscriptionExpiry: undefined,
    });

    expect(() => buildManagedPlanPatch({ plan: 'PRO', subscriptionType: 'ANNUAL' })).toThrow(
      'PRO_PLAN_REQUIRES_EXPIRY'
    );
  });

  it('matches operational filters for role, status, verification, search, and activity windows', () => {
    const adminUser = createUser({
      _id: 'admin_1',
      email: 'ops@example.com',
      name: 'Ops Admin',
      role: 'ADMIN',
      accountStatus: 'DISABLED',
      emailVerificationTime: now - 1000,
      kycStatus: 'VERIFIED',
      subscriptionType: 'LIFETIME',
      tier: 'PREMIUM',
      lastActivityAt: now - 40 * 24 * 60 * 60 * 1000,
    });

    expect(
      matchesAdminUserFilters(
        adminUser as never,
        {
          role: 'ADMIN',
          accountStatus: 'DISABLED',
          emailVerified: 'VERIFIED',
          kycStatus: 'VERIFIED',
          plan: 'LIFETIME',
          activityWindow: 'INACTIVE_30_DAYS',
          search: 'ops@',
        },
        now
      )
    ).toBe(true);

    expect(
      matchesAdminUserFilters(adminUser as never, { activityWindow: 'ACTIVE_7_DAYS' }, now)
    ).toBe(false);
  });

  it('blocks viewer exposure for disabled accounts', () => {
    expect(canExposeViewerRecord(createUser({ accountStatus: 'ACTIVE' }) as never)).toBe(true);
    expect(canExposeViewerRecord(createUser({ accountStatus: 'DISABLED' }) as never)).toBe(false);
  });
});
