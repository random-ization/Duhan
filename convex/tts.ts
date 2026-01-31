'use node';
import { action } from './_generated/server';
import { v } from 'convex/values';
import crypto from 'node:crypto';
import { makeFunctionReference } from 'convex/server';
import type { FunctionReference } from 'convex/server';

// Azure Cognitive Services TTS with S3 caching
// Caches generated audio in DigitalOcean Spaces to reduce API costs

// Supported Korean voices (Neural):
// - ko-KR-SunHiNeural (Female, recommended)
// - ko-KR-InJoonNeural (Male)
// - ko-KR-HyunsuNeural (Male)

const getCacheQuery = makeFunctionReference<
  'query',
  { key: string },
  { url: string; updatedAt: number } | null
>('ttsCache:getCache') as unknown as FunctionReference<
  'query',
  'internal',
  { key: string },
  { url: string; updatedAt: number } | null
>;

const upsertCacheMutation = makeFunctionReference<
  'mutation',
  { key: string; url: string },
  { success: boolean }
>('ttsCache:upsertCache') as unknown as FunctionReference<
  'mutation',
  'internal',
  { key: string; url: string },
  { success: boolean }
>;

/**
 * Generate a hash key for caching based on text and voice
 */
function generateCacheKey(text: string, voice: string): string {
  const input = `${text}|${voice}`;
  const hash = crypto.createHash('md5').update(input).digest('hex');
  return `tts/${hash}.mp3`;
}

/**
 * Create SSML for Azure TTS
 */
function createSSML(
  text: string,
  voice: string,
  rate: string = '0%',
  pitch: string = '0%'
): string {
  const escapedText = text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

  let lang = 'en-US';
  if (voice.startsWith('zh-')) {
    lang = 'zh-CN';
  } else if (voice.startsWith('ko-')) {
    lang = 'ko-KR';
  }

  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${lang}">
        <voice name="${voice}">
            <prosody rate="${rate}" pitch="${pitch}">
                ${escapedText}
            </prosody>
        </voice>
    </speak>`;
}

/**
 * Generate AWS Signature V4 for S3 upload
 */
/**
 * Generate AWS Signature V4 for S3 upload
 */
async function uploadToSpaces(audioBuffer: Buffer, key: string): Promise<string> {
  const endpoint = process.env.SPACES_ENDPOINT;
  const bucket = process.env.SPACES_BUCKET;
  const accessKeyId = process.env.SPACES_KEY;
  const secretAccessKey = process.env.SPACES_SECRET;
  const region = process.env.SPACES_REGION;

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey || !region) {
    throw new Error('Storage config missing');
  }

  const service = 's3';
  const contentType = 'audio/mpeg';

  const now = new Date();
  // Fix: Remove milliseconds strict AWS ISO8601BasicFormat (YYYYMMDD'T'HHMMSS'Z')
  const amzDate = now.toISOString().split('.')[0].replaceAll(/[:-]/g, '') + 'Z';
  const dateStamp = amzDate.slice(0, 8);

  const host = new URL(endpoint).host;
  const endpointHost = `${bucket}.${host}`;
  // Encode key for special characters
  const uri = '/' + key.split('/').map(encodeURIComponent).join('/');

  const payloadHash = crypto.createHash('sha256').update(audioBuffer).digest('hex');

  // Removed x-amz-acl to avoid mismatch issues
  const canonicalHeaders = `host:${endpointHost}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';

  const canonicalRequest = ['PUT', uri, '', canonicalHeaders, signedHeaders, payloadHash].join(
    '\n'
  );

  const algorithm = 'AWS4-HMAC-SHA256';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
  ].join('\n');

  const getSignatureKey = (
    key: string,
    dateStamp: string,
    regionName: string,
    serviceName: string
  ) => {
    const kDate = crypto
      .createHmac('sha256', 'AWS4' + key)
      .update(dateStamp)
      .digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(regionName).digest();
    const kService = crypto.createHmac('sha256', kRegion).update(serviceName).digest();
    return crypto.createHmac('sha256', kService).update('aws4_request').digest();
  };

  const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  const authorization = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const uploadUrl = `https://${endpointHost}${uri}`;

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      Host: endpointHost,
      // Removed x-amz-acl header
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      Authorization: authorization,
      'Content-Type': contentType,
      'Content-Length': audioBuffer.length.toString(),
    },
    body: new Uint8Array(audioBuffer),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('S3 upload error:', response.status, errorText);
    throw new Error(`S3 upload failed: ${response.status}`);
  }

  // Return CDN URL
  const cdnHost = host.replace('digitaloceanspaces.com', 'cdn.digitaloceanspaces.com');
  return `https://${bucket}.${cdnHost}${uri}`; // Use encoded URI
}

/**
 * Check if audio exists in S3 cache
 */
async function checkS3Cache(key: string): Promise<string | null> {
  const bucket = process.env.SPACES_BUCKET;
  const endpoint = process.env.SPACES_ENDPOINT;

  if (!bucket || !endpoint) return null;

  const host = new URL(endpoint).host;
  const cdnHost = host.replace('digitaloceanspaces.com', 'cdn.digitaloceanspaces.com');
  const url = `https://${bucket}.${cdnHost}/${key}`;

  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (response.ok) {
      return url;
    }
  } catch {
    // Cache miss
  }
  return null;
}

export const speak = action({
  args: {
    text: v.string(),
    voice: v.optional(v.string()),
    rate: v.optional(v.string()),
    pitch: v.optional(v.string()),
    skipCache: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.AZURE_SPEECH_KEY;
    const region = process.env.AZURE_SPEECH_REGION;

    if (!apiKey || !region) {
      console.error('Azure Speech credentials not configured');
      return {
        success: false,
        audio: null,
        url: null,
        error: 'Azure Speech credentials not configured',
      };
    }

    try {
      const voice = args.voice || 'ko-KR-SunHiNeural';
      const rate = args.rate || '0%';
      const pitch = args.pitch || '0%';

      const cacheKey = generateCacheKey(args.text, voice);

      // Check S3 cache first (unless skipCache is true)
      if (!args.skipCache) {
        const cacheEntry = await ctx.runQuery(getCacheQuery, { key: cacheKey });
        if (cacheEntry?.url) {
          return {
            success: true,
            audio: null,
            url: cacheEntry.url,
            format: 'audio/mp3',
            cached: true,
          };
        }

        const cachedUrl = await checkS3Cache(cacheKey);
        if (cachedUrl) {
          await ctx.runMutation(upsertCacheMutation, { key: cacheKey, url: cachedUrl });
          console.log('TTS cache hit:', args.text.substring(0, 20));
          return {
            success: true,
            audio: null, // Don't return base64 if URL is available
            url: cachedUrl,
            format: 'audio/mp3',
            cached: true,
          };
        }
      }

      // Generate audio via Azure
      console.log('TTS generating:', args.text.substring(0, 20));
      const ssml = createSSML(args.text, voice, rate, pitch);
      const endpoint = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
          'User-Agent': 'DuHan-TTS/1.0',
        },
        body: ssml,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Azure TTS error:', response.status, errorText);
        return {
          success: false,
          audio: null,
          url: null,
          error: `Azure TTS error: ${response.status}`,
        };
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());

      // Upload to S3 cache
      let cdnUrl: string | null = null;
      try {
        cdnUrl = await uploadToSpaces(audioBuffer, cacheKey);
        console.log('TTS cached to S3:', cacheKey);
      } catch (uploadError) {
        console.warn('S3 upload failed, returning base64:', uploadError);
      }

      // Return URL if available, otherwise base64
      if (cdnUrl) {
        await ctx.runMutation(upsertCacheMutation, { key: cacheKey, url: cdnUrl });
        return {
          success: true,
          audio: null,
          url: cdnUrl,
          format: 'audio/mp3',
          cached: false,
        };
      } else {
        return {
          success: true,
          audio: audioBuffer.toString('base64'),
          url: null,
          format: 'audio/mp3',
          cached: false,
        };
      }
    } catch (error) {
      console.error('TTS generation failed:', error);
      return {
        success: false,
        audio: null,
        url: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

// Get available voices
export const getVoices = action({
  args: {},
  handler: async () => {
    return {
      korean: [
        { id: 'ko-KR-SunHiNeural', name: 'SunHi', gender: 'Female', recommended: true },
        { id: 'ko-KR-InJoonNeural', name: 'InJoon', gender: 'Male' },
        { id: 'ko-KR-HyunsuNeural', name: 'Hyunsu', gender: 'Male' },
        { id: 'ko-KR-BongJinNeural', name: 'BongJin', gender: 'Male' },
        { id: 'ko-KR-GookMinNeural', name: 'GookMin', gender: 'Male' },
        { id: 'ko-KR-JiMinNeural', name: 'JiMin', gender: 'Female' },
        { id: 'ko-KR-SeoHyeonNeural', name: 'SeoHyeon', gender: 'Female' },
        { id: 'ko-KR-SoonBokNeural', name: 'SoonBok', gender: 'Female' },
        { id: 'ko-KR-YuJinNeural', name: 'YuJin', gender: 'Female' },
      ],
      chinese: [
        { id: 'zh-CN-XiaoxiaoNeural', name: 'Xiaoxiao', gender: 'Female', recommended: true },
        { id: 'zh-CN-YunxiNeural', name: 'Yunxi', gender: 'Male' },
        { id: 'zh-CN-YunjianNeural', name: 'Yunjian', gender: 'Male' },
        { id: 'zh-CN-XiaoyiNeural', name: 'Xiaoyi', gender: 'Female' },
      ],
    };
  },
});
