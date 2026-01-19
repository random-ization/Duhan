import { httpRouter } from 'convex/server';
import { httpAction } from './_generated/server';
import { api } from './_generated/api';
import { auth } from './auth';

const http = httpRouter();

auth.addHttpRoutes(http);

// Creem Webhook Handler
// Note: HTTP handlers cannot use "use node", so we delegate to an action
http.route({
  path: '/webhook/creem',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    const signature = request.headers.get('creem-signature');

    if (!signature) {
      console.error('Missing creem-signature header');
      return new Response('Missing signature', { status: 400 });
    }

    try {
      // Delegate to Node.js action for actual webhook processing
      // Cast to any to avoid "Type instantiation excessively deep" error
      const result = await ctx.runAction(api.payments.handleWebhook as any, {
        body,
        signature,
      });

      if (result.success) {
        return new Response('OK', { status: 200 });
      } else {
        return new Response(result.error || 'Webhook processing failed', { status: 400 });
      }
    } catch (error: any) {
      console.error('Webhook error:', error);
      return new Response(`Webhook error: ${error.message}`, { status: 400 });
    }
  }),
});

// Health check endpoint
http.route({
  path: '/health',
  method: 'GET',
  handler: httpAction(async () => {
    return new Response('OK', { status: 200 });
  }),
});

// Lemon Squeezy Webhook Handler
http.route({
  path: '/webhook/lemonsqueezy',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const body = await request.text();
    const signature = request.headers.get('X-Signature');

    if (!signature) {
      console.error('Missing X-Signature header for Lemon Squeezy webhook');
      return new Response('Missing signature', { status: 400 });
    }

    try {
      // Delegate to Node.js action for actual webhook processing
      const result = await ctx.runAction(api.lemonsqueezy.handleWebhook as any, {
        body,
        signature,
      });

      if (result.success) {
        return new Response('OK', { status: 200 });
      } else {
        return new Response(result.error || 'Webhook processing failed', { status: 400 });
      }
    } catch (error: any) {
      console.error('Lemon Squeezy webhook error:', error);
      return new Response(`Webhook error: ${error.message}`, { status: 400 });
    }
  }),
});

export default http;
