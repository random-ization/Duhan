"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";

// Lazy import creem_io to avoid bundling issues
async function getCreemClient() {
    const { createCreem } = await import("creem_io");
    return createCreem({
        apiKey: process.env.CREEM_API_KEY!,
        webhookSecret: process.env.CREEM_WEBHOOK_SECRET,
        testMode: process.env.CREEM_TEST_MODE === "true",
    });
}

const PRODUCT_MAP: Record<string, string> = {
    MONTHLY: process.env.CREEM_PRODUCT_MONTHLY || "",
    ANNUAL: process.env.CREEM_PRODUCT_ANNUAL || "",
    LIFETIME: process.env.CREEM_PRODUCT_LIFETIME || "",
};

// Create a Creem checkout session
export const createCheckoutSession = action({
    args: {
        plan: v.string(), // "MONTHLY" | "ANNUAL" | "LIFETIME"
        userId: v.optional(v.string()),
        userEmail: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const productId = PRODUCT_MAP[args.plan];

        console.log("[Checkout] Creating session for plan:", args.plan);
        if (!productId) {
            throw new Error(`Invalid plan: ${args.plan}. No product ID configured.`);
        }

        const appUrl = process.env.VITE_APP_URL || "http://localhost:3000";
        const isTestMode = process.env.CREEM_API_KEY?.startsWith("creem_test_") ||
            process.env.CREEM_TEST_MODE === "true";

        try {
            const creem = await getCreemClient();
            const checkout = await creem.checkouts.create({
                productId,
                successUrl: `${appUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
                customer: args.userEmail ? { email: args.userEmail } : undefined,
                metadata: {
                    userId: args.userId || "",
                    plan: args.plan,
                },
            });

            console.log("[Checkout] Success! URL:", checkout.checkoutUrl);
            return { checkoutUrl: checkout.checkoutUrl };
        } catch (error: any) {
            console.error("[Checkout] API Error:", error.message);

            // Fallback to direct payment link if API fails
            const paymentPath = isTestMode ? "test/payment" : "payment";
            const directUrl = `https://www.creem.io/${paymentPath}/${productId}`;
            console.log("[Checkout] Using fallback direct link:", directUrl);

            return { checkoutUrl: directUrl };
        }
    }
});

// Verify a payment session (called after redirect back)
export const verifyPaymentSession = action({
    args: { sessionId: v.string() },
    handler: async (ctx, args) => {
        const creem = await getCreemClient();

        try {
            const checkout = await creem.checkouts.get({
                checkoutId: args.sessionId,
            });

            if (checkout.status === "completed") {
                return { success: true, status: "completed" };
            }

            return { success: false, status: checkout.status };
        } catch (error: any) {
            console.error("Error verifying payment session:", error);
            return { success: false, error: error.message };
        }
    }
});

// Handle Creem webhook (called by HTTP handler)
export const handleWebhook = action({
    args: {
        body: v.string(),
        signature: v.string(),
    },
    handler: async (ctx, args) => {
        const { createCreem } = await import("creem_io");
        const { internal } = await import("./_generated/api");

        const creem = createCreem({
            apiKey: process.env.CREEM_API_KEY!,
            webhookSecret: process.env.CREEM_WEBHOOK_SECRET!,
        });

        try {
            await creem.webhooks.handleEvents(args.body, args.signature, {
                // Called when subscription becomes active, trialing, or paid
                onGrantAccess: async ({ reason, customer, _product, metadata }) => {
                    console.log(`[Webhook] Grant access: ${reason} for ${customer?.email}`);

                    if (customer?.email) {
                        await ctx.runMutation((internal.paymentsMutations.grantAccess as any), {
                            customerEmail: customer.email,
                            plan: (metadata?.plan as string) || "MONTHLY",
                            creemCustomerId: customer.id,
                            userId: (metadata?.userId as string),
                        });
                    }
                },

                // Called when subscription is paused or expired
                onRevokeAccess: async ({ reason, customer, metadata }) => {
                    console.log(`[Webhook] Revoke access: ${reason} for ${customer?.email}`);

                    if (customer?.email) {
                        await ctx.runMutation((internal.paymentsMutations.revokeAccess as any), {
                            customerEmail: customer.email,
                            userId: (metadata?.userId as string),
                        });
                    }
                },

                // Called when checkout is completed
                onCheckoutCompleted: async (data) => {
                    console.log(`[Webhook] Checkout completed for ${data.customer?.email}`);
                },
            });

            return { success: true };
        } catch (error: any) {
            console.error("Webhook processing error:", error);
            return { success: false, error: error.message };
        }
    }
});
