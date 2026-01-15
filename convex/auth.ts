import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { compareSync, hashSync } from "bcryptjs";

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
        Password({
            id: "password", // Explicitly set provider ID
            crypto: bcryptCrypto,
            profile(params) {
                const email = (params.email as string || "").trim().toLowerCase();
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
                "https://koreanstudy.me",
                "https://www.koreanstudy.me",
                "http://localhost:5173",
                "http://localhost:3000"
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
    },
});

import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const updateProfile = mutation({
    args: {
        name: v.optional(v.string()),
        avatar: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const updates: any = {};
        if (args.name !== undefined) updates.name = args.name;
        if (args.avatar !== undefined) updates.avatar = args.avatar;

        await ctx.db.patch(userId, updates);
    },
});

export const changePassword = mutation({
    args: {
        currentPassword: v.string(),
        newPassword: v.string(),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const user = await ctx.db.get(userId);
        if (!user) throw new Error("User not found");

        // Use the same lookup logic as the Password provider to find the account
        // We look for an account associated with this user and the "password" provider
        const account = await ctx.db
            .query("authAccounts")
            .withIndex("userIdAndProvider", (q) =>
                q.eq("userId", userId).eq("provider", "password")
            )
            .unique();

        if (!account) {
            throw new Error("No password account found. You might have signed in with Google.");
        }

        // Verify current password
        if (!account.secret) {
            throw new Error("Account has no password set.");
        }

        const isValid = await bcryptCrypto.verifySecret(args.currentPassword, account.secret);
        if (!isValid) {
            throw new Error("INCORRECT_PASSWORD");
        }

        // Hash new password
        const newSecret = await bcryptCrypto.hashSecret(args.newPassword);

        // Update account
        await ctx.db.patch(account._id, {
            secret: newSecret,
        });
    },
});
