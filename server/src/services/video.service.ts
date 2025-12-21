import { google } from 'googleapis';
import getYouTubeID from 'get-youtube-id';
import ytdl from '@distube/ytdl-core';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import * as aiService from './ai.service';
import * as storageService from './storage.service';

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

        // Fetch raw transcript using ytdl-core
        let rawTranscripts: Array<{ start: number; duration: number; text: string }>;
        try {
            rawTranscripts = await fetchCaptionsViaYtdl(youtubeId);
            console.log(`[VideoService] Successfully fetched ${rawTranscripts.length} transcript segments via ytdl-core`);
        } catch (e: any) {
            console.error('[VideoService] ytdl-core transcript fetch failed:', e?.message);
            if (e?.message?.includes('No Korean captions') || e?.message?.includes('No captions available')) {
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
 * Fetch captions using ytdl-core's internal metadata
 * Prefers manual Korean captions over ASR (Automatic Speech Recognition)
 */
interface CaptionTrack {
    baseUrl: string;
    languageCode: string;
    kind?: string; // 'asr' for auto-generated
    name?: { simpleText?: string };
}

interface TranscriptSegment {
    start: number;
    duration: number;
    text: string;
}

async function fetchCaptionsViaYtdl(videoId: string): Promise<TranscriptSegment[]> {
    console.log(`[ytdl-core] Fetching caption info for video: ${videoId}`);

    // Get video info including caption tracks
    const info = await ytdl.getInfo(videoId);

    // Access caption tracks from player response
    const playerResponse = info.player_response as any;
    const captionTracks: CaptionTrack[] = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!captionTracks || captionTracks.length === 0) {
        console.log('[ytdl-core] No caption tracks found');
        throw new Error('No captions available for this video');
    }

    console.log(`[ytdl-core] Found ${captionTracks.length} caption tracks:`,
        captionTracks.map(t => `${t.languageCode}${t.kind === 'asr' ? ' (ASR)' : ''}`).join(', '));

    // Filter for Korean captions (ko or ko-KR)
    const koreanTracks = captionTracks.filter(track =>
        track.languageCode === 'ko' || track.languageCode === 'ko-KR'
    );

    if (koreanTracks.length === 0) {
        console.log('[ytdl-core] No Korean caption tracks found');
        throw new Error('No Korean captions available for this video');
    }

    // Prefer manual captions over ASR
    // ASR tracks have kind: 'asr'
    let selectedTrack = koreanTracks.find(track => track.kind !== 'asr');
    if (!selectedTrack) {
        // Fallback to ASR if no manual captions
        selectedTrack = koreanTracks[0];
        console.log('[ytdl-core] Using ASR (auto-generated) Korean captions');
    } else {
        console.log('[ytdl-core] Using manual Korean captions');
    }

    // Fetch the transcript in JSON format
    const transcriptUrl = selectedTrack.baseUrl + '&fmt=json3';
    console.log(`[ytdl-core] Fetching transcript from URL`);

    const response = await axios.get(transcriptUrl);
    const transcriptData = response.data;

    // Parse the JSON3 format
    // The format has an 'events' array with segments
    const events = transcriptData.events || [];
    const segments: TranscriptSegment[] = [];

    for (const event of events) {
        // Skip events without timing info or segments
        if (event.tStartMs === undefined || !event.segs) continue;

        // Combine all text segments in this event
        const text = event.segs
            .map((seg: any) => seg.utf8 || '')
            .join('')
            .trim();

        if (!text) continue;

        segments.push({
            start: event.tStartMs / 1000, // Convert ms to seconds
            duration: (event.dDurationMs || 0) / 1000,
            text
        });
    }

    console.log(`[ytdl-core] Parsed ${segments.length} transcript segments`);

    if (segments.length === 0) {
        throw new Error('Failed to parse transcript segments');
    }

    return segments;
}
