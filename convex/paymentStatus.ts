'use node';
import { action } from './_generated/server';
import { makeFunctionReference } from 'convex/server';
import type { FunctionReference } from 'convex/server';
import { assertProductionRuntimeEnv } from './env';
import { isPremiumPlan, resolveEntitlementPlan } from './entitlements';

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

    // Use the same decision as protected features so an expired paid account
    // cannot see a successful activation while the app still denies access.
    const isActive = isPremiumPlan(resolveEntitlementPlan(viewer));

    return {
      isActive,
      status: isActive ? ('ACTIVE' as const) : ('PENDING' as const),
      tier: viewer.tier ?? null,
      subscriptionType: viewer.subscriptionType ?? null,
    };
  },
});
