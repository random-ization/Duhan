import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Save or update a site setting
 */
export const saveSetting = mutation({
    args: {
        key: v.string(),
        value: v.any(),
    },
    handler: async (ctx, args) => {
        const { key, value } = args;

        const existing = await ctx.db.query("site_settings")
            .withIndex("by_key", q => q.eq("key", key))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                value,
                updatedAt: Date.now(),
            });
        } else {
            await ctx.db.insert("site_settings", {
                key,
                value,
                updatedAt: Date.now(),
            });
        }
    },
});

/**
 * Get a specific setting by key
 */
export const getSetting = query({
    args: { key: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db.query("site_settings")
            .withIndex("by_key", q => q.eq("key", args.key))
            .first();
    },
});

/**
 * DEBUG: List all settings
 */
export const debugListSettings = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("site_settings").collect();
    },
});

/**
 * Save the logo storage ID specifically
 */
export const saveLogo = mutation({
    args: { storageId: v.string() },
    handler: async (ctx, args) => {
        // We can reuse the generic saveSetting logic, but exposing a specific mutation
        // makes it easier to call from specific UI components or scripts if needed.
        const existing = await ctx.db.query("site_settings")
            .withIndex("by_key", q => q.eq("key", "logo"))
            .first();

        const value = { storageId: args.storageId, url: await ctx.storage.getUrl(args.storageId) };

        if (existing) {
            await ctx.db.patch(existing._id, {
                value,
                updatedAt: Date.now(),
            });
        } else {
            await ctx.db.insert("site_settings", {
                key: "logo",
                value,
                updatedAt: Date.now(),
            });
        }
    },
});
