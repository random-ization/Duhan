import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, Navigate } from 'react-router-dom';
import { useConvexAuth, useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { LocalizedLink } from '../components/LocalizedLink';
import { SEO as Seo } from '../seo/SEO';
import { getRouteMeta } from '../seo/publicRoutes';
import { runConvexActionWithRetry } from '../utils/convexActionRetry';
import { LanguageSwitcher } from '../components/common/LanguageSwitcher';
import { trackEvent } from '../utils/analytics';
import { buildPricingDetailsPath } from '../utils/subscriptionPlan';
import {
  ArrowRight,
  PlayCircle,
  Sparkles,
  Trophy,
  Check,
  BarChart3,
  Lock,
  BrainCircuit,
  Volume2,
  Zap,
  Bot,
  FileDown,
  Download,
  Mic2,
  PauseCircle,
  Play,
  ChevronDown,
  Gift,
  Menu,
  SkipBack,
  SkipForward,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../components/ui';

type PricePlan = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'LIFETIME';
type PriceEntry = { amount: string; currency: string; formatted: string };
type VariantPrices = {
  GLOBAL: Partial<Record<PricePlan, PriceEntry>>;
  REGIONAL: Partial<Record<PricePlan, PriceEntry>>;
};
type LandingFaqItem = { question: string; answer: string };
type LandingSeoLanguage = 'en' | 'zh' | 'vi' | 'mn';
type LandingPricingCopy = {
  freeFeatures: string[];
  proFeatures: string[];
  lifetimeFeatures: string[];
  rightsTitle: string;
  rightsSubtitle: string;
  rightsRows: Array<{ label: string; free: string; pro: string }>;
};
type LandingCopyTranslator = (key: string, options?: Record<string, unknown>) => string;

const LANDING_SEO_LANGUAGES = new Set<LandingSeoLanguage>(['en', 'zh', 'vi', 'mn']);

function normalizeLandingSeoLanguage(language: string): LandingSeoLanguage {
  return LANDING_SEO_LANGUAGES.has(language as LandingSeoLanguage)
    ? (language as LandingSeoLanguage)
    : 'en';
}

function getFeaturedGuidesForJsonLd(language: LandingSeoLanguage) {
  const guideSlugs = ['topik-guide', 'korean-vocabulary', 'topik-writing'] as const;

  return guideSlugs.map(slug => {
    const path = `/${language}/learn/${slug}`;
    const meta = getRouteMeta(path);
    return {
      name: meta.title,
      description: meta.description,
      url: `https://koreanstudy.me${path}`,
    };
  });
}

function resolveLandingPricingCopy(
  language: LandingSeoLanguage,
  t: LandingCopyTranslator
): LandingPricingCopy {
  return {
    freeFeatures: [
      t('landing.pricing.comparison.free.feature1', {
        defaultValue: 'First 2 units of every course are open',
      }),
      t('landing.pricing.comparison.free.feature2', {
        defaultValue: 'Core vocab drills with 20 new saves per day',
      }),
      t('landing.pricing.comparison.free.feature3', {
        defaultValue: 'Public sample TOPIK and writing papers',
      }),
      t('landing.pricing.comparison.free.feature4', {
        defaultValue: '2 full media plays per day and a small daily AI credit',
      }),
    ],
    proFeatures: [
      t('landing.pricing.comparison.pro.feature1', {
        defaultValue: 'All textbooks, all units, and the full learning path',
      }),
      t('landing.pricing.comparison.pro.feature2', {
        defaultValue: 'Full TOPIK and writing archive with long-term reports',
      }),
      t('landing.pricing.comparison.pro.feature3', {
        defaultValue: 'Unlimited media playback, speed control, and higher AI credits',
      }),
      t('landing.pricing.comparison.pro.feature4', {
        defaultValue: 'PDF export, analytics, and the full study toolkit',
      }),
    ],
    lifetimeFeatures: [
      t('landing.pricing.comparison.lifetime.feature1', {
        defaultValue: 'Includes every current Pro entitlement',
      }),
      t('landing.pricing.comparison.lifetime.feature2', {
        defaultValue: 'Future Pro features stay included',
      }),
      t('landing.pricing.comparison.lifetime.feature3', {
        defaultValue: 'One-time payment with no renewal',
      }),
    ],
    rightsTitle: t('landing.pricing.comparison.rightsTitle', {
      defaultValue: 'Quick comparison',
    }),
    rightsSubtitle: t('landing.pricing.comparison.rightsSubtitle', {
      defaultValue:
        'Free helps learners start. Pro and Lifetime unlock the full depth of the platform.',
    }),
    rightsRows: [
      {
        label: t('landing.pricing.comparison.rows.courses.label', { defaultValue: 'Courses' }),
        free: t('landing.pricing.comparison.rows.courses.free', { defaultValue: 'First 2 units' }),
        pro: t('landing.pricing.comparison.rows.courses.pro', {
          defaultValue: 'All courses and units',
        }),
      },
      {
        label: t('landing.pricing.comparison.rows.vocabulary.label', {
          defaultValue: 'Vocabulary',
        }),
        free: t('landing.pricing.comparison.rows.vocabulary.free', {
          defaultValue: '20 new words/day + 1 test/day',
        }),
        pro: t('landing.pricing.comparison.rows.vocabulary.pro', {
          defaultValue: 'Unlimited saves, tests, and analytics',
        }),
      },
      {
        label: t('landing.pricing.comparison.rows.topik.label', {
          defaultValue: 'TOPIK / Writing',
        }),
        free: t('landing.pricing.comparison.rows.topik.free', {
          defaultValue: 'Public sample papers',
        }),
        pro: t('landing.pricing.comparison.rows.topik.pro', {
          defaultValue: 'Full archive and reports',
        }),
      },
      {
        label: t('landing.pricing.comparison.rows.mediaAi.label', {
          defaultValue: 'Media / AI',
        }),
        free: t('landing.pricing.comparison.rows.mediaAi.free', {
          defaultValue: '2 plays/day + limited AI credits',
        }),
        pro: t('landing.pricing.comparison.rows.mediaAi.pro', {
          defaultValue: 'Unlimited playback + speed + 100 AI credits',
        }),
      },
    ],
  };
}

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' as const },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};
const useLandingScroll = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const previousScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = previousScrollBehavior;
    };
  }, []);

  return isScrolled;
};

const useFeatureCards = () => {
  const [expandedFeatureCards, setExpandedFeatureCards] = useState({
    pdf: false,
    podcast: false,
    video: false,
  });

  const toggleFeatureCard = (key: keyof typeof expandedFeatureCards) => {
    setExpandedFeatureCards(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return { expandedFeatureCards, toggleFeatureCard };
};

const LandingJsonLd = ({
  description,
  prices,
  faqItems,
  language,
  canonicalUrl,
  featuredGuidesListName,
}: {
  description: string;
  prices: VariantPrices | null;
  faqItems: LandingFaqItem[];
  language: LandingSeoLanguage;
  canonicalUrl: string;
  featuredGuidesListName: string;
}) => {
  const featuredGuides = getFeaturedGuidesForJsonLd(language);

  const getPrice = (plan: 'MONTHLY' | 'ANNUAL' | 'LIFETIME') => {
    // SEO Prices are usually Global
    const amount = prices?.GLOBAL?.[plan]?.amount;
    if (amount) {
      return amount;
    }
    if (plan === 'MONTHLY') return '6.90';
    if (plan === 'ANNUAL') return '49.00';
    return '99.00';
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'Organization',
              name: 'DuHan',
              url: 'https://koreanstudy.me',
              logo: 'https://koreanstudy.me/logo.png',
            },
            {
              '@type': 'WebSite',
              name: 'DuHan Korean Learning',
              url: 'https://koreanstudy.me',
              inLanguage: language,
              potentialAction: {
                '@type': 'SearchAction',
                target: {
                  '@type': 'EntryPoint',
                  urlTemplate: `https://koreanstudy.me/${language}/learn?q={search_term_string}`,
                },
                'query-input': 'required name=search_term_string',
              },
            },
            {
              '@type': 'SoftwareApplication',
              name: 'DuHan Korean Learning',
              description,
              applicationCategory: 'EducationalApplication',
              operatingSystem: 'Web',
              url: canonicalUrl,
              inLanguage: language,
              offers: [
                {
                  '@type': 'Offer',
                  name: 'Monthly Subscription',
                  price: getPrice('MONTHLY'),
                  priceCurrency: 'USD',
                  availability: 'https://schema.org/InStock',
                },
                {
                  '@type': 'Offer',
                  name: 'Annual Subscription',
                  price: getPrice('ANNUAL'),
                  priceCurrency: 'USD',
                  availability: 'https://schema.org/InStock',
                },
                {
                  '@type': 'Offer',
                  name: 'Lifetime Access',
                  price: getPrice('LIFETIME'),
                  priceCurrency: 'USD',
                  availability: 'https://schema.org/InStock',
                },
              ],
            },
            {
              '@type': 'FAQPage',
              mainEntity: faqItems.map(item => ({
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
              name: featuredGuidesListName,
              itemListElement: featuredGuides.map((guide, index) => ({
                '@type': 'ListItem',
                position: index + 1,
                name: guide.name,
                url: guide.url,
              })),
            },
            ...featuredGuides.map(guide => ({
              '@type': 'Course',
              name: guide.name,
              description: guide.description,
              inLanguage: language,
              provider: {
                '@type': 'Organization',
                name: 'DuHan',
                sameAs: 'https://koreanstudy.me',
              },
              hasCourseInstance: {
                '@type': 'CourseInstance',
                courseMode: 'online',
                url: guide.url,
              },
            })),
          ],
        }),
      }}
    />
  );
};

const LandingNav = ({
  isScrolled,
  mobileMenuOpen,
  setMobileMenuOpen,
}: {
  isScrolled: boolean;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useLocalizedNavigate();
  const language = normalizeLandingSeoLanguage(i18n.language);

  const trackLandingCta = (ctaId: string, placement: string, target: string) => {
    trackEvent('landing_cta_click', {
      language,
      ctaId,
      placement,
      target,
    });
  };

  return (
    <nav
      className={`fixed top-0 w-full z-50 h-20 transition-all duration-300 backdrop-blur-md border-b border-slate-200 ${
        isScrolled ? 'bg-white/95 shadow-sm' : 'bg-white/90'
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        <LocalizedLink to="/" className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt={t('common.appName')}
            className="w-10 h-10 rounded-xl shadow-lg dark:brightness-0 dark:invert"
          />
          <span className="font-heading font-bold text-2xl tracking-tight">
            {t('common.appName')}
          </span>
        </LocalizedLink>

        <div className="hidden md:flex items-center gap-8 font-semibold text-slate-500 text-sm">
          <a
            href="#topik"
            className="hover:text-emerald-600 dark:hover:text-emerald-300 transition-colors"
          >
            {t('landing.nav.topik')}
          </a>
          <a
            href="#fsrs"
            className="hover:text-brand-yellow dark:hover:text-amber-300 transition-colors"
          >
            {t('landing.nav.fsrs')}
          </a>
          <a
            href="#ai"
            className="hover:text-violet-500 dark:hover:text-violet-300 transition-colors"
          >
            {t('landing.nav.ai')}
          </a>
          <a href="#pricing" className="hover:text-black transition-colors">
            {t('landing.nav.pricing')}
          </a>
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={() => {
              trackLandingCta('nav_register', 'landing_nav_desktop', '/register');
              navigate('/register');
            }}
            className="bg-slate-900 text-white px-5 py-2.5 rounded-full font-bold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
          >
            {t('landing.nav.cta')}
          </Button>
          <div className="ml-6">
            <LanguageSwitcher />
          </div>
        </div>

        <div className="md:hidden flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="auto"
            className="p-2"
            aria-label={mobileMenuOpen ? t('landing.nav.closeMenu') : t('landing.nav.openMenu')}
            onClick={() => setMobileMenuOpen(v => !v)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
          <div className="ml-2">
            <LanguageSwitcher />
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-200 px-6 py-5 space-y-4">
          <div className="flex items-center justify-end">
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => {
                navigate('/login');
                setMobileMenuOpen(false);
              }}
              className="text-sm font-semibold text-slate-900"
            >
              {t('login')}
            </Button>
          </div>
          <div className="grid gap-3 text-sm font-semibold text-slate-900">
            <a href="#topik" onClick={() => setMobileMenuOpen(false)} className="py-2">
              {t('landing.nav.topik')}
            </a>
            <a href="#fsrs" onClick={() => setMobileMenuOpen(false)} className="py-2">
              {t('landing.nav.fsrs')}
            </a>
            <a href="#ai" onClick={() => setMobileMenuOpen(false)} className="py-2">
              {t('landing.nav.ai')}
            </a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="py-2">
              {t('landing.nav.pricing')}
            </a>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={() => {
              trackLandingCta('mobile_nav_register', 'landing_nav_mobile', '/register');
              navigate('/register');
              setMobileMenuOpen(false);
            }}
            className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold"
          >
            {t('landing.nav.cta')}
          </Button>
        </div>
      )}
    </nav>
  );
};

const LandingHero = () => {
  const { t, i18n } = useTranslation();
  const navigate = useLocalizedNavigate();
  const language = normalizeLandingSeoLanguage(i18n.language);

  return (
    <header className="pt-32 pb-20 md:pt-40 md:pb-32 px-4 md:px-6 relative overflow-hidden bg-[radial-gradient(110%_110%_at_50%_0%,hsl(var(--primary)/0.12)_0%,hsl(var(--background))_58%)] dark:bg-[radial-gradient(120%_120%_at_50%_0%,hsl(var(--primary)/0.30)_0%,hsl(var(--primary)/0.10)_38%,hsl(var(--background))_78%)]">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={staggerContainer}
        className="max-w-5xl mx-auto text-center relative z-10"
      >
        <motion.h1
          variants={fadeInUp}
          className="text-4xl md:text-8xl font-heading font-extrabold leading-[1.05] mb-6 md:mb-8 text-slate-900 tracking-tight"
        >
          {t('landing.hero.titleLine1')} <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-pink-500 dark:from-violet-300 dark:to-pink-300">
            {t('landing.hero.titleGradient')}
          </span>
        </motion.h1>

        <motion.p
          variants={fadeInUp}
          className="text-lg md:text-2xl text-slate-500 font-medium max-w-2xl mx-auto mb-8 md:mb-12 leading-relaxed"
        >
          {t('landing.hero.desc')}
        </motion.p>

        <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row justify-center gap-5">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              trackEvent('landing_cta_click', {
                language,
                ctaId: 'hero_primary_register',
                placement: 'landing_hero',
                target: '/register',
              });
              navigate('/register');
            }}
            className="px-6 py-4 md:px-10 md:py-5 bg-brand-yellow dark:bg-amber-300 border-2 border-black text-slate-900 text-base md:text-lg font-bold rounded-2xl shadow-pop hover:shadow-none transition-all flex items-center justify-center gap-3"
          >
            {t('landing.hero.ctaPrimary')}
            <ArrowRight className="w-5 h-5" />
          </motion.button>
          <motion.a
            href="#topik"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-4 md:px-10 md:py-5 bg-white text-slate-900 text-base md:text-lg font-bold rounded-2xl border-2 border-slate-200 hover:border-black hover:text-black transition-all flex items-center justify-center gap-3"
          >
            <PlayCircle className="w-5 h-5" />
            {t('landing.hero.ctaSecondary')}
          </motion.a>
        </motion.div>
      </motion.div>

      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-500/5 dark:bg-violet-400/10 rounded-full blur-3xl -z-10"
      />
    </header>
  );
};

const LandingStats = () => {
  const { t } = useTranslation();

  return (
    <div className="border-y border-slate-200 bg-white py-8 md:py-12">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={staggerContainer}
        className="max-w-6xl mx-auto px-4 md:px-6 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8"
      >
        <motion.div variants={fadeInUp} className="text-center">
          <div className="text-3xl md:text-4xl font-heading font-extrabold text-slate-900 mb-1">
            {t('landing.stats.topikCoverageValue')}
          </div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            {t('landing.stats.topikCoverageLabel')}
          </div>
        </motion.div>
        <motion.div variants={fadeInUp} className="text-center">
          <div className="text-4xl font-heading font-extrabold text-slate-900 mb-1">
            {t('landing.stats.aiValue')}
          </div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            {t('landing.stats.aiLabel')}
          </div>
        </motion.div>
        <motion.div variants={fadeInUp} className="text-center">
          <div className="text-3xl md:text-4xl font-heading font-extrabold text-slate-900 mb-1">
            {t('landing.stats.fsrsValue')}
          </div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            {t('landing.stats.fsrsLabel')}
          </div>
        </motion.div>
        <motion.div variants={fadeInUp} className="text-center">
          <div className="text-4xl font-heading font-extrabold text-slate-900 mb-1">
            {t('landing.stats.levelRange')}
          </div>
          <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            {t('landing.stats.levelSupportLabel')}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

const LandingTopik = () => {
  const { t } = useTranslation();

  return (
    <section id="topik" className="py-16 md:py-32 overflow-hidden bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center gap-12 md:gap-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={staggerContainer}
          className="md:w-1/2 relative z-10"
        >
          <motion.div
            variants={fadeInUp}
            className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-200 rounded-lg font-bold text-sm mb-6"
          >
            <Trophy className="w-4 h-4" />
            {t('landing.topik.badge')}
          </motion.div>
          <motion.h2
            variants={fadeInUp}
            className="text-3xl md:text-5xl font-heading font-bold mb-6 leading-tight"
          >
            {t('landing.topik.titleLine1')}
            <br />
            <span className="text-emerald-600 dark:text-emerald-300">
              {t('landing.topik.titleHighlight')}
            </span>
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-lg text-slate-500 mb-8 leading-relaxed">
            {t('landing.topik.desc')}
          </motion.p>
          <motion.ul variants={staggerContainer} className="space-y-4 mb-8">
            <motion.li variants={fadeInUp} className="flex items-start gap-4">
              <div className="bg-emerald-100 dark:bg-emerald-400/15 p-2 rounded-lg text-emerald-600 dark:text-emerald-200 mt-1">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">{t('landing.topik.point1Title')}</h3>
                <p className="text-sm text-slate-500">{t('landing.topik.point1Desc')}</p>
              </div>
            </motion.li>
            <motion.li variants={fadeInUp} className="flex items-start gap-4">
              <div className="bg-emerald-100 dark:bg-emerald-400/15 p-2 rounded-lg text-emerald-600 dark:text-emerald-200 mt-1">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">{t('landing.topik.point2Title')}</h3>
                <p className="text-sm text-slate-500">{t('landing.topik.point2Desc')}</p>
              </div>
            </motion.li>
          </motion.ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8 }}
          className="md:w-1/2 relative"
        >
          <div className="absolute inset-0 bg-emerald-500/10 dark:bg-emerald-400/15 rounded-[3rem] transform rotate-3 scale-105 -z-10" />
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 p-4 flex gap-2 items-center">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400 dark:bg-rose-300" />
                <div className="w-3 h-3 rounded-full bg-yellow-400 dark:bg-amber-300" />
                <div className="w-3 h-3 rounded-full bg-green-400 dark:bg-emerald-300" />
              </div>
              <div className="mx-auto bg-white px-4 py-1 rounded-md text-xs font-bold text-slate-500 shadow-sm border border-slate-200 flex items-center gap-2">
                <Lock className="w-3 h-3" /> {t('landing.topik.mockDomain')}
              </div>
            </div>
            <div className="p-8">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="font-bold text-xl">{t('landing.topik.mockTitle')}</h3>
                  <p className="text-sm text-slate-500">{t('landing.topik.mockSubtitle')}</p>
                </div>
                <div className="bg-red-50 text-red-600 dark:bg-rose-400/12 dark:text-rose-200 px-4 py-2 rounded-xl font-mono font-bold border border-red-100 dark:border-rose-300/30">
                  58:42
                </div>
              </div>
              <div className="space-y-6">
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                  <p className="font-bold mb-4 text-lg">{t('landing.topik.mockQuestion')}</p>
                  <p className="mb-4 text-slate-900">{t('landing.topik.mockStem')}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="auto"
                      className="p-3 bg-white border border-slate-200 rounded-lg hover:border-emerald-600 dark:hover:border-emerald-300 cursor-pointer flex gap-3 items-center"
                    >
                      <div className="w-5 h-5 rounded-full border border-slate-200" />
                      {t('landing.topik.mockChoice1')}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="auto"
                      className="p-3 bg-emerald-600 dark:bg-emerald-400 text-primary-foreground dark:text-primary-foreground border border-emerald-600 dark:border-emerald-300 rounded-lg shadow-md cursor-pointer flex gap-3 items-center"
                    >
                      <div className="w-5 h-5 rounded-full border-2 border-primary-foreground/40 flex items-center justify-center text-[10px]">
                        ✓
                      </div>
                      {t('landing.topik.mockChoice2')}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="auto"
                      className="p-3 bg-white border border-slate-200 rounded-lg cursor-pointer flex gap-3 items-center"
                    >
                      <div className="w-5 h-5 rounded-full border border-slate-200" />
                      {t('landing.topik.mockChoice3')}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="auto"
                      className="p-3 bg-white border border-slate-200 rounded-lg cursor-pointer flex gap-3 items-center"
                    >
                      <div className="w-5 h-5 rounded-full border border-slate-200" />
                      {t('landing.topik.mockChoice4')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const LandingFsrs = () => {
  const { t } = useTranslation();

  return (
    <section id="fsrs" className="py-16 md:py-32 bg-slate-50 relative border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col md:flex-row-reverse items-center gap-12 md:gap-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={staggerContainer}
          className="md:w-1/2"
        >
          <motion.div
            variants={fadeInUp}
            className="inline-flex items-center gap-2 px-3 py-1 bg-brand-yellow/30 dark:bg-amber-300/20 text-slate-900 rounded-lg font-bold text-sm mb-6"
          >
            <BrainCircuit className="w-4 h-4" />
            {t('landing.fsrs.badge')}
          </motion.div>
          <motion.h2
            variants={fadeInUp}
            className="text-4xl md:text-5xl font-heading font-bold mb-6 leading-tight"
          >
            {t('landing.fsrs.titleLine1')}
            <br />
            <span className="text-brand-yellow dark:text-amber-300 drop-shadow-sm">
              {t('landing.fsrs.titleHighlight')}
            </span>
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-lg text-slate-500 mb-8 leading-relaxed">
            {t('landing.fsrs.desc')}
          </motion.p>
          <motion.div variants={fadeInUp} className="grid grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <div className="text-3xl font-bold text-slate-900 mb-1">
                {t('landing.fsrs.stat1Value')}
              </div>
              <div className="text-sm font-bold text-slate-500">{t('landing.fsrs.stat1Label')}</div>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <div className="text-3xl font-bold text-slate-900 mb-1">
                {t('landing.fsrs.stat2Value')}
              </div>
              <div className="text-sm font-bold text-slate-500">{t('landing.fsrs.stat2Label')}</div>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8 }}
          className="md:w-1/2 relative"
        >
          <div className="absolute -inset-4 bg-gradient-to-tr from-brand-yellow/20 to-orange-100 dark:from-amber-300/20 dark:to-orange-400/15 rounded-full blur-3xl opacity-60" />
          <div className="relative grid gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-2xl border-2 border-black transform md:-rotate-3 z-20">
              <div className="flex justify-between items-start mb-8">
                <span className="bg-slate-50 px-2 py-1 rounded text-xs font-bold text-slate-500">
                  {t('landing.fsrs.cardBadge')}
                </span>
                <Volume2 className="w-5 h-5 text-slate-500" />
              </div>
              <div className="text-center py-8">
                <div className="text-4xl font-extrabold text-slate-900 mb-2">
                  {t('landing.fsrs.word')}
                </div>
                <div className="text-xl text-slate-500 font-serif italic">
                  {t('landing.fsrs.wordMeaning')}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-8">
                <Button
                  type="button"
                  variant="ghost"
                  size="auto"
                  className="py-2 rounded-lg bg-red-50 text-red-600 dark:bg-rose-400/12 dark:text-rose-200 text-xs font-bold border border-red-100 dark:border-rose-300/30 !block text-center"
                >
                  {t('landing.fsrs.rateAgain')}
                  <br />
                  <span className="opacity-60">{t('landing.fsrs.rateAgainHint')}</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="auto"
                  className="py-2 rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-400/12 dark:text-orange-200 text-xs font-bold border border-orange-100 dark:border-orange-300/30 !block text-center"
                >
                  {t('landing.fsrs.rateHard')}
                  <br />
                  <span className="opacity-60">{t('landing.fsrs.rateHardHint')}</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="auto"
                  className="py-2 rounded-lg bg-green-50 text-green-600 dark:bg-emerald-400/12 dark:text-emerald-200 text-xs font-bold border border-green-100 dark:border-emerald-300/30 !block text-center"
                >
                  {t('landing.fsrs.rateGood')}
                  <br />
                  <span className="opacity-60">{t('landing.fsrs.rateGoodHint')}</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="auto"
                  className="py-2 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-400/12 dark:text-blue-200 text-xs font-bold border border-blue-100 dark:border-blue-300/30 !block text-center"
                >
                  {t('landing.fsrs.rateEasy')}
                  <br />
                  <span className="opacity-60">{t('landing.fsrs.rateEasyHint')}</span>
                </Button>
              </div>
            </div>
            <div className="absolute top-4 left-4 w-full h-full bg-brand-yellow/30 dark:bg-amber-300/20 rounded-2xl border-2 border-black -z-10 transform rotate-2" />
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const LandingAi = ({ userAvatar }: { userAvatar: string }) => {
  const { t } = useTranslation();

  return (
    <section id="ai" className="py-16 md:py-32 bg-white border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center gap-12 md:gap-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={staggerContainer}
          className="md:w-1/2"
        >
          <motion.div
            variants={fadeInUp}
            className="inline-flex items-center gap-2 px-3 py-1 bg-violet-100 text-violet-600 dark:bg-violet-400/15 dark:text-violet-200 rounded-lg font-bold text-sm mb-6"
          >
            <Sparkles className="w-4 h-4" />
            {t('landing.ai.badge')}
          </motion.div>
          <motion.h2
            variants={fadeInUp}
            className="text-3xl md:text-5xl font-heading font-bold mb-6 leading-tight"
          >
            {t('landing.ai.titleLine1')}
            <br />
            <span className="text-violet-600 dark:text-violet-300">
              {t('landing.ai.titleHighlight')}
            </span>
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-lg text-slate-500 mb-8 leading-relaxed">
            {t('landing.ai.desc')}
          </motion.p>
          <motion.div
            variants={fadeInUp}
            className="bg-slate-50 p-6 rounded-2xl border border-slate-200"
          >
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-violet-600 dark:text-violet-300" />
              {t('landing.ai.supportTitle')}
            </h3>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-sm">
                {t('landing.ai.feature1')}
              </span>
              <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-sm">
                {t('landing.ai.feature2')}
              </span>
              <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-sm">
                {t('landing.ai.feature3')}
              </span>
              <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-sm">
                {t('landing.ai.feature4')}
              </span>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8 }}
          className="md:w-1/2 relative"
        >
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-w-md mx-auto">
            <div className="bg-violet-600 dark:bg-violet-500 p-6 text-primary-foreground dark:text-primary-foreground">
              <div className="font-bold text-lg mb-1">{t('landing.ai.chatTitle')}</div>
              <div className="text-violet-200 dark:text-violet-100 text-sm">
                {t('landing.ai.chatSubtitle')}
              </div>
            </div>
            <div className="p-6 space-y-6 bg-slate-50 min-h-[400px]">
              <div className="flex gap-4 flex-row-reverse">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex-shrink-0 overflow-hidden">
                  <img src={userAvatar} alt={t('landing.ai.userAlt')} className="w-full h-full" />
                </div>
                <div className="bg-violet-600 dark:bg-violet-500 text-primary-foreground dark:text-primary-foreground p-4 rounded-2xl rounded-tr-none shadow-md max-w-[80%]">
                  <p className="text-sm">{t('landing.ai.userQuestion')}</p>
                  <p className="text-xs bg-white/20 mt-2 p-2 rounded">
                    {t('landing.ai.userExample')}
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 text-primary-foreground">
                  <Bot className="w-6 h-6" />
                </div>
                <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-slate-200 max-w-[90%]">
                  <p className="text-sm text-slate-900 leading-relaxed">
                    {t('landing.ai.botAnswer')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const LandingToolbox = ({
  expandedFeatureCards,
  toggleFeatureCard,
}: {
  expandedFeatureCards: { pdf: boolean; podcast: boolean; video: boolean };
  toggleFeatureCard: (key: 'pdf' | 'podcast' | 'video') => void;
}) => {
  const { t } = useTranslation();

  return (
    <section className="py-16 md:py-24 px-4 md:px-6 relative overflow-hidden bg-white text-slate-900">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-7xl font-heading font-extrabold tracking-tight mb-5"
          >
            {t('landing.toolbox.title')}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-2xl text-slate-500 max-w-2xl mx-auto"
          >
            {t('landing.toolbox.subtitle')}
          </motion.p>
        </div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start"
        >
          {/* Card 1: PDF */}
          <motion.div
            variants={fadeInUp}
            className={`group bg-slate-50 rounded-3xl border border-slate-200 hover:border-amber-400 dark:hover:border-amber-300 hover:bg-slate-50 transition-all duration-300 overflow-hidden relative flex flex-col shadow-sm ${
              expandedFeatureCards.pdf
                ? 'ring-2 ring-amber-400 dark:ring-amber-300 md:min-h-[760px] shadow-xl'
                : ''
            }`}
          >
            <Button
              type="button"
              variant="ghost"
              size="auto"
              aria-expanded={expandedFeatureCards.pdf}
              onClick={() => toggleFeatureCard('pdf')}
              className="p-6 md:p-8 flex flex-col w-full text-left outline-none"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-400/15 dark:text-amber-200 flex items-center justify-center text-xl md:text-2xl group-hover:scale-110 transition-transform duration-300">
                  <FileDown className="w-6 h-6 md:w-7 md:h-7" />
                </div>
                <div
                  className={`p-2 rounded-full hover:bg-slate-50 transition-colors ${expandedFeatureCards.pdf ? 'bg-slate-50' : ''}`}
                >
                  <ChevronDown
                    className={`w-6 h-6 text-slate-500 transition-transform duration-300 ${
                      expandedFeatureCards.pdf ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-2 text-slate-900 group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors">
                {t('landing.toolbox.card1Title')}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-4">
                {t('landing.toolbox.card1Desc')}
              </p>
            </Button>

            <div
              className={`grid transition-all duration-500 ease-in-out ${
                expandedFeatureCards.pdf
                  ? 'grid-rows-[1fr] opacity-100'
                  : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                <div className="px-8 pb-8 pt-0 flex flex-col">
                  <div className="pt-6 border-t border-slate-200 flex-1 flex flex-col">
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs text-slate-500 shadow-sm">
                        <strong className="text-amber-600 dark:text-amber-300 block mb-1">
                          {t('landing.toolbox.demo.pdf.block1Title')}
                        </strong>
                        {t('landing.toolbox.demo.pdf.block1Value')}
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs text-slate-500 shadow-sm">
                        <strong className="text-amber-600 dark:text-amber-300 block mb-1">
                          {t('landing.toolbox.demo.pdf.block2Title')}
                        </strong>
                        {t('landing.toolbox.demo.pdf.block2Value')}
                      </div>
                    </div>

                    <div className="relative w-full bg-white text-slate-900 p-6 rounded-sm shadow-lg border border-slate-200 transform hover:scale-[1.02] transition-transform duration-500 mb-6 font-sans">
                      <div className="flex justify-between items-end border-b-2 border-black pb-3 mb-4">
                        <div>
                          <h4 className="font-bold text-lg leading-none">
                            {t('landing.toolbox.demo.pdf.sheetTitle')}
                          </h4>
                          <div className="flex gap-2 mt-2">
                            <span className="text-[10px] bg-slate-50 px-1 border border-slate-200">
                              {t('landing.toolbox.demo.pdf.badge1')}
                            </span>
                            <span className="text-[10px] bg-slate-900 text-white px-1">
                              {t('landing.toolbox.demo.pdf.badge2')}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-xs">www.koreanstudy.me</div>
                          <div className="text-[8px] text-slate-500">
                            {t('landing.toolbox.demo.pdf.siteTagline')}
                          </div>
                        </div>
                      </div>

                      <table className="w-full text-left">
                        <thead className="bg-slate-50 border-y border-slate-200 text-[10px] font-bold text-slate-500">
                          <tr>
                            <th className="py-1 pl-2 w-8">#</th>
                            <th className="py-1">{t('landing.toolbox.demo.pdf.tableWord')}</th>
                            <th className="py-1">{t('landing.toolbox.demo.pdf.tableMeaning')}</th>
                            <th className="py-1 w-12 text-center">
                              {t('landing.toolbox.demo.pdf.tableQuiz')}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="text-sm">
                          <tr className="border-b border-slate-200">
                            <td className="py-3 pl-2 text-slate-500 text-xs font-mono">01</td>
                            <td className="py-3 font-bold font-serif text-lg">더운물</td>
                            <td className="py-3 text-slate-500 text-xs">
                              {t('landing.toolbox.demo.pdf.meaning1')}
                            </td>
                            <td className="py-3 text-center">
                              <div className="w-4 h-4 border border-slate-200 rounded mx-auto" />
                            </td>
                          </tr>
                          <tr className="border-b border-slate-200">
                            <td className="py-3 pl-2 text-slate-500 text-xs font-mono">02</td>
                            <td className="py-3 font-bold font-serif text-lg">먹다</td>
                            <td className="py-3 text-slate-500 text-xs">
                              {t('landing.toolbox.demo.pdf.meaning2')}
                            </td>
                            <td className="py-3 text-center">
                              <div className="w-4 h-4 border border-slate-200 rounded mx-auto" />
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      <div className="mt-6 pt-2 border-t border-slate-200 flex justify-between items-center text-[8px] text-slate-500">
                        <span>{t('landing.toolbox.demo.pdf.footerLeft')}</span>
                        <span>{t('landing.toolbox.demo.pdf.footerRight')}</span>
                      </div>

                      <div
                        className="absolute bottom-0 right-0 w-8 h-8 bg-gradient-to-tl from-slate-200 to-white shadow-sm"
                        style={{ clipPath: 'polygon(100% 0, 0 100%, 100% 100%)' }}
                      />
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="auto"
                      onClick={e => e.stopPropagation()}
                      className="w-full py-3 bg-amber-400 dark:bg-amber-300 text-slate-900 font-bold rounded-xl hover:bg-amber-500 dark:hover:bg-amber-200 hover:text-primary-foreground dark:hover:text-black transition-colors shadow-lg shadow-amber-100 dark:shadow-amber-400/20 flex justify-center gap-2 items-center mt-auto"
                    >
                      <Download className="w-4 h-4" /> {t('landing.toolbox.card1Cta')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 2: Podcast */}
          <motion.div
            variants={fadeInUp}
            className={`group rounded-3xl border transition-all duration-300 overflow-hidden relative flex flex-col shadow-sm bg-gradient-to-b from-pink-50/80 via-white to-white dark:from-pink-400/10 dark:via-white dark:to-white border-pink-300/60 dark:border-pink-300/35 hover:border-pink-400 dark:hover:border-pink-200 ${
              expandedFeatureCards.podcast
                ? 'ring-2 ring-pink-400 dark:ring-pink-300 md:min-h-[760px] shadow-xl'
                : ''
            }`}
          >
            <div className="pointer-events-none absolute -top-20 -right-12 h-52 w-52 rounded-full bg-pink-300/25 blur-3xl dark:bg-pink-400/20" />
            <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-fuchsia-300/20 blur-3xl dark:bg-fuchsia-400/15" />
            <Button
              type="button"
              variant="ghost"
              size="auto"
              aria-expanded={expandedFeatureCards.podcast}
              onClick={() => toggleFeatureCard('podcast')}
              className="p-6 md:p-8 flex flex-col w-full text-left outline-none"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-pink-100 text-pink-600 dark:bg-pink-400/15 dark:text-pink-200 flex items-center justify-center text-xl md:text-2xl group-hover:scale-110 transition-transform duration-300">
                  <Mic2 className="w-6 h-6 md:w-7 md:h-7" />
                </div>
                <div
                  className={`p-2 rounded-full hover:bg-pink-100/80 dark:hover:bg-pink-400/20 transition-colors ${expandedFeatureCards.podcast ? 'bg-pink-100/70 dark:bg-pink-400/20' : ''}`}
                >
                  <ChevronDown
                    className={`w-6 h-6 text-slate-500 transition-transform duration-300 ${
                      expandedFeatureCards.podcast ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-2 text-slate-900 group-hover:text-pink-600 dark:group-hover:text-pink-300 transition-colors">
                {t('landing.toolbox.card2Title')}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-4">
                {t('landing.toolbox.card2Desc')}
              </p>
            </Button>

            <div
              className={`grid transition-all duration-500 ease-in-out ${
                expandedFeatureCards.podcast
                  ? 'grid-rows-[1fr] opacity-100'
                  : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                <div className="px-8 pb-8 pt-0 flex flex-col">
                  <div className="pt-6 border-t border-slate-200 flex-1 flex flex-col">
                    <ul className="space-y-2 text-sm text-slate-500 mb-6">
                      <li className="flex gap-2">
                        <Check className="w-4 h-4 text-pink-500 dark:text-pink-300" />
                        <strong className="text-slate-900">
                          {t('landing.toolbox.card2Point1Title')}
                        </strong>
                        : {t('landing.toolbox.card2Point1Desc')}
                      </li>
                      <li className="flex gap-2">
                        <Check className="w-4 h-4 text-pink-500 dark:text-pink-300" />
                        <strong className="text-slate-900">
                          {t('landing.toolbox.card2Point2Title')}
                        </strong>
                        : {t('landing.toolbox.card2Point2Desc')}
                      </li>
                    </ul>

                    <div className="bg-white/95 border border-pink-200 dark:border-pink-300/35 rounded-xl overflow-hidden mb-6 relative shadow-lg">
                      <div className="bg-pink-50/80 dark:bg-pink-400/10 p-3 flex items-center gap-3 border-b border-pink-100 dark:border-pink-300/25">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-fuchsia-600 flex items-center justify-center animate-pulse">
                          <BarChart3 className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] text-slate-500">
                            {t('landing.toolbox.demo.podcast.nowPlaying')}
                          </div>
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {t('landing.toolbox.demo.podcast.episodeTitle')}
                          </div>
                        </div>
                      </div>

                      <div className="p-6">
                        <div className="flex justify-center gap-6 items-center mb-6">
                          <SkipBack className="w-5 h-5 text-slate-500" />
                          <div className="w-12 h-12 rounded-full bg-pink-500 text-white flex items-center justify-center shadow-lg hover:bg-pink-600 transition-colors">
                            <PauseCircle className="w-8 h-8" />
                          </div>
                          <SkipForward className="w-5 h-5 text-slate-500" />
                        </div>
                        <div className="space-y-3">
                          <div className="h-1 bg-slate-50 rounded-full overflow-hidden">
                            <div className="h-full bg-pink-500 w-1/3 rounded-full relative">
                              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-pink-600 rounded-full shadow-lg" />
                            </div>
                          </div>
                          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                            <span>04:12</span>
                            <span>12:45</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-pink-50/70 dark:bg-pink-400/10 p-4 border-t border-pink-100 dark:border-pink-300/25 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-300 uppercase tracking-wider">
                            {t('landing.toolbox.demo.podcast.liveTranscript')}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed italic">
                          &quot;... {t('landing.toolbox.demo.podcast.transcriptFragment')} ...&quot;
                        </p>
                        <p className="text-xs text-slate-900">
                          {t('landing.toolbox.demo.podcast.translation')}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="auto"
                      onClick={e => e.stopPropagation()}
                      className="w-full py-3 bg-gradient-to-r from-pink-500 to-fuchsia-500 dark:from-pink-500 dark:to-fuchsia-500 text-primary-foreground font-bold rounded-xl hover:from-pink-600 hover:to-fuchsia-600 dark:hover:from-pink-400 dark:hover:to-fuchsia-400 transition-colors shadow-lg shadow-pink-100 dark:shadow-pink-400/25 mt-auto flex justify-center items-center"
                    >
                      {t('landing.toolbox.card2Cta')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 3: Video */}
          <motion.div
            variants={fadeInUp}
            className={`group rounded-3xl border transition-all duration-300 overflow-hidden relative flex flex-col shadow-sm bg-gradient-to-b from-violet-50/80 via-white to-white dark:from-violet-400/10 dark:via-white dark:to-white border-violet-300/60 dark:border-violet-300/35 hover:border-violet-400 dark:hover:border-violet-200 ${
              expandedFeatureCards.video
                ? 'ring-2 ring-violet-400 dark:ring-violet-300 md:min-h-[760px] shadow-xl'
                : ''
            }`}
          >
            <div className="pointer-events-none absolute -top-20 -left-12 h-52 w-52 rounded-full bg-violet-300/25 blur-3xl dark:bg-violet-400/20" />
            <div className="pointer-events-none absolute -bottom-24 -right-16 h-56 w-56 rounded-full bg-purple-300/20 blur-3xl dark:bg-purple-400/15" />
            <Button
              type="button"
              variant="ghost"
              size="auto"
              aria-expanded={expandedFeatureCards.video}
              onClick={() => toggleFeatureCard('video')}
              className="p-6 md:p-8 flex flex-col w-full text-left outline-none"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-400/15 dark:text-violet-200 flex items-center justify-center text-xl md:text-2xl group-hover:scale-110 transition-transform duration-300">
                  <PlayCircle className="w-6 h-6 md:w-7 md:h-7" />
                </div>
                <div
                  className={`p-2 rounded-full hover:bg-slate-50 transition-colors ${
                    expandedFeatureCards.video
                      ? 'bg-violet-100/70 dark:bg-violet-400/20'
                      : 'hover:bg-violet-100/80 dark:hover:bg-violet-400/20'
                  }`}
                >
                  <ChevronDown
                    className={`w-6 h-6 text-slate-500 transition-transform duration-300 ${
                      expandedFeatureCards.video ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-2 text-slate-900 group-hover:text-violet-600 dark:group-hover:text-violet-300 transition-colors">
                {t('landing.toolbox.card3Title')}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-4">
                {t('landing.toolbox.card3Desc')}
              </p>
            </Button>

            <div
              className={`grid transition-all duration-500 ease-in-out ${
                expandedFeatureCards.video
                  ? 'grid-rows-[1fr] opacity-100'
                  : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                <div className="px-8 pb-8 pt-0 flex flex-col">
                  <div className="pt-6 border-t border-slate-200 flex-1 flex flex-col">
                    <div className="bg-black rounded-xl overflow-hidden mb-6 aspect-video relative group/vid shadow-xl border border-violet-300/30 dark:border-violet-300/40">
                      <img
                        src="https://images.unsplash.com/photo-1540653542719-7243b614f1d9?auto=format&fit=crop&q=80&w=800"
                        alt="Video learning demo"
                        className="w-full h-full object-cover opacity-80 group-hover/vid:opacity-60 transition-opacity"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-violet-600 flex items-center justify-center text-white shadow-xl transform group-hover/vid:scale-110 transition-transform">
                          <Play className="w-6 h-6 fill-current" />
                        </div>
                      </div>
                      <div className="absolute top-3 left-3 bg-black/45 backdrop-blur-md rounded-md border border-white/20 px-2 py-1">
                        <p className="text-[10px] uppercase tracking-wider text-violet-200 font-bold">
                          {t('landing.toolbox.demo.video.aiTitle')}
                        </p>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black to-transparent">
                        <div className="flex flex-col gap-2">
                          <div className="bg-white/10 backdrop-blur-md p-2 rounded-lg border border-white/20">
                            <div className="text-[10px] text-violet-300 font-bold mb-0.5">
                              {t('landing.toolbox.demo.video.subtitle')}
                            </div>
                            <div className="text-xs text-white font-medium">
                              {t('landing.toolbox.demo.video.gloss')}
                            </div>
                          </div>
                          <div className="bg-violet-600/30 backdrop-blur-md p-2 rounded-lg border border-violet-500/30">
                            <div className="text-[10px] text-violet-200 font-bold mb-0.5">
                              TRANSLATION
                            </div>
                            <div className="text-xs text-white/90">
                              {t('landing.toolbox.demo.video.translation')}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-6 text-xs">
                      <div className="rounded-lg border border-violet-200/80 dark:border-violet-300/35 bg-violet-50/70 dark:bg-violet-400/10 p-3">
                        <p className="text-violet-700 dark:text-violet-200 font-bold mb-1">
                          {t('landing.toolbox.demo.video.baseForm')}
                        </p>
                        <p className="text-slate-900">
                          {t('landing.toolbox.demo.video.baseFormValue')}
                        </p>
                      </div>
                      <div className="rounded-lg border border-fuchsia-200/80 dark:border-fuchsia-300/35 bg-fuchsia-50/70 dark:bg-fuchsia-400/10 p-3">
                        <p className="text-fuchsia-700 dark:text-fuchsia-200 font-bold mb-1">
                          {t('landing.toolbox.demo.video.grammar')}
                        </p>
                        <p className="text-slate-900">
                          {t('landing.toolbox.demo.video.grammarValue')}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="auto"
                      onClick={e => e.stopPropagation()}
                      className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 dark:from-violet-500 dark:to-purple-500 text-primary-foreground font-bold rounded-xl hover:from-violet-700 hover:to-purple-700 dark:hover:from-violet-400 dark:hover:to-purple-400 transition-colors shadow-lg shadow-violet-100 dark:shadow-violet-400/25 mt-auto flex justify-center items-center"
                    >
                      {t('landing.toolbox.card3Cta')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

const LandingTyping = ({ navigate }: { navigate: (path: string) => void }) => {
  const { t } = useTranslation();

  return (
    <section className="py-16 md:py-24 bg-white relative overflow-hidden">
      {/* Background Blobs */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-blue-50 dark:bg-blue-400/12 rounded-full blur-3xl opacity-50 pointer-events-none"
      />
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 2,
        }}
        className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-slate-50 rounded-full blur-3xl opacity-50 pointer-events-none"
      />

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-10 md:gap-16">
          {/* Left Content */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
            className="lg:w-1/2 space-y-8 text-left"
          >
            <motion.div
              variants={fadeInUp}
              className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 dark:bg-blue-400/12 dark:text-blue-200 rounded-full text-sm font-bold border border-blue-100 dark:border-blue-300/30"
            >
              <span className="w-2 h-2 rounded-full bg-blue-500 dark:bg-blue-300 animate-pulse" />
              {t('landing.typing.badge')}
            </motion.div>

            <motion.h2
              variants={fadeInUp}
              className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight tracking-tight"
            >
              {t('landing.typing.titleLine1')}
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500 dark:from-blue-300 dark:to-cyan-300">
                {t('landing.typing.titleHighlight')}
              </span>
            </motion.h2>

            <motion.p
              variants={fadeInUp}
              className="text-lg text-slate-500 leading-relaxed max-w-xl"
            >
              {t('landing.typing.desc')}
            </motion.p>

            <motion.div variants={staggerContainer} className="space-y-4">
              <motion.div variants={fadeInUp} className="flex items-start gap-3">
                <div className="mt-1 w-5 h-5 rounded-full bg-green-100 dark:bg-emerald-400/15 flex items-center justify-center text-green-600 dark:text-emerald-200 flex-shrink-0">
                  <Check className="w-3 h-3" strokeWidth={3} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {t('landing.typing.feature1Title')}
                  </h3>
                  <p className="text-slate-500 text-sm">{t('landing.typing.feature1Desc')}</p>
                </div>
              </motion.div>
              <motion.div variants={fadeInUp} className="flex items-start gap-3">
                <div className="mt-1 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-400/15 flex items-center justify-center text-blue-600 dark:text-blue-200 flex-shrink-0">
                  <Check className="w-3 h-3" strokeWidth={3} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {t('landing.typing.feature2Title')}
                  </h3>
                  <p className="text-slate-500 text-sm">{t('landing.typing.feature2Desc')}</p>
                </div>
              </motion.div>
            </motion.div>

            <motion.div variants={fadeInUp} className="pt-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/learn?module=typing')}
                className="px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-all shadow-lg flex items-center gap-2 group"
              >
                <span>{t('landing.typing.cta')}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Right Preview */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.8 }}
            className="lg:w-1/2 w-full"
          >
            <div className="relative bg-slate-50 rounded-2xl border border-slate-200 shadow-2xl overflow-hidden group">
              <div className="p-6 md:p-8 flex flex-col items-center justify-center min-h-[400px]">
                {/* Stats Header */}
                <div className="text-center mb-10 w-full max-w-md">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
                    {t('landing.typing.preview.label', 'TYPING PREVIEW')}
                  </p>
                  <div className="text-3xl md:text-4xl font-bold leading-relaxed tracking-tight">
                    <span className="text-slate-900">
                      {t('landing.typing.preview.text1', '한')}
                    </span>
                    <span className="text-slate-900">
                      {t('landing.typing.preview.text2', '국')}
                    </span>
                    <span className="text-blue-600 dark:text-blue-300 relative inline-block mx-0.5">
                      {t('landing.typing.preview.text3', '어')}
                      <span className="absolute -right-0.5 top-1 bottom-1 w-0.5 bg-blue-600 dark:bg-blue-300 animate-pulse rounded-full" />
                    </span>
                    <span className="text-slate-300">
                      {t('landing.typing.preview.text4', '를 배워요')}
                    </span>
                  </div>
                  <div className="mt-6 flex justify-center gap-4 text-sm font-medium text-slate-500">
                    <div className="px-3 py-1 bg-white rounded border border-slate-200 shadow-sm">
                      {t('landing.typing.preview.wpmLabel', 'WPM')}:{' '}
                      <span className="text-slate-900 font-bold">210</span>
                    </div>
                    <div className="px-3 py-1 bg-white rounded border border-slate-200 shadow-sm">
                      {t('landing.typing.preview.accLabel', 'Acc')}:{' '}
                      <span className="text-green-600 dark:text-emerald-300 font-bold">98%</span>
                    </div>
                  </div>
                </div>

                {/* Keyboard Visual */}
                <div className="w-full bg-white p-4 rounded-xl border border-slate-200 shadow-sm select-none transform transition-transform group-hover:scale-[1.02]">
                  <div className="flex justify-between items-center mb-3 px-1">
                    <span className="text-[10px] font-bold text-slate-500">
                      {t('landing.typing.preview.nextKeyLabel', 'NEXT KEY')}:{' '}
                      <span className="text-blue-600 dark:text-blue-300">ㄹ (F)</span>
                    </span>
                    <span className="text-[10px] font-bold text-slate-300">
                      {t('landing.typing.preview.layoutLabel', 'KOREAN 2-SET')}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5 font-typing text-sm">
                    {/* Row 1 */}
                    <div className="flex justify-center gap-1">
                      {['ㅂ', 'ㅈ', 'ㄷ', 'ㄱ', 'ㅅ', 'ㅛ', 'ㅕ', 'ㅑ', 'ㅐ', 'ㅔ'].map(k => (
                        <div
                          key={k}
                          className="bg-white border-b-2 border-slate-200 text-slate-500 rounded-md flex items-center justify-center font-bold shadow-sm w-8 h-8 md:w-10 md:h-10 text-xs md:text-sm"
                        >
                          {k}
                        </div>
                      ))}
                    </div>
                    {/* Row 2 */}
                    <div className="flex justify-center gap-1 pl-4">
                      {['ㅁ', 'ㄴ', 'ㅇ'].map(k => (
                        <div
                          key={k}
                          className="bg-white border-b-2 border-slate-200 text-slate-500 rounded-md flex items-center justify-center font-bold shadow-sm w-8 h-8 md:w-10 md:h-10 text-xs md:text-sm"
                        >
                          {k}
                        </div>
                      ))}
                      {/* Active Key */}
                      <div className="bg-blue-500 dark:bg-blue-400 border-b-2 border-blue-600 dark:border-blue-300 text-primary-foreground dark:text-primary-foreground rounded-md flex items-center justify-center font-bold shadow-md transform translate-y-px w-8 h-8 md:w-10 md:h-10 relative text-xs md:text-sm">
                        ㄹ<span className="absolute top-0.5 right-1 text-[8px] opacity-70">F</span>
                      </div>
                      {['ㅎ', 'ㅗ', 'ㅓ', 'ㅏ', 'ㅣ'].map(k => (
                        <div
                          key={k}
                          className="bg-white border-b-2 border-slate-200 text-slate-500 rounded-md flex items-center justify-center font-bold shadow-sm w-8 h-8 md:w-10 md:h-10 text-xs md:text-sm"
                        >
                          {k}
                        </div>
                      ))}
                    </div>
                    {/* Row 3 */}
                    <div className="flex justify-center gap-1 pl-8">
                      {['ㅋ', 'ㅌ', 'ㅊ', 'ㅍ', 'ㅠ', 'ㅜ', 'ㅡ'].map(k => (
                        <div
                          key={k}
                          className="bg-white border-b-2 border-slate-200 text-slate-500 rounded-md flex items-center justify-center font-bold shadow-sm w-8 h-8 md:w-10 md:h-10 text-xs md:text-sm"
                        >
                          {k}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -z-10 top-1/2 right-1/2 translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-blue-100/30 via-transparent to-purple-100/30 dark:from-blue-400/12 dark:to-violet-400/12 rounded-full blur-3xl" />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const LandingPricing = ({
  showLocalizedPromo,
  navigate,
  prices,
}: {
  showLocalizedPromo: boolean;
  navigate: (path: string) => void;
  prices: VariantPrices | null;
}) => {
  const { t, i18n } = useTranslation();
  const language = normalizeLandingSeoLanguage(i18n.language);
  const pricingCopy = resolveLandingPricingCopy(language, t);

  const navigateWithLandingCta = (ctaId: string, target: string, placement: string) => {
    trackEvent('landing_cta_click', {
      language,
      ctaId,
      placement,
      target,
    });
    navigate(target);
  };

  // Price Calculation Helpers
  const getPrice = (
    plan: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'LIFETIME',
    region: 'GLOBAL' | 'REGIONAL'
  ) => {
    const amount = prices?.[region]?.[plan]?.amount;
    if (amount) {
      return amount;
    }
    // Fallbacks
    if (region === 'REGIONAL') {
      if (plan === 'MONTHLY') return '1.9';
      if (plan === 'ANNUAL') return '19.9';
    } else {
      if (plan === 'MONTHLY') return '6.90';
      if (plan === 'ANNUAL') return '49';
      if (plan === 'LIFETIME') return '99.00';
    }
    return '---';
  };

  const proPriceDisplay = showLocalizedPromo
    ? getPrice('MONTHLY', 'REGIONAL')
    : getPrice('ANNUAL', 'GLOBAL');

  const lifetimePriceDisplay = getPrice('LIFETIME', 'GLOBAL');

  return (
    <section id="pricing" className="py-16 md:py-32 bg-[#F8FAFF]">
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        <div className="text-center mb-10 md:mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-4xl font-heading font-bold mb-4"
          >
            {t('landing.pricing.title')}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-slate-600"
          >
            {t('landing.pricing.subtitle')}
          </motion.p>
        </div>

        {showLocalizedPromo && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-xl mx-auto bg-[#FFF7D6] border-2 border-[#F2C94C] rounded-2xl shadow-pop p-6 flex items-center justify-between gap-4 mb-10"
          >
            <div className="flex items-start gap-4 min-w-0">
              <div className="w-12 h-12 bg-[#F2C94C] rounded-full border-2 border-black flex items-center justify-center flex-shrink-0">
                <Gift className="w-6 h-6 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-heading font-extrabold text-slate-900">
                    {t('pricingDetails.promo.card.title')}
                  </h3>
                  <span className="bg-brand-yellow dark:bg-amber-300 text-slate-900 border border-black rounded px-2 py-0.5 text-[10px] font-black">
                    {t('pricingDetails.promo.card.badge')}
                  </span>
                </div>
                <p className="text-sm text-slate-800 mt-1">
                  {t('pricingDetails.promo.card.description')}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() =>
                navigateWithLandingCta(
                  'promo_annual',
                  buildPricingDetailsPath({
                    plan: 'ANNUAL',
                    source: 'landing',
                    returnTo: '/dashboard',
                  }),
                  'landing_pricing_promo'
                )
              }
              className="bg-slate-900 text-white border-2 border-black rounded-xl shadow-pop px-4 py-2 text-sm font-bold hover:shadow-pop-hover hover:-translate-y-0.5 transition-all whitespace-nowrap"
            >
              {t('pricingDetails.promo.card.cta')}
            </Button>
          </motion.div>
        )}

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-100px' }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-center"
        >
          <motion.div
            variants={fadeInUp}
            className="p-6 md:p-8 border-2 border-slate-300 rounded-3xl bg-white shadow-sm"
          >
            <div className="font-bold text-lg mb-2 text-slate-900">
              {t('landing.pricing.free.title')}
            </div>
            <div className="text-4xl font-extrabold mb-6 text-slate-900">
              {t('landing.pricing.free.price')}
            </div>
            <ul className="space-y-4 text-sm text-slate-700 mb-8">
              {pricingCopy.freeFeatures.map(feature => (
                <li key={feature} className="flex gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() =>
                navigateWithLandingCta('pricing_free_register', '/register', 'landing_pricing_free')
              }
              className="w-full py-3 rounded-xl border-2 border-slate-900 bg-white text-slate-900 font-bold hover:bg-slate-900 hover:text-white transition-colors"
            >
              {t('landing.pricing.free.cta')}
            </Button>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            className={`p-8 text-white rounded-3xl shadow-xl relative transform md:scale-105 border-4 border-brand-yellow overflow-hidden ${
              showLocalizedPromo ? 'bg-[#0B2545]' : 'bg-slate-900'
            }`}
          >
            {showLocalizedPromo ? (
              <div className="absolute top-5 right-5 bg-[#F2C94C] text-slate-900 border-2 border-black px-4 py-2 rounded-xl font-black text-xs tracking-wider animate-float">
                {t('pricingDetails.promo.activated')}
              </div>
            ) : (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-yellow dark:bg-amber-300 text-slate-900 px-4 py-1 rounded-full text-xs font-bold uppercase">
                {t('landing.pricing.pro.badge')}
              </div>
            )}

            <div className="font-bold text-lg mb-2 text-brand-yellow dark:text-amber-300">
              {t('landing.pricing.pro.title')}
            </div>

            {showLocalizedPromo ? (
              <>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-black text-brand-green dark:text-emerald-300">
                    $
                  </span>
                  <span className="text-6xl font-extrabold text-brand-green dark:text-emerald-300">
                    {proPriceDisplay}
                  </span>
                  <span className="text-slate-100 text-sm">
                    {t('pricingDetails.period.month', '/mo')}
                  </span>
                </div>
                <div className="text-slate-100 font-bold text-sm mb-6">
                  {t('pricingDetails.originalLabel', 'Original')}{' '}
                  <span className="line-through decoration-red-500 decoration-wavy decoration-2">
                    $6.90
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="text-5xl font-extrabold mb-1">${proPriceDisplay}</div>
                <div className="text-slate-100 text-sm mb-6">{t('landing.pricing.pro.period')}</div>
              </>
            )}

            <ul className="space-y-4 text-sm text-slate-100 mb-8">
              {pricingCopy.proFeatures.map(feature => (
                <li key={feature} className="flex gap-2">
                  <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-300" />
                  {feature}
                </li>
              ))}
            </ul>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() =>
                navigateWithLandingCta(
                  'pricing_pro_checkout',
                  buildPricingDetailsPath({
                    plan: 'ANNUAL',
                    source: 'landing',
                    returnTo: '/dashboard',
                  }),
                  'landing_pricing_pro'
                )
              }
              className="w-full py-4 bg-[#F2C94C] text-slate-900 rounded-xl font-bold border-2 border-[#0F172A] shadow-lg hover:bg-[#FFD95A] transition-colors"
            >
              {showLocalizedPromo
                ? t('pricingDetails.promo.subscribe')
                : t('landing.pricing.pro.cta')}
            </motion.button>
          </motion.div>

          <motion.div
            variants={fadeInUp}
            className="p-6 md:p-8 border-2 border-slate-300 rounded-3xl bg-white shadow-sm"
          >
            <div className="font-bold text-lg mb-2 text-slate-900">
              {t('landing.pricing.lifetime.title')}
            </div>
            <div className="text-4xl font-extrabold mb-6 text-slate-900">
              ${lifetimePriceDisplay}
            </div>
            <ul className="space-y-4 text-sm text-slate-700 mb-8">
              {pricingCopy.lifetimeFeatures.map(feature => (
                <li key={feature} className="flex gap-2">
                  <Check className="w-4 h-4 text-emerald-600" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() =>
                navigateWithLandingCta(
                  'pricing_lifetime_checkout',
                  buildPricingDetailsPath({
                    plan: 'LIFETIME',
                    source: 'landing',
                    returnTo: '/dashboard',
                  }),
                  'landing_pricing_lifetime'
                )
              }
              className="w-full py-3 rounded-xl border-2 border-slate-900 bg-white text-slate-900 font-bold hover:bg-slate-900 hover:text-white transition-colors"
            >
              {t('landing.pricing.lifetime.cta')}
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mt-8 md:mt-10 rounded-[2rem] border-2 border-black bg-white shadow-pop overflow-hidden"
        >
          <div className="bg-[#FFF7D6] border-b-2 border-black px-5 md:px-6 py-4">
            <h3 className="text-xl md:text-2xl font-heading font-extrabold text-slate-900">
              {pricingCopy.rightsTitle}
            </h3>
            <p className="mt-1 text-sm md:text-base text-slate-700">{pricingCopy.rightsSubtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1.15fr]">
            {pricingCopy.rightsRows.map(row => (
              <div key={row.label} className="contents">
                <div className="border-t md:border-t-0 md:border-r-2 border-black px-5 py-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 md:hidden">
                    {t('landing.pricing.comparison.headers.feature', { defaultValue: 'Feature' })}
                  </div>
                  <div className="mt-1 text-base font-black text-slate-900">{row.label}</div>
                </div>
                <div className="border-t md:border-t-0 md:border-r-2 border-black px-5 py-4 bg-slate-50">
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 md:hidden">
                    {t('landing.pricing.comparison.headers.free', { defaultValue: 'Free' })}
                  </div>
                  <div className="mt-1 text-sm leading-6 text-slate-600">{row.free}</div>
                </div>
                <div className="border-t md:border-t-0 border-black px-5 py-4 bg-[#FFFDF3]">
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400 md:hidden">
                    {t('landing.pricing.comparison.headers.proLifetime', {
                      defaultValue: 'Pro / Lifetime',
                    })}
                  </div>
                  <div className="mt-1 text-sm leading-6 font-semibold text-slate-900">
                    {row.pro}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const LandingFaq = () => {
  const { t } = useTranslation();

  return (
    <section id="faq" className="py-24 bg-slate-50 border-t border-slate-200">
      <div className="max-w-3xl mx-auto px-6">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-3xl font-heading font-bold mb-12 text-center"
        >
          {t('landing.faq.title')}
        </motion.h2>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="space-y-6"
        >
          <motion.details
            variants={fadeInUp}
            className="bg-white p-6 rounded-2xl border border-slate-200 group cursor-pointer"
          >
            <summary className="font-bold text-lg list-none flex justify-between items-center">
              {t('landing.faq.q1')}
              <ChevronDown className="w-5 h-5 group-open:rotate-180 transition-transform" />
            </summary>
            <p className="mt-4 text-slate-500 leading-relaxed">{t('landing.faq.a1')}</p>
          </motion.details>
          <motion.details
            variants={fadeInUp}
            className="bg-white p-6 rounded-2xl border border-slate-200 group cursor-pointer"
          >
            <summary className="font-bold text-lg list-none flex justify-between items-center">
              {t('landing.faq.q2')}
              <ChevronDown className="w-5 h-5 group-open:rotate-180 transition-transform" />
            </summary>
            <p className="mt-4 text-slate-500 leading-relaxed">{t('landing.faq.a2')}</p>
          </motion.details>
          <motion.details
            variants={fadeInUp}
            className="bg-white p-6 rounded-2xl border border-slate-200 group cursor-pointer"
          >
            <summary className="font-bold text-lg list-none flex justify-between items-center">
              {t('landing.faq.q3')}
              <ChevronDown className="w-5 h-5 group-open:rotate-180 transition-transform" />
            </summary>
            <p className="mt-4 text-slate-500 leading-relaxed">{t('landing.faq.a3')}</p>
          </motion.details>
        </motion.div>
      </div>
    </section>
  );
};

const LandingGuidesCluster = () => {
  const { t } = useTranslation();

  const guideLinks = [
    {
      to: '/learn/topik-guide',
      title: t('landing.guides.topik.title', { defaultValue: 'TOPIK Preparation Guide' }),
      description: t('landing.guides.topik.description', {
        defaultValue: 'Understand exam structure, scoring, and weekly prep loops.',
      }),
    },
    {
      to: '/learn/korean-vocabulary',
      title: t('landing.guides.vocab.title', { defaultValue: 'Korean Vocabulary System' }),
      description: t('landing.guides.vocab.description', {
        defaultValue: 'Retain words long term with SRS, dictation, and context review.',
      }),
    },
    {
      to: '/learn/topik-writing',
      title: t('landing.guides.writing.title', { defaultValue: 'TOPIK Writing Strategy' }),
      description: t('landing.guides.writing.description', {
        defaultValue: 'Use clear templates and timed revision checklists for higher scores.',
      }),
    },
  ];

  return (
    <section id="guides" className="py-20 bg-white border-t border-slate-200">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl"
        >
          <h2 className="text-3xl font-heading font-bold">
            {t('landing.guides.title', {
              defaultValue: 'Start with practical Korean study guides',
            })}
          </h2>
          <p className="mt-3 text-base text-slate-500 leading-relaxed">
            {t('landing.guides.subtitle', {
              defaultValue:
                'Build your roadmap with SEO-optimized guide pages for TOPIK, vocabulary, grammar, and writing.',
            })}
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="mt-8 grid gap-4 md:grid-cols-3"
        >
          {guideLinks.map(guide => (
            <motion.article
              key={guide.to}
              variants={fadeInUp}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
            >
              <h3 className="text-lg font-extrabold leading-snug">{guide.title}</h3>
              <p className="mt-2 text-sm text-slate-500 leading-relaxed">{guide.description}</p>
              <LocalizedLink
                to={guide.to}
                className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700"
              >
                {t('landing.guides.readMore', { defaultValue: 'Read guide' })}
                <ArrowRight className="h-4 w-4" />
              </LocalizedLink>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

const LandingFooter = () => {
  const { t } = useTranslation();

  return (
    <footer className="bg-white py-12 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <div className="flex items-center justify-center gap-3 mb-4">
          <img
            src="/logo.png"
            alt={t('common.appName')}
            className="w-9 h-9 rounded-lg dark:brightness-0 dark:invert"
          />
          <div className="font-heading font-bold text-2xl">{t('common.appName')}</div>
        </div>
        <div className="flex justify-center gap-6 text-sm text-slate-500 font-semibold mb-8">
          <a href="#topik" className="hover:text-black">
            {t('landing.footer.about')}
          </a>
          <LocalizedLink to="/learn" className="hover:text-black">
            {t('landing.footer.learnGuides', { defaultValue: 'Learn Guides' })}
          </LocalizedLink>
          <LocalizedLink to="/privacy" className="hover:text-black">
            {t('common.privacy')}
          </LocalizedLink>
          <LocalizedLink to="/terms" className="hover:text-black">
            {t('common.terms')}
          </LocalizedLink>
          <a href="mailto:support@koreanstudy.me" className="hover:text-black">
            {t('common.contact')}
          </a>
        </div>
        <p className="text-xs text-slate-500">{t('landing.footer.copyright')}</p>
      </div>
    </footer>
  );
};

const DEMO_ASSETS = {
  userAvatar: '/landing/avatar-user.svg',
} as const;

export default function Landing() {
  const { i18n, t } = useTranslation();
  const navigate = useLocalizedNavigate();
  const location = useLocation();
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isScrolled = useLandingScroll();
  const { expandedFeatureCards, toggleFeatureCard } = useFeatureCards();

  // Dynamic Pricing for Landing
  const [prices, setPrices] = useState<VariantPrices | null>(null);
  const getPrices = useAction(api.lemonsqueezy.getVariantPrices);

  useEffect(() => {
    runConvexActionWithRetry(getPrices, {}, { retries: 2, initialDelayMs: 300 })
      .then(setPrices)
      .catch(console.error);
  }, [getPrices]);

  // Condition return AFTER hooks
  const meta = getRouteMeta(location.pathname);
  const localizedSeoTitle = t('landing.seo.title', { defaultValue: meta.title });
  const localizedSeoDescription = t('landing.seo.description', { defaultValue: meta.description });
  const localizedSeoKeywords = t('landing.seo.keywords', { defaultValue: meta.keywords || '' });
  const featuredGuidesListName = t('landing.seo.featuredGuidesListName', {
    defaultValue: 'Featured Korean Learning Guides',
  });
  const normalizedLanguage = normalizeLandingSeoLanguage(
    ((i18n.language || 'en').split('-')[0] || 'en').toLowerCase()
  );
  const faqItems: LandingFaqItem[] = [
    { question: t('landing.faq.q1'), answer: t('landing.faq.a1') },
    { question: t('landing.faq.q2'), answer: t('landing.faq.a2') },
    { question: t('landing.faq.q3'), answer: t('landing.faq.a3') },
  ];
  const canonicalUrl = `https://koreanstudy.me${location.pathname === '/' ? '' : location.pathname}`;
  const showLocalizedPromo =
    i18n.language === 'zh' ||
    i18n.language === 'vi' ||
    i18n.language === 'mn' ||
    i18n.language.startsWith('zh-');

  if (!authLoading && isAuthenticated) {
    return <Navigate to="dashboard" replace />;
  }

  return (
    <div className="min-h-screen font-landing antialiased text-slate-900 overflow-x-hidden bg-[#FAFAFA] selection:bg-brand-yellow dark:selection:bg-amber-300 selection:text-black">
      <Seo
        title={localizedSeoTitle}
        description={localizedSeoDescription}
        keywords={localizedSeoKeywords}
        noIndex={meta.noIndex}
      />
      <LandingJsonLd
        description={localizedSeoDescription}
        prices={prices}
        faqItems={faqItems}
        language={normalizedLanguage}
        canonicalUrl={canonicalUrl}
        featuredGuidesListName={featuredGuidesListName}
      />
      <LandingNav
        isScrolled={isScrolled}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      <LandingHero />
      <LandingStats />

      <main className="space-y-0">
        <LandingTopik />
        <div className="w-full h-px bg-slate-50" />
        <LandingFsrs />
        <div className="w-full h-px bg-slate-50" />
        <LandingAi userAvatar={DEMO_ASSETS.userAvatar} />
        <div className="w-full h-px bg-slate-50" />

        <LandingTyping navigate={navigate} />
        <div className="w-full h-px bg-slate-50" />

        <LandingToolbox
          expandedFeatureCards={expandedFeatureCards}
          toggleFeatureCard={toggleFeatureCard}
        />
        <div className="w-full h-px bg-slate-50" />

        <LandingPricing
          showLocalizedPromo={showLocalizedPromo}
          navigate={navigate}
          prices={prices}
        />
        <div className="w-full h-px bg-slate-50" />

        <LandingGuidesCluster />
        <div className="w-full h-px bg-slate-50" />

        <LandingFaq />

        <LandingFooter />
      </main>
    </div>
  );
}
