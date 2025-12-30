import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';
import { analyzeTextStructure } from '../services/ai.service';
/**
 * GET /api/courses/:courseId/units/:unitIndex
 * 
 * Aggregated endpoint that returns all data needed for the Reading page:
 * - Unit info (title, readingText, translation, audioUrl)
 * - Vocabulary list (words linked to this unit)
 * - Grammar list (grammar points linked to this unit)
 * - User annotations (highlights, notes)
 */
export const getUnitPage = async (req: AuthRequest, res: Response) => {
    try {
        const { courseId, unitIndex } = req.params;
        const userId = req.user?.userId;
        const unitNum = parseInt(unitIndex, 10);

        if (!courseId || isNaN(unitNum)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid courseId or unitIndex'
            });
        }

        console.log(`[Unit Controller] Fetching unit page: courseId=${courseId}, unit=${unitNum}, user=${userId}`);

        // 1. Query TextbookUnit for reading content
        // 1. Query TextbookUnit for reading content (fetch all articles)
        const units = await (prisma as any).textbookUnit.findMany({
            where: {
                courseId,
                unitIndex: unitNum
            },
            orderBy: {
                articleIndex: 'asc'
            }
        });

        const mainUnit = units[0] || null;

        // 2. Query VocabularyAppearance with Word details
        const vocabAppearances = await prisma.vocabularyAppearance.findMany({
            where: {
                courseId,
                unitId: unitNum
            },
            include: {
                word: true  // Include full Word details
            },
            orderBy: {
                createdAt: 'asc'
            }
        });

        // Transform to vocab list with flattened word data
        const vocabList = vocabAppearances.map((va: any) => ({
            id: va.word.id,
            korean: va.word.word,  // Word.word field
            meaning: va.word.meaning,
            pronunciation: va.word.pronunciation,
            hanja: va.word.hanja,
            pos: va.word.partOfSpeech,  // Word.partOfSpeech field
            audioUrl: va.word.audioUrl,
            // Unit-specific examples
            exampleSentence: va.exampleSentence,
            exampleMeaning: va.exampleMeaning,
        }));

        // 3. Query CourseGrammar with GrammarPoint details
        const courseGrammars = await prisma.courseGrammar.findMany({
            where: {
                courseId,
                unitId: unitNum
            },
            include: {
                grammar: true  // Include full GrammarPoint details
            },
            orderBy: {
                displayOrder: 'asc'
            }
        });

        // Transform to grammar list with flattened data
        const grammarList = courseGrammars.map((cg: any) => ({
            id: cg.grammar.id,
            title: cg.grammar.title,
            slug: cg.grammar.slug,
            level: cg.grammar.level,
            type: cg.grammar.type,
            summary: cg.grammar.summary,
            explanation: cg.grammar.explanation,
            conjugationRules: cg.grammar.conjugationRules,
            examples: cg.grammar.examples,
            // Course-specific fields
            displayOrder: cg.displayOrder,
            customNote: cg.customNote,
        }));

        // 4. Query Annotation for user's notes (if authenticated)
        let annotations: any[] = [];
        if (userId) {
            const contextKey = `${courseId}_${unitNum}`;
            annotations = await prisma.annotation.findMany({
                where: {
                    userId,
                    contextKey,
                    targetType: 'TEXTBOOK'
                },
                orderBy: {
                    createdAt: 'asc'
                }
            });
        }

        // Return aggregated response
        return res.json({
            success: true,
            data: {
                unit: mainUnit ? {
                    id: mainUnit.id,
                    title: mainUnit.title,
                    text: mainUnit.readingText,
                    translation: mainUnit.translation,
                    analysisData: (mainUnit as any).analysisData, // AI morphological analysis
                    audioUrl: mainUnit.audioUrl,
                } : null,
                articles: units.map((u: any) => ({
                    id: u.id,
                    articleIndex: u.articleIndex || 1,
                    title: u.title,
                    text: u.readingText,
                    translation: u.translation,
                    audioUrl: u.audioUrl,
                    analysisData: u.analysisData
                })),
                vocabList,
                grammarList,
                annotations: annotations.map(a => ({
                    id: a.id,
                    startOffset: a.startOffset,
                    endOffset: a.endOffset,
                    text: a.text,
                    color: a.color,
                    note: a.note,
                    createdAt: a.createdAt,
                })),
                meta: {
                    courseId,
                    unitIndex: unitNum,
                    vocabCount: vocabList.length,
                    grammarCount: grammarList.length,
                    annotationCount: annotations.length,
                }
            }
        });

    } catch (error) {
        console.error('[Unit Controller] getUnitPage error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch unit page data'
        });
    }
};

/**
 * GET /api/courses/:courseId/units
 * 
 * Get all units for a course (admin list view)
 */
export const getUnitsForCourse = async (req: AuthRequest, res: Response) => {
    try {
        const { courseId } = req.params;

        if (!courseId) {
            return res.status(400).json({
                success: false,
                error: 'Missing courseId'
            });
        }

        console.log(`[Unit Controller] Fetching units for course: ${courseId}`);

        const units = await (prisma as any).textbookUnit.findMany({
            where: { courseId },
            orderBy: { unitIndex: 'asc' },
            select: {
                id: true,
                unitIndex: true,
                title: true,
                readingText: true,
                analysisData: true,
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
                hasContent: !!u.readingText,
                hasAnalysis: !!u.analysisData,
                createdAt: u.createdAt,
                updatedAt: u.updatedAt,
            }))
        });

    } catch (error) {
        console.error('[Unit Controller] getUnitsForCourse error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch units'
        });
    }
};

/**
 * POST /api/courses/:courseId/units/:unitIndex
 * 
 * Create or update a textbook unit with AI text analysis
 * Requires ADMIN role
 */
export const saveUnit = async (req: AuthRequest, res: Response) => {
    try {
        const { courseId, unitIndex } = req.params;
        const { title, readingText, translation, audioUrl, transcriptData, articleIndex } = req.body;
        const unitNum = parseInt(unitIndex, 10);
        const articleNum = articleIndex ? parseInt(articleIndex, 10) : 1;

        if (!courseId || isNaN(unitNum)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid courseId or unitIndex'
            });
        }

        if (!title || !readingText) {
            return res.status(400).json({
                success: false,
                error: 'Title and readingText are required'
            });
        }

        console.log(`[Unit Controller] Saving unit: courseId=${courseId}, unit=${unitNum}, article=${articleNum}`);

        // Perform AI text analysis (lemmatization) - wrapped in try-catch to not block save
        let analysisData = null;
        try {
            console.log('[Unit Controller] Starting AI text analysis...');
            analysisData = await analyzeTextStructure(readingText);
            console.log(`[Unit Controller] AI analysis complete: ${analysisData?.length || 0} tokens`);
        } catch (aiError) {
            console.error('[Unit Controller] AI analysis failed (continuing with save):', aiError);
            // Don't fail the save if AI analysis fails
        }

        // Upsert the unit
        const unit = await (prisma as any).textbookUnit.upsert({
            where: {
                courseId_unitIndex_articleIndex: {
                    courseId,
                    unitIndex: unitNum,
                    articleIndex: articleNum
                }
            },
            update: {
                title,
                readingText,
                translation,
                audioUrl,
                analysisData: analysisData || undefined,
                transcriptData: transcriptData || undefined, // Listening karaoke data
            },
            create: {
                courseId,
                unitIndex: unitNum,
                articleIndex: articleNum,
                title,
                readingText,
                translation,
                audioUrl,
                analysisData,
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
                hasAnalysis: !!unit.analysisData,
                tokenCount: Array.isArray(unit.analysisData) ? unit.analysisData.length : 0,
            }
        });

    } catch (error) {
        console.error('[Unit Controller] saveUnit error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to save unit'
        });
    }
};

/**
 * POST /api/courses/:courseId/units/:unitIndex/listening
 * 
 * Update only listening-related fields (audioUrl, transcriptData)
 * Does NOT trigger AI analysis or affect reading content
 * Requires ADMIN role
 */
export const saveListeningContent = async (req: AuthRequest, res: Response) => {
    try {
        const { courseId, unitIndex } = req.params;
        const { audioUrl, transcriptData } = req.body;
        const unitNum = parseInt(unitIndex, 10);

        if (!courseId || isNaN(unitNum)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid courseId or unitIndex'
            });
        }

        console.log(`[Unit Controller] Saving listening content: courseId=${courseId}, unit=${unitNum}`);

        // Check if unit exists
        const existingUnit = await (prisma as any).textbookUnit.findUnique({
            where: {
                courseId_unitIndex: {
                    courseId,
                    unitIndex: unitNum
                }
            }
        });

        if (!existingUnit) {
            return res.status(404).json({
                success: false,
                error: 'Unit not found. Please create the unit first in Reading Content Manager.'
            });
        }

        // Update only listening fields
        const unit = await (prisma as any).textbookUnit.update({
            where: {
                courseId_unitIndex: {
                    courseId,
                    unitIndex: unitNum
                }
            },
            data: {
                audioUrl: audioUrl || existingUnit.audioUrl,
                transcriptData: transcriptData !== undefined ? transcriptData : existingUnit.transcriptData,
            }
        });

        return res.json({
            success: true,
            data: {
                id: unit.id,
                courseId: unit.courseId,
                unitIndex: unit.unitIndex,
            }
        });

    } catch (error) {
        console.error('[Unit Controller] saveListeningContent error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to save listening content'
        });
    }
};


/**
 * POST /api/courses/:courseId/units/:unitIndex/analyze
 * 
 * Re-run AI analysis on an existing unit
 */
export const analyzeUnit = async (req: AuthRequest, res: Response) => {
    try {
        const { courseId, unitIndex } = req.params;
        const unitNum = parseInt(unitIndex, 10);

        if (!courseId || isNaN(unitNum)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid courseId or unitIndex'
            });
        }

        // Find existing unit
        const unit = await (prisma as any).textbookUnit.findUnique({
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
                error: 'Unit not found'
            });
        }

        console.log(`[Unit Controller] Re-analyzing unit: ${courseId}, unit ${unitNum}`);

        // Run AI analysis
        const analysisData = await analyzeTextStructure(unit.readingText);

        if (!analysisData) {
            return res.status(500).json({
                success: false,
                error: 'AI analysis failed'
            });
        }

        // Update unit with new analysis
        await (prisma as any).textbookUnit.update({
            where: { id: unit.id },
            data: { analysisData }
        });

        return res.json({
            success: true,
            data: {
                id: unit.id,
                tokenCount: analysisData.length,
                tokens: analysisData
            }
        });

    } catch (error) {
        console.error('[Unit Controller] analyzeUnit error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to analyze unit'
        });
    }
};

/**
 * POST /api/courses/:courseId/units/:unitIndex/annotation
 * 
 * Save or update an annotation for the reading page
 */
export const saveUnitAnnotation = async (req: AuthRequest, res: Response) => {
    try {
        const { courseId, unitIndex } = req.params;
        const userId = req.user?.userId;
        const { startOffset, endOffset, text, color, note } = req.body;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized'
            });
        }

        const unitNum = parseInt(unitIndex, 10);
        if (!courseId || isNaN(unitNum)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid courseId or unitIndex'
            });
        }

        const contextKey = `${courseId}_${unitNum}`;

        // Create new annotation
        const annotation = await prisma.annotation.create({
            data: {
                userId,
                contextKey,
                targetType: 'TEXTBOOK',
                startOffset,
                endOffset,
                text: text || '',
                color,
                note,
            }
        });

        return res.json({
            success: true,
            data: {
                id: annotation.id,
                startOffset: annotation.startOffset,
                endOffset: annotation.endOffset,
                text: annotation.text,
                color: annotation.color,
                note: annotation.note,
                createdAt: annotation.createdAt,
            }
        });

    } catch (error) {
        console.error('[Unit Controller] saveUnitAnnotation error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to save annotation'
        });
    }
};

/**
 * DELETE /api/courses/:courseId/units/:unitIndex/annotation/:annotationId
 * 
 * Delete an annotation
 */
export const deleteUnitAnnotation = async (req: AuthRequest, res: Response) => {
    try {
        const { annotationId } = req.params;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: 'Unauthorized'
            });
        }

        // Verify ownership before deleting
        const annotation = await prisma.annotation.findUnique({
            where: { id: annotationId }
        });

        if (!annotation) {
            return res.status(404).json({
                success: false,
                error: 'Annotation not found'
            });
        }

        if (annotation.userId !== userId) {
            return res.status(403).json({
                success: false,
                error: 'Not authorized to delete this annotation'
            });
        }

        await prisma.annotation.delete({
            where: { id: annotationId }
        });

        return res.json({
            success: true,
            message: 'Annotation deleted'
        });

    } catch (error) {
        console.error('[Unit Controller] deleteUnitAnnotation error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to delete annotation'
        });
    }
};
