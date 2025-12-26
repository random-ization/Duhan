import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const courseId = '中央大学韩国语';

    console.log('🌱 Seeding grammar data for', courseId);

    // Clear existing grammar for this course to avoid duplicates
    await prisma.userGrammarProgress.deleteMany({
        where: { grammarPoint: { courseId: courseId } }
    });
    await prisma.grammarPoint.deleteMany({
        where: { courseId: courseId }
    });

    const grammarPoints = [
        // === Unit 1 ===
        {
            courseId,
            unitId: 1,
            unitTitle: "소개 (Introduction)",
            title: "-입니다",
            summary: "敬语终结词尾，表示\"是\"",
            type: "ENDING",
            explanation: "**-입니다** 是韩语中最常用的敬语终结词尾，用于正式场合表达\"是\"的意思。直接加在名词后面使用。",
            construction: { "名词": "+ 입니다" },
            examples: [
                { kr: "저는 학생입니다.", cn: "我是学生。" },
                { kr: "이것은 책입니다.", cn: "这是书。" }
            ]
        },
        {
            courseId,
            unitId: 1,
            unitTitle: "소개 (Introduction)",
            title: "-입니까?",
            summary: "敬语疑问终结词尾",
            type: "ENDING",
            explanation: "**-입니까?** 是 -입니다 的疑问形式，用于正式场合询问。",
            construction: { "名词": "+ 입니까?" },
            examples: [
                { kr: "학생입니까?", cn: "是学生吗？" },
                { kr: "어디입니까?", cn: "是哪里？" }
            ]
        },
        {
            courseId,
            unitId: 1,
            unitTitle: "소개 (Introduction)",
            title: "은/는",
            summary: "主题助词",
            type: "PARTICLE",
            explanation: "**은/는** 是主题助词，用于强调句子的主题（话题）。收音结尾用 은，元音结尾用 는。",
            construction: { "收音": "+ 은", "元音": "+ 는" },
            examples: [
                { kr: "저는 한국 사람입니다.", cn: "我是韩国人。" },
                { kr: "이름은 무엇입니까?", cn: "名字是什么？" }
            ]
        },

        // === Unit 2 ===
        {
            courseId,
            unitId: 2,
            unitTitle: "학교 (School)",
            title: "이/가",
            summary: "主语助词",
            type: "PARTICLE",
            explanation: "**이/가** 是主语助词，用于标识句子的主语。收音结尾用 이，元音结尾用 가。",
            construction: { "收音": "+ 이", "元音": "+ 가" },
            examples: [
                { kr: "가방이 있습니다.", cn: "有包。" },
                { kr: "학교가 큽니다.", cn: "学校很大。" }
            ]
        },
        {
            courseId,
            unitId: 2,
            unitTitle: "학교 (School)",
            title: "이/가 아니다",
            summary: "否定表达\"不是\"",
            type: "ENDING",
            explanation: "**이/가 아니다** 表示否定，意为\"不是\"。是 -입니다/이다 的否定形式。",
            construction: { "句型": "N이/가 아닙니다" },
            examples: [
                { kr: "저는 학생이 아닙니다.", cn: "我不是学生。" },
                { kr: "이것은 제 책이 아닙니다.", cn: "这不是我的书。" }
            ]
        },
    ];

    for (const point of grammarPoints) {
        await prisma.grammarPoint.create({
            data: point
        });
    }

    console.log(`✅ Seeded ${grammarPoints.length} grammar points.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
