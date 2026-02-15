'use node';

import { ConvexError, v } from 'convex/values';
import { action, type ActionCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { getAuthUserId } from '@convex-dev/auth/server';
import { createHash, randomBytes } from 'node:crypto';
import { hashSync } from 'bcryptjs';
import { Resend } from 'resend';
import { makeFunctionReference } from 'convex/server';
import type { FunctionReference } from 'convex/server';

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const DAILY_REQUEST_LIMIT_PER_EMAIL = 5;
const SUPPORTED_LANGS = new Set(['en', 'zh', 'vi', 'mn']);
const DEFAULT_LANG = 'en';

type TokenKind = 'password_reset' | 'email_verify';

type GetUserByEmailArgs = { email: string };
type GetUserByIdArgs = { userId: Id<'users'> };
type GetPasswordAccountArgs = { userId: Id<'users'> };
type CountTokensArgs = { email: string; kind: TokenKind; since: number };
type CreateTokenArgs = {
  kind: TokenKind;
  userId: Id<'users'>;
  email: string;
  tokenHash: string;
  expiresAt: number;
  createdAt: number;
};
type FindTokenArgs = { kind: TokenKind; tokenHash: string };
type MarkTokenUsedArgs = { tokenId: Id<'auth_email_tokens'>; usedAt: number };
type UpdateSecretArgs = { accountId: Id<'authAccounts'>; secret: string };
type MarkVerifiedArgs = { userId: Id<'users'>; now: number };

const getUserByEmailRef = makeFunctionReference<
  'query',
  GetUserByEmailArgs,
  {
    _id: Id<'users'>;
    email: string;
    emailVerificationTime?: number;
  } | null
>('accountRecoveryInternal:getUserByEmail') as unknown as FunctionReference<
  'query',
  'internal',
  GetUserByEmailArgs,
  {
    _id: Id<'users'>;
    email: string;
    emailVerificationTime?: number;
  } | null
>;

const getUserByIdRef = makeFunctionReference<
  'query',
  GetUserByIdArgs,
  {
    _id: Id<'users'>;
    email: string;
    emailVerificationTime?: number;
  } | null
>('accountRecoveryInternal:getUserById') as unknown as FunctionReference<
  'query',
  'internal',
  GetUserByIdArgs,
  {
    _id: Id<'users'>;
    email: string;
    emailVerificationTime?: number;
  } | null
>;

const getPasswordAccountRef = makeFunctionReference<
  'query',
  GetPasswordAccountArgs,
  {
    _id: Id<'authAccounts'>;
    userId: Id<'users'>;
    provider: string;
    secret?: string;
  } | null
>('accountRecoveryInternal:getPasswordAccountByUser') as unknown as FunctionReference<
  'query',
  'internal',
  GetPasswordAccountArgs,
  {
    _id: Id<'authAccounts'>;
    userId: Id<'users'>;
    provider: string;
    secret?: string;
  } | null
>;

const countTokensByEmailRef = makeFunctionReference<
  'query',
  CountTokensArgs,
  {
    count: number;
  }
>('accountRecoveryInternal:countRecentTokensByEmail') as unknown as FunctionReference<
  'query',
  'internal',
  CountTokensArgs,
  { count: number }
>;

const createTokenRef = makeFunctionReference<
  'mutation',
  CreateTokenArgs,
  {
    tokenId: Id<'auth_email_tokens'>;
  }
>('accountRecoveryInternal:createToken') as unknown as FunctionReference<
  'mutation',
  'internal',
  CreateTokenArgs,
  { tokenId: Id<'auth_email_tokens'> }
>;

const findTokenByHashRef = makeFunctionReference<
  'query',
  FindTokenArgs,
  {
    _id: Id<'auth_email_tokens'>;
    kind: TokenKind;
    userId: Id<'users'>;
    email: string;
    expiresAt: number;
    usedAt?: number;
    createdAt: number;
  } | null
>('accountRecoveryInternal:findTokenByHash') as unknown as FunctionReference<
  'query',
  'internal',
  FindTokenArgs,
  {
    _id: Id<'auth_email_tokens'>;
    kind: TokenKind;
    userId: Id<'users'>;
    email: string;
    expiresAt: number;
    usedAt?: number;
    createdAt: number;
  } | null
>;

const markTokenUsedRef = makeFunctionReference<'mutation', MarkTokenUsedArgs, void>(
  'accountRecoveryInternal:markTokenUsed'
) as unknown as FunctionReference<'mutation', 'internal', MarkTokenUsedArgs, void>;

const updatePasswordSecretRef = makeFunctionReference<'mutation', UpdateSecretArgs, void>(
  'accountRecoveryInternal:updatePasswordSecret'
) as unknown as FunctionReference<'mutation', 'internal', UpdateSecretArgs, void>;

const markUserEmailVerifiedRef = makeFunctionReference<'mutation', MarkVerifiedArgs, void>(
  'accountRecoveryInternal:markUserEmailVerified'
) as unknown as FunctionReference<'mutation', 'internal', MarkVerifiedArgs, void>;

function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function normalizeLang(raw?: string): string {
  if (!raw) return DEFAULT_LANG;
  const short = raw.trim().toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_LANGS.has(short) ? short : DEFAULT_LANG;
}

function isLikelyEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function buildAppUrl(): string {
  return (
    process.env.VITE_APP_URL ||
    process.env.APP_URL ||
    process.env.SITE_URL ||
    'http://localhost:3000'
  );
}

function buildLocalizedLink(lang: string, routePath: string, token: string): string {
  const base = buildAppUrl().replace(/\/$/, '');
  const safeLang = normalizeLang(lang);
  const normalizedPath = routePath.startsWith('/') ? routePath : `/${routePath}`;
  return `${base}/${safeLang}${normalizedPath}?token=${encodeURIComponent(token)}`;
}

async function sendRecoveryEmail(args: {
  to: string;
  subject: string;
  heading: string;
  description: string;
  actionLabel: string;
  actionUrl: string;
  fallbackNote: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim() || process.env.EMAIL_FROM?.trim();

  if (!apiKey || !from) {
    console.warn(
      `[accountRecovery] Email provider not configured. To=${args.to}, Link=${args.actionUrl}`
    );
    return;
  }

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from,
    to: args.to,
    subject: args.subject,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height:1.6; color:#0f172a;">
        <h2 style="margin:0 0 12px;">${args.heading}</h2>
        <p style="margin:0 0 16px;">${args.description}</p>
        <p style="margin:0 0 24px;">
          <a href="${args.actionUrl}" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;">
            ${args.actionLabel}
          </a>
        </p>
        <p style="font-size:13px;color:#475569;">${args.fallbackNote}</p>
        <p style="word-break:break-all;font-size:12px;color:#64748b;">${args.actionUrl}</p>
      </div>
    `,
  });
}

async function createOneTimeToken(
  ctx: ActionCtx,
  args: { kind: TokenKind; userId: Id<'users'>; email: string; ttlMs: number }
): Promise<string> {
  const rawToken = randomBytes(32).toString('hex');
  const now = Date.now();

  await ctx.runMutation(createTokenRef, {
    kind: args.kind,
    userId: args.userId,
    email: args.email,
    tokenHash: hashToken(rawToken),
    expiresAt: now + args.ttlMs,
    createdAt: now,
  });

  return rawToken;
}

function assertValidTokenRecord(
  tokenRecord: {
    expiresAt: number;
    usedAt?: number;
  } | null
): asserts tokenRecord is { expiresAt: number; usedAt?: number } {
  if (!tokenRecord || tokenRecord.usedAt || tokenRecord.expiresAt <= Date.now()) {
    throw new ConvexError('INVALID_OR_EXPIRED_TOKEN');
  }
}

export const requestPasswordReset = action({
  args: {
    email: v.string(),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    const language = normalizeLang(args.language);

    // Always return success for untrusted/invalid input to prevent account enumeration.
    if (!email || !isLikelyEmail(email)) {
      return { success: true };
    }

    const since = Date.now() - 24 * 60 * 60 * 1000;
    const { count } = await ctx.runQuery(countTokensByEmailRef, {
      email,
      kind: 'password_reset',
      since,
    });
    if (count >= DAILY_REQUEST_LIMIT_PER_EMAIL) {
      return { success: true };
    }

    const user = await ctx.runQuery(getUserByEmailRef, { email });
    if (!user) {
      return { success: true };
    }

    const passwordAccount = await ctx.runQuery(getPasswordAccountRef, { userId: user._id });
    if (!passwordAccount) {
      return { success: true };
    }

    const token = await createOneTimeToken(ctx, {
      kind: 'password_reset',
      userId: user._id,
      email,
      ttlMs: RESET_TOKEN_TTL_MS,
    });
    const resetLink = buildLocalizedLink(language, '/reset-password', token);

    await sendRecoveryEmail({
      to: email,
      subject: 'Reset your Duhan password',
      heading: 'Password reset request',
      description:
        'We received a request to reset your password. If this was you, use the button below to set a new password.',
      actionLabel: 'Reset password',
      actionUrl: resetLink,
      fallbackNote: 'If you did not request this, you can ignore this email.',
    });

    return { success: true };
  },
});

export const confirmPasswordReset = action({
  args: {
    token: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const token = args.token.trim();
    if (!token) {
      throw new ConvexError('INVALID_OR_EXPIRED_TOKEN');
    }
    if (args.newPassword.length < 8) {
      throw new ConvexError('WEAK_PASSWORD');
    }

    const tokenRecord = await ctx.runQuery(findTokenByHashRef, {
      kind: 'password_reset',
      tokenHash: hashToken(token),
    });
    assertValidTokenRecord(tokenRecord);

    const passwordAccount = await ctx.runQuery(getPasswordAccountRef, {
      userId: tokenRecord.userId,
    });
    if (!passwordAccount) {
      throw new ConvexError('PASSWORD_AUTH_NOT_ENABLED');
    }

    await ctx.runMutation(updatePasswordSecretRef, {
      accountId: passwordAccount._id,
      secret: hashSync(args.newPassword, 10),
    });

    await ctx.runMutation(markTokenUsedRef, {
      tokenId: tokenRecord._id,
      usedAt: Date.now(),
    });

    return { success: true };
  },
});

export const requestEmailVerification = action({
  args: {
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError('UNAUTHORIZED');
    }
    const language = normalizeLang(args.language);
    const user = await ctx.runQuery(getUserByIdRef, { userId: userId as Id<'users'> });
    if (!user) {
      throw new ConvexError('USER_NOT_FOUND');
    }
    if (user.emailVerificationTime) {
      return { success: true, alreadyVerified: true };
    }

    const since = Date.now() - 24 * 60 * 60 * 1000;
    const { count } = await ctx.runQuery(countTokensByEmailRef, {
      email: user.email,
      kind: 'email_verify',
      since,
    });
    if (count >= DAILY_REQUEST_LIMIT_PER_EMAIL) {
      return { success: true };
    }

    const token = await createOneTimeToken(ctx, {
      kind: 'email_verify',
      userId: user._id,
      email: user.email,
      ttlMs: VERIFY_TOKEN_TTL_MS,
    });
    const verifyLink = buildLocalizedLink(language, '/verify-email', token);

    await sendRecoveryEmail({
      to: user.email,
      subject: 'Verify your Duhan email',
      heading: 'Email verification',
      description:
        'Please verify your email address to secure your account and enable account recovery.',
      actionLabel: 'Verify email',
      actionUrl: verifyLink,
      fallbackNote: 'If this was not you, you can ignore this email.',
    });

    return { success: true };
  },
});

export const confirmEmailVerification = action({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const token = args.token.trim();
    if (!token) {
      throw new ConvexError('INVALID_OR_EXPIRED_TOKEN');
    }

    const tokenRecord = await ctx.runQuery(findTokenByHashRef, {
      kind: 'email_verify',
      tokenHash: hashToken(token),
    });
    assertValidTokenRecord(tokenRecord);

    await ctx.runMutation(markUserEmailVerifiedRef, {
      userId: tokenRecord.userId,
      now: Date.now(),
    });
    await ctx.runMutation(markTokenUsedRef, {
      tokenId: tokenRecord._id,
      usedAt: Date.now(),
    });

    return { success: true };
  },
});
