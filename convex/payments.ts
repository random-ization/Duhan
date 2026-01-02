"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";

export const createCheckoutSession = action({
    args: { plan: v.string() }, // "MONTHLY" | "ANNUAL" | "LIFETIME"
    handler: async (ctx, args) => {
        console.log("Creating checkout session for plan:", args.plan);

        // TODO: Implement actual Stripe/LemonSqueezy integration
        // For now, return a placeholder URL to unblock frontend
        const checkoutUrl = `https://checkout.stripe.com/test/${args.plan.toLowerCase()}`;

        return { checkoutUrl };
    }
});

export const verifyPaymentSession = action({
    args: { sessionId: v.string() },
    handler: async (ctx, args) => {
        console.log("Verifying payment session:", args.sessionId);
        // Stub verification
        // In real app, call Stripe/LemonSqueezy API to confirm status
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { success: true };
    }
});
