import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";

// Simple password hashing (in production, use bcrypt via action)
function hashPassword(password: string): string {
    // Simplified hash - in production, use bcrypt in an action
    return Buffer.from(password).toString('base64');
}

function verifyPassword(password: string, hash: string): boolean {
    return hashPassword(password) === hash;
}

// Register a new user
export const register = mutation({
    args: {
        name: v.optional(v.string()),
        email: v.string(),
        password: v.string(),
    },
    handler: async (ctx, args) => {
        const { email, password, name } = args;

        // Check if user already exists
        const existing = await ctx.db.query("users")
            .withIndex("by_email", q => q.eq("email", email))
            .first();

        if (existing) {
            throw new Error("User already exists with this email");
        }

        // Create user
        const userId = await ctx.db.insert("users", {
            email,
            password: hashPassword(password),
            name: name || email.split('@')[0],
            role: "STUDENT",
            tier: "FREE",
            isVerified: false,
            createdAt: Date.now(),
        });

        return {
            userId,
            message: "Registration successful"
        };
    }
});

// Login
export const login = mutation({
    args: {
        email: v.string(),
        password: v.string(),
    },
    handler: async (ctx, args) => {
        const { email, password } = args;

        const user = await ctx.db.query("users")
            .withIndex("by_email", q => q.eq("email", email))
            .first();

        if (!user) {
            throw new Error("Invalid email or password");
        }

        if (!verifyPassword(password, user.password)) {
            throw new Error("Invalid email or password");
        }

        // In production, generate JWT token here
        // For now, return user data
        return {
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                tier: user.tier,
                avatar: user.avatar,
            },
            // Token would be generated here in production
        };
    }
});

// Get current user by ID
export const getMe = query({
    args: {
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        const { userId } = args;

        // Try Convex ID first
        let user = null;
        try {
            user = await ctx.db.get(userId as any);
        } catch {
            // Not a valid Convex ID, try postgresId
            user = await ctx.db.query("users")
                .withIndex("by_postgresId", q => q.eq("postgresId", userId))
                .first();
        }

        if (!user) {
            return null;
        }

        return {
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
            tier: user.tier,
            avatar: user.avatar,
            isVerified: user.isVerified,
        };
    }
});

// Google login/signup
export const googleAuth = mutation({
    args: {
        googleId: v.string(),
        email: v.string(),
        name: v.optional(v.string()),
        avatar: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { googleId, email, name, avatar } = args;

        // Check if user exists by googleId
        let user = await ctx.db.query("users")
            .withIndex("by_googleId", q => q.eq("googleId", googleId))
            .first();

        if (!user) {
            // Check by email
            user = await ctx.db.query("users")
                .withIndex("by_email", q => q.eq("email", email))
                .first();

            if (user) {
                // Link Google account to existing user
                await ctx.db.patch(user._id, { googleId, avatar });
            } else {
                // Create new user
                const userId = await ctx.db.insert("users", {
                    email,
                    password: "", // No password for Google users
                    name: name || email.split('@')[0],
                    googleId,
                    avatar,
                    role: "STUDENT",
                    tier: "FREE",
                    isVerified: true, // Google users are verified
                    createdAt: Date.now(),
                });
                user = await ctx.db.get(userId);
            }
        }

        if (!user) {
            throw new Error("Failed to create or find user");
        }

        return {
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                role: user.role,
                tier: user.tier,
                avatar: user.avatar,
            },
        };
    }
});

// Update user profile
export const updateProfile = mutation({
    args: {
        userId: v.string(),
        name: v.optional(v.string()),
        avatar: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { userId, name, avatar } = args;

        let user = null;
        try {
            user = await ctx.db.get(userId as any);
        } catch {
            user = await ctx.db.query("users")
                .withIndex("by_postgresId", q => q.eq("postgresId", userId))
                .first();
        }

        if (!user) {
            throw new Error("User not found");
        }

        const updates: any = {};
        if (name !== undefined) updates.name = name;
        if (avatar !== undefined) updates.avatar = avatar;

        await ctx.db.patch(user._id, updates);

        return { success: true };
    }
});

// Change password
export const changePassword = mutation({
    args: {
        userId: v.string(),
        currentPassword: v.string(),
        newPassword: v.string(),
    },
    handler: async (ctx, args) => {
        const { userId, currentPassword, newPassword } = args;

        let user = null;
        try {
            user = await ctx.db.get(userId as any);
        } catch {
            user = await ctx.db.query("users")
                .withIndex("by_postgresId", q => q.eq("postgresId", userId))
                .first();
        }

        if (!user) {
            throw new Error("User not found");
        }

        if (!verifyPassword(currentPassword, user.password)) {
            throw new Error("Current password is incorrect");
        }

        await ctx.db.patch(user._id, {
            password: hashPassword(newPassword),
        });

        return { success: true };
    }
});
