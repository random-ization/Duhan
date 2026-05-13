import { useEffect, useMemo, useState } from 'react';
import { runConvexActionWithRetry } from '../utils/convexActionRetry';
import {
  type LemonSqueezyPriceEntry,
  type LemonSqueezyVariantPrices,
} from '../utils/lemonsqueezy';
import { callPublicConvexAction } from '../utils/publicConvexClient';
import type { CheckoutPlan } from '../utils/subscriptionPlan';

export type PricingRegion = 'GLOBAL' | 'REGIONAL';

export type PricingPlanDisplay = {
  amount: string;
  currencySymbol: string;
  displayAmount: string;
  displayUnit: string;
  formatted: string;
};

export type PricingPlansMap = Record<CheckoutPlan, PricingPlanDisplay>;

type UsePricingPlansResult = {
  loading: boolean;
  error: string | null;
  plans: PricingPlansMap;
  region: PricingRegion;
  refresh: () => Promise<void>;
};

const REGIONAL_LANGUAGES = ['zh', 'vi', 'mn'] as const;
const PLAN_ORDER: CheckoutPlan[] = ['MONTHLY', 'QUARTERLY', 'ANNUAL', 'LIFETIME'];
const PLAN_UNITS = {
  MONTHLY: { en: '/ mo', localized: '/ 月' },
  QUARTERLY: { en: '/ qtr', localized: '/ 季' },
  ANNUAL: { en: '/ yr', localized: '/ 年' },
  LIFETIME: { en: 'once', localized: 'once' },
} satisfies Record<CheckoutPlan, { en: string; localized: string }>;
const FALLBACK_SYMBOLS: Record<PricingRegion, string> = {
  GLOBAL: '$',
  REGIONAL: '¥',
};

const isRegionalLanguage = (language: string): boolean => {
  const baseLanguage = (language || 'en').split('-')[0].toLowerCase();
  return REGIONAL_LANGUAGES.includes(baseLanguage as (typeof REGIONAL_LANGUAGES)[number]);
};

export const resolvePricingRegion = (language: string): PricingRegion => {
  return isRegionalLanguage(language) ? 'REGIONAL' : 'GLOBAL';
};

const getDisplayUnit = (plan: CheckoutPlan, language: string): string => {
  const units = PLAN_UNITS[plan];
  return isRegionalLanguage(language) ? units.localized : units.en;
};

const extractDisplayAmount = (entry: LemonSqueezyPriceEntry | undefined): string => {
  if (!entry) return '—';
  const formattedAmount = entry.formatted.replace(/[^\d.,]/g, '');
  return formattedAmount || entry.amount || '—';
};

const extractCurrencySymbol = (
  entry: LemonSqueezyPriceEntry | undefined,
  region: PricingRegion
): string => {
  if (!entry) return FALLBACK_SYMBOLS[region];
  const formattedSymbol = entry.formatted.replace(/[\d\s.,]/g, '');
  return formattedSymbol || FALLBACK_SYMBOLS[region];
};

const buildEmptyPricingPlans = (language: string, region: PricingRegion): PricingPlansMap => ({
  MONTHLY: {
    amount: '—',
    currencySymbol: FALLBACK_SYMBOLS[region],
    displayAmount: '—',
    displayUnit: getDisplayUnit('MONTHLY', language),
    formatted: '—',
  },
  QUARTERLY: {
    amount: '—',
    currencySymbol: FALLBACK_SYMBOLS[region],
    displayAmount: '—',
    displayUnit: getDisplayUnit('QUARTERLY', language),
    formatted: '—',
  },
  ANNUAL: {
    amount: '—',
    currencySymbol: FALLBACK_SYMBOLS[region],
    displayAmount: '—',
    displayUnit: getDisplayUnit('ANNUAL', language),
    formatted: '—',
  },
  LIFETIME: {
    amount: '—',
    currencySymbol: FALLBACK_SYMBOLS[region],
    displayAmount: '—',
    displayUnit: getDisplayUnit('LIFETIME', language),
    formatted: '—',
  },
});

export const formatPricingPlans = (
  prices: LemonSqueezyVariantPrices,
  language: string
): PricingPlansMap => {
  const region = resolvePricingRegion(language);
  const source = prices[region];
  const defaults = buildEmptyPricingPlans(language, region);

  for (const plan of PLAN_ORDER) {
    const entry = source[plan];
    defaults[plan] = {
      amount: entry?.amount ?? '—',
      currencySymbol: extractCurrencySymbol(entry, region),
      displayAmount: extractDisplayAmount(entry),
      displayUnit: getDisplayUnit(plan, language),
      formatted: entry?.formatted ?? '—',
    };
  }

  return defaults;
};

export function usePricingPlans(language: string): UsePricingPlansResult {
  const region = useMemo(() => resolvePricingRegion(language), [language]);
  const [prices, setPrices] = useState<LemonSqueezyVariantPrices | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPrices = async (signal?: AbortSignal) => {
    const nextPrices = await runConvexActionWithRetry(
      () =>
        callPublicConvexAction<Record<string, never>, LemonSqueezyVariantPrices>(
          'lemonsqueezy:getVariantPrices',
          {},
          signal ? { signal } : undefined
        ),
      undefined,
      { retries: 2 }
    );
    return nextPrices;
  };

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const nextPrices = await loadPrices();
      setPrices(nextPrices);
    } catch (refreshError) {
      const message =
        refreshError instanceof Error ? refreshError.message : String(refreshError);
      setError(message);
      setPrices(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    void loadPrices(controller.signal)
      .then(setPrices)
      .catch(loadError => {
        const message = loadError instanceof Error ? loadError.message : String(loadError);
        setError(message);
        setPrices(null);
      })
      .finally(() => {
        setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const plans = useMemo(() => {
    return prices ? formatPricingPlans(prices, language) : buildEmptyPricingPlans(language, region);
  }, [language, prices, region]);

  return {
    loading,
    error,
    plans,
    region,
    refresh,
  };
}
