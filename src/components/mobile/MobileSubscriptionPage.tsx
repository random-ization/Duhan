import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useAction } from 'convex/react';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { aRef, NoArgs } from '../../utils/convexRefs';
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
import { ArrowLeft, Check, BookOpen, Trophy, Sparkles } from 'lucide-react';
import { getSubscriptionPageCopy } from '../../utils/subscriptionPageCopy';
import { Button } from '../ui';

export const MobileSubscriptionPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useLocalizedNavigate();
  const { user, loading: authLoading } = useAuth();
  const [billingInterval, setBillingInterval] = useState<'MONTHLY' | 'ANNUAL'>('ANNUAL');
  const [loading, setLoading] = useState(false);
  const [prices, setPrices] = useState<LemonSqueezyVariantPrices | null>(null);

  const createCheckoutSession = useAction(
    aRef<LemonSqueezyCheckoutRequest, LemonSqueezyCheckoutResult>('lemonsqueezy:createCheckout')
  );
  const getVariantPrices = useAction(
    aRef<NoArgs, LemonSqueezyVariantPrices>('lemonsqueezy:getVariantPrices')
  );

  const showLocalizedPromo =
    i18n.language === 'zh' ||
    i18n.language === 'vi' ||
    i18n.language === 'mn' ||
    i18n.language.startsWith('zh-');
  const priceRegion = showLocalizedPromo ? 'REGIONAL' : 'GLOBAL';
  const monthlyPrice =
    prices?.[priceRegion]?.MONTHLY?.formatted ?? (showLocalizedPromo ? '$1.90' : '$6.90');
  const annualPrice =
    prices?.[priceRegion]?.ANNUAL?.formatted ?? (showLocalizedPromo ? '$19.90' : '$49.00');
  const annualDiscountText = useMemo(() => {
    const monthlyAmount = Number(prices?.[priceRegion]?.MONTHLY?.amount);
    const annualAmount = Number(prices?.[priceRegion]?.ANNUAL?.amount);
    if (!monthlyAmount || !annualAmount) return '-20%';
    const discount = Math.max(0, Math.round((1 - annualAmount / (monthlyAmount * 12)) * 100));
    return discount > 0 ? `-${discount}%` : '-20%';
  }, [priceRegion, prices]);
  const baseLang = (i18n.language || 'en').split('-')[0];
  const languageLabel = getLanguageLabel(baseLang as 'en' | 'zh' | 'vi' | 'mn');
  const pageCopy = useMemo(() => getSubscriptionPageCopy(i18n.language), [i18n.language]);
  const featureCards = useMemo(
    () => [
      { ...pageCopy.featureCards[0], icon: BookOpen, iconClassName: 'bg-blue-50 text-blue-600' },
      { ...pageCopy.featureCards[1], icon: Trophy, iconClassName: 'bg-white/10 text-indigo-300' },
      {
        ...pageCopy.featureCards[2],
        icon: Sparkles,
        iconClassName: 'bg-purple-50 text-purple-600',
      },
    ],
    [pageCopy.featureCards]
  );

  useEffect(() => {
    runConvexActionWithRetry(getVariantPrices, {}, { retries: 2, initialDelayMs: 300 })
      .then(setPrices)
      .catch(err => {
        logger.warn('Failed to load variant prices for mobile subscription', err);
      });
  }, [getVariantPrices]);

  const handleSubscribe = async () => {
    if (authLoading) {
      return;
    }

    trackEvent('checkout_start', {
      language: i18n.language,
      plan: billingInterval,
      source: 'mobile_subscription',
    });

    if (!user) {
      navigate(
        `/auth?redirect=${encodeURIComponent(
          buildPricingDetailsPath({
            plan: billingInterval,
            source: 'mobile_subscription',
            returnTo: '/dashboard',
          })
        )}`
      );
      return;
    }

    setLoading(true);
    try {
      const { checkoutUrl } = await runConvexActionWithRetry(
        createCheckoutSession,
        {
          plan: billingInterval,
          userId: user.id?.toString() || '',
          userEmail: user.email || '',
          userName: user.name || '',
          region: showLocalizedPromo ? 'REGIONAL' : 'GLOBAL',
          locale: i18n.language,
          source: 'mobile_subscription',
          returnTo: '/dashboard',
        },
        { retries: 1, initialDelayMs: 250 }
      );
      if (!isSafeCheckoutUrl(checkoutUrl)) {
        throw new Error('Invalid checkout URL returned by provider');
      }
      trackEvent('checkout_success', {
        language: i18n.language,
        plan: billingInterval,
        source: 'mobile_subscription',
      });
      globalThis.location.href = checkoutUrl;
    } catch (error) {
      const err = error as Error;
      logger.error('Checkout failed:', err);
      const msg = err.message || t('common.notFound', { defaultValue: 'Unknown error' });
      notify.error(`${t('pricingDetails.errors.checkoutFailed')}: ${msg}`);
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen bg-slate-50 flex flex-col pb-40 overflow-hidden"
      style={{
        backgroundImage:
          'radial-gradient(hsl(var(--border) / 0.62) 1px, transparent 1px), radial-gradient(hsl(var(--brand-indigo) / 0.08) 1px, transparent 1px)',
        backgroundSize: '20px 20px, 40px 40px',
        backgroundPosition: '0 0, 10px 10px',
      }}
    >
      <div className="pointer-events-none absolute -top-16 left-[-5rem] h-56 w-56 rounded-full bg-indigo-400/14 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 right-[-4rem] h-56 w-56 rounded-full bg-purple-400/12 blur-3xl" />
      {/* Header */}
      <header className="relative z-10 px-6 pt-6 pb-8 bg-white border-b border-slate-200">
        <div className="flex justify-between items-center mb-6">
          <Button
            variant="ghost"
            size="auto"
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-slate-500 hover:bg-slate-50 rounded-lg"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">{pageCopy.pageLabel}</span>
            <span className="w-px h-3 bg-slate-50"></span>
            <span className="text-xs font-bold text-slate-900">{languageLabel}</span>
          </div>
        </div>

        <div className="text-center">
          <span className="inline-block py-1 px-3 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs mb-4">
            {pageCopy.heroBadge}
          </span>
          <h1 className="text-3xl font-black text-slate-900 leading-tight mb-2">
            {pageCopy.heroTitle}
          </h1>
          <p className="text-slate-500 font-medium text-sm leading-relaxed max-w-xs mx-auto">
            {pageCopy.heroSubtitle}
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 px-4 py-8 space-y-8">
        {/* 1. Feature Cards */}
        <div className="space-y-4">
          {featureCards.map((card, index) => {
            const Icon = card.icon;
            const isDarkCard = index === 1;

            return (
              <div
                key={card.title}
                className={
                  isDarkCard
                    ? 'bg-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-200 relative overflow-hidden'
                    : 'bg-white p-6 rounded-3xl border border-slate-200 shadow-lg shadow-indigo-100/50'
                }
              >
                {isDarkCard ? (
                  <div className="absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 bg-indigo-600 rounded-full blur-3xl opacity-30"></div>
                ) : null}
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${card.iconClassName} ${isDarkCard ? 'backdrop-blur-sm' : ''}`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className={`text-lg font-black mb-2 ${isDarkCard ? '' : 'text-slate-900'}`}>
                  {card.title}
                </h3>
                <p
                  className={`text-sm font-medium mb-4 leading-relaxed ${isDarkCard ? 'text-primary-foreground/80' : 'text-slate-500'}`}
                >
                  {card.description}
                </p>
                <ul className="space-y-2">
                  {card.bullets.map(item => (
                    <li
                      key={item}
                      className={`flex items-start gap-3 text-sm font-medium ${isDarkCard ? 'text-primary-foreground/85' : 'text-slate-500'}`}
                    >
                      <Check
                        className={`w-4 h-4 mt-0.5 shrink-0 ${isDarkCard ? 'text-indigo-300' : 'text-green-500'}`}
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* 2. Benefit Comparison Table */}
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
          <div className="p-5 border-b border-slate-200 bg-slate-50 text-center">
            <h3 className="text-lg font-black text-slate-900">{pageCopy.comparisonTitle}</h3>
            <p className="mt-2 text-xs font-medium text-slate-500">{pageCopy.comparisonSubtitle}</p>
          </div>

          <table className="w-full text-sm text-left">
            <thead className="text-xs bg-white text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-bold w-1/3">{t('pricingDetails.table.feature')}</th>
                <th className="py-3 px-2 font-bold text-center text-slate-500 w-1/4">
                  {t('free')}
                </th>
                <th className="py-3 px-2 font-bold text-center text-indigo-600 bg-indigo-50/50 w-1/4">
                  Pro / Lifetime
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold">
              {pageCopy.comparisonRows.map(row => (
                <tr key={row.label}>
                  <td className="py-3 px-4 text-slate-500">{row.label}</td>
                  <td className="py-3 px-2 text-center text-slate-500">{row.free}</td>
                  <td className="py-3 px-2 text-center text-indigo-700 bg-indigo-50/30">
                    {row.paid}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* 3. Sticky Pricing */}
      <div className="fixed bottom-0 w-full bg-white border-t border-slate-200 p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] z-50 rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
        <div className="flex bg-slate-50 p-1 rounded-xl mb-4">
          <Button
            variant="ghost"
            size="auto"
            onClick={() => setBillingInterval('MONTHLY')}
            className={`flex-1 py-3 rounded-lg text-xs font-bold transition-colors ${billingInterval === 'MONTHLY' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
          >
            {t('pricingDetails.billing.monthly', { defaultValue: 'Monthly' })} {monthlyPrice}
          </Button>
          <Button
            variant="ghost"
            size="auto"
            onClick={() => setBillingInterval('ANNUAL')}
            className={`flex-1 py-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 ${billingInterval === 'ANNUAL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
          >
            {t('pricingDetails.billing.annual', { defaultValue: 'Annual' })} {annualPrice}{' '}
            <span className="text-[9px] bg-green-100 text-green-700 px-1 rounded">
              {annualDiscountText}
            </span>
          </Button>
        </div>

        <Button
          variant="ghost"
          size="auto"
          onClick={handleSubscribe}
          loading={authLoading || loading}
          loadingText={t('loading', { defaultValue: 'Loading...' })}
          disabled={authLoading || loading}
          className="w-full bg-slate-900 text-white py-4 rounded-xl font-black shadow-lg shadow-slate-200 active:scale-95 transition-transform disabled:opacity-70"
        >
          {t('pricingDetails.plans.pro.cta', { defaultValue: 'Upgrade to Pro' })}
        </Button>
        <p className="text-[10px] text-center text-slate-500 mt-2 font-medium">
          {t('pricingDetails.hero.subtitleLine2', {
            defaultValue: 'No hidden fees. Cancel anytime.',
          })}
        </p>
      </div>
    </div>
  );
};
