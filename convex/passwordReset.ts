'use node';
import { action } from './_generated/server';
import { v } from 'convex/values';
import crypto from 'node:crypto';
import { Resend } from 'resend';
import { toErrorMessage } from './errors';
import { hashSync } from 'bcryptjs';
import { makeFunctionReference } from 'convex/server';
import type { FunctionReference } from 'convex/server';
import type { Id } from './_generated/dataModel';

const RESET_TTL_MS = 60 * 60 * 1000;

const hashSecret = async (password: string): Promise<string> => {
  return hashSync(password, 10);
};

export const requestPasswordReset = action({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();

    const getUserByEmail = makeFunctionReference<
      'query',
      { email: string },
      { _id: Id<'users'>; resetToken?: string; resetTokenExpires?: number; email: string } | null
    >('passwordResetMutations:getUserByEmail') as unknown as FunctionReference<
      'query',
      'internal',
      { email: string },
      { _id: Id<'users'>; resetToken?: string; resetTokenExpires?: number; email: string } | null
    >;

    const setPasswordResetToken = makeFunctionReference<
      'mutation',
      { userId: Id<'users'>; resetToken: string; resetTokenExpires: number },
      { success: boolean }
    >('passwordResetMutations:setPasswordResetToken') as unknown as FunctionReference<
      'mutation',
      'internal',
      { userId: Id<'users'>; resetToken: string; resetTokenExpires: number },
      { success: boolean }
    >;

    const user = await ctx.runQuery(getUserByEmail, { email });
    if (!user) {
      return { success: true };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = Date.now() + RESET_TTL_MS;

    await ctx.runMutation(setPasswordResetToken, {
      userId: user._id,
      resetToken,
      resetTokenExpires,
    });

    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      return { success: true };
    }
    const emailFrom = process.env.EMAIL_FROM || 'onboarding@resend.dev';
    const appUrl = process.env.VITE_APP_URL || process.env.SITE_URL || 'http://localhost:5173';
    const resetUrl = `${appUrl}/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(resetToken)}`;

    try {
      const resend = new Resend(resendApiKey);
      await resend.emails.send({
        from: emailFrom,
        to: email,
        subject: 'Reset your password',
        html: `<p>Click the link to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
      });
    } catch (error: unknown) {
      console.error('[PasswordReset] Failed to send email:', toErrorMessage(error));
    }

    return { success: true };
  },
});

export const resetPassword = action({
  args: {
    email: v.string(),
    token: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    const token = args.token.trim();
    if (!token) return { success: false, error: 'INVALID_TOKEN' };

    const getUserByEmail = makeFunctionReference<
      'query',
      { email: string },
      { _id: Id<'users'>; resetToken?: string; resetTokenExpires?: number; email: string } | null
    >('passwordResetMutations:getUserByEmail') as unknown as FunctionReference<
      'query',
      'internal',
      { email: string },
      { _id: Id<'users'>; resetToken?: string; resetTokenExpires?: number; email: string } | null
    >;

    const getPasswordAccount = makeFunctionReference<
      'query',
      { userId: Id<'users'> },
      { _id: Id<'authAccounts'>; secret?: string | null } | null
    >('passwordResetMutations:getPasswordAccount') as unknown as FunctionReference<
      'query',
      'internal',
      { userId: Id<'users'> },
      { _id: Id<'authAccounts'>; secret?: string | null } | null
    >;

    const updatePasswordAccountSecret = makeFunctionReference<
      'mutation',
      { authAccountId: Id<'authAccounts'>; newSecret: string },
      { success: boolean }
    >('passwordResetMutations:updatePasswordAccountSecret') as unknown as FunctionReference<
      'mutation',
      'internal',
      { authAccountId: Id<'authAccounts'>; newSecret: string },
      { success: boolean }
    >;

    const clearPasswordResetToken = makeFunctionReference<
      'mutation',
      { userId: Id<'users'> },
      { success: boolean }
    >('passwordResetMutations:clearPasswordResetToken') as unknown as FunctionReference<
      'mutation',
      'internal',
      { userId: Id<'users'> },
      { success: boolean }
    >;

    const user = await ctx.runQuery(getUserByEmail, { email });
    if (!user) return { success: false, error: 'USER_NOT_FOUND' };

    const storedToken = user.resetToken;
    const expiresMs = user.resetTokenExpires;
    if (!storedToken || storedToken !== token) return { success: false, error: 'INVALID_TOKEN' };
    if (!expiresMs || !Number.isFinite(expiresMs) || Date.now() > expiresMs) {
      return { success: false, error: 'TOKEN_EXPIRED' };
    }

    const authAccount = await ctx.runQuery(getPasswordAccount, { userId: user._id });
    if (!authAccount) return { success: false, error: 'NO_PASSWORD_ACCOUNT' };

    const newSecret = await hashSecret(args.newPassword);
    await ctx.runMutation(updatePasswordAccountSecret, {
      authAccountId: authAccount._id,
      newSecret,
    });
    await ctx.runMutation(clearPasswordResetToken, { userId: user._id });

    return { success: true };
  },
});
