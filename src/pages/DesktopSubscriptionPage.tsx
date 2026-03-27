import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAction } from 'convex/react';
import { SEO as Seo } from '../seo/SEO';
import { getRouteMeta } from '../seo/publicRoutes';
import BackButton from '../components/ui/BackButton';
import PricingSection from '../components/PricingSection';
import { aRef } from '../utils/convexRefs';
import { LanguageSwitcher } from '../components/common/LanguageSwitcher';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { notify } from '../utils/notify';
import { logger } from '../utils/logger';
import { type CheckoutPlan } from '../utils/subscriptionPlan';
import { trackEvent } from '../utils/analytics';
import { runConvexActionWithRetry } from '../utils/convexActionRetry';
import { getSubscriptionPageCopy } from '../utils/subscriptionPageCopy';

const DesktopSubscriptionPage: React.FC = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useLocalizedNavigate();
  const location = useLocation();

  const meta = getRouteMeta(location.pathname);
  const createCheckoutSession = useAction(
    aRef<
      {
        plan: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'LIFETIME';
        userId?: string;
        userEmail?: string;
        userName?: string;
        region?: string;
        locale?: string;
      },
      { checkoutUrl: string }
    >('lemonsqueezy:createCheckout')
  );

  const showLocalizedPromo =
    i18n.language === 'zh' ||
    i18n.language === 'vi' ||
    i18n.language === 'mn' ||
    i18n.language.startsWith('zh-');

  const [checkoutPendingPlan, setCheckoutPendingPlan] = React.useState<CheckoutPlan | null>(null);
  const pageCopy = React.useMemo(() => getSubscriptionPageCopy(i18n.language), [i18n.language]);
  const featureCards = React.useMemo(
    () => [pageCopy.featureCards[0], pageCopy.featureCards[1], pageCopy.featureCards[2]],
    [pageCopy.featureCards]
  );

  const isCheckoutUrlSafe = (value: string) => {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' || url.protocol === 'http:';
    } catch {
      return false;
    }
  };

  return (
    <div
      className="relative min-h-screen bg-slate-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8 overflow-hidden"
      style={{
        backgroundImage:
          'radial-gradient(hsl(var(--border) / 0.65) 1px, transparent 1px), radial-gradient(hsl(var(--brand-indigo) / 0.08) 1px, transparent 1px)',
        backgroundSize: '24px 24px, 48px 48px',
        backgroundPosition: '0 0, 12px 12px',
      }}
    >
      <div className="pointer-events-none absolute -top-20 left-[-6rem] h-72 w-72 rounded-full bg-indigo-400/15 blur-3xl dark:bg-indigo-300/10" />
      <div className="pointer-events-none absolute -bottom-24 right-[-5rem] h-72 w-72 rounded-full bg-purple-400/12 blur-3xl dark:bg-purple-300/10" />
      <Seo
        title={meta.title}
        description={meta.description}
        keywords={meta.keywords}
        noIndex={meta.noIndex}
      />
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header: Back Button & Language Selector */}
        <div className="mb-8 flex justify-between items-center">
          <BackButton onClick={() => navigate(-1)} />

          <LanguageSwitcher />
        </div>

        <div className="text-center mb-16">
          <span className="inline-block py-1 px-3 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-200 font-bold text-sm mb-4">
            {pageCopy.heroBadge}
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-6">
            {pageCopy.heroTitle}
          </h2>
          <p className="text-xl text-slate-500 dark:text-slate-500 max-w-2xl mx-auto leading-relaxed">
            {pageCopy.heroSubtitle}
          </p>
        </div>

        {/* --- 1. Feature Breakdown Section --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
          {/* Feature 1: Textbooks */}
          <div className="bg-white dark:bg-slate-50 p-8 rounded-3xl border border-slate-200 dark:border-slate-200 shadow-lg shadow-indigo-100/50 dark:shadow-none hover:-translate-y-1 transition-transform">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 dark:bg-blue-400/12 dark:text-blue-200 rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
              {featureCards[0].title}
            </h3>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              {featureCards[0].description}
            </p>
            <ul className="space-y-3">
              {featureCards[0].bullets.map(item => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-sm font-medium text-slate-500 dark:text-slate-500"
                >
                  <svg
                    className="w-5 h-5 text-green-500 dark:text-emerald-300 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Feature 2: TOPIK */}
          <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-none hover:-translate-y-1 transition-transform relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-indigo-600 dark:bg-indigo-400 rounded-full blur-3xl opacity-30 dark:opacity-20"></div>
            <div className="w-14 h-14 bg-white/10 text-indigo-300 dark:text-indigo-200 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3">{featureCards[1].title}</h3>
            <p className="text-primary-foreground/80 text-sm mb-6 leading-relaxed">
              {featureCards[1].description}
            </p>
            <ul className="space-y-3">
              {featureCards[1].bullets.map(item => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-sm font-medium text-primary-foreground/85"
                >
                  <svg
                    className="w-5 h-5 text-indigo-300 dark:text-indigo-200 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Feature 3: Media / AI */}
          <div className="bg-white dark:bg-slate-50 p-8 rounded-3xl border border-slate-200 dark:border-slate-200 shadow-lg shadow-indigo-100/50 dark:shadow-none hover:-translate-y-1 transition-transform">
            <div className="w-14 h-14 bg-purple-50 text-purple-600 dark:bg-purple-400/12 dark:text-purple-200 rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
              {featureCards[2].title}
            </h3>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              {featureCards[2].description}
            </p>
            <ul className="space-y-3">
              {featureCards[2].bullets.map(item => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-sm font-medium text-slate-500 dark:text-slate-500"
                >
                  <svg
                    className="w-5 h-5 text-purple-500 dark:text-purple-300 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* --- 2. Benefit Comparison Table --- */}
        <div className="mb-24 overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-200">
          <div className="bg-slate-50 dark:bg-slate-50 p-6 border-b border-slate-200 dark:border-slate-200 text-center">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {pageCopy.comparisonTitle}
            </h3>
            <p className="text-slate-500 dark:text-slate-500 mt-2">{pageCopy.comparisonSubtitle}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full bg-white dark:bg-slate-900 text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-200">
                  <th className="p-4 text-left text-slate-500 font-medium w-1/3 pl-8">
                    {t('pricingDetails.table.feature')}
                  </th>
                  <th className="p-4 text-center text-slate-500 font-medium w-1/3">{t('free')}</th>
                  <th className="p-4 text-center text-indigo-600 dark:text-indigo-300 font-bold w-1/3 bg-indigo-50/30 dark:bg-indigo-900/10">
                    Pro / Lifetime
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pageCopy.comparisonRows.map(row => (
                  <tr
                    key={row.label}
                    className="hover:bg-slate-50 dark:hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="p-4 pl-8 font-bold text-slate-500 dark:text-slate-500">
                      {row.label}
                    </td>
                    <td className="p-4 text-center text-slate-500">{row.free}</td>
                    <td className="p-4 text-center font-bold text-slate-900 dark:text-white bg-indigo-50/30 dark:bg-indigo-900/10">
                      {row.paid}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* --- 3. Pricing Section --- */}
        <PricingSection
          onSubscribe={async plan => {
            const checkoutPlan = plan as CheckoutPlan;
            if (checkoutPendingPlan) return;
            trackEvent('checkout_start', {
              language: i18n.language,
              plan: checkoutPlan,
              source: 'desktop_subscription',
            });
            if (!user) {
              return;
            }
            try {
              setCheckoutPendingPlan(checkoutPlan);
              const { checkoutUrl } = await runConvexActionWithRetry(
                createCheckoutSession,
                {
                  plan: checkoutPlan,
                  userId: user.id?.toString() || '',
                  userEmail: user.email || '',
                  userName: user.name || '',
                  region: showLocalizedPromo ? 'REGIONAL' : 'GLOBAL',
                  locale: i18n.language,
                  source: 'desktop_subscription',
                  returnTo: '/dashboard',
                },
                { retries: 0 }
              );
              if (!isCheckoutUrlSafe(checkoutUrl)) {
                throw new Error('Invalid checkout URL returned by provider');
              }
              trackEvent('checkout_success', {
                language: i18n.language,
                plan: checkoutPlan,
                source: 'desktop_subscription',
              });
              globalThis.location.assign(checkoutUrl);
            } catch (error) {
              const err = error as Error;
              logger.error('Checkout failed:', err);
              const msg = err.message || 'Unknown error';
              notify.error(`Failed to start checkout session: ${msg}`);
            } finally {
              setCheckoutPendingPlan(null);
            }
          }}
          source="desktop_subscription"
        />
      </div>
    </div>
  );
};

export default DesktopSubscriptionPage;
