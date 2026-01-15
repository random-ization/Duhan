import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getOptionalAuthUserId, getAuthUserId } from "./utils";

export const getCanvas = query({
    args: {
        targetId: v.string(),
        targetType: v.string(),
        pageIndex: v.number(),
    },
    handler: async (ctx, args) => {
        const userId = await getOptionalAuthUserId(ctx);
        if (!userId) return null;

        const layer = await ctx.db
            .query("canvas_layers")
            .withIndex("by_user_target", (q) =>
                q.eq("userId", userId)
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
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);

        const existing = await ctx.db
            .query("canvas_layers")
            .withIndex("by_user_target", (q) =>
                q.eq("userId", userId)
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
                userId,
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
