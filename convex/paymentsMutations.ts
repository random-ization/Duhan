import { internalMutation, type MutationCtx } from './_generated/server';
import { v } from 'convex/values';
import { asId } from './id';
import { paymentLogger } from './logger';

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

async function findUserByEmail(ctx: MutationCtx, rawEmail: string) {
  const normalizedEmail = normalizeEmail(rawEmail);

  const exactMatch = await ctx.db
    .query('users')
    .withIndex('email', q => q.eq('email', normalizedEmail))
    .first();
  if (exactMatch) return exactMatch;

  const legacyExact = await ctx.db
    .query('users')
    .withIndex('email', q => q.eq('email', rawEmail.trim()))
    .first();
  if (legacyExact) return legacyExact;

  // Last-resort scan for legacy rows whose stored email differs in case.
  // New signups store lowercased emails (see auth.ts), so this only has to
  // cover the bounded set of pre-normalization accounts. The scan is capped:
  // an unbounded collect() would hit the transaction read limit once the
  // users table grows, failing the whole payment mutation.
  const LEGACY_SCAN_LIMIT = 8000;
  const legacyUsers = await ctx.db.query('users').take(LEGACY_SCAN_LIMIT);
  if (legacyUsers.length === LEGACY_SCAN_LIMIT) {
    paymentLogger.warn(
      `findUserByEmail legacy scan hit the ${LEGACY_SCAN_LIMIT}-row cap; ` +
        'unnormalized accounts beyond the cap cannot be matched'
    );
  }
  return legacyUsers.find(user => normalizeEmail(user.email) === normalizedEmail) ?? null;
}

// Internal mutation to grant premium access
export const grantAccess = internalMutation({
  args: {
    customerEmail: v.string(),
    plan: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let user;
    if (args.userId) {
      user = await ctx.db.get(asId<'users'>(args.userId));
    }

    user ??= await findUserByEmail(ctx, args.customerEmail);

    if (!user) {
      paymentLogger.error(`User not found for email: ${args.customerEmail} or id: ${args.userId}`);
      return { success: false, error: 'User not found' };
    }

    // Calculate expiry based on plan
    let subscriptionExpiry: string | undefined;
    if (args.plan === 'LIFETIME') {
      subscriptionExpiry = undefined; // No expiry for lifetime
    } else if (args.plan === 'ANNUAL') {
      subscriptionExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    } else if (args.plan === 'QUARTERLY') {
      subscriptionExpiry = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    } else if (args.plan === 'SEMIANNUAL') {
      subscriptionExpiry = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();
    } else {
      // Monthly
      subscriptionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    await ctx.db.patch(user._id, {
      tier: 'PREMIUM',
      subscriptionType: args.plan,
      subscriptionExpiry,
    });

    paymentLogger.info(`Granted ${args.plan} access to ${args.customerEmail}`);
    return { success: true };
  },
});

// Internal mutation to revoke premium access
export const revokeAccess = internalMutation({
  args: {
    customerEmail: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let user;
    if (args.userId) {
      user = await ctx.db.get(asId<'users'>(args.userId));
    }

    user ??= await findUserByEmail(ctx, args.customerEmail);

    if (!user) {
      paymentLogger.error(`User not found for email: ${args.customerEmail}`);
      return { success: false };
    }

    await ctx.db.patch(user._id, {
      tier: 'FREE',
      subscriptionType: undefined,
      subscriptionExpiry: undefined,
    });

    paymentLogger.info(`Revoked access from ${args.customerEmail}`);
    return { success: true };
  },
});
