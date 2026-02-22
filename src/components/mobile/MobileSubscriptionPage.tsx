import React, { useEffect, useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useAction } from 'convex/react';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { aRef, NoArgs } from '../../utils/convexRefs';
import { logger } from '../../utils/logger';
import { notify } from '../../utils/notify';
import { getLanguageLabel } from '../../utils/languageUtils';
import { ArrowLeft, Check, BookOpen, Trophy, Sparkles } from 'lucide-react';
import { Button } from '../ui';

// Re-using types from SubscriptionPage implies we might need to import them or redefine.
// Since we are rewriting the logic here, I will redefine the Convex action signature inline for safety.

export const MobileSubscriptionPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useLocalizedNavigate();
  const { user } = useAuth();
  const [billingInterval, setBillingInterval] = useState<'MONTHLY' | 'ANNUAL'>('ANNUAL');
  const [loading, setLoading] = useState(false);
  const [prices, setPrices] = useState<{
    GLOBAL: Record<string, { amount: string; currency: string; formatted: string }>;
    REGIONAL: Record<string, { amount: string; currency: string; formatted: string }>;
  } | null>(null);

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
  const getVariantPrices = useAction(
    aRef<
      NoArgs,
      {
        GLOBAL: Record<string, { amount: string; currency: string; formatted: string }>;
        REGIONAL: Record<string, { amount: string; currency: string; formatted: string }>;
      }
    >('lemonsqueezy:getVariantPrices')
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
  const feature1DescText = useMemo(
    () => t('coursesOverview.feature1Desc').replace(/<[^>]+>/g, ''),
    [t]
  );
  const feature3DescText = useMemo(
    () => t('coursesOverview.feature3Desc').replace(/<[^>]+>/g, ''),
    [t]
  );

  useEffect(() => {
    getVariantPrices({})
      .then(setPrices)
      .catch(err => {
        logger.warn('Failed to load variant prices for mobile subscription', err);
      });
  }, [getVariantPrices]);

  const handleSubscribe = async () => {
    if (!user) {
      navigate('/auth?redirect=%2Fsubscription');
      return;
    }

    setLoading(true);
    try {
      const { checkoutUrl } = await createCheckoutSession({
        plan: billingInterval,
        userId: user.id?.toString() || '',
        userEmail: user.email || '',
        region: showLocalizedPromo ? 'REGIONAL' : 'GLOBAL',
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
    <div className="min-h-screen bg-muted flex flex-col pb-40">
      {/* Header */}
      <header className="px-6 pt-6 pb-8 bg-card border-b border-border">
        <div className="flex justify-between items-center mb-6">
          <Button
            variant="ghost"
            size="auto"
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 text-muted-foreground hover:bg-muted rounded-lg"
          >
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-muted-foreground">
              {t('nav.videos', { defaultValue: 'Videos' })}
            </span>
            <span className="w-px h-3 bg-muted"></span>
            <span className="text-xs font-bold text-foreground">{languageLabel}</span>
          </div>
        </div>

        <div className="text-center">
          <span className="inline-block py-1 px-3 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs mb-4">
            {t('dashboard.premiumBadge', { defaultValue: 'Premium' })}
          </span>
          <h1 className="text-3xl font-black text-foreground leading-tight mb-2">
            <Trans i18nKey="coursesOverview.unlockTitle">
              Unlock <span className="text-indigo-600">DuHan Premium</span>
            </Trans>
          </h1>
          <p className="text-muted-foreground font-medium text-sm leading-relaxed max-w-xs mx-auto">
            {t('coursesOverview.achieveGoal')}
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-8 space-y-8">
        {/* 1. Feature Cards */}
        <div className="space-y-4">
          {/* Textbooks */}
          <div className="bg-card p-6 rounded-3xl border border-border shadow-lg shadow-indigo-100/50">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-foreground mb-2">
              {t('coursesOverview.feature1Title')}
            </h3>
            <p className="text-sm text-muted-foreground font-medium mb-4 leading-relaxed">
              {feature1DescText}
            </p>
            <ul className="space-y-2">
              {[
                t('coursesOverview.feature1List1'),
                t('coursesOverview.feature1List2'),
                t('coursesOverview.feature1List3'),
              ].map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm font-medium text-muted-foreground"
                >
                  <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* TOPIK */}
          <div className="bg-primary text-white p-6 rounded-3xl shadow-xl border border-border relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 bg-indigo-600 rounded-full blur-3xl opacity-30"></div>
            <div className="w-12 h-12 bg-card/10 text-indigo-300 rounded-xl flex items-center justify-center mb-4 backdrop-blur-sm">
              <Trophy className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black mb-2">{t('coursesOverview.feature2Title')}</h3>
            <p className="text-muted-foreground text-sm font-medium mb-4 leading-relaxed">
              {t('coursesOverview.feature2Desc')}
            </p>
            <ul className="space-y-2">
              {[
                t('coursesOverview.feature2List1'),
                t('coursesOverview.feature2List2'),
                t('coursesOverview.feature2List3'),
              ].map((item, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm font-medium text-muted-foreground"
                >
                  <Check className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* AI Grammar */}
          <div className="bg-card p-6 rounded-3xl border border-border shadow-lg shadow-indigo-100/50">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-foreground mb-2">
              {t('coursesOverview.feature3Title')}
            </h3>
            <p className="text-sm text-muted-foreground font-medium mb-4 leading-relaxed">
              {feature3DescText}
            </p>
            <div className="bg-muted p-3 rounded-xl border border-border">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  {t('coursesOverview.booksDigitized')}
                </span>
                <span className="text-sm font-black text-foreground">100+</span>
              </div>
              <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                <div className="bg-purple-500 w-3/4 h-full"></div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Benefit Comparison Table */}
        <div className="bg-card rounded-3xl border border-border overflow-hidden">
          <div className="p-5 border-b border-border bg-muted text-center">
            <h3 className="text-lg font-black text-foreground">
              {t('coursesOverview.benefitComparison')}
            </h3>
          </div>

          <table className="w-full text-sm text-left">
            <thead className="text-xs bg-card text-muted-foreground border-b border-border">
              <tr>
                <th className="py-3 px-4 font-bold w-1/3">
                  {t('coursesOverview.featurePrivilege')}
                </th>
                <th className="py-3 px-2 font-bold text-center text-muted-foreground w-1/4">
                  {t('free')}
                </th>
                <th className="py-3 px-2 font-bold text-center text-indigo-600 bg-indigo-50/50 w-1/4">
                  {t('pricingDetails.plans.pro.title', { defaultValue: 'Pro' })}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold">
              {[
                {
                  l: t('coursesOverview.textbookAccess'),
                  f: t('coursesOverview.limited3Lessons'),
                  p: t('coursesOverview.fullAccess1to6'),
                },
                {
                  l: t('coursesOverview.topikAccess'),
                  f: t('coursesOverview.limitedRecent'),
                  p: t('coursesOverview.allPastExams'),
                },
                {
                  l: t('coursesOverview.grammarAccess'),
                  f: t('coursesOverview.limited'),
                  p: t('coursesOverview.unlimited'),
                },
                {
                  l: t('coursesOverview.adFree'),
                  f: t('common.on', { defaultValue: 'On' }),
                  p: t('common.off', { defaultValue: 'Off' }),
                },
              ].map((row, i) => (
                <tr key={i}>
                  <td className="py-3 px-4 text-muted-foreground">{row.l}</td>
                  <td className="py-3 px-2 text-center text-muted-foreground">{row.f}</td>
                  <td
                    className={`py-3 px-2 text-center ${row.isCheck ? 'text-green-600' : 'text-indigo-700'} bg-indigo-50/30`}
                  >
                    {row.isCheck ? <Check className="w-4 h-4 mx-auto" /> : row.p}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* 3. Sticky Pricing */}
      <div className="fixed bottom-0 w-full bg-card border-t border-border p-4 pb-8 z-50 rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
        <div className="flex bg-muted p-1 rounded-xl mb-4">
          <Button
            variant="ghost"
            size="auto"
            onClick={() => setBillingInterval('MONTHLY')}
            className={`flex-1 py-3 rounded-lg text-xs font-bold transition-colors ${billingInterval === 'MONTHLY' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {t('pricingDetails.billing.monthly', { defaultValue: 'Monthly' })} {monthlyPrice}
          </Button>
          <Button
            variant="ghost"
            size="auto"
            onClick={() => setBillingInterval('ANNUAL')}
            className={`flex-1 py-3 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 ${billingInterval === 'ANNUAL' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
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
          loading={loading}
          loadingText={t('loading', { defaultValue: 'Loading...' })}
          className="w-full bg-primary text-white py-4 rounded-xl font-black shadow-lg shadow-slate-200 active:scale-95 transition-transform disabled:opacity-70"
        >
          {t('pricingDetails.plans.pro.cta', { defaultValue: 'Upgrade to Pro' })}
        </Button>
        <p className="text-[10px] text-center text-muted-foreground mt-2 font-medium">
          {t('pricingDetails.hero.subtitleLine2', { defaultValue: 'No hidden fees. Cancel anytime.' })}
        </p>
      </div>
    </div>
  );
};
