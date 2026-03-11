export const DEFAULT_LANGUAGE = 'en';
export const SUPPORTED_LANGUAGES = ['en', 'zh', 'vi', 'mn'];

export const PUBLIC_ROUTES = [
  {
    path: '/',
    indexable: true,
    meta: {
      title: 'DuHan - Learn Korean Online | Interactive Korean Learning Platform',
      description:
        "Master Korean with DuHan's interactive learning platform. Study vocabulary, grammar, TOPIK preparation, podcasts, and videos. Start your Korean learning journey today!",
      keywords:
        'Korean learning, Korean study, study Korean, learn Korean, Korean language, TOPIK, Korean vocabulary, Korean grammar, Korean courses',
    },
    metaByLang: {
      zh: {
        title: 'DuHan - 在线学习韩语 | 交互式韩语学习平台',
        description:
          '通过 DuHan 交互式平台高效学习韩语。系统化学习词汇、语法、TOPIK 备考、播客与视频内容，让韩语学习更高效。',
        keywords: '韩语学习, 在线学韩语, TOPIK, 韩语词汇, 韩语语法, 韩国语学习, 韩语课程',
      },
      vi: {
        title: 'DuHan - Học tiếng Hàn trực tuyến | Nền tảng học tương tác',
        description:
          'Học tiếng Hàn hiệu quả với DuHan. Luyện từ vựng, ngữ pháp, luyện thi TOPIK, podcast và video trong một nền tảng học tập tương tác.',
        keywords:
          'học tiếng Hàn, học tiếng Hàn online, TOPIK, từ vựng tiếng Hàn, ngữ pháp tiếng Hàn, khóa học tiếng Hàn',
      },
      mn: {
        title: 'DuHan - Солонгос хэл онлайнаар сурах | Интерактив платформ',
        description:
          'DuHan платформоор солонгос хэлээ үр дүнтэй суралц. Үг, дүрэм, TOPIK бэлтгэл, подкаст болон видеог нэг дороос судлаарай.',
        keywords:
          'солонгос хэл сурах, солонгос хэл онлайн, TOPIK, солонгос үгсийн сан, солонгос дүрэм, солонгос хэлний курс',
      },
    },
  },
  {
    path: '/pricing',
    indexable: true,
    meta: {
      title: 'Pricing Plans - DuHan Korean Learning',
      description:
        'Choose the perfect plan for your Korean learning journey. Access premium courses, TOPIK preparation, and exclusive content with DuHan.',
      keywords: 'pricing, plans, subscription, Korean learning courses',
    },
    metaByLang: {
      zh: {
        title: '价格方案 - DuHan 韩语学习',
        description: '选择适合你的韩语学习方案。解锁高级课程、TOPIK 备考与更多学习功能。',
        keywords: '价格, 订阅, 韩语学习套餐, TOPIK 备考',
      },
      vi: {
        title: 'Bảng giá - DuHan học tiếng Hàn',
        description:
          'Chọn gói phù hợp cho hành trình học tiếng Hàn của bạn. Mở khóa khóa học cao cấp và luyện thi TOPIK.',
        keywords: 'bảng giá, gói học, đăng ký, học tiếng Hàn, TOPIK',
      },
      mn: {
        title: 'Үнийн багц - DuHan солонгос хэл',
        description:
          'Суралцах хурдад тань тохирох багцыг сонгоорой. Дээд түвшний контент болон TOPIK бэлтгэлд нэвтэрнэ.',
        keywords: 'үнэ, багц, захиалга, солонгос хэл сурах, TOPIK',
      },
    },
  },
  {
    path: '/pricing/details',
    indexable: true,
    meta: {
      title: 'Pricing Details - DuHan Korean Learning',
      description:
        'Compare DuHan plans in detail and choose the best option for your Korean learning and TOPIK goals.',
      keywords: 'pricing details, plan comparison, Korean learning subscription',
    },
    metaByLang: {
      zh: {
        title: '价格详情 - DuHan 韩语学习',
        description: '详细对比 DuHan 各套餐，选择最适合你韩语学习与 TOPIK 目标的方案。',
        keywords: '价格详情, 套餐对比, 韩语学习订阅',
      },
      vi: {
        title: 'Chi tiết gói - DuHan học tiếng Hàn',
        description:
          'So sánh chi tiết các gói DuHan và chọn lựa phù hợp nhất cho mục tiêu tiếng Hàn và TOPIK.',
        keywords: 'chi tiết gói, so sánh gói, đăng ký học tiếng Hàn',
      },
      mn: {
        title: 'Багцын дэлгэрэнгүй - DuHan солонгос хэл',
        description:
          'DuHan-ийн багцуудыг дэлгэрэнгүй харьцуулж, TOPIK болон суралцах зорилгодоо тохирохыг сонгоно уу.',
        keywords: 'багцын дэлгэрэнгүй, харьцуулалт, захиалга',
      },
    },
  },
  {
    path: '/terms',
    indexable: true,
    meta: {
      title: 'Terms of Service and User Agreement - DuHan',
      description:
        'Read the terms of service for DuHan Korean learning platform. Learn about user rights, responsibilities, and platform usage guidelines.',
      keywords: 'terms of service, legal, user agreement',
    },
    metaByLang: {
      zh: {
        title: '服务条款 - DuHan',
        description: '查看 DuHan 平台服务条款，了解用户权利、责任与平台使用规范。',
        keywords: '服务条款, 法律, 用户协议',
      },
      vi: {
        title: 'Điều khoản dịch vụ - DuHan',
        description:
          'Xem điều khoản dịch vụ của DuHan để hiểu quyền, trách nhiệm và quy định sử dụng nền tảng.',
        keywords: 'điều khoản dịch vụ, pháp lý, thỏa thuận người dùng',
      },
      mn: {
        title: 'Үйлчилгээний нөхцөл - DuHan',
        description:
          'DuHan платформын үйлчилгээний нөхцөлийг уншиж, хэрэглэгчийн эрх ба үүргийг ойлгоорой.',
        keywords: 'үйлчилгээний нөхцөл, хууль, хэрэглэгчийн гэрээ',
      },
    },
  },
  {
    path: '/privacy',
    indexable: true,
    meta: {
      title: 'Privacy Policy and Data Protection - DuHan',
      description:
        'Learn how DuHan protects your privacy and handles your personal data. Our commitment to user privacy and data security.',
      keywords: 'privacy policy, data protection, user privacy',
    },
    metaByLang: {
      zh: {
        title: '隐私政策 - DuHan',
        description: '了解 DuHan 如何保护你的隐私与个人数据，我们对数据安全的承诺。',
        keywords: '隐私政策, 数据保护, 用户隐私',
      },
      vi: {
        title: 'Chính sách quyền riêng tư - DuHan',
        description:
          'Tìm hiểu cách DuHan bảo vệ quyền riêng tư và dữ liệu cá nhân của bạn, cùng cam kết bảo mật dữ liệu.',
        keywords: 'chính sách riêng tư, bảo vệ dữ liệu, quyền riêng tư',
      },
      mn: {
        title: 'Нууцлалын бодлого - DuHan',
        description:
          'DuHan таны хувийн мэдээллийг хэрхэн хамгаалдаг талаар танилцана уу. Бид өгөгдлийн аюулгүй байдлыг эрхэмлэнэ.',
        keywords: 'нууцлалын бодлого, өгөгдөл хамгаалалт, хувийн мэдээлэл',
      },
    },
  },
  {
    path: '/refund',
    indexable: true,
    meta: {
      title: 'Refund Policy and Cancellation Terms - DuHan',
      description:
        "Understand DuHan's refund policy for subscriptions and purchases. Learn about our refund process and eligibility requirements.",
      keywords: 'refund policy, money back, cancellation',
    },
    metaByLang: {
      zh: {
        title: '退款政策 - DuHan',
        description: '了解 DuHan 的退款规则、处理流程与适用条件。',
        keywords: '退款政策, 退款流程, 取消订阅',
      },
      vi: {
        title: 'Chính sách hoàn tiền - DuHan',
        description:
          'Tìm hiểu chính sách hoàn tiền của DuHan, quy trình xử lý và điều kiện áp dụng.',
        keywords: 'chính sách hoàn tiền, hoàn tiền, hủy đăng ký',
      },
      mn: {
        title: 'Буцаан олголтын бодлого - DuHan',
        description:
          'DuHan-ийн буцаан олголтын нөхцөл, процесс болон шаардлагыг эндээс харна уу.',
        keywords: 'буцаан олголт, төлбөр буцаалт, цуцлалт',
      },
    },
  },
  {
    path: '/learn',
    indexable: true,
    publishedAt: '2026-03-10',
    updatedAt: '2026-03-12',
    meta: {
      title: 'Korean Learning Guides - DuHan',
      description:
        'Explore practical Korean learning guides for TOPIK, grammar, vocabulary, pronunciation, and reading strategy.',
      keywords:
        'Korean learning guide, TOPIK guide, Korean grammar guide, Korean vocabulary guide, Korean reading strategy',
      ogImage: '/og/learn-hub.svg',
    },
    metaByLang: {
      zh: {
        title: '韩语学习指南中心 - DuHan',
        description:
          '系统化学习 TOPIK、语法、词汇、发音和阅读策略，获取可执行的韩语学习路线。',
        keywords: '韩语学习指南, TOPIK 备考指南, 韩语语法, 韩语词汇, 韩语阅读',
      },
      vi: {
        title: 'Hướng dẫn học tiếng Hàn - DuHan',
        description:
          'Khám phá lộ trình học tiếng Hàn thực chiến: TOPIK, ngữ pháp, từ vựng, phát âm và đọc hiểu.',
        keywords: 'hướng dẫn học tiếng Hàn, TOPIK, ngữ pháp tiếng Hàn, từ vựng tiếng Hàn',
      },
      mn: {
        title: 'Солонгос хэл сурах гарын авлага - DuHan',
        description:
          'TOPIK, дүрэм, үгсийн сан, дуудлага, уншлагын стратегийн алхамчилсан гарын авлагыг үзээрэй.',
        keywords: 'солонгос хэл сурах, TOPIK гарын авлага, солонгос дүрэм, үгсийн сан',
      },
    },
  },
  {
    path: '/learn/topik-guide',
    indexable: true,
    indexLanguages: ['en', 'zh', 'vi', 'mn'],
    publishedAt: '2026-03-10',
    updatedAt: '2026-03-12',
    meta: {
      title: 'TOPIK Preparation Guide (Level 1-6) - DuHan',
      description:
        'A practical TOPIK prep guide covering exam structure, weekly practice loop, and score-improvement strategy.',
      keywords:
        'TOPIK preparation guide, TOPIK study plan, TOPIK I, TOPIK II, Korean exam strategy',
      ogImage: '/og/learn-topik-guide.svg',
    },
    metaByLang: {
      zh: {
        title: 'TOPIK 备考指南（1-6级） - DuHan',
        description: '从考试结构、周计划到模考复盘，建立稳定提分节奏的 TOPIK 备考方案。',
        keywords: 'TOPIK 备考, 韩语考试, TOPIK I, TOPIK II, 提分策略',
      },
      vi: {
        title: 'Hướng dẫn luyện thi TOPIK (Cấp 1-6) - DuHan',
        description:
          'Lộ trình luyện TOPIK thực tế: cấu trúc đề, kế hoạch theo tuần và chiến lược tăng điểm bền vững.',
        keywords: 'luyện TOPIK, kế hoạch học TOPIK, TOPIK I, TOPIK II, chiến lược tăng điểm',
      },
      mn: {
        title: 'TOPIK бэлтгэлийн гарын авлага (1-6 түвшин) - DuHan',
        description:
          'TOPIK шалгалтад бэлтгэх бодит төлөвлөгөө: шалгалтын бүтэц, 7 хоногийн цикл, тогтвортой оноо ахиулах стратеги.',
        keywords: 'TOPIK бэлтгэл, TOPIK сурах төлөвлөгөө, TOPIK I, TOPIK II, оноо ахиулах стратеги',
      },
    },
  },
  {
    path: '/learn/korean-grammar',
    indexable: true,
    indexLanguages: ['en', 'zh', 'vi', 'mn'],
    publishedAt: '2026-03-10',
    updatedAt: '2026-03-12',
    meta: {
      title: 'Korean Grammar Study Plan - DuHan',
      description:
        'Learn Korean grammar with functional grouping, usage contrast, and output-focused practice.',
      keywords:
        'Korean grammar study plan, Korean grammar patterns, Korean grammar practice, learn Korean grammar',
      ogImage: '/og/learn-korean-grammar.svg',
    },
    metaByLang: {
      zh: {
        title: '韩语语法学习路线 - DuHan',
        description: '按功能分组学习韩语语法，结合对比与输出训练，提升真实使用能力。',
        keywords: '韩语语法, 韩语语法学习, 语法练习, 韩国语语法',
      },
      vi: {
        title: 'Lộ trình học ngữ pháp tiếng Hàn - DuHan',
        description:
          'Học ngữ pháp tiếng Hàn theo nhóm chức năng, so sánh mẫu tương tự và luyện đầu ra có mục tiêu.',
        keywords:
          'ngữ pháp tiếng Hàn, lộ trình ngữ pháp tiếng Hàn, luyện ngữ pháp tiếng Hàn',
      },
      mn: {
        title: 'Солонгос хэлний дүрмийн сурах төлөвлөгөө - DuHan',
        description:
          'Чиг үүргээр бүлэглэж, төстэй дүрмийг харьцуулж, гаралтын дасгалаар солонгос дүрмийг системтэй сур.',
        keywords:
          'солонгос дүрэм, солонгос хэлний дүрэм сурах, дүрмийн дасгал, TOPIK дүрэм',
      },
    },
  },
  {
    path: '/learn/korean-vocabulary',
    indexable: true,
    indexLanguages: ['en', 'zh', 'vi', 'mn'],
    publishedAt: '2026-03-10',
    updatedAt: '2026-03-12',
    meta: {
      title: 'Korean Vocabulary Retention System - DuHan',
      description:
        'Build long-term Korean vocabulary retention using SRS, dictation, and context-based review.',
      keywords:
        'Korean vocabulary, Korean word memorization, SRS Korean, Korean dictation practice',
      ogImage: '/og/learn-korean-vocabulary.svg',
    },
    metaByLang: {
      zh: {
        title: '韩语词汇记忆系统 - DuHan',
        description: '用 SRS、听写和语境复习建立长期有效的韩语词汇记忆体系。',
        keywords: '韩语词汇, 韩语背单词, SRS 记忆, 韩语听写',
      },
      vi: {
        title: 'Hệ thống ghi nhớ từ vựng tiếng Hàn - DuHan',
        description:
          'Xây dựng khả năng nhớ từ vựng tiếng Hàn dài hạn với SRS, chính tả và ôn theo ngữ cảnh.',
        keywords: 'từ vựng tiếng Hàn, ghi nhớ từ vựng, SRS tiếng Hàn, luyện chính tả tiếng Hàn',
      },
      mn: {
        title: 'Солонгос үг цээжлэх систем - DuHan',
        description:
          'SRS, бичгийн диктант, өгүүлбэрийн орчинд давталтыг хослуулж солонгос үгийг урт хугацаанд тогтооно.',
        keywords: 'солонгос үг, үг цээжлэх, SRS солонгос, солонгос диктант',
      },
    },
  },
  {
    path: '/learn/reading-practice',
    indexable: true,
    indexLanguages: ['en', 'zh', 'vi', 'mn'],
    publishedAt: '2026-03-10',
    updatedAt: '2026-03-12',
    meta: {
      title: 'Korean Reading Practice Strategy - DuHan',
      description:
        'Improve Korean reading speed and comprehension with level-based materials and active annotation loops.',
      keywords:
        'Korean reading practice, Korean reading comprehension, TOPIK reading strategy, learn Korean reading',
      ogImage: '/og/learn-reading-practice.svg',
    },
    metaByLang: {
      zh: {
        title: '韩语阅读训练策略 - DuHan',
        description: '通过分级阅读、主动标注与复盘循环，提高韩语阅读速度与理解能力。',
        keywords: '韩语阅读, 阅读训练, TOPIK 阅读, 韩语理解',
      },
      vi: {
        title: 'Chiến lược luyện đọc tiếng Hàn - DuHan',
        description:
          'Tăng tốc độ và độ hiểu tiếng Hàn với tài liệu theo cấp độ, vòng đọc chủ động và tổng kết lỗi.',
        keywords:
          'luyện đọc tiếng Hàn, đọc hiểu tiếng Hàn, chiến lược đọc TOPIK, học đọc tiếng Hàn',
      },
      mn: {
        title: 'Солонгос уншлагын дасгалын стратеги - DuHan',
        description:
          'Түвшинтэй материал, идэвхтэй тэмдэглэгээ, давталтын циклээр уншлагын хурд ба ойлголтоо сайжруул.',
        keywords:
          'солонгос уншлага, уншлагын дасгал, TOPIK уншлага, солонгос уншиж ойлгох',
      },
    },
  },
  {
    path: '/learn/korean-pronunciation',
    indexable: true,
    indexLanguages: ['en', 'zh', 'vi', 'mn'],
    publishedAt: '2026-03-10',
    updatedAt: '2026-03-12',
    meta: {
      title: 'Korean Pronunciation Training Guide - DuHan',
      description:
        'Train Korean pronunciation with shadowing, recording, and high-impact correction routines.',
      keywords:
        'Korean pronunciation, Korean speaking practice, Korean shadowing, learn Korean pronunciation',
      ogImage: '/og/learn-korean-pronunciation.svg',
    },
    metaByLang: {
      zh: {
        title: '韩语发音训练指南 - DuHan',
        description: '通过跟读、录音对比和高频错误纠正，系统提升韩语发音表现。',
        keywords: '韩语发音, 韩语口语, 跟读训练, 发音纠正',
      },
      vi: {
        title: 'Hướng dẫn luyện phát âm tiếng Hàn - DuHan',
        description:
          'Luyện phát âm tiếng Hàn bằng shadowing, ghi âm đối chiếu và quy trình sửa lỗi tác động cao.',
        keywords:
          'phát âm tiếng Hàn, luyện nói tiếng Hàn, shadowing tiếng Hàn, học phát âm tiếng Hàn',
      },
      mn: {
        title: 'Солонгос дуудлагын сургалтын гарын авлага - DuHan',
        description:
          'Shadowing, бичлэгийн харьцуулалт, өндөр нөлөөтэй засварын горимоор солонгос дуудлагаа сайжруул.',
        keywords:
          'солонгос дуудлага, солонгос яриа, shadowing солонгос, дуудлага засах',
      },
    },
  },
  {
    path: '/learn/topik-writing',
    indexable: true,
    indexLanguages: ['en', 'zh', 'vi', 'mn'],
    publishedAt: '2026-03-10',
    updatedAt: '2026-03-12',
    meta: {
      title: 'TOPIK Writing Strategy (Task 51-54) - DuHan',
      description:
        'A score-oriented TOPIK writing strategy with structure templates, revision checklist, and timed practice.',
      keywords:
        'TOPIK writing, TOPIK essay strategy, Korean writing practice, TOPIK Task 54',
      ogImage: '/og/learn-topik-writing.svg',
    },
    metaByLang: {
      zh: {
        title: 'TOPIK 写作提分策略（51-54题） - DuHan',
        description: '用结构模板、检查清单和限时训练，系统提升 TOPIK 写作分数。',
        keywords: 'TOPIK 写作, 韩语作文, TOPIK 54题, 写作提分',
      },
      vi: {
        title: 'Chiến lược viết TOPIK (Câu 51-54) - DuHan',
        description:
          'Chiến lược nâng điểm viết TOPIK với mẫu cấu trúc, checklist sửa bài và luyện đề bấm giờ.',
        keywords: 'viết TOPIK, chiến lược viết TOPIK, luyện viết tiếng Hàn, TOPIK câu 54',
      },
      mn: {
        title: 'TOPIK бичгийн стратеги (51-54 даалгавар) - DuHan',
        description:
          'Бүтцийн загвар, шалгах жагсаалт, хугацаатай дасгалаар TOPIK бичгийн оноогоо зорилтот байдлаар ахиулаарай.',
        keywords: 'TOPIK бичиг, TOPIK эссе стратеги, солонгос бичгийн дасгал, TOPIK 54 даалгавар',
      },
    },
  },
  {
    path: '/login',
    indexable: false,
    noIndex: true,
    meta: {
      title: 'Login - DuHan Korean Learning',
      description:
        'Sign in to DuHan to continue your Korean learning journey. Access your courses, progress, and personalized learning materials.',
      keywords: 'login, sign in, Korean learning login',
    },
    metaByLang: {
      zh: {
        title: '登录 - DuHan 韩语学习',
        description: '登录 DuHan 继续你的韩语学习，查看课程进度与个性化内容。',
        keywords: '登录, 韩语学习登录, 账户',
      },
      vi: {
        title: 'Đăng nhập - DuHan học tiếng Hàn',
        description:
          'Đăng nhập DuHan để tiếp tục học tiếng Hàn, theo dõi tiến độ và truy cập nội dung cá nhân.',
        keywords: 'đăng nhập, học tiếng Hàn, tài khoản',
      },
      mn: {
        title: 'Нэвтрэх - DuHan солонгос хэл',
        description:
          'DuHan-д нэвтэрч солонгос хэлний хичээлээ үргэлжлүүлэн, ахицаа хянаарай.',
        keywords: 'нэвтрэх, солонгос хэл сурах, бүртгэл',
      },
    },
  },
  {
    path: '/register',
    indexable: false,
    noIndex: true,
    meta: {
      title: 'Sign Up - DuHan Korean Learning',
      description:
        'Create your free DuHan account and start learning Korean today. Join thousands of students mastering Korean with our interactive platform.',
      keywords: 'sign up, register, create account, start learning Korean',
    },
    metaByLang: {
      zh: {
        title: '注册 - DuHan 韩语学习',
        description: '创建你的 DuHan 免费账号，马上开始系统化韩语学习。',
        keywords: '注册, 创建账号, 开始学习韩语',
      },
      vi: {
        title: 'Đăng ký - DuHan học tiếng Hàn',
        description:
          'Tạo tài khoản DuHan miễn phí và bắt đầu học tiếng Hàn ngay hôm nay.',
        keywords: 'đăng ký, tạo tài khoản, bắt đầu học tiếng Hàn',
      },
      mn: {
        title: 'Бүртгүүлэх - DuHan солонгос хэл',
        description:
          'DuHan дээр үнэгүй бүртгүүлж, солонгос хэл суралцах аяллаа өнөөдөр эхлүүлээрэй.',
        keywords: 'бүртгүүлэх, шинэ бүртгэл, солонгос хэл сурах',
      },
    },
  },
  {
    path: '/auth',
    indexable: false,
    noIndex: true,
    meta: {
      title: 'Authentication - DuHan',
      description: 'Secure authentication flow for DuHan accounts.',
      keywords: 'authentication, login callback',
    },
    metaByLang: {
      zh: {
        title: '账号验证 - DuHan',
        description: 'DuHan 账号的安全验证流程页面。',
        keywords: '账号验证, 登录回调',
      },
      vi: {
        title: 'Xác thực tài khoản - DuHan',
        description: 'Trang xác thực bảo mật cho tài khoản DuHan.',
        keywords: 'xác thực, callback đăng nhập',
      },
      mn: {
        title: 'Баталгаажуулалт - DuHan',
        description: 'DuHan бүртгэлийн аюулгүй баталгаажуулалтын урсгал.',
        keywords: 'баталгаажуулалт, нэвтрэх callback',
      },
    },
  },
  {
    path: '/forgot-password',
    indexable: false,
    noIndex: true,
    meta: {
      title: 'Forgot Password - DuHan',
      description:
        'Reset your DuHan account password. Enter your email to receive password reset instructions.',
      keywords: 'forgot password, reset password, account recovery',
    },
    metaByLang: {
      zh: {
        title: '忘记密码 - DuHan',
        description: '重置 DuHan 账号密码。输入邮箱以接收重置链接。',
        keywords: '忘记密码, 重置密码, 账户恢复',
      },
      vi: {
        title: 'Quên mật khẩu - DuHan',
        description: 'Đặt lại mật khẩu tài khoản DuHan. Nhập email để nhận liên kết đặt lại.',
        keywords: 'quên mật khẩu, đặt lại mật khẩu, khôi phục tài khoản',
      },
      mn: {
        title: 'Нууц үг мартсан - DuHan',
        description: 'DuHan бүртгэлийн нууц үгээ шинэчлэхийн тулд имэйл хаягаа оруулна уу.',
        keywords: 'нууц үг мартсан, нууц үг сэргээх, бүртгэл сэргээх',
      },
    },
  },
];

export const withLang = (lang, route) => {
  if (route === '/') return `/${lang}`;
  return `/${lang}${route}`;
};

const LANGUAGE_SET = new Set(SUPPORTED_LANGUAGES);

export const isSupportedLanguage = (lang) =>
  typeof lang === 'string' && LANGUAGE_SET.has(lang.toLowerCase());

export const normalizePathname = (path) => {
  if (!path) return '/';
  const pathname = String(path).split('?')[0].split('#')[0] || '/';
  const withLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const collapsedSlashes = withLeadingSlash.replace(/\/{2,}/g, '/');
  const normalized = collapsedSlashes.replace(/\/+$/, '') || '/';
  if (normalized === '/') return '/';

  const segments = normalized.split('/').filter(Boolean);
  if (segments.length === 0) return '/';

  const maybeLanguage = segments[0].toLowerCase();
  if (isSupportedLanguage(maybeLanguage)) {
    segments[0] = maybeLanguage;
  }

  return `/${segments.join('/')}`;
};

export const stripLanguagePrefix = (path) => {
  const normalized = normalizePathname(path);
  if (normalized === '/') return '/';

  const segments = normalized.split('/').filter(Boolean);
  if (segments.length > 0 && isSupportedLanguage(segments[0])) {
    if (segments.length === 1) return '/';
    return `/${segments.slice(1).join('/')}`;
  }

  return normalized;
};

export const extractLanguageFromPath = (path) => {
  const normalized = normalizePathname(path);
  if (normalized === '/') return null;

  const firstSegment = normalized.split('/').filter(Boolean)[0];
  if (!firstSegment) return null;

  const normalizedLanguage = firstSegment.toLowerCase();
  return isSupportedLanguage(normalizedLanguage) ? normalizedLanguage : null;
};

export const getRouteIndexLanguages = (route) => {
  if (!route?.indexable) return [DEFAULT_LANGUAGE];
  if (!Array.isArray(route.indexLanguages) || route.indexLanguages.length === 0) {
    return [...SUPPORTED_LANGUAGES];
  }
  const filtered = route.indexLanguages
    .map((lang) => String(lang).toLowerCase())
    .filter((lang) => isSupportedLanguage(lang));
  return filtered.length > 0 ? filtered : [DEFAULT_LANGUAGE];
};

export const getRouteByPath = (path) => {
  const normalizedPath = stripLanguagePrefix(path);
  return PUBLIC_ROUTES.find((route) => route.path === normalizedPath) || null;
};

export const resolveLocalizedPublicRoute = (route, lang) => {
  const language =
    typeof lang === 'string' && isSupportedLanguage(lang) ? lang.toLowerCase() : DEFAULT_LANGUAGE;
  const indexLanguages = getRouteIndexLanguages(route);
  const isLanguageIndexable = indexLanguages.includes(language);
  const localizedMeta = language !== DEFAULT_LANGUAGE ? route.metaByLang?.[language] : undefined;
  const resolvedMeta = localizedMeta ? { ...route.meta, ...localizedMeta } : route.meta;
  const canonicalLanguage = isLanguageIndexable
    ? language
    : indexLanguages[0] || DEFAULT_LANGUAGE;
  const indexable = Boolean(route.indexable && isLanguageIndexable && !route.noIndex);

  return {
    ...route,
    basePath: route.path,
    path: withLang(language, route.path),
    lang: language,
    meta: resolvedMeta,
    indexLanguages,
    hreflangLanguages: indexLanguages,
    canonicalPath: withLang(canonicalLanguage, route.path),
    indexable,
    noIndex: route.noIndex ? true : !indexable,
  };
};

export const resolveRouteSeo = (path) => {
  const normalizedPathname = normalizePathname(path);
  const language = extractLanguageFromPath(normalizedPathname) || DEFAULT_LANGUAGE;
  const route = getRouteByPath(normalizedPathname);
  if (!route) {
    return {
      routeExists: false,
      lang: language,
      basePath: stripLanguagePrefix(normalizedPathname),
      path: normalizedPathname,
      canonicalPath: normalizedPathname,
      hreflangLanguages: [...SUPPORTED_LANGUAGES],
      indexLanguages: [...SUPPORTED_LANGUAGES],
      indexable: false,
      noIndex: true,
      meta: null,
    };
  }
  return {
    routeExists: true,
    ...resolveLocalizedPublicRoute(route, language),
  };
};

export const buildLocalizedPublicRoutes = ({ includeNoIndex = true } = {}) =>
  SUPPORTED_LANGUAGES.flatMap((lang) =>
    PUBLIC_ROUTES.map((route) => resolveLocalizedPublicRoute(route, lang)).filter((route) =>
      includeNoIndex ? true : route.indexable
    )
  );

export const getLanguageRoutes = () =>
  buildLocalizedPublicRoutes({ includeNoIndex: true }).map((route) => route.path);
