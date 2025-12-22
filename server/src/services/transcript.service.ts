
import { uploadCachedJson } from '../lib/storage';
import { checkFileExists, downloadJSON } from './storage.service';
import OpenAI from "openai";
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';

// Set ffmpeg path for fluent-ffmpeg (using bundled binary)
if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath);
}

// Initialize SiliconFlow Client (OpenAI Compatible)
const getClient = () => {
    const apiKey = process.env.SILICONFLOW_API_KEY;
    if (!apiKey) {
        throw new Error('SILICONFLOW_API_KEY is not set');
    }
    return new OpenAI({
        apiKey: apiKey,
        baseURL: "https://api.siliconflow.cn/v1"
    });
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
const MAX_SIZE_FOR_COMPRESSION = 20 * 1024 * 1024; // 20MB

/**
 * Download audio from URL to a temp file
 */
const downloadAudioToFile = async (url: string): Promise<string> => {
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `podcast_${Date.now()}.mp3`);

    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;

        const handleResponse = (res: any) => {
            // Handle redirects
            if (res.statusCode === 301 || res.statusCode === 302) {
                if (res.headers.location) {
                    client.get(res.headers.location, handleResponse).on('error', reject);
                    return;
                }
            }

            if (res.statusCode !== 200) {
                reject(new Error(`Failed to download audio: ${res.statusCode} `));
                return;
            }

            const fileStream = fs.createWriteStream(tempFile);
            res.pipe(fileStream);

            fileStream.on('finish', () => {
                fileStream.close();
                resolve(tempFile);
            });

            fileStream.on('error', (err) => {
                fs.unlink(tempFile, () => { }); // Cleanup on error
                reject(err);
            });
        };

        client.get(url, handleResponse).on('error', reject);
    });
};

/**
 * Compress audio using FFmpeg for STT optimization
 * Output: mono, 16kHz, 32kbps - optimized for speech recognition
 */
const compressAudio = async (inputPath: string): Promise<string> => {
    const outputPath = inputPath.replace('.mp3', '_compressed.mp3');

    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .audioChannels(1)      // Mono (halves size)
            .audioFrequency(16000) // 16kHz (sufficient for speech)
            .audioBitrate('32k')   // 32kbps (highly compressed)
            .output(outputPath)
            .on('end', () => {
                console.log('[Transcript] Compression complete');
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('[Transcript] Compression failed:', err.message);
                reject(err);
            })
            .run();
    });
};

/**
 * Cleanup temp files
 */
const cleanupFiles = (...files: string[]) => {
    files.forEach(file => {
        if (file && fs.existsSync(file)) {
            fs.unlinkSync(file);
        }
    });
};

/**
 * Step 1: Transcribe using SenseVoice (ASR)
 */
const performASR = async (filePath: string): Promise<any> => {
    const client = getClient();
    console.log(`[ASR] Transcribing with SenseVoiceSmall...`);

    try {
        const response = await client.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: "FunAudioLLM/SenseVoiceSmall",
            response_format: "verbose_json",
            timestamp_granularities: ["segment"]
        });
        return response;
    } catch (e: any) {
        console.error("[ASR Failed]", e);
        throw new Error(`ASR_FAILED: ${e.message}`);
    }
}

/**
 * Step 2: Translate and Refine using DeepSeek (LLM)
 */
const translateSegments = async (segments: any[], targetLanguage: string = 'zh'): Promise<TranscriptSegment[]> => {
    const client = getClient();
    console.log(`[LLM] Translating ${segments.length} segments with DeepSeek...`);

    const CHUNK_SIZE = 50;
    const results: TranscriptSegment[] = [];

    for (let i = 0; i < segments.length; i += CHUNK_SIZE) {
        const chunk = segments.slice(i, i + CHUNK_SIZE);
        console.log(`[LLM] Processing chunk ${i / CHUNK_SIZE + 1}/${Math.ceil(segments.length / CHUNK_SIZE)}`);

        const prompt = `You are a professional translator. 
        Translate the following Korean podcast transcript segments into ${targetLanguage === 'zh' ? 'Simplified Chinese (zh-CN)' : targetLanguage}.
        
        INPUT FORMAT: JSON array of { "id": number, "text": "Korean text" }
        OUTPUT FORMAT: JSON object with a "translations" key containing an array of { "id": number, "translation": "Translated text" }
        
        RULES:
        1. Maintain the exact same IDs.
        2. Provide natural, fluent translations.
        3. Do not include the original text in the output, only ID and translation.
        4. Return ONLY valid JSON.
        
        INPUT DATA:
        ${JSON.stringify(chunk.map((s, idx) => ({ id: i + idx, text: s.text })))}`;

        try {
            const completion = await client.chat.completions.create({
                model: "deepseek-ai/DeepSeek-R1-0528-Qwen3-8B",
                messages: [
                    { role: "system", content: "You are a helpful JSON translator." },
                    { role: "user", content: prompt }
                ],
                response_format: { type: "json_object" },
                temperature: 0.3
            });

            const content = completion.choices[0].message.content;
            if (!content) throw new Error("Empty response from LLM");

            const cleanJson = content.replace(/```json\n?|\n?```/g, '').trim();
            const parsed = JSON.parse(cleanJson);

            const translationMap = new Map<number, string>(parsed.translations.map((t: any) => [t.id, t.translation]));

            chunk.forEach((seg, idx) => {
                const totalIdx = i + idx;
                results.push({
                    start: seg.start,
                    end: seg.end,
                    text: seg.text,
                    translation: translationMap.get(totalIdx) || ""
                });
            });

        } catch (e) {
            console.error(`[LLM] Chunk translation failed:`, e);
            chunk.forEach(seg => {
                results.push({
                    start: seg.start,
                    end: seg.end,
                    text: seg.text,
                    translation: ""
                });
            });
        }
    }

    return results;
}

/**
 * Generate transcript for podcast episode using SiliconFlow (ASR + LLM)
 */
export const generateTranscript = async (
    audioUrl: string,
    episodeId: string,
    targetLanguage: string = 'zh'
): Promise<TranscriptResult> => {
    console.log(`[Transcript] Generating transcript for episode: ${episodeId}`);

    // 1. Check Use Cache
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

    let originalFile: string = '';
    let compressedFile: string = '';
    let uploadFile: string = '';

    try {
        // 2. Download audio
        console.log(`[Transcript] Downloading audio from: ${audioUrl}`);
        originalFile = await downloadAudioToFile(audioUrl);

        // 3. Compress if size > 20MB
        const stats = fs.statSync(originalFile);
        const sizeMB = stats.size / (1024 * 1024);
        console.log(`[Transcript] Downloaded file size: ${sizeMB.toFixed(2)}MB`);

        if (stats.size > MAX_SIZE_FOR_COMPRESSION) {
            console.log(`[Transcript] File too large (${sizeMB.toFixed(2)}MB), compressing...`);
            compressedFile = await compressAudio(originalFile);
            uploadFile = compressedFile;

            const compressedStats = fs.statSync(compressedFile);
            console.log(`[Transcript] Compressed to: ${(compressedStats.size / (1024 * 1024)).toFixed(2)}MB`);
        } else {
            uploadFile = originalFile;
        }

        // 4. Perform ASR (SenseVoice)
        const asrResult = await performASR(uploadFile);

        if (!asrResult.segments && !asrResult.text) {
            throw new Error("ASR returned no content");
        }

        // SenseVoice typically returns segments with "text", "start", "end"
        let segments = asrResult.segments || [];

        // Fallback: If segments are empty but text exists, create one large segment
        if (segments.length === 0 && asrResult.text) {
            // Create one big segment if all else fails
            segments = [{ start: 0, end: asrResult.duration || 0, text: asrResult.text }];
        }

        // 5. Translate Segments (DeepSeek)
        const translatedSegments = await translateSegments(segments, targetLanguage);

        const transcriptData: TranscriptResult = {
            segments: translatedSegments,
            language: 'ko', // Audio is Korean
            duration: asrResult.duration,
            cached: false
        };

        // 6. Save to S3
        try {
            await uploadCachedJson(cacheKey, transcriptData, TRANSCRIPT_CACHE_TTL);
            console.log(`[Transcript] Saved to S3: ${cacheKey}`);
        } catch (e) {
            console.warn(`[Transcript] Failed to save to S3:`, e);
        }

        return transcriptData;

    } catch (e: any) {
        console.error(`[Transcript] Failed:`, e.message);
        throw e;
    } finally {
        cleanupFiles(originalFile, compressedFile);
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
        console.log(`[Transcript] Cache miss for: ${episodeId} `);
    }
    return null;
};
