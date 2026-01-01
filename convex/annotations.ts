import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getOptionalAuthUserId } from "./utils";

// Get annotations for a specific context (courseId_unitId)
export const getByContext = query({
    args: {
        token: v.optional(v.string()), // Added token support
        contextKey: v.string(), // Format: "courseId_unitId"
    },
    handler: async (ctx, args) => {
        let user;

        // 1. Try via token arg
        if (args.token) {
            user = await getUser(ctx, args.token);
        }

        // 2. Fallback to Auth
        if (!user) {
            const identity = await ctx.auth.getUserIdentity();
            if (identity) {
                user = await getUser(ctx, identity.subject);
            }
        }

        if (!user) return [];

        const { contextKey } = args;

        const annotations = await ctx.db.query("annotations")
            .withIndex("by_user_context", q => q.eq("userId", user._id).eq("contextKey", contextKey))
            .collect();

        return annotations.map(a => ({
            id: a._id,
            text: a.text,
            note: a.note,
            color: a.color,
            startOffset: a.startOffset,
            endOffset: a.endOffset,
            createdAt: a.createdAt,
        }));
    }
});

// Helper to resolve user ID safely (via Token or ID)
async function getUser(ctx: any, tokenOrId: string | null): Promise<any | null> {
    if (!tokenOrId) return null;

    // 1. Try by token (Preferred/Secure)
    const byToken = await ctx.db.query("users")
        .withIndex("by_token", q => q.eq("token", tokenOrId))
        .first();
    if (byToken) return byToken;

    // 2. Try as proper ID (Legacy/Internal)
    try {
        const user = await ctx.db.get(tokenOrId as any);
        if (user) return user;
    } catch (e) {
        // invalid id format, ignore
    }

    // 3. Fallback to postgresId
    return await ctx.db.query("users")
        .withIndex("by_postgresId", q => q.eq("postgresId", tokenOrId))
        .first();
}

// Save a new annotation
export const save = mutation({
    args: {
        token: v.optional(v.string()), // Added token support
        contextKey: v.string(),
        text: v.string(),
        note: v.optional(v.string()),
        color: v.optional(v.string()),
        startOffset: v.optional(v.number()),
        endOffset: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        let user;

        // 1. Try resolving via token arg first (shim client)
        if (args.token) {
            user = await getUser(ctx, args.token);
        }

        // 2. Fallback to Convex Auth (native client)
        if (!user) {
            const identity = await ctx.auth.getUserIdentity();
            if (identity) {
                user = await getUser(ctx, identity.subject);
            }
        }

        if (!user) {
            throw new ConvexError({ code: "UNAUTHORIZED" });
        }

        const { contextKey, text, note, color, startOffset, endOffset } = args;

        const annotationId = await ctx.db.insert("annotations", {
            userId: user._id,
            contextKey,
            targetType: "TEXTBOOK",
            text,
            note,
            color,
            startOffset,
            endOffset,
            createdAt: Date.now(),
        });

        return { id: annotationId, success: true };
    }
});

// Delete an annotation
export const remove = mutation({
    args: {
        annotationId: v.id("annotations"),
    },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.annotationId);
        return { success: true };
    }
});

// Update an annotation
export const update = mutation({
    args: {
        annotationId: v.id("annotations"),
        note: v.optional(v.string()),
        color: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { annotationId, note, color } = args;

        const updates: any = {};
        if (note !== undefined) updates.note = note;
        if (color !== undefined) updates.color = color;

        await ctx.db.patch(annotationId, updates);
        return { success: true };
    }
});
