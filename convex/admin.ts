import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { MAX_USER_SEARCH_SCAN, MAX_INSTITUTES_FALLBACK } from "./queryLimits";
import { requireAdmin } from "./utils";

// Get all users with real database pagination
export const getUsers = query({
    args: {
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, args) => {
        const results = await ctx.db
            .query("users")
            .order("desc")
            .paginate(args.paginationOpts);

        return {
            ...results,
            page: results.page.map(u => ({
                id: u._id,
                email: u.email,
                name: u.name,
                role: u.role,
                tier: u.tier,
                avatar: u.avatar,
                isVerified: u.isVerified,
                createdAt: u.createdAt,
            })),
        };
    }
});

// Search users (separate query for search functionality)
export const searchUsers = query({
    args: {
        search: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const limit = args.limit || 20;
        const searchLower = args.search.toLowerCase();

        // OPTIMIZATION: Limit collection to prevent full table scan
        // Collect with a reasonable maximum to prevent query explosion
        const allUsers = await ctx.db
            .query("users")
            .order("desc") // Get most recent users first
            .take(MAX_USER_SEARCH_SCAN);

        const filtered = allUsers
            .filter(u =>
                u.email.toLowerCase().includes(searchLower) ||
                u.name.toLowerCase().includes(searchLower)
            )
            .slice(0, limit)
            .map(u => ({
                id: u._id,
                email: u.email,
                name: u.name,
                role: u.role,
                tier: u.tier,
                avatar: u.avatar,
                isVerified: u.isVerified,
                createdAt: u.createdAt,
            }));

        return filtered;
    }
});

// Update user
export const updateUser = mutation({
    args: {
        userId: v.id("users"),
        updates: v.object({
            name: v.optional(v.string()),
            role: v.optional(v.string()),
            tier: v.optional(v.string()),
            isVerified: v.optional(v.boolean()),
        }),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        const { userId, updates } = args;

        await ctx.db.patch(userId, updates);

        return { success: true };
    }
});

// Delete user
export const deleteUser = mutation({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        await ctx.db.delete(args.userId);
        return { success: true };
    }
});

// Get institutes with real database pagination - excludes archived
export const getInstitutes = query({
    args: {
        paginationOpts: v.optional(paginationOptsValidator),
    },
    handler: async (ctx, args) => {
        // If pagination is provided, use it
        if (args.paginationOpts) {
            const results = await ctx.db
                .query("institutes")
                .withIndex("by_archived", q => q.eq("isArchived", false))
                .paginate(args.paginationOpts);

            return {
                ...results,
                page: results.page.map(i => ({
                    ...i,
                    _id: undefined,
                    id: i.id || i._id,
                })),
            };
        }

        // OPTIMIZATION: Always use pagination, even for backwards compatibility
        // This prevents full table scans
        const results = await ctx.db
            .query("institutes")
            .withIndex("by_archived", q => q.eq("isArchived", false))
            .paginate({ numItems: MAX_INSTITUTES_FALLBACK, cursor: null });
            
        // Return just the page array for backwards compatibility
        return results.page.map(i => ({
            ...i,
            _id: undefined,
            id: i.id || i._id,
        }));
    }
});

// Create institute
export const createInstitute = mutation({
    args: {
        id: v.string(),
        name: v.string(),
        levels: v.string(),
        coverUrl: v.optional(v.string()),
        themeColor: v.optional(v.string()),
        publisher: v.optional(v.string()),
        displayLevel: v.optional(v.string()),
        totalUnits: v.optional(v.number()),
        volume: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        const instituteId = await ctx.db.insert("institutes", args);
        return { id: instituteId, success: true };
    }
});

// Update institute
export const updateInstitute = mutation({
    args: {
        legacyId: v.string(),
        updates: v.object({
            name: v.optional(v.string()),
            levels: v.optional(v.string()),
            coverUrl: v.optional(v.string()),
            themeColor: v.optional(v.string()),
            publisher: v.optional(v.string()),
            displayLevel: v.optional(v.string()),
            totalUnits: v.optional(v.number()),
            volume: v.optional(v.string()),
        }),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        const { legacyId, updates } = args;

        const institute = await ctx.db.query("institutes")
            .withIndex("by_legacy_id", q => q.eq("id", legacyId))
            .first();

        if (!institute) {
            throw new ConvexError({ code: "INSTITUTE_NOT_FOUND" });
        }

        await ctx.db.patch(institute._id, updates);
        return { success: true };
    }
});

// Delete institute (soft delete)
export const deleteInstitute = mutation({
    args: {
        legacyId: v.string(),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        const institute = await ctx.db.query("institutes")
            .withIndex("by_legacy_id", q => q.eq("id", args.legacyId))
            .first();

        if (institute) {
            // Soft delete - set isArchived to true
            await ctx.db.patch(institute._id, { isArchived: true });
        }

        return { success: true };
    }
});
