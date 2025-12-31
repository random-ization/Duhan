import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

const SALT_ROUNDS = 10;

// Simple password hashing (In production use bcrypt/argon2)
// Note: This is a placeholder since we can't use node modules like bcrypt in Convex runtime easily without polyfills
// or switching to Auth0/Clerk. For this migration, we'll keep it simple or assume pre-hashed.
function hashPassword(password: string): string {
    // Basic hash for demo - REPLACE with proper auth provider in production
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString();
}

function verifyPassword(password: string, hash: string | null | undefined): boolean {
    // Guard against null/undefined hash (e.g., Google-auth users with no password)
    if (!hash) return false;
    return hashPassword(password) === hash;
}

// Helper to generate a session token
function generateToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Helper to fetch and format full user data
async function enrichUser(ctx: any, user: Doc<"users">) {
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
        token: user.token,

        // Learning Progress
        lastInstitute: user.lastInstitute,
        lastLevel: user.lastLevel,
        lastUnit: user.lastUnit,
        lastModule: user.lastModule, // Ensure this is included

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
            context: m.context,
            createdAt: m.createdAt,
        })),
        examHistory: examAttempts.map(e => ({
            id: e._id,
            examId: e.examId,
            score: e.score,
            maxScore: e.totalQuestions, // Map backend 'totalQuestions' to frontend 'maxScore'
            userAnswers: e.sectionScores, // Map backend 'sectionScores' to frontend 'userAnswers'
            timestamp: e.createdAt,
        })),

        // Default empty arrays for missing fields in schema but required by frontend User type
        annotations: [], // Annotations are fetched separately or need a query here if part of User type
        joinDate: user.createdAt, // Frontend expects number
        lastActive: Date.now(), // Frontend expects number (implied by type check usually, let's check types.ts)
    };
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
            throw new ConvexError({ code: "EMAIL_ALREADY_EXISTS" });
        }

        const token = generateToken();

        // Create user
        const userId = await ctx.db.insert("users", {
            email,
            password: hashPassword(password),
            name: name || email.split('@')[0],
            role: "STUDENT",
            tier: "FREE",
            isVerified: false,
            token, // Secure token
            createdAt: Date.now(),
        });

        // Fetch created user to return full profile
        const newUser = await ctx.db.get(userId);
        if (!newUser) throw new ConvexError({ code: "USER_CREATION_FAILED" });

        const fullUser = await enrichUser(ctx, newUser);

        return {
            user: fullUser,
            token,
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
            throw new ConvexError({ code: "INVALID_CREDENTIALS" });
        }

        if (!verifyPassword(password, user.password)) {
            throw new ConvexError({ code: "INVALID_CREDENTIALS" });
        }

        // Generate new session token
        const token = generateToken();
        await ctx.db.patch(user._id, { token });

        // Get updated user (although we just need to patch implicit object)
        const updatedUser = { ...user, token };

        const fullUser = await enrichUser(ctx, updatedUser);

        return {
            user: fullUser,
            token, // Return real token
        };
    }
});

// Get current user by ID or Token with full profile data
export const getMe = query({
    args: {
        userId: v.optional(v.string()),
        token: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { userId, token } = args;
        let user: any = null;

        if (token) {
            // Lookup by token (Secure)
            user = await ctx.db.query("users")
                .withIndex("by_token", q => q.eq("token", token))
                .first();
        } else if (userId) {
            // Legacy / Fallback lookup (Less Secure if not verified)
            try {
                user = await ctx.db.get(userId as any);
            } catch {
                user = await ctx.db.query("users")
                    .withIndex("by_postgresId", q => q.eq("postgresId", userId))
                    .first();
            }
        }

        if (!user) {
            return null;
        }

        return await enrichUser(ctx, user);
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
            throw new ConvexError({ code: "USER_CREATION_FAILED" });
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
            throw new ConvexError({ code: "USER_NOT_FOUND" });
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
            throw new ConvexError({ code: "USER_NOT_FOUND" });
        }

        if (!verifyPassword(currentPassword, user.password)) {
            throw new ConvexError({ code: "INCORRECT_PASSWORD" });
        }

        await ctx.db.patch(user._id, {
            password: hashPassword(newPassword),
        });

        return { success: true };
    }
});
