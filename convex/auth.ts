import { query, mutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";
import { getOptionalAuthUserId, getAuthUserId } from "./utils";
import { MAX_ITEMS_PER_USER_COLLECTION } from "./queryLimits";

import { compareSync, hashSync } from "bcryptjs";

const SALT_ROUNDS = 10;

// Proper bcrypt hashing compatible with migrated Postgres data
function hashPassword(password: string): string {
    return hashSync(password, SALT_ROUNDS);
}

// Simple fallback hash (from before migration)
function simpleHash(password: string): string {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString();
}

function verifyPassword(password: string, hash: string | null | undefined): boolean {
    // Guard against null/undefined hash
    if (!hash) {
        console.log("verifyPassword: Hash is null/undefined");
        return false;
    }

    try {
        // 1. Try Bcrypt
        const isBcrypt = hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$");
        if (isBcrypt) {
            return compareSync(password, hash);
        }

        // 2. Try Simple Hash (Fallback for legacy dev users)
        const simple = simpleHash(password);
        if (simple === hash) return true;

        console.log(`verifyPassword: Unknown hash format or mismatch. Hash starts with: ${hash.substring(0, 5)}...`);
        return false;

    } catch (e: any) {
        console.error("verifyPassword: Error verifying password:", e.message);
        return false;
    }
}

// Helper to generate a session token
function generateToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Helper to fetch basic user data (fast path for most operations)
async function enrichUserBasic(user: Doc<"users">) {
    return {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        tier: user.tier,
        subscriptionType: user.subscriptionType,
        subscriptionExpiry: user.subscriptionExpiry,
        avatar: user.avatar,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        token: user.token,

        // Learning Progress
        lastInstitute: user.lastInstitute,
        lastLevel: user.lastLevel,
        lastUnit: user.lastUnit,
        lastModule: user.lastModule,

        // Empty arrays for frontend compatibility
        savedWords: [],
        mistakes: [],
        examHistory: [],
        annotations: [],
        joinDate: user.createdAt,
        lastActive: Date.now(),
    };
}

// Helper to fetch full user data with collections (slower, use only when needed)
// OPTIMIZATION: Limit collections to prevent query explosions
async function enrichUserFull(ctx: any, user: Doc<"users">) {
    const [savedWords, mistakes, examAttempts] = await Promise.all([
        ctx.db.query("saved_words")
            .withIndex("by_user", q => q.eq("userId", user._id))
            .order("desc")
            .take(MAX_ITEMS_PER_USER_COLLECTION),
        ctx.db.query("mistakes")
            .withIndex("by_user", q => q.eq("userId", user._id))
            .order("desc")
            .take(MAX_ITEMS_PER_USER_COLLECTION),
        ctx.db.query("exam_attempts")
            .withIndex("by_user", q => q.eq("userId", user._id))
            .order("desc")
            .take(MAX_ITEMS_PER_USER_COLLECTION),
    ]);

    return {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        tier: user.tier,
        subscriptionType: user.subscriptionType,
        subscriptionExpiry: user.subscriptionExpiry,
        avatar: user.avatar,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        token: user.token,

        // Learning Progress
        lastInstitute: user.lastInstitute,
        lastLevel: user.lastLevel,
        lastUnit: user.lastUnit,
        lastModule: user.lastModule,

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
            maxScore: e.totalQuestions,
            userAnswers: e.sectionScores,
            timestamp: e.createdAt,
        })),

        // Default empty arrays for missing fields in schema but required by frontend User type
        annotations: [],
        joinDate: user.createdAt,
        lastActive: Date.now(),
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
        const verifyCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Create user
        const userId = await ctx.db.insert("users", {
            email,
            password: hashPassword(password),
            name: name || email.split('@')[0],
            role: "STUDENT",
            tier: "FREE",
            isVerified: false,
            verifyCode,
            token, // Secure token
            createdAt: Date.now(),
        });

        // Send Verification Email
        await ctx.scheduler.runAfter(0, internal.emails.sendVerification, {
            email,
            code: verifyCode
        });

        // Fetch created user to return full profile
        const newUser = await ctx.db.get(userId);
        if (!newUser) throw new ConvexError({ code: "USER_CREATION_FAILED" });

        const fullUser = await enrichUserFull(ctx, newUser);

        return {
            user: fullUser,
            token,
            message: "Registration successful. Please check your email for the verification code."
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
        try {
            const { email, password } = args;

            const user = await ctx.db.query("users")
                .withIndex("by_email", q => q.eq("email", email))
                .first();

            if (!user) {
                throw new ConvexError({ code: "INVALID_CREDENTIALS" });
            }

            // Check password
            const isMatch = verifyPassword(password, user.password);

            if (!isMatch) {
                throw new ConvexError({ code: "INVALID_CREDENTIALS" });
            }

            // Generate Token
            const token = generateToken();

            // Patch User
            await ctx.db.patch(user._id, { token });

            // Enrich User - use full version for login
            const updatedUser = { ...user, token };
            const fullUser = await enrichUserFull(ctx, updatedUser);

            return {
                user: fullUser,
                token,
            };
        } catch (e: any) {
            // Re-throw so frontend sees it
            if (e instanceof ConvexError) throw e;

            // Wrap unknown errors
            throw new ConvexError({ code: "SERVER_ERROR", message: "Internal: " + e.message });
        }
    }
});

// Get current user (auth context only) with full profile data
// OPTIMIZATION: Support optional full loading with includeFull parameter
export const getMe = query({
    args: {
        token: v.optional(v.string()),
        userId: v.optional(v.string()),
        includeFull: v.optional(v.boolean()), // New parameter for full data
    },
    handler: async (ctx, args) => {
        const userId = await getOptionalAuthUserId(ctx, args.token);
        if (!userId) return null;

        const user = await ctx.db.get(userId);
        if (!user) return null;

        // Return full data if requested, otherwise just basic
        if (args.includeFull) {
            return await enrichUserFull(ctx, user);
        }
        return await enrichUserBasic(user);
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
        name: v.optional(v.string()),
        avatar: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { name, avatar } = args;
        const userId = await getAuthUserId(ctx);
        const user = await ctx.db.get(userId);

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
        currentPassword: v.string(),
        newPassword: v.string(),
    },
    handler: async (ctx, args) => {
        const { currentPassword, newPassword } = args;

        const userId = await getAuthUserId(ctx);
        const user = await ctx.db.get(userId);

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

// Password Reset Request
export const requestPasswordReset = mutation({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.db.query("users")
            .withIndex("by_email", q => q.eq("email", args.email))
            .first();

        if (!user) {
            console.log("Password reset requested for non-existent email:", args.email);
            return { message: "If an account exists, a reset link has been sent." };
        }

        const token = generateToken();
        const expires = Date.now() + 3600000; // 1 hour

        await ctx.db.patch(user._id, {
            resetToken: token,
            resetTokenExpires: expires
        });

        // SEND EMAIL
        const resetLink = `http://localhost:5173/reset-password?token=${token}`;

        // We use ctx.scheduler to call the action asynchronously without blocking common mutation time limits
        // or just to separate concerns. 
        // Note: mutations cannot call actions directly and await result synchronously in the same transaction easily 
        // unless via scheduler.

        await ctx.scheduler.runAfter(0, api.emails.sendEmail, {
            to: args.email,
            subject: "Reset your Hangyeol Password",
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2>Reset Password</h2>
                    <p>You requested a password reset for your Hangyeol account.</p>
                    <p>Click the button below to set a new password:</p>
                    <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #000; color: #fff; text-decoration: none; border-radius: 5px;">Reset Password</a>
                    <p style="margin-top: 20px; font-size: 12px; color: #666;">If you didn't request this, you can ignore this email.</p>
                    <p style="font-size: 12px; color: #aaa;">Link expires in 1 hour.</p>
                </div>
            `
        });

        console.log("Password reset email scheduled for:", args.email);

        return { message: "If an account exists, a reset link has been sent." };
    }
});

// Password Reset Confirmation
export const resetPassword = mutation({
    args: {
        token: v.string(),
        newPassword: v.string(),
    },
    handler: async (ctx, args) => {
        const { token, newPassword } = args;

        // Note: Ideally we should use an index for resetToken, but strict mode
        // prevents me from adding one easily without a migration step that creates it.
        // Using filter() is acceptable for this low-frequency operation.
        const user = await ctx.db.query("users")
            .filter(q => q.eq(q.field("resetToken"), token))
            .first();

        if (!user) {
            throw new ConvexError({ code: "INVALID_TOKEN", message: "Invalid or expired reset token." });
        }

        if (!user.resetTokenExpires || Date.now() > user.resetTokenExpires) {
            throw new ConvexError({ code: "EXPIRED_TOKEN", message: "Reset token has expired." });
        }

        await ctx.db.patch(user._id, {
            password: hashPassword(newPassword),
            resetToken: undefined,
            resetTokenExpires: undefined,
            token: generateToken() // Invalidate session
        });

        return { success: true };
    }
});
