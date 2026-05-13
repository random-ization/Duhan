import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { usePublicMembershipSnapshot } from '../../hooks/usePublicMembershipSnapshot';
import {
  callAuthenticatedConvexAction,
  callPublicConvexAction,
} from '../../utils/publicConvexClient';
import { runConvexActionWithRetry } from '../../utils/convexActionRetry';
import {
  isSafeCheckoutUrl,
  type LemonSqueezyCheckoutRequest,
  type LemonSqueezyCheckoutResult,
  type LemonSqueezyVariantPrices,
} from '../../utils/lemonsqueezy';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';
import { getLanguageLabel } from '../../utils/languageUtils';
import { buildPricingDetailsPath } from '../../utils/subscriptionPlan';
import { trackEvent } from '../../utils/analytics';
import { ArrowLeft, Check, Star, Zap, Crown, ShieldCheck } from 'lucide-react';
import { getSubscriptionPageCopy } from '../../utils/subscriptionPageCopy';
import { Button } from '../ui';
import { KT, HanjaSeal, Card, PageShell } from './ksoft/ksoft';
import { MemberSubscriptionManagement } from '../subscription/MemberSubscriptionManagement';

export const MobileSubscriptionPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useLocalizedNavigate();
  const { user, loading: authLoading } = useAuth();
  const membership = usePublicMembershipSnapshot();
  const [billingInterval, setBillingInterval] = useState<'MONTHLY' | 'ANNUAL' | 'LIFETIME'>('ANNUAL');
  const [loading, setLoading] = useState(false);
  const [prices, setPrices] = useState<LemonSqueezyVariantPrices | null>(null);

  const effectiveUser = membership.user ?? user;
  const isPremiumMember = Boolean(membership.viewerAccess?.isPremium);

  const showLocalizedPromo =
    i18n.language === 'zh' ||
    i18n.language === 'vi' ||
    i18n.language === 'mn' ||
    i18n.language.startsWith('zh-');
    
  const priceRegion = showLocalizedPromo ? 'REGIONAL' : 'GLOBAL';
  
  const PRICING_MAP: Record<string, any> = {
    en: { symbol: '$', monthly: '4.99', annual: '19.99', lifetime: '39.99', unitM: '/ mo', unitA: '/ yr' },
    zh: { symbol: '¥', monthly: '19', annual: '69', lifetime: '128', unitM: '/ 月', unitA: '/ 年' },
    vi: { symbol: '₫', monthly: '69.000', annual: '249.000', lifetime: '499.000', unitM: '/ 月', unitA: '/ 年' },
    mn: { symbol: '₮', monthly: '9,900', annual: '35,000', lifetime: '69,000', unitM: '/ 月', unitA: '/ 年' },
  };

  const config = PRICING_MAP[i18n.language] || PRICING_MAP['en'];
  const baseLang = (i18n.language || 'en').split('-')[0];
  const languageLabel = getLanguageLabel(baseLang as 'en' | 'zh' | 'vi' | 'mn');
  const pageCopy = useMemo(() => getSubscriptionPageCopy(i18n.language), [i18n.language]);

  const handleSubscribe = async () => {
    if (authLoading) return;
    const plan = billingInterval as any;

    trackEvent('checkout_start', {
      language: i18n.language,
      plan: plan,
      source: 'mobile_subscription_v2',
    });

    if (!effectiveUser) {
      navigate('/auth', { state: { from: location.pathname, plan } });
      return;
    }

    setLoading(true);
    try {
      const checkoutArgs: LemonSqueezyCheckoutRequest = {
        plan: plan,
        userId: effectiveUser.id?.toString() || '',
        userEmail: effectiveUser.email || '',
        userName: effectiveUser.name || '',
        region: showLocalizedPromo ? 'REGIONAL' : 'GLOBAL',
        locale: i18n.language,
        source: 'mobile_subscription_v2',
        returnTo: '/dashboard',
        appOrigin: globalThis.location.origin,
      };
      const { checkoutUrl } = await runConvexActionWithRetry(
        () => callAuthenticatedConvexAction<LemonSqueezyCheckoutRequest, LemonSqueezyCheckoutResult>(
          'lemonsqueezy:createCheckout', 
          checkoutArgs
        ),
        undefined,
        { retries: 1 }
      );
      if (!isSafeCheckoutUrl(checkoutUrl)) throw new Error('Invalid URL');
      globalThis.location.href = checkoutUrl;
    } catch (error) {
      logger.error('Checkout failed:', error);
      notify.error(t('pricing.checkoutError'));
      setLoading(false);
    }
  };

  if (membership.hasStoredSession && (membership.loading || isPremiumMember)) {
    return (
      <MemberSubscriptionManagement
        user={effectiveUser}
        viewerAccess={membership.viewerAccess}
        variant="mobile"
        loading={membership.loading}
        error={membership.error}
        onRefresh={membership.refresh}
      />
    );
  }

  const commonFeatures = [
    t('landing.v2.pricing.pro.f1', { defaultValue: '无限新学 + 无限复习' }),
    t('landing.v2.pricing.pro.f2', { defaultValue: '完整课程 + TOPIK 真题' }),
    t('landing.v2.pricing.pro.f3', { defaultValue: '影视全库 + 双语字幕' }),
    t('landing.v2.pricing.pro.f4', { defaultValue: 'AI 写作评分 + 深度解析' }),
  ];

  return (
    <PageShell>
      {/* Header Area */}
      <header className="px-6 pt-6 pb-4">
        <div className="flex justify-between items-center mb-10">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-white border border-k-ink/5 shadow-sm flex items-center justify-center"
          >
            <ArrowLeft size={18} className="text-k-ink" />
          </button>
          <div className="px-3 py-1 bg-k-ink/5 rounded-full text-[11px] font-black tracking-widest text-k-ink/50 uppercase">
            {languageLabel} · {pageCopy.pageLabel}
          </div>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-k-crimson/10 rounded-full mb-4">
            <Star size={10} className="text-k-crimson fill-k-crimson" />
            <span className="text-[10px] font-black text-k-crimson uppercase tracking-widest">{pageCopy.heroBadge}</span>
          </div>
          <h1 className="font-k-serif text-[32px] font-black text-k-ink leading-tight mb-3">
            {pageCopy.heroTitle}
          </h1>
          <p className="text-[15px] font-medium text-k-sub opacity-80 max-w-[280px] mx-auto">
            {pageCopy.heroSubtitle}
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 pb-48">
        {/* Billing Toggle (Physical) */}
        <div className="mb-10 flex justify-center">
          <div className="relative flex w-full max-w-[320px] items-center p-1 bg-k-ink/5 rounded-2xl border-2 border-k-ink/5">
            {[
              { key: 'MONTHLY', label: t('plan.monthly') },
              { key: 'ANNUAL', label: t('plan.annual') },
              { key: 'LIFETIME', label: t('plan.lifetime') },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setBillingInterval(tab.key as any)}
                className={`relative flex-1 py-3.5 rounded-xl text-[12px] font-black transition-all duration-300 z-10 ${
                  billingInterval === tab.key ? 'text-k-bg' : 'text-k-sub'
                }`}
              >
                {tab.label}
              </button>
            ))}
            <div 
              className="absolute top-1 bottom-1 bg-k-ink rounded-xl transition-all duration-300 shadow-lg"
              style={{
                width: 'calc(33.33% - 4px)',
                left: billingInterval === 'MONTHLY' ? '4px' : billingInterval === 'ANNUAL' ? 'calc(33.33% + 2px)' : 'calc(66.66% + 0px)'
              }}
            />
          </div>
        </div>

        {/* Selected Plan Price Focus */}
        <div className="mb-12 text-center">
          <div className="flex items-baseline justify-center gap-1 mb-2">
            <span className="font-k-serif text-[24px] font-medium text-k-ink/30">{config.symbol}</span>
            <span className="font-k-serif text-[72px] font-black leading-none tracking-tighter text-k-ink">
              {billingInterval === 'MONTHLY' ? config.monthly : billingInterval === 'ANNUAL' ? config.annual : config.lifetime}
            </span>
            <span className="text-[15px] font-bold text-k-sub opacity-50">
              {billingInterval === 'MONTHLY' ? config.unitM : billingInterval === 'ANNUAL' ? config.unitA : t('period.once')}
            </span>
          </div>
          {billingInterval === 'ANNUAL' && (
            <div className="inline-block px-3 py-1 bg-k-crimson text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-pop-small">
              Best Value · 70% OFF
            </div>
          )}
        </div>

        {/* Features Card */}
        <Card pad={32} className="mb-12 border-2 border-k-ink/5 shadow-pop">
          <div className="flex items-center gap-4 mb-8">
            <img src="/logo.svg" alt="Duhan Logo" width={42} height={42} className="rounded-[10px]" />
            <div>
              <h3 className="text-[17px] font-black text-k-ink">Pro Features</h3>
              <p className="text-[12px] text-k-sub font-medium">Unlocks the full learning platform</p>
            </div>
          </div>
          <ul className="space-y-5">
            {commonFeatures.map((f, i) => (
              <li key={i} className="flex items-start gap-4">
                <div className="mt-1 flex h-4 w-4 items-center justify-center rounded-full bg-k-ink/5 text-k-crimson shrink-0">
                  <Check size={10} strokeWidth={4} />
                </div>
                <span className="text-[14px] font-medium text-k-ink leading-tight" dangerouslySetInnerHTML={{ __html: f }} />
              </li>
            ))}
          </ul>
        </Card>

        {/* Detailed Comparison Link */}
        <div className="text-center">
          <p className="text-[13px] text-k-sub font-medium mb-4">{pageCopy.comparisonSubtitle}</p>
          <button 
            onClick={() => navigate(buildPricingDetailsPath({ source: 'mobile_subscription' }))}
            className="inline-flex items-center gap-2 text-[14px] font-black text-k-ink border-b-2 border-k-ink/20 pb-1"
          >
            {pageCopy.comparisonTitle} <ArrowLeft size={14} className="rotate-180" />
          </button>
        </div>
      </main>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t-2 border-k-ink/5 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-50">
        <Button
          onClick={handleSubscribe}
          loading={loading}
          disabled={loading || authLoading}
          className="w-full h-[64px] bg-k-ink text-white rounded-2xl text-[16px] font-black shadow-pop-small active:scale-[0.98] transition-all"
        >
          {t('button.upgrade', 'Upgrade to Pro')}
        </Button>
        <p className="mt-4 text-[11px] text-center text-k-sub font-medium opacity-60">
          Secure Payment · Cancel Anytime · Instant Activation
        </p>
      </div>
    </PageShell>
  );
};
