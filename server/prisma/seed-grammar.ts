import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding Global Grammar Knowledge Graph...');

    // Master Grammar Points - Global Source of Truth
    const grammarPoints = [
        {
            title: '-입니다',
            slug: 'ibnida',
            level: 'TOPIK 1',
            type: 'ENDING',
            summary: 'Formal polite ending (is)',
            explanation: `**-입니다** is the formal polite declarative sentence ending in Korean. It is used to make statements in formal situations.

## Usage
- Attach directly to nouns to mean "is/am/are (noun)"
- Used in formal settings: news, business, presentations

## Formation
- Noun + 입니다`,
            conjugationRules: { all: '입니다' },
            examples: [
                { kr: '저는 학생입니다.', cn: '我是学生。' },
                { kr: '이것은 책입니다.', cn: '这是书。' },
                { kr: '한국 사람입니다.', cn: '是韩国人。' }
            ]
        },
        {
            title: '-은/는',
            slug: 'eun-neun',
            level: 'TOPIK 1',
            type: 'PARTICLE',
            summary: 'Topic marker',
            explanation: `**-은/는** is the topic marker particle. It highlights the topic of the sentence, often with a nuance of contrast or emphasis.

## Usage
- Marks the topic of conversation
- Often implies contrast with other possibilities
- Can be used with any noun

## Formation
- After consonant (받침): -은  
- After vowel: -는`,
            conjugationRules: { vowel: '는', consonant: '은' },
            examples: [
                { kr: '저는 학생입니다.', cn: '我（话题）是学生。' },
                { kr: '오늘은 날씨가 좋습니다.', cn: '今天天气很好。' },
                { kr: '사과는 빨갛습니다.', cn: '苹果是红色的。' }
            ]
        },
        {
            title: '-이/가',
            slug: 'i-ga',
            level: 'TOPIK 1',
            type: 'PARTICLE',
            summary: 'Subject marker',
            explanation: `**-이/가** is the subject marker particle. It identifies the grammatical subject of the sentence.

## Usage
- Marks the subject performing the action or being described
- Used to introduce new information
- Used in "existence" sentences with 있다/없다

## Formation
- After consonant (받침): -이
- After vowel: -가`,
            conjugationRules: { vowel: '가', consonant: '이' },
            examples: [
                { kr: '가방이 있습니다.', cn: '有包。' },
                { kr: '학교가 큽니다.', cn: '学校很大。' },
                { kr: '누가 왔습니까?', cn: '谁来了？' }
            ]
        }
    ];

    // Upsert Master Grammar Points
    console.log('📚 Upserting Master Grammar Points...');
    const createdPoints: { id: string; title: string }[] = [];

    for (const point of grammarPoints) {
        const result = await prisma.grammarPoint.upsert({
            where: { title: point.title },
            update: {
                slug: point.slug,
                level: point.level,
                type: point.type,
                summary: point.summary,
                explanation: point.explanation,
                conjugationRules: point.conjugationRules,
                examples: point.examples
            },
            create: point
        });
        createdPoints.push({ id: result.id, title: result.title });
        console.log(`  ✅ ${result.title} (${result.id})`);
    }

    // Link to Seoul National University 1A Course
    const courseId = 'course_snu_1a';
    const unitId = 1;

    console.log(`\n🔗 Linking grammar to course: ${courseId}, Unit ${unitId}...`);

    // Clear existing links for this course/unit to avoid duplicates
    await prisma.courseGrammar.deleteMany({
        where: { courseId, unitId }
    });

    // Create course-grammar links
    for (let i = 0; i < createdPoints.length; i++) {
        const point = createdPoints[i];
        await prisma.courseGrammar.create({
            data: {
                courseId,
                unitId,
                grammarId: point.id,
                displayOrder: i + 1
            }
        });
        console.log(`  ✅ Linked "${point.title}" to ${courseId}, Unit ${unitId}, Order ${i + 1}`);
    }

    console.log('\n🎉 Seeding complete!');
    console.log(`   - ${createdPoints.length} Master Grammar Points`);
    console.log(`   - ${createdPoints.length} Course-Grammar Links`);
}

main()
    .catch((e) => {
        console.error('❌ Seeding failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
