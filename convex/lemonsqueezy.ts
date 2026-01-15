"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import crypto from "node:crypto";

// Environment variable names
const API_KEY_ENV = "LEMONSQUEEZY_API_KEY";
const WEBHOOK_SECRET_ENV = "LEMONSQUEEZY_WEBHOOK_SECRET";
const STORE_ID_ENV = "LEMONSQUEEZY_STORE_ID";

// Variant IDs for each plan
const VARIANT_MAP: Record<string, string> = {
    MONTHLY: process.env.LEMONSQUEEZY_VARIANT_MONTHLY || "",
    ANNUAL: process.env.LEMONSQUEEZY_VARIANT_ANNUAL || "",
    LIFETIME: process.env.LEMONSQUEEZY_VARIANT_LIFETIME || "",
};

const LEMONSQUEEZY_API_URL = "https://api.lemonsqueezy.com/v1";

/**
 * Create a Lemon Squeezy checkout session
 */
export const createCheckout = action({
    args: {
        plan: v.string(), // "MONTHLY" | "ANNUAL" | "LIFETIME"
        userId: v.optional(v.string()),
        userEmail: v.optional(v.string()),
        userName: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const apiKey = process.env[API_KEY_ENV];
        const storeId = process.env[STORE_ID_ENV];

        if (!apiKey) {
            throw new Error(`Missing ${API_KEY_ENV} environment variable`);
        }
        if (!storeId) {
            throw new Error(`Missing ${STORE_ID_ENV} environment variable`);
        }

        const variantId = VARIANT_MAP[args.plan];
        if (!variantId) {
            throw new Error(`Invalid plan: ${args.plan}. No variant ID configured.`);
        }

        const appUrl = process.env.VITE_APP_URL || "http://localhost:3000";

        // Build checkout request body (JSON:API format)
        const requestBody = {
            data: {
                type: "checkouts",
                attributes: {
                    checkout_data: {
                        email: args.userEmail || undefined,
                        name: args.userName || undefined,
                        custom: {
                            user_id: args.userId || "",
                            plan: args.plan,
                        },
                    },
                    product_options: {
                        redirect_url: `${appUrl}/payment/success?provider=lemonsqueezy`,
                    },
                },
                relationships: {
                    store: {
                        data: {
                            type: "stores",
                            id: storeId,
                        },
                    },
                    variant: {
                        data: {
                            type: "variants",
                            id: variantId,
                        },
                    },
                },
            },
        };

        console.log("[LemonSqueezy] Creating checkout for plan:", args.plan);

        try {
            const response = await fetch(`${LEMONSQUEEZY_API_URL}/checkouts`, {
                method: "POST",
                headers: {
                    "Accept": "application/vnd.api+json",
                    "Content-Type": "application/vnd.api+json",
                    "Authorization": `Bearer ${apiKey}`,
                },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("[LemonSqueezy] API Error:", response.status, errorText);
                throw new Error(`Lemon Squeezy API error: ${response.status}`);
            }

            const data = await response.json();
            const checkoutUrl = data.data?.attributes?.url;

            if (!checkoutUrl) {
                throw new Error("No checkout URL returned from Lemon Squeezy");
            }

            console.log("[LemonSqueezy] Checkout created:", checkoutUrl);
            return { checkoutUrl };
        } catch (error: any) {
            console.error("[LemonSqueezy] Error creating checkout:", error.message);
            throw error;
        }
    },
});

/**
 * Verify webhook signature from Lemon Squeezy
 */
function verifySignature(payload: string, signature: string, secret: string): boolean {
    const hmac = crypto.createHmac("sha256", secret);
    const digest = hmac.update(payload).digest("hex");

    try {
        return crypto.timingSafeEqual(
            Buffer.from(digest, "utf8"),
            Buffer.from(signature, "utf8")
        );
    } catch {
        return false;
    }
}

/**
 * Handle Lemon Squeezy webhook events
 */
export const handleWebhook = action({
    args: {
        body: v.string(),
        signature: v.string(),
    },
    handler: async (ctx, args) => {
        const webhookSecret = process.env[WEBHOOK_SECRET_ENV];

        if (!webhookSecret) {
            console.error(`Missing ${WEBHOOK_SECRET_ENV} environment variable`);
            return { success: false, error: "Webhook secret not configured" };
        }

        // Verify signature
        if (!verifySignature(args.body, args.signature, webhookSecret)) {
            console.error("[LemonSqueezy] Invalid webhook signature");
            return { success: false, error: "Invalid signature" };
        }

        // Parse webhook payload
        let payload: any;
        try {
            payload = JSON.parse(args.body);
        } catch (e) {
            console.error("[LemonSqueezy] Failed to parse webhook body");
            return { success: false, error: "Invalid JSON" };
        }

        const eventName = payload.meta?.event_name;
        const customData = payload.meta?.custom_data || {};
        const attributes = payload.data?.attributes || {};

        console.log(`[LemonSqueezy] Webhook received: ${eventName}`);

        // Import internal mutations
        const { internal } = await import("./_generated/api");

        try {
            switch (eventName) {
                case "order_created":
                    // One-time purchase (e.g., LIFETIME)
                    if (customData.user_id || attributes.user_email) {
                        await ctx.runMutation((internal.paymentsMutations.grantAccess as any), {
                            customerEmail: attributes.user_email || "",
                            plan: customData.plan || "LIFETIME",
                            userId: customData.user_id,
                            lemonSqueezyCustomerId: String(attributes.customer_id || ""),
                        });
                        console.log(`[LemonSqueezy] Granted access for order: ${attributes.user_email}`);
                    }
                    break;

                case "subscription_created":
                case "subscription_payment_success":
                case "subscription_resumed":
                case "subscription_unpaused":
                    // Subscription activated or renewed
                    if (attributes.user_email) {
                        const plan = customData.plan ||
                            (attributes.variant_name?.toLowerCase().includes("annual") ? "ANNUAL" : "MONTHLY");

                        await ctx.runMutation((internal.paymentsMutations.grantAccess as any), {
                            customerEmail: attributes.user_email,
                            plan,
                            userId: customData.user_id,
                            lemonSqueezyCustomerId: String(attributes.customer_id || ""),
                            lemonSqueezySubscriptionId: String(payload.data?.id || ""),
                        });
                        console.log(`[LemonSqueezy] Granted subscription access: ${attributes.user_email}`);
                    }
                    break;

                case "subscription_cancelled":
                case "subscription_expired":
                case "subscription_paused":
                    // Subscription ended
                    if (attributes.user_email) {
                        await ctx.runMutation((internal.paymentsMutations.revokeAccess as any), {
                            customerEmail: attributes.user_email,
                            userId: customData.user_id,
                        });
                        console.log(`[LemonSqueezy] Revoked access: ${attributes.user_email}`);
                    }
                    break;

                case "subscription_updated": {
                    // Check status to determine if access should be granted or revoked
                    const status = attributes.status;
                    if (status === "active" || status === "on_trial") {
                        if (attributes.user_email) {
                            await ctx.runMutation((internal.paymentsMutations.grantAccess as any), {
                                customerEmail: attributes.user_email,
                                plan: customData.plan || "MONTHLY",
                                userId: customData.user_id,
                                lemonSqueezyCustomerId: String(attributes.customer_id || ""),
                                lemonSqueezySubscriptionId: String(payload.data?.id || ""),
                            });
                        }
                    } else if (status === "cancelled" || status === "expired" || status === "paused") {
                        if (attributes.user_email) {
                            await ctx.runMutation((internal.paymentsMutations.revokeAccess as any), {
                                customerEmail: attributes.user_email,
                                userId: customData.user_id,
                            });
                        }
                    }
                    break;
                }

                default:
                    console.log(`[LemonSqueezy] Unhandled event: ${eventName}`);
            }

            return { success: true };
        } catch (error: any) {
            console.error("[LemonSqueezy] Error processing webhook:", error.message);
            return { success: false, error: error.message };
        }
    },
});
