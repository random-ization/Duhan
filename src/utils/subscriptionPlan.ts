export type CheckoutPlan = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'LIFETIME';

export type UpgradeFlowSource =
  | 'dashboard_banner'
  | 'upgrade_prompt'
  | 'topik_locked'
  | 'pricing_details'
  | 'desktop_subscription'
  | 'mobile_subscription'
  | 'landing'
  | 'profile_subscription';

export type PricingDetailsPathOptions = {
  plan?: CheckoutPlan;
  source?: UpgradeFlowSource | string;
  returnTo?: string;
};

const normalizePricingDetailsOptions = (
  input?: CheckoutPlan | PricingDetailsPathOptions
): PricingDetailsPathOptions => {
  if (!input) return {};
  if (typeof input === 'string') {
    return { plan: input };
  }
  return input;
};

export const buildPricingDetailsPath = (
  input?: CheckoutPlan | PricingDetailsPathOptions
): string => {
  const { plan, source, returnTo } = normalizePricingDetailsOptions(input);
  if (!plan && !source && !returnTo) return '/pricing/details';

  const params = new URLSearchParams();
  if (plan) params.set('plan', plan);
  if (source) params.set('source', source);
  if (returnTo) params.set('returnTo', returnTo);
  return `/pricing/details?${params.toString()}`;
};
