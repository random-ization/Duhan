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
import {
  isSafeCheckoutUrl,
  type LemonSqueezyCheckoutRequest,
  type LemonSqueezyCheckoutResult,
  type LemonSqueezyVariantPrices,
} from '../utils/lemonsqueezy';
import { notify } from '../utils/notify';
import { logger } from '../utils/logger';
import { buildPricingDetailsPath, type CheckoutPlan } from '../utils/subscriptionPlan';
import { useAuth } from '../contexts/AuthContext';
import { SubscriptionType } from '../types';
import { trackEvent } from '../utils/analytics';
import { resolveSafeReturnTo } from '../utils/navigation';
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
type VariantPrices = LemonSqueezyVariantPrices;
type ProPrice = { amount: string; period: string; saving: string };
type PricingOverviewCard = {
  title: string;
  badge: string;
  tone: 'free' | 'pro' | 'lifetime';
  summary: string;
  bullets: string[];
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
      overviewTitle: '\u5148\u770b\u8fd9\u4e09\u6863\u5206\u522b\u9002\u5408\u8c01',
      overviewSubtitle:
        '\u5148\u7528\u4e00\u53e5\u8bdd\u8bb2\u6e05\u695a\u5b9a\u4f4d，\u518d\u544a\u8bc9\u7528\u6237\u4ed8\u8d39\u540e\u5230\u5e95\u591a\u4e86\u4ec0\u4e48。',
      cards: [
        {
          title: 'Free',
          badge: '\u589e\u957f\u5165\u53e3',
          tone: 'free' as const,
          summary:
            '\u9002\u5408\u5148\u4f53\u9a8c\u4ea7\u54c1、\u5efa\u7acb\u5b66\u4e60\u4e60\u60ef\u7684\u7528\u6237。',
          bullets: [
            '\u6bcf\u95e8\u8bfe\u524d 2 \u5355\u5143\u53ef\u5b66，\u8db3\u591f\u5224\u65ad\u8bfe\u7a0b\u5185\u5bb9\u662f\u5426\u9002\u5408\u4f60',
            '\u5355\u8bcd\u95ea\u5361、\u62fc\u5199、\u591a\u9009、dictation \u7b49\u57fa\u7840\u7ec3\u4e60\u53ef\u76f4\u63a5\u4f7f\u7528',
            '\u5355\u8bcd\u65b0\u589e\u5165\u5e93 20 \u4e2a/\u5929，Test Mode 1 \u6b21/\u5929',
            'TOPIK / \u5199\u4f5c\u4ec5\u5f00\u653e\u516c\u5f00\u6837\u672c\u5377，\u652f\u6301\u771f\u5b9e\u4f53\u9a8c\u6d41\u7a0b',
            '\u5a92\u4f53\u5e93\u53ef\u6d4f\u89c8\u5168\u90e8\u5217\u8868，\u4f46\u5b8c\u6574\u64ad\u653e\u9650 2 \u4e2a/\u5929，\u4ec5 1.0x \u500d\u901f',
            '\u7edf\u4e00 AI Credit \u6bcf\u65e5 5 \u70b9，\u4e0d\u542b PDF \u5bfc\u51fa\u548c\u957f\u671f\u5206\u6790',
          ],
        },
        {
          title: 'Pro',
          badge: '\u5b8c\u6574\u5b66\u4e60\u7248',
          tone: 'pro' as const,
          summary:
            '\u9002\u5408\u6b63\u5728\u6301\u7eed\u5907\u8003\u6216\u7cfb\u7edf\u5b66\u97e9\u8bed\u7684\u4e3b\u529b\u7528\u6237。',
          bullets: [
            '\u5168\u90e8\u6559\u6750、\u5168\u90e8\u8bfe\u7a0b、\u5168\u90e8\u5355\u5143\u5b8c\u6574\u5f00\u653e',
            '\u5355\u8bcd\u65b0\u589e\u65e0\u9650，Test Mode \u65e0\u9650，\u5386\u53f2\u6210\u7ee9\u4e0e\u8d8b\u52bf\u5206\u6790\u5f00\u653e',
            '\u5168\u90e8 TOPIK \u5ba2\u89c2\u9898、\u5199\u4f5c\u9898、\u9519\u9898\u805a\u5408\u4e0e\u957f\u671f\u62a5\u544a\u5f00\u653e',
            '\u5a92\u4f53\u5b8c\u6574\u64ad\u653e\u65e0\u9650，\u5e76\u5f00\u653e\u500d\u901f\u64ad\u653e',
            '\u7edf\u4e00 AI Credit \u6bcf\u65e5 100 \u70b9，\u8986\u76d6\u8bed\u6cd5\u79c1\u6559、\u9605\u8bfb\u5206\u6790、\u5199\u4f5c\u8bc4\u5206\u7b49',
            'PDF \u5168\u683c\u5f0f\u5bfc\u51fa，\u9002\u5408\u81ea\u4e60、\u6253\u5370、\u7ebf\u4e0b\u590d\u4e60',
          ],
        },
        {
          title: 'Lifetime',
          badge: '\u4e00\u6b21\u4e70\u65ad',
          tone: 'lifetime' as const,
          summary:
            '\u9002\u5408\u957f\u671f\u5b66\u4e60\u8005，\u6743\u76ca\u4e0e Pro \u76f8\u540c，\u53ea\u662f\u4e0d\u518d\u7eed\u8d39。',
          bullets: [
            '\u5f53\u524d\u5168\u90e8 Pro \u6743\u76ca\u5b8c\u5168\u5305\u542b',
            '\u672a\u6765\u65b0\u589e\u7684 Pro \u529f\u80fd\u9ed8\u8ba4\u7ee7\u7eed\u5305\u542b',
            '\u4e0d\u9700\u8981\u62c5\u5fc3\u7eed\u8d39、\u4ef7\u683c\u6ce2\u52a8\u6216\u8de8\u5e74\u6210\u672c',
            '\u9002\u5408\u957f\u671f\u5907\u8003 TOPIK \u6216\u7cfb\u7edf\u5b8c\u6210\u6574\u5957\u6559\u6750\u5b66\u4e60',
          ],
        },
      ] satisfies PricingOverviewCard[],
      rightsTitle:
        '\u6309\u529f\u80fd\u770b，\u4ed8\u8d39\u5230\u5e95\u89e3\u9501\u4e86\u4ec0\u4e48',
      rightsSubtitle:
        '\u628a\u6700\u5173\u952e\u7684\u4f7f\u7528\u5dee\u5f02\u63d0\u524d\u8bb2\u660e\u767d，\u907f\u514d\u53ea\u770b\u5230\u4ef7\u683c\u6ca1\u770b\u5230\u8fb9\u754c。',
      rights: [
        {
          title: '\u6559\u6750\u8bfe\u7a0b',
          free: '\u6bcf\u95e8\u8bfe\u524d 2 \u5355\u5143\u514d\u8d39，\u53ef\u771f\u5b9e\u4f53\u9a8c\u8bcd\u6c47、\u8bed\u6cd5、\u9605\u8bfb、\u542c\u529b',
          pro: '\u5168\u90e8\u8bfe\u7a0b、\u5168\u90e8\u5355\u5143\u5b8c\u6574\u5f00\u653e',
        },
        {
          title: '\u5355\u8bcd\u7cfb\u7edf',
          free: '20 \u65b0\u8bcd/\u5929，Test Mode 1 \u6b21/\u5929',
          pro: '\u65b0\u589e\u65e0\u9650、\u6d4b\u8bd5\u65e0\u9650、\u5f00\u653e\u5386\u53f2\u8d8b\u52bf\u5206\u6790',
        },
        {
          title: 'TOPIK / \u5199\u4f5c',
          free: '\u4ec5\u516c\u5f00\u6837\u672c\u5377，\u652f\u6301\u5b8c\u6574\u8bd5\u505a\u4e0e\u5f53\u524d\u7ed3\u679c\u9875',
          pro: '\u5168\u90e8\u771f\u9898、\u5199\u4f5c\u8bc4\u5206\u62a5\u544a、\u9519\u9898\u805a\u5408\u4e0e\u957f\u671f\u5386\u53f2',
        },
        {
          title: '\u5a92\u4f53\u5b66\u4e60',
          free: '\u6bcf\u65e5\u5b8c\u6574\u64ad\u653e 2 \u4e2a\u6761\u76ee，\u4ec5 1.0x \u500d\u901f',
          pro: '\u5b8c\u6574\u64ad\u653e\u65e0\u9650，\u652f\u6301\u500d\u901f\u63a7\u5236',
        },
        {
          title: 'AI \u80fd\u529b',
          free: '\u7edf\u4e00 AI Credit 5 \u70b9/\u5929，\u9002\u5408\u8f7b\u91cf\u4f53\u9a8c',
          pro: '\u7edf\u4e00 AI Credit 100 \u70b9/\u5929，\u8986\u76d6\u5168\u7ad9 AI \u529f\u80fd',
        },
        {
          title: '\u5bfc\u51fa\u4e0e\u5206\u6790',
          free: '\u65e0 PDF \u5bfc\u51fa，\u4ec5\u4fdd\u7559\u5373\u65f6\u7ed3\u679c\u9875',
          pro: 'PDF \u5168\u683c\u5f0f\u5bfc\u51fa + \u957f\u671f\u5386\u53f2\u548c\u805a\u5408\u5206\u6790',
        },
      ] satisfies PricingRightsGroup[],
    };
  }

  return {
    overviewTitle: 'What each plan is actually for',
    overviewSubtitle:
      'Explain the role of each tier first, then show exactly what paid access unlocks.',
    cards: [
      {
        title: 'Free',
        badge: 'Starter',
        tone: 'free' as const,
        summary: 'Best for trying the product and building a daily habit.',
        bullets: [
          'First 2 units of every course are open so users can evaluate the curriculum',
          'Core vocab drills like flashcards, spelling, multiple choice, and dictation stay available',
          '20 new vocab saves per day and 1 vocab test per day',
          'TOPIK and writing only include public sample papers',
          'Media library is browsable, but full playback is limited to 2 items per day at 1.0x',
          'Unified AI credit is limited and PDF export / long-term analytics stay locked',
        ],
      },
      {
        title: 'Pro',
        badge: 'Full access',
        tone: 'pro' as const,
        summary: 'Best for serious learners preparing consistently and using the product daily.',
        bullets: [
          'All textbooks, all courses, and all units unlocked',
          'Unlimited vocab saves and tests with history and trend analytics',
          'Full TOPIK objective + writing archive, mistake clustering, and long-term reports',
          'Unlimited media playback with speed controls',
          '100 AI credits per day shared across grammar, reading, and writing tools',
          'Full PDF export for print and offline review',
        ],
      },
      {
        title: 'Lifetime',
        badge: 'One-time payment',
        tone: 'lifetime' as const,
        summary: 'Same entitlements as Pro, but without recurring billing.',
        bullets: [
          'Includes every current Pro entitlement',
          'Future Pro features stay included by default',
          'No renewal risk or pricing changes over time',
          'Best for long-term learners working through the full platform',
        ],
      },
    ] satisfies PricingOverviewCard[],
    rightsTitle: 'What paid access changes in practice',
    rightsSubtitle: 'The key boundaries are easier to understand by feature than by price alone.',
    rights: [
      {
        title: 'Courses',
        free: 'First 2 units per course',
        pro: 'All courses and all units',
      },
      {
        title: 'Vocabulary system',
        free: '20 new words/day and 1 test/day',
        pro: 'Unlimited saves, tests, and history analytics',
      },
      {
        title: 'TOPIK and writing',
        free: 'Public sample papers only',
        pro: 'Full archive, reports, and long-term history',
      },
      {
        title: 'Media study',
        free: '2 full plays/day at 1.0x only',
        pro: 'Unlimited playback with speed control',
      },
      {
        title: 'AI features',
        free: 'Low daily AI credit for light trial usage',
        pro: '100 daily AI credits shared across the site',
      },
      {
        title: 'Export and analytics',
        free: 'No PDF export, no long-term dashboards',
        pro: 'Full PDF export and deeper analytics',
      },
    ] satisfies PricingRightsGroup[],
  };
}

function getOverviewCardClassName(tone: PricingOverviewCard['tone']) {
  if (tone === 'pro') {
    return 'border-black bg-[#0F172A] text-white shadow-pop';
  }
  if (tone === 'lifetime') {
    return 'border-black bg-white shadow-pop';
  }
  return 'border-slate-200 bg-white';
}

function getOverviewBadgeClassName(tone: PricingOverviewCard['tone']) {
  if (tone === 'pro') return 'bg-[#F2C94C] text-black border-black';
  if (tone === 'lifetime') return 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-300';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

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
  const { user, loading: authLoading, viewerAccess } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useLocalizedNavigate();
  const location = useLocation();
  const meta = getRouteMeta(location.pathname);
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const checkoutSource = useMemo(() => {
    const source = searchParams.get('source');
    return source || 'pricing_details';
  }, [searchParams]);
  const returnToPath = useMemo(
    () => resolveSafeReturnTo(searchParams.get('returnTo'), '/dashboard'),
    [searchParams]
  );

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
    aRef<LemonSqueezyCheckoutRequest, LemonSqueezyCheckoutResult>('lemonsqueezy:createCheckout')
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

  const describeReturnTo = useMemo(() => {
    if (returnToPath.startsWith('/topik')) {
      return t('payment.returnTo.topik', { defaultValue: 'TOPIK mock exam page' });
    }
    if (returnToPath.startsWith('/dashboard')) {
      return t('payment.returnTo.dashboard', { defaultValue: 'Dashboard' });
    }
    if (returnToPath.startsWith('/course/')) {
      return t('payment.returnTo.course', { defaultValue: 'Course page' });
    }
    if (returnToPath.startsWith('/pricing')) {
      return t('payment.returnTo.pricing', { defaultValue: 'Pricing page' });
    }
    return returnToPath;
  }, [returnToPath, t]);

  const isPaidUser = Boolean(viewerAccess?.isPremium);
  const activeSubscriptionType = viewerAccess?.isPremium
    ? (user?.subscriptionType ?? SubscriptionType.ANNUAL)
    : SubscriptionType.FREE;

  const startCheckout = async (plan: CheckoutPlan) => {
    if (authLoading) {
      return;
    }

    trackEvent('checkout_start', {
      language: i18n.language,
      plan,
      source: checkoutSource,
    });

    if (!user) {
      redirectTo(
        buildPricingDetailsPath({
          plan,
          source: checkoutSource,
          returnTo: returnToPath,
        })
      );
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
          locale: i18n.language,
          source: checkoutSource,
          returnTo: returnToPath,
          appOrigin: globalThis.location.origin,
        },
        { retries: 1, initialDelayMs: 250 }
      );

      if (!isSafeCheckoutUrl(checkoutUrl)) {
        throw new Error('Invalid checkout URL returned by provider');
      }
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

  const isCurrentPlan = (type: SubscriptionType) => activeSubscriptionType === type;

  const buttonLabel = showLocalizedPromo
    ? t('pricingDetails.promo.subscribe')
    : t('pricingDetails.plans.pro.cta');
  const pricingCopy = useMemo(() => resolvePricingCopy(i18n.language), [i18n.language]);

  return (
    <div className="min-h-screen bg-[#F8FAFF] text-slate-900 font-landing antialiased selection:bg-[#F2C94C] selection:text-black">
      <Seo
        title={meta.title}
        description={meta.description}
        keywords={meta.keywords}
        noIndex={meta.noIndex}
      />

      {showLocalizedPromo && (
        <div className="w-full bg-[#0B2545] border-b-2 border-black h-12 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-full flex items-center gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-7 h-7 bg-white rounded-lg border-2 border-black flex items-center justify-center flex-shrink-0">
                <Gift className="w-4 h-4 text-[#0B2545]" />
              </div>
              <div className="text-white text-sm font-bold truncate">
                {t('pricingDetails.promo.banner.prefix')}
                <span className="text-[#F2C94C]">{t('pricingDetails.promo.banner.highlight')}</span>
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
            <div className="max-w-xl mx-auto bg-[#FFF7D6] border-2 border-[#F2C94C] rounded-2xl shadow-pop p-6">
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-12 h-12 bg-[#F2C94C] rounded-full border-2 border-black flex items-center justify-center flex-shrink-0">
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
                  <p className="text-sm text-slate-800 mt-1">
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
              disabled={authLoading || !user || isCurrentPlan(SubscriptionType.FREE)}
              loading={authLoading}
              loadingText={t('common.loading', { defaultValue: 'Loading...' })}
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
              showLocalizedPromo ? 'bg-[#0B2545]' : 'bg-[#0F172A]'
            }`}
          >
            {showLocalizedPromo ? (
              <div className="absolute top-4 right-4 bg-[#F2C94C] text-black border-2 border-black px-4 py-2 rounded-xl font-black text-xs tracking-wider animate-float">
                {t('pricingDetails.promo.activated')}
              </div>
            ) : (
              <div className="absolute top-0 right-0 bg-brand-yellow text-black border-l-2 border-b-2 border-black px-4 py-1.5 rounded-bl-xl font-bold text-xs uppercase tracking-wider">
                {t('pricingDetails.plans.pro.badge')}
              </div>
            )}
            <div className="mb-4">
              <h3 className="text-xl font-bold text-[#F2C94C]">
                {t('pricingDetails.plans.pro.title')}
              </h3>
              <p className="text-sm text-slate-400 mt-1">
                {t('pricingDetails.plans.pro.subtitle')}
              </p>
            </div>
            {user && !isPaidUser && (
              <div className="mb-6 rounded-2xl border border-white/20 bg-white/10 p-4 text-left">
                <p className="text-sm font-black text-white">
                  {t('pricingDetails.accountNote.title', {
                    defaultValue: 'This membership will be activated for your current account',
                  })}
                </p>
                <p className="mt-1 text-sm font-semibold text-[#FDE68A]">{user.email}</p>
                <p className="mt-2 text-xs font-medium text-slate-200">
                  {t('pricingDetails.accountNote.returnTo', {
                    defaultValue: 'After payment you will return to: {{destination}}',
                    destination: describeReturnTo,
                  })}
                </p>
              </div>
            )}
            {showLocalizedPromo ? (
              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-[#F2C94C]">$</span>
                  <span className="text-7xl font-heading font-extrabold text-[#F2C94C]">
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
              disabled={authLoading || checkoutPendingPlan !== null}
              loading={authLoading || checkoutPendingPlan === proPlanId}
              loadingText={
                authLoading ? t('common.loading', { defaultValue: 'Loading...' }) : buttonLabel
              }
              loadingIconClassName="w-5 h-5"
              className={`w-full py-4 rounded-xl font-bold text-lg mb-8 hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all border-2 border-black flex justify-center items-center gap-2 ${
                showLocalizedPromo
                  ? 'bg-[#F2C94C] text-black shadow-[4px_4px_0px_0px_#ffffff]'
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
                  <div className="bg-[#F2C94C]/20 p-0.5 rounded text-[#F2C94C] flex-shrink-0">
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
              disabled={authLoading || checkoutPendingPlan !== null}
              loading={authLoading || checkoutPendingPlan === 'LIFETIME'}
              loadingText={
                authLoading
                  ? t('common.loading', { defaultValue: 'Loading...' })
                  : t('pricingDetails.plans.lifetime.cta')
              }
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
