import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api, internal } from "./_generated/api";

const http = httpRouter();

// Creem Webhook Handler
// Note: HTTP handlers cannot use "use node", so we delegate to an action
http.route({
    path: "/webhook/creem",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const body = await request.text();
        const signature = request.headers.get("creem-signature");

        if (!signature) {
            console.error("Missing creem-signature header");
            return new Response("Missing signature", { status: 400 });
        }

        try {
            // Delegate to Node.js action for actual webhook processing
            // Cast to any to avoid "Type instantiation excessively deep" error
            const result = await ctx.runAction((api.payments.handleWebhook as any), {
                body,
                signature,
            });

            if (result.success) {
                return new Response("OK", { status: 200 });
            } else {
                return new Response(result.error || "Webhook processing failed", { status: 400 });
            }
        } catch (error: any) {
            console.error("Webhook error:", error);
            return new Response(`Webhook error: ${error.message}`, { status: 400 });
        }
    }),
});

// Health check endpoint
http.route({
    path: "/health",
    method: "GET",
    handler: httpAction(async () => {
        return new Response("OK", { status: 200 });
    }),
});

export default http;
