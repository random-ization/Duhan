import { Request, Response } from 'express';
import * as videoService from '../services/video.service';

/**
 * GET /api/video/search
 * Query params: q (string)
 */
export const search = async (req: Request, res: Response) => {
    try {
        const query = req.query.q as string;
        if (!query) {
            return res.status(400).json({ error: 'Query parameter "q" is required' });
        }

        const results = await videoService.searchYoutube(query);
        res.json({ success: true, data: results });
    } catch (error: any) {
        console.error('Search controller error:', error);
        res.status(500).json({ success: false, error: 'Failed to search videos' });
    }
};

/**
 * POST /api/video/import
 * Body: { youtubeId: string }
 */
export const importVideo = async (req: Request, res: Response) => {
    try {
        const { youtubeId } = req.body;
        if (!youtubeId) {
            return res.status(400).json({ error: 'youtubeId is required' });
        }

        // Get user info from auth middleware (assuring req.user exists)
        // @ts-ignore
        const userId = req.user?.id;
        // @ts-ignore
        const role = req.user?.role;
        // @ts-ignore
        const tier = req.user?.tier;

        const isPremium = role === 'ADMIN' || tier === 'LIFETIME' || tier === 'ANNUAL' || tier === 'MONTHLY';

        const data = await videoService.getVideoData(youtubeId, userId, isPremium);
        res.json({ success: true, data });
    } catch (error: any) {
        console.error('Import controller error:', error);
        res.status(500).json({ success: false, error: error.message || 'Failed to import video' });
    }
};
