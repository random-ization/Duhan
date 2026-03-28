import type {
  AdminBillingCycle,
  AdminManagedPlan,
  AdminProfileFormState,
  AdminUserAccountStatus,
  AdminUserDetail,
  AdminUserResolvedPlan,
  AdminUserSortBy,
  AdminUserSubscriptionStatus,
} from './userManagementTypes';

export const ADMIN_SORT_OPTIONS: Array<{ value: AdminUserSortBy; label: string }> = [
  { value: 'NEWEST', label: '最新注册' },
  { value: 'OLDEST', label: '最早注册' },
  { value: 'LAST_ACTIVE_DESC', label: '最近活跃' },
  { value: 'LAST_LOGIN_DESC', label: '最近登录' },
  { value: 'TOTAL_STUDY_DESC', label: '学习时长' },
];

export const ADMIN_PLAN_OPTIONS: Array<{ value: AdminManagedPlan; label: string }> = [
  { value: 'FREE', label: '免费版' },
  { value: 'PRO', label: '订阅会员' },
  { value: 'LIFETIME', label: '终身会员' },
];

export const ADMIN_BILLING_CYCLE_OPTIONS: Array<{ value: AdminBillingCycle; label: string }> = [
  { value: 'MONTHLY', label: '月付' },
  { value: 'QUARTERLY', label: '季付' },
  { value: 'SEMIANNUAL', label: '半年付' },
  { value: 'ANNUAL', label: '年付' },
];

export function formatAdminDateTime(value: number | string | null | undefined, fallback = '—') {
  if (value === null || value === undefined || value === '') return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeActivity(value: number | null | undefined) {
  if (!value) return '暂无记录';
  const diff = Date.now() - value;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))} 分钟前`;
  if (diff < day) return `${Math.max(1, Math.floor(diff / hour))} 小时前`;
  if (diff < 30 * day) return `${Math.max(1, Math.floor(diff / day))} 天前`;
  return '30 天前以上';
}

export function getAccountStatusLabel(status: AdminUserAccountStatus) {
  return status === 'DISABLED' ? '已禁用' : '正常';
}

export function getPlanLabel(plan: AdminUserResolvedPlan | AdminManagedPlan) {
  switch (plan) {
    case 'LIFETIME':
      return '终身会员';
    case 'PRO':
      return '订阅会员';
    case 'FREE':
    default:
      return '免费版';
  }
}

export function getSubscriptionStatusLabel(status: AdminUserSubscriptionStatus | string) {
  switch (status) {
    case 'LIFETIME':
      return '终身有效';
    case 'ACTIVE':
      return '生效中';
    case 'EXPIRED':
      return '已过期';
    case 'FREE':
    default:
      return '未订阅';
  }
}

export function getKycStatusLabel(status: string | null | undefined) {
  return status === 'VERIFIED' ? '已认证' : '未认证';
}

export function getInitialProfileForm(detail: AdminUserDetail | null): AdminProfileFormState {
  return {
    name: detail?.user.name || '',
    role: detail?.user.role || 'STUDENT',
    emailVerified: detail?.user.emailVerified || false,
    kycStatus: detail?.user.kycStatus || 'NONE',
    plan: detail?.membership.plan || 'FREE',
    subscriptionType:
      detail?.membership.subscriptionType === 'MONTHLY' ||
      detail?.membership.subscriptionType === 'QUARTERLY' ||
      detail?.membership.subscriptionType === 'SEMIANNUAL' ||
      detail?.membership.subscriptionType === 'ANNUAL'
        ? detail.membership.subscriptionType
        : 'ANNUAL',
    subscriptionExpiry: detail?.membership.subscriptionExpiry
      ? new Date(detail.membership.subscriptionExpiry).toISOString().slice(0, 10)
      : '',
  };
}

export function buildProfileUpdatePayload(form: AdminProfileFormState) {
  const updates: {
    name: string;
    role: AdminProfileFormState['role'];
    emailVerified: boolean;
    kycStatus: AdminProfileFormState['kycStatus'];
    plan: AdminManagedPlan;
    subscriptionType?: AdminBillingCycle;
    subscriptionExpiry?: string;
  } = {
    name: form.name.trim(),
    role: form.role,
    emailVerified: form.emailVerified,
    kycStatus: form.kycStatus,
    plan: form.plan,
  };

  if (form.plan === 'PRO') {
    if (!form.subscriptionExpiry) {
      throw new Error('订阅会员必须填写到期时间');
    }
    updates.subscriptionType = form.subscriptionType;
    updates.subscriptionExpiry = new Date(form.subscriptionExpiry).toISOString();
    return updates;
  }

  if (form.plan === 'LIFETIME') {
    updates.subscriptionType = 'LIFETIME';
    return updates;
  }

  return updates;
}
