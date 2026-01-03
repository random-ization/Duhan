import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./utils";

const DOCUMENTS = {
    terms: {
        title: "Terms of Service",
        content: `# Terms of Service\n\nLast updated: January 1, 2024\n\n## 1. Introduction\nWelcome to Hangyeol. By using our service, you agree to these terms.\n\n## 2. Usage\nYou serve right to learn Korean effectively.`
    },
    privacy: {
        title: "Privacy Policy",
        content: `# Privacy Policy\n\nLast updated: January 1, 2024\n\n## Data Collection\nWe collect minimal data necessary for your learning progress.`
    },
    refund: {
        title: "Refund Policy",
        content: `# Refund Policy\n\nLast updated: January 1, 2024\n\n## Refunds\nIf you are not satisfied, contact us within 14 days for a full refund.`
    }
};

export const getDocument = query({
    args: { type: v.string() }, // "terms" | "privacy" | "refund"
    handler: async (ctx, args) => {
        const doc = DOCUMENTS[args.type as keyof typeof DOCUMENTS];
        if (!doc) throw new Error("Document not found");

        return {
            id: args.type,
            title: doc.title,
            content: doc.content,
            updatedAt: Date.now(), // Dynamic for now
        };
    }
});

// Save Document (Admin)
export const saveDocument = mutation({
    args: {
        type: v.string(),
        title: v.string(),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        await requireAdmin(ctx);
        // ... (existing comments)

        const existing = await ctx.db
            .query("legal_documents")
            .withIndex("by_identifier", (q) => q.eq("identifier", args.type))
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, {
                title: args.title,
                content: args.content,
                updatedAt: Date.now(),
            });
        } else {
            await ctx.db.insert("legal_documents", {
                identifier: args.type,
                title: args.title,
                content: args.content,
                updatedAt: Date.now(),
            });
        }
    }
});
