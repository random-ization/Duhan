import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Get all users with pagination
export const getUsers = query({
    args: {
        page: v.optional(v.number()),
        limit: v.optional(v.number()),
        search: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const page = args.page || 1;
        const limit = args.limit || 10;
        const search = args.search?.toLowerCase() || "";

        // Fetch all users (ideally would use pagination in production)
        let allUsers = await ctx.db.query("users").collect();

        // Filter by search if provided
        if (search) {
            allUsers = allUsers.filter(u =>
                u.email.toLowerCase().includes(search) ||
                u.name.toLowerCase().includes(search)
            );
        }

        const total = allUsers.length;
        const totalPages = Math.ceil(total / limit);

        // Paginate
        const start = (page - 1) * limit;
        const users = allUsers.slice(start, start + limit).map(u => ({
            id: u._id,
            email: u.email,
            name: u.name,
            role: u.role,
            tier: u.tier,
            avatar: u.avatar,
            isVerified: u.isVerified,
            createdAt: u.createdAt,
        }));

        return {
            users,
            total,
            pages: totalPages,
            page,
            limit,
        };
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
        await ctx.db.delete(args.userId);
        return { success: true };
    }
});

// Get institutes (admin list)
export const getInstitutes = query({
    args: {},
    handler: async (ctx) => {
        const institutes = await ctx.db.query("institutes").collect();
        return institutes.map(i => ({
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
        const { legacyId, updates } = args;

        const institute = await ctx.db.query("institutes")
            .withIndex("by_legacy_id", q => q.eq("id", legacyId))
            .first();

        if (!institute) {
            throw new Error("Institute not found");
        }

        await ctx.db.patch(institute._id, updates);
        return { success: true };
    }
});

// Delete institute
export const deleteInstitute = mutation({
    args: {
        legacyId: v.string(),
    },
    handler: async (ctx, args) => {
        const institute = await ctx.db.query("institutes")
            .withIndex("by_legacy_id", q => q.eq("id", args.legacyId))
            .first();

        if (institute) {
            await ctx.db.delete(institute._id);
        }

        return { success: true };
    }
});
