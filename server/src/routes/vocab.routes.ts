import { Router } from 'express';
import { PrismaClient, WordStatus } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/vocab/session - Fetch study session words
// Priority: 1. Due reviews, 2. Learning, 3. New words
router.get('/session', async (req, res) => {
    try {
        const { userId, courseId, unitId, limit = 20 } = req.query;

        if (!userId || !courseId) {
            return res.status(400).json({ error: 'userId and courseId are required' });
        }

        const now = new Date();
        const limitNum = parseInt(limit as string, 10);

        // Build unit filter for VocabularyAppearance
        const appearanceFilter: any = {
            courseId: courseId as string,
        };
        if (unitId && unitId !== 'ALL') {
            const parsedUnit = parseInt(unitId as string, 10);
            if (!isNaN(parsedUnit)) {
                appearanceFilter.unitId = parsedUnit;
            }
        }

        // 1. Due reviews (nextReviewAt <= NOW) - highest priority
        const dueReviews = await prisma.userWordProgress.findMany({
            where: {
                userId: userId as string,
                nextReviewAt: { lte: now },
                word: {
                    appearances: { some: appearanceFilter },
                },
            },
            include: {
                word: {
                    include: {
                        appearances: {
                            where: appearanceFilter,
                            take: 1,
                        },
                    },
                },
            },
            orderBy: { nextReviewAt: 'asc' },
            take: limitNum,
        });

        type SessionWord = {
            id: string;
            word: string;
            meaning: string;
            pronunciation: string | null;
            audioUrl: string | null;
            hanja: string | null;
            partOfSpeech: string;
            tips: any;
            exampleSentence: string | null;
            exampleMeaning: string | null;
            courseId: string;
            unitId: number;
            progress: {
                id: string;
                status: string;
                interval: number;
                streak: number;
                nextReviewAt: Date | null;
            } | null;
        };

        let sessionWords: SessionWord[] = dueReviews.map(p => {
            const w = p.word;
            const appearance = w.appearances[0];
            return {
                id: w.id,
                word: w.word,
                meaning: w.meaning,
                pronunciation: w.pronunciation,
                audioUrl: w.audioUrl,
                hanja: w.hanja,
                partOfSpeech: w.partOfSpeech,
                tips: w.tips,
                exampleSentence: appearance?.exampleSentence || null,
                exampleMeaning: appearance?.exampleMeaning || null,
                courseId: appearance?.courseId || courseId as string,
                unitId: appearance?.unitId || 0,
                progress: {
                    id: p.id,
                    status: p.status,
                    interval: p.interval,
                    streak: p.streak,
                    nextReviewAt: p.nextReviewAt,
                },
            };
        });

        // 2. Learning words (if still need more)
        if (sessionWords.length < limitNum) {
            const remaining = limitNum - sessionWords.length;
            const existingIds = sessionWords.map(w => w.id);

            const learningWords = await prisma.userWordProgress.findMany({
                where: {
                    userId: userId as string,
                    status: 'LEARNING',
                    wordId: { notIn: existingIds },
                    word: {
                        appearances: { some: appearanceFilter },
                    },
                },
                include: {
                    word: {
                        include: {
                            appearances: {
                                where: appearanceFilter,
                                take: 1,
                            },
                        },
                    },
                },
                take: remaining,
            });

            sessionWords.push(...learningWords.map(p => {
                const w = p.word;
                const appearance = w.appearances[0];
                return {
                    id: w.id,
                    word: w.word,
                    meaning: w.meaning,
                    pronunciation: w.pronunciation,
                    audioUrl: w.audioUrl,
                    hanja: w.hanja,
                    partOfSpeech: w.partOfSpeech,
                    tips: w.tips,
                    exampleSentence: appearance?.exampleSentence || null,
                    exampleMeaning: appearance?.exampleMeaning || null,
                    courseId: appearance?.courseId || courseId as string,
                    unitId: appearance?.unitId || 0,
                    progress: {
                        id: p.id,
                        status: p.status,
                        interval: p.interval,
                        streak: p.streak,
                        nextReviewAt: p.nextReviewAt,
                    },
                };
            }));
        }

        // 3. New words (no progress record yet)
        if (sessionWords.length < limitNum) {
            const remaining = limitNum - sessionWords.length;
            const existingIds = sessionWords.map(w => w.id);

            // Find word IDs that user already has progress for
            const existingProgress = await prisma.userWordProgress.findMany({
                where: {
                    userId: userId as string,
                    word: {
                        appearances: { some: appearanceFilter },
                    },
                },
                select: { wordId: true },
            });
            const progressIds = existingProgress.map(p => p.wordId);

            // Get words via VocabularyAppearance that user hasn't learned yet
            const newAppearances = await prisma.vocabularyAppearance.findMany({
                where: {
                    ...appearanceFilter,
                    wordId: { notIn: [...existingIds, ...progressIds] },
                },
                include: { word: true },
                take: remaining,
            });

            sessionWords.push(...newAppearances.map(app => ({
                id: app.word.id,
                word: app.word.word,
                meaning: app.word.meaning,
                pronunciation: app.word.pronunciation,
                audioUrl: app.word.audioUrl,
                hanja: app.word.hanja,
                partOfSpeech: app.word.partOfSpeech,
                tips: app.word.tips,
                exampleSentence: app.exampleSentence,
                exampleMeaning: app.exampleMeaning,
                courseId: app.courseId,
                unitId: app.unitId,
                progress: null, // No progress yet
            })));
        }

        res.json({
            success: true,
            session: sessionWords,
            stats: {
                total: sessionWords.length,
                dueReviews: dueReviews.length,
            },
        });
    } catch (error) {
        console.error('Error fetching vocab session:', error);
        res.status(500).json({ error: 'Failed to fetch vocab session' });
    }
});

// POST /api/vocab/progress - Update SRS progress
router.post('/progress', async (req, res) => {
    try {
        const { userId, wordId, quality } = req.body;

        if (!userId || !wordId || quality === undefined) {
            return res.status(400).json({ error: 'userId, wordId, and quality are required' });
        }

        // quality: 0 = Forgot, 5 = Remember/Easy
        const qualityNum = parseInt(quality, 10);
        const now = new Date();

        // Find or create progress record
        let progress = await prisma.userWordProgress.findUnique({
            where: {
                userId_wordId: { userId, wordId },
            },
        });

        let newStatus: WordStatus;
        let newInterval: number;
        let newEaseFactor: number;
        let newStreak: number;
        let newMistakeCount: number;

        if (!progress) {
            // First time reviewing this word
            progress = {
                id: '',
                userId,
                wordId,
                status: 'NEW',
                nextReviewAt: null,
                interval: 0,
                easeFactor: 2.5,
                streak: 0,
                lastReviewedAt: null,
                mistakeCount: 0,
            };
        }

        // SM-2 Algorithm
        if (qualityNum === 0) {
            // Forgot
            newStatus = 'LEARNING';
            newInterval = 1;
            newEaseFactor = Math.max(1.3, progress.easeFactor - 0.2);
            newStreak = 0;
            newMistakeCount = progress.mistakeCount + 1;
        } else {
            // Know (quality >= 3)
            newMistakeCount = progress.mistakeCount;

            if (progress.status === 'NEW') {
                // First time "Know" - set interval to 1 day
                newStatus = 'LEARNING';
                newInterval = 1;
                newEaseFactor = progress.easeFactor;
                newStreak = 1;
            } else if (progress.status === 'LEARNING') {
                // Learning phase - increment interval
                newInterval = progress.interval + 1;
                newStreak = progress.streak + 1;
                newEaseFactor = progress.easeFactor;

                if (newInterval >= 3) {
                    newStatus = 'REVIEW';
                } else {
                    newStatus = 'LEARNING';
                }
            } else {
                // Review phase - multiply by ease factor
                newInterval = Math.round(progress.interval * progress.easeFactor);
                newStreak = progress.streak + 1;
                newEaseFactor = Math.min(2.5, progress.easeFactor + 0.1);

                if (newInterval > 30) {
                    newStatus = 'MASTERED';
                } else {
                    newStatus = 'REVIEW';
                }
            }
        }

        // Calculate next review date (UTC)
        const nextReviewAt = new Date(now.getTime() + newInterval * 24 * 60 * 60 * 1000);

        // Upsert progress
        const updated = await prisma.userWordProgress.upsert({
            where: {
                userId_wordId: { userId, wordId },
            },
            update: {
                status: newStatus,
                interval: newInterval,
                easeFactor: newEaseFactor,
                streak: newStreak,
                mistakeCount: newMistakeCount,
                nextReviewAt,
                lastReviewedAt: now,
            },
            create: {
                userId,
                wordId,
                status: newStatus,
                interval: newInterval,
                easeFactor: newEaseFactor,
                streak: newStreak,
                mistakeCount: newMistakeCount,
                nextReviewAt,
                lastReviewedAt: now,
            },
        });

        res.json({
            success: true,
            progress: updated,
        });
    } catch (error) {
        console.error('Error updating vocab progress:', error);
        res.status(500).json({ error: 'Failed to update progress' });
    }
});

// GET /api/vocab/words - Get all vocabulary for a course
router.get('/words', async (req, res) => {
    try {
        const { courseId, unitId } = req.query;

        if (!courseId) {
            return res.status(400).json({ error: 'courseId is required' });
        }

        const appearanceFilter: any = {
            courseId: courseId as string,
        };
        if (unitId && unitId !== 'ALL') {
            const parsedUnit = parseInt(unitId as string, 10);
            if (!isNaN(parsedUnit)) {
                appearanceFilter.unitId = parsedUnit;
            }
        }

        // Get words via VocabularyAppearance
        const appearances = await prisma.vocabularyAppearance.findMany({
            where: appearanceFilter,
            include: { word: true },
            orderBy: [{ unitId: 'asc' }, { word: { word: 'asc' } }],
        });

        // Transform to expected shape
        const words = appearances.map(app => ({
            id: app.word.id,
            word: app.word.word,
            meaning: app.word.meaning,
            partOfSpeech: app.word.partOfSpeech,
            hanja: app.word.hanja,
            pronunciation: app.word.pronunciation,
            audioUrl: app.word.audioUrl,
            tips: app.word.tips,
            exampleSentence: app.exampleSentence,
            exampleMeaning: app.exampleMeaning,
            courseId: app.courseId,
            unitId: app.unitId,
        }));

        res.json({ success: true, words });
    } catch (error) {
        console.error('Error fetching vocab words:', error);
        res.status(500).json({ error: 'Failed to fetch words' });
    }
});

export default router;
