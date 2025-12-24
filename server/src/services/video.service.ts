import { google } from 'googleapis';
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaClient } from '@prisma/client';
import * as storageService from './storage.service';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';

const prisma = new PrismaClient();

const youtube = google.youtube({
    version: 'v3',
    auth: process.env.YOUTUBE_API_KEY
});

// Initialize Gemini AI
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY as string);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

// Temp audio directory
const TEMP_AUDIO_DIR = path.join(process.cwd(), 'temp_audio');

interface VideoSearchResult {
    id: string;
    title: string;
    thumbnail: string;
    channelTitle: string;
    publishedAt: string;
}

interface TranscriptSegment {
    start: number;
    duration: number;
    text: string;
    translation: string;
}

/**
 * Search YouTube videos
 */
export const searchYoutube = async (query: string): Promise<VideoSearchResult[]> => {
    console.log('[VideoService] Searching for:', query);
    console.log('[VideoService] API Key configured:', !!process.env.YOUTUBE_API_KEY);

    try {
        const referer = process.env.FRONTEND_URL || 'http://localhost:5173';
        const res = await youtube.search.list(
            {
                part: ['snippet'],
                q: query,
                type: ['video'],
                maxResults: 10
            },
            {
                headers: {
                    Referer: referer
                }
            }
        );

        if (!res.data.items) return [];

        return res.data.items.map(item => ({
            id: item.id?.videoId || '',
            title: item.snippet?.title || '',
            thumbnail: item.snippet?.thumbnails?.high?.url || '',
            channelTitle: item.snippet?.channelTitle || '',
            publishedAt: item.snippet?.publishedAt || ''
        }));
    } catch (error: any) {
        console.error('YouTube Search Error:', JSON.stringify(error, null, 2));
        const apiMessage = error.response?.data?.error?.message || error.message;
        throw new Error(`YouTube API Error: ${apiMessage}`);
    }
};

/**
 * Get Video Data (Metadata + AI-Generated Transcript)
 * Uses Gemini 1.5 Flash to transcribe audio and translate to Chinese
 */
export const getVideoData = async (
    youtubeId: string,
    userId: string,
    isPremium: boolean
): Promise<any> => {
    // 1. Get/Create Video Metadata
    let video = await prisma.video.findUnique({ where: { youtubeId } });

    if (!video) {
        const referer = process.env.FRONTEND_URL || 'http://localhost:5173';
        const res = await youtube.videos.list(
            {
                part: ['snippet', 'contentDetails'],
                id: [youtubeId]
            },
            {
                headers: {
                    Referer: referer
                }
            }
        );

        const item = res.data.items?.[0];
        if (!item) throw new Error('Video not found on YouTube');

        const durationStr = item.contentDetails?.duration || '';
        const duration = parseDuration(durationStr);

        video = await prisma.video.create({
            data: {
                youtubeId,
                title: item.snippet?.title || 'Unknown Title',
                thumbnail: item.snippet?.thumbnails?.high?.url || '',
                channelTitle: item.snippet?.channelTitle || '',
                duration
            }
        });
    }

    // 2. Check for cached transcript
    const language = 'zh';
    const isAIProcessed = true;

    let transcriptRecord = await prisma.transcript.findUnique({
        where: {
            videoId_language_isAIProcessed: {
                videoId: video.id,
                language,
                isAIProcessed
            }
        }
    });

    let transcriptData;

    if (transcriptRecord) {
        // Cache Hit
        console.log(`[Video] Cache hit for ${youtubeId}`);
        transcriptData = await storageService.downloadJSON(transcriptRecord.storageKey);
    } else {
        // Cache Miss - Generate using Full AI approach
        console.log(`[Video] Cache miss for ${youtubeId}, generating with AI...`);

        // Process video with Gemini AI
        const segments = await processVideoWithAI(youtubeId);

        // Format for storage
        transcriptData = {
            segments: segments.map(seg => ({
                original: seg.text,
                translated: seg.translation,
                start: seg.start,
                duration: seg.duration
            })),
            generatedAt: new Date().toISOString(),
            method: 'gemini-1.5-flash'
        };

        // Upload to S3
        const storageKey = `transcripts/${youtubeId}_ai_${language}.json`;
        await storageService.uploadJSON(storageKey, transcriptData);

        // Save to DB
        transcriptRecord = await prisma.transcript.create({
            data: {
                videoId: video.id,
                language,
                isAIProcessed: true,
                storageKey
            }
        });
    }

    // 3. Freemium Logic
    if (!isPremium) {
        console.log(`[Video] User is FREE, limiting content`);
        const PREVIEW_SEGMENTS = 8;
        if (transcriptData.segments && transcriptData.segments.length > PREVIEW_SEGMENTS) {
            transcriptData.segments = transcriptData.segments.slice(0, PREVIEW_SEGMENTS);
            transcriptData.isPreview = true;
            transcriptData.upgradeMessage = "Upgrade to Premium to see the full transcript.";
        }
    }

    return {
        video,
        transcript: transcriptData
    };
};

/**
 * Process video with Gemini AI
 * Downloads audio -> Uploads to Gemini -> Transcribes & Translates
 */
async function processVideoWithAI(videoId: string): Promise<TranscriptSegment[]> {
    // Ensure temp directory exists
    if (!fs.existsSync(TEMP_AUDIO_DIR)) {
        fs.mkdirSync(TEMP_AUDIO_DIR, { recursive: true });
    }

    const audioPath = path.join(TEMP_AUDIO_DIR, `${videoId}.webm`);

    try {
        // Step 1: Download audio via yt-dlp (webm format, no ffmpeg needed)
        console.log(`[AI] 1. Downloading audio for ${videoId}...`);
        await downloadAudio(videoId, audioPath);

        // Step 2: Upload to Gemini
        console.log(`[AI] 2. Uploading audio to Gemini...`);
        const uploadResult = await fileManager.uploadFile(audioPath, {
            mimeType: 'audio/webm',
            displayName: `yt_${videoId}`
        });

        // Wait for Gemini to process the file
        let file = await fileManager.getFile(uploadResult.file.name);
        let attempts = 0;
        while (file.state === FileState.PROCESSING && attempts < 60) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            file = await fileManager.getFile(uploadResult.file.name);
            attempts++;
            process.stdout.write('.');
        }
        console.log('');

        if (file.state === FileState.FAILED) {
            throw new Error('Gemini failed to process audio file');
        }

        // Step 3: Generate transcript with AI
        console.log(`[AI] 3. Generating transcript with Gemini...`);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

        const result = await model.generateContent([
            {
                fileData: {
                    mimeType: uploadResult.file.mimeType,
                    fileUri: uploadResult.file.uri
                }
            },
            {
                text: `
You are a Korean language expert and professional translator.

Task: Listen to this audio, transcribe the Korean speech, and translate it to Simplified Chinese.

Requirements:
1. Return ONLY a valid JSON array. Do NOT use markdown code blocks.
2. Restore proper punctuation (periods, commas, question marks) for readability.
3. Each segment should be 5-15 seconds of speech.
4. Structure: [{"start": 0.0, "duration": 5.0, "text": "Korean text here", "translation": "中文翻译"}]

Important:
- "start" is the timestamp in seconds when the speech begins
- "duration" is how long this speech segment lasts in seconds  
- "text" is the original Korean transcription
- "translation" is the Chinese translation

If there is no speech or the audio is unclear, return an empty array: []
                `.trim()
            }
        ]);

        // Step 4: Cleanup local file
        if (fs.existsSync(audioPath)) {
            fs.unlinkSync(audioPath);
        }

        // Step 5: Parse response
        console.log(`[AI] 4. Parsing AI response...`);
        const responseText = result.response.text();

        // Clean up markdown formatting if present
        let cleanJson = responseText
            .replace(/```json\s*/g, '')
            .replace(/```\s*/g, '')
            .trim();

        // Try to parse JSON
        try {
            const segments = JSON.parse(cleanJson) as TranscriptSegment[];
            console.log(`[AI] Successfully generated ${segments.length} transcript segments`);
            return segments;
        } catch (parseError) {
            console.error('[AI] Failed to parse JSON response:', cleanJson.substring(0, 500));
            throw new Error('Failed to parse AI transcript response');
        }

    } catch (error: any) {
        // Cleanup on error
        if (fs.existsSync(audioPath)) {
            fs.unlinkSync(audioPath);
        }

        console.error('[AI] Error processing video:', error?.message);
        throw new Error(`AI transcription failed: ${error?.message}`);
    }
}

/**
 * Download audio using Cobalt API (Updated for v10+)
 */
async function downloadAudio(videoId: string, outputPath: string): Promise<void> {
    console.log(`[Cobalt] Requesting audio for ${videoId}...`);

    // [修正点 1] 新版 API 的地址不再包含 /api/json，直接 POST 到根路径
    const cobaltApiUrl = 'https://api.cobalt.tools';

    try {
        // 2. 发送请求给 Cobalt
        const response = await fetch(cobaltApiUrl, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (compatible; HangyeolApp/1.0;)'
            },
            body: JSON.stringify({
                url: `https://www.youtube.com/watch?v=${videoId}`,
                // [修正点 2] 参数升级适配新版 API
                downloadMode: 'audio', // 替代旧版的 isAudioOnly
                audioFormat: 'mp3',    // 替代旧版的 aFormat
                filenameStyle: 'basic' // 保持文件名简单
            })
        });

        const data = await response.json() as { status?: string; url?: string; error?: { code?: string } };

        // 3. 错误处理
        // Cobalt v10 的错误返回结构是 { status: 'error', error: { code: '...' } }
        if (data?.status === 'error') {
            console.error('[Cobalt] API Error Response:', data);
            throw new Error(`Cobalt API returned error: ${data?.error?.code || 'Unknown error'}`);
        }

        // v10 成功时 status 是 'tunnel' 或 'redirect'，链接在 url 字段
        if (!data?.url) {
            console.error('[Cobalt] Unexpected response format:', data);
            throw new Error('Cobalt API did not return a download URL');
        }

        const downloadUrl = data.url;
        console.log(`[Cobalt] Got download URL, fetching stream...`);

        // 4. 从 Cobalt 返回的链接下载实际文件
        const audioRes = await fetch(downloadUrl);

        if (!audioRes.ok) throw new Error(`Failed to download from Cobalt URL: ${audioRes.statusText}`);
        if (!audioRes.body) throw new Error('Response body is empty');

        // 5. 写入本地文件
        const fileStream = fs.createWriteStream(outputPath);

        // Node.js stream 处理
        // @ts-ignore: fetch body is a readable stream in Node environment
        const nodeStream = Readable.fromWeb(audioRes.body as any);

        await new Promise<void>((resolve, reject) => {
            nodeStream.pipe(fileStream);
            nodeStream.on('error', (err: any) => {
                console.error('[Cobalt] Stream write error:', err);
                reject(err);
            });
            fileStream.on('finish', resolve);
        });

        console.log(`[Cobalt] Download complete: ${outputPath}`);

        // 6. 校验文件大小
        const stats = fs.statSync(outputPath);
        if (stats.size < 1000) {
            throw new Error('Downloaded file is too small, likely an error page.');
        }

    } catch (error: any) {
        console.error('[Cobalt] Critical Error:', error);
        throw new Error(`Cobalt download failed: ${error.message}`);
    }
}

/**
 * Helper for duration parsing (PT1M30S -> seconds)
 */
function parseDuration(duration: string): number {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    return hours * 3600 + minutes * 60 + seconds;
}
