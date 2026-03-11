import type { Language } from '../types';

export type LearnGuideKey =
  | 'topik-guide'
  | 'korean-grammar'
  | 'korean-vocabulary'
  | 'reading-practice'
  | 'korean-pronunciation'
  | 'topik-writing';

export interface LearnGuideSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface LearnGuideFaq {
  question: string;
  answer: string;
}

export interface LearnGuideContent {
  title: string;
  description: string;
  intro: string;
  sections: LearnGuideSection[];
  faqs: LearnGuideFaq[];
  ctaLabel: string;
  ctaTo: string;
}

export interface LearnGuideMeta {
  key: LearnGuideKey;
  path: `/learn/${LearnGuideKey}`;
  publishedAt: string;
  updatedAt: string;
  relatedGuides: LearnGuideKey[];
}

interface LearnGuideDefinition {
  key: LearnGuideKey;
  path: `/learn/${LearnGuideKey}`;
  publishedAt: string;
  updatedAt: string;
  relatedGuides: LearnGuideKey[];
  locales: {
    en: LearnGuideContent;
    zh?: LearnGuideContent;
    vi?: LearnGuideContent;
    mn?: LearnGuideContent;
  };
}

interface LearnHubLocale {
  title: string;
  description: string;
  cardPrefix: string;
  ctaLabel: string;
}

const LEARN_HUB_LOCALES: Record<'en' | 'zh' | 'vi' | 'mn', LearnHubLocale> = {
  en: {
    title: 'Korean Learning Guides',
    description:
      'Start from focused guides for TOPIK, grammar, vocabulary, pronunciation, and reading strategy. These pages are designed as practical roadmaps, not just theory.',
    cardPrefix: 'Guide',
    ctaLabel: 'Start Learning Free',
  },
  zh: {
    title: '韩语学习指南中心',
    description:
      '从 TOPIK、语法、词汇、发音和阅读策略开始。每篇都是可执行的学习路线，而不是空泛知识点。',
    cardPrefix: '指南',
    ctaLabel: '免费开始学习',
  },
  vi: {
    title: 'Trung tâm hướng dẫn học tiếng Hàn',
    description:
      'Bắt đầu với các hướng dẫn trọng tâm về TOPIK, ngữ pháp, từ vựng, phát âm và đọc hiểu. Mỗi trang là lộ trình có thể áp dụng ngay.',
    cardPrefix: 'Hướng dẫn',
    ctaLabel: 'Bắt đầu miễn phí',
  },
  mn: {
    title: 'Солонгос хэл сурах гарын авлага',
    description:
      'TOPIK, дүрэм, үгсийн сан, дуудлага, уншлагын стратегийн чиглэсэн гарын авлагуудаас эхлээрэй. Онол биш, шууд хэрэгжих алхмууд.',
    cardPrefix: 'Гарын авлага',
    ctaLabel: 'Үнэгүй эхлэх',
  },
};

const LEARN_GUIDES: LearnGuideDefinition[] = [
  {
    key: 'topik-guide',
    path: '/learn/topik-guide',
    publishedAt: '2026-03-10',
    updatedAt: '2026-03-12',
    relatedGuides: ['topik-writing', 'korean-vocabulary', 'reading-practice'],
    locales: {
      en: {
        title: 'TOPIK Preparation Guide (Level 1-6)',
        description:
          'A practical TOPIK prep system: exam structure, weekly plan, scoring strategy, and mock test routine for TOPIK I and TOPIK II.',
        intro:
          'TOPIK progress is mostly about deliberate repetition and exam familiarity. Build a routine where you measure, review, and adjust every week.',
        sections: [
          {
            heading: 'Understand the exam first',
            paragraphs: [
              'Split prep by test type and time pressure: listening, reading, and writing.',
              'Use historical papers early so your study style matches real exam constraints.',
            ],
            bullets: [
              'TOPIK I: listening + reading fundamentals',
              'TOPIK II: longer passages + writing output quality',
              'Review incorrect choices, not only final scores',
            ],
          },
          {
            heading: 'Use a weekly score loop',
            paragraphs: [
              'Set one timed mini-test and one full review block each week.',
              'Track accuracy by question type to expose weak patterns quickly.',
            ],
            bullets: [
              'Mon-Thu: concept and vocabulary building',
              'Fri: timed block practice',
              'Weekend: mistake notebook + rewrite answers',
            ],
          },
        ],
        faqs: [
          {
            question: 'How many months do I need for TOPIK II?',
            answer:
              'For most learners, 3-6 months of structured study with weekly timed practice is a realistic window.',
          },
          {
            question: 'Should I focus on speed or accuracy first?',
            answer:
              'Start with accuracy, then increase speed. Speed without stable accuracy creates repeated mistakes.',
          },
        ],
        ctaLabel: 'Practice TOPIK Now',
        ctaTo: '/topik',
      },
      zh: {
        title: 'TOPIK 备考指南（1-6级）',
        description: '从考试结构、周计划到模考复盘，一套可执行的 TOPIK I / TOPIK II 提分路线。',
        intro: 'TOPIK 提分核心不是刷题数量，而是“定时训练 + 错题复盘 + 持续迭代”。',
        sections: [
          {
            heading: '先把考试结构吃透',
            paragraphs: [
              '按题型拆分听力、阅读、写作，不同模块用不同训练方式。',
              '越早进入真题节奏，越能减少正式考试时的陌生感。',
            ],
            bullets: [
              'TOPIK I：基础词汇与句型识别',
              'TOPIK II：长文理解与写作表达',
              '重点复盘错因而不是只看分数',
            ],
          },
          {
            heading: '建立每周得分循环',
            paragraphs: [
              '每周至少一次计时训练 + 一次完整复盘。',
              '按题型统计正确率，快速定位薄弱点。',
            ],
            bullets: ['周中：知识输入', '周五：限时刷题', '周末：错题本 + 重写答案'],
          },
        ],
        faqs: [
          {
            question: 'TOPIK II 一般要准备多久？',
            answer: '多数学习者在 3-6 个月内建立稳定节奏后能看到明显提升。',
          },
          {
            question: '先提速度还是先提准确率？',
            answer: '先稳准确率，再提速度。没有准确率基础的提速会放大失误。',
          },
        ],
        ctaLabel: '开始 TOPIK 练习',
        ctaTo: '/topik',
      },
      vi: {
        title: 'Hướng dẫn luyện thi TOPIK (Cấp 1-6)',
        description:
          'Lộ trình luyện TOPIK thực tế: hiểu cấu trúc đề thi, kế hoạch tuần và chiến lược tăng điểm ổn định cho TOPIK I và TOPIK II.',
        intro:
          'Tiến bộ TOPIK phụ thuộc vào vòng lặp luyện đề có chủ đích: đo kết quả, phân tích lỗi và điều chỉnh mỗi tuần.',
        sections: [
          {
            heading: 'Nắm rõ cấu trúc đề thi trước',
            paragraphs: [
              'Tách luyện tập theo dạng bài và áp lực thời gian: nghe, đọc và viết.',
              'Dùng đề thật từ sớm để cách học bám sát điều kiện thi thực tế.',
            ],
            bullets: [
              'TOPIK I: nền tảng nghe và đọc',
              'TOPIK II: đoạn văn dài và chất lượng viết',
              'Phân tích nguyên nhân sai thay vì chỉ nhìn điểm tổng',
            ],
          },
          {
            heading: 'Thiết lập vòng lặp điểm số theo tuần',
            paragraphs: [
              'Mỗi tuần có ít nhất một buổi luyện bấm giờ và một buổi tổng kết lỗi.',
              'Theo dõi độ chính xác theo từng dạng câu hỏi để phát hiện điểm yếu nhanh hơn.',
            ],
            bullets: [
              'Thứ 2-5: xây nền kiến thức và từ vựng',
              'Thứ 6: luyện đề giới hạn thời gian',
              'Cuối tuần: sổ lỗi và viết lại đáp án',
            ],
          },
        ],
        faqs: [
          {
            question: 'TOPIK II thường cần bao lâu để chuẩn bị?',
            answer:
              'Phần lớn người học cần 3 đến 6 tháng nếu duy trì luyện đề bấm giờ và tổng kết lỗi hằng tuần.',
          },
          {
            question: 'Nên ưu tiên tốc độ hay độ chính xác trước?',
            answer: 'Nên ưu tiên độ chính xác trước, rồi tăng tốc khi mẫu lỗi đã ổn định.',
          },
        ],
        ctaLabel: 'Luyện TOPIK ngay',
        ctaTo: '/topik',
      },
      mn: {
        title: 'TOPIK бэлтгэлийн гарын авлага (1-6 түвшин)',
        description:
          'TOPIK I ба TOPIK II-д зориулсан бодит бэлтгэлийн систем: шалгалтын бүтэц, 7 хоногийн төлөвлөгөө, оноо ахиулах стратеги.',
        intro:
          'TOPIK-ийн ахиц нь зорилготой давталтаас хамаарна. Долоо хоног бүр хэмжиж, алдаагаа дүгнэж, төлөвлөгөөгөө сайжруулаарай.',
        sections: [
          {
            heading: 'Эхлээд шалгалтын бүтцийг ойлго',
            paragraphs: [
              'Сонсгол, уншлага, бичлэгийг тус бүрийн хугацаа ба шаардлагаар нь ялгаж бэлтгэ.',
              'Өмнөх жилийн жинхэнэ материалд эрт орох нь шалгалтын орчинд хурдан дасгадаг.',
            ],
            bullets: [
              'TOPIK I: сонсгол + уншлагын суурь',
              'TOPIK II: урт эх, бичгийн чанарт төвлөрнө',
              'Зөвхөн оноо биш, буруу хариултын шалтгааныг заавал шалга',
            ],
          },
          {
            heading: '7 хоногийн онооны цикл байгуул',
            paragraphs: [
              'Долоо хоног бүр дор хаяж нэг хугацаатай дасгал, нэг бүтэн алдааны задлантай бай.',
              'Асуултын төрлөөр зөв хариултын хувь хөтөлж сул талуудаа эрт илрүүл.',
            ],
            bullets: [
              'Даваа-Пүрэв: ойлголт ба үгийн сан',
              'Баасан: хугацаатай бодлого',
              'Амралтын өдөр: алдааны дэвтэр + хариулт дахин бичих',
            ],
          },
        ],
        faqs: [
          {
            question: 'TOPIK II-д ер нь хэдий хугацаанд бэлдвэл тохиромжтой вэ?',
            answer:
              'Ихэнх суралцагчид 3-6 сарын тогтмол, хугацаатай давталтаар мэдэгдэхүйц ахиц гаргадаг.',
          },
          {
            question: 'Эхлээд хурд уу, эсвэл зөв гүйцэтгэл үү?',
            answer:
              'Эхлээд зөв гүйцэтгэлээ тогтвортой болгоод, дараа нь хурдаа нэмэх нь илүү үр дүнтэй.',
          },
        ],
        ctaLabel: 'TOPIK дасгал эхлүүлэх',
        ctaTo: '/topik',
      },
    },
  },
  {
    key: 'korean-grammar',
    path: '/learn/korean-grammar',
    publishedAt: '2026-03-10',
    updatedAt: '2026-03-12',
    relatedGuides: ['topik-writing', 'topik-guide', 'reading-practice'],
    locales: {
      en: {
        title: 'Korean Grammar Study Plan',
        description:
          'Learn Korean grammar systematically with pattern grouping, usage contrast, and active output drills.',
        intro:
          'Grammar is not memorizing definitions. It is deciding the right pattern in context, under time pressure.',
        sections: [
          {
            heading: 'Group grammar by function',
            paragraphs: [
              'Study endings in functional clusters: contrast, cause, condition, intention, and politeness.',
            ],
            bullets: [
              'Compare similar endings side by side',
              'Keep one example sentence per ending',
              'Track common confusion pairs',
            ],
          },
          {
            heading: 'Move from input to output',
            paragraphs: [
              'After reading examples, write your own sentence and speak it aloud immediately.',
              'Use error-driven review from your own writing, not only textbook examples.',
            ],
          },
        ],
        faqs: [
          {
            question: 'How many grammar points should I learn per week?',
            answer: '3-5 points with strong review is better than 15 points with weak retention.',
          },
          {
            question: 'Is grammar translation enough?',
            answer: 'No. You need active usage in speaking and writing for reliable recall.',
          },
        ],
        ctaLabel: 'Open Grammar Module',
        ctaTo: '/course/yonsei-1/grammar',
      },
      zh: {
        title: '韩语语法学习路线',
        description: '按功能系统学习韩语语法，通过相近语法对比和主动输出训练，提升真实使用能力。',
        intro: '语法学习不只是背定义，更关键的是在语境和时间压力下做出正确选择。',
        sections: [
          {
            heading: '按功能分组学习语法',
            paragraphs: ['把语法按转折、因果、条件、意图和敬语等功能归类，建立稳定框架。'],
            bullets: ['把容易混淆的语法并排对比', '每个语法保留一个核心例句', '持续记录高频混淆对'],
          },
          {
            heading: '从输入转向输出',
            paragraphs: [
              '看完例句后立刻造句并口头复述，强化可调用能力。',
              '复盘重点放在你自己写作中的错误，而不只看教材示例。',
            ],
          },
        ],
        faqs: [
          {
            question: '每周学多少语法点更合适？',
            answer: '每周 3-5 个语法点并配合深度复习，通常比大量浅学更有效。',
          },
          {
            question: '只做语法翻译练习够吗？',
            answer: '不够。需要在口语和写作中主动使用，才能形成稳定调用。',
          },
        ],
        ctaLabel: '打开语法模块',
        ctaTo: '/course/yonsei-1/grammar',
      },
      vi: {
        title: 'Lộ trình học ngữ pháp tiếng Hàn',
        description:
          'Học ngữ pháp tiếng Hàn có hệ thống với cách nhóm mẫu câu, so sánh cách dùng và luyện đầu ra chủ động.',
        intro:
          'Ngữ pháp không chỉ là nhớ định nghĩa. Điều quan trọng là chọn đúng mẫu trong đúng ngữ cảnh, kể cả khi bị áp lực thời gian.',
        sections: [
          {
            heading: 'Nhóm ngữ pháp theo chức năng',
            paragraphs: [
              'Học đuôi câu theo cụm chức năng: tương phản, nguyên nhân, điều kiện, ý định và mức độ lịch sự.',
            ],
            bullets: [
              'Đặt các mẫu dễ nhầm cạnh nhau để đối chiếu',
              'Giữ ít nhất một câu ví dụ cốt lõi cho mỗi mẫu',
              'Theo dõi cặp mẫu bạn thường nhầm',
            ],
          },
          {
            heading: 'Chuyển từ đầu vào sang đầu ra',
            paragraphs: [
              'Sau khi đọc ví dụ, viết câu của riêng bạn và nói thành tiếng ngay lập tức.',
              'Ôn tập dựa trên lỗi trong bài viết của chính bạn, không chỉ dựa vào ví dụ trong sách.',
            ],
          },
        ],
        faqs: [
          {
            question: 'Mỗi tuần nên học bao nhiêu điểm ngữ pháp?',
            answer:
              'Khoảng 3-5 điểm với ôn tập kỹ sẽ hiệu quả hơn học quá nhiều nhưng nhớ không chắc.',
          },
          {
            question: 'Chỉ dịch nghĩa ngữ pháp có đủ không?',
            answer:
              'Không đủ. Bạn cần dùng chủ động trong nói và viết để gọi lại chính xác khi làm bài.',
          },
        ],
        ctaLabel: 'Mở module ngữ pháp',
        ctaTo: '/course/yonsei-1/grammar',
      },
      mn: {
        title: 'Солонгос хэлний дүрэм сурах төлөвлөгөө',
        description:
          'Солонгос дүрмийг чиг үүргээр нь бүлэглэж, төстэй хэлбэрүүдийг харьцуулан, идэвхтэй гаралтын дасгалаар системтэй сур.',
        intro:
          'Дүрэм сурах нь зөвхөн тодорхойлолт цээжлэх биш. Нөхцөл байдал болон хугацааны дарамт дунд зөв хэлбэрээ сонгох чадвар юм.',
        sections: [
          {
            heading: 'Дүрмийг үүргээр нь бүлэглэж сур',
            paragraphs: [
              'Төгсгөлүүдийг эсрэгцүүлэл, шалтгаан, нөхцөл, зорилго, хүндэтгэлийн түвшнээр нь багцалж сур.',
            ],
            bullets: [
              'Төстэй дүрмүүдийг зэрэгцүүлэн харьцуул',
              'Дүрэм бүрт нэг гол жишээ өгүүлбэр хадгал',
              'Андуурагддаг дүрмийн хосоо тогтмол тэмдэглэ',
            ],
          },
          {
            heading: 'Оролтоос гаралт руу шилж',
            paragraphs: [
              'Жишээг уншмагцаа өөрийн өгүүлбэр зохиож, чангаар хэлж давт.',
              'Зөвхөн сурах бичгийн жишээ биш, өөрийн бичвэрийн алдаагаар давталт хий.',
            ],
          },
        ],
        faqs: [
          {
            question: '7 хоногт хэдэн дүрэм сурах нь тохиромжтой вэ?',
            answer:
              '3-5 дүрмийг чанартай давталттай сурах нь олон дүрмийг өнгөц сурахаас илүү үр дүнтэй.',
          },
          {
            question: 'Дүрмийг зөвхөн орчуулж ойлгох хангалттай юу?',
            answer: 'Хангалтгүй. Ярих ба бичихэд идэвхтэй ашиглаж байж тогтвортой санагдана.',
          },
        ],
        ctaLabel: 'Дүрмийн модуль нээх',
        ctaTo: '/course/yonsei-1/grammar',
      },
    },
  },
  {
    key: 'korean-vocabulary',
    path: '/learn/korean-vocabulary',
    publishedAt: '2026-03-10',
    updatedAt: '2026-03-12',
    relatedGuides: ['reading-practice', 'topik-guide', 'korean-pronunciation'],
    locales: {
      en: {
        title: 'Korean Vocabulary Retention System',
        description:
          'Use SRS, context examples, and dictation-based recall to remember Korean words long term.',
        intro:
          'Vocabulary growth is a memory problem. Spaced repetition and retrieval practice outperform passive rereading.',
        sections: [
          {
            heading: 'Build memory layers',
            paragraphs: [
              'Attach each word to pronunciation, meaning, and one usage sentence.',
              'Review with both recognition and recall modes.',
            ],
            bullets: [
              'Flashcards for daily review',
              'Dictation for active recall',
              'Spelling mode to reduce typo errors',
            ],
          },
          {
            heading: 'Prioritize useful words',
            paragraphs: [
              'Focus first on high-frequency words in your exam level and reading materials.',
              'Keep a personal mistake list and recycle those words more often.',
            ],
          },
        ],
        faqs: [
          {
            question: 'How many words should I review every day?',
            answer:
              'Start with 20-40 high-quality reviews. Increase only if retention remains stable.',
          },
          {
            question: 'Should I learn words isolated or in sentences?',
            answer: 'Use both, but sentence context is critical for accurate usage.',
          },
        ],
        ctaLabel: 'Start Vocab Practice',
        ctaTo: '/vocab-book',
      },
      zh: {
        title: '韩语词汇记忆系统',
        description: '结合 SRS、语境例句和主动回忆训练，建立长期稳定的韩语词汇记忆能力。',
        intro: '词汇增长本质是记忆管理问题。间隔复习与主动提取通常比被动重复阅读更有效。',
        sections: [
          {
            heading: '搭建多层记忆线索',
            paragraphs: [
              '把每个单词和读音、释义、使用场景绑定在一起，避免孤立记忆。',
              '同时使用识别和回忆两种模式训练记忆强度。',
            ],
            bullets: ['用闪卡做日常复习', '用听写训练主动提取', '用拼写模式降低写错率'],
          },
          {
            heading: '优先高价值词汇',
            paragraphs: [
              '先覆盖你当前等级和考试场景中的高频词，再扩展低频词。',
              '维护个人易错词清单，对薄弱词做高频回收。',
            ],
          },
        ],
        faqs: [
          {
            question: '每天复习多少词比较合适？',
            answer: '建议从 20-40 个高质量复习开始，再根据留存率逐步调整。',
          },
          {
            question: '背词需要配例句吗？',
            answer: '需要。例句能明显提高词义辨析和真实语境下的使用准确度。',
          },
        ],
        ctaLabel: '开始词汇训练',
        ctaTo: '/vocab-book',
      },
      vi: {
        title: 'Hệ thống ghi nhớ từ vựng tiếng Hàn',
        description:
          'Kết hợp SRS, câu ngữ cảnh và luyện nhớ chủ động để ghi nhớ từ vựng tiếng Hàn dài hạn.',
        intro:
          'Tăng từ vựng là bài toán trí nhớ. Lặp lại ngắt quãng và truy xuất chủ động hiệu quả hơn đọc đi đọc lại thụ động.',
        sections: [
          {
            heading: 'Xây nhiều lớp ghi nhớ',
            paragraphs: [
              'Gắn mỗi từ với phát âm, nghĩa và một câu ví dụ sử dụng.',
              'Ôn tập ở cả hai chế độ: nhận diện và tự nhớ lại.',
            ],
            bullets: [
              'Flashcard để ôn hằng ngày',
              'Chính tả để luyện truy xuất chủ động',
              'Luyện đánh vần để giảm lỗi viết sai',
            ],
          },
          {
            heading: 'Ưu tiên nhóm từ hữu ích',
            paragraphs: [
              'Tập trung trước vào từ tần suất cao trong cấp độ và tài liệu bạn đang học.',
              'Duy trì danh sách từ hay sai và tăng tần suất ôn cho nhóm này.',
            ],
          },
        ],
        faqs: [
          {
            question: 'Mỗi ngày nên ôn bao nhiêu từ?',
            answer: 'Bắt đầu với 20-40 lượt ôn chất lượng, chỉ tăng khi tỷ lệ nhớ vẫn ổn định.',
          },
          {
            question: 'Nên học từ rời hay học trong câu?',
            answer: 'Nên dùng cả hai, nhưng ngữ cảnh câu là yếu tố then chốt để dùng từ chính xác.',
          },
        ],
        ctaLabel: 'Bắt đầu luyện từ vựng',
        ctaTo: '/vocab-book',
      },
      mn: {
        title: 'Солонгос үг цээжлэх систем',
        description:
          'SRS, өгүүлбэрийн орчин, идэвхтэй санах дасгалыг хослуулж солонгос үгийг урт хугацаанд тогтооно.',
        intro:
          'Үгийн сан өсгөх нь санах ойн асуудал. Завсарлагатай давталт ба санах сэргээх дасгал нь зүгээр давтаж уншихаас илүү үр дүнтэй.',
        sections: [
          {
            heading: 'Олон давхар санах холбоос үүсгэ',
            paragraphs: [
              'Үг бүрийг дуудлага, утга, нэг хэрэглээний өгүүлбэртэй хамтатгаж тогтоо.',
              'Таних болон санаж хэлэх хоёр горимоор давтвал тогтоц илүү бат болно.',
            ],
            bullets: [
              'Өдөр бүр флаш карт ашиглан давтах',
              'Диктант хийж идэвхтэй санах чадвар сайжруулах',
              'Үсэглэх горимоор бичгийн алдаа бууруулах',
            ],
          },
          {
            heading: 'Өндөр өгөөжтэй үгсээ түрүүлж сур',
            paragraphs: [
              'Өөрийн түвшин, шалгалтын материалд их давтагддаг үгсээс эхэл.',
              'Мартагддаг үгсийн хувийн жагсаалт үүсгээд давталтын давтамжийг өсгө.',
            ],
          },
        ],
        faqs: [
          {
            question: 'Өдөрт хэдэн үг давтвал тохиромжтой вэ?',
            answer:
              'Эхлээд 20-40 чанартай давталтаас эхэлж, тогтоц тогтвортой байвал аажмаар нэмээрэй.',
          },
          {
            question: 'Үгийг дангаар нь сурах уу, өгүүлбэртэй нь сурах уу?',
            answer:
              'Хоёуланг нь ашигла. Гэхдээ өгүүлбэрийн орчин нь зөв хэрэглээг тогтоох хамгийн чухал хэсэг.',
          },
        ],
        ctaLabel: 'Үгийн сангийн дасгал эхлүүлэх',
        ctaTo: '/vocab-book',
      },
    },
  },
  {
    key: 'reading-practice',
    path: '/learn/reading-practice',
    publishedAt: '2026-03-10',
    updatedAt: '2026-03-12',
    relatedGuides: ['korean-vocabulary', 'korean-grammar', 'topik-guide'],
    locales: {
      en: {
        title: 'Korean Reading Practice Strategy',
        description:
          'Improve Korean reading speed and comprehension with level-based texts, annotation, and translation checks.',
        intro:
          'Reading improvement comes from consistent exposure plus targeted analysis of unknown patterns.',
        sections: [
          {
            heading: 'Read by level, not by random topic',
            paragraphs: [
              'Pick articles slightly above your comfort zone and keep them short at first.',
              'Track unknown words and grammar in a notebook for weekly review.',
            ],
          },
          {
            heading: 'Use an active reading loop',
            paragraphs: [
              'First pass: read without dictionary. Second pass: annotate and confirm meaning.',
              'Summarize in your own words to ensure understanding.',
            ],
            bullets: ['Skim for structure', 'Annotate key sentences', 'Summarize in 3 lines'],
          },
        ],
        faqs: [
          {
            question: 'Is translation during reading bad?',
            answer:
              'Not if used intentionally in second pass. Avoid stopping on every unknown word in first pass.',
          },
          {
            question: 'How to improve reading speed?',
            answer: 'Timed passages plus repeated reading of similar structures works best.',
          },
        ],
        ctaLabel: 'Explore Reading Articles',
        ctaTo: '/reading',
      },
      zh: {
        title: '韩语阅读训练策略',
        description: '通过分级阅读、主动标注与理解校验，系统提升韩语阅读速度和理解准确度。',
        intro: '阅读能力提升来自持续输入和针对性分析：找出反复不懂的结构并持续回收。',
        sections: [
          {
            heading: '按难度分级阅读',
            paragraphs: [
              '优先选择略高于当前水平的短文本，兼顾挑战与可持续性。',
              '把生词和陌生语法记录到笔记中，按周复盘。',
            ],
          },
          {
            heading: '执行主动阅读循环',
            paragraphs: [
              '第一遍先抓主旨，减少频繁查词；第二遍再做细节标注和确认。',
              '最后用自己的话做简短复述，验证是否真正理解。',
            ],
            bullets: ['先看结构', '标注关键句', '3 句话总结'],
          },
        ],
        faqs: [
          {
            question: '阅读时查词会拖慢进步吗？',
            answer: '不会。关键是分阶段：第一遍保留阅读流，第二遍集中处理。',
          },
          {
            question: '如何提升韩语阅读速度？',
            answer: '限时阅读加同类句式反复输入，通常是最有效的提速路径。',
          },
        ],
        ctaLabel: '查看阅读内容',
        ctaTo: '/reading',
      },
      vi: {
        title: 'Chiến lược luyện đọc tiếng Hàn',
        description:
          'Cải thiện tốc độ và khả năng đọc hiểu tiếng Hàn với văn bản theo cấp độ, chú thích chủ động và kiểm tra lại nghĩa.',
        intro:
          'Tiến bộ đọc đến từ việc tiếp xúc đều đặn kết hợp phân tích có mục tiêu các mẫu câu chưa quen.',
        sections: [
          {
            heading: 'Đọc theo cấp độ, không chọn ngẫu nhiên',
            paragraphs: [
              'Bắt đầu với bài đọc ngắn, khó hơn mức hiện tại một chút để duy trì nhịp học bền vững.',
              'Ghi lại từ và ngữ pháp chưa chắc vào sổ để ôn theo tuần.',
            ],
          },
          {
            heading: 'Dùng vòng đọc chủ động',
            paragraphs: [
              'Lượt 1 đọc lấy ý chính không tra từ liên tục. Lượt 2 mới đánh dấu và xác nhận nghĩa.',
              'Tóm tắt lại bằng lời của bạn để kiểm tra mức độ hiểu thực sự.',
            ],
            bullets: ['Quét cấu trúc trước', 'Đánh dấu câu trọng tâm', 'Tóm tắt trong 3 dòng'],
          },
        ],
        faqs: [
          {
            question: 'Dịch trong lúc đọc có phải thói quen xấu không?',
            answer: 'Không, nếu bạn dùng có chủ đích ở lượt 2. Lượt 1 nên ưu tiên giữ mạch đọc.',
          },
          {
            question: 'Làm sao tăng tốc độ đọc tiếng Hàn?',
            answer: 'Đọc đoạn có bấm giờ kết hợp lặp lại cấu trúc tương tự là cách hiệu quả nhất.',
          },
        ],
        ctaLabel: 'Khám phá bài đọc',
        ctaTo: '/reading',
      },
      mn: {
        title: 'Солонгос уншлагын дасгалын стратеги',
        description:
          'Түвшинтэй эх, идэвхтэй тэмдэглэгээ, утгын нягтлалтаар солонгос уншлагын хурд ба ойлголтоо сайжруул.',
        intro:
          'Уншлага сайжрах нь тогтмол оролт болон ойлгоогүй хэлбэрүүдээ зорилготой задлан шинжлэхээс эхэлдэг.',
        sections: [
          {
            heading: 'Санамсаргүй биш, түвшнээр нь унш',
            paragraphs: [
              'Одоогийн түвшнээс арай өндөр богино эх сонгож тогтвортой хэмнэл бүрдүүл.',
              'Мэдэхгүй үг, дүрмээ дэвтэрт тэмдэглээд долоо хоногоор давт.',
            ],
          },
          {
            heading: 'Идэвхтэй уншлагын цикл ашигла',
            paragraphs: [
              'Эхний уншилтаар гол санаагаа барьж, хоёр дахь уншилтаар үг ба дүрмээ тэмдэглэн баталгаажуул.',
              'Өөрийн үгээр товч дүгнэлт хийж жинхэнэ ойлголтоо шалга.',
            ],
            bullets: ['Эхлээд бүтэц ажигла', 'Гол өгүүлбэрүүдээ тэмдэглэ', '3 мөрөөр дүгнэ'],
          },
        ],
        faqs: [
          {
            question: 'Уншиж байхдаа үг харах нь муу юу?',
            answer:
              'Муу биш. Эхний уншилтад урсгалаа хадгалж, хоёр дахь уншилтад төвлөрч шалгавал үр дүнтэй.',
          },
          {
            question: 'Солонгос уншлагын хурдаа яаж нэмэх вэ?',
            answer: 'Хугацаатай уншлага болон төстэй бүтцүүдийг давтан унших нь хамгийн үр дүнтэй.',
          },
        ],
        ctaLabel: 'Уншлагын материал үзэх',
        ctaTo: '/reading',
      },
    },
  },
  {
    key: 'korean-pronunciation',
    path: '/learn/korean-pronunciation',
    publishedAt: '2026-03-10',
    updatedAt: '2026-03-12',
    relatedGuides: ['korean-vocabulary', 'reading-practice', 'topik-guide'],
    locales: {
      en: {
        title: 'Korean Pronunciation Training Guide',
        description:
          'Train Korean pronunciation with shadowing, syllable timing, and recording-based self-correction.',
        intro:
          'Pronunciation improves when you compare your output with native audio and correct one sound pattern at a time.',
        sections: [
          {
            heading: 'Shadow short audio repeatedly',
            paragraphs: [
              'Use 10-20 second clips and mimic rhythm before focusing on individual consonants.',
            ],
            bullets: [
              'Listen once for rhythm',
              'Repeat while reading transcript',
              'Record and compare waveform or timing',
            ],
          },
          {
            heading: 'Fix high-impact errors first',
            paragraphs: [
              'Prioritize 받침 pronunciation, tense consonants, and liaison rules.',
              'Keep a short personal error checklist and review daily.',
            ],
          },
        ],
        faqs: [
          {
            question: 'How long should pronunciation practice be?',
            answer: '15 minutes daily is usually enough when practice is focused and recorded.',
          },
          {
            question: 'Do I need IPA?',
            answer:
              'IPA can help, but listening-shadowning-feedback loops are more important for most learners.',
          },
        ],
        ctaLabel: 'Practice with Audio',
        ctaTo: '/podcasts',
      },
      zh: {
        title: '韩语发音训练指南',
        description: '通过 shadowing、节奏训练和录音对比反馈，系统提升韩语发音清晰度与稳定性。',
        intro: '发音进步的关键是“对比 + 纠错 + 重复”：把注意力放在高影响错误上。',
        sections: [
          {
            heading: '短音频高频跟读',
            paragraphs: ['使用 10-20 秒音频片段，先模仿节奏，再处理具体音位差异。'],
            bullets: ['先完整听一遍节奏', '对照文本进行跟读', '录音并对比清晰度与节奏'],
          },
          {
            heading: '优先修正高影响错误',
            paragraphs: [
              '先处理 받침、紧音和连音规则，这些对可理解度影响最大。',
              '维护个人发音错误清单并每日短时复盘。',
            ],
          },
        ],
        faqs: [
          {
            question: '每天练发音多久比较合适？',
            answer: '每天 10-15 分钟高质量练习，长期效果通常已经足够明显。',
          },
          {
            question: '一定要学 IPA 才能练好发音吗？',
            answer: '不一定。对多数学习者来说，跟读和录音反馈循环更关键。',
          },
        ],
        ctaLabel: '开始音频练习',
        ctaTo: '/podcasts',
      },
      vi: {
        title: 'Hướng dẫn luyện phát âm tiếng Hàn',
        description:
          'Luyện phát âm tiếng Hàn với shadowing, nhịp âm tiết và tự sửa lỗi bằng ghi âm đối chiếu.',
        intro:
          'Phát âm cải thiện rõ rệt khi bạn so sánh đầu ra của mình với audio bản ngữ và sửa từng nhóm lỗi một.',
        sections: [
          {
            heading: 'Shadowing đoạn ngắn lặp lại',
            paragraphs: [
              'Dùng đoạn audio 10-20 giây, bắt chước nhịp điệu trước rồi mới đi vào phụ âm chi tiết.',
            ],
            bullets: [
              'Nghe một lượt để nắm nhịp',
              'Lặp lại khi nhìn transcript',
              'Ghi âm và đối chiếu nhịp cùng độ rõ',
            ],
          },
          {
            heading: 'Sửa trước nhóm lỗi tác động cao',
            paragraphs: [
              'Ưu tiên sửa 받침, phụ âm căng và quy tắc nối âm vì ảnh hưởng trực tiếp đến độ dễ hiểu.',
              'Giữ checklist lỗi cá nhân ngắn và ôn lại hằng ngày.',
            ],
          },
        ],
        faqs: [
          {
            question: 'Mỗi ngày nên luyện phát âm bao lâu?',
            answer:
              'Khoảng 15 phút mỗi ngày là đủ nếu buổi luyện có trọng tâm và có ghi âm để phản hồi.',
          },
          {
            question: 'Có cần học IPA để phát âm tốt không?',
            answer:
              'IPA có thể hữu ích, nhưng vòng lặp nghe - shadowing - phản hồi thường quan trọng hơn.',
          },
        ],
        ctaLabel: 'Luyện với audio',
        ctaTo: '/podcasts',
      },
      mn: {
        title: 'Солонгос дуудлага засах гарын авлага',
        description:
          'Shadowing, үеийн хэмнэл, бичлэгийн харьцуулсан засвараар солонгос дуудлагаа системтэй сайжруул.',
        intro:
          'Өөрийн яриаг эх хэлтэй аудиотой харьцуулж, нэг нэг алдааны хэв маягийг засах үед дуудлага хамгийн хурдан сайжирдаг.',
        sections: [
          {
            heading: 'Богино аудиог олон давталтаар shadowing хий',
            paragraphs: [
              '10-20 секундийн хэсэг сонгож, эхлээд хэмнэлийг дуурайгаад дараа нь авиа тус бүрээ зас.',
            ],
            bullets: [
              'Эхлээд хэмнэлээ бүтнээр нь сонс',
              'Текст харж даган хэл',
              'Бичээд хэмнэл, тодролоо харьцуул',
            ],
          },
          {
            heading: 'Нөлөө өндөртэй алдаагаа түрүүлж зас',
            paragraphs: [
              '받침, чанга гийгүүлэгч, холбоос авианы дүрмүүдийг түрүүнд нь засвал ойлгомж хурдан сайжирна.',
              'Хувийн алдааны богино жагсаалт гаргаад өдөр бүр давт.',
            ],
          },
        ],
        faqs: [
          {
            question: 'Өдөрт дуудлага хэдий хугацаанд дасгал хийх вэ?',
            answer:
              'Өдөр бүр 15 минут төвлөрсөн, бичлэгтэй дасгал хийхэд ихэнх суралцагчид мэдэгдэхүйц ахиц гаргадаг.',
          },
          {
            question: 'IPA заавал сурах хэрэгтэй юу?',
            answer:
              'Заавал биш. Ихэнх хүмүүст сонсох, shadowing хийх, бичлэгийн санал хүсэлтээр засах цикл илүү чухал.',
          },
        ],
        ctaLabel: 'Аудиогоор дасгал хийх',
        ctaTo: '/podcasts',
      },
    },
  },
  {
    key: 'topik-writing',
    path: '/learn/topik-writing',
    publishedAt: '2026-03-10',
    updatedAt: '2026-03-12',
    relatedGuides: ['topik-guide', 'korean-grammar', 'reading-practice'],
    locales: {
      en: {
        title: 'TOPIK Writing Strategy (Task 51-54)',
        description:
          'A clear TOPIK writing framework for idea structure, grammar control, and scoring-oriented revision.',
        intro:
          'High writing scores come from stable structure and low-error sentences, not overly complex wording.',
        sections: [
          {
            heading: 'Use fixed paragraph structures',
            paragraphs: [
              'Prepare reusable templates for intro, support, and conclusion by question type.',
              'Allocate time for planning before writing full sentences.',
            ],
            bullets: ['2-3 minute outline', 'Topic sentence first', 'One example per argument'],
          },
          {
            heading: 'Revise with a checklist',
            paragraphs: [
              'Final 5 minutes: check connectors, verb endings, spacing, and spelling consistency.',
            ],
            bullets: ['Sentence-ending consistency', 'Connector variety', 'Grammar error hotspots'],
          },
        ],
        faqs: [
          {
            question: 'Should I use advanced grammar in every sentence?',
            answer: 'No. Controlled, accurate grammar scores better than risky complexity.',
          },
          {
            question: 'How to improve quickly?',
            answer:
              'Practice with timed prompts and get feedback on structure and recurring grammar errors.',
          },
        ],
        ctaLabel: 'Practice TOPIK Writing',
        ctaTo: '/topik',
      },
      zh: {
        title: 'TOPIK 写作提分策略（51-54题）',
        description: '围绕结构组织、语法稳定性和评分标准，建立可执行的 TOPIK 写作训练框架。',
        intro: '写作高分通常来自稳定结构和低错误率，而不是堆叠复杂表达。',
        sections: [
          {
            heading: '使用固定段落框架',
            paragraphs: [
              '按题型准备开头、论证和结尾模板，降低考场组织成本。',
              '正式动笔前先完成简短提纲，保证观点顺序清晰。',
            ],
            bullets: ['2-3 分钟列提纲', '先写主题句', '每个论点配一个支撑例子'],
          },
          {
            heading: '用检查清单做终稿复盘',
            paragraphs: ['最后 5 分钟集中检查连接词、句尾一致性、空格和拼写。'],
            bullets: ['句尾形式保持一致', '连接词搭配自然', '重点排查高频语法错误'],
          },
        ],
        faqs: [
          {
            question: '每句都用高级语法会更高分吗？',
            answer: '不一定。稳定准确通常比冒险复杂更容易拿到更高分。',
          },
          {
            question: '如何更快提升 TOPIK 写作？',
            answer: '限时写作训练配合结构化反馈，是提分效率最高的路径之一。',
          },
        ],
        ctaLabel: '开始写作训练',
        ctaTo: '/topik',
      },
      vi: {
        title: 'Chiến lược viết TOPIK (Câu 51-54)',
        description:
          'Khung luyện viết TOPIK rõ ràng: bố cục ý, kiểm soát ngữ pháp và checklist sửa bài theo tiêu chí chấm điểm.',
        intro:
          'Điểm viết cao đến từ bố cục ổn định và câu ít lỗi, không phải từ việc cố dùng từ ngữ quá phức tạp.',
        sections: [
          {
            heading: 'Dùng khung đoạn văn cố định',
            paragraphs: [
              'Chuẩn bị mẫu mở bài, luận điểm hỗ trợ và kết luận theo từng dạng đề.',
              'Dành thời gian lập dàn ý trước khi viết câu hoàn chỉnh.',
            ],
            bullets: ['Lập dàn ý 2-3 phút', 'Viết câu chủ đề trước', 'Mỗi luận điểm có một ví dụ'],
          },
          {
            heading: 'Sửa bài bằng checklist',
            paragraphs: ['5 phút cuối: kiểm tra liên từ, đuôi câu, khoảng cách và chính tả.'],
            bullets: [
              'Giữ nhất quán đuôi câu',
              'Đa dạng liên từ hợp lý',
              'Rà soát nhóm lỗi ngữ pháp hay lặp lại',
            ],
          },
        ],
        faqs: [
          {
            question: 'Có cần dùng ngữ pháp nâng cao trong mọi câu không?',
            answer:
              'Không cần. Câu chắc và chính xác thường cho điểm tốt hơn câu phức tạp nhưng dễ sai.',
          },
          {
            question: 'Làm sao cải thiện nhanh kỹ năng viết TOPIK?',
            answer:
              'Luyện đề có bấm giờ và nhận phản hồi có cấu trúc theo lỗi lặp lại là cách nhanh nhất.',
          },
        ],
        ctaLabel: 'Luyện viết TOPIK',
        ctaTo: '/topik',
      },
      mn: {
        title: 'TOPIK бичгийн стратеги (51-54 даалгавар)',
        description:
          'Санааны бүтэц, дүрмийн хяналт, үнэлгээний шалгуурт нийцсэн шалгах жагсаалтаар TOPIK бичгээ системтэй сайжруул.',
        intro:
          'Өндөр оноо нь хэт төвөгтэй хэллэгээс бус, тогтвортой бүтэц ба бага алдаатай өгүүлбэрээс бий болдог.',
        sections: [
          {
            heading: 'Тогтмол догол мөрийн бүтэц ашигла',
            paragraphs: [
              'Асуултын төрлөөр оршил, үндэслэл, дүгнэлтийн дахин ашиглах загвар бэлд.',
              'Бүрэн бичихээс өмнө санаагаа богино төлөвлөж, дарааллаа тогтоо.',
            ],
            bullets: ['2-3 минутын ноорог', 'Эхлээд сэдвийн өгүүлбэр', 'Аргумент бүрт нэг жишээ'],
          },
          {
            heading: 'Шалгах жагсаалтаар засвар хий',
            paragraphs: [
              'Сүүлийн 5 минутанд холбоос үг, өгүүлбэрийн төгсгөл, зай, зөв бичгийг шалга.',
            ],
            bullets: [
              'Өгүүлбэрийн төгсгөлийн хэлбэрийг нэг мөр болго',
              'Холбоос үгийг оновчтой төрөлжүүл',
              'Давтагддаг дүрмийн алдааг тусад нь шалга',
            ],
          },
        ],
        faqs: [
          {
            question: 'Өгүүлбэр бүрт ахисан дүрэм хэрэглэх ёстой юу?',
            answer:
              'Үгүй. Хэт эрсдэлтэй төвөгтэй бүтэцээс илүү тогтвортой, зөв өгүүлбэр өндөр оноо авдаг.',
          },
          {
            question: 'TOPIK бичгийг хурдан сайжруулах хамгийн сайн арга юу вэ?',
            answer:
              'Хугацаатай сэдвээр тогтмол бичиж, давтагддаг алдаанд суурилсан бүтэцтэй санал авах нь хамгийн үр дүнтэй.',
          },
        ],
        ctaLabel: 'TOPIK бичгийн дасгал эхлүүлэх',
        ctaTo: '/topik',
      },
    },
  },
];

const guideMap = new Map(LEARN_GUIDES.map(guide => [guide.key, guide]));
const guideSlugMap = new Map(LEARN_GUIDES.map(guide => [guide.path.split('/').pop(), guide.key]));

function normalizeLanguage(language: string | null | undefined): 'en' | 'zh' | 'vi' | 'mn' {
  if (language === 'zh' || language?.startsWith('zh')) return 'zh';
  if (language === 'vi') return 'vi';
  if (language === 'mn') return 'mn';
  return 'en';
}

function toLearnGuideMeta(guide: LearnGuideDefinition): LearnGuideMeta {
  return {
    key: guide.key,
    path: guide.path,
    publishedAt: guide.publishedAt,
    updatedAt: guide.updatedAt,
    relatedGuides: guide.relatedGuides,
  };
}

export function getLearnHubContent(language: Language | string): LearnHubLocale {
  return LEARN_HUB_LOCALES[normalizeLanguage(language)];
}

export function listLearnGuides() {
  return LEARN_GUIDES;
}

export function getLearnGuideByKey(key: LearnGuideKey) {
  return guideMap.get(key) || null;
}

export function getLearnGuideMeta(key: LearnGuideKey): LearnGuideMeta | null {
  const guide = getLearnGuideByKey(key);
  if (!guide) return null;
  return toLearnGuideMeta(guide);
}

export function hasLocalizedLearnGuide(key: LearnGuideKey, language: Language | string): boolean {
  const guide = getLearnGuideByKey(key);
  if (!guide) return false;
  const normalizedLanguage = normalizeLanguage(language);
  return normalizedLanguage === 'en' || Boolean(guide.locales[normalizedLanguage]);
}

export function listRelatedLearnGuides(key: LearnGuideKey): LearnGuideMeta[] {
  const guide = getLearnGuideByKey(key);
  if (!guide) return [];

  return guide.relatedGuides
    .map(relatedKey => {
      const related = guideMap.get(relatedKey);
      if (!related) return null;
      return toLearnGuideMeta(related);
    })
    .filter((item): item is LearnGuideMeta => item !== null);
}

export function getLearnGuideKeyBySlug(slug: string | undefined): LearnGuideKey | null {
  if (!slug) return null;
  const key = guideSlugMap.get(slug);
  return (key as LearnGuideKey | undefined) ?? null;
}

export function getLocalizedLearnGuide(
  key: LearnGuideKey,
  language: Language | string
): LearnGuideContent {
  const guide = getLearnGuideByKey(key);
  if (!guide) {
    throw new Error(`Unknown guide key: ${key}`);
  }

  const normalizedLanguage = normalizeLanguage(language);
  return guide.locales[normalizedLanguage] || guide.locales.en;
}
