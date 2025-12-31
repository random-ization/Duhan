import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getOptionalAuthUserId } from "./utils";

// Get annotations for a specific context (courseId_unitId)
export const getByContext = query({
    args: {
        contextKey: v.string(), // Format: "courseId_unitId"
    },
    handler: async (ctx, args) => {
        const identitySubject = await getOptionalAuthUserId(ctx);
        if (!identitySubject) return [];

        const { contextKey } = args;

        // Find the user by their subject (Convex auth ID)
        // Try to match by token or fall back to postgresId for legacy
        let user = await ctx.db.query("users")
            .withIndex("by_token", q => q.eq("token", identitySubject))
            .first();

        if (!user) {
            // Fall back to finding by postgresId
            user = await ctx.db.query("users")
                .withIndex("by_postgresId", q => q.eq("postgresId", identitySubject))
                .first();
        }

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
        contextKey: v.string(),
        text: v.string(),
        note: v.optional(v.string()),
        color: v.optional(v.string()),
        startOffset: v.optional(v.number()),
        endOffset: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new ConvexError({ code: "UNAUTHORIZED" });

        const { contextKey, text, note, color, startOffset, endOffset } = args;

        // Find user by identity subject
        let user = await ctx.db.query("users")
            .withIndex("by_token", q => q.eq("token", identity.subject))
            .first();

        if (!user) {
            user = await ctx.db.query("users")
                .withIndex("by_postgresId", q => q.eq("postgresId", identity.subject))
                .first();
        }

        if (!user) {
            throw new ConvexError({ code: "USER_NOT_FOUND" });
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
