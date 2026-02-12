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
      title: 'Terms of Service - DuHan',
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
      title: 'Privacy Policy - DuHan',
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
      title: 'Refund Policy - DuHan',
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

export const getLanguageRoutes = () =>
  SUPPORTED_LANGUAGES.flatMap((lang) => PUBLIC_ROUTES.map((route) => withLang(lang, route.path)));
