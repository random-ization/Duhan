import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getOptionalAuthUserId, getAuthUserId } from "./utils"; // Assuming utils exists, or use logic from annotations.ts

// Helper to resolve user (Copied from annotations.ts logic for consistency)
async function getUser(ctx: any, tokenOrId: string | null): Promise<any | null> {
    if (!tokenOrId) return null;

    // 1. Try by token
    const byToken = await ctx.db.query("users")
        .withIndex("by_token", (q: any) => q.eq("token", tokenOrId))
        .first();
    if (byToken) return byToken;

    // 2. Try as ID
    try {
        const user = await ctx.db.get(tokenOrId as any);
        if (user) return user;
    } catch (e) {
        // ignore invalid id formats
    }

    // 3. Fallback
    return await ctx.db.query("users")
        .withIndex("by_postgresId", (q: any) => q.eq("postgresId", tokenOrId))
        .first();
}

export const getCanvas = query({
    args: {
        targetId: v.string(),
        targetType: v.string(),
        pageIndex: v.number(),
        token: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        let user;
        if (args.token) user = await getUser(ctx, args.token);
        if (!user) {
            const identity = await ctx.auth.getUserIdentity();
            if (identity) user = await getUser(ctx, identity.subject);
        }

        if (!user) return null;

        const layer = await ctx.db
            .query("canvas_layers")
            .withIndex("by_user_target", (q) =>
                q.eq("userId", user._id)
                    .eq("targetId", args.targetId)
                    .eq("pageIndex", args.pageIndex)
            )
            .unique();

        return layer ? { data: layer.data } : null;
    },
});

export const saveCanvas = mutation({
    args: {
        targetId: v.string(),
        targetType: v.string(),
        pageIndex: v.number(),
        data: v.any(),
        token: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        let user;
        if (args.token) user = await getUser(ctx, args.token);
        if (!user) {
            const identity = await ctx.auth.getUserIdentity();
            if (identity) user = await getUser(ctx, identity.subject);
        }

        if (!user) throw new Error("Unauthorized");

        const existing = await ctx.db
            .query("canvas_layers")
            .withIndex("by_user_target", (q) =>
                q.eq("userId", user._id)
                    .eq("targetId", args.targetId)
                    .eq("pageIndex", args.pageIndex)
            )
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, {
                data: args.data,
                updatedAt: Date.now(),
            });
        } else {
            await ctx.db.insert("canvas_layers", {
                userId: user._id,
                targetId: args.targetId,
                targetType: args.targetType,
                pageIndex: args.pageIndex,
                data: args.data,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
        }
        return { success: true };
    },
});
