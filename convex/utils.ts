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
    return identity.subject;
}

/**
 * Get authenticated user ID if available, returns null if not authenticated.
 * Use this for queries that should work for both authenticated and unauthenticated users.
 */
export async function getOptionalAuthUserId(ctx: QueryCtx | MutationCtx): Promise<string | null> {
    const identity = await ctx.auth.getUserIdentity();
    return identity?.subject ?? null;
}
