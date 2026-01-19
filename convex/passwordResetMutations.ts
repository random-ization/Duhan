import { internalMutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';

export const getUserByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('email', q => q.eq('email', args.email))
      .first();
    if (!user) return null;
    return {
      _id: user._id,
      resetToken: user.resetToken,
      resetTokenExpires: user.resetTokenExpires,
      email: user.email,
    };
  },
});

export const setPasswordResetToken = internalMutation({
  args: {
    userId: v.id('users'),
    resetToken: v.string(),
    resetTokenExpires: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      resetToken: args.resetToken,
      resetTokenExpires: args.resetTokenExpires,
    });
    return { success: true };
  },
});

export const clearPasswordResetToken = internalMutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { resetToken: undefined, resetTokenExpires: undefined });
    return { success: true };
  },
});

export const getPasswordAccount = internalQuery({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('authAccounts')
      .withIndex('userIdAndProvider', q => q.eq('userId', args.userId).eq('provider', 'password'))
      .unique();
  },
});

export const updatePasswordAccountSecret = internalMutation({
  args: { authAccountId: v.id('authAccounts'), newSecret: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.authAccountId, { secret: args.newSecret });
    return { success: true };
  },
});
