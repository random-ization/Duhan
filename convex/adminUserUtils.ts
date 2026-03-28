import type { Doc } from './_generated/dataModel';
import { hasActiveSubscription } from './subscription';

export type AdminUserAccountStatus = 'ACTIVE' | 'DISABLED';
export type AdminUserResolvedPlan = 'FREE' | 'PRO' | 'LIFETIME';
export type AdminUserSubscriptionStatus = 'FREE' | 'ACTIVE' | 'EXPIRED' | 'LIFETIME';
export type AdminUserRole = 'ADMIN' | 'STUDENT';
export type AdminUserEmailVerificationFilter = 'VERIFIED' | 'UNVERIFIED';
export type AdminUserActivityWindow = 'ACTIVE_7_DAYS' | 'INACTIVE_30_DAYS';
export type AdminUserSortBy =
  | 'NEWEST'
  | 'OLDEST'
  | 'LAST_ACTIVE_DESC'
  | 'LAST_LOGIN_DESC'
  | 'TOTAL_STUDY_DESC';
export type AdminUserManagedPlan = 'FREE' | 'PRO' | 'LIFETIME';
export type AdminUserBillingCycle = 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL' | 'LIFETIME';

type AdminUserDoc = Pick<
  Doc<'users'>,
  | '_id'
  | 'accountStatus'
  | 'avatar'
  | 'createdAt'
  | 'disabledAt'
  | 'disabledBy'
  | 'disabledReason'
  | 'email'
  | 'emailVerificationTime'
  | 'isVerified'
  | 'kycStatus'
  | 'lastActivityAt'
  | 'lastActivityType'
  | 'lastInstitute'
  | 'lastLevel'
  | 'lastLoginAt'
  | 'lastModule'
  | 'lastUnit'
  | 'mistakesCount'
  | 'name'
  | 'role'
  | 'savedWordsCount'
  | 'subscriptionExpiry'
  | 'subscriptionType'
  | 'tier'
  | 'totalStudyMinutes'
>;

export type AdminUserListFilters = {
  search?: string;
  role?: AdminUserRole;
  accountStatus?: AdminUserAccountStatus;
  plan?: AdminUserResolvedPlan;
  emailVerified?: AdminUserEmailVerificationFilter;
  kycStatus?: 'NONE' | 'VERIFIED';
  activityWindow?: AdminUserActivityWindow;
  sortBy?: AdminUserSortBy;
};

export function normalizeAccountStatus(value?: string | null): AdminUserAccountStatus {
  return value === 'DISABLED' ? 'DISABLED' : 'ACTIVE';
}

export function canExposeViewerRecord(
  user: Pick<Doc<'users'>, 'accountStatus'> | null | undefined
) {
  return normalizeAccountStatus(user?.accountStatus) === 'ACTIVE';
}

export function isEmailVerified(user: Pick<Doc<'users'>, 'emailVerificationTime' | 'isVerified'>) {
  return Boolean(user.emailVerificationTime || user.isVerified);
}

function normalizeSubscriptionType(value?: string | null): AdminUserBillingCycle | null {
  const normalized = value?.trim().toUpperCase();
  switch (normalized) {
    case 'MONTHLY':
    case 'QUARTERLY':
    case 'SEMIANNUAL':
    case 'ANNUAL':
    case 'LIFETIME':
      return normalized;
    default:
      return null;
  }
}

export function parseSubscriptionExpiryMs(expiry?: string | null): number | null {
  if (!expiry) return null;
  const trimmed = expiry.trim();
  if (!trimmed) return null;

  const numeric = Number(trimmed);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric < 1_000_000_000_000 ? numeric * 1000 : numeric;
  }

  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function resolveAdminPlan(
  user: Pick<Doc<'users'>, 'subscriptionExpiry' | 'subscriptionType' | 'tier'>,
  nowMs: number = Date.now()
): AdminUserResolvedPlan {
  const subscriptionType = normalizeSubscriptionType(user.subscriptionType);
  if (subscriptionType === 'LIFETIME') return 'LIFETIME';
  if (hasActiveSubscription(user, nowMs)) return 'PRO';

  const tier = (user.tier || '').trim().toUpperCase();
  const expiryMs = parseSubscriptionExpiryMs(user.subscriptionExpiry);
  const legacyPaidTier =
    (tier === 'PAID' || tier === 'PREMIUM') && (expiryMs === null || expiryMs > nowMs);
  return legacyPaidTier ? 'PRO' : 'FREE';
}

export function resolveSubscriptionStatus(
  user: Pick<Doc<'users'>, 'subscriptionExpiry' | 'subscriptionType' | 'tier'>,
  nowMs: number = Date.now()
): AdminUserSubscriptionStatus {
  const subscriptionType = normalizeSubscriptionType(user.subscriptionType);
  if (subscriptionType === 'LIFETIME') return 'LIFETIME';
  if (hasActiveSubscription(user, nowMs)) return 'ACTIVE';

  const expiryMs = parseSubscriptionExpiryMs(user.subscriptionExpiry);
  if (expiryMs !== null && expiryMs <= nowMs) return 'EXPIRED';

  return resolveAdminPlan(user, nowMs) === 'PRO' ? 'ACTIVE' : 'FREE';
}

export function buildManagedPlanPatch(args: {
  plan: AdminUserManagedPlan;
  subscriptionType?: string;
  subscriptionExpiry?: string;
}) {
  const plan = args.plan;
  const subscriptionType = normalizeSubscriptionType(args.subscriptionType);

  if (plan === 'FREE') {
    return {
      tier: 'FREE',
      subscriptionType: undefined,
      subscriptionExpiry: undefined,
    };
  }

  if (plan === 'LIFETIME') {
    return {
      tier: 'PREMIUM',
      subscriptionType: 'LIFETIME' as const,
      subscriptionExpiry: undefined,
    };
  }

  if (!subscriptionType || subscriptionType === 'LIFETIME') {
    throw new Error('PRO_PLAN_REQUIRES_BILLING_CYCLE');
  }

  const expiryMs = parseSubscriptionExpiryMs(args.subscriptionExpiry);
  if (expiryMs === null) {
    throw new Error('PRO_PLAN_REQUIRES_EXPIRY');
  }

  return {
    tier: 'PREMIUM',
    subscriptionType,
    subscriptionExpiry: new Date(expiryMs).toISOString(),
  };
}

export function matchesAdminUserFilters(
  user: AdminUserDoc,
  filters: AdminUserListFilters,
  nowMs: number = Date.now()
) {
  const search = filters.search?.trim().toLowerCase();
  if (search) {
    const haystacks = [user.email, user.name, user._id.toString()]
      .map(value => (value || '').toLowerCase())
      .filter(Boolean);
    if (!haystacks.some(value => value.includes(search))) {
      return false;
    }
  }

  if (filters.role && user.role !== filters.role) {
    return false;
  }

  if (
    filters.accountStatus &&
    normalizeAccountStatus(user.accountStatus) !== filters.accountStatus
  ) {
    return false;
  }

  if (filters.plan && resolveAdminPlan(user, nowMs) !== filters.plan) {
    return false;
  }

  if (filters.emailVerified) {
    const verified = isEmailVerified(user);
    if (filters.emailVerified === 'VERIFIED' && !verified) return false;
    if (filters.emailVerified === 'UNVERIFIED' && verified) return false;
  }

  if (filters.kycStatus && (user.kycStatus || 'NONE') !== filters.kycStatus) {
    return false;
  }

  if (filters.activityWindow === 'ACTIVE_7_DAYS') {
    const threshold = nowMs - 7 * 24 * 60 * 60 * 1000;
    if (!user.lastActivityAt || user.lastActivityAt < threshold) return false;
  }

  if (filters.activityWindow === 'INACTIVE_30_DAYS') {
    const threshold = nowMs - 30 * 24 * 60 * 60 * 1000;
    if (user.lastActivityAt && user.lastActivityAt >= threshold) return false;
  }

  return true;
}

export function compareAdminUsers(
  left: AdminUserDoc,
  right: AdminUserDoc,
  sortBy: AdminUserSortBy
) {
  switch (sortBy) {
    case 'OLDEST':
      return (left.createdAt || 0) - (right.createdAt || 0);
    case 'LAST_ACTIVE_DESC':
      return (right.lastActivityAt || 0) - (left.lastActivityAt || 0);
    case 'LAST_LOGIN_DESC':
      return (right.lastLoginAt || 0) - (left.lastLoginAt || 0);
    case 'TOTAL_STUDY_DESC':
      return (right.totalStudyMinutes || 0) - (left.totalStudyMinutes || 0);
    case 'NEWEST':
    default:
      return (right.createdAt || 0) - (left.createdAt || 0);
  }
}
