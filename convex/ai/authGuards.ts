/**
 * AI authentication and authorization utilities.
 *
 * These helpers are extracted from convex/ai.ts for readability.
 * They rely on @convex-dev/auth and Convex internal function references.
 *
 * Usage (inside a `'use node'` action file):
 *   import { requireAuthenticatedUser, guardAiAction } from './ai/authGuards';
 */

import { ConvexError } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';
import { makeFunctionReference } from 'convex/server';
import type { FunctionReference } from 'convex/server';
import type { ActionCtx } from '../_generated/server';
import type { Id } from '../_generated/dataModel';

// ── Internal function references ──────────────────────────────────────────────

const getViewerAccessInternalQuery = makeFunctionReference<
  'query',
  { userId: Id<'users'> },
  {
    plan: 'FREE' | 'PRO' | 'LIFETIME';
    remaining: { aiCreditsDaily: number | null };
  }
>('entitlements:getViewerAccessInternal') as unknown as FunctionReference<
  'query',
  'internal',
  { userId: Id<'users'> },
  {
    plan: 'FREE' | 'PRO' | 'LIFETIME';
    remaining: { aiCreditsDaily: number | null };
  }
>;

const consumeFeatureUsageInternalMutation = makeFunctionReference<
  'mutation',
  {
    userId: Id<'users'>;
    plan: 'FREE' | 'PRO' | 'LIFETIME';
    feature: 'ai_credits_daily';
    amount?: number;
    resourceKey?: string;
    dedupeByResource?: boolean;
    upgradeSource?: string;
  },
  { allowed: boolean; remaining: number | null; reason?: string; upgradeSource?: string | null }
>('entitlements:consumeFeatureUsageInternal') as unknown as FunctionReference<
  'mutation',
  'internal',
  {
    userId: Id<'users'>;
    plan: 'FREE' | 'PRO' | 'LIFETIME';
    feature: 'ai_credits_daily';
    amount?: number;
    resourceKey?: string;
    dedupeByResource?: boolean;
    upgradeSource?: string;
  },
  { allowed: boolean; remaining: number | null; reason?: string; upgradeSource?: string | null }
>;

const logInvocationMutation = makeFunctionReference<
  'mutation',
  { userId: Id<'users'>; feature: string },
  void
>('aiUsageLogs:logInvocation') as unknown as FunctionReference<
  'mutation',
  'internal',
  { userId: Id<'users'>; feature: string },
  void
>;

// ── Exported helpers ──────────────────────────────────────────────────────────

/** Resolve the authenticated Convex user id or throw UNAUTHORIZED. */
export async function requireAuthenticatedUser(ctx: ActionCtx): Promise<Id<'users'>> {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new ConvexError('UNAUTHORIZED');
  }
  return userId as Id<'users'>;
}

/**
 * Enforce the per-user daily AI credit limit.
 * Throws a structured `ConvexError` with code `DAILY_LIMIT_REACHED` when
 * the quota has been exhausted.
 */
export async function enforceAiDailyLimit(
  ctx: ActionCtx,
  userId: Id<'users'>,
  feature: string,
  cost: number = 1
): Promise<void> {
  const snapshot = await ctx.runQuery(getViewerAccessInternalQuery, { userId });
  const result = await ctx.runMutation(consumeFeatureUsageInternalMutation, {
    userId,
    plan: snapshot.plan,
    feature: 'ai_credits_daily',
    amount: cost,
    resourceKey: feature,
    upgradeSource: 'ai_limit',
  });

  if (!result.allowed) {
    throw new ConvexError({
      code: 'DAILY_LIMIT_REACHED',
      feature: 'ai_credits_daily',
      upgradeSource: 'ai_limit',
      remaining: result.remaining,
    });
  }

  await ctx.runMutation(logInvocationMutation, { userId, feature });
}

/**
 * Combined auth + rate-limit guard.
 * Returns the authenticated user id on success.
 */
export async function guardAiAction(
  ctx: ActionCtx,
  feature: string,
  cost: number = 1
): Promise<Id<'users'>> {
  const userId = await requireAuthenticatedUser(ctx);
  await enforceAiDailyLimit(ctx, userId, feature, cost);
  return userId;
}

/**
 * Require the caller to be an admin.
 * Uses the public `users.viewer` query to check the role.
 */
export async function requireAdminAction(
  ctx: ActionCtx,
  viewerQuery: FunctionReference<'query', 'public', Record<string, never>, { _id: Id<'users'>; role?: string } | null>
): Promise<void> {
  const userId = await requireAuthenticatedUser(ctx);
  const viewer = await ctx.runQuery(viewerQuery, {});
  if (!viewer || viewer._id !== userId || viewer.role !== 'ADMIN') {
    throw new ConvexError('FORBIDDEN');
  }
}
