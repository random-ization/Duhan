import { internalMutation } from './_generated/server';

const PHRASES = [
    {
        korean: "시작이 반이다",
        romanization: "Sijagi banida",
        translation: "Starting is half the battle",
        translationZh: "好的开始是成功的一半",
        translationVi: "Đầu xuôi đuôi lọt",
    },
    {
        korean: "노력은 배신하지 않는다",
        romanization: "Noryeogeun baeshinhaji anneunda",
        translation: "Effort never betrays you",
        translationZh: "努力不会背叛你",
    },
    {
        korean: "가는 말이 고와야 오는 말이 곱다",
        romanization: "Ganeun mari gowaya oneun mari gopda",
        translation: "Speak nice words to hear nice words",
        translationZh: "良言一句三冬暖",
    },
    {
        korean: "티끌 모아 태산",
        romanization: "Tikkeul moa taesan",
        translation: "Gather dust to make a mountain",
        translationZh: "积少成多",
    },
    {
        korean: "고생 끝에 낙이 온다",
        romanization: "Gosaeng kkeute nagi onda",
        translation: "Pleasure comes after difficulty",
        translationZh: "苦尽甘来",
    },
    {
        korean: "백지장도 맞들면 낫다",
        romanization: "Baekjjangdo matdeulmyeon natda",
        translation: "Two heads are better than one",
        translationZh: "三个臭皮匠，顶个诸葛亮",
    },
    {
        korean: "금강산도 식후경",
        romanization: "Geumgangsando sikhugyeong",
        translation: "Even sightseeing comes after eating",
        translationZh: "民以食为天",
    },
    {
        korean: "실패는 성공의 어머니",
        romanization: "Silpaeneun seonggong-ui eomeoni",
        translation: "Failure is the mother of success",
        translationZh: "失败是成功之母",
    },
    {
        korean: "시간은 금이다",
        romanization: "Siganeun geumida",
        translation: "Time is gold",
        translationZh: "一寸光阴一寸金",
    },
    {
        korean: "웃음은 최고의 명약이다",
        romanization: "Useumeun choegoui myeongyagida",
        translation: "Laughter is the best medicine",
        translationZh: "笑一笑，十年少",
    },
];

export const seed = internalMutation({
    handler: async (ctx) => {
        // Cast to any because the table might not be in the generated types yet
        const existing = await (ctx.db as any).query('daily_phrases').collect();
        if (existing.length > 0) {
            console.log('Daily phrases already initialized.');
            return;
        }

        let count = 0;
        for (const phrase of PHRASES) {
            await (ctx.db as any).insert('daily_phrases', phrase);
            count++;
        }
        console.log(`Seeded ${count} daily phrases.`);
    }
});
