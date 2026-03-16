export type CheckoutPlan = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'LIFETIME';

export const buildPricingDetailsPath = (plan?: CheckoutPlan): string => {
  if (!plan) return '/pricing/details';
  const params = new URLSearchParams({ plan });
  return `/pricing/details?${params.toString()}`;
};
