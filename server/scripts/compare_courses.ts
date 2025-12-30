
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
    const courses = ['course_yonsei_1a', 'course_yonsei_1a_appendix', 'course_yonsei_1b', 'course_yonsei_1b_appendix'];

    console.log('--- Comparison ---');
    for (const id of courses) {
        const inst = await prisma.institute.findUnique({ where: { id } });
        if (!inst) {
            console.log(`${id}: NOT FOUND`);
            continue;
        }

        const vocabCount = await prisma.vocabularyAppearance.count({ where: { courseId: id } });
        const unitCount = await prisma.textbookUnit.count({ where: { courseId: id } });

        console.log(`${id}:`);
        console.log(`  Name: ${inst.name}`);
        console.log(`  TotalUnits: ${inst.totalUnits}`);
        console.log(`  Vocab: ${vocabCount}`);
        console.log(`  Units: ${unitCount}`);
        console.log('-------------------');
    }
}

check()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
