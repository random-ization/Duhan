import { google } from 'googleapis';
import getYouTubeID from 'get-youtube-id';
import YTDlpWrap from 'yt-dlp-wrap';
import { parse as parseVtt } from 'node-webvtt';
import { PrismaClient } from '@prisma/client';
import * as aiService from './ai.service';
import * as storageService from './storage.service';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const youtube = google.youtube({
    version: 'v3',
    auth: process.env.YOUTUBE_API_KEY
});

interface VideoSearchResult {
    id: string;
    title: string;
    thumbnail: string;
    channelTitle: string;
    publishedAt: string;
}

/**
 * Search YouTube videos
 */
export const searchYoutube = async (query: string): Promise<VideoSearchResult[]> => {
    // DEBUG: Check if Key exists
    console.log('[VideoService] Searching for:', query);
    console.log('[VideoService] API Key configured:', !!process.env.YOUTUBE_API_KEY);

    try {
        const referer = process.env.FRONTEND_URL || 'http://localhost:5173';
        const res = await youtube.search.list(
            {
                part: ['snippet'],
                q: query,
                type: ['video'],
                videoCaption: 'closedCaption', // Prefer videos with captions
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
        console.error('YouTube Search Error Full Object:', JSON.stringify(error, null, 2));
        // Extract inner error message from Google API response if possible
        const apiMessage = error.response?.data?.error?.message || error.message;
        throw new Error(`YouTube API Error: ${apiMessage}`);
    }
};

/**
 * Get Video Data (Metadata + Transcript)
 * Handles Freemium logic and Caching
 */
export const getVideoData = async (
    youtubeId: string,
    userId: string,
    isPremium: boolean
): Promise<any> => {
    // 1. Get/Create Video Metadata
    let video = await prisma.video.findUnique({ where: { youtubeId } });

    if (!video) {
        // Fetch details from YouTube API to populate DB
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

        // Parse ISO 8601 duration (PT1H2M10S) -> seconds roughly
        // Simplified parsing or use a library. For now, we store 0 if parsing fails.
        // We can improve this later.
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

    // 2. Check for processed transcript in DB
    const language = 'zh'; // Default target language
    const isAIProcessed = true; // We want the AI enhanced one

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
        // Cache Miss - Generate
        console.log(`[Video] Cache miss for ${youtubeId}, generating...`);

        // Fetch raw transcript using yt-dlp
        let rawTranscripts: Array<{ start: number; duration: number; text: string }>;
        try {
            rawTranscripts = await fetchCaptionsViaYtdl(youtubeId);
            console.log(`[VideoService] Successfully fetched ${rawTranscripts.length} transcript segments via yt-dlp`);
        } catch (e: any) {
            console.error('[VideoService] yt-dlp transcript fetch failed:', e?.message);
            if (e?.message?.includes('No Korean captions') || e?.message?.includes('No captions available') || e?.message?.includes('SUBTITLES_NOT_FOUND')) {
                throw new Error('该视频未提供字幕，无法生成 AI 课程。请尝试搜索其他带有字幕（CC）的视频。');
            }
            throw e;
        }

        if (!rawTranscripts || rawTranscripts.length === 0) {
            throw new Error('No transcripts available for this video');
        }

        // Combine text for AI processing
        const fullText = rawTranscripts.map((t: { text: string }) => t.text).join(' ');

        // Process with AI
        const aiResult = await aiService.processTranscript(fullText, language);

        // Upload to S3
        const storageKey = `transcripts/${youtubeId}_ai_${language}.json`;
        await storageService.uploadJSON(storageKey, aiResult);

        // Save to DB
        transcriptRecord = await prisma.transcript.create({
            data: {
                videoId: video.id,
                language,
                isAIProcessed: true,
                storageKey
            }
        });

        transcriptData = aiResult;
    }

    // 3. Freemium Logic
    if (!isPremium) {
        console.log(`[Video] User is FREE, limiting content`);
        // Limit to first 60 seconds?
        // Our 'aiResult' structure is: { segments: [{original, translated}], ... }
        // We don't strictly have timestamps in the AI result unless we passed them through.
        // The prompt asked for "Divide... into segments". It didn't ask for timestamps.
        // If we want timestamps, we should have passed them to AI or mapped them back.
        // FOR NOW: Let's limit by NUMBER OF SEGMENTS as a proxy, or hide valid data after N items.

        // Let's assume 10 segments is enough for a preview if we lack timestamps.
        // OR: modifying ai.service prompt to include start/end times is better. 
        // But per current prompt in ai.service.ts, we only get text.

        // Workaround: Slice the array.
        const PREVIEW_SEGMENTS = 8; // approx 1 minute of speech
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

// Helper for duration parsing (PT1M30S -> seconds)
function parseDuration(duration: string): number {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    if (!match) return 0;

    const hours = (parseInt(match[1] || '0'));
    const minutes = (parseInt(match[2] || '0'));
    const seconds = (parseInt(match[3] || '0'));

    return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Fetch captions using yt-dlp
 * Prefers manual Korean captions over ASR (Automatic Speech Recognition)
 */
interface TranscriptSegment {
    start: number;
    duration: number;
    text: string;
}

// yt-dlp binary path - will be downloaded if not exists
const YT_DLP_BINARY_PATH = path.join(process.cwd(), 'bin', 'yt-dlp');
const TEMP_SUBS_DIR = path.join(process.cwd(), 'temp_subs');

// Initialize yt-dlp wrapper
let ytDlpInstance: YTDlpWrap | null = null;

async function getYtDlpInstance(): Promise<YTDlpWrap> {
    if (ytDlpInstance) return ytDlpInstance;

    // Ensure bin directory exists
    const binDir = path.dirname(YT_DLP_BINARY_PATH);
    if (!fs.existsSync(binDir)) {
        fs.mkdirSync(binDir, { recursive: true });
    }

    // Download yt-dlp binary if not exists
    if (!fs.existsSync(YT_DLP_BINARY_PATH)) {
        console.log('[yt-dlp] Binary not found, downloading...');
        try {
            await YTDlpWrap.downloadFromGithub(YT_DLP_BINARY_PATH);
            console.log('[yt-dlp] Binary downloaded successfully');
        } catch (error: any) {
            console.error('[yt-dlp] Failed to download binary:', error?.message);
            throw new Error('Failed to download yt-dlp binary');
        }
    }

    ytDlpInstance = new YTDlpWrap(YT_DLP_BINARY_PATH);
    return ytDlpInstance;
}

async function fetchCaptionsViaYtdl(videoId: string): Promise<TranscriptSegment[]> {
    console.log(`[yt-dlp] Fetching captions for video: ${videoId}`);

    const ytDlp = await getYtDlpInstance();
    const url = `https://www.youtube.com/watch?v=${videoId}`;

    // Ensure temp directory exists
    if (!fs.existsSync(TEMP_SUBS_DIR)) {
        fs.mkdirSync(TEMP_SUBS_DIR, { recursive: true });
    }

    const outputTemplate = path.join(TEMP_SUBS_DIR, '%(id)s');

    try {
        // Run yt-dlp to download subtitles only
        console.log('[yt-dlp] Downloading subtitles...');
        await ytDlp.execPromise([
            url,
            '--write-auto-sub',      // Get auto-generated captions if manual don't exist
            '--write-sub',           // Get manual captions
            '--sub-lang', 'ko,ko-KR', // Prefer Korean
            '--skip-download',       // Don't download video
            '--output', outputTemplate,
            '--no-warnings',
            '--quiet'
        ]);

        // Find the generated subtitle file
        const files = fs.readdirSync(TEMP_SUBS_DIR);
        const subFile = files.find(f =>
            f.startsWith(videoId) && (f.endsWith('.vtt') || f.endsWith('.srt'))
        );

        if (!subFile) {
            console.log('[yt-dlp] No subtitle file created');
            throw new Error('SUBTITLES_NOT_FOUND');
        }

        console.log(`[yt-dlp] Found subtitle file: ${subFile}`);

        // Read and parse the subtitle file
        const fullPath = path.join(TEMP_SUBS_DIR, subFile);
        const content = fs.readFileSync(fullPath, 'utf-8');

        // Cleanup: delete the file immediately after reading
        fs.unlinkSync(fullPath);

        // Parse VTT content
        let segments: TranscriptSegment[];

        if (subFile.endsWith('.vtt')) {
            // Sanitize VTT content before parsing
            const cleanedContent = fixVttContent(content);
            const parsed = parseVtt(cleanedContent);
            segments = parsed.cues.map((cue: any) => ({
                start: cue.start,
                duration: cue.end - cue.start,
                text: cue.text.replace(/<[^>]*>/g, '').trim() // Remove HTML tags
            }));
        } else {
            // SRT format - simple parsing
            segments = parseSrt(content);
        }

        // Filter out empty segments and duplicates
        segments = segments.filter(s => s.text.length > 0);

        console.log(`[yt-dlp] Parsed ${segments.length} transcript segments`);

        if (segments.length === 0) {
            throw new Error('Failed to parse transcript segments');
        }

        return segments;

    } catch (error: any) {
        console.error('[yt-dlp] Error:', error?.message || error);

        // Cleanup temp directory on error
        try {
            const files = fs.readdirSync(TEMP_SUBS_DIR);
            files.forEach(f => {
                if (f.startsWith(videoId)) {
                    fs.unlinkSync(path.join(TEMP_SUBS_DIR, f));
                }
            });
        } catch { }

        if (error?.message === 'SUBTITLES_NOT_FOUND') {
            throw new Error('No Korean captions available for this video');
        }
        throw error;
    }
}

/**
 * Sanitize VTT content to fix common parsing issues
 * - Normalizes newlines
 * - Removes BOM
 * - Ensures proper blank line after WEBVTT header
 */
function fixVttContent(rawContent: string): string {
    // 1. Normalize newlines
    let content = rawContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // 2. Remove BOM (Byte Order Mark)
    if (content.charCodeAt(0) === 0xFEFF) {
        content = content.slice(1);
    }

    // 3. Ensure content starts with WEBVTT header
    content = content.trimStart();
    if (!content.startsWith('WEBVTT')) {
        content = 'WEBVTT\n\n' + content;
    }

    // 4. Force blank line before first cue (fixes "Missing blank line after signature" error)
    const firstCueIndex = content.search(/\d{2}:\d{2}:\d{2}\.\d{3}\s+-->/);
    if (firstCueIndex > -1) {
        const headerPart = content.substring(0, firstCueIndex);
        const bodyPart = content.substring(firstCueIndex);
        if (!headerPart.endsWith('\n\n')) {
            return headerPart.trimEnd() + '\n\n' + bodyPart;
        }
    }

    return content;
}

// Simple SRT parser as fallback
function parseSrt(content: string): TranscriptSegment[] {
    const segments: TranscriptSegment[] = [];
    const blocks = content.split(/\n\n+/);

    for (const block of blocks) {
        const lines = block.trim().split('\n');
        if (lines.length < 3) continue;

        // Parse timestamp line (e.g., "00:00:01,000 --> 00:00:04,000")
        const timeLine = lines[1];
        const timeMatch = timeLine.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);

        if (!timeMatch) continue;

        const startSeconds =
            parseInt(timeMatch[1]) * 3600 +
            parseInt(timeMatch[2]) * 60 +
            parseInt(timeMatch[3]) +
            parseInt(timeMatch[4]) / 1000;

        const endSeconds =
            parseInt(timeMatch[5]) * 3600 +
            parseInt(timeMatch[6]) * 60 +
            parseInt(timeMatch[7]) +
            parseInt(timeMatch[8]) / 1000;

        const text = lines.slice(2).join(' ').replace(/<[^>]*>/g, '').trim();

        if (text) {
            segments.push({
                start: startSeconds,
                duration: endSeconds - startSeconds,
                text
            });
        }
    }

    return segments;
}
