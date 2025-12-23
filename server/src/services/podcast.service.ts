import Parser from 'rss-parser';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { uploadCachedJson, getJsonCdnUrl } from '../lib/storage';
import { checkFileExists, downloadJSON } from './storage.service';

const prisma = new PrismaClient();
const parser = new Parser();

// Cache keys for S3
const TRENDING_CACHE_KEY = 'cache/podcast-trending-v2.json';
const TRENDING_CACHE_TTL = 5 * 60; // 5 minutes
const DEFAULT_FALLBACK_SEARCH_TERM = 'Korean Culture'; // Fallback when Apple API fails

/**
 * Parse duration string to seconds (Int)
 * Handles formats like: "00:32:30", "32:30", "1950", "1950.0"
 */
const parseDuration = (duration: string | number | undefined): number | null => {
    if (duration === undefined || duration === null) return null;

    // If already a number
    if (typeof duration === 'number') return Math.floor(duration);

    // If it's a string number (e.g., "1950")
    const numValue = parseInt(duration, 10);
    if (!isNaN(numValue) && !duration.includes(':')) {
        return numValue;
    }

    // Parse HH:MM:SS or MM:SS format
    const parts = duration.split(':').map(p => parseInt(p, 10));
    if (parts.some(isNaN)) return null;

    if (parts.length === 3) {
        // HH:MM:SS
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
        // MM:SS
        return parts[0] * 60 + parts[1];
    }

    return null;
};

// ============================================
// Types
// ============================================

interface PodcastSearchResult {
    id: string;
    title: string;
    author: string;
    feedUrl: string;
    artwork: string;
    description: string;
}

interface PodcastEpisode {
    title: string;
    audioUrl: string | undefined;
    pubDate: string | undefined;
    duration: string | undefined;
    description: string;
    guid?: string;
}

interface PodcastChannel {
    title: string | undefined;
    description: string | undefined;
    image: string | undefined;
    author: string | undefined;
}

interface PodcastFeed {
    channel: PodcastChannel;
    episodes: PodcastEpisode[];
}

interface ChannelInput {
    itunesId: string;
    title: string;
    author: string;
    feedUrl: string;
    artworkUrl?: string;
    description?: string;
}

interface EpisodeInput {
    guid: string;
    title: string;
    audioUrl: string;
    duration?: number;
    pubDate?: string;
    description?: string;
    channel: ChannelInput;
}

// ============================================
// Search & Feed Parsing
// ============================================

/**
 * Search podcasts using iTunes API
 */
export const searchPodcasts = async (term: string): Promise<PodcastSearchResult[]> => {
    console.log('[PodcastService] Searching for:', term);

    try {
        const url = 'https://itunes.apple.com/search';
        const response = await axios.get(url, {
            params: {
                term,
                media: 'podcast',
                entity: 'podcast',
                limit: 15
            },
            timeout: 10000
        });

        if (!response.data.results) return [];

        return response.data.results.map((item: any) => ({
            id: item.collectionId?.toString() || '',
            title: item.collectionName || 'Unknown',
            author: item.artistName || 'Unknown',
            feedUrl: item.feedUrl || '',
            artwork: item.artworkUrl600 || item.artworkUrl100 || '',
            description: item.collectionName || ''
        })).filter((p: PodcastSearchResult) => p.feedUrl);

    } catch (error: any) {
        console.error('[PodcastService] iTunes Search Error:', error?.message);
        return [];
    }
};

/**
 * Get episodes from a podcast RSS feed
 */
export const getEpisodes = async (feedUrl: string): Promise<PodcastFeed> => {
    console.log('[PodcastService] Parsing RSS:', feedUrl);

    try {
        const feed = await parser.parseURL(feedUrl);

        const episodes: PodcastEpisode[] = feed.items.slice(0, 50).map(item => ({
            title: item.title || 'Untitled Episode',
            audioUrl: item.enclosure?.url,
            pubDate: item.pubDate,
            duration: (item as any).itunes?.duration || (item as any)['itunes:duration'],
            description: item.contentSnippet || item.content || '',
            guid: item.guid || item.link || item.title
        }));

        const validEpisodes = episodes.filter(ep => ep.audioUrl);

        return {
            channel: {
                title: feed.title,
                description: feed.description,
                image: feed.image?.url || (feed as any).itunes?.image,
                author: (feed as any).itunes?.author
            },
            episodes: validEpisodes
        };

    } catch (error: any) {
        console.error('[PodcastService] RSS Parse Error:', error?.message);
        throw new Error('FAILED_TO_PARSE_RSS');
    }
};

// ============================================
// Subscription Management
// ============================================

/**
 * Toggle subscription to a podcast channel
 * @returns true if now subscribed, false if unsubscribed
 */
export const toggleSubscription = async (userId: string, channel: ChannelInput): Promise<boolean> => {
    // 0. Fallback: If feedUrl is missing, try to fetch it via iTunes Lookup
    if (!channel.feedUrl) {
        console.log(`[PodcastService] Missing feedUrl for ${channel.itunesId}, attempting fallback lookup...`);
        try {
            const lookupUrl = `https://itunes.apple.com/lookup?id=${channel.itunesId}`;
            const response = await axios.get(lookupUrl, { timeout: 5000 });
            if (response.data?.results?.[0]?.feedUrl) {
                channel.feedUrl = response.data.results[0].feedUrl;
                console.log(`[PodcastService] Resolved feedUrl: ${channel.feedUrl}`);
            } else {
                console.warn(`[PodcastService] Failed to resolve feedUrl for ${channel.itunesId}`);
            }
        } catch (e) {
            console.error(`[PodcastService] Lookup failed:`, e);
        }
    }

    if (!channel.feedUrl) {
        throw new Error('MISSING_FEED_URL');
    }

    // 1. Identify Podcast Channel
    let podcastChannel;

    // A. Input is a UUID (Internal ID)
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(channel.itunesId)) {
        podcastChannel = await prisma.podcastChannel.findUnique({
            where: { id: channel.itunesId }
        });
        if (!podcastChannel) throw new Error('CHANNEL_NOT_FOUND_BY_UUID');
    }
    // B. Input is iTunes ID (Numeric String)
    else {
        podcastChannel = await prisma.podcastChannel.upsert({
            where: { itunesId: channel.itunesId },
            update: {
                title: channel.title,
                author: channel.author,
                feedUrl: channel.feedUrl,
                artworkUrl: channel.artworkUrl,
                description: channel.description
            },
            create: {
                itunesId: channel.itunesId,
                title: channel.title,
                author: channel.author,
                feedUrl: channel.feedUrl,
                artworkUrl: channel.artworkUrl,
                description: channel.description
            }
        });
    }

    // 2. Check current subscription status
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            subscribedChannels: {
                where: { id: podcastChannel.id }
            }
        }
    });

    const isCurrentlySubscribed = user?.subscribedChannels && user.subscribedChannels.length > 0;

    // 3. Toggle subscription
    if (isCurrentlySubscribed) {
        // Unsubscribe
        await prisma.user.update({
            where: { id: userId },
            data: {
                subscribedChannels: {
                    disconnect: { id: podcastChannel.id }
                }
            }
        });
        console.log('[PodcastService] Unsubscribed');
        return false;
    } else {
        // Subscribe
        await prisma.user.update({
            where: { id: userId },
            data: {
                subscribedChannels: {
                    connect: { id: podcastChannel.id }
                }
            }
        });
        console.log('[PodcastService] Subscribed');
        return true;
    }
};

/**
 * Get user's subscribed channels
 */
export const getSubscribedChannels = async (userId: string) => {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            subscribedChannels: true
        }
    });

    return user?.subscribedChannels || [];
};

// ============================================
// My Feed (Aggregated from subscriptions)
// ============================================

/**
 * Get user's personalized feed from all subscribed podcasts
 * Fetches latest episodes in parallel from each channel's RSS
 */
export const getMyFeed = async (userId: string) => {
    console.log(`[PodcastService] Getting feed for user ${userId}`);

    // 1. Get subscribed channels
    const channels = await getSubscribedChannels(userId);

    if (channels.length === 0) {
        return { channels: [], episodes: [] };
    }

    // 2. Fetch latest episodes from each channel in parallel
    const feedPromises = channels.map(async (channel) => {
        try {
            const feed = await parser.parseURL(channel.feedUrl);
            // Get latest 3 episodes from each channel
            return feed.items.slice(0, 3).map(item => ({
                channelId: channel.id,
                itunesId: channel.itunesId, // Added for correct linking
                channelTitle: channel.title,
                channelArtwork: channel.artworkUrl,
                guid: item.guid || item.link || item.title,
                title: item.title || 'Untitled',
                audioUrl: item.enclosure?.url,
                pubDate: item.pubDate ? new Date(item.pubDate) : null,
                duration: (item as any).itunes?.duration,
                description: item.contentSnippet || ''
            }));
        } catch (error) {
            console.error(`[PodcastService] Failed to fetch feed for ${channel.title}:`, error);
            return [];
        }
    });

    const allEpisodes = (await Promise.all(feedPromises)).flat();

    // 3. Sort by pubDate descending
    allEpisodes.sort((a: any, b: any) => {
        if (!a.pubDate) return 1;
        if (!b.pubDate) return -1;
        return b.pubDate.getTime() - a.pubDate.getTime();
    });

    // 4. Filter episodes with audio and limit to 30
    const validEpisodes = allEpisodes.filter((ep: any) => ep.audioUrl).slice(0, 30);

    return {
        channels,
        episodes: validEpisodes
    };
};

// ============================================
// Trending (Hybrid: External + Internal)
// ============================================

/**
 * Get trending podcasts with S3 CDN caching
 * Combines Apple Top Charts (external) with internal view-based ranking
 * Cache: 5 minutes on CDN
 */
export const getTrending = async (forceRefresh: boolean = false) => {
    console.log('[PodcastService] Getting trending podcasts');

    // Try to get from cache first (unless force refresh)
    if (!forceRefresh) {
        try {
            const exists = await checkFileExists(TRENDING_CACHE_KEY);
            if (exists) {
                console.log('[PodcastService] Using cached trending data');
                const cached = await downloadJSON(TRENDING_CACHE_KEY);
                // Check if cache is still valid (less than 5 mins old)
                if (cached._cachedAt) {
                    const age = Date.now() - cached._cachedAt;
                    if (age < TRENDING_CACHE_TTL * 1000) {
                        return { external: cached.external, internal: cached.internal };
                    }
                }
            }
        } catch (err) {
            console.log('[PodcastService] Cache miss or error, fetching fresh data');
        }
    }
    // Fetch fresh data
    const [external, internal] = await Promise.all([
        getAppleTopCharts(),
        getInternalTrending()
    ]);

    const result = { external, internal };

    // Save to S3 cache (async, don't block response)
    try {
        const cacheData = {
            ...result,
            _cachedAt: Date.now()
        };
        await uploadCachedJson(TRENDING_CACHE_KEY, cacheData, TRENDING_CACHE_TTL);
        console.log('[PodcastService] Trending data cached to S3');
    } catch (err) {
        console.error('[PodcastService] Failed to cache trending:', err);
    }

    return result;
};

/**
 * Fetch Apple Top Charts with Header & Fallback
 */
async function getAppleTopCharts(): Promise<PodcastSearchResult[]> {
    try {
        // 1. Apple RSS Feed
        const url = 'https://rss.marketingtools.apple.com/api/v2/kr/podcasts/top/25/podcasts.json';
        console.log('[PodcastService] Fetching Apple Charts...');

        // 🔥 FIX: Add User-Agent to avoid 403 Forbidden
        const response = await axios.get(url, {
            timeout: 8000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        if (!response.data?.feed?.results) throw new Error('Empty RSS feed');

        const topItems = response.data.feed.results.slice(0, 10);
        const ids = topItems.map((item: any) => item.id).join(',');

        // 2. Lookup Feed URLs (Required for playing)
        let feedUrlMap = new Map<string, string>();
        if (ids) {
            try {
                const lookupResponse = await axios.get(`https://itunes.apple.com/lookup?id=${ids}`, { timeout: 5000 });
                (lookupResponse.data.results || []).forEach((item: any) => {
                    if (item.feedUrl) feedUrlMap.set(item.collectionId.toString(), item.feedUrl);
                });
            } catch (e) { console.warn('iTunes Lookup failed'); }
        }

        const results = topItems.map((item: any) => ({
            id: item.id,
            title: item.name,
            author: item.artistName,
            feedUrl: feedUrlMap.get(item.id) || '',
            artwork: item.artworkUrl100?.replace('100x100', '600x600') || '',
            description: item.name
        })).filter((p: any) => p.feedUrl); // Filter out broken items

        if (results.length === 0) throw new Error('No playable items found');
        return results;

    } catch (error: any) {
        console.error('[PodcastService] Trending failed, using fallback:', error.message);
        // 🔥 FALLBACK: Ensure the UI is never empty by searching for a keyword
        return searchPodcasts(DEFAULT_FALLBACK_SEARCH_TERM);
    }
}

/**
 * Get internally trending episodes based on views
 */
async function getInternalTrending() {
    try {
        const episodes = await prisma.podcastEpisode.findMany({
            orderBy: { views: 'desc' },
            take: 10,
            include: {
                channel: true
            }
        });

        return episodes.map(ep => ({
            id: ep.id,
            guid: ep.guid,
            title: ep.title,
            audioUrl: ep.audioUrl,
            views: ep.views,
            likes: ep.likes,
            channel: {
                id: ep.channel.id,
                itunesId: ep.channel.itunesId, // Added for correct linking
                title: ep.channel.title,
                artwork: ep.channel.artworkUrl
            }
        }));
    } catch (error: any) {
        console.error('[PodcastService] Internal Trending Error:', error?.message);
        return [];
    }
}

// ============================================
// View & Like Tracking
// ============================================

/**
 * Track episode view (upsert channel -> upsert episode -> increment views)
 */
export const trackView = async (episode: EpisodeInput) => {
    console.log(`[PodcastService] Tracking view for episode: ${episode.title}`);

    // 1. Upsert channel
    const channel = await prisma.podcastChannel.upsert({
        where: { itunesId: episode.channel.itunesId },
        update: {},
        create: {
            itunesId: episode.channel.itunesId,
            title: episode.channel.title,
            author: episode.channel.author,
            feedUrl: episode.channel.feedUrl,
            artworkUrl: episode.channel.artworkUrl
        }
    });

    // 2. Upsert episode and increment views
    const updatedEpisode = await prisma.podcastEpisode.upsert({
        where: { guid: episode.guid },
        update: {
            views: { increment: 1 }
        },
        create: {
            guid: episode.guid,
            title: episode.title,
            audioUrl: episode.audioUrl,
            duration: parseDuration(episode.duration),
            pubDate: episode.pubDate ? new Date(episode.pubDate) : null,
            description: episode.description,
            channelId: channel.id,
            views: 1
        }
    });

    return updatedEpisode;
};

/**
 * Toggle like on an episode
 * @returns true if now liked, false if unliked
 */
export const toggleLike = async (userId: string, episode: EpisodeInput): Promise<boolean> => {
    console.log(`[PodcastService] Toggle like for user ${userId} on episode ${episode.guid}`);

    // 1. Upsert channel
    const channel = await prisma.podcastChannel.upsert({
        where: { itunesId: episode.channel.itunesId },
        update: {},
        create: {
            itunesId: episode.channel.itunesId,
            title: episode.channel.title,
            author: episode.channel.author,
            feedUrl: episode.channel.feedUrl,
            artworkUrl: episode.channel.artworkUrl
        }
    });

    // 2. Upsert episode
    let podcastEpisode = await prisma.podcastEpisode.upsert({
        where: { guid: episode.guid },
        update: {},
        create: {
            guid: episode.guid,
            title: episode.title,
            audioUrl: episode.audioUrl,
            duration: parseDuration(episode.duration),
            pubDate: episode.pubDate ? new Date(episode.pubDate) : null,
            description: episode.description,
            channelId: channel.id
        }
    });

    // 3. Check if already liked
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
            likedEpisodes: {
                where: { id: podcastEpisode.id }
            }
        }
    });

    const isCurrentlyLiked = user?.likedEpisodes && user.likedEpisodes.length > 0;

    // 4. Toggle like
    if (isCurrentlyLiked) {
        await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: {
                    likedEpisodes: { disconnect: { id: podcastEpisode.id } }
                }
            }),
            prisma.podcastEpisode.update({
                where: { id: podcastEpisode.id },
                data: { likes: { decrement: 1 } }
            })
        ]);
        return false;
    } else {
        await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: {
                    likedEpisodes: { connect: { id: podcastEpisode.id } }
                }
            }),
            prisma.podcastEpisode.update({
                where: { id: podcastEpisode.id },
                data: { likes: { increment: 1 } }
            })
        ]);
        return true;
    }
};
// ============================================
// Listening History
// ============================================

/**
 * Add or update listening history for a user
 */
export const addToHistory = async (userId: string, episode: EpisodeInput) => {
    // Save to History Table
    try {
        await prisma.listeningHistory.upsert({
            where: {
                userId_episodeGuid: { userId, episodeGuid: episode.guid }
            },
            update: { playedAt: new Date() },
            create: {
                userId,
                episodeGuid: episode.guid,
                episodeTitle: episode.title,
                episodeUrl: episode.audioUrl,
                channelName: episode.channel?.title || 'Unknown',
                channelImage: episode.channel?.artworkUrl || null,
                playedAt: new Date()
            }
        });
    } catch (e) {
        console.error('[PodcastService] History save failed:', e);
    }

    // Also track view count
    return trackView(episode);
};

/**
 * Get user's listening history
 */
export const getHistory = async (userId: string) => {
    return prisma.listeningHistory.findMany({
        where: { userId },
        orderBy: { playedAt: 'desc' },
        take: 50
    });
};
