import express, { Request, Response } from 'express';
import { PrismaClient, GrammarPoint, UserGrammarProgress } from '@prisma/client';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = express.Router();
const prisma = new PrismaClient();

// Initialize Gemini (assuming API key is in env)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// GET /api/courses/:courseId/grammar
router.get('/courses/:courseId/grammar', async (req: Request, res: Response) => {
    const { courseId } = req.params;
    const user = (req as any).user;
    const userId = user?.userId;

    try {
        const grammarPoints = await prisma.grammarPoint.findMany({
            where: { courseId },
            orderBy: { unitId: 'asc' },
            include: {
                userProgress: {
                    where: { userId },
                },
            },
        });

        // Group by unit
        const groupedPoints = grammarPoints.reduce((acc: Record<string, any[]>, point: any) => {
            const unitKey = `Unit ${point.unitId}: ${point.unitTitle}`;
            if (!acc[unitKey]) {
                acc[unitKey] = [];
            }

            const status = point.userProgress[0]?.status || 'NEW';
            acc[unitKey].push({ ...point, status });
            return acc;
        }, {} as Record<string, any[]>);

        res.json(groupedPoints);
    } catch (error) {
        console.error('Error fetching grammar points:', error);
        res.status(500).json({ error: 'Failed to fetch grammar points' });
    }
});

// POST /api/grammar/:id/toggle
router.post('/grammar/:id/toggle', async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as any).user?.userId;

    if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }

    try {
        const existing = await prisma.userGrammarProgress.findUnique({
            where: {
                userId_grammarPointId: {
                    userId,
                    grammarPointId: id
                }
            }
        });

        const newStatus = existing?.status === 'MASTERED' ? 'NEW' : 'MASTERED';

        const progress = await prisma.userGrammarProgress.upsert({
            where: {
                userId_grammarPointId: {
                    userId,
                    grammarPointId: id,
                },
            },
            update: {
                status: newStatus,
                lastReviewed: new Date(),
            },
            create: {
                userId,
                grammarPointId: id,
                status: newStatus,
                lastReviewed: new Date(),
            },
        });

        res.json(progress);
    } catch (error) {
        console.error('Error toggling grammar status:', error);
        res.status(500).json({ error: 'Failed to update progress' });
    }
});

// POST /api/grammar/ai-check
router.post('/grammar/ai-check', async (req: Request, res: Response) => {
    const { sentence, grammarId } = req.body;

    try {
        const grammarPoint = await prisma.grammarPoint.findUnique({
            where: { id: grammarId }
        });

        if (!grammarPoint) {
            res.status(404).json({ error: 'Grammar point not found' });
            return;
        }

        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const prompt = `
        You are a Korean language tutor. A student is practicing the grammar point "${grammarPoint.title}" (${grammarPoint.summary}).
        
        Student's sentence: "${sentence}"
        
        Task:
        1. Correct the sentence if there are any errors.
        2. Specifically check if the grammar point "${grammarPoint.title}" was used correctly.
        3. Provide a brief explanation.
        
        Output format (JSON):
        {
            "isCorrect": boolean,
            "correctedSentence": "string",
            "feedback": "string"
        }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean up markdown code blocks if present
        const jsonStr = text.replace(/```json\n|\n```/g, '');
        const feedback = JSON.parse(jsonStr);

        res.json(feedback);
    } catch (error) {
        console.error('AI Check Error:', error);
        res.status(500).json({ error: 'AI check failed' });
    }
});

export default router;
