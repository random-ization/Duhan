import { uploadCachedJson } from '../lib/storage';
import { checkFileExists, downloadJSON } from './storage.service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import https from 'https';
import http from 'http';

// Initialize Gemini
const getGenAI = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not set');
    }
    return new GoogleGenerativeAI(apiKey);
};

// Types
export interface TranscriptSegment {
    start: number;
    end: number;
    text: string;
    translation: string;
}

export interface TranscriptResult {
    segments: TranscriptSegment[];
    language: string;
    duration?: number;
    cached?: boolean;
}

// Cache key prefix
const TRANSCRIPT_CACHE_PREFIX = 'transcripts/';
const TRANSCRIPT_CACHE_TTL = 86400; // 24 hours

/**
 * Download audio from URL and return as base64
 * Supports both HTTP and HTTPS
 */
const downloadAudioAsBase64 = async (url: string, maxSizeMB: number = 20): Promise<string> => {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;

        client.get(url, (res) => {
            // Handle redirects
            if (res.statusCode === 301 || res.statusCode === 302) {
                if (res.headers.location) {
                    downloadAudioAsBase64(res.headers.location, maxSizeMB)
                        .then(resolve)
                        .catch(reject);
                    return;
                }
            }

            if (res.statusCode !== 200) {
                reject(new Error(`Failed to download audio: ${res.statusCode}`));
                return;
            }

            const chunks: Buffer[] = [];
            let totalSize = 0;
            const maxSize = maxSizeMB * 1024 * 1024;

            res.on('data', (chunk: Buffer) => {
                totalSize += chunk.length;
                if (totalSize > maxSize) {
                    res.destroy();
                    reject(new Error(`Audio file too large (>${maxSizeMB}MB)`));
                    return;
                }
                chunks.push(chunk);
            });

            res.on('end', () => {
                const buffer = Buffer.concat(chunks);
                resolve(buffer.toString('base64'));
            });

            res.on('error', reject);
        }).on('error', reject);
    });
};

/**
 * Get MIME type from URL
 */
const getMimeType = (url: string): string => {
    const ext = url.split('.').pop()?.toLowerCase().split('?')[0];
    const mimeTypes: Record<string, string> = {
        'mp3': 'audio/mpeg',
        'mpeg': 'audio/mpeg',
        'm4a': 'audio/mp4',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg',
        'aac': 'audio/aac',
        'flac': 'audio/flac'
    };
    return mimeTypes[ext || ''] || 'audio/mpeg';
};

/**
 * Generate transcript for podcast episode using Gemini
 * 
 * @param audioUrl - URL of the audio file
 * @param episodeId - Unique episode identifier for caching
 * @param targetLanguage - Translation target language (default: Chinese)
 */
export const generateTranscript = async (
    audioUrl: string,
    episodeId: string,
    targetLanguage: string = 'zh'
): Promise<TranscriptResult> => {
    console.log(`[Transcript] Generating transcript for episode: ${episodeId}`);

    // 1. Check S3 cache first
    const cacheKey = `${TRANSCRIPT_CACHE_PREFIX}${episodeId}.json`;
    try {
        const exists = await checkFileExists(cacheKey);
        if (exists) {
            console.log(`[Transcript] Cache hit: ${cacheKey}`);
            const cached = await downloadJSON(cacheKey);
            return { ...cached, cached: true };
        }
    } catch (e) {
        console.log(`[Transcript] Cache check failed, generating fresh`);
    }

    // 2. Download audio
    console.log(`[Transcript] Downloading audio from: ${audioUrl}`);
    let audioBase64: string;
    try {
        audioBase64 = await downloadAudioAsBase64(audioUrl, 25); // 25MB limit
    } catch (e: any) {
        console.error(`[Transcript] Failed to download audio:`, e.message);
        throw new Error('AUDIO_DOWNLOAD_FAILED');
    }

    // 3. Call Gemini with audio
    console.log(`[Transcript] Calling Gemini for transcription...`);
    const ai = getGenAI();
    const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const languageNames: Record<string, string> = {
        'zh': 'Chinese (Simplified)',
        'en': 'English',
        'vi': 'Vietnamese'
    };
    const translationLang = languageNames[targetLanguage] || 'Chinese (Simplified)';

    const prompt = `You are a professional audio transcription assistant. Transcribe this Korean podcast audio.

OUTPUT REQUIREMENTS:
1. Return a JSON array of segments with TIMESTAMPS
2. Each segment should be 3-8 seconds long
3. Include Korean text AND ${translationLang} translation
4. Be accurate with Korean spelling and grammar

JSON FORMAT (return ONLY valid JSON, no markdown):
{
  "segments": [
    { "start": 0.0, "end": 3.5, "text": "안녕하세요 여러분", "translation": "大家好" },
    { "start": 3.5, "end": 7.2, "text": "오늘 한국어를 배워봐요", "translation": "今天来学韩语吧" }
  ],
  "language": "ko",
  "duration": 120
}

IMPORTANT:
- Timestamps in SECONDS (decimal)
- Korean in "text", ${translationLang} in "translation"
- Return ONLY valid JSON, no explanation`;

    try {
        const mimeType = getMimeType(audioUrl);

        const result = await model.generateContent([
            {
                inlineData: {
                    mimeType,
                    data: audioBase64
                }
            },
            { text: prompt }
        ]);

        const responseText = result.response.text();
        console.log(`[Transcript] Gemini response received, parsing...`);

        // Parse JSON response
        const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
        const transcriptData: TranscriptResult = JSON.parse(cleanJson);

        // Validate
        if (!transcriptData.segments || !Array.isArray(transcriptData.segments)) {
            throw new Error('Invalid transcript format - missing segments array');
        }

        // 4. Save to S3 cache
        try {
            await uploadCachedJson(cacheKey, transcriptData, TRANSCRIPT_CACHE_TTL);
            console.log(`[Transcript] Saved to S3: ${cacheKey}`);
        } catch (e) {
            console.warn(`[Transcript] Failed to save to S3:`, e);
        }

        return { ...transcriptData, cached: false };

    } catch (e: any) {
        console.error(`[Transcript] Gemini transcription failed:`, e.message);

        // Check if it's a parsing error
        if (e.message.includes('JSON')) {
            throw new Error('TRANSCRIPT_PARSE_FAILED');
        }

        throw new Error('TRANSCRIPT_GENERATION_FAILED');
    }
};

/**
 * Get transcript from cache only (for pre-loading check)
 */
export const getTranscriptFromCache = async (episodeId: string): Promise<TranscriptResult | null> => {
    const cacheKey = `${TRANSCRIPT_CACHE_PREFIX}${episodeId}.json`;
    try {
        const exists = await checkFileExists(cacheKey);
        if (exists) {
            const cached = await downloadJSON(cacheKey);
            return { ...cached, cached: true };
        }
    } catch (e) {
        console.log(`[Transcript] Cache miss for: ${episodeId}`);
    }
    return null;
};
