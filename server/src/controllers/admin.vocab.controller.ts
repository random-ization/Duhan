import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { TTSService } from '../services/tts.service';

export class AdminVocabController {
    // GET /api/admin/vocab - Get vocabulary list via appearances
    static async getList(req: Request, res: Response) {
        try {
            const { courseId, page = 1, limit = 50, search, missingAudio, missingExample } = req.query;

            if (!courseId) return res.status(400).json({ error: 'courseId is required' });

            const appearanceWhere: any = { courseId: String(courseId) };
            const wordWhere: any = {};

            if (search) {
                wordWhere.OR = [
                    { word: { contains: String(search), mode: 'insensitive' } },
                    { meaning: { contains: String(search), mode: 'insensitive' } },
                ];
            }

            if (missingAudio === 'true') {
                wordWhere.audioUrl = null;
            }

            if (missingExample === 'true') {
                appearanceWhere.OR = [
                    { exampleSentence: null },
                    { exampleSentence: '' }
                ];
            }

            const skip = (Number(page) - 1) * Number(limit);

            const [total, appearances] = await Promise.all([
                prisma.vocabularyAppearance.count({
                    where: {
                        ...appearanceWhere,
                        word: Object.keys(wordWhere).length > 0 ? wordWhere : undefined,
                    },
                }),
                prisma.vocabularyAppearance.findMany({
                    where: {
                        ...appearanceWhere,
                        word: Object.keys(wordWhere).length > 0 ? wordWhere : undefined,
                    },
                    include: { word: true },
                    skip,
                    take: Number(limit),
                    orderBy: [
                        { unitId: 'asc' },
                        { createdAt: 'desc' },
                    ],
                }),
            ]);

            // Transform to expected shape (flattened)
            const items = appearances.map(app => ({
                id: app.word.id,
                appearanceId: app.id,
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
                createdAt: app.createdAt,
                updatedAt: app.updatedAt,
            }));

            res.json({ success: true, total, pages: Math.ceil(total / Number(limit)), items });
        } catch (error) {
            console.error('Get Vocab List Error:', error);
            res.status(500).json({ error: 'Failed to fetch vocabulary list' });
        }
    }

    // POST /api/admin/vocab/bulk - Bulk import with upsert
    static async bulkImport(req: Request, res: Response) {
        try {
            const { items } = req.body;
            if (!Array.isArray(items) || items.length === 0) {
                return res.status(400).json({ error: 'Invalid items array' });
            }

            const results = { success: 0, failed: 0, errors: [] as string[] };

            // Process in batches to avoid timeout but prevent DB locking issues
            const BATCH_SIZE = 10;
            for (let i = 0; i < items.length; i += BATCH_SIZE) {
                const batch = items.slice(i, i + BATCH_SIZE);
                await Promise.all(batch.map(async (item: any) => {
                    try {
                        if (!item.courseId || !item.word || !item.meaning || item.unitId === undefined) {
                            throw new Error(`Missing required fields for ${item.word || 'unknown'}`);
                        }

                        // Upsert the Word (master dictionary entry)
                        const word = await prisma.word.upsert({
                            where: { word: item.word },
                            update: {
                                meaning: item.meaning,
                                partOfSpeech: item.partOfSpeech || 'NOUN',
                                hanja: item.hanja,
                                tips: item.tips,
                            },
                            create: {
                                word: item.word,
                                meaning: item.meaning,
                                partOfSpeech: item.partOfSpeech || 'NOUN',
                                hanja: item.hanja,
                                tips: item.tips,
                            },
                        });

                        // Upsert the appearance (linking word to course/unit)
                        await prisma.vocabularyAppearance.upsert({
                            where: {
                                wordId_courseId_unitId: {
                                    wordId: word.id,
                                    courseId: item.courseId,
                                    unitId: Number(item.unitId),
                                },
                            },
                            update: {
                                exampleSentence: item.exampleSentence,
                                exampleMeaning: item.exampleMeaning,
                            },
                            create: {
                                wordId: word.id,
                                courseId: item.courseId,
                                unitId: Number(item.unitId),
                                exampleSentence: item.exampleSentence,
                                exampleMeaning: item.exampleMeaning,
                            },
                        });

                        results.success++;
                    } catch (e: any) {
                        results.failed++;
                        results.errors.push(`${item.word}: ${e.message}`);
                    }
                }));
            }

            res.json({ success: true, results });
        } catch (error) {
            console.error('Bulk Import Error:', error);
            res.status(500).json({ error: 'Import failed' });
        }
    }

    // PATCH /api/admin/vocab/:id - Update word (master entry)
    static async updateItem(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { exampleSentence, exampleMeaning, courseId, unitId, ...wordData } = req.body;

            // Update the Word entry
            const updated = await prisma.word.update({
                where: { id },
                data: wordData,
            });

            // If appearance-specific data is provided, update it too
            if (courseId && unitId !== undefined && (exampleSentence !== undefined || exampleMeaning !== undefined)) {
                await prisma.vocabularyAppearance.updateMany({
                    where: {
                        wordId: id,
                        courseId,
                        unitId: Number(unitId),
                    },
                    data: {
                        exampleSentence,
                        exampleMeaning,
                    },
                });
            }

            res.json({ success: true, item: updated });
        } catch (error) {
            console.error('Update Item Error:', error);
            res.status(500).json({ error: 'Update failed' });
        }
    }

    // DELETE /api/admin/vocab/:id - Delete word appearance (not the word itself)
    static async deleteItem(req: Request, res: Response) {
        try {
            const { id } = req.params; // This is appearanceId
            const { deleteWord } = req.query;

            const appearance = await prisma.vocabularyAppearance.findUnique({
                where: { id },
                include: { word: true },
            });

            if (!appearance) {
                return res.status(404).json({ error: 'Appearance not found' });
            }

            await prisma.vocabularyAppearance.delete({ where: { id } });

            // Optionally delete the word if no more appearances
            if (deleteWord === 'true') {
                const remaining = await prisma.vocabularyAppearance.count({
                    where: { wordId: appearance.wordId },
                });
                if (remaining === 0) {
                    await prisma.word.delete({ where: { id: appearance.wordId } });
                }
            }

            res.json({ success: true });
        } catch (error) {
            console.error('Delete Item Error:', error);
            res.status(500).json({ error: 'Delete failed' });
        }
    }

    // POST /api/admin/vocab/:id/tts - Generate TTS for a word
    static async generateAudio(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const word = await prisma.word.findUnique({ where: { id } });
            if (!word) return res.status(404).json({ error: 'Word not found' });

            const url = await TTSService.generate(word.word);

            const updated = await prisma.word.update({
                where: { id },
                data: { audioUrl: url },
            });

            res.json({ success: true, audioUrl: url, item: updated });
        } catch (error) {
            console.error('Generate Audio Error:', error);
            res.status(500).json({ error: 'Generation failed' });
        }
    }

    // POST /api/admin/vocab/:id/upload - Upload audio file
    static async uploadAudio(req: Request, res: Response) {
        try {
            if (!req.file || !(req.file as any).location) {
                return res.status(400).json({ error: 'No file uploaded' });
            }
            const { id } = req.params;
            const url = (req.file as any).location;

            const updated = await prisma.word.update({
                where: { id },
                data: { audioUrl: url },
            });

            res.json({ success: true, audioUrl: url, item: updated });
        } catch (error) {
            console.error('Upload Audio Error:', error);
            res.status(500).json({ error: 'Upload failed' });
        }
    }
}
