import { QueryCtx, MutationCtx } from "./_generated/server";
import { ConvexError } from "convex/values";

/**
 * Get authenticated user ID from context.
 * Throws ConvexError with code 'UNAUTHORIZED' if not authenticated.
 */
export async function getAuthUserId(ctx: QueryCtx | MutationCtx): Promise<string> {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
        throw new ConvexError({ code: "UNAUTHORIZED" });
    }

    const user = await getUserByTokenOrId(ctx, identity.subject);
    if (!user) {
        throw new ConvexError({ code: "UNAUTHORIZED" });
    }
    return user._id;
}

/**
 * Get authenticated user ID if available, returns null if not authenticated.
 * Use this for queries that should work for both authenticated and unauthenticated users.
 */
export async function getOptionalAuthUserId(ctx: QueryCtx | MutationCtx): Promise<string | null> {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await getUserByTokenOrId(ctx, identity.subject);
    return user?._id ?? null;
}

/**
 * Robust User Resolver: Tries Token -> Auth Identity -> ID -> PostgresID
 * This bridges the gap between the Shim (Shim Token) and Native Auth
 */
export async function getUserByTokenOrId(ctx: any, tokenOrId: string | null | undefined): Promise<any | null> {
    // 1. Try provided token/ID argument first
    if (tokenOrId) {
        // Try by token (Secure/Recent)
        const byToken = await ctx.db.query("users")
            .withIndex("by_token", q => q.eq("token", tokenOrId))
            .first();
        if (byToken) return byToken;

        // Try as ID (Legacy internal)
        try {
            const user = await ctx.db.get(tokenOrId as any);
            if (user) return user;
        } catch (e) { /* ignore invalid id */ }

        // Try as PostgresID (Migration)
        const byPostgres = await ctx.db.query("users")
            .withIndex("by_postgresId", q => q.eq("postgresId", tokenOrId))
            .first();
        if (byPostgres) return byPostgres;
    }

    // 2. Fallback to Context Auth (Native Client)
    const identity = await ctx.auth.getUserIdentity();
    if (identity) {
        const userByToken = await ctx.db.query("users").withIndex("by_token", q => q.eq("token", identity.subject)).first();
        if (userByToken) return userByToken;

        try {
            const userById = await ctx.db.get(identity.subject as any);
            if (userById) return userById;
        } catch (e) {
            // subject was not a Convex document id
        }

        const userByPostgres = await ctx.db.query("users").withIndex("by_postgresId", q => q.eq("postgresId", identity.subject)).first();
        if (userByPostgres) return userByPostgres;
    }

    return null;
}

/**
 * Require Admin Role
 * Throws ConvexError if user is not authenticated or not an admin.
 */
export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
    const userId = await getAuthUserId(ctx);
    const finalUser = await ctx.db.get(userId as any);

    if (!finalUser || finalUser.role !== 'ADMIN') {
        throw new ConvexError({ code: "FORBIDDEN", message: "Admin access required" });
    }

    return finalUser;
}
