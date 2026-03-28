'use node';
import { action } from './_generated/server';
import { makeFunctionReference } from 'convex/server';
import type { FunctionReference } from 'convex/server';
import { assertProductionRuntimeEnv } from './env';

assertProductionRuntimeEnv();

type ViewerSubscriptionDoc = {
  tier?: string;
  subscriptionType?: string;
  subscriptionExpiry?: string;
} | null;

const viewerQuery = makeFunctionReference<'query', Record<string, never>, ViewerSubscriptionDoc>(
  'users:viewer'
) as unknown as FunctionReference<
  'query',
  'internal',
  Record<string, never>,
  ViewerSubscriptionDoc
>;

export const getSubscriptionActivationStatus = action({
  args: {},
  handler: async ctx => {
    const viewer = await ctx.runQuery(viewerQuery, {});
    if (!viewer) {
      return {
        isActive: false,
        status: 'UNAUTHENTICATED' as const,
        tier: null,
        subscriptionType: null,
      };
    }

    const hasPaidTier = viewer.tier === 'PAID' || viewer.tier === 'PREMIUM';
    const hasSubscriptionType = Boolean(viewer.subscriptionType);
    const expiryMs = viewer.subscriptionExpiry ? Date.parse(viewer.subscriptionExpiry) : NaN;
    const isUnexpired = Number.isNaN(expiryMs) || expiryMs > Date.now();
    const isActive = hasPaidTier || (hasSubscriptionType && isUnexpired);

    return {
      isActive,
      status: isActive ? ('ACTIVE' as const) : ('PENDING' as const),
      tier: viewer.tier ?? null,
      subscriptionType: viewer.subscriptionType ?? null,
    };
  },
});
