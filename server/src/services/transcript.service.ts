import { uploadCachedJson } from '../lib/storage';
import { checkFileExists, downloadJSON, deleteFile } from './storage.service';
import OpenAI from "openai";
import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { path as ffprobePath } from 'ffprobe-static';

// Set ffmpeg and ffprobe paths
if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath);
}
if (ffprobePath) {
    ffmpeg.setFfprobePath(ffprobePath);
}

// ============================================
// 1. Initialization (Hybrid Strategy)
// ============================================

// Client: OpenAI Official (Used for BOTH Whisper and GPT-4o-mini)
const getOpenAIClient = () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is not set');

    return new OpenAI({
        apiKey: apiKey
    });
};

// Types
export interface TranscriptWord {
    word: string;
    start: number;
    end: number;
}

export interface TranscriptSegment {
    start: number;
    end: number;
    text: string;
    translation?: string;
    words?: TranscriptWord[];
}

export interface TranscriptResult {
    segments: TranscriptSegment[];
    language: string;
    duration?: number;
    cached?: boolean;
}

const TRANSCRIPT_CACHE_PREFIX = 'transcripts/';
const TRANSCRIPT_CACHE_TTL = 86400; // 24 hours
const MAX_SIZE_FOR_COMPRESSION = 24 * 1024 * 1024; // 24MB (Whisper limit is 25MB)

// ============================================
// 2. Helpers
// ============================================

const downloadAudioToFile = async (url: string): Promise<string> => {
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `podcast_${Date.now()}.mp3`);

    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        const handleResponse = (res: any) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                if (res.headers.location) {
                    client.get(res.headers.location, handleResponse).on('error', reject);
                    return;
                }
            }
            if (res.statusCode !== 200) {
                reject(new Error(`Failed to download audio: ${res.statusCode}`));
                return;
            }
            const fileStream = fs.createWriteStream(tempFile);
            res.pipe(fileStream);
            fileStream.on('finish', () => { fileStream.close(); resolve(tempFile); });
            fileStream.on('error', (err) => { fs.unlink(tempFile, () => { }); reject(err); });
        };
        client.get(url, handleResponse).on('error', reject);
    });
};

/**
 * Compress audio to speed up upload and meet Whisper size limits.
 * Target: 16k sample rate, 64k bitrate, Mono.
 */
const compressAudio = async (inputPath: string): Promise<string> => {
    const outputPath = inputPath.replace('.mp3', '_opt.mp3');

    return new Promise((resolve, reject) => {
        ffmpeg(inputPath)
            .audioChannels(1)
            .audioFrequency(16000)
            .audioBitrate('64k') // Optimized for Whisper
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
 * Get audio duration using ffprobe
 */
const getAudioDuration = (filePath: string): Promise<number> => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) return reject(err);
            resolve(metadata.format.duration || 0);
        });
    });
};

const cleanupFiles = (...files: string[]) => {
    files.forEach(file => {
        if (file && fs.existsSync(file)) fs.unlinkSync(file);
    });
};

// ============================================
// 3. Core Logic (OpenAI Whisper)
// ============================================

/**
 * Step 1: Transcribe Audio (Returns Segments with Timestamps)
 * Provider: OpenAI (Whisper-1)
 */
const transcribeWithWhisper = async (filePath: string, maxDuration?: number): Promise<TranscriptSegment[]> => {
    const client = getOpenAIClient();
    console.log(`[ASR] Transcribing with OpenAI Whisper (Word+Segment)...`);

    try {
        const response: any = await client.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: "whisper-1",

            // 🔥 CRITICAL SETTINGS 🔥
            response_format: "verbose_json",
            timestamp_granularities: ["segment", "word"], // Request Word Timestamps
            language: "ko", // Force Korean to prevent hallucinations
            prompt: "This is a Korean podcast about daily life and culture." // Context context
        });

        // Debug logging
        // console.log(`[ASR Debug] Keys:`, Object.keys(response));

        if (!response.segments) {
            console.warn(`[ASR] No segments returned.`);
            if (response.text) {
                return [{
                    start: 0,
                    end: response.duration || maxDuration || 0,
                    text: response.text.trim(),
                    translation: "",
                    words: []
                }];
            }
            throw new Error("ASR output missing segments");
        }

        // Map words to segments
        const allWords = response.words || [];
        // console.log(`[ASR] Received ${allWords.length} words.`);

        let segments: TranscriptSegment[] = response.segments.map((seg: any) => {
            // Find words belonging to this segment
            const segWords = allWords.filter((w: any) => w.start >= seg.start && w.end <= seg.end);

            return {
                start: seg.start,
                end: seg.end,
                text: seg.text.trim(),
                translation: "",
                words: segWords.map((w: any) => ({
                    word: w.word,
                    start: w.start,
                    end: w.end
                }))
            };
        });

        // 🔥 FILTER: Remove segments beyond actual duration (Hallucination Fix)
        if (maxDuration) {
            const originalCount = segments.length;
            segments = segments.filter(req => req.start < maxDuration);

            // Clamp the last segment
            if (segments.length > 0) {
                const last = segments[segments.length - 1];
                if (last.end > maxDuration) last.end = maxDuration;
            }
            console.log(`[ASR] Duration Clamp: ${originalCount} -> ${segments.length} segments (Max: ${maxDuration}s)`);
        }

        return segments;

    } catch (error: any) {
        console.error("[ASR Failed]", error);
        throw new Error(`ASR_FAILED: ${error.message}`);
    }
}

/**
 * Step 1.5: Batch Translate Segments (Korean -> Target Language)
 * Provider: OpenAI (GPT-4o-mini)
 */
const translateSegments = async (
    segments: TranscriptSegment[],
    targetLanguage: string = 'zh'
): Promise<TranscriptSegment[]> => {
    const client = getOpenAIClient();
    console.log(`[Translation] Translating ${segments.length} segments to ${targetLanguage} with GPT-4o-mini...`);

    // Batch size to prevent context window overflow (approx 20-30 segments per batch)
    const BATCH_SIZE = 20;
    const translatedSegments = [...segments];

    for (let i = 0; i < segments.length; i += BATCH_SIZE) {
        const batch = segments.slice(i, i + BATCH_SIZE);
        const batchIndices = batch.map((_, idx) => i + idx);

        // Prepare prompt
        const textsToTranslate = batch.map((seg, idx) => `${idx + 1}. ${seg.text}`).join('\n');
        const prompt = `You are a professional translator. Translate the following Korean podcast transcript segments into Chinese (Simplified).
        
        Rules:
        1. Maintain the tone and nuance of spoken Korean.
        2. Output ONLY the translations, line by line, numbered exactly as input.
        3. Do not add explanations or notes.
        
        Input:
        ${textsToTranslate}
        `;

        try {
            const completion = await client.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.3
            });

            const response = completion.choices[0].message.content || "";
            const lines = response.split('\n').filter(line => /^\d+\./.test(line.trim()));

            lines.forEach(line => {
                const match = line.match(/^(\d+)\.\s+(.*)/);
                if (match) {
                    const localIndex = parseInt(match[1]) - 1;
                    const globalIndex = i + localIndex;
                    if (globalIndex < translatedSegments.length) {
                        translatedSegments[globalIndex].translation = match[2].trim();
                    }
                }
            });

            console.log(`[Translation] Processed batch ${i / BATCH_SIZE + 1}/${Math.ceil(segments.length / BATCH_SIZE)}`);

        } catch (e) {
            console.error(`[Translation] Batch failed at index ${i}`, e);
            // Continue without translation for this batch rather than failing everything
        }
    }

    return translatedSegments;
};

/**
 * Step 1.2: Refine Segments (Smart Segmentation)
 * Merges short fragments to form complete sentences.
 */
const refineSegments = (segments: TranscriptSegment[]): TranscriptSegment[] => {
    console.log(`[SegRe] Refining ${segments.length} segments...`);
    const refined: TranscriptSegment[] = [];
    let current: TranscriptSegment | null = null;

    for (const seg of segments) {
        if (!current) {
            current = { ...seg };
            continue;
        }

        // Merge logic
        const duration = current.end - current.start;
        const textlen = current.text.length;
        const endsWithPunctuation = /[.!?。！？]$/.test(current.text);

        // Conditions to merge with next:
        // 1. Very short duration (< 1.5s)
        // 2. Very short text (< 10 chars) NOT ending in punctuation
        // 3. Does not end in punctuation AND duration < 4s (sentence continuation)
        const shouldMerge =
            (duration < 1.0) ||
            (textlen < 15 && !endsWithPunctuation) ||
            (!endsWithPunctuation && duration < 3.0);

        if (shouldMerge) {
            // Merge seg into current
            current.end = seg.end;
            current.text = `${current.text} ${seg.text}`.trim();
            if (seg.words) {
                current.words = [...(current.words || []), ...seg.words];
            }
        } else {
            // Current is good, push and start new
            refined.push(current);
            current = { ...seg };
        }
    }

    if (current) refined.push(current);

    console.log(`[SegRe] Refined to ${refined.length} segments (Reduced by ${segments.length - refined.length})`);
    return refined;
};

/**
 * Step 2: On-Demand Analysis (Called when user clicks "Analyze" button)
 * Provider: OpenAI (GPT-4o-mini)
 */
export const analyzeSentence = async (sentence: string, context: string = "", targetLanguage: string = "zh"): Promise<any> => {
    const client = getOpenAIClient();
    console.log(`[LLM] Analyzing sentence with OpenAI (GPT-4o-mini)...`);

    const languageNames: Record<string, string> = {
        'zh': 'Chinese (Simplified)',
        'en': 'English',
        'ko': 'Korean',
        'vi': 'Vietnamese'
    };
    const outputLanguage = languageNames[targetLanguage] || 'Chinese (Simplified)';

    // Robust Prompt with Schema
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
          "type": "Noun"
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
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful Korean tutor. Output strict JSON."
                },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.2
        });

        const content = completion.choices[0].message.content;
        return content ? JSON.parse(content) : {};
    } catch (e) {
        console.error(`[Analysis Failed]`, e);
        throw e;
    }
};

/**
 * Orchestrator: Generate transcript for podcast
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
        if (await checkFileExists(cacheKey)) {
            console.log(`[Transcript] Cache hit: ${cacheKey}`);
            const cached: TranscriptResult = await downloadJSON(cacheKey);

            // Check if we need to backfill translations
            if (targetLanguage && cached.segments.length > 0 && !cached.segments[0].translation) {
                console.log(`[Transcript] Cached version missing translations. Backfilling...`);
                cached.segments = await translateSegments(cached.segments, targetLanguage);

                // Re-save to cache
                await uploadCachedJson(cacheKey, cached, TRANSCRIPT_CACHE_TTL);
                return { ...cached, cached: false }; // Mark as fresh since we modified it
            }

            return { ...cached, cached: true };
        }
    } catch (e) { /* ignore */ }

    let originalFile: string = '';
    let compressedFile: string = '';
    let uploadFile: string = '';

    try {
        // 2. Download audio
        console.log(`[Transcript] Downloading audio from: ${audioUrl}`);
        originalFile = await downloadAudioToFile(audioUrl);

        // 🔍 PROBE DURATION 🔍
        const originalDuration = await getAudioDuration(originalFile);
        console.log(`[Transcript] Audio Duration: ${originalDuration}s`);

        // 3. Compress if size > 20MB
        const stats = fs.statSync(originalFile);
        const sizeMB = stats.size / (1024 * 1024);

        if (stats.size > MAX_SIZE_FOR_COMPRESSION) {
            console.log(`[Transcript] File large (${sizeMB.toFixed(2)}MB), compressing...`);
            compressedFile = await compressAudio(originalFile);
            uploadFile = compressedFile;
        } else {
            uploadFile = originalFile;
        }

        // 4. Perform ASR (OpenAI Whisper) - Pass Duration for clamping
        let segments = await transcribeWithWhisper(uploadFile, originalDuration);

        // 4.2 Refine Segments (Merge short/broken lines)
        segments = refineSegments(segments);

        // 4.5 Translate Segments (New)
        if (targetLanguage) {
            segments = await translateSegments(segments, targetLanguage);
        }

        const transcriptData: TranscriptResult = {
            segments: segments,
            language: 'ko',
            duration: originalDuration, // Use authoritative duration
            cached: false
        };

        // 5. Save to S3
        uploadCachedJson(cacheKey, transcriptData, TRANSCRIPT_CACHE_TTL).catch(console.warn);

        return transcriptData;

    } catch (e: any) {
        console.error(`[Transcript] Failed:`, e.message);
        throw e;
    } finally {
        cleanupFiles(originalFile, compressedFile);
    }
};

// Legacy support if needed
export const getTranscriptFromCache = async (episodeId: string): Promise<TranscriptResult | null> => {
    const cacheKey = `${TRANSCRIPT_CACHE_PREFIX}${episodeId}.json`;
    try {
        if (await checkFileExists(cacheKey)) {
            const cached: TranscriptResult = await downloadJSON(cacheKey);
            return { ...cached, cached: true };
        }
    } catch (e) { /* ignore */ }
    return null;
};

/**
 * Delete transcript from S3 cache
 */
export const deleteTranscriptCache = async (episodeId: string): Promise<boolean> => {
    const cacheKey = `${TRANSCRIPT_CACHE_PREFIX}${episodeId}.json`;
    try {
        if (await checkFileExists(cacheKey)) {
            console.log(`[Transcript] Deleting cache: ${cacheKey}`);
            await deleteFile(cacheKey);
            return true;
        }
        return false;
    } catch (e) {
        console.error(`[Transcript] Failed to delete cache:`, e);
        throw e;
    }
};
