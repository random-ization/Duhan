#!/usr/bin/env node

/**
 * Public route pre-renderer:
 * 1) Attempt browser-rendered HTML snapshots (Playwright) for indexable body content.
 * 2) Always normalize SEO head tags (canonical/hreflang/lang/meta) for deterministic output.
 * 3) Fall back to a static body scaffold when headless browser isn't available.
 */

import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_LANGUAGE,
  PUBLIC_ROUTES as BASE_PUBLIC_ROUTES,
  buildLocalizedPublicRoutes,
  extractLanguageFromPath,
  withLang,
} from '../src/seo/publicRoutesData.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SITE_URL = 'https://koreanstudy.me';
const DIST_DIR = join(__dirname, '..', 'dist');
const HOST = '127.0.0.1';
const RENDER_WAIT_MS = 20000;
const LEARN_GUIDE_ROUTES = BASE_PUBLIC_ROUTES.filter((route) => route.path.startsWith('/learn/'));
const LEARN_GUIDE_ROUTE_MAP = new Map(LEARN_GUIDE_ROUTES.map((route) => [route.path, route]));

const GUIDE_SEO_TEMPLATES = {
  '/learn/topik-guide': {
    searchIntent: 'TOPIK preparation guide, TOPIK study plan, TOPIK score improvement',
    howToSteps: [
      {
        name: 'Map exam format and target score',
        text: 'Define TOPIK level target, section weights, and realistic timeline before daily practice.',
      },
      {
        name: 'Build weekly timed routine',
        text: 'Run weekly timed reading and listening blocks, then review mistakes by question type.',
      },
      {
        name: 'Close score gaps with error log',
        text: 'Track repeated grammar and vocabulary errors, then recycle weak patterns in focused drills.',
      },
      {
        name: 'Simulate full exam conditions',
        text: 'Use full-length mocks and strict timing to stabilize pace, stamina, and score consistency.',
      },
    ],
    faq: [
      {
        question: 'How long does TOPIK II preparation usually take?',
        answer: 'Most learners need 3 to 6 months with weekly timed practice and systematic review.',
      },
      {
        question: 'Should I prioritize speed or accuracy first?',
        answer: 'Prioritize accuracy first, then increase speed after error patterns become stable.',
      },
      {
        question: 'How often should I take full mock tests?',
        answer: 'Run at least one full mock every 2 weeks, then review mistakes by category.',
      },
    ],
    relatedPaths: ['/learn/topik-writing', '/learn/reading-practice', '/learn/korean-vocabulary'],
  },
  '/learn/korean-grammar': {
    searchIntent: 'Korean grammar study plan, grammar patterns, usage practice',
    howToSteps: [
      {
        name: 'Group grammar by function',
        text: 'Learn grammar in functional clusters such as cause, contrast, condition, and intention.',
      },
      {
        name: 'Compare similar patterns',
        text: 'Study similar endings side by side and write contrast examples for each pair.',
      },
      {
        name: 'Convert input to output',
        text: 'After reading examples, produce your own speaking and writing sentences immediately.',
      },
      {
        name: 'Review by recurring mistakes',
        text: 'Maintain an error notebook and revisit weak endings in spaced review cycles.',
      },
    ],
    faq: [
      {
        question: 'How many grammar points should I learn each week?',
        answer: 'Aim for 3 to 5 patterns with strong retention and repeated output practice.',
      },
      {
        question: 'Is memorizing grammar definitions enough?',
        answer: 'No. Reliable recall requires applying grammar in speaking and writing contexts.',
      },
      {
        question: 'How do I stop confusing similar grammar endings?',
        answer: 'Compare contrast pairs side by side and create your own minimal pair examples.',
      },
    ],
    relatedPaths: ['/learn/topik-writing', '/learn/topik-guide', '/learn/reading-practice'],
  },
  '/learn/korean-vocabulary': {
    searchIntent: 'Korean vocabulary retention, SRS Korean, active recall',
    howToSteps: [
      {
        name: 'Select high-frequency words first',
        text: 'Start with high-frequency words from your level materials and exam requirements.',
      },
      {
        name: 'Layer pronunciation and context',
        text: 'Attach each word to pronunciation, definition, and one context sentence.',
      },
      {
        name: 'Use active recall modes',
        text: 'Combine flashcards, dictation, and spelling to strengthen recall under pressure.',
      },
      {
        name: 'Recycle weak words aggressively',
        text: 'Track forgotten items and increase review frequency for persistent memory gaps.',
      },
    ],
    faq: [
      {
        question: 'How many words should I review daily?',
        answer: 'Start with 20 to 40 quality reviews and scale only when retention remains stable.',
      },
      {
        question: 'Should I learn isolated words or sentence context?',
        answer: 'Use both, but context sentences are critical for accurate usage and recall.',
      },
      {
        question: 'What is the best way to fix words I keep forgetting?',
        answer: 'Increase review frequency and attach each weak word to a personal sentence.',
      },
    ],
    relatedPaths: ['/learn/reading-practice', '/learn/korean-pronunciation', '/learn/topik-guide'],
  },
  '/learn/reading-practice': {
    searchIntent: 'Korean reading practice, reading comprehension strategy, TOPIK reading',
    howToSteps: [
      {
        name: 'Choose level-based texts',
        text: 'Read materials slightly above your comfort level to expand comprehension steadily.',
      },
      {
        name: 'Run two-pass reading',
        text: 'First read for gist, then annotate unknown words and grammar in second pass.',
      },
      {
        name: 'Summarize and paraphrase',
        text: 'Write a short summary to confirm understanding and consolidate key patterns.',
      },
      {
        name: 'Review repeated structures',
        text: 'Recycle common sentence structures across multiple texts for speed and accuracy.',
      },
    ],
    faq: [
      {
        question: 'Is using translation during reading a bad habit?',
        answer: 'Use translation strategically in second pass, not as a constant interruption.',
      },
      {
        question: 'How can I increase reading speed?',
        answer: 'Timed passages and repeated exposure to similar structures improve speed effectively.',
      },
      {
        question: 'Should I read harder texts to improve faster?',
        answer: 'Use slightly challenging texts. Overly difficult materials often reduce consistency.',
      },
    ],
    relatedPaths: ['/learn/korean-vocabulary', '/learn/korean-grammar', '/learn/topik-guide'],
  },
  '/learn/korean-pronunciation': {
    searchIntent: 'Korean pronunciation training, Korean shadowing, speaking accuracy',
    howToSteps: [
      {
        name: 'Shadow short clips daily',
        text: 'Use 10 to 20 second clips and copy rhythm before focusing on single sounds.',
      },
      {
        name: 'Record and compare output',
        text: 'Record your speech and compare timing, pitch, and clarity with native audio.',
      },
      {
        name: 'Fix high-impact errors first',
        text: 'Prioritize 받침, tense consonants, and liaison rules for fastest intelligibility gains.',
      },
      {
        name: 'Repeat correction loops',
        text: 'Revisit the same audio chunks until error patterns become consistently stable.',
      },
    ],
    faq: [
      {
        question: 'How long should pronunciation practice take each day?',
        answer: 'Focused 10 to 15 minute daily sessions can produce strong long-term improvements.',
      },
      {
        question: 'Do I need IPA to improve pronunciation?',
        answer: 'IPA helps some learners, but shadowing and recording feedback are usually more impactful.',
      },
      {
        question: 'How can I tell if my pronunciation is improving?',
        answer: 'Compare weekly recordings for rhythm, clarity, and reduced recurring errors.',
      },
    ],
    relatedPaths: ['/learn/korean-vocabulary', '/learn/reading-practice', '/learn/topik-guide'],
  },
  '/learn/topik-writing': {
    searchIntent: 'TOPIK writing strategy, TOPIK task 54, Korean essay structure',
    howToSteps: [
      {
        name: 'Build reusable writing templates',
        text: 'Prepare structure templates for introduction, supporting points, and conclusion.',
      },
      {
        name: 'Outline before writing',
        text: 'Spend two to three minutes on outline and argument order before drafting.',
      },
      {
        name: 'Prioritize clarity over complexity',
        text: 'Use controlled grammar and consistent sentence endings to reduce scoring penalties.',
      },
      {
        name: 'Apply final revision checklist',
        text: 'Check connectors, spacing, spelling, and grammar hotspots in the final minutes.',
      },
    ],
    faq: [
      {
        question: 'Should I use advanced grammar in every TOPIK sentence?',
        answer: 'No. Controlled and accurate structures usually score better than risky complexity.',
      },
      {
        question: 'What is the fastest way to improve TOPIK writing?',
        answer: 'Timed prompts with structured feedback on recurring errors produce the fastest gains.',
      },
      {
        question: 'How much planning time should I use before writing?',
        answer: 'Spend two to three minutes outlining argument flow before drafting full sentences.',
      },
    ],
    relatedPaths: ['/learn/topik-guide', '/learn/korean-grammar', '/learn/reading-practice'],
  },
};

const GUIDE_SEO_TEMPLATES_LOCALIZED = {
  '/learn/topik-guide': {
    zh: {
      searchIntent: 'TOPIK 备考指南, TOPIK 学习计划, TOPIK 提分策略',
      howToSteps: [
        {
          name: '先明确级别目标与分数区间',
          text: '先确定 TOPIK 目标级别、各题型分值和备考周期，再安排每天任务。',
        },
        {
          name: '建立每周限时训练节奏',
          text: '每周进行听力与阅读限时训练，并按题型复盘错误原因。',
        },
        {
          name: '用错题本缩小提分瓶颈',
          text: '记录重复出错的语法和词汇，定向回收薄弱点。',
        },
        {
          name: '定期做全真模拟',
          text: '按正式考试时间完成整套模考，训练速度、耐力与稳定性。',
        },
      ],
      faq: [
        {
          question: 'TOPIK II 备考通常需要多久？',
          answer: '多数学习者在 3 到 6 个月内通过稳定训练能看到明显提升。',
        },
        {
          question: '应该先提速度还是先提准确率？',
          answer: '先稳准确率，再提速度。否则提速会放大错误。',
        },
        {
          question: '全真模考多久做一次合适？',
          answer: '建议每两周至少一次全真模考，并按题型复盘。',
        },
      ],
    },
    vi: {
      searchIntent: 'hướng dẫn TOPIK, kế hoạch học TOPIK, chiến lược tăng điểm TOPIK',
      howToSteps: [
        {
          name: 'Xác định mục tiêu cấp độ và điểm số',
          text: 'Chọn cấp độ TOPIK mục tiêu, điểm đích và khung thời gian trước khi bắt đầu lịch học.',
        },
        {
          name: 'Thiết lập nhịp luyện đề theo tuần',
          text: 'Mỗi tuần luyện nghe và đọc theo thời gian giới hạn, sau đó phân tích lỗi theo dạng câu hỏi.',
        },
        {
          name: 'Thu hẹp lỗ hổng bằng sổ lỗi',
          text: 'Ghi lại các lỗi ngữ pháp và từ vựng lặp lại để ôn lại có trọng tâm.',
        },
        {
          name: 'Mô phỏng bài thi đầy đủ định kỳ',
          text: 'Làm đề full test theo đúng thời gian thi để ổn định tốc độ và độ bền.',
        },
      ],
      faq: [
        {
          question: 'TOPIK II thường cần bao lâu để chuẩn bị?',
          answer: 'Phần lớn người học cần 3 đến 6 tháng với lịch luyện đề đều đặn mỗi tuần.',
        },
        {
          question: 'Nên ưu tiên tốc độ hay độ chính xác trước?',
          answer: 'Nên ưu tiên độ chính xác trước, rồi mới tăng tốc độ sau khi lỗi đã ổn định.',
        },
        {
          question: 'Bao lâu nên làm một đề mô phỏng full?',
          answer: 'Nên làm ít nhất 1 đề full mỗi 2 tuần và phân tích lỗi theo nhóm.',
        },
      ],
    },
    mn: {
      searchIntent: 'TOPIK бэлтгэл, TOPIK сурах төлөвлөгөө, TOPIK оноо ахиулах стратеги',
      howToSteps: [
        {
          name: 'Зорилтот түвшин ба оноогоо тодорхойл',
          text: 'TOPIK-ийн зорилтот түвшин, хүссэн оноо, хугацаагаа эхлээд тодорхой тогтоогоорой.',
        },
        {
          name: '7 хоногийн хугацаатай дасгалын хэмнэл үүсгэ',
          text: 'Долоо хоног бүр сонсгол, уншлагыг хугацаатай хийж, дараа нь төрлөөр нь алдаагаа задла.',
        },
        {
          name: 'Алдааны дэвтрээр сул талаа агшаа',
          text: 'Давтагддаг дүрэм, үгийн сангийн алдааг тэмдэглэж зорилтот давталт хий.',
        },
        {
          name: 'Бүтэн шалгалтын симуляци тогтмол хий',
          text: 'Жинхэнэ шалгалтын хугацаагаар бүтэн сорил өгч хурд ба тэсвэрээ тогтворжуул.',
        },
      ],
      faq: [
        {
          question: 'TOPIK II-д ер нь хэдий хугацаа шаардлагатай вэ?',
          answer: 'Ихэнх суралцагчид 3-6 сарын тогтмол бэлтгэлээр бодит ахиц гаргадаг.',
        },
        {
          question: 'Хурд уу, эсвэл зөв хариулт уу эхэлж сайжруулах вэ?',
          answer: 'Эхлээд зөв гүйцэтгэлээ тогтворжуулаад, дараа нь хурдаа нэмэх нь зөв.',
        },
        {
          question: 'Бүтэн mock test-ийг хэр давтамжтай хийх вэ?',
          answer: 'Дор хаяж 2 долоо хоногт нэг удаа хийж, дараа нь төрөл тус бүрээр дүгнэ.',
        },
      ],
    },
  },
  '/learn/korean-grammar': {
    zh: {
      searchIntent: '韩语语法学习路线, 韩语语法练习, 韩语语法对比',
      howToSteps: [
        {
          name: '按功能分组学习语法',
          text: '把语法按因果、转折、条件、意图等功能分组，建立清晰框架。',
        },
        {
          name: '成对对比相近语法',
          text: '对比容易混淆的语法点，并用最小对比例句巩固区别。',
        },
        {
          name: '从输入转向输出',
          text: '读完例句后立即造句并口头复述，强化真实表达能力。',
        },
        {
          name: '用错题循环复盘',
          text: '记录反复出错的语法点，按间隔复习持续回收。',
        },
      ],
      faq: [
        {
          question: '每周学多少语法点比较合适？',
          answer: '建议每周 3 到 5 个语法点，并配合高质量复习与输出练习。',
        },
        {
          question: '只背语法定义可以吗？',
          answer: '不够。必须在口语和写作场景中应用，才能形成稳定调用能力。',
        },
        {
          question: '总是混淆相近语法怎么办？',
          answer: '做并列对比表和最小对比例句，效果通常最好。',
        },
      ],
    },
    vi: {
      searchIntent: 'lộ trình ngữ pháp tiếng Hàn, luyện ngữ pháp tiếng Hàn, so sánh ngữ pháp',
      howToSteps: [
        {
          name: 'Nhóm ngữ pháp theo chức năng',
          text: 'Phân nhóm theo nguyên nhân, tương phản, điều kiện và ý định để dễ áp dụng.',
        },
        {
          name: 'So sánh cặp mẫu dễ nhầm',
          text: 'Đặt các mẫu gần nghĩa cạnh nhau và tạo câu đối chiếu tối giản.',
        },
        {
          name: 'Chuyển từ đọc sang tự tạo câu',
          text: 'Ngay sau khi học ví dụ, viết và nói câu của riêng bạn để tăng nhớ chủ động.',
        },
        {
          name: 'Ôn theo sổ lỗi lặp lại',
          text: 'Theo dõi nhóm lỗi ngữ pháp thường gặp và đưa vào chu kỳ ôn giãn cách.',
        },
      ],
      faq: [
        {
          question: 'Mỗi tuần nên học bao nhiêu điểm ngữ pháp?',
          answer: 'Khoảng 3 đến 5 điểm với ôn kỹ thường hiệu quả hơn học dàn trải.',
        },
        {
          question: 'Chỉ học định nghĩa ngữ pháp có đủ không?',
          answer: 'Không đủ. Cần luyện dùng trong nói và viết để gọi lại ổn định.',
        },
        {
          question: 'Làm sao bớt nhầm các mẫu ngữ pháp tương tự?',
          answer: 'Dùng bảng so sánh cặp mẫu và tự viết câu đối chiếu ngắn.',
        },
      ],
    },
    mn: {
      searchIntent: 'солонгос дүрэм сурах, солонгос хэлний дүрмийн дасгал, дүрэм харьцуулах',
      howToSteps: [
        {
          name: 'Дүрмийг чиг үүргээр нь бүлэглэ',
          text: 'Шалтгаан, эсрэгцүүлэл, нөхцөл, зорилго зэрэг үүргээр нь ангилж тогтвортой суурь үүсгэ.',
        },
        {
          name: 'Андуурагддаг дүрмийг хосоор нь харьцуул',
          text: 'Ойролцоо хэлбэрүүдийг зэрэгцүүлж, хамгийн бага ялгаатай жишээгээр баталгаажуул.',
        },
        {
          name: 'Уншсанаа шууд гаралт болго',
          text: 'Жишээ үзсэний дараа шууд өөрийн өгүүлбэр зохиож чангаар хэлж сур.',
        },
        {
          name: 'Алдааны дэвтрээр давталт хий',
          text: 'Давтагддаг дүрмийн алдааг тэмдэглэж, завсарлагатай давталтын циклд оруул.',
        },
      ],
      faq: [
        {
          question: '7 хоногт хэдэн дүрэм үзэх нь зөв бэ?',
          answer: '3-5 дүрмийг гүнзгий давтвал олон дүрмийг өнгөц харахаас илүү үр дүнтэй.',
        },
        {
          question: 'Дүрмийн тодорхойлолт цээжлэхэд хангалттай юу?',
          answer: 'Хангалтгүй. Яриа, бичлэгт идэвхтэй хэрэглэж байж бодитоор тогтдог.',
        },
        {
          question: 'Төстэй дүрмүүдийг байнга андуурах үед яах вэ?',
          answer: 'Зэрэгцүүлсэн хүснэгт гаргаж, ялгааг нь харуулсан богино жишээг давт.',
        },
      ],
    },
  },
  '/learn/korean-vocabulary': {
    zh: {
      searchIntent: '韩语词汇记忆, 韩语背单词, SRS 韩语复习',
      howToSteps: [
        {
          name: '优先高频词汇',
          text: '先覆盖你当前等级和考试场景中的高频词，再扩展低频词。',
        },
        {
          name: '建立多层记忆线索',
          text: '为每个词绑定读音、释义和语境例句，避免孤立记忆。',
        },
        {
          name: '启用主动回忆训练',
          text: '结合闪卡、听写和拼写模式，提高提取速度与准确率。',
        },
        {
          name: '高频回收薄弱词',
          text: '把容易遗忘词单独维护，提升复习频次直到稳定掌握。',
        },
      ],
      faq: [
        {
          question: '每天复习多少词比较合理？',
          answer: '建议先从 20 到 40 个高质量复习开始，再根据留存率调整。',
        },
        {
          question: '背单词要不要配例句？',
          answer: '要。例句能显著提高词义辨析和实际使用准确度。',
        },
        {
          question: '总是记不住同一批词怎么办？',
          answer: '提高这些词的复习频率，并绑定个人化例句更容易记牢。',
        },
      ],
    },
    vi: {
      searchIntent: 'ghi nhớ từ vựng tiếng Hàn, học từ vựng tiếng Hàn, SRS tiếng Hàn',
      howToSteps: [
        {
          name: 'Ưu tiên từ vựng tần suất cao',
          text: 'Bắt đầu từ các từ xuất hiện thường xuyên trong cấp độ và tài liệu bạn đang học.',
        },
        {
          name: 'Tạo lớp ghi nhớ theo ngữ cảnh',
          text: 'Gắn mỗi từ với phát âm, nghĩa và một câu ví dụ để tránh học rời rạc.',
        },
        {
          name: 'Kích hoạt luyện nhớ chủ động',
          text: 'Kết hợp flashcard, chính tả và đánh vần để tăng tốc độ truy xuất từ.',
        },
        {
          name: 'Ôn dày cho nhóm từ yếu',
          text: 'Tách riêng các từ hay quên và tăng tần suất ôn đến khi nhớ ổn định.',
        },
      ],
      faq: [
        {
          question: 'Mỗi ngày nên ôn bao nhiêu từ là hợp lý?',
          answer: 'Bắt đầu với 20 đến 40 lượt ôn chất lượng, rồi tăng dần theo tỷ lệ ghi nhớ.',
        },
        {
          question: 'Học từ có cần đi kèm câu ví dụ không?',
          answer: 'Có. Câu ví dụ giúp dùng từ chính xác hơn trong ngữ cảnh thật.',
        },
        {
          question: 'Nếu cứ quên cùng một nhóm từ thì làm sao?',
          answer: 'Tăng tần suất ôn nhóm đó và gắn với câu cá nhân để nhớ lâu hơn.',
        },
      ],
    },
    mn: {
      searchIntent: 'солонгос үг цээжлэх, солонгос үгийн сан, SRS солонгос хэл',
      howToSteps: [
        {
          name: 'Өндөр давтамжтай үгээ түрүүлж сур',
          text: 'Одоогийн түвшин, хэрэглэж буй материалд хамгийн их давтагддаг үгсээс эхэл.',
        },
        {
          name: 'Үгийг орчинтой нь холбож тогтоо',
          text: 'Үг бүрт дуудлага, утга, жишээ өгүүлбэр холбож санах холбоос үүсгэ.',
        },
        {
          name: 'Идэвхтэй санах дасгал хий',
          text: 'Флаш карт, диктант, үсэглэх горимыг хослуулж үг сэргээх хурдаа өсгө.',
        },
        {
          name: 'Мартагддаг үгийг өндөр давтамжаар давт',
          text: 'Сул үгсийн тусгай жагсаалт гаргаж тогтворжих хүртэл илүү ойр давтамжаар давт.',
        },
      ],
      faq: [
        {
          question: 'Өдөр бүр хэдэн үг давтвал зохимжтой вэ?',
          answer: '20-40 чанартай давталтаар эхэлж, тогтоц сайжрахад аажмаар нэмээрэй.',
        },
        {
          question: 'Үгийг жишээгүй цээжлэхэд болох уу?',
          answer: 'Болно, гэхдээ өгүүлбэрийн орчинтой сурах нь зөв хэрэглээг илүү бат болгодог.',
        },
        {
          question: 'Нэг үгсээ дахин дахин мартаад байвал яах вэ?',
          answer: 'Тэр бүлэг үгсийн давталтын давтамжийг өсгөж, хувийн жишээ өгүүлбэртэй холбож сур.',
        },
      ],
    },
  },
  '/learn/reading-practice': {
    zh: {
      searchIntent: '韩语阅读训练, 韩语阅读理解, TOPIK 阅读策略',
      howToSteps: [
        {
          name: '选择分级难度材料',
          text: '使用略高于当前水平的短文，保证挑战度与可持续性平衡。',
        },
        {
          name: '执行两遍阅读法',
          text: '第一遍抓主旨，第二遍标注词汇和语法并确认细节。',
        },
        {
          name: '做摘要和复述',
          text: '用自己的话写 3 到 5 句摘要，检验真实理解。',
        },
        {
          name: '回收高频句型结构',
          text: '把反复出现的句型集中复盘，提高阅读速度和稳定性。',
        },
      ],
      faq: [
        {
          question: '阅读时查词会不会影响效率？',
          answer: '第一遍尽量少查词，第二遍再集中处理，效率更高。',
        },
        {
          question: '怎样提升韩语阅读速度？',
          answer: '限时训练配合重复结构输入，是提升速度最稳妥的方法。',
        },
        {
          question: '是不是越难的文章进步越快？',
          answer: '并非如此。略高于当前水平的材料更利于长期坚持和提分。',
        },
      ],
    },
    vi: {
      searchIntent: 'luyện đọc tiếng Hàn, đọc hiểu tiếng Hàn, chiến lược đọc TOPIK',
      howToSteps: [
        {
          name: 'Chọn tài liệu đúng cấp độ',
          text: 'Dùng bài đọc khó hơn hiện tại một chút để vừa thử thách vừa duy trì đều đặn.',
        },
        {
          name: 'Đọc hai lượt có mục tiêu',
          text: 'Lượt 1 đọc nắm ý chính, lượt 2 mới chú thích từ và ngữ pháp chưa chắc.',
        },
        {
          name: 'Tóm tắt và diễn đạt lại',
          text: 'Viết tóm tắt ngắn bằng lời của bạn để kiểm tra độ hiểu thực tế.',
        },
        {
          name: 'Ôn lại cấu trúc xuất hiện nhiều',
          text: 'Tái sử dụng các mẫu câu lặp lại qua nhiều bài để tăng tốc độ đọc.',
        },
      ],
      faq: [
        {
          question: 'Vừa đọc vừa tra từ có hại không?',
          answer: 'Hãy hạn chế tra từ ở lượt 1, xử lý tập trung ở lượt 2 sẽ hiệu quả hơn.',
        },
        {
          question: 'Làm sao tăng tốc đọc tiếng Hàn?',
          answer: 'Đọc đoạn bấm giờ kết hợp lặp lại cấu trúc tương tự là cách ổn định nhất.',
        },
        {
          question: 'Đọc bài càng khó thì càng tiến bộ nhanh?',
          answer: 'Không hẳn. Tài liệu hơi cao hơn mức hiện tại thường bền vững hơn.',
        },
      ],
    },
    mn: {
      searchIntent: 'солонгос уншлагын дасгал, солонгос уншиж ойлгох, TOPIK уншлагын стратеги',
      howToSteps: [
        {
          name: 'Түвшиндээ тохирсон эх сонго',
          text: 'Одоогийн чадвараас арай өндөр богино эхээр тогтвортой уншлагын хэмнэл үүсгэ.',
        },
        {
          name: 'Хоёр үе шаттай унш',
          text: 'Эхний удаад гол санааг ав, хоёр дахь удаад үг ба дүрмээ тэмдэглэж утгаа баталгаажуул.',
        },
        {
          name: 'Товч дүгнэлт бичиж шалга',
          text: 'Өөрийн үгээр 3-5 өгүүлбэрийн дүгнэлт хийж бодитоор ойлгосноо шалга.',
        },
        {
          name: 'Давтагддаг бүтцээ тогтмол давт',
          text: 'Олон эх дээр давтагддаг хэлбэрүүдийг бөөнөөр нь давтсанаар хурд тогтвортой өснө.',
        },
      ],
      faq: [
        {
          question: 'Уншихдаа үг харах нь үр дүн муутай юу?',
          answer: 'Эхний уншилтад урсгалаа хадгалж, хоёр дахь уншилтад төвлөрч шалгавал сайн.',
        },
        {
          question: 'Уншлагын хурдыг яаж нэмэх вэ?',
          answer: 'Хугацаатай дасгал болон төстэй бүтцийн давталт хамгийн тогтвортой ахиц өгдөг.',
        },
        {
          question: 'Илүү хэцүү эх сонгох тусам хурдан ахих уу?',
          answer: 'Заавал биш. Түвшнээсээ арай өндөр материал урт хугацаанд илүү үр дүнтэй.',
        },
      ],
    },
  },
  '/learn/korean-pronunciation': {
    zh: {
      searchIntent: '韩语发音训练, 韩语跟读, 韩语口语纠音',
      howToSteps: [
        {
          name: '短音频高频跟读',
          text: '使用 10 到 20 秒音频片段，先模仿节奏再处理单音细节。',
        },
        {
          name: '录音并对比反馈',
          text: '定期录音并与原音对比节奏、清晰度和连读表现。',
        },
        {
          name: '优先纠正高影响错误',
          text: '先解决 받침、紧音与连音等影响理解度最大的发音问题。',
        },
        {
          name: '重复纠音闭环',
          text: '对同一素材循环纠正，直到错误模式显著下降。',
        },
      ],
      faq: [
        {
          question: '每天练发音多久比较有效？',
          answer: '每天 10 到 15 分钟的高质量训练通常足够有效。',
        },
        {
          question: '一定要学 IPA 才能练好发音吗？',
          answer: '不一定。跟读、录音和反馈循环对大多数学习者更关键。',
        },
        {
          question: '怎么判断发音是否在进步？',
          answer: '每周对比录音，观察节奏、清晰度与重复错误是否下降。',
        },
      ],
    },
    vi: {
      searchIntent: 'luyện phát âm tiếng Hàn, shadowing tiếng Hàn, sửa phát âm tiếng Hàn',
      howToSteps: [
        {
          name: 'Shadowing audio ngắn hằng ngày',
          text: 'Luyện đoạn 10 đến 20 giây, ưu tiên nhịp điệu trước rồi mới vào âm riêng lẻ.',
        },
        {
          name: 'Ghi âm và đối chiếu đầu ra',
          text: 'So sánh bản ghi của bạn với audio gốc về nhịp, độ rõ và nối âm.',
        },
        {
          name: 'Sửa trước lỗi tác động lớn',
          text: 'Ưu tiên 받침, phụ âm căng và quy tắc nối âm để tăng độ dễ hiểu nhanh.',
        },
        {
          name: 'Lặp lại vòng sửa lỗi',
          text: 'Quay lại cùng một đoạn audio cho đến khi mẫu lỗi giảm rõ rệt.',
        },
      ],
      faq: [
        {
          question: 'Mỗi ngày nên luyện phát âm bao lâu là đủ?',
          answer: 'Khoảng 10 đến 15 phút tập trung mỗi ngày thường đã rất hiệu quả.',
        },
        {
          question: 'Có bắt buộc phải học IPA không?',
          answer: 'Không bắt buộc, với đa số người học thì shadowing và phản hồi ghi âm quan trọng hơn.',
        },
        {
          question: 'Làm sao biết phát âm có tiến bộ?',
          answer: 'So sánh bản ghi theo tuần để xem nhịp, độ rõ và lỗi lặp có giảm hay không.',
        },
      ],
    },
    mn: {
      searchIntent: 'солонгос дуудлагын дасгал, shadowing солонгос, солонгос дуудлага засах',
      howToSteps: [
        {
          name: 'Богино аудиогоор тогтмол shadowing хий',
          text: '10-20 секундийн хэсэг дээр эхлээд хэмнэлийг, дараа нь авиа ялгааг дасгалла.',
        },
        {
          name: 'Бичлэгээ эх хувилбартай харьцуул',
          text: 'Өөрийн бичлэгийг эх аудиотой харьцуулж хэмнэл, тодрол, холбоос авиаг шалга.',
        },
        {
          name: 'Нөлөө өндөртэй алдаагаа түрүүлж зас',
          text: '받침, чанга гийгүүлэгч, холбоос дүрмийг эхэлж зассанаар ойлгомж хурдан өснө.',
        },
        {
          name: 'Нэг материалыг циклээр давт',
          text: 'Ижил аудио дээр засварын давталт хийж алдааны хэв маягаа бууруул.',
        },
      ],
      faq: [
        {
          question: 'Өдөрт хэр удаан дуудлага давтахад тохиромжтой вэ?',
          answer: 'Өдөр бүр 10-15 минут төвлөрсөн дасгал ихэнх тохиолдолд хангалттай.',
        },
        {
          question: 'IPA заавал сурах ёстой юу?',
          answer: 'Заавал биш. Ихэнх суралцагчид shadowing ба бичлэгийн санал хүсэлтийн циклээр илүү ахидаг.',
        },
        {
          question: 'Дуудлага сайжирч байгаа эсэхээ яаж мэдэх вэ?',
          answer: '7 хоног бүрийн бичлэгээ харьцуулж, хэмнэл, тодрол, давтагддаг алдаа буурч буйг шалга.',
        },
      ],
    },
  },
  '/learn/topik-writing': {
    zh: {
      searchIntent: 'TOPIK 写作策略, TOPIK 54题, 韩语作文提分',
      howToSteps: [
        {
          name: '准备可复用写作模板',
          text: '按题型准备开头、论证和结尾模板，降低临场组织负担。',
        },
        {
          name: '先列提纲再动笔',
          text: '用 2 到 3 分钟规划论点顺序，再开始完整写作。',
        },
        {
          name: '优先稳准表达',
          text: '控制句式复杂度，优先保证语法与句尾一致性。',
        },
        {
          name: '使用终稿检查清单',
          text: '最后集中检查连接词、空格、拼写和高频错误点。',
        },
      ],
      faq: [
        {
          question: '每句都要用高级语法才会高分吗？',
          answer: '不需要。稳定准确通常比冒险复杂表达更容易得高分。',
        },
        {
          question: 'TOPIK 写作最快怎么提升？',
          answer: '限时题目训练加结构化反馈，是最有效的提分路径。',
        },
        {
          question: '写作前该留多少时间列提纲？',
          answer: '建议 2 到 3 分钟，先确保结构清晰再落笔。',
        },
      ],
    },
    vi: {
      searchIntent: 'chiến lược viết TOPIK, TOPIK câu 54, nâng điểm viết tiếng Hàn',
      howToSteps: [
        {
          name: 'Chuẩn bị khung viết có thể tái sử dụng',
          text: 'Tạo mẫu mở bài, thân bài và kết bài theo từng dạng đề để giảm áp lực khi thi.',
        },
        {
          name: 'Lập dàn ý trước khi viết',
          text: 'Dành 2 đến 3 phút sắp xếp luận điểm trước khi viết câu hoàn chỉnh.',
        },
        {
          name: 'Ưu tiên rõ ràng và chính xác',
          text: 'Giữ cấu trúc ổn định và tránh quá phức tạp để giảm lỗi ngữ pháp.',
        },
        {
          name: 'Dùng checklist ở cuối bài',
          text: 'Kiểm tra liên từ, khoảng cách, chính tả và lỗi lặp trước khi nộp.',
        },
      ],
      faq: [
        {
          question: 'Có cần dùng ngữ pháp cao cấp trong mọi câu không?',
          answer: 'Không cần. Viết chắc và đúng thường cho điểm tốt hơn viết phức tạp nhưng sai.',
        },
        {
          question: 'Cách nhanh nhất để cải thiện viết TOPIK là gì?',
          answer: 'Luyện đề có bấm giờ và nhận phản hồi có cấu trúc theo lỗi lặp lại.',
        },
        {
          question: 'Nên dành bao nhiêu thời gian để lập dàn ý?',
          answer: 'Khoảng 2 đến 3 phút là phù hợp để đảm bảo mạch lập luận rõ ràng.',
        },
      ],
    },
    mn: {
      searchIntent: 'TOPIK бичгийн стратеги, TOPIK 54 даалгавар, солонгос эссе оноо',
      howToSteps: [
        {
          name: 'Дахин ашиглах бичгийн загвар бэлд',
          text: 'Асуултын төрлөөр оршил, үндэслэл, дүгнэлтийн загвар урьдчилан бэлдэж ачааллаа бууруул.',
        },
        {
          name: 'Бичихээс өмнө ноорог гарга',
          text: '2-3 минут зарцуулж гол санааны дарааллыг тогтоогоод дараа нь бүрэн бич.',
        },
        {
          name: 'Тодорхой, зөв бичихийг тэргүүнд тавь',
          text: 'Хэт төвөгтэй бүтэц хэрэглэхээс илүү тогтвортой, зөв өгүүлбэрт төвлөр.',
        },
        {
          name: 'Төгсгөлийн checklist ашигла',
          text: 'Өгүүлэх холбоос, зай, зөв бичиг, давтагддаг алдаагаа эцэст нь шалга.',
        },
      ],
      faq: [
        {
          question: 'Өгүүлбэр бүрт ахисан дүрэм хэрэглэх шаардлагатай юу?',
          answer: 'Үгүй. Эрсдэлтэй төвөгтэй хэлбэрээс илүү зөв, тогтвортой бүтэц өндөр оноо авдаг.',
        },
        {
          question: 'TOPIK бичгийг хамгийн хурдан яаж сайжруулах вэ?',
          answer: 'Хугацаатай бичлэг ба давтагддаг алдаанд суурилсан бүтэцтэй санал нь хамгийн үр дүнтэй.',
        },
        {
          question: 'Ноорогт хэдий хугацаа үлдээх хэрэгтэй вэ?',
          answer: 'Ойролцоогоор 2-3 минут бол логик урсгалаа тогтооход хангалттай.',
        },
      ],
    },
  },
};

const SCAFFOLD_LABELS = {
  default: {
    home: 'Home',
    guideHub: 'Korean Learning Guides',
    startWithGuides: 'Start with Korean learning guides',
    startWithGuidesDescription:
      'Explore practical TOPIK, vocabulary, grammar, pronunciation, and writing strategies.',
    browseAllGuides: 'Browse All Guides',
    guideIndex: 'Guide index',
    startLearningFree: 'Start Learning Free',
    howToUseGuide: 'How to use this guide',
    relatedGuides: 'Related guides',
    faq: 'FAQ',
    applyGuide: 'Apply This Guide in DuHan',
  },
  zh: {
    home: '首页',
    guideHub: '韩语学习指南',
    startWithGuides: '从实用韩语指南开始',
    startWithGuidesDescription:
      '系统学习 TOPIK、词汇、语法、发音和写作策略，快速建立学习路线。',
    browseAllGuides: '查看全部指南',
    guideIndex: '指南目录',
    startLearningFree: '免费开始学习',
    howToUseGuide: '如何使用本指南',
    relatedGuides: '相关指南',
    faq: '常见问题',
    applyGuide: '在 DuHan 中开始练习',
  },
  vi: {
    home: 'Trang chủ',
    guideHub: 'Hướng dẫn học tiếng Hàn',
    startWithGuides: 'Bắt đầu với hướng dẫn học tiếng Hàn',
    startWithGuidesDescription:
      'Khám phá lộ trình thực chiến cho TOPIK, từ vựng, ngữ pháp, phát âm và viết.',
    browseAllGuides: 'Xem tất cả hướng dẫn',
    guideIndex: 'Mục lục hướng dẫn',
    startLearningFree: 'Bắt đầu miễn phí',
    howToUseGuide: 'Cách sử dụng hướng dẫn này',
    relatedGuides: 'Hướng dẫn liên quan',
    faq: 'Câu hỏi thường gặp',
    applyGuide: 'Áp dụng hướng dẫn trong DuHan',
  },
  mn: {
    home: 'Нүүр',
    guideHub: 'Солонгос хэлний гарын авлага',
    startWithGuides: 'Практик гарын авлагаас эхэл',
    startWithGuidesDescription:
      'TOPIK, үгийн сан, дүрэм, дуудлага, бичгийн стратегийг хэрэгжүүлэх алхмаар суралцаарай.',
    browseAllGuides: 'Бүх гарын авлага үзэх',
    guideIndex: 'Гарын авлагын жагсаалт',
    startLearningFree: 'Үнэгүй эхлэх',
    howToUseGuide: 'Энэ гарын авлагыг хэрхэн ашиглах вэ',
    relatedGuides: 'Холбоотой гарын авлага',
    faq: 'Түгээмэл асуулт',
    applyGuide: 'DuHan дээр хэрэгжүүлж эхлэх',
  },
};

const SCHEMA_LABELS = {
  default: {
    featuredGuides: 'Featured Korean Learning Guides',
    guideHubList: 'Korean Learning Guides',
    relatedGuides: 'Related Korean Learning Guides',
  },
  zh: {
    featuredGuides: '精选韩语学习指南',
    guideHubList: '韩语学习指南',
    relatedGuides: '相关韩语学习指南',
  },
  vi: {
    featuredGuides: 'Hướng dẫn học tiếng Hàn nổi bật',
    guideHubList: 'Hướng dẫn học tiếng Hàn',
    relatedGuides: 'Hướng dẫn học tiếng Hàn liên quan',
  },
  mn: {
    featuredGuides: 'Онцлох солонгос сурах гарын авлага',
    guideHubList: 'Солонгос хэлний гарын авлага',
    relatedGuides: 'Холбоотой солонгос сурах гарын авлага',
  },
};

function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function toAbsoluteUrl(path) {
  return `${SITE_URL}${path}`;
}

function getLanguageFromPath(path) {
  return extractLanguageFromPath(path) || DEFAULT_LANGUAGE;
}

const OG_LOCALE_MAP = {
  en: 'en_US',
  zh: 'zh_CN',
  vi: 'vi_VN',
  mn: 'mn_MN',
};

function toOgLocale(language) {
  return OG_LOCALE_MAP[language] || OG_LOCALE_MAP.en;
}

function getIndexLanguages(route) {
  if (!Array.isArray(route?.indexLanguages) || route.indexLanguages.length === 0) {
    return ['en', 'zh', 'vi', 'mn'];
  }
  return route.indexLanguages;
}

function resolveGuideLanguage(guideRoute, preferredLang) {
  const languages = getIndexLanguages(guideRoute);
  return languages.includes(preferredLang)
    ? preferredLang
    : languages.includes(DEFAULT_LANGUAGE)
      ? DEFAULT_LANGUAGE
      : languages[0];
}

function getLocalizedGuideMeta(guideRoute, preferredLang) {
  const resolvedLanguage = resolveGuideLanguage(guideRoute, preferredLang);
  const localizedMeta =
    resolvedLanguage === DEFAULT_LANGUAGE ? null : guideRoute.metaByLang?.[resolvedLanguage];
  return localizedMeta ? { ...guideRoute.meta, ...localizedMeta } : guideRoute.meta;
}

function getLocalizedGuideUrl(guideRoute, preferredLang) {
  const resolvedLanguage = resolveGuideLanguage(guideRoute, preferredLang);
  return toAbsoluteUrl(withLang(resolvedLanguage, guideRoute.path));
}

function getLocalizedGuidePath(guideRoute, preferredLang) {
  const resolvedLanguage = resolveGuideLanguage(guideRoute, preferredLang);
  return withLang(resolvedLanguage, guideRoute.path);
}

function getGuideSeoTemplate(basePath, fallbackDescription, language = DEFAULT_LANGUAGE) {
  const fallbackText = String(fallbackDescription || '').trim();
  const template = GUIDE_SEO_TEMPLATES[basePath];

  if (template) {
    const localized = GUIDE_SEO_TEMPLATES_LOCALIZED[basePath]?.[language];
    if (!localized) return template;
    return {
      ...template,
      ...localized,
      howToSteps: localized.howToSteps || template.howToSteps,
      faq: localized.faq || template.faq,
      relatedPaths: localized.relatedPaths || template.relatedPaths,
    };
  }

  return {
    searchIntent: fallbackText || 'Korean learning guide',
    howToSteps: [
      { name: 'Understand this guide', text: fallbackText || 'Review the guide overview and goal.' },
      { name: 'Practice in focused blocks', text: 'Apply the guide with short, repeatable daily sessions.' },
      { name: 'Track mistakes and adjust', text: 'Use an error log to refine weak areas each week.' },
    ],
    faq: [
      {
        question: 'How often should I use this guide?',
        answer: 'Use it in at least three focused sessions per week to build stable retention.',
      },
    ],
    relatedPaths: LEARN_GUIDE_ROUTES.slice(0, 3).map((route) => route.path),
  };
}

function getScaffoldLabels(language) {
  if (language === 'zh') return SCAFFOLD_LABELS.zh;
  if (language === 'vi') return SCAFFOLD_LABELS.vi;
  if (language === 'mn') return SCAFFOLD_LABELS.mn;
  return SCAFFOLD_LABELS.default;
}

function getSchemaLabels(language) {
  if (language === 'zh') return SCHEMA_LABELS.zh;
  if (language === 'vi') return SCHEMA_LABELS.vi;
  if (language === 'mn') return SCHEMA_LABELS.mn;
  return SCHEMA_LABELS.default;
}

function createRouteJsonLd(route) {
  const canonicalUrl = toAbsoluteUrl(route.canonicalPath);
  const canonicalLanguage = getLanguageFromPath(route.canonicalPath);
  const schemaLabels = getSchemaLabels(canonicalLanguage);

  if (route.basePath === '/') {
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          name: 'DuHan',
          url: SITE_URL,
          logo: `${SITE_URL}/logo.png`,
        },
        {
          '@type': 'WebSite',
          name: 'DuHan Korean Learning',
          url: SITE_URL,
          inLanguage: canonicalLanguage,
          potentialAction: {
            '@type': 'SearchAction',
            target: {
              '@type': 'EntryPoint',
              urlTemplate: `${SITE_URL}/${canonicalLanguage}/learn?q={search_term_string}`,
            },
            'query-input': 'required name=search_term_string',
          },
        },
        {
          '@type': 'ItemList',
          name: schemaLabels.featuredGuides,
          itemListElement: LEARN_GUIDE_ROUTES.slice(0, 3).map((guideRoute, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: getLocalizedGuideMeta(guideRoute, route.lang).title,
            url: getLocalizedGuideUrl(guideRoute, route.lang),
          })),
        },
      ],
    };
  }

  if (route.basePath === '/learn') {
    const guides = LEARN_GUIDE_ROUTES.map((guideRoute, index) => ({
      position: index + 1,
      name: getLocalizedGuideMeta(guideRoute, route.lang).title,
      url: getLocalizedGuideUrl(guideRoute, route.lang),
    }));

    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CollectionPage',
          name: route.meta.title,
          description: route.meta.description,
          url: canonicalUrl,
          inLanguage: canonicalLanguage,
          hasPart: guides.map((guide) => ({
            '@type': 'Article',
            headline: guide.name,
            url: guide.url,
          })),
        },
        {
          '@type': 'ItemList',
          name: schemaLabels.guideHubList,
          itemListElement: guides.map((guide) => ({
            '@type': 'ListItem',
            position: guide.position,
            name: guide.name,
            url: guide.url,
          })),
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: toAbsoluteUrl(withLang(canonicalLanguage, '/')),
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: route.meta.title,
              item: canonicalUrl,
            },
          ],
        },
      ],
    };
  }

  if (route.basePath.startsWith('/learn/')) {
    const template = getGuideSeoTemplate(route.basePath, route.meta.description, canonicalLanguage);
    const relatedGuides = template.relatedPaths
      .map((path) => LEARN_GUIDE_ROUTE_MAP.get(path))
      .filter((item) => item && item.path !== route.basePath);

    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Article',
          headline: route.meta.title,
          description: route.meta.description,
          inLanguage: canonicalLanguage,
          datePublished: route.publishedAt,
          dateModified: route.updatedAt || route.publishedAt,
          mainEntityOfPage: canonicalUrl,
          author: { '@type': 'Organization', name: 'DuHan' },
          publisher: { '@type': 'Organization', name: 'DuHan', url: SITE_URL },
        },
        {
          '@type': 'HowTo',
          name: route.meta.title,
          description: route.meta.description,
          inLanguage: canonicalLanguage,
          totalTime: 'P4W',
          step: template.howToSteps.map((step, index) => ({
            '@type': 'HowToStep',
            position: index + 1,
            name: step.name,
            text: step.text,
            url: canonicalUrl,
          })),
        },
        {
          '@type': 'Course',
          name: route.meta.title,
          description: `${route.meta.description} Focus: ${template.searchIntent}.`,
          provider: {
            '@type': 'Organization',
            name: 'DuHan',
            sameAs: SITE_URL,
          },
          hasCourseInstance: {
            '@type': 'CourseInstance',
            courseMode: 'online',
            url: canonicalUrl,
          },
        },
        {
          '@type': 'FAQPage',
          mainEntity: template.faq.map((item) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: item.answer,
            },
          })),
        },
        {
          '@type': 'ItemList',
          name: schemaLabels.relatedGuides,
          itemListElement: relatedGuides.map((guide, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: getLocalizedGuideMeta(guide, route.lang).title,
            url: getLocalizedGuideUrl(guide, route.lang),
          })),
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: 'Home',
              item: toAbsoluteUrl(withLang(canonicalLanguage, '/')),
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: schemaLabels.guideHubList,
              item: toAbsoluteUrl(withLang(canonicalLanguage, '/learn')),
            },
            {
              '@type': 'ListItem',
              position: 3,
              name: route.meta.title,
              item: canonicalUrl,
            },
          ],
        },
      ],
    };
  }

  return null;
}

function serializeJsonLd(data) {
  return JSON.stringify(data).replace(/<\/script/gi, '<\\/script');
}

function buildSeoScaffold(route, resolvedMeta) {
  const safeTitle = escapeHtml(resolvedMeta.title);
  const safeDescription = escapeHtml(resolvedMeta.description);
  const labels = getScaffoldLabels(route.lang);
  const guideLinks = LEARN_GUIDE_ROUTES.slice(0, 6).map((guideRoute) => {
    const linkPath = getLocalizedGuidePath(guideRoute, route.lang);
    const label = escapeHtml(getLocalizedGuideMeta(guideRoute, route.lang).title);
    return `<li><a href="${linkPath}" style="color:#1d4ed8;text-decoration:none;font-weight:600;">${label}</a></li>`;
  });

  if (route.basePath === '/') {
    return `<div id="root">
    <main style="max-width: 920px; margin: 0 auto; padding: 48px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6;">
      <header>
        <h1 style="margin: 0 0 16px; font-size: 2rem; line-height: 1.25;">${safeTitle}</h1>
        <p style="margin: 0; color: #475569;">${safeDescription}</p>
      </header>
      <section style="margin-top: 28px;">
        <h2 style="font-size:1.25rem; margin:0 0 10px;">${escapeHtml(labels.startWithGuides)}</h2>
        <p style="margin:0 0 12px; color:#334155;">${escapeHtml(labels.startWithGuidesDescription)}</p>
        <ul style="margin:0; padding-left:20px; display:grid; gap:8px;">
          ${guideLinks.join('\n')}
        </ul>
      </section>
      <section style="margin-top: 28px;">
        <a href="${withLang(route.lang, '/learn')}" style="display:inline-block;background:#111827;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none;font-weight:700;">${escapeHtml(labels.browseAllGuides)}</a>
      </section>
    </main>
  </div>`;
  }

  if (route.basePath === '/learn') {
    return `<div id="root">
    <main style="max-width: 920px; margin: 0 auto; padding: 48px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6;">
      <header>
        <h1 style="margin: 0 0 16px; font-size: 2rem; line-height: 1.25;">${safeTitle}</h1>
        <p style="margin: 0; color: #475569;">${safeDescription}</p>
      </header>
      <section style="margin-top: 24px;">
        <h2 style="font-size:1.25rem; margin:0 0 10px;">${escapeHtml(labels.guideIndex)}</h2>
        <ul style="margin:0; padding-left:20px; display:grid; gap:8px;">
          ${guideLinks.join('\n')}
        </ul>
      </section>
      <section style="margin-top: 28px;">
        <a href="${withLang(route.lang, '/register')}" style="display:inline-block;background:#111827;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none;font-weight:700;">${escapeHtml(labels.startLearningFree)}</a>
      </section>
    </main>
  </div>`;
  }

  if (route.basePath.startsWith('/learn/')) {
    const template = getGuideSeoTemplate(route.basePath, resolvedMeta.description, route.lang);
    const related = template.relatedPaths
      .map((path) => LEARN_GUIDE_ROUTE_MAP.get(path))
      .filter((guideRoute) => guideRoute && guideRoute.path !== route.basePath)
      .slice(0, 3)
      .map((guideRoute) => {
        const linkPath = getLocalizedGuidePath(guideRoute, route.lang);
        const localizedMeta = getLocalizedGuideMeta(guideRoute, route.lang);
        const label = escapeHtml(localizedMeta.title);
        const summary = escapeHtml(localizedMeta.description);
        return `<li style="margin-bottom:10px;"><a href="${linkPath}" style="color:#1d4ed8;text-decoration:none;font-weight:700;">${label}</a><div style="color:#64748b;font-size:0.92rem;">${summary}</div></li>`;
      });
    const microSteps = template.howToSteps.map((step) => (
      `<li><strong>${escapeHtml(step.name)}:</strong> ${escapeHtml(step.text)}</li>`
    ));
    const faqRows = template.faq
      .slice(0, 2)
      .map((item) => (
        `<details style="padding:10px 12px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;">
          <summary style="font-weight:700;cursor:pointer;">${escapeHtml(item.question)}</summary>
          <p style="margin:8px 0 0;color:#475569;">${escapeHtml(item.answer)}</p>
        </details>`
      ));

    return `<div id="root">
    <main style="max-width: 920px; margin: 0 auto; padding: 48px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6;">
      <nav style="font-size:0.88rem; margin-bottom:12px; color:#64748b;">
        <a href="${withLang(route.lang, '/')}" style="color:#64748b;text-decoration:none;">${escapeHtml(labels.home)}</a> / 
        <a href="${withLang(route.lang, '/learn')}" style="color:#64748b;text-decoration:none;">${escapeHtml(labels.guideHub)}</a>
      </nav>
      <header>
        <h1 style="margin: 0 0 16px; font-size: 2rem; line-height: 1.25;">${safeTitle}</h1>
        <p style="margin: 0; color: #475569;">${safeDescription}</p>
      </header>
      <section style="margin-top:24px;">
        <h2 style="font-size:1.25rem; margin:0 0 10px;">${escapeHtml(labels.howToUseGuide)}</h2>
        <ol style="margin:0; padding-left:20px; display:grid; gap:8px;">
          ${microSteps.join('\n')}
        </ol>
      </section>
      <section style="margin-top:24px;">
        <h2 style="font-size:1.25rem; margin:0 0 10px;">${escapeHtml(labels.relatedGuides)}</h2>
        <ul style="margin:0; padding-left:20px;">
          ${related.join('\n')}
        </ul>
      </section>
      <section style="margin-top:24px;">
        <h2 style="font-size:1.25rem; margin:0 0 10px;">${escapeHtml(labels.faq)}</h2>
        <div style="display:grid; gap:10px;">
          ${faqRows.join('\n')}
        </div>
      </section>
      <section style="margin-top: 28px;">
        <a href="${withLang(route.lang, '/register')}" style="display:inline-block;background:#111827;color:#fff;padding:10px 14px;border-radius:8px;text-decoration:none;font-weight:700;">${escapeHtml(labels.applyGuide)}</a>
      </section>
    </main>
  </div>`;
  }

  return `<div id="root">
    <main style="max-width: 860px; margin: 0 auto; padding: 48px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6;">
      <header>
        <h1 style="margin: 0 0 16px; font-size: 2rem; line-height: 1.25;">${safeTitle}</h1>
        <p style="margin: 0; color: #475569;">${safeDescription}</p>
      </header>
    </main>
  </div>`;
}

function withHtmlLang(html, lang) {
  if (/<html\b[^>]*\blang=/.test(html)) {
    return html.replace(/(<html\b[^>]*\blang=["'])[^"']*(["'][^>]*>)/i, `$1${lang}$2`);
  }
  return html.replace(/<html\b([^>]*)>/i, `<html lang="${lang}"$1>`);
}

function buildHreflangLinks(route) {
  const hreflangLanguages =
    Array.isArray(route.hreflangLanguages) && route.hreflangLanguages.length > 0
      ? route.hreflangLanguages
      : [DEFAULT_LANGUAGE];
  const alternates = hreflangLanguages.map((lng) => {
    const href = `${SITE_URL}/${lng}${route.basePath === '/' ? '' : route.basePath}`;
    return `<link rel="alternate" hreflang="${lng}" href="${href}" />`;
  }).join('\n');
  const xDefaultLanguage = hreflangLanguages.includes(DEFAULT_LANGUAGE)
    ? DEFAULT_LANGUAGE
    : hreflangLanguages[0];
  const xDefaultHref = `${SITE_URL}/${xDefaultLanguage}${route.basePath === '/' ? '' : route.basePath}`;
  return `${alternates}\n<link rel="alternate" hreflang="x-default" href="${xDefaultHref}" />`;
}

function ensureStaticBodyContent(html, route, resolvedMeta) {
  const hasMeaningfulContent = /<(main|article|h1|h2)\b/i.test(html);
  if (hasMeaningfulContent) return html;

  const scaffold = buildSeoScaffold(route, resolvedMeta);

  return html.replace(/<body([^>]*)>[\s\S]*<\/body>/i, `<body$1>\n  ${scaffold}\n</body>`);
}

function normalizeSeoHtml(html, route) {
  const { title, description, keywords } = route.meta;
  const canonicalUrl = `${SITE_URL}${route.canonicalPath}`;
  const resolvedOgImage = route.meta.ogImage || '/logo.png';
  const fullOgImage = resolvedOgImage.startsWith('http')
    ? resolvedOgImage
    : `${SITE_URL}${resolvedOgImage}`;
  const hreflangLinks = buildHreflangLinks(route);
  const routeJsonLd = createRouteJsonLd(route);
  const isArticleRoute = route.basePath.startsWith('/learn/') && route.basePath !== '/learn';
  const ogType = isArticleRoute ? 'article' : 'website';
  const articlePublishedTime = isArticleRoute && route.publishedAt ? `${route.publishedAt}T00:00:00Z` : '';
  const articleModifiedTime = isArticleRoute && (route.updatedAt || route.publishedAt)
    ? `${route.updatedAt || route.publishedAt}T00:00:00Z`
    : '';
  const ogLocale = toOgLocale(route.lang);
  const ogLocaleAlternates =
    (Array.isArray(route.hreflangLanguages) ? route.hreflangLanguages : [])
      .filter((language) => language !== route.lang)
      .map((language) => `<meta property="og:locale:alternate" content="${toOgLocale(language)}" />`)
      .join('\n');

  html = withHtmlLang(html, route.lang);

  html = html.replace(
    /<title>[^<]*<\/title>/i,
    `<title>${escapeHtml(title)}</title>`
  );

  html = html.replace(
    /<meta\s+name="(?:description|keywords|language|robots)"[^>]*>\s*/gi,
    ''
  );
  html = html.replace(
    /<meta\s+property="(?:og:type|og:url|og:title|og:description|og:image|og:site_name|og:locale|og:locale:alternate|og:updated_time|article:published_time|article:modified_time|twitter:url|twitter:title|twitter:description|twitter:image)"[^>]*>\s*/gi,
    ''
  );

  html = html.replace(/<link\b[^>]*\brel=["']alternate["'][^>]*>/gi, '');
  html = html.replace(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi, '');
  html = html.replace(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>\s*/gi,
    ''
  );
  const seoMetaBlock = [
    `<meta name="description" content="${escapeHtml(description)}" />`,
    keywords?.trim() ? `<meta name="keywords" content="${escapeHtml(keywords)}" />` : '',
    `<meta name="language" content="${route.lang}" />`,
    route.noIndex
      ? '<meta name="robots" content="noindex, follow" />'
      : '<meta name="robots" content="index, follow" />',
    `<meta property="og:type" content="${ogType}" />`,
    `<meta property="og:url" content="${canonicalUrl}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:image" content="${fullOgImage}" />`,
    '<meta property="og:site_name" content="DuHan" />',
    `<meta property="og:locale" content="${ogLocale}" />`,
    ogLocaleAlternates,
    articlePublishedTime
      ? `<meta property="article:published_time" content="${articlePublishedTime}" />`
      : '',
    articleModifiedTime
      ? `<meta property="article:modified_time" content="${articleModifiedTime}" />`
      : '',
    articleModifiedTime ? `<meta property="og:updated_time" content="${articleModifiedTime}" />` : '',
    `<meta property="twitter:url" content="${canonicalUrl}" />`,
    `<meta property="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta property="twitter:description" content="${escapeHtml(description)}" />`,
    `<meta property="twitter:image" content="${fullOgImage}" />`,
  ]
    .filter(Boolean)
    .join('\n');

  html = html.replace(
    /<\/head>/i,
    `${seoMetaBlock}\n<link rel="canonical" href="${canonicalUrl}" />\n${hreflangLinks}${
      routeJsonLd
        ? `\n<script type="application/ld+json">${serializeJsonLd(routeJsonLd)}</script>`
        : ''
    }\n</head>`
  );

  html = ensureStaticBodyContent(html, route, route.meta);

  if (!/^<!doctype html>/i.test(html.trimStart())) {
    html = `<!DOCTYPE html>\n${html}`;
  }

  return html;
}

function getMimeType(filePath) {
  const ext = extname(filePath).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js' || ext === '.mjs') return 'application/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.woff') return 'font/woff';
  if (ext === '.woff2') return 'font/woff2';
  if (ext === '.ico') return 'image/x-icon';
  if (ext === '.txt') return 'text/plain; charset=utf-8';
  if (ext === '.xml') return 'application/xml; charset=utf-8';
  if (ext === '.webmanifest') return 'application/manifest+json; charset=utf-8';
  return 'application/octet-stream';
}

function resolveDistPath(urlPathname) {
  const safePath = normalize(decodeURIComponent(urlPathname.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  const candidate = join(DIST_DIR, safePath);

  if (existsSync(candidate)) {
    try {
      if (statSync(candidate).isDirectory()) {
        const idx = join(candidate, 'index.html');
        if (existsSync(idx)) return idx;
      } else {
        return candidate;
      }
    } catch {
      return null;
    }
  }

  const withIndex = join(DIST_DIR, safePath, 'index.html');
  if (existsSync(withIndex)) return withIndex;

  return null;
}

function startStaticServer() {
  const fallbackHtml = readFileSync(join(DIST_DIR, 'index.html'));
  const server = createServer((req, res) => {
    const url = new URL(req.url || '/', `http://${HOST}`);
    const filePath = resolveDistPath(url.pathname);

    if (filePath && existsSync(filePath)) {
      const body = readFileSync(filePath);
      res.statusCode = 200;
      res.setHeader('Content-Type', getMimeType(filePath));
      res.end(body);
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(fallbackHtml);
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, HOST, () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        reject(new Error('Failed to resolve local prerender server address'));
        return;
      }
      resolve({ server, origin: `http://${HOST}:${addr.port}` });
    });
  });
}

async function tryLaunchBrowser() {
  try {
    const playwright = await import('@playwright/test');
    return await playwright.chromium.launch({ headless: true });
  } catch (error) {
    console.warn(`⚠️  Playwright unavailable, falling back to static scaffold mode.\n   ${error.message}`);
    return null;
  }
}

async function renderRouteHtml(page, origin, route, baseHtml) {
  if (!page) return baseHtml;

  const url = `${origin}${route.path}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: RENDER_WAIT_MS });
  await page
    .waitForFunction(
      () =>
        !!globalThis.document?.querySelector('#root') &&
        globalThis.document.querySelector('#root').childElementCount > 0,
      null,
      { timeout: 6000 }
    )
    .catch(() => null);

  const html = await page.content();
  return html || baseHtml;
}

async function preRenderRoutes() {
  console.log('🚀 Starting pre-rendering for public routes...\n');

  const indexPath = join(DIST_DIR, 'index.html');

  if (!existsSync(indexPath)) {
    console.error('❌ Error: dist/index.html not found. Please run build first.');
    process.exit(1);
  }

  const baseHtml = readFileSync(indexPath, 'utf-8');
  const routesToRender = buildLocalizedPublicRoutes({ includeNoIndex: true });

  const { server, origin } = await startStaticServer();
  const browser = await tryLaunchBrowser();
  const context = browser ? await browser.newContext() : null;
  const page = context ? await context.newPage() : null;

  let successCount = 0;

  for (const route of routesToRender) {
    try {
      console.log(`📄 Pre-rendering: ${route.path}`);
      const renderedHtml = await renderRouteHtml(page, origin, route, baseHtml);
      const html = normalizeSeoHtml(renderedHtml, route);

      // Determine output path
      const routePath = route.path.slice(1); // Remove leading slash
      const routeDir = join(DIST_DIR, routePath);
      mkdirSync(routeDir, { recursive: true });
      const outputPath = join(routeDir, 'index.html');

      // Write the pre-rendered HTML
      writeFileSync(outputPath, html, 'utf-8');
      console.log(`   ✅ Generated: ${outputPath.replace(DIST_DIR, 'dist')}\n`);
      successCount++;
    } catch (error) {
      console.error(`   ❌ Error rendering ${route.path}:`, error.message);
      console.error('');
    }
  }

  if (page) await page.close();
  if (context) await context.close();
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));

  console.log('\n📊 Pre-rendering Summary:');
  console.log(`   ✅ Successfully pre-rendered: ${successCount}/${routesToRender.length} routes`);
  console.log('\n✨ SSG pre-rendering complete!');
}

// Run pre-rendering
preRenderRoutes().catch(error => {
  console.error('❌ Pre-rendering failed:', error);
  process.exit(1);
});
