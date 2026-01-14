import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const fixDuplicateUsers = internalMutation({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        const users = await ctx.db
            .query("users")
            .withIndex("email", (q) => q.eq("email", args.email))
            .collect();

        if (users.length < 2) {
            return "No duplicate users found for this email.";
        }

        // Sort: Oldest first (Target), Newest last (Source)
        users.sort((a, b) => a._creationTime - b._creationTime);

        const oldUser = users[0];
        const newUser = users[users.length - 1]; // The one just created by Auth

        console.log(`Merging New User ${newUser._id} into Old User ${oldUser._id}`);

        // 1. Move Auth Accounts
        const authAccounts = await ctx.db
            .query("authAccounts")
            .filter(q => q.eq(q.field("userId"), newUser._id))
            .collect();

        for (const acc of authAccounts) {
            await ctx.db.patch(acc._id, { userId: oldUser._id });
        }

        // 2. Move Auth Sessions
        const authSessions = await ctx.db
            .query("authSessions")
            .filter(q => q.eq(q.field("userId"), newUser._id))
            .collect();

        for (const sess of authSessions) {
            await ctx.db.patch(sess._id, { userId: oldUser._id });
        }

        // 3. Delete New User
        await ctx.db.delete(newUser._id);

        return `Successfully merged user ${newUser._id} into ${oldUser._id}. Refreshed ${authSessions.length} sessions.`;
    },
});
