/**
 * 检查考试数据存储状态
 * 运行方式: npx ts-node scripts/check-exam-storage.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkExamStorage() {
    const exams = await prisma.topikExam.findMany({
        select: {
            id: true,
            title: true,
            questions: true,
        },
    });

    console.log('\n=== 考试数据存储状态检查 ===\n');
    console.log(`总考试数量: ${exams.length}\n`);

    let s3Count = 0;
    let dbCount = 0;
    let emptyCount = 0;

    exams.forEach((exam) => {
        const questions = exam.questions as any;

        if (!questions || (Array.isArray(questions) && questions.length === 0)) {
            emptyCount++;
            console.log(`❓ ${exam.title} (${exam.id}): 无题目数据`);
        } else if (questions.url && !Array.isArray(questions)) {
            s3Count++;
            console.log(`✅ ${exam.title}: S3存储 → ${questions.url.substring(0, 60)}...`);
        } else if (Array.isArray(questions)) {
            dbCount++;
            console.log(`⚠️  ${exam.title}: 数据库存储 (${questions.length} 题)`);
        }
    });

    console.log('\n=== 统计 ===');
    console.log(`S3 对象存储: ${s3Count} 个考试`);
    console.log(`数据库存储:  ${dbCount} 个考试`);
    console.log(`无数据:      ${emptyCount} 个考试`);
    console.log('');

    if (dbCount > 0) {
        console.log('⚠️  建议: 仍有数据存储在数据库中，可以运行迁移脚本将其迁移到 S3');
    } else {
        console.log('✅ 所有考试题目数据已迁移到 S3 对象存储！');
    }

    await prisma.$disconnect();
}

checkExamStorage().catch(console.error);
