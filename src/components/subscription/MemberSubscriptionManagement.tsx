import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  Crown,
  FileText,
  Headphones,
  LifeBuoy,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { User, SubscriptionType } from '../../types';
import type { ViewerAccessSnapshot } from '../../utils/entitlements';
import { formatSafeDateLabel } from '../../utils/dateLabel';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { Button } from '../ui';
import { KT } from '../mobile/ksoft/ksoft';

type MemberSubscriptionVariant = 'mobile' | 'desktop';

interface MemberSubscriptionManagementProps {
  user: User | null;
  viewerAccess: ViewerAccessSnapshot | null;
  variant: MemberSubscriptionVariant;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => Promise<void>;
}

function getMemberSubscriptionCopy(language: string) {
  const isZh = language === 'zh' || language.startsWith('zh-');
  if (isZh) {
    return {
      badge: '订阅管理',
      active: '会员有效',
      checking: '正在检查会员',
      title: '你的 Pro 权益已生效',
      checkingTitle: '正在同步你的会员状态',
      subtitle: '这里用于管理当前会员权益。会员有效期间，不再展示解锁会员的购买方案。',
      checkingSubtitle: '正在同步账号权益，随后会自动显示会员管理页或订阅方案。',
      lifetimeExpiry: '永久有效',
      expiryFallback: '由支付服务同步',
      plan: '方案',
      access: '权益',
      renewal: '续费',
      aiCredits: 'AI 额度',
      unlimited: '不限量',
      daysRemaining: '{{count}} 天后进入下一个计费周期。',
      account: '账号',
      dashboard: '继续学习',
      profile: '账号设置',
      supportTitle: '账单支持',
      supportBody: '需要发票、取消续费或修改支付方式，请联系支持并附上当前账号邮箱。',
      enabled: '已开启',
      sync: '同步会员状态',
      syncing: '同步中...',
      syncError: '暂时无法刷新会员状态，请稍后重试。',
      loading: '加载中...',
      unnamed: '用户',
      entitlements: [
        {
          title: '完整课程库',
          body: '全部教材单元、语法、词汇和学习路径保持开放。',
        },
        {
          title: '媒体学习不限量',
          body: '新闻阅读、播客和视频练习保持解锁。',
        },
        {
          title: '更高 AI 使用额度',
          body: '可使用翻译、解释、写作辅助和复习生成。',
        },
        {
          title: '导出与学习分析',
          body: 'PDF 导出和长期学习分析已开启。',
        },
      ],
    };
  }

  return {
    badge: 'Membership management',
    active: 'Active member',
    checking: 'Checking membership',
    title: 'Your Pro access is active',
    checkingTitle: 'Checking your membership',
    subtitle:
      'This page is for managing your current membership. You will not see upgrade purchase plans while your membership is active.',
    checkingSubtitle:
      'We are syncing your account before deciding whether to show membership management or upgrade plans.',
    lifetimeExpiry: 'Permanent access',
    expiryFallback: 'Synced by billing provider',
    plan: 'Plan',
    access: 'Access',
    renewal: 'Renewal',
    aiCredits: 'AI credits',
    unlimited: 'Unlimited',
    daysRemaining: '{{count}} days remaining in this billing period.',
    account: 'Account',
    dashboard: 'Continue learning',
    profile: 'Account settings',
    supportTitle: 'Billing support',
    supportBody:
      'Need invoice, cancellation, or payment method help? Contact support and include your account email.',
    enabled: 'Enabled',
    sync: 'Sync membership status',
    syncing: 'Syncing...',
    syncError: 'Could not refresh membership status. Please try again later.',
    loading: 'Loading...',
    unnamed: 'User',
    entitlements: [
      {
        title: 'Full course archive',
        body: 'All textbook units, grammar, vocabulary, and learning paths are available.',
      },
      {
        title: 'Unlimited media learning',
        body: 'News reading, podcast, and video practice stay unlocked.',
      },
      {
        title: 'Higher AI allowance',
        body: 'Use translation, explanations, writing support, and review generation.',
      },
      {
        title: 'Exports and analytics',
        body: 'PDF export and long-term learning analytics are enabled.',
      },
    ],
  };
}

function getPlanLabel(
  type: SubscriptionType | undefined,
  plan: ViewerAccessSnapshot['plan'],
  language: string
) {
  const isZh = language === 'zh' || language.startsWith('zh-');
  if (type === SubscriptionType.LIFETIME || plan === 'LIFETIME') return isZh ? '终身会员' : 'Lifetime';
  if (type === SubscriptionType.MONTHLY) return isZh ? '月付 Pro' : 'Monthly Pro';
  if (type === SubscriptionType.QUARTERLY) return isZh ? '季付 Pro' : 'Quarterly Pro';
  if (type === SubscriptionType.SEMIANNUAL) return isZh ? '半年 Pro' : 'Semiannual Pro';
  if (type === SubscriptionType.ANNUAL) return isZh ? '年付 Pro' : 'Annual Pro';
  return plan === 'PRO' ? 'Pro' : isZh ? '免费版' : 'Free';
}

function getDaysRemaining(expiry: string | undefined): number | null {
  if (!expiry) return null;
  const expiryMs = Date.parse(expiry);
  if (!Number.isFinite(expiryMs)) return null;
  return Math.max(0, Math.ceil((expiryMs - Date.now()) / 86_400_000));
}

export const MemberSubscriptionManagement: React.FC<MemberSubscriptionManagementProps> = ({
  user,
  viewerAccess,
  variant,
  loading = false,
  error = null,
  onRefresh,
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useLocalizedNavigate();
  const copy = getMemberSubscriptionCopy(i18n.language);
  const isMobile = variant === 'mobile';
  const plan = viewerAccess?.plan ?? 'FREE';
  const isChecking = loading && !viewerAccess;
  const planLabel = getPlanLabel(user?.subscriptionType, plan, i18n.language);
  const isLifetime = plan === 'LIFETIME' || user?.subscriptionType === SubscriptionType.LIFETIME;
  const expiryLabel = isLifetime
    ? t('subscription.manage.lifetimeExpiry', { defaultValue: copy.lifetimeExpiry })
    : formatSafeDateLabel(
        user?.subscriptionExpiry,
        i18n.language,
        t('subscription.manage.expiryFallback', { defaultValue: copy.expiryFallback }),
        { year: 'numeric', month: 'short', day: 'numeric' }
      );
  const daysRemaining = isLifetime ? null : getDaysRemaining(user?.subscriptionExpiry);

  const entitlements = [
    {
      icon: BookOpen,
      title: t('subscription.manage.entitlements.course.title', {
        defaultValue: copy.entitlements[0].title,
      }),
      body: t('subscription.manage.entitlements.course.body', {
        defaultValue: copy.entitlements[0].body,
      }),
    },
    {
      icon: Headphones,
      title: t('subscription.manage.entitlements.media.title', {
        defaultValue: copy.entitlements[1].title,
      }),
      body: t('subscription.manage.entitlements.media.body', {
        defaultValue: copy.entitlements[1].body,
      }),
    },
    {
      icon: Sparkles,
      title: t('subscription.manage.entitlements.ai.title', {
        defaultValue: copy.entitlements[2].title,
      }),
      body: t('subscription.manage.entitlements.ai.body', {
        defaultValue: copy.entitlements[2].body,
      }),
    },
    {
      icon: FileText,
      title: t('subscription.manage.entitlements.export.title', {
        defaultValue: copy.entitlements[3].title,
      }),
      body: t('subscription.manage.entitlements.export.body', {
        defaultValue: copy.entitlements[3].body,
      }),
    },
  ];

  const quickActions = [
    {
      label: t('subscription.manage.actions.dashboard', { defaultValue: copy.dashboard }),
      onClick: () => navigate('/dashboard'),
      primary: true,
    },
    {
      label: t('subscription.manage.actions.profile', { defaultValue: copy.profile }),
      onClick: () => navigate('/profile'),
      primary: false,
    },
  ];

  return (
    <div
      className={
        isMobile
          ? 'relative min-h-[100dvh] overflow-hidden px-5 pb-10 pt-[calc(env(safe-area-inset-top)+18px)]'
          : 'relative min-h-screen overflow-hidden px-6 py-10'
      }
      style={{
        background: isMobile
          ? `radial-gradient(circle at 18% 0%, ${KT.butter}55, transparent 32%), linear-gradient(180deg, ${KT.bg}, ${KT.bg2})`
          : 'linear-gradient(135deg, #F8FAFF 0%, #FFF7E8 100%)',
        fontFamily: KT.font,
        color: KT.ink,
      }}
    >
      <div
        className="pointer-events-none absolute -right-20 top-10 h-56 w-56 rounded-full blur-3xl"
        style={{ background: `${KT.crimson}1f` }}
      />
      <div
        className="pointer-events-none absolute -left-24 bottom-10 h-64 w-64 rounded-full blur-3xl"
        style={{ background: `${KT.indigo}1f` }}
      />

      <div
        className={isMobile ? 'relative z-10 mx-auto max-w-md' : 'relative z-10 mx-auto max-w-6xl'}
      >
        <header className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={() => navigate('/profile')}
            className="h-11 w-11 rounded-2xl border bg-white/80 p-0 shadow-sm"
            style={{ borderColor: KT.line2, color: KT.ink }}
            aria-label={t('common.back', { defaultValue: 'Back' })}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div
            className="rounded-full border bg-white/80 px-3 py-1 text-xs font-black"
            style={{ borderColor: KT.line2 }}
          >
            {t('subscription.manage.badge', { defaultValue: copy.badge })}
          </div>
        </header>

        <section
          className={
            isMobile
              ? 'mt-6 rounded-[2rem] border p-6 shadow-2xl'
              : 'mt-10 grid grid-cols-[1.08fr_0.92fr] gap-8 rounded-[2.5rem] border p-8 shadow-2xl'
          }
          style={{ borderColor: KT.line2, background: 'rgba(255,255,255,0.84)' }}
        >
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black" style={{ background: `${KT.mint}80`, color: KT.jade }}>
              <ShieldCheck className="h-4 w-4" />
              {isChecking
                ? t('subscription.manage.checking', { defaultValue: copy.checking })
                : t('subscription.manage.active', { defaultValue: copy.active })}
            </div>
            <h1 className={isMobile ? 'mt-5 text-4xl font-black leading-tight' : 'mt-6 text-6xl font-black leading-tight'}>
              {isChecking
                ? t('subscription.manage.checkingTitle', {
                    defaultValue: copy.checkingTitle,
                  })
                : t('subscription.manage.title', { defaultValue: copy.title })}
            </h1>
            <p className="mt-4 max-w-xl text-sm font-semibold leading-7" style={{ color: KT.sub }}>
              {isChecking
                ? t('subscription.manage.checkingSubtitle', {
                    defaultValue:
                      copy.checkingSubtitle,
                  })
                : t('subscription.manage.subtitle', {
                    defaultValue: copy.subtitle,
                  })}
            </p>

            <div className={isMobile ? 'mt-6 grid gap-3' : 'mt-8 grid grid-cols-3 gap-3'}>
              <div className="rounded-2xl border bg-white p-4" style={{ borderColor: KT.line }}>
                <Crown className="mb-3 h-5 w-5" style={{ color: KT.gold }} />
                <div className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: KT.sub }}>
                  {t('subscription.manage.plan', { defaultValue: copy.plan })}
                </div>
                <div className="mt-1 text-lg font-black">
                  {isChecking ? t('common.loading', { defaultValue: copy.loading }) : planLabel}
                </div>
              </div>
              <div className="rounded-2xl border bg-white p-4" style={{ borderColor: KT.line }}>
                <CalendarDays className="mb-3 h-5 w-5" style={{ color: KT.crimson }} />
                <div className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: KT.sub }}>
                  {isLifetime
                    ? t('subscription.manage.access', { defaultValue: copy.access })
                    : t('subscription.manage.renewal', { defaultValue: copy.renewal })}
                </div>
                <div className="mt-1 text-sm font-black leading-6">{expiryLabel}</div>
              </div>
              <div className="rounded-2xl border bg-white p-4" style={{ borderColor: KT.line }}>
                <BarChart3 className="mb-3 h-5 w-5" style={{ color: KT.indigo }} />
                <div className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: KT.sub }}>
                  {t('subscription.manage.aiCredits', { defaultValue: copy.aiCredits })}
                </div>
                <div className="mt-1 text-lg font-black">
                  {viewerAccess?.limits.aiCreditsDaily === null
                    ? t('subscription.manage.unlimited', { defaultValue: copy.unlimited })
                    : viewerAccess?.remaining.aiCreditsDaily ?? '—'}
                </div>
              </div>
            </div>

            {daysRemaining !== null ? (
              <div className="mt-4 rounded-2xl border px-4 py-3 text-sm font-bold" style={{ borderColor: KT.line, background: `${KT.butter}55`, color: KT.ink2 }}>
                {t('subscription.manage.daysRemaining', {
                  defaultValue: copy.daysRemaining,
                  count: daysRemaining,
                })}
              </div>
            ) : null}
          </div>

          <aside className={isMobile ? 'mt-6' : ''}>
            <div className="rounded-[1.75rem] border p-5" style={{ borderColor: KT.line, background: KT.ink, color: KT.card }}>
              <div className="text-xs font-black uppercase tracking-[0.22em] text-white/55">
                {t('subscription.manage.account', { defaultValue: copy.account })}
              </div>
              <div className="mt-3 text-xl font-black">
                {user?.name || t('profile.unnamed', { defaultValue: copy.unnamed })}
              </div>
              <div className="mt-1 break-all text-sm font-semibold text-white/65">{user?.email}</div>

              <div className="mt-6 grid gap-2">
                {quickActions.map(action => (
                  <Button
                    key={action.label}
                    type="button"
                    variant="ghost"
                    size="auto"
                    onClick={action.onClick}
                    className={`h-12 rounded-2xl font-black ${
                      action.primary ? 'bg-white text-[#1F1B17]' : 'border border-white/15 text-white'
                    }`}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-[1.5rem] border bg-white p-4" style={{ borderColor: KT.line }}>
              <div className="flex items-start gap-3">
                <LifeBuoy className="mt-0.5 h-5 w-5" style={{ color: KT.crimson }} />
                <div>
                  <div className="text-sm font-black">
                    {t('subscription.manage.billingHelp.title', {
                      defaultValue: copy.supportTitle,
                    })}
                  </div>
                  <p className="mt-1 text-xs font-semibold leading-5" style={{ color: KT.sub }}>
                    {t('subscription.manage.billingHelp.body', {
                      defaultValue:
                        copy.supportBody,
                    })}
                  </p>
                  <a
                    className="mt-3 inline-flex text-sm font-black underline"
                    href="mailto:support@koreanstudy.me"
                    style={{ color: KT.crimson }}
                  >
                    support@koreanstudy.me
                  </a>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className={isMobile ? 'mt-5 grid gap-3' : 'mt-8 grid grid-cols-4 gap-4'}>
          {entitlements.map(item => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="rounded-[1.5rem] border bg-white/85 p-5 shadow-sm"
                style={{ borderColor: KT.line }}
              >
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-2xl" style={{ background: `${KT.mint}70`, color: KT.jade }}>
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-base font-black">{item.title}</h2>
                <p className="mt-2 text-sm font-semibold leading-6" style={{ color: KT.sub }}>
                  {item.body}
                </p>
                <div className="mt-4 inline-flex items-center gap-1 text-xs font-black" style={{ color: KT.jade }}>
                  <Check className="h-3.5 w-3.5" />
                  {t('subscription.manage.enabled', { defaultValue: copy.enabled })}
                </div>
              </article>
            );
          })}
        </section>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={() => void onRefresh?.()}
            loading={loading}
            loadingText={t('subscription.manage.syncing', { defaultValue: copy.syncing })}
            className="h-12 rounded-2xl border bg-white px-5 font-black"
            style={{ borderColor: KT.line2, color: KT.ink }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('subscription.manage.sync', { defaultValue: copy.sync })}
          </Button>
          {error ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
              {t('subscription.manage.syncError', {
                defaultValue: copy.syncError,
              })}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default MemberSubscriptionManagement;
