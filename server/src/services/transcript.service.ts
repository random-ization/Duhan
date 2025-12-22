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
    translation?: string;
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
 * On-Demand Analysis (Called when user clicks "Analyze" button)
 */
export const analyzeSentence = async (sentence: string, context: string = "", targetLanguage: string = "zh"): Promise<any> => {
    const client = getClient();
    console.log(`[LLM] Analyzing sentence: "${sentence.substring(0, 20)}..."`);

    const languageNames: Record<string, string> = {
        'zh': 'Chinese (Simplified)',
        'en': 'English',
        'ko': 'Korean',
        'vi': 'Vietnamese'
    };
    const outputLanguage = languageNames[targetLanguage] || 'Chinese (Simplified)';

    const prompt = `You are a professional Korean language tutor. Analyze the provided Korean sentence.
    
    Sentence: "${sentence}"
    ${context ? `Context: ${context}` : ''}
    
    Return a STRICT JSON object with the following structure. All explanations must be in ${outputLanguage}.
    
    {
      "vocabulary": [
        {
          "word": "The word as it appears",
          "root": "Dictionary/Root form",
          "meaning": "Definition in ${outputLanguage}",
          "type": "Noun/Verb/Adj/etc"
        }
      ],
      "grammar": [
        {
          "structure": "Grammar pattern (e.g., -기가)",
          "explanation": "Explanation in ${outputLanguage}"
        }
      ],
      "nuance": "Formality, tone, and context in ${outputLanguage}"
    }
    
    Return ONLY valid JSON.`;

    try {
        const completion = await client.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are a helpful JSON translator and language expert."
                },
                { role: "user", content: prompt }
            ],
            model: "deepseek-ai/DeepSeek-R1-0528-Qwen3-8B",
            response_format: { type: "json_object" }
        });

        const content = completion.choices[0].message.content;
        return content ? JSON.parse(content) : null;
    } catch (e) {
        console.error(`[Analysis Failed]`, e);
        throw e;
    }
};

/**
 * Perform ASR with strictly formatted segments
 */
const performStrictASR = async (filePath: string): Promise<TranscriptSegment[]> => {
    const client = getClient();
    console.log(`[ASR] Starting SenseVoice transcription...`);

    try {
        const response: any = await client.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: "FunAudioLLM/SenseVoiceSmall",
            // 🔥 CRITICAL: Request detailed segments
            response_format: "verbose_json",
            timestamp_granularities: ["segment"]
        });

        // 2. Format the output for Frontend
        if (!response.segments) {
            throw new Error("ASR output missing segments");
        }

        const segments: TranscriptSegment[] = response.segments.map((seg: any) => ({
            start: seg.start,
            end: seg.end,
            text: seg.text.trim(),
            translation: "" // Initial translation is empty
        }));

        console.log(`[ASR] Success! Generated ${segments.length} segments.`);
        return segments;

    } catch (error: any) {
        console.error("[ASR Failed]", error);
        throw new Error(`ASR_FAILED: ${error.message}`);
    }
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

        // 4. Perform Strict ASR (formatted segments)
        // No full translation step - we rely on on-demand analysis
        const segments = await performStrictASR(uploadFile);

        const transcriptData: TranscriptResult = {
            segments: segments,
            language: 'ko', // Audio is Korean
            duration: segments.length > 0 ? segments[segments.length - 1].end : 0,
            cached: false
        };

        // 5. Save to S3
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
