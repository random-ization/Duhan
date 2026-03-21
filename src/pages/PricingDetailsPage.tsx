import { useMemo, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAction } from 'convex/react';
import { SEO as Seo } from '../seo/SEO';
import { getRouteMeta } from '../seo/publicRoutes';
import { LocalizedLink } from '../components/LocalizedLink';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { aRef } from '../utils/convexRefs';
import { runConvexActionWithRetry } from '../utils/convexActionRetry';
import { notify } from '../utils/notify';
import { logger } from '../utils/logger';
import { buildPricingDetailsPath, type CheckoutPlan } from '../utils/subscriptionPlan';
import { useAuth } from '../contexts/AuthContext';
import { SubscriptionType } from '../types';
import { trackEvent } from '../utils/analytics';
import {
  Check,
  ChevronDown,
  CreditCard,
  Gift,
  Infinity as InfinityIcon,
  Minus,
  ShieldCheck,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import { Button } from '../components/ui';

type BillingCycle = 'monthly' | 'quarterly' | 'annual';
type PlanKey = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';
type PriceEntry = { amount: string; currency: string; formatted: string };
type VariantPrices = {
  GLOBAL: Record<string, PriceEntry>;
  REGIONAL: Record<string, PriceEntry>;
};
type ProPrice = { amount: string; period: string; saving: string };

function parseSelectedPlanFromSearch(search: string): {
  cycle?: BillingCycle;
  plan?: SubscriptionType;
} {
  const params = new URLSearchParams(search);
  const planParam = params.get('plan')?.toUpperCase() ?? '';
  if (planParam === 'MONTHLY') return { cycle: 'monthly', plan: SubscriptionType.MONTHLY };
  if (planParam === 'QUARTERLY') return { cycle: 'quarterly', plan: SubscriptionType.QUARTERLY };
  if (planParam === 'SEMIANNUAL') return { cycle: 'quarterly' };
  if (planParam === 'ANNUAL') return { cycle: 'annual', plan: SubscriptionType.ANNUAL };
  if (planParam === 'LIFETIME') return { plan: SubscriptionType.LIFETIME };
  return {};
}

export default function PricingDetailsPage() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useLocalizedNavigate();
  const location = useLocation();
  const meta = getRouteMeta(location.pathname);
  const checkoutSource = useMemo(() => {
    const source = new URLSearchParams(location.search).get('source');
    return source || 'pricing_details';
  }, [location.search]);

  const [billingCycle, setBillingCycle] = useState<BillingCycle>(() => {
    const { cycle, plan } = parseSelectedPlanFromSearch(location.search);
    if (plan === SubscriptionType.LIFETIME) return 'annual';
    return cycle ?? 'annual';
  });
  const showLocalizedPromo =
    i18n.language === 'zh' ||
    i18n.language === 'vi' ||
    i18n.language === 'mn' ||
    i18n.language.startsWith('zh-');

  const createCheckoutSession = useAction(
    aRef<
      {
        plan: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'LIFETIME';
        userId?: string;
        userEmail?: string;
        userName?: string;
        region?: string;
      },
      { checkoutUrl: string }
    >('lemonsqueezy:createCheckout')
  );

  const [prices, setPrices] = useState<VariantPrices | null>(null);
  const [checkoutPendingPlan, setCheckoutPendingPlan] = useState<
    'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'LIFETIME' | null
  >(null);

  const getPrices = useAction(
    aRef<Record<string, never>, VariantPrices>('lemonsqueezy:getVariantPrices')
  );

  useEffect(() => {
    runConvexActionWithRetry(getPrices, {}, { retries: 2, initialDelayMs: 300 })
      .then(setPrices)
      .catch(err => {
        logger.error('Failed to fetch prices', err);
      });
  }, [getPrices]);

  const proPlanId = useMemo(() => {
    if (billingCycle === 'monthly') return 'MONTHLY' as const;
    if (billingCycle === 'quarterly') return 'QUARTERLY' as const;
    return 'ANNUAL' as const;
  }, [billingCycle]);

  const proPrice = useMemo<ProPrice>(() => {
    const periodMap = {
      monthly: t('pricingDetails.period.month', '/month'),
      quarterly: t('pricingDetails.period.quarterly', '/quarter'),
      annual: t('pricingDetails.period.annual', '/year'),
    };

    // Default Fallback
    const fallback = {
      monthly: { amount: showLocalizedPromo ? '1.90' : '6.90' },
      quarterly: { amount: showLocalizedPromo ? '3.9' : '19.9' },
      annual: { amount: showLocalizedPromo ? '19.9' : '49' },
    };

    if (prices) {
      const regionKey: keyof VariantPrices = showLocalizedPromo ? 'REGIONAL' : 'GLOBAL';
      const planKeyMap: Record<BillingCycle, PlanKey> = {
        monthly: 'MONTHLY',
        quarterly: 'QUARTERLY',
        annual: 'ANNUAL',
      };
      const planKey = planKeyMap[billingCycle];

      const priceData = prices[regionKey]?.[planKey];
      if (priceData) {
        return {
          amount: priceData.amount,
          period: periodMap[billingCycle],
          saving: '',
        };
      }
    }

    return {
      amount: fallback[billingCycle].amount,
      period: periodMap[billingCycle],
      saving: '',
    };
  }, [billingCycle, t, showLocalizedPromo, prices]);

  const proOriginalPrice = useMemo(() => {
    // Original price is always the GLOBAL price (high anchor)
    // Or if we have a specific "Strikethrough" price from somewhere?
    // For now, let's keep the hardcoded "Original" anchor prices or use GLOBAL price if dynamic

    // Hardcoded anchors (Global prices)
    const anchors = {
      monthly: '6.90',
      quarterly: '19.90',
      annual: '49.00',
    };

    let amount = anchors[billingCycle];

    // If we have dynamic global prices, use those as anchors
    if (prices?.GLOBAL) {
      const planKeyMap: Record<BillingCycle, PlanKey> = {
        monthly: 'MONTHLY',
        quarterly: 'QUARTERLY',
        annual: 'ANNUAL',
      };
      const planKey = planKeyMap[billingCycle];

      if (prices.GLOBAL[planKey]) {
        amount = prices.GLOBAL[planKey].amount;
      }
    }

    return {
      amount,
      label: t('pricingDetails.originalLabel', 'Original'),
    };
  }, [billingCycle, t, prices]);

  const redirectTo = (target: string) => {
    const encoded = encodeURIComponent(target);
    navigate(`/auth?redirect=${encoded}`);
  };

  const startCheckout = async (plan: CheckoutPlan) => {
    trackEvent('checkout_start', {
      language: i18n.language,
      plan,
      source: checkoutSource,
    });

    if (!user) {
      redirectTo(buildPricingDetailsPath(plan));
      return;
    }

    try {
      setCheckoutPendingPlan(plan);
      const { checkoutUrl } = await runConvexActionWithRetry(
        createCheckoutSession,
        {
          plan,
          userId: user.id,
          userEmail: user.email,
          userName: user.name,
          region: showLocalizedPromo ? 'REGIONAL' : 'GLOBAL',
        },
        { retries: 1, initialDelayMs: 250 }
      );

      trackEvent('checkout_success', {
        language: i18n.language,
        plan,
        source: checkoutSource,
      });
      globalThis.location.assign(checkoutUrl);
    } catch (err) {
      logger.error('Failed to create checkout', err);
      notify.error(t('pricingDetails.errors.checkoutFailed'));
      setCheckoutPendingPlan(null);
    }
  };

  const isCurrentPlan = (type: SubscriptionType) =>
    (user?.subscriptionType || SubscriptionType.FREE) === type;

  const buttonLabel = showLocalizedPromo
    ? t('pricingDetails.promo.subscribe')
    : t('pricingDetails.plans.pro.cta');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-landing antialiased selection:bg-[#FFDE59] selection:text-black">
      <Seo
        title={meta.title}
        description={meta.description}
        keywords={meta.keywords}
        noIndex={meta.noIndex}
      />

      {showLocalizedPromo && (
        <div className="w-full bg-[#EC4899] border-b-2 border-black h-12 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-full flex items-center gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-7 h-7 bg-white rounded-lg border-2 border-black flex items-center justify-center flex-shrink-0">
                <Gift className="w-4 h-4 text-[#EC4899]" />
              </div>
              <div className="text-white text-sm font-bold truncate">
                {t('pricingDetails.promo.banner.prefix')}
                <span className="text-[#FFDE59]">{t('pricingDetails.promo.banner.highlight')}</span>
                {t('pricingDetails.promo.banner.suffix')}
              </div>
            </div>
          </div>
        </div>
      )}

      <nav
        className={`w-full bg-white border-b-2 border-black py-4 sticky z-40 ${showLocalizedPromo ? 'top-12' : 'top-0'}`}
      >
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <LocalizedLink to="/" className="flex items-center gap-2 group">
            <img src="/logo.png" alt={t('common.appName')} className="w-8 h-8 rounded-lg" />
            <span className="font-heading font-bold text-xl">{t('common.appName')}</span>
          </LocalizedLink>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
            <ShieldCheck className="w-4 h-4 text-[#10B981]" />
            {t('pricingDetails.refundBadge')}
          </div>
        </div>
      </nav>

      {showLocalizedPromo && (
        <section className="pt-10 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-xl mx-auto bg-[#E9FBF4] border-2 border-[#10B981] rounded-2xl shadow-pop p-6">
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-12 h-12 bg-[#10B981] rounded-full border-2 border-black flex items-center justify-center flex-shrink-0">
                  <Gift className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-heading font-extrabold text-slate-900">
                      {t('pricingDetails.promo.card.title')}
                    </h3>
                    <span className="bg-[#FFDE59] text-black border border-black rounded px-2 py-0.5 text-[10px] font-black">
                      {t('pricingDetails.promo.card.badge')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    {t('pricingDetails.promo.card.description')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <header className="pt-10 pb-8 md:pt-16 md:pb-12 px-4 md:px-6 text-center">
        <h1 className="text-3xl md:text-6xl font-heading font-extrabold mb-6">
          {t('pricingDetails.hero.titlePrefix')}
          <span className="relative inline-block px-2">
            <span className="relative z-10">{t('pricingDetails.hero.titleHighlight')}</span>
            <span className="absolute inset-0 bg-[#FFDE59] transform -rotate-2 -z-0 rounded border-2 border-black" />
          </span>
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10">
          {t('pricingDetails.hero.subtitleLine1')}
          <br />
          {t('pricingDetails.hero.subtitleLine2')}
        </p>

        <div className="inline-flex flex-col sm:flex-row bg-white p-1.5 rounded-xl border-2 border-black shadow-pop items-center relative gap-1 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={() => setBillingCycle('monthly')}
            className={`w-full sm:w-auto px-6 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${
              billingCycle === 'monthly'
                ? 'bg-[#0F172A] text-white shadow-sm'
                : 'text-slate-500 hover:text-black bg-white'
            }`}
          >
            {t('pricingDetails.billing.monthly')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={() => setBillingCycle('quarterly')}
            className={`w-full sm:w-auto px-6 py-2 rounded-lg text-sm font-bold transition-all duration-300 relative ${
              billingCycle === 'quarterly'
                ? 'bg-[#0F172A] text-white shadow-sm'
                : 'text-slate-500 hover:text-black bg-white'
            }`}
          >
            {t('pricingDetails.billing.quarterly')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={() => setBillingCycle('annual')}
            className={`w-full sm:w-auto px-6 py-2 rounded-lg text-sm font-bold transition-all duration-300 relative ${
              billingCycle === 'annual'
                ? 'bg-[#0F172A] text-white shadow-sm'
                : 'text-slate-500 hover:text-black bg-white'
            }`}
          >
            {t('pricingDetails.billing.annual')}
          </Button>
        </div>
      </header>

      <section className="pb-12 md:pb-24 px-4 md:px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-start">
          <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 md:p-8 flex flex-col hover:border-slate-400 transition-colors order-2 md:order-1">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-slate-500">
                {t('pricingDetails.plans.free.title')}
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                {t('pricingDetails.plans.free.subtitle')}
              </p>
            </div>
            <div className="mb-8 h-16 flex items-end">
              <span className="text-5xl font-heading font-extrabold">$0</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="auto"
              disabled={!user || isCurrentPlan(SubscriptionType.FREE)}
              onClick={() => navigate('/dashboard')}
              className="w-full py-3 rounded-xl border-2 border-slate-200 font-bold text-slate-500 mb-8 hover:border-black hover:text-black transition-all disabled:opacity-70 disabled:hover:border-slate-200 disabled:hover:text-slate-500"
            >
              {t('pricingDetails.plans.free.cta')}
            </Button>
            <ul className="space-y-4 text-sm text-slate-600 flex-1">
              <li className="flex gap-3">
                <Check className="w-5 h-5 text-slate-400 flex-shrink-0" />
                {t('pricingDetails.plans.free.features.f1')}
              </li>
              <li className="flex gap-3">
                <Check className="w-5 h-5 text-slate-400 flex-shrink-0" />
                {t('pricingDetails.plans.free.features.f2')}
              </li>
              <li className="flex gap-3">
                <Check className="w-5 h-5 text-slate-400 flex-shrink-0" />
                {t('pricingDetails.plans.free.features.f3')}
              </li>
              <li className="flex gap-3">
                <Check className="w-5 h-5 text-slate-400 flex-shrink-0" />
                {t('pricingDetails.plans.free.features.f4')}
              </li>
              <li className="flex gap-3 opacity-50">
                <X className="w-5 h-5 text-slate-300 flex-shrink-0" />
                {t('pricingDetails.plans.free.features.f5')}
              </li>
            </ul>
          </div>

          <div
            className={`rounded-3xl border-2 border-black p-6 md:p-8 flex flex-col relative shadow-pop transform md:-translate-y-4 z-10 text-white order-1 md:order-2 ${
              showLocalizedPromo ? 'bg-[#173C41]' : 'bg-[#0F172A]'
            }`}
          >
            {showLocalizedPromo ? (
              <div className="absolute top-4 right-4 bg-brand-green text-black border-2 border-black px-4 py-2 rounded-xl font-black text-xs tracking-wider animate-float">
                {t('pricingDetails.promo.activated')}
              </div>
            ) : (
              <div className="absolute top-0 right-0 bg-brand-yellow text-black border-l-2 border-b-2 border-black px-4 py-1.5 rounded-bl-xl font-bold text-xs uppercase tracking-wider">
                {t('pricingDetails.plans.pro.badge')}
              </div>
            )}
            <div className="mb-4">
              <h3 className="text-xl font-bold text-brand-yellow">
                {t('pricingDetails.plans.pro.title')}
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                {t('pricingDetails.plans.pro.subtitle')}
              </p>
            </div>
            {showLocalizedPromo ? (
              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-brand-green">$</span>
                  <span className="text-7xl font-heading font-extrabold text-brand-green">
                    {proPrice.amount}
                  </span>
                  <span className="text-slate-400 font-medium">{proPrice.period}</span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <span className="text-slate-400 font-bold text-sm">{proOriginalPrice.label}</span>
                  <span className="text-slate-400 font-extrabold text-xl line-through decoration-red-500 decoration-wavy decoration-2">
                    ${proOriginalPrice.amount}
                  </span>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-2 h-16 flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-slate-400">$</span>
                  <span className="text-6xl font-heading font-extrabold text-white">
                    {proPrice.amount}
                  </span>
                  <span className="text-slate-400 font-medium">{proPrice.period}</span>
                </div>
                <div className="mb-8 h-6" />
              </>
            )}

            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => startCheckout(proPlanId)}
              disabled={checkoutPendingPlan !== null}
              loading={checkoutPendingPlan === proPlanId}
              loadingText={buttonLabel}
              loadingIconClassName="w-5 h-5"
              className={`w-full py-4 rounded-xl font-bold text-lg mb-8 hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all border-2 border-black flex justify-center items-center gap-2 ${
                showLocalizedPromo
                  ? 'bg-brand-green text-white shadow-[4px_4px_0px_0px_#ffffff]'
                  : 'bg-brand-yellow text-black shadow-[4px_4px_0px_0px_#ffffff]'
              }`}
            >
              {buttonLabel}
              <Zap className="w-5 h-5" />
            </Button>

            <div className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-widest border-b border-slate-700 pb-2">
              {t('pricingDetails.plans.pro.unlockTitle')}
            </div>

            <ul className="space-y-4 text-sm text-slate-200 flex-1">
              {[
                t('pricingDetails.plans.pro.features.f1'),
                t('pricingDetails.plans.pro.features.f2'),
                t('pricingDetails.plans.pro.features.f3'),
                t('pricingDetails.plans.pro.features.f4'),
                t('pricingDetails.plans.pro.features.f5'),
              ].map(item => (
                <li key={item} className="flex gap-3 items-start">
                  <div className="bg-brand-green/20 p-0.5 rounded text-brand-green flex-shrink-0">
                    <Check className="w-4 h-4" />
                  </div>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white rounded-3xl border-2 border-black p-6 md:p-8 flex flex-col shadow-pop hover:shadow-[0_0_20px_rgba(255,222,89,0.5)] transition-shadow relative overflow-hidden order-3">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#8B5CF6] to-[#EC4899]" />
            <div className="mb-4">
              <h3 className="text-xl font-bold text-brand-purple">
                {t('pricingDetails.plans.lifetime.title')}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                {t('pricingDetails.plans.lifetime.subtitle')}
              </p>
            </div>
            <div className="mb-8 h-16 flex items-end">
              <span className="text-5xl font-heading font-extrabold">$99</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => startCheckout('LIFETIME')}
              disabled={checkoutPendingPlan !== null}
              loading={checkoutPendingPlan === 'LIFETIME'}
              loadingText={t('pricingDetails.plans.lifetime.cta')}
              loadingIconClassName="w-4 h-4"
              className="w-full py-3 rounded-xl border-2 border-black bg-slate-100 font-bold text-slate-900 mb-8 hover:bg-white transition-all"
            >
              {t('pricingDetails.plans.lifetime.cta')}
            </Button>
            <ul className="space-y-4 text-sm text-slate-600 flex-1">
              <li className="flex gap-3">
                <Check className="w-5 h-5 text-[#8B5CF6] flex-shrink-0" />
                {t('pricingDetails.plans.lifetime.features.f1')}
              </li>
              <li className="flex gap-3">
                <Check className="w-5 h-5 text-[#8B5CF6] flex-shrink-0" />
                {t('pricingDetails.plans.lifetime.features.f2')}
              </li>
              <li className="flex gap-3">
                <Check className="w-5 h-5 text-[#8B5CF6] flex-shrink-0" />
                {t('pricingDetails.plans.lifetime.features.f3')}
              </li>
            </ul>
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
