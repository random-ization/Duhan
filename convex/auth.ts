import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Simple password encoding (in production, use proper hashing via HTTP action)
function hashPassword(password: string): string {
    // Simple reversible encoding for development
    // In production, use bcrypt via an HTTP action with Node.js runtime
    let encoded = '';
    for (let i = 0; i < password.length; i++) {
        encoded += String.fromCharCode(password.charCodeAt(i) + 5);
    }
    return 'enc:' + encoded;
}

function verifyPassword(password: string, hash: string): boolean {
    if (hash.startsWith('enc:')) {
        return hashPassword(password) === hash;
    }
    // Fallback: direct comparison for legacy passwords
    return password === hash;
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

// Get current user by ID with full profile data
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

        // Fetch related data in parallel
        const [savedWords, mistakes, examAttempts] = await Promise.all([
            ctx.db.query("saved_words").withIndex("by_user", q => q.eq("userId", user._id)).collect(),
            ctx.db.query("mistakes").withIndex("by_user", q => q.eq("userId", user._id)).collect(),
            ctx.db.query("exam_attempts").withIndex("by_user", q => q.eq("userId", user._id)).collect(),
        ]);

        return {
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role,
            tier: user.tier,
            avatar: user.avatar,
            isVerified: user.isVerified,
            createdAt: user.createdAt,

            // Learning Progress
            lastInstitute: user.lastInstitute,
            lastLevel: user.lastLevel,
            lastUnit: user.lastUnit,

            // Linked Data
            savedWords: savedWords.map(w => ({
                id: w._id,
                korean: w.korean,
                english: w.english,
                exampleSentence: w.exampleSentence,
                exampleTranslation: w.exampleTranslation,
            })),
            mistakes: mistakes.map(m => ({
                id: m._id,
                korean: m.korean,
                english: m.english,
                createdAt: m.createdAt,
            })),
            examHistory: examAttempts.map(e => ({
                id: e._id,
                examId: e.examId,
                score: e.score,
                timestamp: e.createdAt,
                // ... other fields if needed by frontend
            })),
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
