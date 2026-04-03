export type CheckoutPlan = 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL' | 'LIFETIME';

const DEFAULT_CHECKOUT_ORIGIN = 'http://localhost:3000';

export const ALLOWED_CHECKOUT_ORIGINS = new Set<string>([
  'https://koreanstudy.me',
  'https://www.koreanstudy.me',
  'http://localhost:3000',
  'http://localhost:5173',
]);

export function normalizeCheckoutPlan(value?: string | null): CheckoutPlan | null {
  const normalized = value?.trim().toUpperCase();
  switch (normalized) {
    case 'MONTHLY':
    case 'QUARTERLY':
    case 'SEMIANNUAL':
    case 'ANNUAL':
    case 'LIFETIME':
      return normalized;
    default:
      return null;
  }
}

function readOrigin(value?: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function resolveCheckoutBaseUrl(args: {
  appOrigin?: string | null;
  fallbackAppUrl?: string | null;
  siteUrl?: string | null;
}): string {
  const candidates = [args.appOrigin, args.fallbackAppUrl, args.siteUrl]
    .map(readOrigin)
    .filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (ALLOWED_CHECKOUT_ORIGINS.has(candidate)) {
      return candidate;
    }
  }

  return readOrigin(DEFAULT_CHECKOUT_ORIGIN) ?? DEFAULT_CHECKOUT_ORIGIN;
}

export function derivePlanFromVariantName(variantName?: string | null): CheckoutPlan | null {
  const normalized = variantName?.trim().toLowerCase();
  if (!normalized) return null;

  if (normalized.includes('lifetime') || normalized.includes('forever')) {
    return 'LIFETIME';
  }
  if (
    normalized.includes('semiannual') ||
    normalized.includes('semi-annual') ||
    normalized.includes('half-year') ||
    normalized.includes('6 month') ||
    normalized.includes('6-month')
  ) {
    return 'SEMIANNUAL';
  }
  if (
    normalized.includes('quarterly') ||
    normalized.includes('quarter') ||
    normalized.includes('3 month') ||
    normalized.includes('3-month')
  ) {
    return 'QUARTERLY';
  }
  if (
    normalized.includes('annual') ||
    normalized.includes('yearly') ||
    normalized.includes('12 month') ||
    normalized.includes('12-month')
  ) {
    return 'ANNUAL';
  }
  if (normalized.includes('monthly') || normalized.includes('month')) {
    return 'MONTHLY';
  }

  return null;
}

export function derivePlanFromVariantId(
  variantId: string | number | null | undefined,
  variantMap: Record<string, Record<string, string>>
): CheckoutPlan | null {
  if (variantId === null || variantId === undefined) return null;
  const variantIdString = String(variantId);

  for (const plans of Object.values(variantMap)) {
    for (const [plan, configuredVariantId] of Object.entries(plans)) {
      if (configuredVariantId && configuredVariantId === variantIdString) {
        return normalizeCheckoutPlan(plan);
      }
    }
  }

  return null;
}

export function resolveCheckoutPlanFromSource(args: {
  explicitPlan?: string | null;
  variantId?: string | number | null;
  variantName?: string | null;
  variantMap: Record<string, Record<string, string>>;
  fallbackPlan: CheckoutPlan;
}): CheckoutPlan {
  return (
    normalizeCheckoutPlan(args.explicitPlan) ||
    derivePlanFromVariantId(args.variantId, args.variantMap) ||
    derivePlanFromVariantName(args.variantName) ||
    args.fallbackPlan
  );
}
