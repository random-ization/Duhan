import { action, internalMutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { api, internal } from "./_generated/api";

export const tryLogin = internalMutation({
    args: { email: v.string(), password: v.string() },
    handler: async (ctx, args) => {
        try {
            console.log("Starting Debug Flow for:", args.email);

            // 1. User Lookup
            const user = await ctx.db.query("users")
                .withIndex("by_email", q => q.eq("email", args.email))
                .first();

            if (!user) return "User not found";
            console.log("User found:", user._id);

            // 2. Test Bcrypt Module (just to overlap context)
            const { compareSync, hashSync } = require("bcryptjs");
            const hash = hashSync("test", 10);
            if (!compareSync("test", hash)) return "Bcrypt broken";
            console.log("Bcrypt OK");

            // 3. Test Patch
            // await ctx.db.patch(user._id, { token: "debug-" + Date.now() });
            // console.log("Patch OK");

            // 4. Test EnrichUser (The suspect)
            console.log("Testing enrichUser queries...");

            // Replicate enrichUser logic exactly
            const [savedWords, mistakes, examAttempts] = await Promise.all([
                ctx.db.query("saved_words").withIndex("by_user", q => q.eq("userId", user._id)).collect(),
                ctx.db.query("mistakes").withIndex("by_user", q => q.eq("userId", user._id)).collect(),
                ctx.db.query("exam_attempts").withIndex("by_user", q => q.eq("userId", user._id)).collect(),
            ]);

            console.log(`Fetched: ${savedWords.length} words, ${mistakes.length} mistakes, ${examAttempts.length} attempts`);

            const enriched = {
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
                lastModule: user.lastModule,

                // Linked Data mappings
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
                examHistory: examAttempts.map((e: any) => ({
                    id: e._id,
                    examId: e.examId,
                    score: e.score,
                    maxScore: e.totalQuestions, // Potential undefined access?
                    userAnswers: e.sectionScores,
                    timestamp: e.createdAt,
                })),
            };

            console.log("EnrichUser Success. Keys:", Object.keys(enriched));

            return "Login Flow Success";
        } catch (e: any) {
            console.error("CRASH in Debug Flow:", e);
            return "CRASH: " + e.message + "\nStack: " + e.stack;
        }
    }
});
