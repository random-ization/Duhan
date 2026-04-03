import { internalMutation, type MutationCtx } from './_generated/server';
import { v } from 'convex/values';
import { asId } from './id';

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

  const allUsers = await ctx.db.query('users').collect();
  return allUsers.find(user => normalizeEmail(user.email) === normalizedEmail) ?? null;
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
      console.error(`User not found for email: ${args.customerEmail} or id: ${args.userId}`);
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

    console.log(`Granted ${args.plan} access to ${args.customerEmail}`);
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
      console.error(`User not found for email: ${args.customerEmail}`);
      return { success: false };
    }

    await ctx.db.patch(user._id, {
      tier: 'FREE',
      subscriptionType: undefined,
      subscriptionExpiry: undefined,
    });

    console.log(`Revoked access from ${args.customerEmail}`);
    return { success: true };
  },
});
