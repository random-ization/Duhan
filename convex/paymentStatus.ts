'use node';
import { action } from './_generated/server';
import { makeFunctionReference } from 'convex/server';
import type { FunctionReference } from 'convex/server';
import { assertProductionRuntimeEnv } from './env';
import { parseSubscriptionExpiryMs } from './adminUserUtils';

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
    // Reuse the canonical parser so we handle BOTH ISO date strings and numeric
    // timestamp strings (schema allows either). Returns null when expiry is absent
    // or unparseable — we then fall back to treating the subscription as unexpired,
    // matching the lenient semantic in `resolveAdminPlan` (adminUserUtils.ts L113):
    // legacy users without a stamped expiry are granted access while webhooks catch up.
    const expiryMs = parseSubscriptionExpiryMs(viewer.subscriptionExpiry);
    const isUnexpired = expiryMs === null || expiryMs > Date.now();
    const isActive = hasPaidTier || (hasSubscriptionType && isUnexpired);

    return {
      isActive,
      status: isActive ? ('ACTIVE' as const) : ('PENDING' as const),
      tier: viewer.tier ?? null,
      subscriptionType: viewer.subscriptionType ?? null,
    };
  },
});
