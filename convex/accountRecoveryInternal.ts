import { v } from 'convex/values';
import { internalMutation, internalQuery } from './_generated/server';

export const getUserByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('users')
      .withIndex('email', q => q.eq('email', args.email))
      .first();
  },
});

export const getUserById = internalQuery({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

export const getPasswordAccountByUser = internalQuery({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('authAccounts')
      .withIndex('userIdAndProvider', q => q.eq('userId', args.userId).eq('provider', 'password'))
      .first();
  },
});

export const countRecentTokensByEmail = internalQuery({
  args: {
    email: v.string(),
    kind: v.union(v.literal('password_reset'), v.literal('email_verify')),
    since: v.number(),
  },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query('auth_email_tokens')
      .withIndex('by_email_kind_createdAt', q =>
        q.eq('email', args.email).eq('kind', args.kind).gte('createdAt', args.since)
      )
      .collect();
    return { count: rows.length };
  },
});

export const createToken = internalMutation({
  args: {
    kind: v.union(v.literal('password_reset'), v.literal('email_verify')),
    userId: v.id('users'),
    email: v.string(),
    tokenHash: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    const tokenId = await ctx.db.insert('auth_email_tokens', {
      kind: args.kind,
      userId: args.userId,
      email: args.email,
      tokenHash: args.tokenHash,
      expiresAt: args.expiresAt,
      createdAt: args.createdAt,
    });
    return { tokenId };
  },
});

export const findTokenByHash = internalQuery({
  args: {
    kind: v.union(v.literal('password_reset'), v.literal('email_verify')),
    tokenHash: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('auth_email_tokens')
      .withIndex('by_kind_tokenHash', q => q.eq('kind', args.kind).eq('tokenHash', args.tokenHash))
      .first();
  },
});

export const markTokenUsed = internalMutation({
  args: {
    tokenId: v.id('auth_email_tokens'),
    usedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.tokenId, { usedAt: args.usedAt });
  },
});

export const updatePasswordSecret = internalMutation({
  args: {
    accountId: v.id('authAccounts'),
    secret: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.accountId, { secret: args.secret });
  },
});

export const markUserEmailVerified = internalMutation({
  args: {
    userId: v.id('users'),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      emailVerificationTime: args.now,
      isVerified: true,
    });
  },
});
