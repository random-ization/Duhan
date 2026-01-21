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
        'Korean learning, learn Korean, Korean language, TOPIK, Korean vocabulary, Korean grammar, Korean courses',
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
  },
];

export const withLang = (lang, route) => {
  if (route === '/') return `/${lang}`;
  return `/${lang}${route}`;
};

export const getLanguageRoutes = () =>
  SUPPORTED_LANGUAGES.flatMap((lang) => PUBLIC_ROUTES.map((route) => withLang(lang, route.path)));

