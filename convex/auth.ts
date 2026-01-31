import Google from '@auth/core/providers/google';
import Kakao from '@auth/core/providers/kakao';
import { Password } from '@convex-dev/auth/providers/Password';
import { convexAuth, getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { compareSync, hashSync } from 'bcryptjs';

// Custom bcrypt crypto for Password provider (to match legacy password hashes)
const bcryptCrypto = {
  async hashSecret(password: string): Promise<string> {
    return hashSync(password, 10);
  },
  async verifySecret(password: string, storedHash: string): Promise<boolean> {
    return compareSync(password, storedHash);
  },
};

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Google,
    (options: Record<string, unknown>) =>
      Kakao({
        ...options,
        authorization: {
          params: {
            scope: 'account_email profile_nickname profile_image',
          },
        },
        profile(profile) {
          const email = profile?.kakao_account?.email;
          if (!email || typeof email !== 'string') {
            throw new Error('KAKAO_EMAIL_REQUIRED');
          }
          return {
            id: String(profile.id),
            email: email.trim().toLowerCase(),
          };
        },
      }),
    Password({
      id: 'password', // Explicitly set provider ID
      crypto: bcryptCrypto,
      profile(params) {
        const email = ((params.email as string) || '').trim().toLowerCase();
        return {
          email,
        };
      },
    }),
  ],
  callbacks: {
    async redirect({ redirectTo }) {
      // Whitelist allowed frontend domains
      const allowedOrigins = [
        'https://koreanstudy.me',
        'https://www.koreanstudy.me',
        'http://localhost:5173',
        'http://localhost:3000',
      ];

      try {
        const url = new URL(redirectTo);
        if (allowedOrigins.includes(url.origin)) {
          return redirectTo;
        }
      } catch {
        // Invalid URL or relative path
      }

      // Fallback to SITE_URL (backend)
      return process.env.SITE_URL!;
    },
    async createOrUpdateUser(ctx, args) {
      const email =
        typeof args.profile.email === 'string'
          ? args.profile.email.trim().toLowerCase()
          : undefined;

      if (!email) {
        throw new Error('EMAIL_REQUIRED');
      }

      let userId = args.existingUserId;
      let isLinking = false;
      try {
        const currentUserId = await getAuthUserId(ctx);
        if (currentUserId) {
          userId = currentUserId;
          isLinking = true;
        }
      } catch {
        isLinking = false;
      }

      const emailVerified = args.profile.emailVerified === true;

      // 1. Update existing user if we have an ID
      if (userId) {
        return await updateExistingUser(ctx, userId, emailVerified);
      }

      // 2. Check for existing account with same email (if not linking)
      const existingByEmail = await ctx.db
        .query('users')
        .filter(q => q.eq(q.field('email'), email))
        .take(1);

      if (!isLinking && existingByEmail.length > 0) {
        throw new Error('ACCOUNT_EXISTS_LINK_REQUIRED');
      }

      // 3. Create new user
      return await createNewUser(ctx, email, emailVerified, args);
    },
  },
});



export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const updates: { name?: string; avatar?: string } = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.avatar !== undefined) updates.avatar = args.avatar;

    await ctx.db.patch(userId, updates);
  },
});

export const syncProfileFromIdentity = mutation({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const user = await ctx.db.get(userId);
    if (!user) throw new Error('User not found');

    if (user.name && user.avatar) return { updated: false };

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { updated: false };

    const picture =
      (identity as { pictureUrl?: string; picture?: string }).pictureUrl ??
      (identity as { picture?: string }).picture;

    const updates: { name?: string; avatar?: string } = {};
    if (!user.name && identity.name) updates.name = identity.name;
    if (!user.avatar && picture) updates.avatar = picture;

    if (Object.keys(updates).length === 0) return { updated: false };

    await ctx.db.patch(userId, updates);
    return { updated: true };
  },
});

export const linkedAuthAccounts = query({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const accounts = await ctx.db
      .query('authAccounts')
      .withIndex('userIdAndProvider', q => q.eq('userId', userId))
      .collect();

    return accounts.map(account => ({
      id: account._id,
      provider: account.provider,
    }));
  },
});

export const unlinkAuthProvider = mutation({
  args: {
    provider: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const accounts = await ctx.db
      .query('authAccounts')
      .withIndex('userIdAndProvider', q => q.eq('userId', userId))
      .collect();

    const target = accounts.find(account => account.provider === args.provider);
    if (!target) {
      throw new Error('ACCOUNT_NOT_FOUND');
    }
    if (accounts.length <= 1) {
      throw new Error('LAST_AUTH_METHOD');
    }

    await ctx.db.delete(target._id);
    return { success: true };
  },
});

export const changePassword = mutation({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Not authenticated');

    const user = await ctx.db.get(userId);
    if (!user) throw new Error('User not found');

    // Use the same lookup logic as the Password provider to find the account
    // We look for an account associated with this user and the "password" provider
    const account = await ctx.db
      .query('authAccounts')
      .withIndex('userIdAndProvider', q => q.eq('userId', userId).eq('provider', 'password'))
      .unique();

    if (!account) {
      throw new Error('No password account found. You might have signed in with Google.');
    }

    // Verify current password
    if (!account.secret) {
      throw new Error('Account has no password set.');
    }

    const isValid = await bcryptCrypto.verifySecret(args.currentPassword, account.secret);
    if (!isValid) {
      throw new Error('INCORRECT_PASSWORD');
    }

    // Hash new password
    const newSecret = await bcryptCrypto.hashSecret(args.newPassword);

    // Update account
    await ctx.db.patch(account._id, {
      secret: newSecret,
    });
  },
});

// --- Helper Functions ---

// Refactored to reduce complexity
async function updateExistingUser(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any, // Using any for ctx here as inferred types from convexAuth callbacks are complex to import manually
  userId: string,
  emailVerified: boolean
) {
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  const updates: Record<string, unknown> = {};
  if (emailVerified && !user.emailVerificationTime) {
    updates.emailVerificationTime = Date.now();
  }

  if (Object.keys(updates).length > 0) {
    await ctx.db.patch(userId, updates);
  }
  return userId;
}

async function createNewUser(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  email: string,
  emailVerified: boolean,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any
) {
  const providerId = (args.provider as { id?: string } | undefined)?.id;
  const isPasswordProvider = providerId === 'password';

  const insertData: Record<string, unknown> = {
    email,
    ...(emailVerified ? { emailVerificationTime: Date.now() } : null),
    createdAt: Date.now(),
    tier: 'FREE',
  };

  if (isPasswordProvider && typeof args.profile.name === 'string') {
    const name = args.profile.name.trim();
    if (name) {
      insertData.name = name;
    }
  }

  return await ctx.db.insert('users', insertData);
}
