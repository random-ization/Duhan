import { action, internalMutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { api, internal } from "./_generated/api";

export const tryLogin = internalMutation({
    args: { email: v.string(), password: v.string() },
    handler: async (ctx, args) => {
        // 1. Test Schema Write (Patch Token)
        // We pick ANY user to test write capability
        const user = await ctx.db.query("users").first();
        if (!user) return "No users found";

        console.log("Found user:", user._id);

        try {
            await ctx.db.patch(user._id, { token: "debug-test-token" });
            console.log("Schema Write Test: SUCCESS (Token updated)");
        } catch (e: any) {
            console.error("Schema Write Test: FAILED", e);
            return "Schema Write Failed: " + e.message;
        }

        // 2. Test Bcrypt Module
        try {
            const { compareSync, hashSync } = require("bcryptjs");
            const hash = hashSync("test", 10);
            const valid = compareSync("test", hash);
            console.log("Bcrypt Module Test: " + (valid ? "SUCCESS" : "FAILED"));
            if (!valid) return "Bcrypt logic broken";
        } catch (e: any) {
            console.error("Bcrypt Module Import Failed:", e);
            return "Bcrypt Import Failed: " + e.message;
        }

        // 3. Test Error Format (Throwing expected error)
        // This will print to console how Convex wraps it
        console.log("Throwing INVALID_CREDENTIALS ConvexError now...");
        throw new ConvexError({ code: "INVALID_CREDENTIALS", message: "Debug Error Message" });
    }
});
