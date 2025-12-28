import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';

/**
 * GET /api/courses/:courseId/listening
 * 
 * Get all listening units for a course (admin list view)
 */
export const getListeningUnitsForCourse = async (req: AuthRequest, res: Response) => {
    try {
        const { courseId } = req.params;

        if (!courseId) {
            return res.status(400).json({
                success: false,
                error: 'Missing courseId'
            });
        }

        console.log(`[Listening Controller] Fetching listening units for course: ${courseId}`);

        const units = await (prisma as any).listeningUnit.findMany({
            where: { courseId },
            orderBy: { unitIndex: 'asc' },
            select: {
                id: true,
                unitIndex: true,
                title: true,
                audioUrl: true,
                createdAt: true,
                updatedAt: true,
            }
        });

        return res.json({
            success: true,
            data: units.map((u: any) => ({
                id: u.id,
                unitIndex: u.unitIndex,
                title: u.title,
                hasAudio: !!u.audioUrl,
                createdAt: u.createdAt,
                updatedAt: u.updatedAt,
            }))
        });

    } catch (error) {
        console.error('[Listening Controller] getListeningUnitsForCourse error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch listening units'
        });
    }
};

/**
 * GET /api/courses/:courseId/listening/:unitIndex
 * 
 * Get a single listening unit with full transcript data
 */
export const getListeningUnit = async (req: AuthRequest, res: Response) => {
    try {
        const { courseId, unitIndex } = req.params;
        const unitNum = parseInt(unitIndex, 10);

        if (!courseId || isNaN(unitNum)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid courseId or unitIndex'
            });
        }

        console.log(`[Listening Controller] Fetching listening unit: courseId=${courseId}, unit=${unitNum}`);

        const unit = await (prisma as any).listeningUnit.findUnique({
            where: {
                courseId_unitIndex: {
                    courseId,
                    unitIndex: unitNum
                }
            }
        });

        if (!unit) {
            return res.status(404).json({
                success: false,
                error: 'Listening unit not found'
            });
        }

        return res.json({
            success: true,
            data: {
                id: unit.id,
                courseId: unit.courseId,
                unitIndex: unit.unitIndex,
                title: unit.title,
                audioUrl: unit.audioUrl,
                transcriptData: unit.transcriptData,
            }
        });

    } catch (error) {
        console.error('[Listening Controller] getListeningUnit error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch listening unit'
        });
    }
};

/**
 * POST /api/courses/:courseId/listening/:unitIndex
 * 
 * Create or update a listening unit
 * Requires ADMIN role
 */
export const saveListeningUnit = async (req: AuthRequest, res: Response) => {
    try {
        const { courseId, unitIndex } = req.params;
        const { title, audioUrl, transcriptData } = req.body;
        const unitNum = parseInt(unitIndex, 10);

        if (!courseId || isNaN(unitNum)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid courseId or unitIndex'
            });
        }

        if (!title) {
            return res.status(400).json({
                success: false,
                error: 'Title is required'
            });
        }

        console.log(`[Listening Controller] Saving listening unit: courseId=${courseId}, unit=${unitNum}`);

        // Upsert the listening unit
        const unit = await (prisma as any).listeningUnit.upsert({
            where: {
                courseId_unitIndex: {
                    courseId,
                    unitIndex: unitNum
                }
            },
            update: {
                title,
                audioUrl: audioUrl || '',
                transcriptData: transcriptData || null,
            },
            create: {
                courseId,
                unitIndex: unitNum,
                title,
                audioUrl: audioUrl || '',
                transcriptData: transcriptData || null,
            }
        });

        return res.json({
            success: true,
            data: {
                id: unit.id,
                courseId: unit.courseId,
                unitIndex: unit.unitIndex,
                title: unit.title,
            }
        });

    } catch (error) {
        console.error('[Listening Controller] saveListeningUnit error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to save listening unit'
        });
    }
};

/**
 * DELETE /api/courses/:courseId/listening/:unitIndex
 * 
 * Delete a listening unit
 * Requires ADMIN role
 */
export const deleteListeningUnit = async (req: AuthRequest, res: Response) => {
    try {
        const { courseId, unitIndex } = req.params;
        const unitNum = parseInt(unitIndex, 10);

        if (!courseId || isNaN(unitNum)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid courseId or unitIndex'
            });
        }

        console.log(`[Listening Controller] Deleting listening unit: courseId=${courseId}, unit=${unitNum}`);

        await (prisma as any).listeningUnit.delete({
            where: {
                courseId_unitIndex: {
                    courseId,
                    unitIndex: unitNum
                }
            }
        });

        return res.json({
            success: true,
            message: 'Listening unit deleted'
        });

    } catch (error) {
        console.error('[Listening Controller] deleteListeningUnit error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to delete listening unit'
        });
    }
};
