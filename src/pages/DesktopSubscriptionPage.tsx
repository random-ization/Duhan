import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SEO as Seo } from '../seo/SEO';
import { getRouteMeta } from '../seo/publicRoutes';
import BackButton from '../components/ui/BackButton';
import { LanguageSwitcher } from '../components/common/LanguageSwitcher';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { callAuthenticatedConvexAction } from '../utils/publicConvexClient';
import {
  isSafeCheckoutUrl,
  type LemonSqueezyCheckoutRequest,
  type LemonSqueezyCheckoutResult,
} from '../utils/lemonsqueezy';
import { notify } from '../utils/notify';
import { logger } from '../utils/logger';
import { type CheckoutPlan } from '../utils/subscriptionPlan';
import { trackEvent } from '../utils/analytics';
import { runConvexActionWithRetry } from '../utils/convexActionRetry';
import { getSubscriptionPageCopy } from '../utils/subscriptionPageCopy';
import { Check, Star, ShieldCheck, Zap } from 'lucide-react';
import { HanjaSeal } from '../components/desktop/ui/HanjaSeal';
import { usePricingPlans } from '../hooks/usePricingPlans';

type PricingMode = 'MONTHLY' | 'ANNUAL' | 'LIFETIME';

const DesktopSubscriptionPage: React.FC = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useLocalizedNavigate();
  const location = useLocation();

  const meta = getRouteMeta(location.pathname);
  const [mode, setMode] = useState<PricingMode>('ANNUAL');
  const [checkoutPendingPlan, setCheckoutPendingPlan] = useState<CheckoutPlan | null>(null);
  const { plans, region } = usePricingPlans(i18n.language);

  const pageCopy = useMemo(() => getSubscriptionPageCopy(i18n.language), [i18n.language]);

  const handleSubscribe = async (plan: PricingMode) => {
    const checkoutPlan = plan as CheckoutPlan;
    if (checkoutPendingPlan) return;

    trackEvent('checkout_start', {
      language: i18n.language,
      plan: checkoutPlan,
      source: 'desktop_subscription_v2',
    });

    if (!user) {
      // Use the localized login path
      navigate('/login', { state: { from: location.pathname, plan: checkoutPlan } });
      return;
    }

    try {
      setCheckoutPendingPlan(checkoutPlan);
      const checkoutArgs: LemonSqueezyCheckoutRequest = {
        plan: checkoutPlan,
        userId: user.id?.toString() || '',
        userEmail: user.email || '',
        userName: user.name || '',
        region,
        locale: i18n.language,
        source: 'desktop_subscription_v2',
        returnTo: '/dashboard',
        appOrigin: globalThis.location.origin,
      };

      const { checkoutUrl } = await runConvexActionWithRetry(
        () => callAuthenticatedConvexAction<LemonSqueezyCheckoutRequest, LemonSqueezyCheckoutResult>(
          'lemonsqueezy:createCheckout', 
          checkoutArgs
        ),
        undefined,
        { retries: 0 }
      );

      if (!isSafeCheckoutUrl(checkoutUrl)) throw new Error('Invalid checkout URL');

      trackEvent('checkout_success', {
        language: i18n.language,
        plan: checkoutPlan,
        source: 'desktop_subscription_v2',
      });

      globalThis.location.assign(checkoutUrl);
    } catch (error) {
      const err = error as Error;
      logger.error('Checkout failed:', err);
      notify.error(t('pricing.checkoutError', { defaultValue: '无法启动结账，请稍后重试' }));
    } finally {
      setCheckoutPendingPlan(null);
    }
  };

  const commonFeatures = [
    t('landing.v2.pricing.pro.f1', { defaultValue: '无限新学 + 无限复习' }),
    t('landing.v2.pricing.pro.f2', { defaultValue: '完整课程 + TOPIK 1-6 级真题' }),
    t('landing.v2.pricing.pro.f3', { defaultValue: '影视 / 播客 全库 + 双语字幕' }),
    t('landing.v2.pricing.pro.f4', { defaultValue: 'AI 写作评分 + 听力倍速精听' }),
    t('landing.v2.pricing.pro.f5', { defaultValue: '社区优先答疑 · 专家响应' }),
    t('landing.v2.pricing.pro.f6', { defaultValue: '云端跨设备同步 + 离线下载' }),
  ];

  return (
    <div className="min-h-screen bg-k-bg py-12 px-6 lg:px-8">
      <Seo
        title={meta.title}
        description={meta.description}
        keywords={meta.keywords}
        noIndex={meta.noIndex}
      />
      
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-16">
          <BackButton onClick={() => navigate(-1)} />
          <LanguageSwitcher />
        </header>

        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-k-ink/10 bg-white px-4 py-1.5 shadow-sm">
            <Star size={12} className="text-k-crimson fill-k-crimson" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-k-ink/60">
              {pageCopy.heroBadge}
            </span>
          </div>
          <h1 className="font-k-serif text-[48px] md:text-[72px] font-black leading-[1.1] tracking-tight text-k-ink mb-6">
            {pageCopy.heroTitle}
          </h1>
          <p className="mx-auto max-w-2xl text-[18px] md:text-[20px] text-k-sub font-medium leading-relaxed opacity-80">
            {pageCopy.heroSubtitle}
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="mb-16 flex justify-center">
          <div className="relative flex items-center p-1.5 bg-k-ink/5 rounded-2xl border-2 border-k-ink/5">
            {[
              { key: 'MONTHLY', label: t('plan.monthly', 'Monthly') },
              { key: 'ANNUAL', label: t('plan.annual', 'Annual'), save: '70% OFF' },
              { key: 'LIFETIME', label: t('plan.lifetime', 'Lifetime') },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setMode(tab.key as PricingMode)}
                className={`relative px-8 py-3 rounded-xl text-[14px] font-black transition-all duration-300 z-10 ${
                  mode === tab.key ? 'text-k-bg' : 'text-k-sub hover:text-k-ink'
                }`}
              >
                {tab.label}
                {tab.save && (
                  <span className={`absolute -top-2 -right-1 px-2 py-0.5 rounded-md text-[9px] font-black tracking-wider uppercase shadow-sm ${
                    mode === tab.key ? 'bg-k-crimson text-white' : 'bg-k-ink/10 text-k-ink'
                  }`}>
                    {tab.save}
                  </span>
                )}
              </button>
            ))}
            <div 
              className="absolute top-1.5 bottom-1.5 bg-k-ink rounded-xl transition-all duration-300 shadow-lg"
              style={{
                width: 'calc(33.33% - 4px)',
                left: mode === 'MONTHLY' ? '6px' : mode === 'ANNUAL' ? 'calc(33.33% + 2px)' : 'calc(66.66% - 2px)'
              }}
            />
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch mb-24">
          {/* Monthly */}
          <div className={`flex flex-col rounded-[40px] border-2 bg-white p-10 shadow-pop transition-all hover:-translate-y-2 ${mode === 'MONTHLY' ? 'border-k-ink' : 'border-k-ink/5'}`}>
            <div className="mb-8">
              <HanjaSeal c="月" size={48} bg="var(--color-k-ink)" color="var(--color-k-bg)" className="mb-6" />
              <h3 className="text-[24px] font-black text-k-ink">{t('plan.monthly', 'Monthly')}</h3>
              <p className="mt-2 text-[14px] text-k-sub font-medium opacity-70">{t('pricing.monthlyDesc', '适合短期突击学习')}</p>
            </div>
            <div className="mb-10 flex items-baseline gap-1.5">
              <span className="font-k-serif text-[28px] font-medium text-k-ink/40">{plans.MONTHLY.currencySymbol}</span>
              <span className="font-k-serif text-[64px] font-black leading-none tracking-tighter text-k-ink">{plans.MONTHLY.displayAmount}</span>
              <span className="text-[14px] font-bold text-k-sub opacity-50">{plans.MONTHLY.displayUnit}</span>
            </div>
            <ul className="mb-12 space-y-5 flex-1">
              {commonFeatures.map((f, i) => (
                <li key={i} className="flex items-start gap-4 text-[14px] text-k-ink font-medium">
                  <div className="mt-1 flex h-4 w-4 items-center justify-center rounded-full bg-k-ink/5 text-k-crimson">
                    <Check size={10} strokeWidth={4} />
                  </div>
                  <span dangerouslySetInnerHTML={{ __html: f }} />
                </li>
              ))}
            </ul>
            <button 
              onClick={() => handleSubscribe('MONTHLY')}
              className="w-full rounded-2xl border-2 border-k-ink bg-transparent py-4 text-[15px] font-black text-k-ink hover:bg-k-ink hover:text-white transition-all active:scale-[0.98]"
            >
              {t('button.upgrade', 'Upgrade Now')}
            </button>
          </div>

          {/* Annual (Featured) */}
          <div className="relative z-10 lg:scale-[1.08]">
            <div className="h-full flex flex-col rounded-[44px] border-2 border-k-ink bg-k-ink p-1 shadow-pop-large">
              <div className="flex-1 rounded-[40px] bg-k-ink p-10 text-white">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-k-crimson px-5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-xl">
                  {t('pricing.recommended', 'Most Popular')}
                </div>
                <div className="mb-8">
                  <img src="/logo.svg" alt="Duhan Logo" width={48} height={48} className="mb-6 rounded-[12px] shadow-pop-small" />
                  <h3 className="text-[24px] font-black">{t('plan.annual', 'Annual')}</h3>
                  <p className="mt-2 text-[14px] text-white/60 font-medium">{t('pricing.annualDesc', '最受核心学习者欢迎')}</p>
                </div>
                <div className="mb-10 flex items-baseline gap-1.5">
                  <span className="font-k-serif text-[28px] font-medium text-white/40">{plans.ANNUAL.currencySymbol}</span>
                  <span className="font-k-serif text-[64px] font-black leading-none tracking-tighter">{plans.ANNUAL.displayAmount}</span>
                  <span className="text-[14px] font-bold text-white/50">{plans.ANNUAL.displayUnit}</span>
                </div>
                <ul className="mb-12 space-y-5 flex-1">
                  {commonFeatures.map((f, i) => (
                    <li key={i} className="flex items-start gap-4 text-[14px] text-white font-medium">
                      <div className="mt-1 flex h-4 w-4 items-center justify-center rounded-full bg-k-crimson text-white">
                        <Check size={10} strokeWidth={4} />
                      </div>
                      <span dangerouslySetInnerHTML={{ __html: f }} />
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={() => handleSubscribe('ANNUAL')}
                  disabled={checkoutPendingPlan === 'ANNUAL'}
                  className="w-full rounded-2xl bg-k-crimson py-5 text-[16px] font-black text-white hover:bg-red-500 transition-all active:scale-[0.98] shadow-pop-small"
                >
                  {checkoutPendingPlan === 'ANNUAL' ? t('common.loading') : t('button.upgrade', 'Upgrade Now')}
                </button>
              </div>
            </div>
          </div>

          {/* Lifetime */}
          <div className={`flex flex-col rounded-[40px] border-2 bg-white p-10 shadow-pop transition-all hover:-translate-y-2 ${mode === 'LIFETIME' ? 'border-k-ink' : 'border-k-ink/5'}`}>
            <div className="mb-8">
              <HanjaSeal c="永" size={48} bg="var(--color-k-ink)" color="var(--color-k-bg)" className="mb-6" />
              <h3 className="text-[24px] font-black text-k-ink">{t('plan.lifetime', 'Lifetime')}</h3>
              <p className="mt-2 text-[14px] text-k-sub font-medium opacity-70">{t('pricing.lifetimeDesc', '终身解锁，无后顾之忧')}</p>
            </div>
            <div className="mb-10 flex items-baseline gap-1.5">
              <span className="font-k-serif text-[28px] font-medium text-k-ink/40">{plans.LIFETIME.currencySymbol}</span>
              <span className="font-k-serif text-[64px] font-black leading-none tracking-tighter text-k-ink">{plans.LIFETIME.displayAmount}</span>
              <span className="text-[14px] font-bold text-k-sub opacity-50">{plans.LIFETIME.displayUnit}</span>
            </div>
            <ul className="mb-12 space-y-5 flex-1">
              {commonFeatures.map((f, i) => (
                <li key={i} className="flex items-start gap-4 text-[14px] text-k-ink font-medium">
                  <div className="mt-1 flex h-4 w-4 items-center justify-center rounded-full bg-k-ink/5 text-k-crimson">
                    <Check size={10} strokeWidth={4} />
                  </div>
                  <span dangerouslySetInnerHTML={{ __html: f }} />
                </li>
              ))}
            </ul>
            <button 
              onClick={() => handleSubscribe('LIFETIME')}
              className="w-full rounded-2xl border-2 border-k-ink bg-transparent py-4 text-[15px] font-black text-k-ink hover:bg-k-ink hover:text-white transition-all active:scale-[0.98]"
            >
              {t('button.upgrade', 'Upgrade Now')}
            </button>
          </div>
        </div>

        {/* Feature Grid - Detailed Breakdown */}
        <div className="bg-white rounded-[48px] p-12 md:p-16 border-2 border-k-ink/5 shadow-pop-large mb-24">
          <div className="mb-12 text-center">
            <h2 className="font-k-serif text-[36px] md:text-[48px] font-black text-k-ink mb-4">{pageCopy.comparisonTitle}</h2>
            <p className="text-k-sub font-medium">{pageCopy.comparisonSubtitle}</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {[
              { icon: <Zap className="text-k-crimson" />, title: t('feature.allCourses', '全库教材'), desc: t('feature.allCoursesDesc', '包含延世、首尔大、庆熙大等所有核心教材课程') },
              { icon: <ShieldCheck className="text-k-crimson" />, title: t('feature.topikArchive', 'TOPIK 真题'), desc: t('feature.topikArchiveDesc', '1-6 级历年真题库，支持模拟考试与即时评分') },
              { icon: <Zap className="text-k-crimson" />, title: t('feature.aiWriting', 'AI 写作评分'), desc: t('feature.aiWritingDesc', '基于大语言模型的精准批改，像私人教师一样纠正语法') },
            ].map((item, idx) => (
              <div key={idx} className="flex flex-col gap-4">
                <div className="w-12 h-12 rounded-2xl bg-k-ink/5 flex items-center justify-center">
                  {item.icon}
                </div>
                <h4 className="text-[18px] font-black text-k-ink">{item.title}</h4>
                <p className="text-[14px] text-k-sub leading-relaxed font-medium">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Trust Footer */}
        <footer className="text-center pb-12">
          <div className="flex flex-wrap justify-center gap-12 mb-8 opacity-40 grayscale">
            <div className="font-black tracking-widest text-[11px]">WECHAT PAY</div>
            <div className="font-black tracking-widest text-[11px]">ALIPAY</div>
            <div className="font-black tracking-widest text-[11px]">UNIONPAY</div>
            <div className="font-black tracking-widest text-[11px]">APPLE PAY</div>
          </div>
          <div className="inline-block px-8 py-4 bg-k-ink/5 rounded-2xl border border-k-ink/5">
            <p className="text-[13px] text-k-sub font-medium italic">
              {t('landing.v2.pricing.fine')}
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default DesktopSubscriptionPage;
