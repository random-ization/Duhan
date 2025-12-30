import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get annotations for a specific context (courseId_unitId)
export const getByContext = query({
    args: {
        userId: v.string(),
        contextKey: v.string(), // Format: "courseId_unitId"
    },
    handler: async (ctx, args) => {
        const { userId, contextKey } = args;

        // First, find the user by their ID (could be legacy or Convex ID)
        const user = await ctx.db.query("users")
            .withIndex("by_postgresId", q => q.eq("postgresId", userId))
            .first();

        if (!user) {
            return [];
        }

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

// Save a new annotation
export const save = mutation({
    args: {
        userId: v.string(),
        contextKey: v.string(),
        text: v.string(),
        note: v.optional(v.string()),
        color: v.optional(v.string()),
        startOffset: v.optional(v.number()),
        endOffset: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { userId, contextKey, text, note, color, startOffset, endOffset } = args;

        // Find user
        const user = await ctx.db.query("users")
            .withIndex("by_postgresId", q => q.eq("postgresId", userId))
            .first();

        if (!user) {
            throw new Error("User not found");
        }

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
