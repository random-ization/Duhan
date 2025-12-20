import { google } from 'googleapis';
import getYouTubeID from 'get-youtube-id';
import { YoutubeTranscript } from 'youtube-transcript';
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
    try {
        const res = await youtube.search.list({
            part: ['snippet'],
            q: query,
            type: ['video'],
            videoCaption: 'closedCaption', // Prefer videos with captions
            maxResults: 10
        });

        if (!res.data.items) return [];

        return res.data.items.map(item => ({
            id: item.id?.videoId || '',
            title: item.snippet?.title || '',
            thumbnail: item.snippet?.thumbnails?.high?.url || '',
            channelTitle: item.snippet?.channelTitle || '',
            publishedAt: item.snippet?.publishedAt || ''
        }));
    } catch (error) {
        console.error('YouTube Search Error:', error);
        throw new Error('Failed to search YouTube');
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
        const res = await youtube.videos.list({
            part: ['snippet', 'contentDetails'],
            id: [youtubeId]
        });

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

        // Fetch raw transcript
        // Logic: Try to fetch manual captions first, then auto-gen
        // YoutubeTranscript fetches whatever is available.
        const rawTranscripts = await YoutubeTranscript.fetchTranscript(youtubeId);

        if (!rawTranscripts || rawTranscripts.length === 0) {
            throw new Error('No transcripts available for this video');
        }

        // Combine text for AI processing
        const fullText = rawTranscripts.map(t => t.text).join(' ');

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
