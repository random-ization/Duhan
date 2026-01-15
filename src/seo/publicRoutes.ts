/**
 * Public routes configuration for SSG pre-rendering
 * These routes do not require authentication and can be pre-rendered
 */

export interface PublicRoute {
  path: string;
  meta: {
    title: string;
    description: string;
    keywords?: string;
  };
}

export const PUBLIC_ROUTES: PublicRoute[] = [
  {
    path: '/',
    meta: {
      title: 'DuHan - Learn Korean Online | Interactive Korean Learning Platform',
      description:
        "Master Korean with DuHan's interactive learning platform. Study vocabulary, grammar, TOPIK preparation, podcasts, and videos. Start your Korean learning journey today!",
      keywords:
        'Korean learning, learn Korean, Korean language, TOPIK, Korean vocabulary, Korean grammar, Korean courses',
    },
  },
  {
    path: '/login',
    meta: {
      title: 'Login - DuHan Korean Learning',
      description:
        'Sign in to DuHan to continue your Korean learning journey. Access your courses, progress, and personalized learning materials.',
      keywords: 'login, sign in, Korean learning login',
    },
  },
  {
    path: '/register',
    meta: {
      title: 'Sign Up - DuHan Korean Learning',
      description:
        'Create your free DuHan account and start learning Korean today. Join thousands of students mastering Korean with our interactive platform.',
      keywords: 'sign up, register, create account, start learning Korean',
    },
  },
  {
    path: '/pricing',
    meta: {
      title: 'Pricing Plans - DuHan Korean Learning',
      description:
        'Choose the perfect plan for your Korean learning journey. Access premium courses, TOPIK preparation, and exclusive content with DuHan.',
      keywords: 'pricing, plans, subscription, Korean learning courses',
    },
  },
  {
    path: '/terms',
    meta: {
      title: 'Terms of Service - DuHan',
      description:
        'Read the terms of service for DuHan Korean learning platform. Learn about user rights, responsibilities, and platform usage guidelines.',
      keywords: 'terms of service, legal, user agreement',
    },
  },
  {
    path: '/privacy',
    meta: {
      title: 'Privacy Policy - DuHan',
      description:
        'Learn how DuHan protects your privacy and handles your personal data. Our commitment to user privacy and data security.',
      keywords: 'privacy policy, data protection, user privacy',
    },
  },
  {
    path: '/refund',
    meta: {
      title: 'Refund Policy - DuHan',
      description:
        "Understand DuHan's refund policy for subscriptions and purchases. Learn about our refund process and eligibility requirements.",
      keywords: 'refund policy, money back, cancellation',
    },
  },
  {
    path: '/forgot-password',
    meta: {
      title: 'Forgot Password - DuHan',
      description:
        'Reset your DuHan account password. Enter your email to receive password reset instructions.',
      keywords: 'forgot password, reset password, account recovery',
    },
  },
];

// Export just the paths for sitemap generation
export const getPublicRoutePaths = (): string[] => {
  return PUBLIC_ROUTES.map(route => route.path);
};

// Get meta for a specific route
export const getRouteMeta = (path: string) => {
  const route = PUBLIC_ROUTES.find(r => r.path === path);
  return (
    route?.meta || {
      title: 'DuHan - Korean Learning Platform',
      description: "Learn Korean with DuHan's interactive platform",
      keywords: 'Korean learning, learn Korean',
    }
  );
};
