import { mutation } from './_generated/server';
import { v } from 'convex/values';
import { toErrorMessage } from './errors';

/**
 * Migrate legacy email/password users to @convex-dev/auth system.
 * This creates authAccounts entries for users who registered with email
 * before the migration to @convex-dev/auth.
 */
export const migrateLegacyPasswordUsers = mutation({
  args: {},
  handler: async ctx => {
    // Get all users with a password set (legacy email registrations)
    const usersWithPassword = await ctx.db
      .query('users')
      .filter(q => q.neq(q.field('password'), undefined))
      .collect();

    let migrated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const user of usersWithPassword) {
      if (!user.password || !user.email) {
        skipped++;
        continue;
      }

      try {
        // Check if authAccount already exists for this user with password provider
        const existingAccount = await ctx.db
          .query('authAccounts')
          .withIndex('userIdAndProvider', q => q.eq('userId', user._id).eq('provider', 'password'))
          .first();

        if (existingAccount) {
          skipped++;
          continue;
        }

        // Create new authAccount entry for password provider
        // The providerAccountId for password is the email
        await ctx.db.insert('authAccounts', {
          userId: user._id,
          provider: 'password',
          providerAccountId: user.email.toLowerCase(),
          // The secret (hashed password) is stored directly
          // Note: @convex-dev/auth expects bcrypt hashed passwords
          // If the legacy system used a different hash, this may need adjustment
          secret: user.password,
        });

        migrated++;
      } catch (e: unknown) {
        errors.push(`${user.email}: ${toErrorMessage(e)}`);
      }
    }

    return {
      success: true,
      migrated,
      skipped,
      total: usersWithPassword.length,
      errors: errors.slice(0, 10),
    };
  },
});

/**
 * Check if a specific email has legacy password that needs migration.
 */
export const checkLegacyUser = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase();

    // Find user by email
    const user = await ctx.db
      .query('users')
      .withIndex('email', q => q.eq('email', email))
      .first();

    if (!user) {
      return { found: false, message: 'User not found' };
    }

    // Check for authAccount
    const authAccount = await ctx.db
      .query('authAccounts')
      .withIndex('userIdAndProvider', q => q.eq('userId', user._id).eq('provider', 'password'))
      .first();

    return {
      found: true,
      userId: user._id,
      hasLegacyPassword: !!user.password,
      hasAuthAccount: !!authAccount,
      needsMigration: !!user.password && !authAccount,
    };
  },
});
