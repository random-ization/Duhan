import { prisma } from '../lib/prisma';

interface CreateVideoInput {
    title: string;
    description?: string;
    videoUrl: string;
    thumbnailUrl?: string;
    level: string;
    duration?: number;
    transcriptData?: any;
}

interface UpdateVideoInput {
    title?: string;
    description?: string;
    videoUrl?: string;
    thumbnailUrl?: string;
    level?: string;
    duration?: number;
    transcriptData?: any;
}

interface ListVideosOptions {
    level?: string;
    page?: number;
    limit?: number;
}

/**
 * Create a new video lesson
 */
export const createVideo = async (input: CreateVideoInput) => {
    return prisma.videoLesson.create({
        data: {
            title: input.title,
            description: input.description,
            videoUrl: input.videoUrl,
            thumbnailUrl: input.thumbnailUrl,
            level: input.level,
            duration: input.duration || 0,
            transcriptData: input.transcriptData,
        },
    });
};

/**
 * Update a video lesson (supports transcriptData JSON updates)
 */
export const updateVideo = async (id: string, input: UpdateVideoInput) => {
    return prisma.videoLesson.update({
        where: { id },
        data: {
            ...(input.title && { title: input.title }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.videoUrl && { videoUrl: input.videoUrl }),
            ...(input.thumbnailUrl !== undefined && { thumbnailUrl: input.thumbnailUrl }),
            ...(input.level && { level: input.level }),
            ...(input.duration !== undefined && { duration: input.duration }),
            ...(input.transcriptData !== undefined && { transcriptData: input.transcriptData }),
        },
    });
};

/**
 * Get list of videos with optional filtering and pagination
 */
export const getVideos = async (options: ListVideosOptions = {}) => {
    const { level, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const where = level ? { level } : {};

    const [videos, total] = await Promise.all([
        prisma.videoLesson.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                title: true,
                description: true,
                thumbnailUrl: true,
                level: true,
                duration: true,
                views: true,
                createdAt: true,
            },
        }),
        prisma.videoLesson.count({ where }),
    ]);

    return {
        videos,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};

/**
 * Get a single video by ID (includes transcriptData)
 */
export const getVideoById = async (id: string) => {
    return prisma.videoLesson.findUnique({
        where: { id },
    });
};

/**
 * Delete a video by ID
 */
export const deleteVideo = async (id: string) => {
    return prisma.videoLesson.delete({
        where: { id },
    });
};

/**
 * Increment view count
 */
export const incrementViews = async (id: string) => {
    return prisma.videoLesson.update({
        where: { id },
        data: {
            views: { increment: 1 },
        },
    });
};
