import { httpRouter, makeFunctionReference } from 'convex/server';
import { httpAction } from './_generated/server';
import { auth } from './auth';
import { paymentLogger, podcastLogger } from './logger';
import { getPublicObjectUrl } from './storage';
import { api } from './_generated/api';

type WebhookResult = { success: boolean; error?: string };
type LemonWebhookArgs = { body: string; signature: string };
type DeepgramWebhookArgs = { episodeId: string; language?: string; payloadJson: string };
const WEBHOOK_ERROR_RESPONSE = 'Webhook processing failed';

const MOBILE_CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const lemonWebhookAction = makeFunctionReference<'action', LemonWebhookArgs, WebhookResult>(
  'lemonsqueezy:handleWebhook'
);
const deepgramWebhookAction = makeFunctionReference<'action', DeepgramWebhookArgs, WebhookResult>(
  'ai:handleDeepgramCallback'
);

const http = httpRouter();

auth.addHttpRoutes(http);

// Health check endpoint
http.route({
  path: '/health',
  method: 'GET',
  handler: httpAction(async () => {
    return new Response('OK', { status: 200 });
  }),
});

// EPUB proxy endpoint to bypass CORS
http.route({
  path: '/epub',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const objectKey = url.searchParams.get('key');
    
    if (!objectKey) {
      return new Response('Missing object key', { status: 400 });
    }
    
    try {
      // Get the public URL from DigitalOcean Spaces
      const publicUrl = getPublicObjectUrl(objectKey);
      
      // Fetch the EPUB file
      const response = await fetch(publicUrl);
      
      if (!response.ok) {
        return new Response('Failed to fetch EPUB', { status: response.status });
      }
      
      // Get content type from response or default to epub
      const contentType = response.headers.get('content-type') || 'application/epub+zip';
      
      // Create a new response with CORS headers
      const epubData = await response.arrayBuffer();
      return new Response(epubData, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        },
      });
    } catch (error) {
      podcastLogger.error('EPUB proxy error', error);
      return new Response('Internal server error', { status: 500 });
    }
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
      paymentLogger.error('Missing X-Signature header for Lemon Squeezy webhook');
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
        return new Response(WEBHOOK_ERROR_RESPONSE, { status: 400 });
      }
    } catch (error: unknown) {
      paymentLogger.error('Lemon Squeezy webhook error', error);
      return new Response(WEBHOOK_ERROR_RESPONSE, { status: 400 });
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
      podcastLogger.error('Deepgram webhook auth is not configured');
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
      podcastLogger.error('Deepgram webhook JSON parse error', error);
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
      return new Response(WEBHOOK_ERROR_RESPONSE, { status: 400 });
    } catch (error: unknown) {
      podcastLogger.error('Deepgram webhook error', error);
      return new Response(WEBHOOK_ERROR_RESPONSE, { status: 400 });
    }
  }),
});

// ─── Mobile Auth API ───────────────────────────────────────────────────────────

http.route({
  path: '/api/mobile/auth/signIn',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    try {
      const { email, password } = await request.json();
      if (!email || !password) {
        return new Response(JSON.stringify({ error: 'MISSING_CREDENTIALS' }), {
          status: 400,
          headers: MOBILE_CORS_HEADERS,
        });
      }
      const result = await ctx.runAction(api.auth.signIn, {
        provider: 'password',
        params: { email, password, flow: 'signIn' },
      });
      if (!result.tokens) {
        return new Response(JSON.stringify({ error: 'INVALID_CREDENTIALS' }), {
          status: 401,
          headers: MOBILE_CORS_HEADERS,
        });
      }
      return new Response(JSON.stringify({ token: result.tokens.token, refreshToken: result.tokens.refreshToken }), {
        status: 200,
        headers: MOBILE_CORS_HEADERS,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'SIGN_IN_FAILED';
      return new Response(JSON.stringify({ error: message }), {
        status: 401,
        headers: MOBILE_CORS_HEADERS,
      });
    }
  }),
});

http.route({
  path: '/api/mobile/auth/signUp',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    try {
      const { email, password, name } = await request.json();
      if (!email || !password) {
        return new Response(JSON.stringify({ error: 'MISSING_CREDENTIALS' }), {
          status: 400,
          headers: MOBILE_CORS_HEADERS,
        });
      }
      const result = await ctx.runAction(api.auth.signIn, {
        provider: 'password',
        params: { email, password, name, flow: 'signUp' },
      });
      if (!result.tokens) {
        return new Response(JSON.stringify({ error: 'SIGNUP_FAILED' }), {
          status: 400,
          headers: MOBILE_CORS_HEADERS,
        });
      }
      return new Response(JSON.stringify({ token: result.tokens.token, refreshToken: result.tokens.refreshToken }), {
        status: 201,
        headers: MOBILE_CORS_HEADERS,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'SIGNUP_FAILED';
      return new Response(JSON.stringify({ error: message }), {
        status: 400,
        headers: MOBILE_CORS_HEADERS,
      });
    }
  }),
});

http.route({
  path: '/api/mobile/auth/refresh',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    try {
      const { refreshToken } = await request.json();
      if (!refreshToken) {
        return new Response(JSON.stringify({ error: 'MISSING_REFRESH_TOKEN' }), {
          status: 400,
          headers: MOBILE_CORS_HEADERS,
        });
      }
      const result = await ctx.runAction(api.auth.signIn, {
        refreshToken,
      });
      if (!result.tokens) {
        return new Response(JSON.stringify({ error: 'TOKEN_EXPIRED' }), {
          status: 401,
          headers: MOBILE_CORS_HEADERS,
        });
      }
      return new Response(JSON.stringify({ token: result.tokens.token, refreshToken: result.tokens.refreshToken }), {
        status: 200,
        headers: MOBILE_CORS_HEADERS,
      });
    } catch (error: unknown) {
      return new Response(JSON.stringify({ error: 'REFRESH_FAILED' }), {
        status: 401,
        headers: MOBILE_CORS_HEADERS,
      });
    }
  }),
});

http.route({
  path: '/api/mobile/auth/signOut',
  method: 'POST',
  handler: httpAction(async (ctx) => {
    try {
      await ctx.runAction(api.auth.signOut, {});
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: MOBILE_CORS_HEADERS,
      });
    } catch {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: MOBILE_CORS_HEADERS,
      });
    }
  }),
});

http.route({
  path: '/api/mobile/auth/oauth/exchange',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    try {
      const { code, verifier } = await request.json();
      if (!code || !verifier) {
        return new Response(JSON.stringify({ error: 'MISSING_OAUTH_PARAMS' }), {
          status: 400,
          headers: MOBILE_CORS_HEADERS,
        });
      }
      const result = await ctx.runAction(api.auth.signIn, {
        params: { code },
        verifier,
      });
      if (!result.tokens) {
        return new Response(JSON.stringify({ error: 'OAUTH_EXCHANGE_FAILED' }), {
          status: 401,
          headers: MOBILE_CORS_HEADERS,
        });
      }
      return new Response(JSON.stringify({ token: result.tokens.token, refreshToken: result.tokens.refreshToken }), {
        status: 200,
        headers: MOBILE_CORS_HEADERS,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'OAUTH_EXCHANGE_FAILED';
      return new Response(JSON.stringify({ error: message }), {
        status: 401,
        headers: MOBILE_CORS_HEADERS,
      });
    }
  }),
});

// CORS preflight for all mobile auth routes
for (const path of [
  '/api/mobile/auth/signIn',
  '/api/mobile/auth/signUp',
  '/api/mobile/auth/refresh',
  '/api/mobile/auth/signOut',
  '/api/mobile/auth/oauth/exchange',
]) {
  http.route({
    path,
    method: 'OPTIONS',
    handler: httpAction(async () => {
      return new Response(null, { status: 204, headers: MOBILE_CORS_HEADERS });
    }),
  });
}

export default http;
