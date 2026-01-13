// Cloudflare Worker for Edge TTS Proxy
// This worker acts as a proxy to Microsoft Edge TTS API
// to bypass Origin header restrictions

const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";

interface TTSRequest {
    text: string;
    voice?: string;
    rate?: string;
    pitch?: string;
}

function createSSML(text: string, voice: string, rate: string = "+0%", pitch: string = "+0Hz"): string {
    const escapedText = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

    return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">
        <voice name="${voice}">
            <prosody rate="${rate}" pitch="${pitch}">
                ${escapedText}
            </prosody>
        </voice>
    </speak>`;
}

function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    }).replace(/-/g, '');
}

export default {
    async fetch(request: Request): Promise<Response> {
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
            const body: TTSRequest = await request.json();

            if (!body.text) {
                return new Response(JSON.stringify({ error: 'Missing text parameter' }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
                });
            }

            const voice = body.voice || "ko-KR-SunHiNeural";
            const rate = body.rate || "+0%";
            const pitch = body.pitch || "+0Hz";
            const requestId = generateUUID();
            const connectionId = generateUUID();

            const wsUrl = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&ConnectionId=${connectionId}`;

            // Create WebSocket connection
            const wsResponse = await fetch(wsUrl.replace('wss://', 'https://'), {
                headers: {
                    'Upgrade': 'websocket',
                    'Connection': 'Upgrade',
                    'Sec-WebSocket-Key': btoa(generateUUID()),
                    'Sec-WebSocket-Version': '13',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0',
                    'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
                },
            });

            // For Cloudflare Workers, we need to use WebSocket pair
            const { 0: clientSocket, 1: serverSocket } = new WebSocketPair();

            // Note: Cloudflare Workers have limited WebSocket outbound support
            // We need to use a different approach - fetch-based Edge TTS

            // Alternative: Use REST-like approach via cognitive services endpoint
            // This is a simplified version that returns a placeholder

            return new Response(JSON.stringify({
                error: 'WebSocket proxy not fully implemented. Use Azure Cognitive Services API instead.',
                suggestion: 'Consider using Azure Speech Services with API key'
            }), {
                status: 501,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
            });

        } catch (error) {
            return new Response(JSON.stringify({
                error: error instanceof Error ? error.message : 'Unknown error'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            });
        }
    },
};
