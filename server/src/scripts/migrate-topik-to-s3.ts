/**
 * 一次性迁移脚本：将现有考试的 questions JSON 上传到 S3
 * 
 * 运行方式：
 * cd server
 * npx ts-node src/scripts/migrate-topik-to-s3.ts
 */

import { PrismaClient } from '@prisma/client';
import { uploadJsonToS3 } from '../lib/storage';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

const prisma = new PrismaClient();

interface QuestionsRef {
    url: string;
    key: string;
    uploadedAt: string;
    migratedFrom?: 'inline-json';
}

async function migrateTopikExamsToS3() {
    console.log('🚀 开始迁移 TOPIK 考试数据到 S3...\n');

    try {
        // 获取所有考试
        const exams = await prisma.topikExam.findMany();
        console.log(`📋 找到 ${exams.length} 个考试记录\n`);

        let migratedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const exam of exams) {
            const questions = exam.questions as any;

            // 检查是否已经是 URL 引用格式（已迁移）
            if (questions && typeof questions === 'object' && questions.url && !Array.isArray(questions)) {
                console.log(`⏭️  跳过 [${exam.id}] ${exam.title} - 已迁移`);
                skippedCount++;
                continue;
            }

            // 检查是否有有效的题目数据
            if (!questions || !Array.isArray(questions) || questions.length === 0) {
                console.log(`⚠️  跳过 [${exam.id}] ${exam.title} - 无题目数据`);
                skippedCount++;
                continue;
            }

            try {
                // 生成 S3 key
                const timestamp = Date.now();
                const s3Key = `exams/${exam.id}/${timestamp}.json`;

                console.log(`📤 上传 [${exam.id}] ${exam.title} (${questions.length} 题)...`);

                // 上传到 S3
                const uploadResult = await uploadJsonToS3(questions, s3Key);

                // 创建 URL 引用对象
                const questionsRef: QuestionsRef = {
                    url: uploadResult.url,
                    key: uploadResult.key,
                    uploadedAt: new Date().toISOString(),
                    migratedFrom: 'inline-json', // 标记为迁移数据
                };

                // 更新数据库
                await prisma.topikExam.update({
                    where: { id: exam.id },
                    data: { questions: questionsRef as any },
                });

                console.log(`   ✅ 成功: ${uploadResult.url}`);
                migratedCount++;

            } catch (error) {
                console.error(`   ❌ 失败 [${exam.id}]:`, error);
                errorCount++;
            }
        }

        // 打印摘要
        console.log('\n' + '='.repeat(50));
        console.log('📊 迁移完成摘要:');
        console.log(`   ✅ 成功迁移: ${migratedCount} 个`);
        console.log(`   ⏭️  已跳过: ${skippedCount} 个`);
        console.log(`   ❌ 失败: ${errorCount} 个`);
        console.log('='.repeat(50) + '\n');

        if (errorCount > 0) {
            console.log('⚠️  有失败的迁移，请检查日志并重新运行脚本');
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ 迁移过程中发生错误:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// 运行迁移
migrateTopikExamsToS3()
    .then(() => {
        console.log('🎉 迁移脚本执行完毕!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 致命错误:', error);
        process.exit(1);
    });
