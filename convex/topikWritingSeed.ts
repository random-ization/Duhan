/**
 * convex/topikWritingSeed.ts
 *
 * One-time seed: inserts a mock TOPIK II Writing exam (第64届) with Q51–54.
 * Run once via:  npx convex run topikWritingSeed:seedWritingExam
 *
 * Safe to run multiple times – checks for existing legacyId first.
 */

import { internalMutation } from './_generated/server';

export const seedWritingExam = internalMutation({
    args: {},
    handler: async ctx => {
        const LEGACY_ID = 'writing-exam-64';

        // ── Idempotency guard ────────────────────────────────────────────────────
        const existing = await ctx.db
            .query('topik_exams')
            .withIndex('by_legacy_id', q => q.eq('legacyId', LEGACY_ID))
            .first();

        if (existing) {
            return { skipped: true, message: `Exam ${LEGACY_ID} already exists`, examId: existing._id };
        }

        // ── 1. Insert topik_exams record ─────────────────────────────────────────
        const examId = await ctx.db.insert('topik_exams', {
            legacyId: LEGACY_ID,
            title: '第64届 TOPIK II 写作',
            round: 64,
            type: 'WRITING',
            timeLimit: 50,
            isPaid: false,
            description: 'TOPIK II 写作模拟卷（第64届），包含51–54题，共100分。',
            createdAt: Date.now(),
        });

        // ── 2. Insert Q51 — 填空 (FILL_BLANK, 10분) ──────────────────────────────
        await ctx.db.insert('topik_writing_questions', {
            examId,
            number: 51,
            questionType: 'FILL_BLANK',
            score: 10,
            instruction:
                '※ [51~52] 다음을 읽고 ㉠과 ㉡에 들어갈 말을 각각 한 문장으로 쓰십시오.',
            contextBox:
                '제가 요즘 운동을 시작했는데 처음에는 힘들었지만 지금은 많이 좋아졌습니다. ' +
                '매일 30분씩 걷기 운동을 하는데 ( ㉠ ). ' +
                '운동을 하면 건강에도 좋고 스트레스도 풀려서 ( ㉡ ).',
            modelAnswer:
                '㉠ 예시: 몸이 가벼워지고 기분도 좋아졌습니다\n' +
                '㉡ 예시: 앞으로도 꾸준히 운동을 할 것입니다',
        });

        // ── 3. Insert Q52 — 填空 (FILL_BLANK, 10분) ──────────────────────────────
        await ctx.db.insert('topik_writing_questions', {
            examId,
            number: 52,
            questionType: 'FILL_BLANK',
            score: 10,
            instruction:
                '※ [51~52] 다음을 읽고 ㉠과 ㉡에 들어갈 말을 각각 한 문장으로 쓰십시오.',
            contextBox:
                '환경 보호를 위해 우리가 일상에서 할 수 있는 일이 많이 있습니다. ' +
                '예를 들어 쓰레기를 분리해서 버리거나 ( ㉠ ). ' +
                '이러한 작은 노력들이 모이면 ( ㉡ ).',
            modelAnswer:
                '㉠ 예시: 대중교통을 이용하는 것도 환경 보호에 도움이 됩니다\n' +
                '㉡ 예시: 지구 환경을 지키는 데 큰 도움이 될 것입니다',
        });

        // ── 4. Insert Q53 — 图表作文 (GRAPH_ESSAY, 30분) ─────────────────────────
        await ctx.db.insert('topik_writing_questions', {
            examId,
            number: 53,
            questionType: 'GRAPH_ESSAY',
            score: 30,
            instruction:
                '※ [53] 다음을 참고하여 "온라인 쇼핑 이용 현황"에 대한 글을 200자에서 300자로 쓰십시오. ' +
                '단, 글의 제목을 쓰지 마십시오.',
            contextBox:
                '【온라인 쇼핑 이용 현황 (2023년 기준)】\n\n' +
                '▸ 이용 경험률: 전체 성인의 87% → 최근 5년간 22%p 증가\n' +
                '▸ 이용 이유 (복수 응답)\n' +
                '   1위. 편리성 (72%)\n' +
                '   2위. 가격 비교 용이 (58%)\n' +
                '   3위. 다양한 상품 선택 (44%)\n' +
                '▸ 주요 불만 사항\n' +
                '   1위. 반품/교환 불편 (51%)\n' +
                '   2위. 배송 지연 (39%)',
            modelAnswer:
                '최근 조사에 따르면 온라인 쇼핑 이용 경험률이 87%로, ' +
                '5년 전보다 22%포인트 증가하였다. ' +
                '이용 이유로는 편리성(72%), 가격 비교 용이성(58%), ' +
                '다양한 상품 선택(44%) 순으로 나타났다. ' +
                '반면 주요 불만 사항으로는 반품 및 교환의 불편함(51%)과 ' +
                '배송 지연(39%)이 꼽혔다. ' +
                '이러한 결과는 온라인 쇼핑이 일상화되었음을 보여 주는 동시에, ' +
                '소비자 편의를 높이기 위한 서비스 개선이 필요함을 시사한다.',
        });

        // ── 5. Insert Q54 — 论述作文 (OPINION_ESSAY, 50분) ───────────────────────
        await ctx.db.insert('topik_writing_questions', {
            examId,
            number: 54,
            questionType: 'OPINION_ESSAY',
            score: 50,
            instruction:
                '※ [54] 다음을 주제로 하여 자신의 생각을 600~700자로 글을 쓰십시오. ' +
                '단, 문제를 그대로 옮겨 쓰지 마십시오.',
            contextBox:
                '현대 사회에서 소셜 미디어(SNS)는 우리 생활에 깊숙이 자리 잡았습니다. ' +
                '소셜 미디어가 개인과 사회에 미치는 영향에 대해 긍정적인 면과 ' +
                '부정적인 면을 모두 포함하여 자신의 견해를 쓰십시오.',
            modelAnswer:
                '소셜 미디어는 현대인의 소통 방식을 근본적으로 바꾸어 놓았다. ' +
                '이에 대해 긍정적인 측면과 부정적인 측면을 함께 살펴보겠다.\n\n' +
                '우선 소셜 미디어의 긍정적인 영향으로는 정보 접근성의 향상과 ' +
                '글로벌 소통의 활성화를 들 수 있다. 과거에는 대중 매체를 통해서만 ' +
                '접할 수 있었던 정보를 이제는 누구나 실시간으로 공유하고 ' +
                '접근할 수 있게 되었다. 또한 지리적 거리와 관계없이 전 세계 사람들과 ' +
                '소통할 수 있어 국제적 이해와 협력이 증진되었다.\n\n' +
                '그러나 부정적인 측면도 간과할 수 없다. ' +
                '허위 정보의 빠른 확산과 프라이버시 침해 문제가 심각해지고 있다. ' +
                '또한 과도한 소셜 미디어 사용으로 인한 중독과 ' +
                '대면 소통 능력의 저하도 우려되는 문제이다.\n\n' +
                '결론적으로 소셜 미디어는 올바르게 활용한다면 ' +
                '개인과 사회 발전에 크게 기여할 수 있다. ' +
                '이를 위해서는 미디어 리터러시 교육을 강화하고 ' +
                '건전한 소셜 미디어 이용 문화를 정착시켜야 할 것이다.',
            gradingCriteria: {
                taskAccomplishment: '주제에 맞게 긍정적/부정적 측면을 모두 다루었는가',
                developmentStructure: '서론-본론-결론의 논리적 구성이 갖추어졌는가',
                languageUse: '고급 어휘와 다양한 문법 표현을 적절히 사용했는가',
                wongojiRules: '원고지 사용 규칙(문단, 들여쓰기)을 지켰는가',
            },
        });

        return {
            skipped: false,
            message: '✅ 第64届 TOPIK II 写作考试及4道题目写入成功',
            examId,
        };
    },
});

export const seedWritingExamMock2 = internalMutation({
    args: {},
    handler: async ctx => {
        const LEGACY_ID = 'writing-exam-60-mock';

        // ── Idempotency guard ────────────────────────────────────────────────────
        const existing = await ctx.db
            .query('topik_exams')
            .withIndex('by_legacy_id', q => q.eq('legacyId', LEGACY_ID))
            .first();

        if (existing) {
            return { skipped: true, message: `Exam ${LEGACY_ID} already exists`, examId: existing._id };
        }

        // ── 1. Insert topik_exams record ─────────────────────────────────────────
        const examId = await ctx.db.insert('topik_exams', {
            legacyId: LEGACY_ID,
            title: '第60届 TOPIK II 写作 (Mock)',
            round: 60,
            type: 'WRITING',
            timeLimit: 50,
            isPaid: false,
            description: 'TOPIK II 写作模拟卷（第60届），包含51–54题，用于系统测试。',
            createdAt: Date.now(),
        });

        // ── 2. Insert Q51 — 填空 (FILL_BLANK) ──────────────────────────────
        await ctx.db.insert('topik_writing_questions', {
            examId,
            number: 51,
            questionType: 'FILL_BLANK',
            score: 10,
            instruction: '※ [51~52] 다음을 읽고 ㉠과 ㉡에 들어갈 말을 각각 한 문장으로 쓰십시오.',
            contextBox:
                '수미 씨, 그동안 감사했습니다.\n' +
                '제가 다음 달에 고향으로 ( ㉠ ).\n' +
                '고향에 가기 전에 수미 씨와 식사를 한 번 하고 싶습니다.\n' +
                '이번 주 주말에 ( ㉡ )?\n' +
                '시간이 괜찮으면 연락해 주십시오.',
            modelAnswer:
                '㉠ 돌아가게 되었습니다 / 돌아갈 예정입니다\n' +
                '㉡ 시간이 있으십니까 / 만날 수 있습니까 / 식사할 수 있습니까',
        });

        // ── 3. Insert Q52 — 填空 (FILL_BLANK) ──────────────────────────────
        await ctx.db.insert('topik_writing_questions', {
            examId,
            number: 52,
            questionType: 'FILL_BLANK',
            score: 10,
            instruction: '※ [51~52] 다음을 읽고 ㉠과 ㉡에 들어갈 말을 각각 한 문장으로 쓰십시오.',
            contextBox:
                '사람들은 보통 스트레스를 받으면 단 음식을 먹는다.\n' +
                '단 음식을 먹으면 몸 안에 기분을 좋게 하는 물질이 ( ㉠ ).\n' +
                '그렇지만 단 음식을 너무 많이 먹으면 건강이 ( ㉡ ).\n' +
                '따라서 스트레스를 받을 때에는 운동을 하는 것이 좋다.',
            modelAnswer:
                '㉠ 생기기 때문이다 / 나오기 때문이다\n' +
                '㉡ 나빠질 수 있다 / 안 좋아질 수 있다',
        });

        // ── 4. Insert Q53 — 图表作文 (GRAPH_ESSAY) ─────────────────────────
        await ctx.db.insert('topik_writing_questions', {
            examId,
            number: 53,
            questionType: 'GRAPH_ESSAY',
            score: 30,
            instruction:
                '※ [53] 다음을 참고하여 "인주시의 인구 변화"에 대한 글을 200~300자로 쓰십시오. 단, 글의 제목을 쓰지 마십시오.',
            contextBox:
                '【인주시의 인구 변화】\n' +
                '▸ 인구 수 변화: 2000년 15만 명 → 2020년 30만 명\n' +
                '▸ 증가 원인:\n' +
                '   1. 신도시 개발\n' +
                '   2. 교통의 발달\n' +
                '▸ 기대 효과: 지역 경제 활성화',
            modelAnswer:
                '인주시의 인구 변화에 대해 조사한 결과, 2000년에 15만 명이던 인구 수가 꾸준히 증가하여 ' +
                '2020년에는 30만 명으로 2배 증가한 것으로 나타났다. 이러한 인구 증가의 원인으로는 ' +
                '첫째, 신도시 개발을 꼽을 수 있다. 둘째, 교통의 발달도 인구 유입에 큰 영향을 미친 것으로 보인다. ' +
                '앞으로 인구 증가가 지속될 경우 인주시의 지역 경제가 활성화될 것으로 기대된다.',
        });

        // ── 5. Insert Q54 — 论述作文 (OPINION_ESSAY) ───────────────────────
        await ctx.db.insert('topik_writing_questions', {
            examId,
            number: 54,
            questionType: 'OPINION_ESSAY',
            score: 50,
            instruction:
                '※ [54] 다음을 주제로 하여 자신의 생각을 600~700자로 쓰십시오. 단, 문제를 그대로 옮겨 쓰지 마십시오.',
            contextBox:
                '최근 환경 오염이 심각해지면서 환경 보호에 대한 관심이 높아지고 있습니다. ' +
                '환경을 보호하기 위해서 개인과 사회가 어떤 노력을 해야 하는지에 대해 자신의 의견을 쓰십시오.\n' +
                '- 환경 오염의 원인은 무엇인가?\n' +
                '- 환경 보호를 위해 개인이 할 수 있는 노력은 무엇인가?\n' +
                '- 환경 보호를 위해 사회(정부)가 해야 할 일은 무엇인가?',
            modelAnswer:
                '최근 산업화와 도시화가 빠르게 진행되면서 환경 오염 문제가 갈수록 심각해지고 있다. ' +
                '이러한 환경 오염의 가장 큰 원인은 인간의 이기심과 편의주의에 있다. 우리는 편리함을 추구하기 위해 ' +
                '일회용품을 남용하고 에너지를 낭비하며 자연을 훼손해 왔다.\n\n' +
                '이러한 환경 문제를 해결하기 위해서는 먼저 개인의 노력이 필수적이다. 일상생활에서 플라스틱이나 ' +
                '종이컵과 같은 일회용품 사용을 줄이고, 장바구니나 개인 컵을 사용하는 습관을 길러야 한다. ' +
                '또한 대중교통을 이용하거나 쓰레기를 버릴 때에는 분리수거를 철저히 하는 것도 중요 하다.\n\n' +
                '그러나 개인의 노력만으로는 한계가 있으므로 사회와 국가 차원의 대책도 병행되어야 한다. ' +
                '정부는 환경 보호와 관련된 법과 제도를 강화하여 기업들이 친환경적인 제품을 생산하도록 유도해야 한다. ' +
                '아울러 대중매체를 통해 시민 교육을 확대하여 국민들의 환경 보호 의식을 높여야 할 것이다. ' +
                '이처럼 개인의 작은 실천과 사회의 적극적인 지원이 더해질 때, 우리는 더 깨끗한 환경을 만들 수 있다.',
            gradingCriteria: {
                taskAccomplishment: '제시된 세 가지 논점(원인, 개인의 노력, 사회의 역할)을 모두 다루었는가',
                developmentStructure: '서론, 본론, 결론의 논리적 흐름이 자연스러운가',
                languageUse: '환경과 관련된 적절한 어휘와 다양한 문법을 사용했는가',
                wongojiRules: '원고지 작성법과 맞춤법을 정확히 지켰는가',
            },
        });

        return {
            skipped: false,
            message: '✅ 第60届 TOPIK II 写作考试及4道题目写入成功 (Mock)',
            examId,
        };
    },
});
