import { Request, Response } from 'express';
import * as podcastService from '../services/podcast.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Search podcasts via iTunes API
 * GET /api/podcasts/search?term=...
 */
export const searchPodcasts = async (req: Request, res: Response) => {
    try {
        const { term } = req.query;

        if (!term || typeof term !== 'string') {
            return res.status(400).json({ error: 'Search term is required' });
        }

        const results = await podcastService.searchPodcasts(term);
        return res.json(results);
    } catch (error: any) {
        console.error('[PodcastController] Search error:', error?.message);
        return res.status(500).json({ error: 'Failed to search podcasts' });
    }
};

/**
 * Get episodes from a podcast RSS feed
 * GET /api/podcasts/episodes?feedUrl=...
 */
export const getEpisodes = async (req: Request, res: Response) => {
    try {
        const { feedUrl } = req.query;

        if (!feedUrl || typeof feedUrl !== 'string') {
            return res.status(400).json({ error: 'Feed URL is required' });
        }

        const feed = await podcastService.getEpisodes(feedUrl);
        return res.json(feed);
    } catch (error: any) {
        console.error('[PodcastController] Get episodes error:', error?.message);

        if (error?.message === 'FAILED_TO_PARSE_RSS') {
            return res.status(400).json({ error: 'Failed to parse podcast feed. The URL may be invalid.' });
        }

        return res.status(500).json({ error: 'Failed to get podcast episodes' });
    }
};

/**
 * Toggle subscription to a podcast channel
 * POST /api/podcasts/subscribe
 * Body: { channel: { itunesId, title, author, feedUrl, artworkUrl?, description? } }
 */
export const toggleSubscription = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId || (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { channel } = req.body;

        if (!channel || !channel.itunesId) {
            return res.status(400).json({ error: 'Channel data with itunesId is required' });
        }

        const isSubscribed = await podcastService.toggleSubscription(userId, channel);

        return res.json({
            success: true,
            isSubscribed,
            message: isSubscribed ? 'Subscribed successfully' : 'Unsubscribed successfully'
        });
    } catch (error: any) {
        console.error('[PodcastController] Toggle subscription error:', error?.message);
        return res.status(500).json({ error: 'Failed to toggle subscription' });
    }
};

/**
 * Get user's subscribed channels
 * GET /api/podcasts/subscriptions
 */
export const getSubscriptions = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId || (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const channels = await podcastService.getSubscribedChannels(userId);
        return res.json(channels);
    } catch (error: any) {
        console.error('[PodcastController] Get subscriptions error:', error?.message);
        return res.status(500).json({ error: 'Failed to get subscriptions' });
    }
};

/**
 * Get user's personalized feed from subscribed podcasts
 * GET /api/podcasts/my-feed
 */
export const getMyFeed = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId || (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const feed = await podcastService.getMyFeed(userId);
        return res.json(feed);
    } catch (error: any) {
        console.error('[PodcastController] Get my feed error:', error?.message);
        return res.status(500).json({ error: 'Failed to get feed' });
    }
};

/**
 * Get trending podcasts (external Apple Charts + internal views-based)
 * GET /api/podcasts/trending
 */
export const getTrending = async (req: Request, res: Response) => {
    try {
        const trending = await podcastService.getTrending();
        return res.json(trending);
    } catch (error: any) {
        console.error('[PodcastController] Get trending error:', error?.message);
        return res.status(500).json({ error: 'Failed to get trending' });
    }
};

/**
 * Track episode view (creates channel -> episode -> history)
 * POST /api/podcasts/view
 * Body: { episode: { guid, title, audioUrl, channel: {...} } }
 */
export const trackView = async (req: Request, res: Response) => {
    try {
        const { episode } = req.body;

        if (!episode || !episode.guid || !episode.audioUrl || !episode.channel) {
            return res.status(400).json({ error: 'Episode data with guid, audioUrl, and channel is required' });
        }

        // 1. 必须先创建/更新 Channel，否则 Episode 没法存
        const channel = await prisma.podcastChannel.upsert({
            where: { itunesId: String(episode.channel.itunesId || episode.channel.id) },
            update: {},
            create: {
                itunesId: String(episode.channel.itunesId || episode.channel.id),
                title: episode.channel.title || 'Unknown',
                feedUrl: episode.channel.feedUrl || '',
                artworkUrl: episode.channel.artworkUrl || episode.channel.image || '',
                author: episode.channel.author || 'Unknown'
            }
        });

        // 2. 再创建/更新 Episode，并增加 Views
        const updatedEp = await prisma.podcastEpisode.upsert({
            where: { guid: episode.guid },
            update: { views: { increment: 1 } },
            create: {
                guid: episode.guid,
                title: episode.title,
                audioUrl: episode.audioUrl,
                channelId: channel.id,
                views: 1
            }
        });

        // 3. 最后记录用户历史 (如果已登录)
        const userId = (req as any).user?.userId || (req as any).user?.id;
        if (userId) {
            await prisma.listeningHistory.upsert({
                where: { userId_episodeGuid: { userId, episodeGuid: episode.guid } },
                update: { playedAt: new Date() },
                create: {
                    userId,
                    episodeGuid: episode.guid,
                    episodeTitle: episode.title,
                    episodeUrl: episode.audioUrl,
                    channelName: channel.title,
                    channelImage: channel.artworkUrl,
                    playedAt: new Date()
                }
            });
        }

        return res.json({ success: true, views: updatedEp.views });
    } catch (error: any) {
        console.error('[PodcastController] Track view error:', error?.message);
        return res.status(500).json({ error: 'Failed to track view' });
    }
};

/**
 * Toggle like on an episode
 * POST /api/podcasts/like
 * Body: { episode: { guid, title, audioUrl, channel: {...} } }
 */
export const toggleLike = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId || (req as any).user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { episode } = req.body;

        if (!episode || !episode.guid || !episode.audioUrl || !episode.channel) {
            return res.status(400).json({ error: 'Episode data with guid, audioUrl, and channel is required' });
        }

        const isLiked = await podcastService.toggleLike(userId, episode);

        return res.json({
            success: true,
            isLiked,
            message: isLiked ? 'Liked' : 'Unliked'
        });
    } catch (error: any) {
        console.error('[PodcastController] Toggle like error:', error?.message);
        return res.status(500).json({ error: 'Failed to toggle like' });
    }
};

/**
 * Get listening history
 * GET /api/podcasts/history
 */
export const getHistory = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId || (req as any).user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        const history = await podcastService.getHistory(userId);
        return res.json(history);
    } catch (e: any) {
        return res.status(500).json({ error: e.message });
    }
};

/**
 * Update playback progress
 * POST /api/podcasts/progress
 * Body: { episodeGuid, progress }
 */
export const saveProgress = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId || (req as any).user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { episodeGuid, progress } = req.body;
        if (!episodeGuid || typeof progress !== 'number') {
            return res.status(400).json({ error: 'episodeGuid and progress are required' });
        }

        await podcastService.updateProgress(userId, episodeGuid, progress);
        return res.json({ success: true });
    } catch (e: any) {
        return res.status(500).json({ error: e.message });
    }
};
