import { toErrorMessage } from './errors';
import { readString } from './validation';

export interface Env {
  TRUSTED_CLIENT_TOKEN?: string;
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
    .replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    })
    .replace(/-/g, '');
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      const body: unknown = await request.json();
      const text = readString(body, 'text');
      if (!text) {
        return new Response(JSON.stringify({ error: 'Missing text parameter' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      const trustedClientToken = env.TRUSTED_CLIENT_TOKEN;
      if (!trustedClientToken) {
        return new Response(
          JSON.stringify({ error: 'Worker misconfigured: TRUSTED_CLIENT_TOKEN missing' }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
          }
        );
      }

      const voice = readString(body, 'voice') || 'ko-KR-SunHiNeural';
      const rate = readString(body, 'rate') || '+0%';
      const pitch = readString(body, 'pitch') || '+0Hz';
      const connectionId = generateUUID();

      const wsUrl = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${trustedClientToken}&ConnectionId=${connectionId}`;

      return new Response(
        JSON.stringify({
          error: 'WebSocket proxy not implemented in this worker.',
          requested: { voice, rate, pitch },
          wsUrl,
          suggestion: 'Use Azure Speech Services (REST) or implement outbound WebSocket support.',
        }),
        {
          status: 501,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    } catch (error: unknown) {
      return new Response(
        JSON.stringify({
          error: toErrorMessage(error),
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }
  },
};
