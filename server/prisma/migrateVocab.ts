/**
 * Migration Script: Vocabulary -> Word + VocabularyAppearance
 * 
 * This script migrates data from the old Vocabulary table to the new schema:
 * - Word (master dictionary) 
 * - VocabularyAppearance (course/unit links)
 * 
 * Run with: npx ts-node prisma/migrateVocab.ts
 */

import { PrismaClient as OldPrisma } from '@prisma/client';

// We need to use raw SQL since old model is gone from Prisma
const prisma = new OldPrisma();

interface OldVocabulary {
    id: string;
    courseId: string;
    unitId: number;
    word: string;
    meaning: string;
    partOfSpeech: string;
    hanja: string | null;
    pronunciation: string | null;
    audioUrl: string | null;
    exampleSentence: string | null;
    exampleMeaning: string | null;
    tips: any;
    createdAt: Date;
    updatedAt: Date;
}

interface OldUserWordProgress {
    id: string;
    userId: string;
    vocabularyId: string;
    status: string;
    nextReviewAt: Date | null;
    interval: number;
    easeFactor: number;
    streak: number;
    lastReviewedAt: Date | null;
    mistakeCount: number;
}

async function migrate() {
    console.log('Starting vocabulary migration...');

    // 1. Fetch all old vocabulary entries using raw SQL
    const oldVocab: OldVocabulary[] = await prisma.$queryRaw`
        SELECT * FROM "Vocabulary"
    `;
    console.log(`Found ${oldVocab.length} vocabulary entries to migrate`);

    // 2. Group by unique word to create Word entries
    const wordMap = new Map<string, OldVocabulary[]>();
    for (const v of oldVocab) {
        const existing = wordMap.get(v.word) || [];
        existing.push(v);
        wordMap.set(v.word, existing);
    }
    console.log(`Found ${wordMap.size} unique words`);

    // 3. Create Word entries and VocabularyAppearance entries
    const wordIdMap = new Map<string, string>(); // old vocab.id -> new word.id
    const vocabIdToWordId = new Map<string, string>(); // for UserWordProgress migration

    for (const [wordText, entries] of wordMap) {
        // Use the first entry for the master word data
        const first = entries[0];

        // Check if word already exists (idempotent)
        let word = await prisma.word.findUnique({ where: { word: wordText } });

        if (!word) {
            word = await prisma.word.create({
                data: {
                    word: wordText,
                    meaning: first.meaning,
                    partOfSpeech: first.partOfSpeech,
                    hanja: first.hanja,
                    pronunciation: first.pronunciation,
                    audioUrl: first.audioUrl,
                    tips: first.tips,
                },
            });
            console.log(`Created Word: ${wordText}`);
        }

        // Create VocabularyAppearance for each course/unit this word appears in
        for (const v of entries) {
            vocabIdToWordId.set(v.id, word.id);

            // Check if appearance already exists
            const existing = await prisma.vocabularyAppearance.findUnique({
                where: {
                    wordId_courseId_unitId: {
                        wordId: word.id,
                        courseId: v.courseId,
                        unitId: v.unitId,
                    },
                },
            });

            if (!existing) {
                await prisma.vocabularyAppearance.create({
                    data: {
                        wordId: word.id,
                        courseId: v.courseId,
                        unitId: v.unitId,
                        exampleSentence: v.exampleSentence,
                        exampleMeaning: v.exampleMeaning,
                    },
                });
                console.log(`  -> Appearance: ${v.courseId} Unit ${v.unitId}`);
            }
        }
    }

    // 4. Migrate UserWordProgress
    console.log('Migrating user word progress...');
    const oldProgress: OldUserWordProgress[] = await prisma.$queryRaw`
        SELECT * FROM "UserWordProgress" WHERE "vocabularyId" IS NOT NULL
    `;

    for (const p of oldProgress) {
        const newWordId = vocabIdToWordId.get(p.vocabularyId);
        if (!newWordId) {
            console.warn(`Skipping progress for unknown vocabularyId: ${p.vocabularyId}`);
            continue;
        }

        // Check if already migrated
        const existing = await prisma.userWordProgress.findUnique({
            where: {
                userId_wordId: { userId: p.userId, wordId: newWordId },
            },
        });

        if (!existing) {
            await prisma.userWordProgress.create({
                data: {
                    userId: p.userId,
                    wordId: newWordId,
                    status: p.status as any,
                    nextReviewAt: p.nextReviewAt,
                    interval: p.interval,
                    easeFactor: p.easeFactor,
                    streak: p.streak,
                    lastReviewedAt: p.lastReviewedAt,
                    mistakeCount: p.mistakeCount,
                },
            });
        }
    }

    console.log('Migration complete!');
    console.log(`- ${wordMap.size} unique words created`);
    console.log(`- ${oldVocab.length} vocabulary appearances created`);
    console.log(`- ${oldProgress.length} user progress records migrated`);
}

migrate()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
