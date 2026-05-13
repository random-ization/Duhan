import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SEO as Seo } from '../seo/SEO';
import { getRouteMeta } from '../seo/publicRoutes';
import { LocalizedLink } from '../components/LocalizedLink';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import {
  callAuthenticatedConvexAction,
} from '../utils/publicConvexClient';
import { runConvexActionWithRetry } from '../utils/convexActionRetry';
import {
  isSafeCheckoutUrl,
  type LemonSqueezyCheckoutRequest,
  type LemonSqueezyCheckoutResult,
} from '../utils/lemonsqueezy';
import { notify } from '../utils/notify';
import { logger } from '../utils/logger';
import { type CheckoutPlan } from '../utils/subscriptionPlan';
import { useAuth } from '../contexts/AuthContext';
import { SubscriptionType } from '../types';
import { trackEvent } from '../utils/analytics';
import { resolveSafeReturnTo } from '../utils/navigation';
import {
  Check,
  ShieldCheck,
  ArrowLeft,
  Star,
  Infinity as InfinityIcon,
  Minus,
  ChevronDown,
  CreditCard,
  Wallet,
  X,
} from 'lucide-react';
import { Button } from '../components/ui';

type BillingCycle = 'monthly' | 'quarterly' | 'annual';
type PricingOverviewCard = {
  title: string;
  badge: string;
  tone: 'free' | 'pro' | 'lifetime';
  summary: string;
  bullets: string[];
  cta: string;
  ctaVariant: 'primary' | 'secondary' | 'outline';
};
type PricingRightsGroup = {
  title: string;
  free: string;
  pro: string;
};

function resolvePricingCopy(language: string) {
  const isZh = language === 'zh' || language.startsWith('zh-');
  if (isZh) {
    return {
      overviewTitle: '选择最适合你的方案',
      overviewSubtitle: '无论是轻量体验还是深度备考，这里都有最匹配你的学习节奏。',
      cards: [
        {
          title: 'Free',
          badge: '入门体验',
          tone: 'free' as const,
          summary: '适合先体验课程内容、建立学习习惯的用户。',
          bullets: [
            '每门课程前 2 单元完全开放体验',
            '基础词汇系统（闪卡、拼写、听写）',
            '每日 20 个新词保存与 1 次测试',
            'TOPIK / 写作公开样本卷真实体验',
            '全站媒体库 1.0x 免费播放 (2条/天)',
            '每日 5 点基础 AI 信用额度',
          ],
          cta: '免费开始',
          ctaVariant: 'outline' as const,
        },
        {
          title: 'Pro',
          badge: '完整学习',
          tone: 'pro' as const,
          summary: '适合正在系统备考或深度使用韩语的学习者。',
          bullets: [
            '全站所有教材、课程、单元完整解锁',
            '词汇系统无限保存、无限测试与深度分析',
            '完整 TOPIK 真题库与 AI 写作评分报告',
            '媒体库无限播放，支持 0.5x - 2.0x 变速',
            '每日 100 点高级 AI 信用额度',
            '支持全格式 PDF 导出与离线学习',
          ],
          cta: '立即升级',
          ctaVariant: 'primary' as const,
        },
        {
          title: 'Lifetime',
          badge: '一次买断',
          tone: 'lifetime' as const,
          summary: '权益与 Pro 相同，但无需续费，终身拥有。',
          bullets: [
            '包含当前全部 Pro 高级权益',
            '未来新增的 Pro 功能自动包含',
            '永久锁定当前价格，无续费顾虑',
            '适合长期主义者与核心学习者',
          ],
          cta: '永久买断',
          ctaVariant: 'secondary' as const,
        },
      ] satisfies PricingOverviewCard[],
      rightsTitle: '付费方案具体解锁了什么？',
      rightsSubtitle: '通过核心功能对比，了解订阅方案的具体边界。',
      rights: [
        { title: '教材课程', free: '每门课前 2 单元', pro: '全部课程与单元' },
        { title: '词汇系统', free: '每日 20 新词/1 测试', pro: '无限保存与测试' },
        { title: 'TOPIK / 写作', free: '仅限样本卷', pro: '历年真题与 AI 评分' },
        { title: '媒体学习', free: '每日 2 条/1.0x', pro: '无限播放/倍速控制' },
        { title: 'AI 能力', free: '5 点/天 (轻量体验)', pro: '100 点/天 (深度解析)' },
        { title: '导出分析', free: '无 PDF 导出', pro: '全格式 PDF 导出' },
      ] satisfies PricingRightsGroup[],
    };
  }

  return {
    overviewTitle: 'What each plan is actually for',
    overviewSubtitle: 'Choose the level of access that matches your learning pace.',
    cards: [
      {
        title: 'Free',
        badge: 'Starter',
        tone: 'free' as const,
        summary: 'Best for trying the product and building a daily habit.',
        bullets: [
          'First 2 units of every course are open',
          'Core vocab drills and basic flashcards',
          '20 new vocab saves and 1 test per day',
          'Access to TOPIK public sample papers',
          'Media library limited to 2 items/day at 1.0x',
          '5 AI credits per day for light trial',
        ],
        cta: 'Start for Free',
        ctaVariant: 'outline' as const,
      },
      {
        title: 'Pro',
        badge: 'Full access',
        tone: 'pro' as const,
        summary: 'Best for serious learners preparing consistently and using the product daily.',
        bullets: [
          'All textbooks, all courses, and all units unlocked',
          'Unlimited vocab saves and history analytics',
          'Full TOPIK archive and AI writing scoring',
          'Unlimited media playback with speed controls',
          '100 AI credits per day for deep analysis',
          'Full PDF export for offline review',
        ],
        cta: 'Upgrade to Pro',
        ctaVariant: 'primary' as const,
      },
      {
        title: 'Lifetime',
        badge: 'One-time payment',
        tone: 'lifetime' as const,
        summary: 'Same entitlements as Pro, but without recurring billing.',
        bullets: [
          'Includes every current Pro entitlement',
          'Future Pro features stay included',
          'No renewal risk or pricing changes',
          'Best for dedicated long-term learners',
        ],
        cta: 'Buy Lifetime',
        ctaVariant: 'secondary' as const,
      },
    ] satisfies PricingOverviewCard[],
    rightsTitle: 'Feature-by-feature comparison',
    rightsSubtitle: 'The practical boundaries of each membership tier.',
    rights: [
      { title: 'Courses', free: 'First 2 units per course', pro: 'All courses and all units' },
      { title: 'Vocabulary', free: '20 words/day, 1 test/day', pro: 'Unlimited saves & tests' },
      { title: 'TOPIK / Writing', free: 'Sample papers only', pro: 'Full archive & AI reports' },
      { title: 'Media study', free: '2 plays/day at 1.0x', pro: 'Unlimited & speed control' },
      { title: 'AI features', free: '5 credits/day', pro: '100 credits/day' },
      { title: 'Export', free: 'No PDF export', pro: 'Full PDF export' },
    ] satisfies PricingRightsGroup[],
  };
}

function getOverviewCardClassName(tone: PricingOverviewCard['tone']) {
  if (tone === 'pro') {
    return 'border-k-ink bg-k-ink text-white shadow-pop-large';
  }
  if (tone === 'lifetime') {
    return 'border-k-ink bg-white text-k-ink shadow-pop';
  }
  return 'border-k-ink/10 bg-white/50 text-k-ink opacity-80';
}

function getOverviewBadgeClassName(tone: PricingOverviewCard['tone']) {
  if (tone === 'pro') {
    return 'border-[#F2C94C]/40 bg-[#F2C94C]/10 text-[#F2C94C]';
  }
  if (tone === 'lifetime') {
    return 'border-k-ink/15 bg-k-bg2 text-k-ink';
  }
  return 'border-k-ink/10 bg-white text-k-sub';
}

function parseSelectedPlanFromSearch(search: string): {
  cycle?: BillingCycle;
  plan?: SubscriptionType;
} {
  const params = new URLSearchParams(search);
  const planParam = params.get('plan')?.toUpperCase() ?? '';
  if (planParam === 'MONTHLY') return { cycle: 'monthly', plan: SubscriptionType.MONTHLY };
  if (planParam === 'QUARTERLY') return { cycle: 'quarterly', plan: SubscriptionType.QUARTERLY };
  if (planParam === 'ANNUAL') return { cycle: 'annual', plan: SubscriptionType.ANNUAL };
  if (planParam === 'LIFETIME') return { plan: SubscriptionType.LIFETIME };
  return {};
}

export default function PricingDetailsPage() {
  const { user, loading: authLoading } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useLocalizedNavigate();
  const location = useLocation();
  const meta = getRouteMeta(location.pathname);
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const checkoutSource = searchParams.get('source') || 'pricing_details_v2';
  const returnToPath = resolveSafeReturnTo(searchParams.get('returnTo'), '/dashboard');

  const [billingCycle, setBillingCycle] = useState<BillingCycle>(() => {
    const { cycle, plan } = parseSelectedPlanFromSearch(location.search);
    if (plan === SubscriptionType.LIFETIME) return 'annual';
    return cycle ?? 'annual';
  });

  const [checkoutPendingPlan, setCheckoutPendingPlan] = useState<CheckoutPlan | null>(null);
  const pricingCopy = useMemo(() => resolvePricingCopy(i18n.language), [i18n.language]);

  const startCheckout = async (plan: CheckoutPlan) => {
    if (authLoading || checkoutPendingPlan) return;
    trackEvent('checkout_start', { language: i18n.language, plan, source: checkoutSource });

    if (!user) {
      navigate('/login', { state: { from: location.pathname, plan } });
      return;
    }

    try {
      setCheckoutPendingPlan(plan);
      const checkoutArgs: LemonSqueezyCheckoutRequest = {
        plan,
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        region: 'GLOBAL',
        locale: i18n.language,
        source: checkoutSource,
        returnTo: returnToPath,
        appOrigin: globalThis.location.origin,
      };
      const { checkoutUrl } = await runConvexActionWithRetry(
        () => callAuthenticatedConvexAction<LemonSqueezyCheckoutRequest, LemonSqueezyCheckoutResult>(
          'lemonsqueezy:createCheckout', 
          checkoutArgs
        ),
        undefined
      );
      if (!isSafeCheckoutUrl(checkoutUrl)) throw new Error('Invalid URL');
      globalThis.location.assign(checkoutUrl);
    } catch (err) {
      logger.error('Checkout failed', err);
      notify.error(t('pricingDetails.errors.checkoutFailed'));
      setCheckoutPendingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-k-bg text-k-ink selection:bg-k-crimson/20 selection:text-k-ink">
      <Seo title={meta.title} description={meta.description} />

      <nav className="sticky top-0 z-50 bg-k-bg/80 backdrop-blur-md border-b border-k-ink/5 py-4 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <LocalizedLink to="/" className="flex items-center gap-3">
            <img src="/logo.svg" alt="Duhan Logo" width={32} height={32} className="rounded-[8px]" />
            <span className="font-k-serif font-black text-xl tracking-tight">{t('common.appName')}</span>
          </LocalizedLink>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-k-ink/5 rounded-full border border-k-ink/5">
              <ShieldCheck className="w-4 h-4 text-k-crimson" />
              <span className="text-[11px] font-black uppercase tracking-wider">{t('pricingDetails.refundBadge')}</span>
            </div>
            <Button variant="ghost" size="auto" onClick={() => navigate(-1)} className="p-2 text-k-sub">
              <ArrowLeft size={20} />
            </Button>
          </div>
        </div>
      </nav>

      <header className="pt-16 pb-12 px-6 text-center">
        <div className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-k-ink/10 rounded-full shadow-sm">
          <Star size={12} className="text-k-crimson fill-k-crimson" />
          <span className="text-[11px] font-black uppercase tracking-[0.2em] opacity-60">Full Comparison</span>
        </div>
        <h1 className="font-k-serif text-[42px] md:text-[64px] font-black leading-tight mb-6">
          {t('pricingDetails.hero.titleHighlight', { defaultValue: 'Plan Details' })}
        </h1>
        <p className="text-[18px] md:text-[20px] text-k-sub max-w-2xl mx-auto font-medium leading-relaxed opacity-80">
          {t('pricingDetails.hero.subtitleLine1')}
        </p>
      </header>

      <section className="mb-20 flex justify-center px-6">
        <div className="relative flex items-center p-1.5 bg-k-ink/5 rounded-2xl border-2 border-k-ink/5">
          {[
            { key: 'monthly', label: t('pricingDetails.billing.monthly') },
            { key: 'quarterly', label: t('pricingDetails.billing.quarterly') },
            { key: 'annual', label: t('pricingDetails.billing.annual'), save: '70% OFF' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setBillingCycle(tab.key as BillingCycle)}
              className={`relative px-8 py-3 rounded-xl text-[14px] font-black transition-all duration-300 z-10 ${
                billingCycle === tab.key ? 'text-k-bg' : 'text-k-sub hover:text-k-ink'
              }`}
            >
              {tab.label}
              {tab.save && billingCycle !== tab.key ? (
                <span className="absolute -top-2 -right-1 rounded-md bg-k-crimson px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-sm">
                  {tab.save}
                </span>
              ) : null}
            </button>
          ))}
          <div
            className="absolute top-1.5 bottom-1.5 rounded-xl bg-k-ink transition-all duration-300 shadow-lg"
            style={{
              width: 'calc(33.33% - 4px)',
              left:
                billingCycle === 'monthly'
                  ? '6px'
                  : billingCycle === 'quarterly'
                    ? 'calc(33.33% + 2px)'
                    : 'calc(66.66% - 2px)',
            }}
          />
        </div>
      </section>

      <section className="pb-12 md:pb-20 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-heading font-extrabold text-slate-900">
              {pricingCopy.overviewTitle}
            </h2>
            <p className="mt-3 text-base md:text-lg text-slate-600">
              {pricingCopy.overviewSubtitle}
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
            {pricingCopy.cards.map(card => (
              <div
                key={card.title}
                className={`rounded-3xl border-2 p-6 md:p-7 ${getOverviewCardClassName(card.tone)}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-2xl font-black">{card.title}</h3>
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${getOverviewBadgeClassName(card.tone)}`}
                  >
                    {card.badge}
                  </span>
                </div>
                <p
                  className={`mt-4 text-sm leading-6 ${card.tone === 'pro' ? 'text-slate-200' : 'text-slate-600'}`}
                >
                  {card.summary}
                </p>
                <ul className="mt-6 space-y-3">
                  {card.bullets.map(item => (
                    <li key={item} className="flex items-start gap-3">
                      <div
                        className={`mt-0.5 rounded-full p-1 ${card.tone === 'pro' ? 'bg-[#F2C94C]/15 text-[#F2C94C]' : 'bg-slate-100 text-slate-700'}`}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <span
                        className={`text-sm leading-6 ${card.tone === 'pro' ? 'text-slate-100' : 'text-slate-700'}`}
                      >
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-10">
                  <Button
                    variant={
                      card.ctaVariant === 'primary'
                        ? 'default'
                        : card.ctaVariant === 'secondary'
                          ? 'secondary'
                          : 'outline'
                    }
                    className={`w-full h-14 rounded-2xl text-[15px] font-black shadow-sm transition-all active:scale-[0.98] ${
                      card.tone === 'pro' 
                        ? 'bg-[#F2C94C] text-k-ink hover:bg-[#f2d27a]' 
                        : card.tone === 'lifetime'
                        ? 'bg-k-ink text-white hover:bg-slate-800'
                        : 'border-k-ink/20 text-k-ink hover:bg-k-ink/5'
                    }`}
                    onClick={() => {
                      if (card.tone === 'free') {
                        navigate('/');
                      } else {
                        startCheckout(card.tone.toUpperCase() as CheckoutPlan);
                      }
                    }}
                    loading={checkoutPendingPlan === card.tone.toUpperCase()}
                  >
                    {card.cta}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-12 md:pb-20 px-4 md:px-6">
        <div className="max-w-7xl mx-auto rounded-[2rem] border-2 border-black bg-white shadow-pop overflow-hidden">
          <div className="border-b-2 border-black bg-[#FFF7D6] px-6 py-5">
            <h2 className="text-2xl md:text-3xl font-heading font-extrabold text-slate-900">
              {pricingCopy.rightsTitle}
            </h2>
            <p className="mt-2 text-sm md:text-base text-slate-700">{pricingCopy.rightsSubtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr_1fr]">
            <div className="hidden md:block border-r-2 border-black bg-slate-50 px-6 py-4 font-black text-slate-500">
              Feature
            </div>
            <div className="hidden md:block border-r-2 border-black bg-slate-50 px-6 py-4 text-center font-black text-slate-500">
              Free
            </div>
            <div className="hidden md:block bg-[#FFF8DC] px-6 py-4 text-center font-black text-slate-900">
              Pro / Lifetime
            </div>

            {pricingCopy.rights.map(item => (
              <div key={item.title} className="contents">
                <div className="border-t md:border-t-0 md:border-r-2 border-black px-6 py-5">
                  <div className="text-sm font-black uppercase tracking-[0.18em] text-slate-400 md:hidden">
                    Feature
                  </div>
                  <div className="mt-1 text-lg font-black text-slate-900">{item.title}</div>
                </div>
                <div className="border-t md:border-t-0 md:border-r-2 border-black px-6 py-5 bg-white">
                  <div className="text-sm font-black uppercase tracking-[0.18em] text-slate-400 md:hidden">
                    Free
                  </div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{item.free}</p>
                </div>
                <div className="border-t md:border-t-0 border-black px-6 py-5 bg-[#FFFDF3]">
                  <div className="text-sm font-black uppercase tracking-[0.18em] text-slate-400 md:hidden">
                    Pro / Lifetime
                  </div>
                  <p className="mt-1 text-sm leading-6 font-semibold text-slate-900">{item.pro}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 md:py-20 bg-white border-y-2 border-black">
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <h2 className="text-3xl font-heading font-bold text-center mb-4">
            {t('pricingDetails.table.title')}
          </h2>
          <p className="text-center text-slate-500 mb-12">{t('pricingDetails.table.subtitle')}</p>

          <div className="overflow-x-auto border-2 border-black rounded-2xl shadow-pop bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-black">
                  <th className="p-4 md:p-6 w-1/3 font-bold text-slate-600">
                    {t('pricingDetails.table.th1')}
                  </th>
                  <th className="p-4 md:p-6 w-1/4 font-bold text-center text-slate-500">
                    {t('pricingDetails.table.th2')}
                  </th>
                  <th className="p-4 md:p-6 w-1/4 font-bold text-center bg-brand-yellow/20 border-l-2 border-black text-black">
                    {t('pricingDetails.table.th3')}
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm md:text-base text-slate-700">
                <tr className="bg-slate-50">
                  <td
                    colSpan={3}
                    className="px-6 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200"
                  >
                    {t('pricingDetails.table.section.fsrs')}
                  </td>
                </tr>
                <tr className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="p-4 md:px-6 font-medium">
                    {t('pricingDetails.table.fsrs.dailyLimit')}
                  </td>
                  <td className="p-4 text-center text-slate-500">
                    {t('pricingDetails.table.fsrs.dailyLimitFree')}
                  </td>
                  <td className="p-4 text-center font-bold bg-brand-yellow/5 border-l-2 border-black text-brand-green">
                    <div className="inline-flex items-center justify-center gap-1">
                      <InfinityIcon className="w-4 h-4" /> {t('pricingDetails.table.unlimited')}
                    </div>
                  </td>
                </tr>
                <tr className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="p-4 md:px-6 font-medium">
                    {t('pricingDetails.table.fsrs.modes')}
                  </td>
                  <td className="p-4 text-center text-slate-500 flex justify-center gap-1 items-center">
                    <Check className="w-4 h-4" /> {t('pricingDetails.table.freeOpen')}
                  </td>
                  <td className="p-4 text-center font-bold bg-brand-yellow/5 border-l-2 border-black">
                    <div className="inline-flex items-center justify-center gap-1">
                      <Check className="w-4 h-4" /> {t('pricingDetails.table.fullAccess')}
                    </div>
                  </td>
                </tr>
                <tr className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="p-4 md:px-6 font-medium">
                    {t('pricingDetails.table.fsrs.testMode')}
                  </td>
                  <td className="p-4 text-center text-slate-500">
                    <span className="bg-slate-200 px-2 py-1 rounded text-xs">
                      {t('pricingDetails.table.fsrs.testModeFree')}
                    </span>
                  </td>
                  <td className="p-4 text-center font-bold bg-brand-yellow/5 border-l-2 border-black text-brand-green">
                    {t('pricingDetails.table.fsrs.testModePro')}
                  </td>
                </tr>

                <tr className="bg-slate-50">
                  <td
                    colSpan={3}
                    className="px-6 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200"
                  >
                    {t('pricingDetails.table.section.topik')}
                  </td>
                </tr>
                <tr className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="p-4 md:px-6 font-medium">
                    {t('pricingDetails.table.topik.scope')}
                  </td>
                  <td className="p-4 text-center text-slate-500 text-xs">
                    {t('pricingDetails.table.topik.scopeFree')}
                  </td>
                  <td className="p-4 text-center font-bold bg-brand-yellow/5 border-l-2 border-black text-brand-green text-xs">
                    {t('pricingDetails.table.topik.scopePro')}
                  </td>
                </tr>
                <tr className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="p-4 md:px-6 font-medium">
                    {t('pricingDetails.table.topik.exam')}
                  </td>
                  <td className="p-4 text-center text-slate-500 text-xs">
                    {t('pricingDetails.table.topik.examFree')}
                  </td>
                  <td className="p-4 text-center font-bold bg-brand-yellow/5 border-l-2 border-black text-xs">
                    {t('pricingDetails.table.topik.examPro')}
                  </td>
                </tr>
                <tr className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="p-4 md:px-6 font-medium">
                    {t('pricingDetails.table.topik.speed')}
                  </td>
                  <td className="p-4 text-center text-slate-300">
                    <Minus className="w-5 h-5 mx-auto" />
                  </td>
                  <td className="p-4 text-center font-bold bg-brand-yellow/5 border-l-2 border-black">
                    {t('pricingDetails.table.supported')}
                  </td>
                </tr>

                <tr className="bg-slate-50">
                  <td
                    colSpan={3}
                    className="px-6 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200"
                  >
                    {t('pricingDetails.table.section.tools')}
                  </td>
                </tr>
                <tr className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="p-4 md:px-6 font-medium">
                    {t('pricingDetails.table.tools.media')}
                  </td>
                  <td className="p-4 text-center text-slate-500 text-xs">
                    {t('pricingDetails.table.tools.mediaFree')}
                  </td>
                  <td className="p-4 text-center font-bold bg-brand-yellow/5 border-l-2 border-black text-xs">
                    {t('pricingDetails.table.tools.mediaPro')}
                  </td>
                </tr>
                <tr className="border-b border-slate-200 hover:bg-slate-50">
                  <td className="p-4 md:px-6 font-medium">{t('pricingDetails.table.tools.ai')}</td>
                  <td className="p-4 text-center text-slate-500 text-xs">
                    {t('pricingDetails.table.tools.aiFree')}
                  </td>
                  <td className="p-4 text-center font-bold bg-brand-yellow/5 border-l-2 border-black">
                    <div className="inline-flex items-center justify-center gap-1">
                      <InfinityIcon className="w-4 h-4" /> {t('pricingDetails.table.unlimited')}
                    </div>
                  </td>
                </tr>
                <tr className="hover:bg-slate-50">
                  <td className="p-4 md:px-6 font-medium">{t('pricingDetails.table.tools.pdf')}</td>
                  <td className="p-4 text-center text-slate-300">
                    <X className="w-4 h-4 mx-auto" />
                  </td>
                  <td className="p-4 text-center font-bold bg-brand-yellow/5 border-l-2 border-black">
                    {t('pricingDetails.table.tools.pdfPro')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-24 px-4 md:px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-heading font-bold mb-12 text-center">
            {t('pricingDetails.faq.title')}
          </h2>
          <div className="space-y-4">
            {(['q1', 'q2', 'q3'] as const).map(key => (
              <details
                key={key}
                className="bg-white border-2 border-slate-200 rounded-2xl p-6 group open:border-black open:shadow-pop transition-all"
              >
                <summary className="font-bold text-lg cursor-pointer list-none flex justify-between items-center">
                  {t(`pricingDetails.faq.${key}.q`)}
                  <ChevronDown className="w-5 h-5 group-open:rotate-180 transition-transform" />
                </summary>
                <p className="mt-4 text-slate-600 leading-relaxed">
                  {t(`pricingDetails.faq.${key}.a`)}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-slate-100 py-12 text-center border-t-2 border-slate-200">
        <div className="max-w-xl mx-auto px-6">
          <p className="text-slate-500 font-bold mb-6 text-sm uppercase tracking-widest">
            {t('pricingDetails.footer.poweredBy')}
          </p>
          <div className="flex justify-center items-center gap-8 opacity-60 grayscale hover:grayscale-0 transition-all">
            <div className="h-8 flex items-center font-bold text-xl">
              <CreditCard className="mr-2" /> {t('pricingDetails.footer.stripe')}
            </div>
            <div className="h-8 flex items-center font-bold text-xl">
              <Wallet className="mr-2" /> {t('pricingDetails.footer.paypal')}
            </div>
          </div>
          <p className="mt-8 text-xs text-slate-400">{t('pricingDetails.footer.copyright')}</p>
        </div>
      </footer>
    </div>
  );
}
