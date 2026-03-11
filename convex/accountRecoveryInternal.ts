import { ConvexError, v } from 'convex/values';
import { internalMutation, internalQuery } from './_generated/server';
import type { Doc } from './_generated/dataModel';

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

function assertActiveToken(
  token: Doc<'auth_email_tokens'> | null
): asserts token is Doc<'auth_email_tokens'> {
  if (!token || token.usedAt || token.expiresAt <= Date.now()) {
    throw new ConvexError('INVALID_OR_EXPIRED_TOKEN');
  }
}

export const consumePasswordResetToken = internalMutation({
  args: {
    tokenHash: v.string(),
    newSecret: v.string(),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const token = await ctx.db
      .query('auth_email_tokens')
      .withIndex('by_kind_tokenHash', q =>
        q.eq('kind', 'password_reset').eq('tokenHash', args.tokenHash)
      )
      .first();
    assertActiveToken(token);

    const passwordAccount = await ctx.db
      .query('authAccounts')
      .withIndex('userIdAndProvider', q => q.eq('userId', token.userId).eq('provider', 'password'))
      .first();

    if (!passwordAccount) {
      throw new ConvexError('PASSWORD_AUTH_NOT_ENABLED');
    }

    await ctx.db.patch(passwordAccount._id, { secret: args.newSecret });
    await ctx.db.patch(token._id, { usedAt: args.now });
  },
});

export const consumeEmailVerifyToken = internalMutation({
  args: {
    tokenHash: v.string(),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const token = await ctx.db
      .query('auth_email_tokens')
      .withIndex('by_kind_tokenHash', q =>
        q.eq('kind', 'email_verify').eq('tokenHash', args.tokenHash)
      )
      .first();
    assertActiveToken(token);

    await ctx.db.patch(token.userId, {
      emailVerificationTime: args.now,
      isVerified: true,
    });
    await ctx.db.patch(token._id, { usedAt: args.now });
  },
});
