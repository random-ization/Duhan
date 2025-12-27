import { PrismaClient } from '@prisma/client';

/**
 * Cleanup orphaned CourseGrammar records that reference non-existent Institute IDs
 */
const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Cleaning up orphaned CourseGrammar records...');

    // Get all unique courseIds in CourseGrammar
    const courseGrammarRecords = await prisma.courseGrammar.findMany({
        select: { courseId: true }
    });

    const uniqueCourseIds = [...new Set(courseGrammarRecords.map(r => r.courseId))];
    console.log(`Found ${uniqueCourseIds.length} unique courseIds in CourseGrammar`);

    // Check which ones don't exist in Institute
    const existingInstitutes = await prisma.institute.findMany({
        select: { id: true }
    });
    const existingIds = new Set(existingInstitutes.map(i => i.id));

    const orphanedIds = uniqueCourseIds.filter(id => !existingIds.has(id));
    console.log(`Found ${orphanedIds.length} orphaned courseIds:`, orphanedIds);

    if (orphanedIds.length > 0) {
        // Delete orphaned CourseGrammar records
        const deleted = await prisma.courseGrammar.deleteMany({
            where: { courseId: { in: orphanedIds } }
        });
        console.log(`✅ Deleted ${deleted.count} orphaned CourseGrammar records`);
    }

    // Also check VocabularyAppearance
    console.log('\n🧹 Cleaning up orphaned VocabularyAppearance records...');
    const vocabRecords = await prisma.vocabularyAppearance.findMany({
        select: { courseId: true }
    });
    const uniqueVocabCourseIds = [...new Set(vocabRecords.map(r => r.courseId))];
    const orphanedVocabIds = uniqueVocabCourseIds.filter(id => !existingIds.has(id));
    console.log(`Found ${orphanedVocabIds.length} orphaned courseIds in VocabularyAppearance`);

    if (orphanedVocabIds.length > 0) {
        const deletedVocab = await prisma.vocabularyAppearance.deleteMany({
            where: { courseId: { in: orphanedVocabIds } }
        });
        console.log(`✅ Deleted ${deletedVocab.count} orphaned VocabularyAppearance records`);
    }

    console.log('\n🎉 Cleanup complete!');
}

main()
    .catch((e) => {
        console.error('❌ Cleanup failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
