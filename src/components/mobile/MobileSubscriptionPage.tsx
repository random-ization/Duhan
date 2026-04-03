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
          appOrigin: globalThis.location.origin,
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
      className="relative min-h-[100dvh] bg-background flex flex-col pb-40 overflow-hidden"
      style={{
        backgroundImage:
          'radial-gradient(hsl(var(--border) / 0.62) 1px, transparent 1px), radial-gradient(hsl(var(--primary) / 0.08) 1px, transparent 1px)',
        backgroundSize: '20px 20px, 40px 40px',
        backgroundPosition: '0 0, 10px 10px',
      }}
    >
      <div className="pointer-events-none absolute -top-16 left-[-5rem] h-56 w-56 rounded-full bg-indigo-400/14 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 right-[-4rem] h-56 w-56 rounded-full bg-purple-400/12 blur-3xl" />
      {/* Header */}
      <header className="relative z-10 px-6 pt-6 pb-8 bg-card border-b">
        <div className="flex justify-between items-center mb-6">
          <Button
            variant="ghost"
            size="auto"
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-muted-foreground hover:bg-secondary rounded-lg"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">{pageCopy.pageLabel}</span>
            <span className="w-px h-3 bg-border"></span>
            <span className="text-xs font-bold text-foreground">{languageLabel}</span>
          </div>
        </div>

        <div className="text-center">
          <span className="inline-block py-1 px-3 rounded-full bg-primary/10 text-primary font-bold text-xs mb-4">
            {pageCopy.heroBadge}
          </span>
          <h1 className="text-3xl font-black text-foreground leading-tight mb-2 tracking-tight">
            {pageCopy.heroTitle}
          </h1>
          <p className="text-muted-foreground font-medium text-sm leading-relaxed max-w-xs mx-auto">
            {pageCopy.heroSubtitle}
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="relative z-10 flex-1 px-4 py-8 space-y-10">
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
                    ? 'bg-primary text-primary-foreground p-6 rounded-3xl shadow-xl border border-border/50 relative overflow-hidden'
                    : 'bg-card p-6 rounded-3xl border shadow-lg shadow-primary/5'
                }
              >
                {isDarkCard ? (
                  <div className="absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 bg-primary/40 rounded-full blur-3xl"></div>
                ) : null}
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${card.iconClassName} ${isDarkCard ? 'backdrop-blur-sm' : ''}`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <h3
                  className={`text-lg font-black mb-2 ${isDarkCard ? 'text-primary-foreground' : 'text-foreground'}`}
                >
                  {card.title}
                </h3>
                <p
                  className={`text-sm font-medium mb-4 leading-relaxed ${isDarkCard ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}
                >
                  {card.description}
                </p>
                <ul className="space-y-2">
                  {card.bullets.map((item: string) => (
                    <li
                      key={item}
                      className={`flex items-start gap-3 text-sm font-medium ${isDarkCard ? 'text-primary-foreground/85' : 'text-muted-foreground'}`}
                    >
                      <Check
                        className={`w-4 h-4 mt-0.5 shrink-0 ${isDarkCard ? 'text-primary' : 'text-green-500'}`}
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* 2. Benefit Comparison Vertical Cards */}
        <div>
          <div className="text-center mb-6">
            <h3 className="text-2xl font-black text-foreground">{pageCopy.comparisonTitle}</h3>
            <p className="mt-2 text-sm font-medium text-muted-foreground">
              {pageCopy.comparisonSubtitle}
            </p>
          </div>

          <div className="grid gap-3">
            {pageCopy.comparisonRows.map((row: any) => (
              <div key={row.label} className="bg-card rounded-2xl border p-5 shadow-sm">
                <div className="font-bold text-base mb-3 text-foreground">{row.label}</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-secondary/50 rounded-xl p-3 border border-border/50">
                    <div className="text-[10px] font-black text-muted-foreground mb-1 uppercase tracking-wider">
                      {t('free')}
                    </div>
                    <div className="font-medium text-muted-foreground">{row.free}</div>
                  </div>
                  <div className="bg-primary/5 rounded-xl p-3 border border-primary/10">
                    <div className="text-[10px] font-black text-primary mb-1 uppercase tracking-wider">
                      Pro / Lifetime
                    </div>
                    <div className="font-bold text-foreground">{row.paid}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* 3. Sticky Pricing */}
      <div className="fixed bottom-0 w-full bg-card border-t p-4 pb-safe z-50 rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
        <div className="flex bg-secondary p-1 rounded-2xl mb-4">
          <Button
            variant="ghost"
            size="auto"
            onClick={() => setBillingInterval('MONTHLY')}
            className={`flex-1 min-h-[48px] rounded-[14px] text-xs font-bold transition-colors ${billingInterval === 'MONTHLY' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
          >
            {t('pricingDetails.billing.monthly', { defaultValue: 'Monthly' })} {monthlyPrice}
          </Button>
          <Button
            variant="ghost"
            size="auto"
            onClick={() => setBillingInterval('ANNUAL')}
            className={`flex-1 min-h-[48px] rounded-[14px] text-xs font-bold transition-colors flex items-center justify-center gap-1.5 ${billingInterval === 'ANNUAL' ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}
          >
            {t('pricingDetails.billing.annual', { defaultValue: 'Annual' })} {annualPrice}{' '}
            <span className="text-[9px] bg-green-500/10 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded">
              {annualDiscountText}
            </span>
          </Button>
        </div>

        <Button
          variant="default"
          size="auto"
          onClick={handleSubscribe}
          loading={authLoading || loading}
          loadingText={t('loading', { defaultValue: 'Loading...' })}
          disabled={authLoading || loading}
          className="w-full h-[54px] rounded-[16px] text-[15px] font-black active:scale-[0.98] transition-all disabled:opacity-70"
        >
          {t('pricingDetails.plans.pro.cta', { defaultValue: 'Upgrade to Pro' })}
        </Button>
        <p className="text-[11px] text-center text-muted-foreground mt-3 font-medium">
          {t('pricingDetails.hero.subtitleLine2', {
            defaultValue: 'No hidden fees. Cancel anytime.',
          })}
        </p>
      </div>
    </div>
  );
};
