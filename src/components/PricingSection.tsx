import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SubscriptionType, type User } from '../types';
import { useTranslation } from 'react-i18next';
import { Button } from './ui';
import { notify } from '../utils/notify';
import { type CheckoutPlan } from '../utils/subscriptionPlan';
import { useUpgradeFlow } from '../hooks/useUpgradeFlow';
import type { ViewerAccessSnapshot } from '../utils/entitlements';
import { Check, Star } from 'lucide-react';

function resolvePlanHighlights(language: string) {
  const isZh = language === 'zh' || language.startsWith('zh-');
  if (isZh) {
    return {
      monthly: [
        '每天 AI 深度解析无限次，阅读中遇到的每个句子都能弄懂',
        '用完整 TOPIK 真题库练习写作，获得实时 AI 评分和纠错',
        '间隔重复复习系统不限量 — 掌握的词汇量以可见速度增长',
      ],
      annual: [
        '包含月付全部学习成果',
        '个性化弱点分析 + 每周学习周报，用数据驱动进步',
        '全年深度备考，平均下来每月不到一杯咖啡的钱',
      ],
      lifetime: [
        '一次投入，韩语能力终身可查、可练、可提升',
        '未来新增 AI 功能（口语教练、内容推荐）自动解锁',
        '适合认真计划长期进阶到高级水平的学习者',
      ],
    };
  }

  return {
    monthly: [
      'Unlimited AI sentence analysis — understand every sentence you read',
      'Full TOPIK writing practice with real-time AI scoring & correction',
      'Spaced repetition with no limits — watch your vocab grow',
    ],
    annual: [
      'Everything in monthly, plus personalized weak-point analysis',
      'Weekly learning reports with data-driven progress tracking',
      'Best value: less than a coffee per month for a year of growth',
    ],
    lifetime: [
      'One investment, lifetime access to all current and future AI features',
      'Upcoming: speaking coach, content recommendations, ability profiling',
      'For learners committed to reaching advanced proficiency',
    ],
  };
}

interface PricingSectionProps {
  onSubscribe?: (planId: CheckoutPlan) => void;
  source?: string;
  authenticatedUser?: User | null;
  viewerAccessOverride?: ViewerAccessSnapshot | null;
}

const PricingSection: React.FC<PricingSectionProps> = ({
  onSubscribe,
  source = 'desktop_subscription',
  authenticatedUser,
  viewerAccessOverride,
}) => {
  const { user, viewerAccess } = useAuth();
  const { t, i18n } = useTranslation();
  const { startUpgradeFlow, authLoading } = useUpgradeFlow();

  const PRICING_MAP: Record<
    string,
    { symbol: string; monthly: string; annual: string; lifetime: string; currency: string }
  > = {
    en: { symbol: '$', monthly: '4.99', annual: '19.99', lifetime: '39.99', currency: 'USD' },
    zh: { symbol: '¥', monthly: '19', annual: '69', lifetime: '128', currency: 'CNY' },
    vi: { symbol: '₫', monthly: '69.000', annual: '249.000', lifetime: '499.000', currency: 'VND' },
    mn: { symbol: '₮', monthly: '9,900', annual: '35,000', lifetime: '69,000', currency: 'MNT' },
  };

  const language = i18n.language;
  const priceConfig = PRICING_MAP[language] || PRICING_MAP['en'];
  const planHighlights = resolvePlanHighlights(language);
  const effectiveUser = authenticatedUser ?? user;
  const effectiveViewerAccess = viewerAccessOverride ?? viewerAccess;

  const handleSubscribe = (planId: CheckoutPlan) => {
    if (authLoading) return;
    if (!effectiveUser) {
      startUpgradeFlow({ plan: planId, source, returnTo: '/dashboard' });
      return;
    }
    if (onSubscribe) {
      onSubscribe(planId);
    } else {
      notify.info(t('pricing.paymentUpgrading'));
    }
  };

  const getOriginalPrice = (lang: string) => {
    if (lang === 'zh') return '¥228';
    if (lang === 'en') return '$69.99';
    return undefined;
  };

  const currentPlan = effectiveViewerAccess?.isPremium
    ? (effectiveUser?.subscriptionType ?? SubscriptionType.ANNUAL)
    : SubscriptionType.FREE;

  const plans = [
    {
      id: 'MONTHLY',
      title: t('plan.monthly'),
      price: priceConfig.monthly,
      symbol: priceConfig.symbol,
      period: t('period.per_month'),
      features: planHighlights.monthly,
      highlight: false,
      type: SubscriptionType.MONTHLY,
    },
    {
      id: 'ANNUAL',
      title: t('plan.annual'),
      price: priceConfig.annual,
      symbol: priceConfig.symbol,
      period: t('period.per_year'),
      originalPrice: getOriginalPrice(language),
      discount: t('pricing.discount', '70% OFF'),
      features: planHighlights.annual,
      highlight: true,
      type: SubscriptionType.ANNUAL,
    },
    {
      id: 'LIFETIME',
      title: t('plan.lifetime'),
      price: priceConfig.lifetime,
      symbol: priceConfig.symbol,
      period: t('period.once'),
      features: planHighlights.lifetime,
      highlight: false,
      type: SubscriptionType.LIFETIME,
    },
  ];

  return (
    <div className="py-24 px-6 bg-k-bg">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-k-serif text-[40px] md:text-[56px] font-black text-k-ink leading-tight mb-6">
            {t('pricing.title', 'Invest in your Korean Fluency')}
          </h2>
          <p className="text-xl text-k-sub font-medium opacity-80 max-w-2xl mx-auto">
            {t('pricing.subtitle', 'Choose the plan that fits your pace.')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map(plan => (
            <div
              key={plan.id}
              className={`flex flex-col p-8 rounded-[40px] border-2 transition-all duration-300 ${
                plan.highlight
                  ? 'border-k-ink bg-k-ink text-white shadow-pop-large scale-105 z-10'
                  : 'border-k-ink/10 bg-white text-k-ink shadow-sm hover:border-k-ink/30'
              }`}
            >
              <div className="mb-8">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-xl font-black">{plan.title}</h3>
                  {plan.highlight && (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-k-crimson text-white rounded-lg text-[10px] font-black uppercase tracking-widest">
                      <Star size={10} className="fill-white" />
                      {t('pricing.recommended')}
                    </div>
                  )}
                </div>

                <div className="flex items-baseline gap-1">
                  <span
                    className={`font-k-serif text-[24px] font-medium ${plan.highlight ? 'text-white/40' : 'text-k-ink/30'}`}
                  >
                    {plan.symbol}
                  </span>
                  <span className="font-k-serif text-[56px] font-black leading-none">
                    {plan.price}
                  </span>
                  <span
                    className={`text-[14px] font-bold ${plan.highlight ? 'text-white/40' : 'text-k-ink/30'}`}
                  >
                    {plan.period}
                  </span>
                </div>

                {plan.originalPrice && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[14px] line-through opacity-40">
                      {plan.originalPrice}
                    </span>
                    <span className="text-[12px] font-black text-k-crimson bg-k-crimson/10 px-2 py-0.5 rounded uppercase">
                      {plan.discount}
                    </span>
                  </div>
                )}
              </div>

              <ul className="space-y-4 mb-10 flex-1">
                {plan.features.map(feature => (
                  <li key={feature} className="flex items-start gap-3">
                    <div
                      className={`mt-1 flex h-4 w-4 items-center justify-center rounded-full shrink-0 ${
                        plan.highlight ? 'bg-white/10 text-k-crimson' : 'bg-k-ink/5 text-k-crimson'
                      }`}
                    >
                      <Check size={10} strokeWidth={4} />
                    </div>
                    <span className="text-[14px] font-medium leading-tight opacity-90">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <div>
                {currentPlan === plan.type ? (
                  <div
                    className={`w-full py-4 text-center text-[14px] font-black rounded-2xl ${
                      plan.highlight ? 'bg-white/10 text-white' : 'bg-k-ink/5 text-k-ink opacity-50'
                    }`}
                  >
                    {t('pricing.currentPlan')}
                  </div>
                ) : (
                  <Button
                    onClick={() => handleSubscribe(plan.id as CheckoutPlan)}
                    loading={authLoading}
                    className={`w-full h-[60px] rounded-2xl text-[16px] font-black shadow-pop-small active:scale-[0.98] transition-all ${
                      plan.highlight
                        ? 'bg-k-crimson text-white hover:bg-red-500'
                        : 'bg-k-ink text-white hover:bg-black'
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
