import { httpRouter, makeFunctionReference } from 'convex/server';
import { httpAction } from './_generated/server';
import { auth } from './auth';
import { toErrorMessage } from './errors';

type WebhookResult = { success: boolean; error?: string };
type WebhookArgs = { body: string; signature: string };
type DeepgramWebhookArgs = { episodeId: string; language?: string; payloadJson: string };

const creemWebhookAction = makeFunctionReference<'action', WebhookArgs, WebhookResult>(
  'payments:handleWebhook'
);
const lemonWebhookAction = makeFunctionReference<'action', WebhookArgs, WebhookResult>(
  'lemonsqueezy:handleWebhook'
);
const deepgramWebhookAction = makeFunctionReference<'action', DeepgramWebhookArgs, WebhookResult>(
  'ai:handleDeepgramCallback'
);

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
      const result = await ctx.runAction(creemWebhookAction, {
        body,
        signature,
      });

      if (result.success) {
        return new Response('OK', { status: 200 });
      } else {
        return new Response(result.error || 'Webhook processing failed', { status: 400 });
      }
    } catch (error: unknown) {
      console.error('Webhook error:', toErrorMessage(error));
      return new Response(`Webhook error: ${toErrorMessage(error)}`, { status: 400 });
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
      const result = await ctx.runAction(lemonWebhookAction, {
        body,
        signature,
      });

      if (result.success) {
        return new Response('OK', { status: 200 });
      } else {
        return new Response(result.error || 'Webhook processing failed', { status: 400 });
      }
    } catch (error: unknown) {
      console.error('Lemon Squeezy webhook error:', toErrorMessage(error));
      return new Response(`Webhook error: ${toErrorMessage(error)}`, { status: 400 });
    }
  }),
});

// Deepgram Callback Handler
http.route({
  path: '/webhook/deepgram',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const expectedDgToken = process.env.DEEPGRAM_API_KEY_ID?.trim();
    const expectedCallbackToken = process.env.DEEPGRAM_CALLBACK_TOKEN?.trim();
    const dgToken = request.headers.get('dg-token')?.trim();
    const callbackToken = url.searchParams.get('token')?.trim();

    if (!expectedDgToken && !expectedCallbackToken) {
      console.error('Deepgram webhook auth is not configured');
      return new Response('Webhook auth not configured', { status: 500 });
    }

    const isDgTokenValid = !!expectedDgToken && dgToken === expectedDgToken;
    const isCallbackTokenValid = !!expectedCallbackToken && callbackToken === expectedCallbackToken;
    if (!isDgTokenValid && !isCallbackTokenValid) {
      return new Response('Unauthorized', { status: 401 });
    }

    const episodeId = url.searchParams.get('episodeId');
    const language = url.searchParams.get('language') || undefined;

    if (!episodeId) {
      return new Response('Missing episodeId', { status: 400 });
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch (error: unknown) {
      console.error('Deepgram webhook JSON parse error:', toErrorMessage(error));
      return new Response('Invalid JSON payload', { status: 400 });
    }

    try {
      const result = await ctx.runAction(deepgramWebhookAction, {
        episodeId,
        language,
        payloadJson: JSON.stringify(payload),
      });

      if (result.success) {
        return new Response('OK', { status: 200 });
      }
      return new Response(result.error || 'Webhook processing failed', { status: 400 });
    } catch (error: unknown) {
      console.error('Deepgram webhook error:', toErrorMessage(error));
      return new Response(`Webhook error: ${toErrorMessage(error)}`, { status: 400 });
    }
  }),
});

export default http;
