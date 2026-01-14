import { internalQuery } from "./_generated/server";

export const checkUsers = internalQuery({
    handler: async (ctx) => {
        const users = await ctx.db.query("users").order("desc").take(5);
        const authAccounts = await ctx.db.query("authAccounts").take(5);
        const authSessions = await ctx.db.query("authSessions").take(5);
        console.log("DEBUG SITE_URL:", process.env.SITE_URL);
        return {
            siteUrl: process.env.SITE_URL,
            users,
            authAccounts,
            authSessions
        };
    },
});
