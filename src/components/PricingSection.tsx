import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SubscriptionType } from '../types';
import { useTranslation } from 'react-i18next';
import { Button } from './ui';
import { notify } from '../utils/notify';
import { type CheckoutPlan } from '../utils/subscriptionPlan';
import { useUpgradeFlow } from '../hooks/useUpgradeFlow';

function resolvePlanHighlights(language: string) {
  const isZh = language === 'zh' || language.startsWith('zh-');
  if (isZh) {
    return {
      monthly: [
        '\u5168\u90e8\u6559\u6750\u8bfe\u7a0b',
        '\u5168\u90e8 TOPIK / \u5199\u4f5c\u771f\u9898',
        '\u5a92\u4f53\u65e0\u9650\u64ad\u653e + AI Credit \u63d0\u5347',
      ],
      annual: [
        '\u5305\u542b\u6708\u4ed8\u5168\u90e8\u6743\u76ca',
        '\u66f4\u4f4e\u957f\u671f\u6210\u672c，\u9002\u5408\u6301\u7eed\u5907\u8003',
        '\u5386\u53f2\u5206\u6790、PDF \u5bfc\u51fa、\u5168\u7ad9 AI \u6df1\u5ea6\u4f7f\u7528',
      ],
      lifetime: [
        '\u6743\u76ca\u4e0e Pro \u76f8\u540c',
        '\u672a\u6765\u65b0\u589e Pro \u529f\u80fd\u7ee7\u7eed\u5305\u542b',
        '\u4e00\u6b21\u4e70\u65ad，\u4e0d\u518d\u7eed\u8d39',
      ],
    };
  }

  return {
    monthly: [
      'Full course access',
      'Full TOPIK and writing archive',
      'Unlimited media + higher AI credits',
    ],
    annual: [
      'Everything in monthly',
      'Lower long-term cost for active learners',
      'History analytics, PDF export, and deeper AI usage',
    ],
    lifetime: [
      'Same entitlements as Pro',
      'Future Pro features stay included',
      'One-time payment, no renewal',
    ],
  };
}

interface PricingSectionProps {
  onSubscribe?: (planId: CheckoutPlan) => void;
  source?: string;
}

const PricingSection: React.FC<PricingSectionProps> = ({
  onSubscribe,
  source = 'desktop_subscription',
}) => {
  const { user, viewerAccess } = useAuth();
  const { t, i18n } = useTranslation();
  const { startUpgradeFlow, authLoading } = useUpgradeFlow();

  const PRICING_MAP: Record<
    string,
    { symbol: string; monthly: string; annual: string; lifetime: string; currency: string }
  > = {
    en: {
      symbol: '$',
      monthly: '4.99',
      annual: '19.99',
      lifetime: '39.99',
      currency: 'USD',
    },
    zh: {
      symbol: '¥',
      monthly: '19',
      annual: '69',
      lifetime: '128',
      currency: 'CNY',
    },
    vi: {
      symbol: '₫',
      monthly: '69.000',
      annual: '249.000',
      lifetime: '499.000',
      currency: 'VND',
    },
    mn: {
      symbol: '₮',
      monthly: '9,900',
      annual: '35,000',
      lifetime: '69,000',
      currency: 'MNT',
    },
  };

  const language = i18n.language;
  const priceConfig = PRICING_MAP[language] || PRICING_MAP['en'];
  const planHighlights = resolvePlanHighlights(language);

  const handleSubscribe = (planId: CheckoutPlan) => {
    if (authLoading) {
      return;
    }

    if (!user) {
      startUpgradeFlow({
        plan: planId,
        source,
        returnTo: '/dashboard',
      });
      return;
    }

    if (onSubscribe) {
      onSubscribe(planId);
    } else {
      // Fallback default behavior
      notify.info(t('pricing.paymentUpgrading'));
    }
  };

  const getOriginalPrice = (lang: string) => {
    if (lang === 'zh') return '¥228';
    if (lang === 'en') return '$69.99';
    if (lang === 'vi') return '₫699.000';
    if (lang === 'mn') return '₮99,000';
    return undefined;
  };

  const currentPlan = viewerAccess?.isPremium
    ? (user?.subscriptionType ?? SubscriptionType.ANNUAL)
    : SubscriptionType.FREE;

  const plans = [
    {
      id: 'MONTHLY',
      title: t('plan.monthly', 'Monthly'),
      price: `${priceConfig.symbol}${priceConfig.monthly}`,
      period: t('period.per_month', '/ month'),
      features: [...planHighlights.monthly],
      highlight: false,
      type: SubscriptionType.MONTHLY,
    },
    {
      id: 'ANNUAL',
      title: t('plan.annual', 'Annual'),
      price: `${priceConfig.symbol}${priceConfig.annual}`,
      period: t('period.per_year', '/ year'),
      originalPrice: getOriginalPrice(language),
      discount: t('pricing.discount', '70% OFF'),
      features: [...planHighlights.annual],
      highlight: true,
      type: SubscriptionType.ANNUAL,
    },
    {
      id: 'LIFETIME',
      title: t('plan.lifetime', 'Lifetime'),
      price: `${priceConfig.symbol}${priceConfig.lifetime}`,
      period: t('period.once', 'one-time'),
      features: [...planHighlights.lifetime],
      highlight: false,
      type: SubscriptionType.LIFETIME,
    },
  ];

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-foreground dark:text-white sm:text-4xl">
            {t('pricing.title', 'Invest in your Korean Fluency')}
          </h2>
          <p className="mt-4 text-xl text-muted-foreground dark:text-muted-foreground">
            {t('pricing.subtitle', 'Choose the plan that fits your pace.')}
          </p>
        </div>

        <div className="mt-12 space-y-4 sm:mt-16 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 lg:max-w-4xl lg:mx-auto xl:max-w-none xl:mx-0 xl:grid-cols-3">
          {plans.map(plan => (
            <div
              key={plan.id}
              className={`relative rounded-2xl shadow-xl flex flex-col justify-between overflow-hidden transition-transform hover:scale-105 ${
                plan.highlight
                  ? 'border-2 border-indigo-500 dark:border-indigo-300/70 z-10 scale-105'
                  : 'border border-border dark:border-border'
              } bg-card dark:bg-muted`}
            >
              {plan.highlight && (
                <div className="absolute top-0 right-0 left-0 bg-indigo-500 dark:bg-indigo-400 text-white dark:text-primary-foreground text-xs font-bold text-center py-1 uppercase tracking-wider">
                  {t('pricing.recommended')}
                </div>
              )}

              <div className="p-6 md:p-8">
                <h3 className="text-lg font-medium text-foreground dark:text-white">
                  {plan.title}
                </h3>

                <div className="mt-4 flex items-baseline justify-center">
                  <span className="text-5xl font-extrabold text-foreground dark:text-white tracking-tight">
                    {plan.price}
                  </span>
                  <span className="ml-1 text-xl font-medium text-muted-foreground dark:text-muted-foreground">
                    {plan.period}
                  </span>
                </div>

                {plan.originalPrice && (
                  <div className="mt-1 text-center">
                    <span className="text-muted-foreground line-through mr-2">
                      {plan.originalPrice}
                    </span>
                    <span className="text-green-500 dark:text-emerald-300 font-semibold">
                      {plan.discount}
                    </span>
                  </div>
                )}

                <ul className="mt-6 space-y-4">
                  {plan.features.map(feature => (
                    <li key={`${plan.id}-${feature}`} className="flex">
                      <svg
                        className="flex-shrink-0 w-6 h-6 text-green-500 dark:text-emerald-300"
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
                      <span className="ml-3 text-base text-muted-foreground dark:text-muted-foreground">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-6 md:p-8 bg-muted dark:bg-muted/30">
                {currentPlan === plan.type ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="auto"
                    disabled
                    className="w-full py-3 px-4 border border-transparent rounded-xl text-center font-medium bg-green-100 text-green-700 dark:bg-emerald-400/15 dark:text-emerald-200 cursor-default"
                  >
                    {t('pricing.currentPlan')}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="auto"
                    onClick={() => handleSubscribe(plan.id as CheckoutPlan)}
                    disabled={authLoading}
                    loading={authLoading}
                    loadingText={t('common.loading', { defaultValue: 'Loading...' })}
                    className={`w-full py-3 px-4 rounded-xl shadow-md text-center font-semibold transition-all ${
                      plan.highlight
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 dark:from-indigo-400 dark:to-violet-400 dark:hover:from-indigo-300 dark:hover:to-violet-300 text-white dark:text-primary-foreground shadow-indigo-500/30 dark:shadow-indigo-400/25'
                        : 'bg-card dark:bg-muted text-indigo-600 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-300/30 hover:bg-indigo-50 dark:hover:bg-indigo-400/12'
                    }`}
                  >
                    {t('button.upgrade', 'Upgrade Now')}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PricingSection;
