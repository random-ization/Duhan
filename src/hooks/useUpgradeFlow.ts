import { useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { SubscriptionType } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useLocalizedNavigate } from './useLocalizedNavigate';
import { resolveSafeReturnTo } from '../utils/navigation';
import {
  buildPricingDetailsPath,
  type CheckoutPlan,
  type UpgradeFlowSource,
} from '../utils/subscriptionPlan';

type UpgradeFlowContext = {
  authLoading: boolean;
  isPremiumUser: boolean;
  hasUser: boolean;
};

type UpgradeFlowArgs = {
  plan?: CheckoutPlan;
  source: UpgradeFlowSource | string;
  returnTo?: string;
  requireReviewPage?: boolean;
};

type UpgradeFlowDecision =
  | { kind: 'loading' }
  | { kind: 'pricing'; target: string }
  | { kind: 'auth'; target: string };

export function getUpgradeFlowDecision(
  context: UpgradeFlowContext,
  args: UpgradeFlowArgs,
  fallbackReturnTo: string
): UpgradeFlowDecision {
  if (context.authLoading) {
    return { kind: 'loading' };
  }

  const plan = args.plan ?? 'ANNUAL';
  const returnTo = resolveSafeReturnTo(args.returnTo, fallbackReturnTo);
  const pricingTarget = buildPricingDetailsPath({
    plan,
    source: args.source,
    returnTo,
  });

  if (!context.hasUser) {
    return {
      kind: 'auth',
      target: `/auth?redirect=${encodeURIComponent(pricingTarget)}`,
    };
  }

  return {
    kind: 'pricing',
    target: pricingTarget,
  };
}

export function useUpgradeFlow() {
  const navigate = useLocalizedNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();

  const defaultReturnTo = useMemo(
    () =>
      resolveSafeReturnTo(`${location.pathname}${location.search}${location.hash}`, '/dashboard'),
    [location.hash, location.pathname, location.search]
  );

  const isPremiumUser =
    user?.tier === 'PAID' ||
    user?.tier === 'PREMIUM' ||
    Boolean(
      user?.subscriptionType &&
      user.subscriptionType !== SubscriptionType.FREE &&
      user.subscriptionType.trim() !== ''
    );

  const startUpgradeFlow = useCallback(
    (args: UpgradeFlowArgs) => {
      const decision = getUpgradeFlowDecision(
        {
          authLoading: loading,
          hasUser: Boolean(user),
          isPremiumUser,
        },
        args,
        defaultReturnTo
      );

      if (decision.kind === 'loading') {
        return decision;
      }

      navigate(decision.target);
      return decision;
    },
    [defaultReturnTo, isPremiumUser, loading, navigate, user]
  );

  return {
    startUpgradeFlow,
    authLoading: loading,
    isPremiumUser,
  };
}
