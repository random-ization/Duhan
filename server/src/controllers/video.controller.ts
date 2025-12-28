import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import * as videoService from '../services/video.service';
import { deleteFile } from '../services/storage.service';

/**
 * POST /api/videos
 * Upload a new video (Admin only)
 * Expects multipart/form-data with file uploaded via existing upload route,
 * then this endpoint receives the S3 URL
 */
export const uploadVideo = async (req: AuthRequest, res: Response) => {
    try {
        const { title, description, videoUrl, thumbnailUrl, level, duration } = req.body;

        if (!title || !videoUrl || !level) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: title, videoUrl, level',
            });
        }

        console.log('[Video Controller] Creating video:', title);

        const video = await videoService.createVideo({
            title,
            description,
            videoUrl,
            thumbnailUrl,
            level,
            duration: duration ? parseInt(duration, 10) : 0,
        });

        return res.status(201).json({
            success: true,
            data: video,
        });
    } catch (error) {
        console.error('[Video Controller] uploadVideo error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to create video',
        });
    }
};

/**
 * PUT /api/videos/:id
 * Update a video (Admin only)
 * Supports updating transcriptData JSON
 */
export const updateVideo = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { title, description, videoUrl, thumbnailUrl, level, duration, transcriptData } = req.body;

        console.log('[Video Controller] Updating video:', id);

        const video = await videoService.updateVideo(id, {
            title,
            description,
            videoUrl,
            thumbnailUrl,
            level,
            duration: duration !== undefined ? parseInt(duration, 10) : undefined,
            transcriptData,
        });

        return res.json({
            success: true,
            data: video,
        });
    } catch (error: any) {
        console.error('[Video Controller] updateVideo error:', error);
        if (error.code === 'P2025') {
            return res.status(404).json({
                success: false,
                error: 'Video not found',
            });
        }
        return res.status(500).json({
            success: false,
            error: 'Failed to update video',
        });
    }
};

/**
 * DELETE /api/videos/:id
 * Delete a video (Admin only)
 * Also attempts to delete files from S3
 */
export const deleteVideo = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;

        console.log('[Video Controller] Deleting video:', id);

        // Get video first to get S3 URLs
        const video = await videoService.getVideoById(id);
        if (!video) {
            return res.status(404).json({
                success: false,
                error: 'Video not found',
            });
        }

        // Delete from database
        await videoService.deleteVideo(id);

        // Attempt to delete files from S3 (non-blocking)
        try {
            if (video.videoUrl) {
                const videoKey = extractS3Key(video.videoUrl);
                if (videoKey) await deleteFile(videoKey);
            }
            if (video.thumbnailUrl) {
                const thumbnailKey = extractS3Key(video.thumbnailUrl);
                if (thumbnailKey) await deleteFile(thumbnailKey);
            }
        } catch (s3Error) {
            console.warn('[Video Controller] S3 cleanup failed (non-critical):', s3Error);
        }

        return res.json({
            success: true,
            message: 'Video deleted successfully',
        });
    } catch (error: any) {
        console.error('[Video Controller] deleteVideo error:', error);
        if (error.code === 'P2025') {
            return res.status(404).json({
                success: false,
                error: 'Video not found',
            });
        }
        return res.status(500).json({
            success: false,
            error: 'Failed to delete video',
        });
    }
};

/**
 * GET /api/videos
 * List all videos with optional filtering
 */
export const listVideos = async (req: Request, res: Response) => {
    try {
        const { level, page, limit } = req.query;

        const result = await videoService.getVideos({
            level: level as string,
            page: page ? parseInt(page as string, 10) : 1,
            limit: limit ? parseInt(limit as string, 10) : 20,
        });

        return res.json({
            success: true,
            data: result.videos,
            pagination: result.pagination,
        });
    } catch (error) {
        console.error('[Video Controller] listVideos error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch videos',
        });
    }
};

/**
 * GET /api/videos/:id
 * Get a single video with full details
 */
export const getVideo = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const video = await videoService.getVideoById(id);
        if (!video) {
            return res.status(404).json({
                success: false,
                error: 'Video not found',
            });
        }

        // Increment view count (fire and forget)
        videoService.incrementViews(id).catch(() => { });

        return res.json({
            success: true,
            data: video,
        });
    } catch (error) {
        console.error('[Video Controller] getVideo error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch video',
        });
    }
};

/**
 * Helper: Extract S3 key from full URL
 */
function extractS3Key(url: string): string | null {
    try {
        const urlObj = new URL(url);
        // Remove leading slash
        return urlObj.pathname.slice(1);
    } catch {
        return null;
    }
}
