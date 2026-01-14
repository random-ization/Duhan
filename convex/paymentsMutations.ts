import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Internal mutation to grant premium access
export const grantAccess = internalMutation({
    args: {
        customerEmail: v.string(),
        plan: v.string(),
        creemCustomerId: v.optional(v.string()),
        creemSubscriptionId: v.optional(v.string()),
        lemonSqueezyCustomerId: v.optional(v.string()),
        lemonSqueezySubscriptionId: v.optional(v.string()),
        userId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        let user;
        if (args.userId) {
            user = await ctx.db.get(args.userId as any);
        }

        if (!user) {
            // Fallback to email lookup
            user = await ctx.db.query("users")
                .withIndex("email", q => q.eq("email", args.customerEmail))
                .first();
        }

        if (!user) {
            console.error(`User not found for email: ${args.customerEmail} or id: ${args.userId}`);
            return { success: false, error: "User not found" };
        }

        // Calculate expiry based on plan
        let subscriptionExpiry: string | undefined;
        if (args.plan === "LIFETIME") {
            subscriptionExpiry = undefined; // No expiry for lifetime
        } else if (args.plan === "ANNUAL") {
            subscriptionExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
        } else {
            // Monthly
            subscriptionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        }

        await ctx.db.patch(user._id, {
            tier: "PREMIUM",
            subscriptionType: args.plan,
            subscriptionExpiry,
        });

        console.log(`Granted ${args.plan} access to ${args.customerEmail}`);
        return { success: true };
    }
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
            user = await ctx.db.get(args.userId as any);
        }

        if (!user) {
            user = await ctx.db.query("users")
                .withIndex("email", q => q.eq("email", args.customerEmail))
                .first();
        }

        if (!user) {
            console.error(`User not found for email: ${args.customerEmail}`);
            return { success: false };
        }

        await ctx.db.patch(user._id, {
            tier: "FREE",
            subscriptionType: undefined,
            subscriptionExpiry: undefined,
        });

        console.log(`Revoked access from ${args.customerEmail}`);
        return { success: true };
    }
});
