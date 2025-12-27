import { PrismaClient } from '@prisma/client';

/**
 * Cleanup script to prepare for the new Grammar Knowledge Graph schema.
 * Deletes existing GrammarPoint and UserGrammarProgress data.
 */
const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Cleaning up existing grammar data...');

    // Delete user progress first (foreign key constraint)
    const deletedProgress = await prisma.userGrammarProgress.deleteMany({});
    console.log(`  ✅ Deleted ${deletedProgress.count} UserGrammarProgress records`);

    // Delete grammar points
    const deletedPoints = await prisma.grammarPoint.deleteMany({});
    console.log(`  ✅ Deleted ${deletedPoints.count} GrammarPoint records`);

    console.log('\n🎉 Cleanup complete! You can now run: npx prisma db push');
}

main()
    .catch((e) => {
        console.error('❌ Cleanup failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
