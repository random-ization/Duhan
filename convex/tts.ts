'use node';
import { action, internalAction } from './_generated/server';
import { v } from 'convex/values';
import crypto from 'node:crypto';
import { makeFunctionReference } from 'convex/server';
import type { FunctionReference } from 'convex/server';
import {
  getSpacesCoreConfig,
  getSpacesHost,
  getSpacesRegion,
  toSpacesCdnHost,
} from './spacesConfig';
import { getSignatureKey } from './awsSigV4';

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

type DeferredUploadAndCacheArgs = {
  key: string;
  audioBase64: string;
  traceId?: string;
};

type DeferredUploadAndCacheResult = {
  success: boolean;
  url?: string;
  uploadMs?: number;
  error?: string;
};

const deferredUploadAndCacheAction = makeFunctionReference<
  'action',
  DeferredUploadAndCacheArgs,
  DeferredUploadAndCacheResult
>('tts:deferredUploadAndCache') as unknown as FunctionReference<
  'action',
  'internal',
  DeferredUploadAndCacheArgs,
  DeferredUploadAndCacheResult
>;

/**
 * Generate a hash key for caching based on text and voice
 */
function generateCacheKey(
  text: string,
  voice: string,
  rate: string = '0%',
  pitch: string = '0%'
): string {
  const input = `${text}|${voice}|${rate}|${pitch}`;
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
async function uploadToSpaces(audioBuffer: Buffer, key: string): Promise<string> {
  const spaces = getSpacesCoreConfig();
  const region = getSpacesRegion();
  if (!spaces || !region) {
    throw new Error('Storage config missing');
  }
  const { endpoint, bucket, accessKeyId, secretAccessKey } = spaces;

  const service = 's3';
  const contentType = 'audio/mpeg';

  const now = new Date();
  // Fix: Remove milliseconds strict AWS ISO8601BasicFormat (YYYYMMDD'T'HHMMSS'Z')
  const amzDate = now.toISOString().split('.')[0].replaceAll(/[:-]/g, '') + 'Z';
  const dateStamp = amzDate.slice(0, 8);

  const host = getSpacesHost(endpoint);
  const endpointHost = `${bucket}.${host}`;
  // Encode key for special characters
  const uri = '/' + key.split('/').map(encodeURIComponent).join('/');

  const payloadHash = crypto.createHash('sha256').update(audioBuffer).digest('hex');

  const acl = 'public-read';
  const canonicalHeaders = `host:${endpointHost}\nx-amz-acl:${acl}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-acl;x-amz-content-sha256;x-amz-date';

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

  const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  const authorization = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const uploadUrl = `https://${endpointHost}${uri}`;

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      Host: endpointHost,
      'x-amz-acl': acl,
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
  const cdnHost = toSpacesCdnHost(host);
  return `https://${bucket}.${cdnHost}${uri}`; // Use encoded URI
}

/**
 * Check if audio exists in S3 cache
 */
async function checkS3Cache(key: string): Promise<string | null> {
  const spaces = getSpacesCoreConfig();
  if (!spaces) return null;
  const { bucket, endpoint } = spaces;
  const host = getSpacesHost(endpoint);
  const cdnHost = toSpacesCdnHost(host);
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

function normalizePublicAudioUrl(inputUrl: string): string {
  try {
    const url = new URL(inputUrl);
    const host = url.host;
    if (host.endsWith('.digitaloceanspaces.com') && !host.includes('.cdn.')) {
      const cdnHost = toSpacesCdnHost(host);
      url.host = cdnHost;
      return url.toString();
    }
    return inputUrl;
  } catch {
    return inputUrl;
  }
}

export const deferredUploadAndCache = internalAction({
  args: {
    key: v.string(),
    audioBase64: v.string(),
    traceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const uploadStartedAt = Date.now();
    try {
      const audioBuffer = Buffer.from(args.audioBase64, 'base64');
      const cdnUrl = await uploadToSpaces(audioBuffer, args.key);
      await ctx.runMutation(upsertCacheMutation, { key: args.key, url: cdnUrl });
      const uploadMs = Date.now() - uploadStartedAt;
      console.log(
        'TTS deferred cache write completed:',
        args.key,
        `trace=${args.traceId || 'n/a'}`
      );
      return {
        success: true,
        url: cdnUrl,
        uploadMs,
      };
    } catch (error) {
      console.warn(
        'Deferred TTS upload/cache failed:',
        error,
        `trace=${args.traceId || 'n/a'}`,
        `key=${args.key}`
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

export const speak = action({
  args: {
    text: v.string(),
    voice: v.optional(v.string()),
    rate: v.optional(v.string()),
    pitch: v.optional(v.string()),
    skipCache: v.optional(v.boolean()),
    lowLatency: v.optional(v.boolean()),
    traceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.AZURE_SPEECH_KEY;
    const region = process.env.AZURE_SPEECH_REGION;
    const requestStartedAt = Date.now();
    const traceId =
      args.traceId || `tts_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    const lowLatency = args.lowLatency !== false;
    let cacheQueryMs: number | undefined;
    let cacheHeadMs: number | undefined;
    let azureMs: number | undefined;
    let uploadMs: number | undefined;
    let schedulerMs: number | undefined;

    const buildTiming = (path: string) => ({
      traceId,
      path,
      lowLatency,
      totalMs: Date.now() - requestStartedAt,
      cacheQueryMs,
      cacheHeadMs,
      azureMs,
      uploadMs,
      schedulerMs,
    });

    if (!apiKey || !region) {
      console.error('Azure Speech credentials not configured');
      return {
        success: false,
        audio: null,
        url: null,
        error: 'Azure Speech credentials not configured',
        timing: buildTiming('config_error'),
      };
    }

    try {
      const voice = args.voice || 'ko-KR-SunHiNeural';
      const rate = args.rate || '0%';
      const pitch = args.pitch || '0%';

      const cacheKey = generateCacheKey(args.text, voice, rate, pitch);

      // Check S3 cache first (unless skipCache is true)
      if (!args.skipCache) {
        const queryStartedAt = Date.now();
        const cacheEntry = await ctx.runQuery(getCacheQuery, { key: cacheKey });
        cacheQueryMs = Date.now() - queryStartedAt;
        if (cacheEntry?.url) {
          const normalizedUrl = normalizePublicAudioUrl(cacheEntry.url);
          if (normalizedUrl !== cacheEntry.url) {
            void ctx
              .runMutation(upsertCacheMutation, { key: cacheKey, url: normalizedUrl })
              .catch(error => {
                console.warn('Failed to normalize cached TTS URL:', error);
              });
          }
          return {
            success: true,
            audio: null,
            url: normalizedUrl,
            format: 'audio/mp3',
            cached: true,
            source: 'db_cache',
            timing: buildTiming('db_cache_hit'),
          };
        }

        // Low-latency mode skips an extra HEAD RTT on cache miss.
        if (!lowLatency) {
          const headStartedAt = Date.now();
          const cachedUrl = await checkS3Cache(cacheKey);
          cacheHeadMs = Date.now() - headStartedAt;
          if (cachedUrl) {
            void ctx
              .runMutation(upsertCacheMutation, { key: cacheKey, url: cachedUrl })
              .catch(error => {
                console.warn('Failed to upsert TTS cache after S3 hit:', error);
              });
            console.log('TTS cache hit:', args.text.substring(0, 20));
            return {
              success: true,
              audio: null, // Don't return base64 if URL is available
              url: cachedUrl,
              format: 'audio/mp3',
              cached: true,
              source: 's3_cache',
              timing: buildTiming('s3_cache_hit'),
            };
          }
        }
      }

      // Generate audio via Azure
      console.log('TTS generating:', args.text.substring(0, 20));
      const ssml = createSSML(args.text, voice, rate, pitch);
      const endpoint = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

      const azureStartedAt = Date.now();
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
      azureMs = Date.now() - azureStartedAt;

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Azure TTS error:', response.status, errorText);
        return {
          success: false,
          audio: null,
          url: null,
          error: `Azure TTS error: ${response.status}`,
          timing: buildTiming('azure_error'),
        };
      }

      const audioBuffer = Buffer.from(await response.arrayBuffer());
      const inlineAudio = audioBuffer.toString('base64');

      if (lowLatency) {
        const scheduleStartedAt = Date.now();
        // Schedule durable background cache write so upload persists even after request returns.
        try {
          await ctx.scheduler.runAfter(0, deferredUploadAndCacheAction, {
            key: cacheKey,
            audioBase64: inlineAudio,
            traceId,
          });
        } catch (scheduleError) {
          console.warn(
            'Failed to schedule deferred TTS upload:',
            scheduleError,
            `trace=${traceId}`
          );
        }
        schedulerMs = Date.now() - scheduleStartedAt;

        return {
          success: true,
          audio: inlineAudio,
          url: null,
          format: 'audio/mp3',
          cached: false,
          source: 'inline',
          timing: buildTiming('generated_inline_deferred_upload'),
        };
      }

      // Upload to S3 cache
      let cdnUrl: string | null = null;
      try {
        const uploadStartedAt = Date.now();
        cdnUrl = await uploadToSpaces(audioBuffer, cacheKey);
        uploadMs = Date.now() - uploadStartedAt;
        console.log('TTS cached to S3:', cacheKey);
      } catch (uploadError) {
        console.warn('S3 upload failed, returning base64:', uploadError);
      }

      // Return URL if available, otherwise base64
      if (cdnUrl) {
        void ctx.runMutation(upsertCacheMutation, { key: cacheKey, url: cdnUrl }).catch(error => {
          console.warn('Failed to upsert generated TTS cache URL:', error);
        });
        return {
          success: true,
          audio: null,
          url: cdnUrl,
          format: 'audio/mp3',
          cached: false,
          source: 'url',
          timing: buildTiming('generated_url'),
        };
      } else {
        console.warn('TTS upload unavailable, returning inline audio');
      }

      return {
        success: true,
        audio: inlineAudio,
        url: null,
        format: 'audio/mp3',
        cached: false,
        source: 'inline',
        timing: buildTiming('generated_inline_upload_failed'),
      };
    } catch (error) {
      console.error('TTS generation failed:', error);
      return {
        success: false,
        audio: null,
        url: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        timing: buildTiming('exception'),
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
