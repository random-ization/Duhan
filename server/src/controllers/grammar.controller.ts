import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';
import OpenAI from 'openai';

// Lazy-initialize OpenAI client to prevent crash at startup if API key is missing
let openai: OpenAI | null = null;
const getOpenAIClient = () => {
    if (!openai) {
        if (!process.env.OPENAI_API_KEY) {
            throw new Error('OPENAI_API_KEY is not configured');
        }
        openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return openai;
};

/**
 * GET /api/grammar/courses/:courseId/units/:unitId/grammar
 * Get all grammar points for a unit, merged with user progress
 */
export const getUnitGrammar = async (req: AuthRequest, res: Response) => {
    try {
        const { courseId, unitId } = req.params;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!courseId || !unitId) {
            return res.status(400).json({ error: 'courseId and unitId are required' });
        }

        const unitIdNum = parseInt(unitId, 10);
        if (isNaN(unitIdNum)) {
            return res.status(400).json({ error: 'unitId must be a number' });
        }

        // Query CourseGrammar with related GrammarPoint
        const courseGrammarLinks = await (prisma as any).courseGrammar.findMany({
            where: {
                courseId,
                unitId: unitIdNum,
            },
            include: {
                grammar: true,
            },
            orderBy: {
                displayOrder: 'asc',
            },
        });

        if (courseGrammarLinks.length === 0) {
            return res.json({ data: [] });
        }

        // Get grammar point IDs
        const grammarPointIds = courseGrammarLinks.map((link: any) => link.grammarId);

        // Fetch user progress for these grammar points
        const userProgress = await prisma.userGrammarProgress.findMany({
            where: {
                userId,
                grammarPointId: { in: grammarPointIds },
            },
        });

        // Create a map for quick lookup
        const progressMap = new Map(
            userProgress.map(p => [p.grammarPointId, p])
        );

        // Merge grammar with user progress
        const data = courseGrammarLinks.map((link: any) => {
            const progress = progressMap.get(link.grammarId);
            return {
                id: link.grammar.id,
                title: link.grammar.title,
                slug: link.grammar.slug,
                level: link.grammar.level,
                type: link.grammar.type,
                summary: link.grammar.summary,
                explanation: link.grammar.explanation,
                conjugationRules: link.grammar.conjugationRules,
                examples: link.grammar.examples,
                displayOrder: link.displayOrder,
                customNote: link.customNote,
                // User progress
                status: progress?.status || 'NEW',
                proficiency: progress?.proficiency || 0,
                lastReviewed: progress?.lastReviewed || null,
            };
        });

        return res.json({ data });
    } catch (error) {
        console.error('[Grammar Controller] getUnitGrammar error:', error);
        return res.status(500).json({ error: 'Failed to fetch unit grammar' });
    }
};

/**
 * POST /api/grammar/:grammarId/check
 * Check a user's sentence with AI grading
 */
export const checkSentence = async (req: AuthRequest, res: Response) => {
    try {
        const { grammarId } = req.params;
        const { userSentence } = req.body;
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!grammarId) {
            return res.status(400).json({ error: 'grammarId is required' });
        }

        if (!userSentence || typeof userSentence !== 'string' || userSentence.trim().length === 0) {
            return res.status(400).json({ error: 'userSentence is required and must be a non-empty string' });
        }

        // Fetch the grammar point
        const grammar = await prisma.grammarPoint.findUnique({
            where: { id: grammarId },
        });

        if (!grammar) {
            return res.status(404).json({ error: 'Grammar point not found' });
        }

        // Call OpenAI API with JSON response format
        const systemPrompt = `You are a strict Korean Grammar Tutor.
Target Grammar: "${grammar.title}" (${grammar.summary}).
Task: Analyze if the student used the target grammar correctly in the sentence.
Output JSON: { "isCorrect": boolean, "feedback": "Brief explanation in Chinese", "correctedSentence": "Optional correction if wrong" }`;

        console.log(`[Grammar Controller] Checking sentence for grammar: ${grammar.title}`);

        const completion = await getOpenAIClient().chat.completions.create({
            model: 'gpt-4o-mini',
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `Student Sentence: "${userSentence.trim()}"` },
            ],
            temperature: 0.3,
        });

        const aiResponseText = completion.choices[0]?.message?.content;
        if (!aiResponseText) {
            throw new Error('Empty AI response');
        }

        // Parse AI response
        let aiResult: { isCorrect: boolean; feedback: string; correctedSentence?: string };
        try {
            aiResult = JSON.parse(aiResponseText);
        } catch (parseError) {
            console.error('[Grammar Controller] Failed to parse AI response:', aiResponseText);
            throw new Error('Failed to parse AI response');
        }

        // Update user progress
        const existingProgress = await prisma.userGrammarProgress.findUnique({
            where: {
                userId_grammarPointId: {
                    userId,
                    grammarPointId: grammarId,
                },
            },
        });

        let newProficiency = existingProgress?.proficiency || 0;
        let newStatus = existingProgress?.status || 'LEARNING';
        let mistakeHistory = (existingProgress?.mistakeHistory as any[]) || [];

        if (aiResult.isCorrect) {
            // Increment proficiency by 30, cap at 100
            newProficiency = Math.min(100, newProficiency + 30);
            // If proficiency >= 80, set status to MASTERED
            if (newProficiency >= 80) {
                newStatus = 'MASTERED';
            } else if (newStatus === 'NEW') {
                newStatus = 'LEARNING';
            }
        } else {
            // Add to mistake history
            mistakeHistory.push({
                sentence: userSentence.trim(),
                feedback: aiResult.feedback,
                correctedSentence: aiResult.correctedSentence,
                timestamp: new Date().toISOString(),
            });
            // Set status to LEARNING if was NEW
            if (newStatus === 'NEW') {
                newStatus = 'LEARNING';
            }
        }

        // Upsert user progress
        const updatedProgress = await prisma.userGrammarProgress.upsert({
            where: {
                userId_grammarPointId: {
                    userId,
                    grammarPointId: grammarId,
                },
            },
            update: {
                proficiency: newProficiency,
                status: newStatus,
                lastReviewed: new Date(),
                mistakeHistory,
            },
            create: {
                userId,
                grammarPointId: grammarId,
                proficiency: newProficiency,
                status: newStatus,
                lastReviewed: new Date(),
                mistakeHistory,
            },
        });

        console.log(`[Grammar Controller] Updated progress: proficiency=${newProficiency}, status=${newStatus}`);

        return res.json({
            success: true,
            data: {
                isCorrect: aiResult.isCorrect,
                feedback: aiResult.feedback,
                correctedSentence: aiResult.correctedSentence,
                progress: {
                    proficiency: updatedProgress.proficiency,
                    status: updatedProgress.status,
                    lastReviewed: updatedProgress.lastReviewed,
                },
            },
        });
    } catch (error) {
        console.error('[Grammar Controller] checkSentence error:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return res.status(500).json({ error: `Failed to check sentence: ${message}` });
    }
};

// ========== Admin: Grammar CRUD ==========

/**
 * GET /api/grammar/search?query=xxx
 * Search grammar points globally by title or searchKey
 */
export const searchGrammar = async (req: AuthRequest, res: Response) => {
    try {
        const { query } = req.query;

        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: 'query parameter is required' });
        }

        const grammars = await (prisma as any).grammarPoint.findMany({
            where: {
                OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { searchKey: { contains: query, mode: 'insensitive' } },
                    { summary: { contains: query, mode: 'insensitive' } },
                ]
            },
            orderBy: { title: 'asc' },
            take: 20, // Limit results
        });

        return res.json({
            success: true,
            data: grammars.map((g: any) => ({
                id: g.id,
                title: g.title,
                searchKey: g.searchKey,
                level: g.level,
                type: g.type,
                summary: g.summary,
            }))
        });
    } catch (error) {
        console.error('[Grammar Controller] searchGrammar error:', error);
        return res.status(500).json({ error: 'Failed to search grammar' });
    }
};

/**
 * POST /api/grammar
 * Create a new grammar point (Admin only)
 */
export const createGrammar = async (req: AuthRequest, res: Response) => {
    try {
        const { title, searchKey, level, type, summary, explanation, conjugationRules, examples } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'title is required' });
        }

        // Generate slug from title
        const slug = title.toLowerCase()
            .replace(/[^\w\s가-힣]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');

        const grammar = await (prisma as any).grammarPoint.create({
            data: {
                title,
                slug,
                searchKey: searchKey || title,
                level: level || 'INTERMEDIATE',
                type: type || 'PATTERN',
                summary: summary || '',
                explanation: explanation || '',
                conjugationRules: conjugationRules || {},
                examples: examples || [],
            }
        });

        console.log(`[Grammar Controller] Created grammar: ${grammar.id} - ${title}`);

        return res.json({
            success: true,
            data: grammar
        });
    } catch (error) {
        console.error('[Grammar Controller] createGrammar error:', error);
        return res.status(500).json({ error: 'Failed to create grammar' });
    }
};

/**
 * PUT /api/grammar/:id
 * Update a grammar point (Admin only)
 */
export const updateGrammar = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { title, searchKey, level, type, summary, explanation, conjugationRules, examples } = req.body;

        if (!id) {
            return res.status(400).json({ error: 'id is required' });
        }

        const grammar = await (prisma as any).grammarPoint.update({
            where: { id },
            data: {
                ...(title && { title }),
                ...(searchKey && { searchKey }),
                ...(level && { level }),
                ...(type && { type }),
                ...(summary !== undefined && { summary }),
                ...(explanation !== undefined && { explanation }),
                ...(conjugationRules && { conjugationRules }),
                ...(examples && { examples }),
            }
        });

        console.log(`[Grammar Controller] Updated grammar: ${id}`);

        return res.json({
            success: true,
            data: grammar
        });
    } catch (error) {
        console.error('[Grammar Controller] updateGrammar error:', error);
        return res.status(500).json({ error: 'Failed to update grammar' });
    }
};

/**
 * POST /api/grammar/assign
 * Assign a grammar point to a course unit (Admin only)
 * Body: { courseId, unitIndex, grammarId, displayOrder? }
 */
export const assignGrammarToUnit = async (req: AuthRequest, res: Response) => {
    try {
        const { courseId, unitIndex, grammarId, displayOrder } = req.body;

        if (!courseId || unitIndex === undefined || !grammarId) {
            return res.status(400).json({ error: 'courseId, unitIndex, and grammarId are required' });
        }

        const unitNum = parseInt(unitIndex, 10);

        // Check if assignment already exists
        const existing = await (prisma as any).courseGrammar.findFirst({
            where: {
                courseId,
                unitId: unitNum,
                grammarId,
            }
        });

        if (existing) {
            // Update display order if provided
            if (displayOrder !== undefined) {
                await (prisma as any).courseGrammar.update({
                    where: { id: existing.id },
                    data: { displayOrder }
                });
            }
            return res.json({
                success: true,
                message: 'Grammar already assigned to this unit',
                data: existing
            });
        }

        // Get max display order for this unit
        const maxOrder = await (prisma as any).courseGrammar.aggregate({
            where: { courseId, unitId: unitNum },
            _max: { displayOrder: true }
        });

        const newDisplayOrder = displayOrder ?? ((maxOrder._max.displayOrder || 0) + 1);

        const courseGrammar = await (prisma as any).courseGrammar.create({
            data: {
                courseId,
                unitId: unitNum,
                grammarId,
                displayOrder: newDisplayOrder,
            },
            include: {
                grammar: true
            }
        });

        console.log(`[Grammar Controller] Assigned grammar ${grammarId} to ${courseId}/unit${unitNum}`);

        return res.json({
            success: true,
            data: courseGrammar
        });
    } catch (error) {
        console.error('[Grammar Controller] assignGrammarToUnit error:', error);
        return res.status(500).json({ error: 'Failed to assign grammar to unit' });
    }
};

/**
 * DELETE /api/grammar/courses/:courseId/units/:unitIndex/grammar/:grammarId
 * Remove a grammar point assignment from a course unit (does not delete the grammar itself)
 */
export const removeGrammarFromUnit = async (req: AuthRequest, res: Response) => {
    try {
        const { courseId, unitIndex, grammarId } = req.params;

        if (!courseId || !unitIndex || !grammarId) {
            return res.status(400).json({ error: 'courseId, unitIndex, and grammarId are required' });
        }

        const unitNum = parseInt(unitIndex, 10);

        const deleted = await (prisma as any).courseGrammar.deleteMany({
            where: {
                courseId,
                unitId: unitNum,
                grammarId,
            }
        });

        if (deleted.count === 0) {
            return res.status(404).json({ error: 'Grammar assignment not found' });
        }

        console.log(`[Grammar Controller] Removed grammar ${grammarId} from ${courseId}/unit${unitNum}`);

        return res.json({
            success: true,
            message: 'Grammar removed from unit'
        });
    } catch (error) {
        console.error('[Grammar Controller] removeGrammarFromUnit error:', error);
        return res.status(500).json({ error: 'Failed to remove grammar from unit' });
    }
};
