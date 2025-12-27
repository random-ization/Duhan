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
        const courseGrammarLinks = await prisma.courseGrammar.findMany({
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
        const grammarPointIds = courseGrammarLinks.map(link => link.grammarId);

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
        const data = courseGrammarLinks.map(link => {
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
