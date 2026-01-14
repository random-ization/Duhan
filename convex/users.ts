import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const viewer = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        console.log("Viewer Query - Auth User ID:", userId);
        if (!userId) {
            return null;
        }
        const user = await ctx.db.get(userId);
        console.log("Viewer Query - DB User:", user);
        if (!user) {
            return null;
        }
        return user;
    },
});
