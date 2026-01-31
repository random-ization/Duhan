import { QueryCtx, MutationCtx } from "./_generated/server";
import { ConvexError } from "convex/values";
import { Id } from "./_generated/dataModel";
import { getAuthUserId as convexGetAuthUserId } from "@convex-dev/auth/server";

/**
 * Get authenticated user ID from context.
 * Uses @convex-dev/auth JWT-based authentication.
 * Throws ConvexError with code 'UNAUTHORIZED' if not authenticated.
 */
export async function getAuthUserId(ctx: QueryCtx | MutationCtx): Promise<Id<"users">> {
    const userId = await convexGetAuthUserId(ctx);
    if (!userId) {
        throw new ConvexError({ code: "UNAUTHORIZED" });
    }
    return userId as Id<"users">;
}

/**
 * Get authenticated user ID if available, returns null if not authenticated.
 * Use this for queries that should work for both authenticated and unauthenticated users.
 */
export async function getOptionalAuthUserId(ctx: QueryCtx | MutationCtx): Promise<Id<"users"> | null> {
    const userId = await convexGetAuthUserId(ctx);
    return userId as Id<"users"> | null;
}

/**
 * Require Admin Role
 * Throws ConvexError if user is not authenticated or not an admin.
 */
export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
    const userId = await getAuthUserId(ctx);
    const user = await ctx.db.get(userId);

    if (user?.role !== 'ADMIN') {
        throw new ConvexError({ code: "FORBIDDEN", message: "Admin access required" });
    }

    return user;
}

