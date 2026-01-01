import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { hashSync } from "bcryptjs";

export const resetPass = internalMutation({
    args: { email: v.string(), newPass: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.db.query("users")
            .withIndex("by_email", q => q.eq("email", args.email))
            .first();

        if (!user) return "User not found";

        const hash = hashSync(args.newPass, 10);
        await ctx.db.patch(user._id, { password: hash });

        return "Password reset successful for " + args.email;
    }
});
