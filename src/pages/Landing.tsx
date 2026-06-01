import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { LogoIcon } from '../components/ui/Logo';
import { LocalizedLink } from '../components/LocalizedLink';
import { SEO as Seo } from '../seo/SEO';
import { getRouteMeta } from '../seo/publicRoutes';
import { runConvexActionWithRetry } from '../utils/convexActionRetry';
import { callPublicConvexAction } from '../utils/publicConvexClient';
import { trackEvent } from '../utils/analytics';
import { buildPricingDetailsPath } from '../utils/subscriptionPlan';

import { Globe, Check, ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
type PricePlan = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'LIFETIME';
type PriceEntry = { amount: string; currency: string; formatted: string };
type VariantPrices = {
  GLOBAL: Partial<Record<PricePlan, PriceEntry>>;
  REGIONAL: Partial<Record<PricePlan, PriceEntry>>;
};
type LandingFaqItem = { question: string; answer: string };
type LandingSeoLanguage = 'en' | 'zh' | 'vi' | 'mn';
type LandingNetworkNavigator = Navigator & {
  connection?: { saveData?: boolean; effectiveType?: string };
};
type LandingIdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (h: number) => void;
};

const LANDING_SEO_LANGUAGES = new Set<LandingSeoLanguage>(['en', 'zh', 'vi', 'mn']);
function normalizeLandingSeoLanguage(language: string): LandingSeoLanguage {
  return LANDING_SEO_LANGUAGES.has(language as LandingSeoLanguage)
    ? (language as LandingSeoLanguage)
    : 'en';
}

function getFeaturedGuidesForJsonLd(language: LandingSeoLanguage) {
  const slugs = ['topik-guide', 'korean-vocabulary', 'topik-writing'] as const;
  return slugs.map(slug => {
    const path = `/${language}/learn/${slug}`;
    const meta = getRouteMeta(path);
    return {
      name: meta.title,
      description: meta.description,
      url: `https://koreanstudy.me${path}`,
    };
  });
}

const useLandingScroll = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    const prev = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = prev;
    };
  }, []);
  return isScrolled;
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
    const amount = prices?.GLOBAL?.[plan]?.amount;
    if (amount) return amount;
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
                acceptedAnswer: { '@type': 'Answer', text: item.answer },
              })),
            },
            {
              '@type': 'ItemList',
              name: featuredGuidesListName,
              itemListElement: featuredGuides.map((g, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                name: g.name,
                url: g.url,
              })),
            },
            ...featuredGuides.map(g => ({
              '@type': 'Course',
              name: g.name,
              description: g.description,
              inLanguage: language,
              provider: {
                '@type': 'Organization',
                name: 'DuHan',
                sameAs: 'https://koreanstudy.me',
              },
            })),
          ],
        }),
      }}
    />
  );
};

// ───────────────────────────────────────────────────────────────────────
// Atomic UI helpers — mapped from "Duhan Landing Desktop.html"
// ───────────────────────────────────────────────────────────────────────

const Container: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...rest
}) => (
  <div className={`mx-auto w-full max-w-7xl px-5 md:px-12 ${className}`} {...rest}>
    {children}
  </div>
);

const BRAND_CHARS = ['韓', '恆', '두'];

const Seal: React.FC<{
  ch?: string;
  size?: number;
  className?: string;
  bg?: string;
  fg?: string;
}> = ({ ch, size = 24, className = '', bg, fg }) => {
  if (ch && BRAND_CHARS.includes(ch)) {
    return <LogoIcon size={size} className={className} />;
  }
  return (
    <div
      className={clsx(
        'flex shrink-0 items-center justify-center rounded-[6px] font-k-serif font-semibold leading-none shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.15)]',
        className
      )}
      style={{
        width: size,
        height: size,
        background: bg || 'var(--color-k-crimson)',
        color: fg || 'var(--color-k-bg)',
        fontSize: size * 0.6,
      }}
    >
      {ch}
    </div>
  );
};

// ───────────────────────────────────────────────────────────────────────
// NAV
// ───────────────────────────────────────────────────────────────────────

const LandingLanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const location = useLocation();

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'zh', label: '中文' },
    { code: 'vi', label: 'Tiếng Việt' },
    { code: 'mn', label: 'Монгол' },
  ];

  const currentLang = languages.find(l => i18n.language.startsWith(l.code)) || languages[0];

  return (
    <div className="group relative">
      <button className="flex h-9 items-center gap-1.5 rounded-lg border border-[rgba(31,27,23,0.1)] bg-k-bg px-3 text-[13px] font-bold text-k-ink transition-colors hover:bg-k-bg2 md:h-10 md:gap-2 md:px-4 md:text-[14px]">
        <Globe size={16} className="opacity-60" />
        <span>{currentLang.label}</span>
      </button>
      <div className="invisible absolute right-0 top-full mt-2 w-32 origin-top-right scale-95 rounded-xl border border-[rgba(31,27,23,0.1)] bg-k-bg p-1 opacity-0 shadow-xl transition-all group-hover:visible group-hover:scale-100 group-hover:opacity-100">
        {languages.map(lang => (
          <button
            key={lang.code}
            onClick={() => {
              const segments = location.pathname.split('/').filter(Boolean);
              if (segments[0] && ['en', 'zh', 'vi', 'mn'].includes(segments[0])) {
                segments[0] = lang.code;
              } else {
                segments.unshift(lang.code);
              }
              window.location.href = `/${segments.join('/')}${location.search}${location.hash}`;
            }}
            className={`w-full rounded-lg px-3 py-2 text-left text-[13px] font-bold transition-colors hover:bg-k-bg2 ${
              i18n.language.startsWith(lang.code) ? 'text-k-crimson' : 'text-k-ink'
            }`}
          >
            {lang.label}
          </button>
        ))}
      </div>
    </div>
  );
};

const NavBar: React.FC<{
  isScrolled: boolean;
  onFreeStart: () => void;
  onLogin: () => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
}> = ({ isScrolled, onFreeStart, onLogin, t }) => {
  const links = [
    { href: '#features', label: t('landing.v2.nav.features', { defaultValue: '功能' }) },
    { href: '#loop', label: t('landing.v2.nav.loop', { defaultValue: '每日路径' }) },
    { href: '#modules', label: t('landing.v2.nav.modules', { defaultValue: '学习模块' }) },
    { href: '#community', label: t('landing.v2.nav.community', { defaultValue: '社区' }) },
    { href: '#pricing', label: t('landing.v2.nav.pricing', { defaultValue: '会员' }) },
    { href: '#faq', label: t('landing.v2.nav.faq', { defaultValue: '常见问题' }) },
  ];
  return (
    <nav
      className="sticky top-0 z-50 border-b border-[rgba(31,27,23,0.06)] backdrop-blur-md transition-shadow"
      style={{
        background: 'rgba(251,248,243,0.92)',
        boxShadow: isScrolled ? '0 1px 0 rgba(31,27,23,0.06)' : 'none',
      }}
    >
      <Container className="flex h-[52px] items-center gap-10 md:h-[68px]">
        <LocalizedLink
          to="/"
          className="flex items-center gap-2 text-[16px] font-extrabold tracking-[-0.3px] text-k-ink md:gap-2.5 md:text-[19px]"
        >
          <img
            src="/logo.svg"
            alt="Duhan Logo"
            className="h-[28px] w-[28px] md:h-8 md:w-8 rounded-lg flex-shrink-0"
          />
          <span>
            <span className="mr-1 font-k-serif font-medium text-k-crimson">두한</span>Duhan
          </span>
        </LocalizedLink>
        <div className="hidden flex-1 items-center gap-7 lg:flex">
          {links.map(l => (
            <a
              key={l.href}
              href={l.href}
              className="text-[14px] font-semibold text-[#3A342E] transition-colors hover:text-k-crimson"
            >
              {l.label}
            </a>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <LandingLanguageSwitcher />
          <button
            type="button"
            onClick={onLogin}
            className="rounded-[11px] bg-transparent px-3 py-2 text-[13px] font-bold text-k-ink transition-transform hover:-translate-y-[1px] md:px-5 md:py-[11px] md:text-[14px]"
          >
            {t('landing.v2.nav.login', { defaultValue: '登录' })}
          </button>
          <button
            type="button"
            onClick={onFreeStart}
            className="hidden rounded-[11px] bg-k-crimson px-5 py-[11px] text-[14px] font-bold text-k-bg transition-transform hover:-translate-y-[1px] md:inline-flex"
          >
            {t('landing.v2.nav.register', { defaultValue: '注册' })}
          </button>
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-[9px] bg-k-bg2 font-k-serif text-[16px] text-k-ink md:hidden"
            aria-label="Menu"
          >
            ≡
          </button>
        </div>
      </Container>
    </nav>
  );
};

// ───────────────────────────────────────────────────────────────────────
// HERO
// ───────────────────────────────────────────────────────────────────────

const FloatChip: React.FC<{
  ch: string;
  title: string;
  value: string;
  bg?: string;
  fg?: string;
  className?: string;
}> = ({ ch, title, value, bg, fg, className = '' }) => (
  <div
    className={`absolute flex items-center gap-2.5 rounded-[14px] bg-k-card px-3.5 py-3 ${className}`}
    style={{ boxShadow: '0 12px 32px rgba(31,27,23,0.12)' }}
  >
    <Seal ch={ch} size={36} bg={bg} fg={fg} />
    <div>
      <div className="text-[11px] font-semibold text-k-sub">{title}</div>
      <div className="text-[16px] font-extrabold text-k-ink">{value}</div>
    </div>
  </div>
);

const MobilePhoneBlock: React.FC<{ t: (k: string, opts?: Record<string, unknown>) => string }> = ({
  t,
}) => (
  <div className="flex justify-center lg:hidden">
    <div className="relative h-[580px] w-full max-w-[290px]">
      <div
        className="absolute -z-10 rounded-full opacity-30 blur-[40px]"
        style={{ width: 240, height: 240, background: '#F4C5C5', top: '10%', right: '-10%' }}
      />
      <div
        className="absolute -z-10 rounded-full opacity-30 blur-[40px]"
        style={{ width: 200, height: 200, background: '#F2D27A', bottom: '10%', left: '-10%' }}
      />
      <div className="scale-[0.9] origin-top">
        <PhoneMockup t={t} />
      </div>
    </div>
  </div>
);

const PhoneMockup: React.FC<{ t: (k: string, opts?: Record<string, unknown>) => string }> = ({
  t,
}) => {
  const steps: Array<{
    kanji: string;
    title: string;
    sub: string;
    state: 'done' | 'active' | 'idle';
  }> = [
    {
      kanji: '複',
      title: t('landing.v2.hero.phone.s1.t', { defaultValue: '早间复习' }),
      sub: t('landing.v2.hero.phone.s1.s', { defaultValue: '18 张到期卡 · 已完成' }),
      state: 'done',
    },
    {
      kanji: '學',
      title: t('landing.v2.hero.phone.s2.t', { defaultValue: '新课 · L24 골목길' }),
      sub: t('landing.v2.hero.phone.s2.s', { defaultValue: '现在进行中 · 8 分钟' }),
      state: 'active',
    },
    {
      kanji: '聽',
      title: t('landing.v2.hero.phone.s3.t', { defaultValue: '播客片段' }),
      sub: t('landing.v2.hero.phone.s3.s', { defaultValue: '한국 골목 산책 · 6 分钟' }),
      state: 'idle',
    },
    {
      kanji: '讀',
      title: t('landing.v2.hero.phone.s4.t', { defaultValue: '睡前阅读' }),
      sub: t('landing.v2.hero.phone.s4.s', { defaultValue: '短文 · 골목길의 추억' }),
      state: 'idle',
    },
  ];

  return (
    <div
      className="relative h-[640px] w-[320px] rounded-[48px] bg-k-ink p-[14px]"
      style={{ boxShadow: '0 40px 80px rgba(31,27,23,0.25), 0 0 0 1px rgba(0,0,0,0.4)' }}
    >
      <div className="absolute left-1/2 top-[18px] z-[5] h-7 w-[110px] -translate-x-1/2 rounded-2xl bg-k-ink" />
      <div className="relative h-full w-full overflow-hidden rounded-[36px] bg-k-bg px-[18px] pb-[14px] pt-[18px]">
        <div className="flex items-center justify-between px-1 pb-4 pt-3.5 font-k-serif text-[14px] text-k-ink">
          <span className="font-k-mono text-[12px] font-bold tracking-[1.5px] text-k-crimson">
            {t('landing.v2.hero.phone.date', { defaultValue: '五月 十一日' })}
          </span>
          <span className="font-k-serif text-[18px] font-medium text-k-crimson">韓</span>
        </div>
        <div className="text-[24px] font-extrabold text-k-ink">
          <span className="mr-1 font-k-serif font-medium text-k-crimson">두한</span>
          {t('landing.v2.hero.phone.greet', { defaultValue: '你好，河恩' })}
        </div>
        <div className="mb-4 text-[11px] text-k-sub">
          {t('landing.v2.hero.phone.sub', { defaultValue: '今日学习已就绪 · 4 步约 22 分钟' })}
        </div>

        {steps.map(s => {
          const isActive = s.state === 'active';
          return (
            <div
              key={s.kanji}
              className={`mb-2.5 rounded-[18px] p-4 ${isActive ? 'bg-k-crimson text-k-bg' : 'bg-k-card'}`}
              style={{ boxShadow: isActive ? 'none' : '0 2px 8px rgba(31,27,23,0.04)' }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-[9px] font-k-serif text-[14px] font-medium"
                  style={{
                    background:
                      s.state === 'done'
                        ? '#BFE0CF'
                        : isActive
                          ? 'var(--color-k-bg)'
                          : 'rgba(31,27,23,0.08)',
                    color: isActive ? 'var(--color-k-crimson)' : 'var(--color-k-ink)',
                  }}
                >
                  {s.kanji}
                </span>
                <div className="flex-1 overflow-hidden">
                  <div className="truncate text-[13px] font-extrabold leading-tight">{s.title}</div>
                  <div
                    className={`truncate text-[10px] ${isActive ? 'text-[rgba(251,248,243,0.7)]' : 'text-k-sub'}`}
                  >
                    {s.sub}
                  </div>
                </div>
                {s.state === 'done' && (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-[#5B8472]">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            </div>
          );
        })}
        <div className="mt-4 flex justify-center gap-1.5 opacity-30">
          {[0, 1, 2].map(i => (
            <div key={i} className={`h-1 w-1 rounded-full ${i === 0 ? 'bg-k-ink' : 'bg-k-sub'}`} />
          ))}
        </div>
      </div>
    </div>
  );
};

const Hero: React.FC<{
  onFreeStart: () => void;
  t: (k: string, opts?: Record<string, unknown>) => string;
}> = ({ onFreeStart, t }) => (
  <section className="relative overflow-hidden px-5 py-12 md:px-0 md:py-[80px] lg:py-[100px]">
    <Container className="grid items-center gap-8 md:gap-[60px] lg:grid-cols-[1.05fr_1fr]">
      <div>
        <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-k-bg2 px-[11px] py-1 text-[11px] font-bold tracking-[0.3px] text-[#3A342E] md:mb-6 md:gap-2 md:px-[13px] md:py-1.5 md:text-[12px]">
          <span className="h-1.5 w-1.5 rounded-full bg-k-crimson" />
          <span className="font-k-serif font-medium text-k-crimson">新</span>
          {t('landing.v2.hero.eyebrow', { defaultValue: 'v3.0 已发布 · 全新学习路径与社区' })}
        </span>
        <h1 className="m-0 mb-4 text-[44px] font-extrabold leading-[1.04] tracking-[-1.4px] text-k-ink md:mb-6 md:text-[56px] md:tracking-[-2.5px] lg:text-[72px]">
          <span className="mr-1.5 block font-k-serif text-[56px] font-medium leading-none text-k-crimson md:inline md:text-inherit">
            {t('landing.v2.hero.titleKo', { defaultValue: '讀韓' })}
          </span>
          <br className="hidden md:block" />
          {t('landing.v2.hero.titlePre', { defaultValue: '让韩语 ' })}
          <span className="relative inline-block">
            <span className="relative z-[1]">
              {t('landing.v2.hero.titleUnderlined', { defaultValue: '变成日常' })}
            </span>
            <span
              className="absolute inset-x-0 bottom-1 z-0 h-[10px] opacity-70 md:bottom-2 md:h-[14px]"
              style={{ background: '#F2D27A' }}
              aria-hidden
            />
          </span>
        </h1>
        <p className="m-0 mb-5 max-w-[540px] text-[15px] leading-[1.55] text-[#3A342E] md:mb-8 md:text-[18px] md:leading-[1.6]">
          {t('landing.v2.hero.sub', {
            defaultValue:
              '每天一条精心编排的学习路径 · 单词、语法、TOPIK、影视、播客、阅读、社区互译串联 · 基于 FSRS 记忆模型，跟你的学习节奏一起呼吸。',
          })}
        </p>
        <div className="mb-6 flex flex-col gap-[9px] md:mb-8 md:flex-row md:items-center md:gap-3">
          <button
            type="button"
            onClick={onFreeStart}
            className="w-full rounded-[11px] bg-k-crimson px-7 py-[15px] text-[15px] font-bold text-k-bg transition-transform hover:-translate-y-[1px] md:w-auto md:rounded-[13px] md:py-4"
          >
            {t('landing.v2.hero.ctaPrimary', { defaultValue: '免费开始学习 →' })}
          </button>
          <button
            type="button"
            className="w-full rounded-[11px] bg-k-card px-7 py-[15px] text-[15px] font-bold text-k-ink transition-transform hover:-translate-y-[1px] md:w-auto md:rounded-[13px] md:py-4"
            style={{ boxShadow: 'inset 0 0 0 1.5px var(--color-k-ink)' }}
          >
            {t('landing.v2.hero.ctaSecondary', { defaultValue: '观看 90s 演示' })}
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3 border-t border-[rgba(31,27,23,0.08)] pt-4 md:flex md:gap-7 md:pt-7">
          {(
            [
              {
                n: '48K+',
                nDesktop: '48,200+',
                l: t('landing.v2.hero.meta1', { defaultValue: '活跃学习者' }),
              },
              {
                n: '230K+',
                nDesktop: '230,000+',
                l: t('landing.v2.hero.meta2', { defaultValue: '每日复习卡' }),
              },
              {
                n: '⭐ 4.9',
                nDesktop: '⭐ 4.9',
                l: t('landing.v2.hero.meta3', { defaultValue: 'App Store 评分' }),
              },
            ] as const
          ).map(m => (
            <div key={m.l} className="flex flex-col gap-0.5">
              <span className="font-k-serif text-[20px] font-semibold leading-[1.1] tracking-[-0.5px] text-k-crimson md:text-[28px]">
                <span className="md:hidden">{m.n}</span>
                <span className="hidden md:inline">{m.nDesktop}</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.6px] text-k-sub md:text-[11px] md:tracking-[1.4px]">
                {m.l}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile phone preview block — Shows on mobile, hidden on desktop */}
      <MobilePhoneBlock t={t} />

      {/* Desktop visual — phone mockup */}
      <div className="relative hidden h-[620px] items-center justify-center lg:flex">
        <div
          className="absolute -z-10 rounded-full opacity-50 blur-[40px]"
          style={{ width: 360, height: 360, background: '#F4C5C5', top: 60, right: -40 }}
        />
        <div
          className="absolute -z-10 rounded-full opacity-50 blur-[40px]"
          style={{ width: 280, height: 280, background: '#F2D27A', bottom: 40, left: -20 }}
        />
        <div
          className="absolute -z-10 rounded-full opacity-40 blur-[40px]"
          style={{ width: 220, height: 220, background: '#BFE0CF', top: 240, left: 80 }}
        />

        <FloatChip
          ch="續"
          title={t('landing.v2.hero.chip1.t', { defaultValue: '连续学习' })}
          value={t('landing.v2.hero.chip1.v', { defaultValue: '47 天' })}
          className="left-[30px] top-[56px]"
        />
        <FloatChip
          ch="詞"
          title={t('landing.v2.hero.chip2.t', { defaultValue: '今日新词' })}
          value={t('landing.v2.hero.chip2.v', { defaultValue: '12 / 15' })}
          bg="#BFE0CF"
          fg="var(--color-k-ink)"
          className="right-[20px] top-[200px]"
        />
        <FloatChip
          ch="能"
          title={t('landing.v2.hero.chip3.t', { defaultValue: 'TOPIK II' })}
          value={t('landing.v2.hero.chip3.v', { defaultValue: '5 级 · 87%' })}
          bg="#F2D27A"
          fg="var(--color-k-ink)"
          className="bottom-[80px] left-[50px]"
        />

        <PhoneMockup t={t} />
      </div>
    </Container>
  </section>
);

// ───────────────────────────────────────────────────────────────────────
// LOGOS STRIP
// ───────────────────────────────────────────────────────────────────────

const LogosStrip: React.FC<{ t: (k: string, opts?: Record<string, unknown>) => string }> = ({
  t,
}) => {
  const items = [
    { ko: '讀', label: t('landing.v2.logos.v1', { defaultValue: '真实语境沉浸阅读' }) },
    { ko: '聽', label: t('landing.v2.logos.v2', { defaultValue: '影视播客原声精听' }) },
    { ko: '記', label: t('landing.v2.logos.v3', { defaultValue: 'FSRS 算法智能复习' }) },
    { ko: '譯', label: t('landing.v2.logos.v4', { defaultValue: '母语社区互译共建' }) },
    { ko: '通', label: t('landing.v2.logos.v5', { defaultValue: '全平台学习进度同步' }) },
  ];
  return (
    <section className="bg-k-bg2 py-8 md:py-11">
      <Container className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 md:justify-between">
        {items.map(i => (
          <div
            key={i.ko}
            className="flex items-center gap-3 text-[13px] font-bold text-k-ink transition-opacity hover:opacity-100 md:text-[14px]"
          >
            <span className="font-k-serif text-[18px] text-k-crimson opacity-90 md:text-[20px]">
              {i.ko}
            </span>
            <span className="opacity-70">{i.label}</span>
          </div>
        ))}
      </Container>
    </section>
  );
};

// ───────────────────────────────────────────────────────────────────────
// SECTION HEAD
// ───────────────────────────────────────────────────────────────────────

const SectionHead: React.FC<{
  eyebrowKo: string;
  eyebrow: string;
  titleKo?: string;
  title: React.ReactNode;
  sub?: string;
  tone?: 'light' | 'dark';
}> = ({ eyebrowKo, eyebrow, titleKo, title, sub, tone = 'light' }) => (
  <div className="mb-10 text-center md:mb-[60px]">
    <span
      className="text-[12px] font-extrabold uppercase tracking-[3px]"
      style={{ color: tone === 'dark' ? '#F2A78D' : 'var(--color-k-crimson)' }}
    >
      <span className="mr-1.5 font-k-serif font-medium">{eyebrowKo}</span>
      {eyebrow}
    </span>
    <h2
      className="m-0 mb-4 mt-3 text-[32px] font-extrabold leading-[1.1] tracking-[-1px] md:mt-3.5 md:text-[52px] md:tracking-[-1.4px]"
      style={{ color: tone === 'dark' ? 'var(--color-k-bg)' : 'var(--color-k-ink)' }}
    >
      {titleKo ? (
        <span className="mr-2 font-k-serif font-medium text-k-crimson">{titleKo}</span>
      ) : null}
      {title}
    </h2>
    {sub ? (
      <p
        className="mx-auto max-w-[640px] text-[17px]"
        style={{ color: tone === 'dark' ? 'rgba(251,248,243,0.7)' : '#3A342E' }}
      >
        {sub}
      </p>
    ) : null}
  </div>
);

// ───────────────────────────────────────────────────────────────────────
// FEATURES MOSAIC
// ───────────────────────────────────────────────────────────────────────

const FeaturesMosaic: React.FC<{ t: (k: string, opts?: Record<string, unknown>) => string }> = ({
  t,
}) => {
  type Tone = 'dark' | 'cream' | 'butter' | 'mint' | 'crimson';
  type Tile = {
    tone: Tone;
    span2?: boolean;
    span3?: boolean;
    kanji: string;
    title: string;
    desc: string;
    pill: string;
    deco: string;
  };
  const tiles: Tile[] = [
    {
      tone: 'dark',
      span2: true,
      kanji: '今',
      title: t('landing.v2.features.t1.title', { defaultValue: '每日学习路径' }),
      desc: t('landing.v2.features.t1.desc', {
        defaultValue:
          '基于昨日表现与 FSRS 算法，自动生成「复习 → 新学 → 听 → 读」四步闭环。无需自己排程，打开就是今天最该做的事。',
      }),
      pill: t('landing.v2.features.t1.pill', { defaultValue: '/ 早 7:00 自动生成 · 平均 22 分钟' }),
      deco: '今',
    },
    {
      tone: 'butter',
      kanji: '詞',
      title: t('landing.v2.features.t2.title', { defaultValue: '词汇本 + 四种模式' }),
      desc: t('landing.v2.features.t2.desc', {
        defaultValue: '闪卡、学习、考试、连连看 — 一个词四种练法。',
      }),
      pill: t('landing.v2.features.t2.pill', { defaultValue: '/ TOPIK I + II · 9,300 词' }),
      deco: '詞',
    },
    {
      tone: 'cream',
      kanji: '法',
      title: t('landing.v2.features.t3.title', { defaultValue: '语法句型库' }),
      desc: t('landing.v2.features.t3.desc', {
        defaultValue: '每条语法配场景例句 + 真题。错误自动入复习队列。',
      }),
      pill: t('landing.v2.features.t3.pill', { defaultValue: '/ 480 条核心语法' }),
      deco: '法',
    },
    {
      tone: 'mint',
      kanji: '能',
      title: t('landing.v2.features.t4.title', { defaultValue: 'TOPIK 备考' }),
      desc: t('landing.v2.features.t4.desc', {
        defaultValue: '真题 / 模考 / 写作 AI 评分 + 听力倍速精听',
      }),
      pill: t('landing.v2.features.t4.pill', { defaultValue: '/ TOPIK II 平均提升 1.4 级' }),
      deco: '能',
    },
    {
      tone: 'cream',
      kanji: '譯',
      title: t('landing.v2.features.t6.title', { defaultValue: '母语社区 · 互译' }),
      desc: t('landing.v2.features.t6.desc', {
        defaultValue: '遇到翻译不准？提交悬赏，由母语者为你提供最地道的解释。',
      }),
      pill: t('landing.v2.features.t6.pill', { defaultValue: '/ 1.2k+ 活跃互助组' }),
      deco: '譯',
    },
    {
      tone: 'crimson',
      span3: true,
      kanji: '映',
      title: t('landing.v2.features.t5.title', { defaultValue: '影视 · 播客 · 阅读 三栖沉浸' }),
      desc: t('landing.v2.features.t5.desc', {
        defaultValue:
          '韩剧片段、Spotify 播客、新闻短文 — 一键转录、双语字幕、生词点译入卡 · 把追剧变成最香的学习。',
      }),
      pill: t('landing.v2.features.t5.pill', { defaultValue: '/ 4,800+ 学习素材 · 每周更新' }),
      deco: '映',
    },
  ];

  const toneClass: Record<Tone, string> = {
    dark: 'bg-k-ink text-k-bg',
    cream: 'bg-k-bg2',
    butter: '',
    mint: '',
    crimson: 'bg-k-crimson text-k-bg',
  };
  const toneStyle: Record<Tone, React.CSSProperties> = {
    dark: {},
    cream: {},
    butter: { background: '#F2D27A' },
    mint: { background: '#BFE0CF' },
    crimson: {},
  };
  const sealStyle = (tone: Tone): { bg?: string; fg?: string } => {
    switch (tone) {
      case 'dark':
        return { bg: '#F2A78D', fg: 'var(--color-k-ink)' };
      case 'crimson':
        return { bg: 'var(--color-k-bg)', fg: 'var(--color-k-crimson)' };
      case 'butter':
      case 'mint':
      case 'cream':
        return { bg: 'var(--color-k-ink)', fg: 'var(--color-k-bg)' };
      default:
        return {};
    }
  };
  const descClass = (tone: Tone): string => {
    if (tone === 'dark') return 'text-[rgba(251,248,243,0.7)]';
    if (tone === 'crimson') return 'text-[rgba(251,248,243,0.85)]';
    return 'text-[#3A342E]';
  };
  const pillClass = (tone: Tone): string => {
    if (tone === 'dark') return 'text-[rgba(251,248,243,0.55)]';
    if (tone === 'crimson') return 'text-[rgba(251,248,243,0.6)]';
    return 'text-[rgba(31,27,23,0.6)]';
  };
  const decoColor = (tone: Tone): string => {
    if (tone === 'dark') return 'rgba(251,248,243,0.06)';
    if (tone === 'crimson') return 'rgba(251,248,243,0.13)';
    return 'rgba(31,27,23,0.05)';
  };

  return (
    <section id="features" className="py-16 md:py-24">
      <Container>
        <SectionHead
          eyebrowKo="具"
          eyebrow="FEATURES"
          titleKo="學"
          title={t('landing.v2.features.title', { defaultValue: '一站式的韩语学习工具箱' })}
          sub={t('landing.v2.features.sub', {
            defaultValue:
              '从五十音到 TOPIK 6 级，覆盖你学韩语过程中的每一个场景 — 不再东拼西凑十个 App。',
          })}
        />

        <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-3 lg:grid-rows-[280px_280px_280px]">
          {tiles.map((tile, i) => {
            const seal = sealStyle(tile.tone);
            return (
              <article
                key={i}
                className={`relative flex flex-col overflow-hidden rounded-[22px] p-7 ${toneClass[tile.tone]}`}
                style={{
                  ...toneStyle[tile.tone],
                  gridColumn: tile.span3 ? 'span 3' : tile.span2 ? 'span 2' : undefined,
                  boxShadow: '0 2px 6px rgba(31,27,23,0.04)',
                }}
              >
                <Seal ch={tile.kanji} size={40} bg={seal.bg} fg={seal.fg} className="mb-4" />
                <div className="mb-2 text-[22px] font-extrabold tracking-[-0.4px]">
                  {tile.title}
                </div>
                <div className={`text-[13.5px] leading-[1.55] ${descClass(tile.tone)}`}>
                  {tile.desc}
                </div>
                <div
                  className={`mt-auto flex items-center gap-1.5 font-k-mono text-[11px] font-bold uppercase tracking-[0.5px] ${pillClass(tile.tone)}`}
                >
                  {tile.pill}
                </div>
                <div
                  className="pointer-events-none absolute -bottom-2.5 -right-2.5 select-none font-k-serif text-[180px] font-medium leading-[0.8]"
                  style={{ color: decoColor(tile.tone) }}
                  aria-hidden
                >
                  {tile.deco}
                </div>
              </article>
            );
          })}
        </div>
      </Container>
    </section>
  );
};

// ───────────────────────────────────────────────────────────────────────
// DAILY LOOP (dark)
// ───────────────────────────────────────────────────────────────────────

const DailyLoop: React.FC<{ t: (k: string, opts?: Record<string, unknown>) => string }> = ({
  t,
}) => {
  const cards = [
    {
      koNum: '壹',
      label: t('landing.v2.loop.s1.label', { defaultValue: 'STEP 1 · 早间' }),
      title: t('landing.v2.loop.s1.title', { defaultValue: '复习到期卡' }),
      desc: t('landing.v2.loop.s1.desc', {
        defaultValue: 'FSRS 算法决定今天要复习什么 · 平均 7 分钟搞定。',
      }),
      previewKo: '複',
      preview: t('landing.v2.loop.s1.preview', { defaultValue: '18 卡 · 7 分钟' }),
    },
    {
      koNum: '貳',
      label: t('landing.v2.loop.s2.label', { defaultValue: 'STEP 2 · 课程' }),
      title: t('landing.v2.loop.s2.title', { defaultValue: '新一课内容' }),
      desc: t('landing.v2.loop.s2.desc', {
        defaultValue: '课本 + 听力 + 即学即考 · 任何片段都能截图入卡。',
      }),
      previewKo: '學',
      preview: t('landing.v2.loop.s2.preview', { defaultValue: 'L24 · 8 分钟' }),
    },
    {
      koNum: '參',
      label: t('landing.v2.loop.s3.label', { defaultValue: 'STEP 3 · 通勤' }),
      title: t('landing.v2.loop.s3.title', { defaultValue: '听力沉浸' }),
      desc: t('landing.v2.loop.s3.desc', {
        defaultValue: '真实播客或韩剧片段 · 双语字幕 · 生词秒收。',
      }),
      previewKo: '聽',
      preview: t('landing.v2.loop.s3.preview', { defaultValue: '播客 6 分钟' }),
    },
    {
      koNum: '肆',
      label: t('landing.v2.loop.s4.label', { defaultValue: 'STEP 4 · 睡前' }),
      title: t('landing.v2.loop.s4.title', { defaultValue: '阅读一段' }),
      desc: t('landing.v2.loop.s4.desc', {
        defaultValue: '段落难度自动匹配 · 看完一篇 = 巩固今天的所学。',
      }),
      previewKo: '讀',
      preview: t('landing.v2.loop.s4.preview', { defaultValue: '短文 4 分钟' }),
    },
  ];
  return (
    <section id="loop" className="py-16 md:py-24">
      <Container>
        <div className="rounded-[36px] bg-k-ink px-6 py-16 text-k-bg md:px-12 md:py-24">
          <SectionHead
            tone="dark"
            eyebrowKo="日"
            eyebrow="DAILY LOOP"
            titleKo="日"
            title={t('landing.v2.loop.title', { defaultValue: '四步，一天的韩语就稳了' })}
            sub={t('landing.v2.loop.sub', {
              defaultValue: '不需要意志力 · 早晨打开 App 就是清单 · 任何时候关掉再回来都能续上',
            })}
          />
          <div className="mt-8 grid gap-[18px] md:mt-12 md:grid-cols-2 lg:grid-cols-4">
            {cards.map(c => (
              <div
                key={c.koNum}
                className="rounded-[20px] border border-[rgba(251,248,243,0.08)] bg-[rgba(251,248,243,0.05)] px-[22px] py-7"
              >
                <span className="font-k-serif text-[36px] font-medium leading-none text-[#F2A78D]">
                  {c.koNum}
                </span>
                <div className="mb-1 mt-3.5 text-[11px] font-extrabold uppercase tracking-[2px] text-[rgba(251,248,243,0.5)]">
                  {c.label}
                </div>
                <h4 className="m-0 mb-2.5 text-[19px] font-extrabold tracking-[-0.2px]">
                  {c.title}
                </h4>
                <p className="m-0 text-[13px] leading-[1.55] text-[rgba(251,248,243,0.65)]">
                  {c.desc}
                </p>
                <div className="mt-4 flex items-center gap-2 rounded-[10px] bg-[rgba(251,248,243,0.07)] px-3 py-2.5 text-[11px] font-semibold text-[rgba(251,248,243,0.55)]">
                  <span className="font-k-serif text-[#F2A78D]">{c.previewKo}</span>
                  {c.preview}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
};

// ───────────────────────────────────────────────────────────────────────
// MODULES showcase
// ───────────────────────────────────────────────────────────────────────

const Modules: React.FC<{ t: (k: string, opts?: Record<string, unknown>) => string }> = ({ t }) => (
  <section id="modules" className="bg-k-bg2 py-24">
    <Container className="max-w-7xl">
      <SectionHead
        eyebrowKo="模"
        eyebrow="LEARNING MODULES"
        titleKo="具"
        title={t('landing.v2.modules.title', { defaultValue: '专为长期学习而生的模块' })}
        sub={t('landing.v2.modules.sub', {
          defaultValue: '每一个都打磨过百次 · 不堆功能 · 用起来都「这就是我要的」',
        })}
      />
      <div className="grid gap-6 md:grid-cols-2">
        <ModuleCard
          kanji="詞"
          title={t('landing.v2.modules.m1.title', { defaultValue: '词汇本 · 四模式练习' })}
          desc={t('landing.v2.modules.m1.desc', {
            defaultValue:
              '同一个单词，四种练法 — 闪卡看脸熟、学习模式吃透、考试限时检验、连连看放松收尾。每个词都有 FSRS 记忆强度条。',
          })}
          tags={[
            t('landing.v2.modules.m1.tag1', { defaultValue: 'FSRS 算法' }),
            t('landing.v2.modules.m1.tag2', { defaultValue: '4 种练习模式' }),
            t('landing.v2.modules.m1.tag3', { defaultValue: '例句联想' }),
            t('landing.v2.modules.m1.tag4', { defaultValue: '词册筛选' }),
          ]}
          link={t('landing.v2.modules.m1.link', { defaultValue: '了解词汇模块 →' })}
          href="/features/vocab"
          visualBg="#F2D27A"
          visual={
            <div
              className="w-full rounded-[14px] bg-k-card p-4 text-center"
              style={{ boxShadow: '0 8px 24px rgba(31,27,23,0.1)' }}
            >
              <div className="font-k-serif text-[36px] font-medium tracking-[-1px] text-k-ink">
                골목길
              </div>
              <div className="my-1 mb-3 text-[11px] text-k-sub">gol-mok-gil · n. 巷子</div>
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <span
                    key={i}
                    className="h-2.5 w-2.5 rounded-[4px]"
                    style={{ background: i <= 3 ? '#BFE0CF' : 'rgba(31,27,23,0.15)' }}
                  />
                ))}
              </div>
              <div className="mt-2 text-[10px] font-bold tracking-[1px] text-k-sub">記憶 60%</div>
            </div>
          }
        />

        <ModuleCard
          kanji="能"
          title={t('landing.v2.modules.m2.title', { defaultValue: 'TOPIK · 真题 + AI 考评' })}
          desc={t('landing.v2.modules.m2.desc', {
            defaultValue:
              '深度收录历年阅读与听力真题，1:1 还原真实考场。AI 写作实时批改给出 4 维反馈，更有全真模拟听力变速精听，助你攻克 6 级。',
          })}
          tags={[
            t('landing.v2.modules.m2.tag1', { defaultValue: '10 年历年真题' }),
            t('landing.v2.modules.m2.tag2', { defaultValue: '1:1 模考环境' }),
            t('landing.v2.modules.m2.tag3', { defaultValue: 'AI 写作实时批改' }),
            t('landing.v2.modules.m2.tag4', { defaultValue: '全维成绩预测' }),
          ]}
          link={t('landing.v2.modules.m2.link', { defaultValue: '了解 TOPIK 模块 →' })}
          href="/features/topik"
          visualBg="#BFE0CF"
          visual={
            <svg viewBox="0 0 200 200" width={180} height={180}>
              <circle
                cx={100}
                cy={100}
                r={78}
                fill="none"
                stroke="rgba(31,27,23,0.12)"
                strokeWidth={14}
              />
              <circle
                cx={100}
                cy={100}
                r={78}
                fill="none"
                stroke="var(--color-k-crimson)"
                strokeWidth={14}
                strokeLinecap="round"
                strokeDasharray={490}
                strokeDashoffset={100}
                transform="rotate(-90 100 100)"
              />
              <text
                x={100}
                y={92}
                textAnchor="middle"
                fontFamily="Noto Serif KR"
                fontSize={42}
                fontWeight={500}
                fill="var(--color-k-ink)"
              >
                87
              </text>
              <text
                x={100}
                y={120}
                textAnchor="middle"
                fontFamily="Pretendard"
                fontSize={11}
                fontWeight={700}
                fill="var(--color-k-sub)"
                letterSpacing={1.5}
              >
                TOPIK II · L5
              </text>
            </svg>
          }
        />

        <ModuleCard
          kanji="映"
          title={t('landing.v2.modules.m3.title', { defaultValue: '媒体库 · 精听变速' })}
          desc={t('landing.v2.modules.m3.desc', {
            defaultValue:
              '告别枯燥听力练习。海量真实播客与视频素材，支持 0.5x–1.5x 无级变速、同步脚本显示与点词入卡，在沉浸中驯服每一个韩语发音。',
          })}
          tags={[
            t('landing.v2.modules.m3.tag1', { defaultValue: '4,800+ 片段' }),
            t('landing.v2.modules.m3.tag2', { defaultValue: '双语字幕' }),
            t('landing.v2.modules.m3.tag3', { defaultValue: '点词入卡' }),
            t('landing.v2.modules.m3.tag4', { defaultValue: '难度匹配' }),
          ]}
          link={t('landing.v2.modules.m3.link', { defaultValue: '了解沉浸模块 →' })}
          href="/features/listening"
          visualBg="#F4C5C5"
          visual={
            <div
              className="w-full rounded-[14px] bg-k-ink p-4 text-k-bg"
              style={{ boxShadow: '0 8px 24px rgba(31,27,23,0.1)' }}
            >
              <div className="mb-2 text-[10px] font-bold tracking-[1.5px] text-[rgba(251,248,243,0.5)]">
                ▶ NOW PLAYING · 00:47
              </div>
              <div className="mb-1.5 font-k-serif text-[15px] font-medium leading-[1.5]">
                골목길에서 만난 작은 빵집…
              </div>
              <div className="text-[12px] leading-[1.5] text-[rgba(251,248,243,0.7)]">
                在巷子里遇见的小面包店…
              </div>
              <div className="mt-3 h-[3px] overflow-hidden rounded bg-[rgba(251,248,243,0.15)]">
                <div className="h-full w-[34%]" style={{ background: '#F2A78D' }} />
              </div>
            </div>
          }
        />

        <ModuleCard
          kanji="讀"
          title={t('landing.v2.modules.m4.title', { defaultValue: '分级阅读 · AI 提词' })}
          desc={t('landing.v2.modules.m4.desc', {
            defaultValue:
              '从新闻到精选绘本，所有内容按 L1–L6 难度精准分级。AI 自动提取核心词汇与划词翻译，让长难句解析与背景知识不再是阅读障碍。',
          })}
          tags={[
            t('landing.v2.modules.m4.tag1', { defaultValue: '分级 1–6' }),
            t('landing.v2.modules.m4.tag2', { defaultValue: '绘本库' }),
            t('landing.v2.modules.m4.tag3', { defaultValue: '点词查询' }),
            t('landing.v2.modules.m4.tag4', { defaultValue: '笔记入卡' }),
          ]}
          link={t('landing.v2.modules.m4.link', { defaultValue: '了解阅读模块 →' })}
          href="/features/reading"
          tone="indigo"
          visualBg="#3D4A6B"
          visual={
            <div
              className="w-full rounded-[14px] p-[18px] text-k-ink"
              style={{
                background: 'rgba(251,248,243,0.95)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
              }}
            >
              <div className="mb-2 font-k-serif text-[11px] font-bold tracking-[2px] text-k-crimson">
                三 · LEVEL 3
              </div>
              <div className="font-k-serif text-[14px] font-medium leading-[1.6]">
                <span style={{ background: '#F2D27A', padding: '0 2px', borderRadius: 2 }}>
                  골목길
                </span>
                의 끝에 작은 빵집이 있다. 매일 아침 갓 구운 빵{' '}
                <span style={{ background: '#F4C5C5', padding: '0 2px', borderRadius: 2 }}>
                  냄새
                </span>
                가 거리를 채운다…
              </div>
              <div className="mt-3 flex justify-between text-[11px] font-semibold text-k-sub">
                <span>3 / 18 段</span>
                <span>📖 2.4 分钟</span>
              </div>
            </div>
          }
        />
      </div>
    </Container>
  </section>
);

const ModuleCard: React.FC<{
  kanji: string;
  title: string;
  desc: string;
  tags: string[];
  link: string;
  href?: string;
  visualBg: string;
  visual: React.ReactNode;
  tone?: 'default' | 'indigo';
}> = ({ kanji, title, desc, tags, link, href = '#', visualBg, visual, tone = 'default' }) => {
  const indigo = tone === 'indigo';
  return (
    <article className="grid items-center gap-6 rounded-[24px] bg-k-card p-7 md:grid-cols-[1fr_280px] md:p-9">
      <div>
        <Seal ch={kanji} size={44} className="mb-4" />
        <h3 className="m-0 mb-2.5 text-[26px] font-extrabold tracking-[-0.5px] text-k-ink">
          {title}
        </h3>
        <p className="m-0 mb-4 text-[14px] leading-[1.55] text-[#3A342E]">{desc}</p>
        <ul className="m-0 mb-4 flex list-none flex-wrap gap-1.5 p-0">
          {tags.map(tag => (
            <li
              key={tag}
              className="rounded-[7px] bg-k-bg2 px-2.5 py-1 text-[12px] font-bold text-[#3A342E]"
            >
              {tag}
            </li>
          ))}
        </ul>
        <LocalizedLink
          to={href}
          className="text-[13px] font-bold text-k-crimson no-underline hover:underline"
        >
          {link}
        </LocalizedLink>
      </div>
      <div
        className="relative grid aspect-square place-items-center overflow-hidden rounded-[18px] p-[22px]"
        style={{ background: visualBg, color: indigo ? 'var(--color-k-bg)' : undefined }}
      >
        {visual}
      </div>
    </article>
  );
};

// ───────────────────────────────────────────────────────────────────────
// COMMUNITY STATS
// ───────────────────────────────────────────────────────────────────────

const CommunityStats: React.FC<{ t: (k: string, opts?: Record<string, unknown>) => string }> = ({
  t,
}) => {
  const stats = [
    {
      n: '48,200+',
      l: t('landing.v2.community.s1.l', { defaultValue: '学习伙伴' }),
      s: t('landing.v2.community.s1.s', { defaultValue: '共同进阶' }),
    },
    {
      n: '3,200+',
      l: t('landing.v2.community.s2.l', { defaultValue: '公开词汇本' }),
      s: t('landing.v2.community.s2.s', { defaultValue: '资源共享' }),
    },
    {
      n: '8,400+',
      l: t('landing.v2.community.s3.l', { defaultValue: '学习心得' }),
      s: t('landing.v2.community.s3.s', { defaultValue: '经验沉淀' }),
    },
    {
      n: '87%',
      l: t('landing.v2.community.s4.l', { defaultValue: '坚持天数' }),
      s: t('landing.v2.community.s4.s', { defaultValue: '续写里程' }),
    },
  ];
  return (
    <section id="community" className="py-24">
      <Container>
        <SectionHead
          eyebrowKo="會"
          eyebrow="COMMUNITY"
          titleKo="伴"
          title={t('landing.v2.community.title', { defaultValue: '不一个人学，更走得远' })}
          sub={t('landing.v2.community.sub', {
            defaultValue:
              '共享词汇卡片、交流备考心得、见证彼此成长 · K-Soft 社区让韩语学习不再孤单',
          })}
        />
        <div className="grid grid-cols-2 rounded-[24px] bg-k-bg2 p-2 md:grid-cols-4">
          {stats.map((s, i) => (
            <div
              key={s.l}
              className="px-7 py-8 text-center"
              style={{
                borderRight: i < stats.length - 1 ? '1px dashed rgba(31,27,23,0.12)' : 'none',
              }}
            >
              <div className="font-k-serif text-[48px] font-semibold leading-none tracking-[-1.5px] text-k-crimson">
                {s.n}
              </div>
              <div className="mt-2.5 text-[12px] font-extrabold uppercase tracking-[1.6px] text-[#3A342E]">
                {s.l}
              </div>
              <div className="mt-1 text-[11px] text-k-sub">{s.s}</div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
};

// ───────────────────────────────────────────────────────────────────────
// PRICING
// ───────────────────────────────────────────────────────────────────────

type PricingMode = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'LIFETIME';

const Pricing: React.FC<{
  t: (k: string, opts?: Record<string, unknown>) => string;
  prices: VariantPrices | null;
  onSelect: (plan: PricingMode | 'FREE') => void;
}> = ({ t, prices, onSelect }) => {
  const [mode, setMode] = useState<PricingMode>('ANNUAL');

  const getPrice = (m: PricingMode) => {
    return prices?.REGIONAL?.[m]?.amount ?? prices?.GLOBAL?.[m]?.amount ?? null;
  };
  const getCurrency = (m: PricingMode) => {
    const cur = prices?.REGIONAL?.[m]?.currency ?? prices?.GLOBAL?.[m]?.currency ?? null;
    return cur === 'USD' ? '$' : cur === 'CNY' ? '¥' : (cur ?? '¥');
  };

  const formatPrice = (amt: string | null, fallback: string) => {
    if (!amt) return fallback;
    const n = Number(amt);
    return Number.isFinite(n) ? (n % 1 === 0 ? String(Math.round(n)) : n.toFixed(2)) : String(amt);
  };

  const subDisplay = {
    v: formatPrice(
      getPrice(mode),
      mode === 'MONTHLY' ? '58' : mode === 'QUARTERLY' ? '128' : '468'
    ),
    c: getCurrency(mode),
    u:
      mode === 'MONTHLY'
        ? t('landing.v2.pricing.perMonth', { defaultValue: '/ 月' })
        : mode === 'QUARTERLY'
          ? t('landing.v2.pricing.perQuarter', { defaultValue: '/ 季付' })
          : t('landing.v2.pricing.perYear', { defaultValue: '/ 年付' }),
  };

  const lifetimeDisplay = {
    v: formatPrice(getPrice('LIFETIME'), '888'),
    c: getCurrency('LIFETIME'),
    u: t('landing.v2.pricing.lifetime', { defaultValue: '/ 终身一次' }),
  };

  const tabs: Array<{ key: PricingMode; label: string; save?: string }> = [
    { key: 'MONTHLY', label: t('landing.v2.pricing.tabMonthly', { defaultValue: '月付' }) },
    { key: 'QUARTERLY', label: t('landing.v2.pricing.tabQuarterly', { defaultValue: '季付' }) },
    {
      key: 'ANNUAL',
      label: t('landing.v2.pricing.tabAnnual', { defaultValue: '年付' }),
      save: '最划算',
    },
  ];

  const commonFeatures = [
    { html: t('landing.v2.pricing.pro.f1', { defaultValue: '<b>无限</b>新词 + 科学复习 (FSRS)' }) },
    {
      html: t('landing.v2.pricing.pro.f2', { defaultValue: '全库课程 + TOPIK <b>1-6 级</b>真题' }),
    },
    { html: t('landing.v2.pricing.pro.f3', { defaultValue: '影视 / 播客<b>全库 + 智能脚本</b>' }) },
    { html: t('landing.v2.pricing.pro.f4', { defaultValue: '<b>AI 写作诊断</b> + 变速精听' }) },
    { html: t('landing.v2.pricing.pro.f5', { defaultValue: '社区<b>公开资源</b>无限获取' }) },
    { html: t('landing.v2.pricing.pro.f6', { defaultValue: '全端学习进度<b>实时同步</b>' }) },
  ];

  return (
    <section id="pricing" className="bg-k-bg2 py-16 md:py-32">
      <Container>
        <SectionHead
          eyebrowKo="金"
          eyebrow="SUBSCRIPTION"
          titleKo="擇"
          title={t('landing.v2.pricing.title', { defaultValue: '选一个，开始学' })}
          sub={t('landing.v2.pricing.sub', {
            defaultValue: '加入全球学习者社区，解锁完整的 AI 韩语进阶体验',
          })}
        />

        <div className="mx-auto mt-4 grid max-w-[1200px] items-stretch gap-6 lg:grid-cols-3">
          {/* FREE */}
          <PlanCard
            koName="無"
            title={t('landing.v2.pricing.free.title', { defaultValue: '免费版 · Free' })}
            desc={t('landing.v2.pricing.free.desc', {
              defaultValue: '入门之选 · 开启你的韩语进阶之旅',
            })}
            currency="¥"
            value="0"
            unit={t('landing.v2.pricing.free.unit', { defaultValue: '/ 永久' })}
            features={[
              {
                html: t('landing.v2.pricing.free.f1', { defaultValue: '<b>每日 5 个</b>新学单词' }),
              },
              {
                html: t('landing.v2.pricing.free.f2', {
                  defaultValue: '<b>每日 30 张</b>复习上限',
                }),
              },
              {
                html: t('landing.v2.pricing.free.f3', {
                  defaultValue: '<b>基础课程</b> (L1–L2) 体验',
                }),
              },
              {
                html: t('landing.v2.pricing.free.f4', {
                  defaultValue: '影视 / 播客<b>预览模式</b>',
                }),
              },
              {
                html: t('landing.v2.pricing.free.f5', { defaultValue: 'TOPIK 历年真题' }),
                x: true,
              },
              { html: t('landing.v2.pricing.free.f6', { defaultValue: 'AI 写作诊断' }), x: true },
            ]}
            ctaLabel={t('landing.v2.pricing.free.cta', { defaultValue: '免费开始' })}
            ctaVariant="line"
            onCta={() => onSelect('FREE')}
          />

          {/* PRO (SUBSCRIPTION) */}
          <div className="relative z-10 lg:scale-[1.05]">
            <div className="h-full overflow-hidden rounded-[32px] border-2 border-k-ink bg-k-ink p-1 text-k-bg shadow-2xl">
              {mode === 'ANNUAL' && (
                <div className="absolute top-5 right-5 rounded-full bg-k-crimson px-3 py-1 text-[11px] font-black uppercase tracking-wider text-k-bg">
                  {t('landing.v2.pricing.popular', { defaultValue: 'Popular' })}
                </div>
              )}

              <div className="flex flex-col p-8 pt-10 h-full">
                <div className="mb-6">
                  <Seal
                    ch="恆"
                    size={40}
                    bg="var(--color-k-bg)"
                    fg="var(--color-k-ink)"
                    className="mb-4 shadow-pop-small"
                  />
                  <div className="text-[22px] font-extrabold tracking-tight">
                    {t('landing.v2.pricing.pro.title', { defaultValue: '正式版 · Plus' })}
                  </div>
                  <div className="mt-1 text-[13px] opacity-60">
                    {t('landing.v2.pricing.pro.desc', {
                      defaultValue: '进阶首选 · 全方位解锁 AI 学习黑科技',
                    })}
                  </div>
                </div>

                <div className="mb-8 flex gap-1 rounded-xl bg-white/5 p-1 backdrop-blur-sm">
                  {tabs.map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setMode(tab.key)}
                      className={`relative flex-1 rounded-lg py-2 text-[12px] font-bold transition-all ${
                        mode === tab.key
                          ? 'bg-k-bg text-k-ink shadow-lg'
                          : 'text-white/50 hover:text-white/80'
                      }`}
                    >
                      {tab.label}
                      {tab.save && mode !== tab.key && (
                        <span className="absolute -top-2 -right-1 rounded-full bg-k-crimson px-1.5 py-0.5 text-[8px] text-white">
                          {tab.save}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="mb-8 flex items-baseline gap-1">
                  <span className="font-k-serif text-[24px] font-medium opacity-70">
                    {subDisplay.c}
                  </span>
                  <span className="font-k-serif text-[52px] font-black leading-none tracking-tighter">
                    {subDisplay.v}
                  </span>
                  <span className="ml-1 text-[14px] font-bold opacity-50">{subDisplay.u}</span>
                </div>

                <div className="mb-10 space-y-4 flex-1">
                  {commonFeatures.map((f, i) => (
                    <div key={i} className="flex items-start gap-3.5 text-[14px]">
                      <div className="mt-1 flex h-4 w-4 items-center justify-center rounded-full bg-k-bg text-k-ink shadow-sm">
                        <Check size={10} strokeWidth={4} />
                      </div>
                      <span className="opacity-90" dangerouslySetInnerHTML={{ __html: f.html }} />
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => onSelect(mode)}
                  className="group relative w-full overflow-hidden rounded-2xl bg-k-bg py-4 text-[15px] font-black text-k-ink transition-transform active:scale-[0.98]"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {t('landing.v2.pricing.pro.cta', { defaultValue: '立即开启全能模式' })}
                    <ArrowRight
                      size={18}
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* LIFETIME */}
          <PlanCard
            koName="永"
            title={t('landing.v2.pricing.lifetime.title', { defaultValue: '终身版 · Lifetime' })}
            desc={t('landing.v2.pricing.lifetime.desc', {
              defaultValue: '终身无忧 · 一次投资，永久享有所有功能',
            })}
            currency={lifetimeDisplay.c}
            value={lifetimeDisplay.v}
            unit={lifetimeDisplay.u}
            features={commonFeatures}
            ctaLabel={t('landing.v2.pricing.lifetime.cta', { defaultValue: '永久买断' })}
            ctaVariant="line"
            onCta={() => onSelect('LIFETIME')}
          />
        </div>

        <div className="mt-16 flex flex-col items-center justify-center gap-6 border-t border-k-ink/5 pt-10 text-center">
          <p className="max-w-xl text-[13px] leading-relaxed text-k-sub opacity-70">
            {t('landing.v2.pricing.fine', {
              defaultValue:
                '系统已自动识别您的地区并为您提供专属价格补贴 · 支持微信 / 支付宝 / 银联',
            })}
          </p>
        </div>
      </Container>
    </section>
  );
};

type PlanFeature = { html: string; x?: boolean };

const PlanCard: React.FC<{
  featured?: boolean;
  ribbon?: string;
  koName: string;
  title: string;
  desc: string;
  currency: string;
  value: string;
  unit: string;
  originalPrice?: string;
  features: PlanFeature[];
  ctaLabel: string;
  ctaVariant: 'line' | 'primary' | 'primary-on-dark';
  onCta: () => void;
}> = ({ koName, title, desc, currency, value, unit, features, ctaLabel, onCta }) => {
  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-[32px] border-2 border-k-ink/5 bg-k-bg p-8 shadow-pop transition-all hover:border-k-ink/10 hover:-translate-y-1">
      <div className="mb-6">
        <Seal ch={koName} size={36} className="mb-4 opacity-80" />
        <div className="text-[20px] font-extrabold text-k-ink">{title}</div>
        <div className="mt-1 text-[13px] text-k-sub opacity-80">{desc}</div>
      </div>

      <div className="mb-8 flex items-baseline gap-1">
        <span className="font-k-serif text-[20px] font-medium text-k-sub">{currency}</span>
        <span className="font-k-serif text-[44px] font-black leading-none tracking-tight text-k-ink">
          {value}
        </span>
        <span className="ml-1 text-[13px] font-bold text-k-sub">{unit}</span>
      </div>

      <div className="mb-10 flex-1 space-y-4">
        {features.map((f, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 text-[13px] ${f.x ? 'opacity-30 line-through' : 'text-k-ink'}`}
          >
            <div
              className={`mt-1 flex h-4 w-4 items-center justify-center rounded-full ${f.x ? 'bg-k-sub/20' : 'bg-k-ink/5'}`}
            >
              {f.x ? (
                <div className="h-[1.5px] w-2 bg-k-sub" />
              ) : (
                <Check size={10} strokeWidth={4} className="text-k-crimson" />
              )}
            </div>
            <span dangerouslySetInnerHTML={{ __html: f.html }} />
          </div>
        ))}
      </div>

      <button
        onClick={onCta}
        className="w-full rounded-2xl border-2 border-k-ink bg-transparent py-3.5 text-[14px] font-black text-k-ink transition-all hover:bg-k-ink hover:text-k-bg"
      >
        {ctaLabel}
      </button>
    </div>
  );
};

// ───────────────────────────────────────────────────────────────────────
// TESTIMONIALS
// ───────────────────────────────────────────────────────────────────────

const Testimonials: React.FC<{ t: (k: string, opts?: Record<string, unknown>) => string }> = ({
  t,
}) => (
  <section className="py-24">
    <Container>
      <SectionHead
        eyebrowKo="聲"
        eyebrow="TESTIMONIALS"
        titleKo="話"
        title={t('landing.v2.testimonials.title', { defaultValue: '用过 Duhan 的人都在说' })}
      />
      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-3">
        <TestimonialCard
          tone="crimson"
          large
          tags={[
            t('landing.v2.testimonials.t1.tag1', { defaultValue: '用了 11 个月' }),
            t('landing.v2.testimonials.t1.tag2', { defaultValue: 'TOPIK 5 级达成' }),
          ]}
          quote={t('landing.v2.testimonials.t1.quote', {
            defaultValue:
              '之前用 Anki 自己堆卡，每次复习都焦虑。Duhan 把它包装成「今天就这四步」，神奇地我居然坚持了一年。备考时连续 47 天没断卡，TOPIK II 直接 5 级。',
          })}
          avatarCh="河"
          avatarBg="#F2D27A"
          name={t('landing.v2.testimonials.t1.name', { defaultValue: '河恩 · @hae_eun' })}
          meta={t('landing.v2.testimonials.t1.meta', { defaultValue: '设计师 · 杭州' })}
        />
        <TestimonialCard
          tone="cream"
          tags={[
            t('landing.v2.testimonials.t2.tag1', { defaultValue: '追剧学韩语' }),
            t('landing.v2.testimonials.t2.tag2', { defaultValue: '3 个月' }),
          ]}
          quote={t('landing.v2.testimonials.t2.quote', {
            defaultValue:
              '看 K-Drama 不再只靠字幕组。点哪个词，它就入卡，第二天复习 — 把追剧变成最香的学习。',
          })}
          avatarCh="小"
          avatarBg="#BFE0CF"
          name={t('landing.v2.testimonials.t2.name', { defaultValue: '小柯' })}
          meta={t('landing.v2.testimonials.t2.meta', { defaultValue: '大三学生' })}
        />
        <TestimonialCard
          tone="card"
          tags={[t('landing.v2.testimonials.t3.tag1', { defaultValue: '母语者助教' })]}
          quote={t('landing.v2.testimonials.t3.quote', {
            defaultValue:
              'UI 太治愈了。每次打开都不像在背单词，像在翻一本好看的杂志。重点是真的有用，单词留得住。',
          })}
          avatarCh="민"
          avatarBg="#F4C5C5"
          name={t('landing.v2.testimonials.t3.name', { defaultValue: '민지 · 助教' })}
          meta={t('landing.v2.testimonials.t3.meta', { defaultValue: '首尔 · 母语者' })}
        />
      </div>
    </Container>
  </section>
);

const TestimonialCard: React.FC<{
  tone: 'crimson' | 'cream' | 'card';
  large?: boolean;
  tags: string[];
  quote: string;
  avatarCh: string;
  avatarBg: string;
  name: string;
  meta: string;
}> = ({ tone, large, tags, quote, avatarCh, avatarBg, name, meta }) => {
  const isCrimson = tone === 'crimson';
  const containerClass =
    tone === 'crimson' ? 'bg-k-crimson text-k-bg' : tone === 'cream' ? 'bg-k-bg2' : 'bg-k-card';
  return (
    <article className={`relative rounded-[22px] p-7 ${containerClass}`}>
      <span
        aria-hidden
        className="absolute right-7 top-9 font-k-serif text-[80px] leading-[0.5]"
        style={{ color: isCrimson ? '#F2A78D' : 'var(--color-k-crimson)' }}
      >
        “
      </span>
      <div className="mb-5 flex flex-wrap gap-1.5">
        {tags.map(tag => (
          <span
            key={tag}
            className="rounded-[5px] px-2 py-0.5 text-[10.5px] font-bold tracking-[0.3px]"
            style={{
              background: isCrimson ? 'rgba(251,248,243,0.13)' : 'rgba(31,27,23,0.06)',
              color: isCrimson ? 'var(--color-k-bg)' : '#3A342E',
            }}
          >
            {tag}
          </span>
        ))}
      </div>
      <blockquote
        className={`m-0 mb-6 max-w-[90%] font-medium ${
          large
            ? 'text-[22px] font-semibold leading-[1.4] tracking-[-0.3px]'
            : 'text-[17px] leading-[1.5]'
        }`}
      >
        {quote}
      </blockquote>
      <div
        className="flex items-center gap-3 border-t pt-4"
        style={{
          borderColor: isCrimson ? 'rgba(251,248,243,0.18)' : 'rgba(31,27,23,0.08)',
        }}
      >
        <span
          className="grid h-[42px] w-[42px] place-items-center rounded-full font-k-serif text-[18px] font-semibold text-k-ink"
          style={{ background: avatarBg }}
        >
          {avatarCh}
        </span>
        <div>
          <div className={`text-[14px] font-extrabold ${isCrimson ? 'text-k-bg' : 'text-k-ink'}`}>
            {name}
          </div>
          <div
            className="mt-0.5 text-[12px]"
            style={{ color: isCrimson ? 'rgba(251,248,243,0.6)' : 'var(--color-k-sub)' }}
          >
            {meta}
          </div>
        </div>
      </div>
    </article>
  );
};

// ───────────────────────────────────────────────────────────────────────
// FAQ
// ───────────────────────────────────────────────────────────────────────

const FaqList: React.FC<{
  t: (k: string, opts?: Record<string, unknown>) => string;
  items: LandingFaqItem[];
}> = ({ t, items }) => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  return (
    <section id="faq" className="bg-k-bg2 py-24">
      <Container>
        <SectionHead
          eyebrowKo="問"
          eyebrow="FAQ"
          titleKo="問"
          title={t('landing.v2.faq.title', { defaultValue: '常见问题' })}
        />
        <div className="mx-auto max-w-[820px]">
          {items.map((item, i) => {
            const open = openIdx === i;
            return (
              <div key={i} className="border-b border-[rgba(31,27,23,0.1)] py-5">
                <button
                  type="button"
                  onClick={() => setOpenIdx(open ? null : i)}
                  className="flex w-full cursor-pointer items-center justify-between text-[17px] font-bold text-k-ink"
                >
                  <span className="text-left">
                    <span className="mr-2 font-k-serif text-[22px] font-medium text-k-crimson">
                      問
                    </span>
                    {item.question}
                  </span>
                  <span className="ml-3 text-k-sub">{open ? '−' : '+'}</span>
                </button>
                {open ? (
                  <div className="max-w-[92%] pt-3 text-[14.5px] leading-[1.6] text-[#3A342E]">
                    {item.answer}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </Container>
    </section>
  );
};

// ───────────────────────────────────────────────────────────────────────
// FINAL CTA
// ───────────────────────────────────────────────────────────────────────

const FinalCta: React.FC<{
  t: (k: string, opts?: Record<string, unknown>) => string;
  onFreeStart: () => void;
}> = ({ t, onFreeStart }) => (
  <section className="py-24">
    <Container>
      <div className="relative overflow-hidden rounded-[36px] bg-k-crimson px-6 py-24 text-k-bg">
        <span
          aria-hidden
          className="pointer-events-none absolute bottom-[-120px] right-[-40px] select-none font-k-serif text-[320px] font-medium leading-[0.8] md:bottom-[-200px] md:right-[-60px] md:text-[540px]"
          style={{ color: 'rgba(251,248,243,0.06)' }}
        >
          韓
        </span>
        <div className="relative text-center">
          <div className="my-3 flex items-center justify-center gap-[22px]">
            <span className="h-px max-w-[80px] flex-1 bg-[rgba(251,248,243,0.4)]" />
            <span className="font-k-serif text-[22px] font-medium text-[#F2A78D]">始</span>
            <span className="h-px max-w-[80px] flex-1 bg-[rgba(251,248,243,0.4)]" />
          </div>
          <h2 className="mx-auto m-0 mb-4 max-w-[760px] text-[32px] font-extrabold leading-[1.1] tracking-[-1px] md:text-[60px] md:leading-[1.05] md:tracking-[-1.4px]">
            {t('landing.v2.finalCta.titlePre', { defaultValue: '今天就让韩语' })}
            <br />
            {t('landing.v2.finalCta.titleMid', { defaultValue: '成为你日常的' })}
            <span className="font-k-serif font-medium">
              {t('landing.v2.finalCta.titlePost', { defaultValue: '一部分' })}
            </span>
          </h2>
          <p className="m-0 mb-8 text-[17px] text-[rgba(251,248,243,0.75)]">
            {t('landing.v2.finalCta.sub', {
              defaultValue: '注册 30 秒 · 7 天 Plus 免费试用 · 不要 1 块钱',
            })}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={onFreeStart}
              className="rounded-[13px] bg-k-bg px-7 py-4 text-[15px] font-bold text-k-ink transition-transform hover:-translate-y-[1px]"
            >
              {t('landing.v2.finalCta.ctaPrimary', { defaultValue: '免费开始 →' })}
            </button>
            <button
              type="button"
              className="rounded-[13px] bg-transparent px-7 py-4 text-[15px] font-bold text-k-bg transition-transform hover:-translate-y-[1px]"
              style={{ boxShadow: 'inset 0 0 0 1.5px var(--color-k-bg)' }}
            >
              {t('landing.v2.finalCta.ctaSecondary', { defaultValue: '下载 iOS / Android' })}
            </button>
          </div>
        </div>
      </div>
    </Container>
  </section>
);

// ───────────────────────────────────────────────────────────────────────
// FOOTER
// ───────────────────────────────────────────────────────────────────────

const Footer: React.FC<{ t: (k: string, opts?: Record<string, unknown>) => string }> = ({ t }) => {
  const cols: Array<{ koHead: string; head: string; links: string[] }> = [
    {
      koHead: '具',
      head: t('landing.v2.footer.col1.head', { defaultValue: '产品' }),
      links: [
        t('landing.v2.footer.col1.l1', { defaultValue: '功能总览' }),
        t('landing.v2.footer.col1.l3', { defaultValue: 'TOPIK 备考' }),
        t('landing.v2.footer.col1.l4', { defaultValue: '影视听力' }),
        t('landing.v2.footer.col1.l5', { defaultValue: '分级阅读' }),
        t('landing.v2.footer.col1.l6', { defaultValue: '社区' }),
      ],
    },
    {
      koHead: '學',
      head: t('landing.v2.footer.col2.head', { defaultValue: '学习' }),
      links: [
        t('landing.v2.footer.col2.l1', { defaultValue: '学习指南' }),
        t('landing.v2.footer.col2.l2', { defaultValue: '语法百科' }),
        t('landing.v2.footer.col2.l3', { defaultValue: '备考博客' }),
        t('landing.v2.footer.col2.l4', { defaultValue: '每日韩语' }),
      ],
    },
    {
      koHead: '司',
      head: t('landing.v2.footer.col3.head', { defaultValue: '公司' }),
      links: [
        t('landing.v2.footer.col3.l1', { defaultValue: '关于 Duhan' }),
        t('landing.v2.footer.col3.l5', { defaultValue: '联系我们' }),
      ],
    },
    {
      koHead: '助',
      head: t('landing.v2.footer.col4.head', { defaultValue: '支持' }),
      links: [
        t('landing.v2.footer.col4.l1', { defaultValue: '帮助中心' }),
        t('landing.v2.footer.col4.l2', { defaultValue: '退款政策' }),
        t('landing.v2.footer.col4.l3', { defaultValue: '隐私协议' }),
        t('landing.v2.footer.col4.l4', { defaultValue: '用户协议' }),
      ],
    },
  ];

  return (
    <footer className="pb-8 pt-16">
      <Container>
        <div className="grid grid-cols-2 gap-8 border-b border-[rgba(31,27,23,0.1)] pb-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5 text-[19px] font-extrabold tracking-[-0.3px] text-k-ink">
              <img
                src="/logo.svg"
                alt="Duhan Logo"
                width={32}
                height={32}
                className="rounded-lg flex-shrink-0"
              />
              <span>
                <span className="mr-1 font-k-serif font-medium text-k-crimson">두한</span>Duhan
              </span>
            </div>
            <p className="my-4 mb-5 max-w-[280px] text-[13.5px] leading-[1.55] text-k-sub">
              {t('landing.v2.footer.tag1', { defaultValue: '讀韓 · 让韩语变成日常。' })}
              <br />
              {t('landing.v2.footer.tag2', { defaultValue: '从单词到 TOPIK 6 级，一站搞定。' })}
            </p>
            <div className="flex gap-2">
              {['小', 'D'].map(s => (
                <a
                  key={s}
                  href="#"
                  className="grid h-9 w-9 place-items-center rounded-[9px] bg-k-bg2 font-k-serif text-[16px] font-medium text-k-ink no-underline hover:bg-k-crimson hover:text-white transition-colors"
                  title={s === 'D' ? 'Discord' : 'Xiaohongshu'}
                >
                  {s}
                </a>
              ))}
            </div>
          </div>
          {cols.map(col => (
            <div key={col.head}>
              <h6 className="m-0 mb-4 text-[11px] font-extrabold uppercase tracking-[1.8px] text-k-ink">
                <span className="mr-1 font-k-serif font-medium text-k-crimson">{col.koHead}</span>
                {col.head}
              </h6>
              {col.links.map(l => (
                <a
                  key={l}
                  href="#"
                  className="block py-1 text-[13.5px] text-[#3A342E] no-underline hover:text-k-crimson"
                >
                  {l}
                </a>
              ))}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-6 text-[12px] text-k-sub">
          <div>
            © {new Date().getFullYear()} Duhan ·{' '}
            {t('landing.v2.footer.copy', { defaultValue: '讀韓 · 沪 ICP 备 2026000000 号' })}
          </div>
          <div className="flex items-center gap-5">
            <a href="#" className="text-k-sub no-underline">
              Privacy
            </a>
            <a href="#" className="text-k-sub no-underline">
              Terms
            </a>
            <a href="#" className="text-k-sub no-underline">
              Cookies
            </a>
            <span className="text-[13px] font-bold text-k-ink">EN · 中 · 한국어</span>
          </div>
        </div>
      </Container>
    </footer>
  );
};

// ───────────────────────────────────────────────────────────────────────
// PAGE
// ───────────────────────────────────────────────────────────────────────

export default function Landing() {
  const { i18n, t } = useTranslation();
  const navigate = useLocalizedNavigate();
  const location = useLocation();
  const isScrolled = useLandingScroll();
  const [shouldLoadPrices, setShouldLoadPrices] = useState(false);
  const [prices, setPrices] = useState<VariantPrices | null>(null);

  useEffect(() => {
    if (shouldLoadPrices) return;
    if (typeof globalThis.window === 'undefined') return;
    const nav = globalThis.navigator as LandingNetworkNavigator;
    const conn = nav.connection;
    if (conn?.saveData) return;
    const eff = conn?.effectiveType ?? '4g';
    if (eff.includes('2g') || eff === 'slow-2g') return;

    let cancelled = false;
    const trigger = () => {
      if (!cancelled) setShouldLoadPrices(true);
    };

    const idleWindow = globalThis.window as LandingIdleWindow;
    const onScroll = () => {
      if (globalThis.window.scrollY >= globalThis.window.innerHeight * 0.4) trigger();
    };
    const onPointer = () => trigger();
    let idleId: number | null = null;
    let timeoutId: number | null = null;
    if (idleWindow.requestIdleCallback) {
      idleId = idleWindow.requestIdleCallback(trigger, { timeout: 2200 });
    } else {
      timeoutId = globalThis.window.setTimeout(trigger, 1600);
    }
    globalThis.window.addEventListener('scroll', onScroll, { passive: true });
    globalThis.window.addEventListener('pointerdown', onPointer, { once: true, passive: true });
    return () => {
      cancelled = true;
      globalThis.window.removeEventListener('scroll', onScroll);
      globalThis.window.removeEventListener('pointerdown', onPointer);
      if (idleId !== null && idleWindow.cancelIdleCallback) idleWindow.cancelIdleCallback(idleId);
      if (timeoutId !== null) globalThis.window.clearTimeout(timeoutId);
    };
  }, [shouldLoadPrices]);

  useEffect(() => {
    if (!shouldLoadPrices) return;
    const controller = new AbortController();
    runConvexActionWithRetry(
      () =>
        callPublicConvexAction<Record<string, never>, VariantPrices>(
          'lemonsqueezy:getVariantPrices',
          {},
          { signal: controller.signal }
        ),
      undefined,
      { retries: 2, initialDelayMs: 300 }
    )
      .then(result => setPrices(result))
      .catch(err => {
        if ((err as { name?: string } | null)?.name === 'AbortError') return;
        console.error(err);
      });
    return () => controller.abort();
  }, [shouldLoadPrices]);

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
  const canonicalUrl = `https://koreanstudy.me${location.pathname === '/' ? '' : location.pathname}`;

  const faqItems: LandingFaqItem[] = useMemo(
    () => [
      {
        question: t('landing.v2.faq.q1', { defaultValue: '零基础也能用吗？' }),
        answer: t('landing.v2.faq.a1', {
          defaultValue:
            '完全可以。新用户引导会评估你的水平 · 从五十音到入门会话都有完整课程 · 系统会按你的节奏推进，永远不会让你卡在「太难了」上。',
        }),
      },
      {
        question: t('landing.v2.faq.q2', { defaultValue: 'FSRS 算法是什么？' }),
        answer: t('landing.v2.faq.a2', {
          defaultValue:
            '基于学习科学的间隔重复算法（比传统 Anki SM-2 更精准）· 根据你每次回忆的难度自动安排下一次复习时间 · 平均节省 30% 复习时间，记忆留存却更久。',
        }),
      },
      {
        question: t('landing.v2.faq.q3', { defaultValue: 'Plus 和 Elite 的核心差别？' }),
        answer: t('landing.v2.faq.a3', {
          defaultValue:
            'Plus 给你全部学习内容 · Elite 在此之上加 1v1 真人语伴、写作精改、专属顾问、留学求职配套 — 适合 6 个月内需要拿出实绩的学习者（TOPIK 高分 / 求职 / 留学）。',
        }),
      },
      {
        question: t('landing.v2.faq.q4', { defaultValue: '能离线学吗？' }),
        answer: t('landing.v2.faq.a4', {
          defaultValue:
            'Plus 起支持离线 · 课程、闪卡、播客、阅读素材都可下载 · 通勤地铁、飞机上完全没问题。',
        }),
      },
      {
        question: t('landing.v2.faq.q5', { defaultValue: '有学生折扣吗？' }),
        answer: t('landing.v2.faq.a5', {
          defaultValue:
            '学生认证（学信网 / 学生证）可享 Plus 七折 · Elite 八折。每年学生节（9/1 和 3/1）另有立减券。',
        }),
      },
      {
        question: t('landing.v2.faq.q6', { defaultValue: '不满意可以退款吗？' }),
        answer: t('landing.v2.faq.a6', {
          defaultValue:
            '符合条件的付费方案提供 7 天免费试用；退款申请会结合扣费情况、使用记录、技术问题和适用法律逐案审核。',
        }),
      },
    ],
    [t]
  );

  const analyticsLang = (i18n.language || 'en').split('-')[0] || 'en';
  const handleFreeStart = () => {
    trackEvent('landing_cta_click', {
      language: analyticsLang,
      ctaId: 'free_start',
      placement: 'hero',
      target: '/auth',
    });
    navigate('/auth');
  };
  const handleLogin = () => {
    trackEvent('landing_cta_click', {
      language: analyticsLang,
      ctaId: 'login',
      placement: 'nav',
      target: '/auth',
    });
    navigate('/auth');
  };
  const handleSelectPlan = (plan: PricingMode | 'FREE') => {
    trackEvent('landing_cta_click', {
      language: analyticsLang,
      ctaId: `plan_${plan.toLowerCase()}`,
      placement: 'pricing',
      target: plan === 'FREE' ? '/auth' : '/pricing/details',
    });
    if (plan === 'FREE') {
      navigate('/auth');
      return;
    }
    navigate(buildPricingDetailsPath({ plan, source: 'landing' }));
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-k-bg font-k-sans text-k-ink antialiased selection:bg-[#F2D27A] selection:text-k-ink">
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
      <NavBar isScrolled={isScrolled} onFreeStart={handleFreeStart} onLogin={handleLogin} t={t} />
      <Hero onFreeStart={handleFreeStart} t={t} />
      <LogosStrip t={t} />
      <FeaturesMosaic t={t} />
      <DailyLoop t={t} />
      <Modules t={t} />
      <CommunityStats t={t} />
      <Pricing t={t} prices={prices} onSelect={handleSelectPlan} />
      <Testimonials t={t} />
      <FaqList t={t} items={faqItems} />
      <FinalCta t={t} onFreeStart={handleFreeStart} />
      <Footer t={t} />
    </div>
  );
}
