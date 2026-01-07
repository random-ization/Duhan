import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getAll = query({
    args: {},
    handler: async (ctx) => {
        const publishers = await ctx.db.query("publishers").collect();
        return await Promise.all(
            publishers.map(async (p) => {
                let url = p.imageUrl;
                if (url && !url.startsWith("http")) {
                    // Assume it's a storage ID
                    url = (await ctx.storage.getUrl(url)) || undefined;
                }
                return { ...p, imageUrl: url };
            })
        );
    },
});

export const save = mutation({
    args: {
        name: v.string(),
        imageUrl: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("publishers")
            .withIndex("by_name", (q) => q.eq("name", args.name))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                imageUrl: args.imageUrl,
            });
        } else {
            await ctx.db.insert("publishers", {
                name: args.name,
                imageUrl: args.imageUrl,
            });
        }
    },
});

export const generateUploadUrl = mutation(async (ctx) => {
    return await ctx.storage.generateUploadUrl();
});
