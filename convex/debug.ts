import { query, internalQuery } from "./_generated/server";

export const checkHashes = internalQuery({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.db.query("users").take(50);
        return users.map(u => ({
            email: u.email,
            hashFormat: !u.password ? "NULL" :
                u.password.startsWith("$2") ? "BCRYPT" :
                    u.password.length < 20 ? "SHORT/SIMPLE" :
                        "UNKNOWN/PLAINTEXT",
            hashStart: u.password ? u.password.substring(0, 7) : "N/A"
        }));
    }
});
