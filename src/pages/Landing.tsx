import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, Navigate } from 'react-router-dom';
import { useConvexAuth } from 'convex/react';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { LocalizedLink } from '../components/LocalizedLink';
import { SEO } from '../seo/SEO';
import { getRouteMeta } from '../seo/publicRoutes';
import { LanguageSwitcher } from '../components/common/LanguageSwitcher';
import { usePhoneVerifyModal } from '../contexts/PhoneVerifyModalContext';
import {
  ArrowRight,
  PlayCircle,
  Sparkles,
  Trophy,
  Check,
  BarChart3,
  BarChart2,
  Lock,
  BrainCircuit,
  Volume2,
  Zap,
  Bot,
  FileDown,
  Download,
  Mic2,
  Youtube,
  SkipBack,
  SkipForward,
  PauseCircle,
  Play,
  ChevronDown,
  Gift,
  Menu,
  X,
} from 'lucide-react';

export default function Landing() {
  const { t, i18n } = useTranslation();
  const navigate = useLocalizedNavigate();
  const { open } = usePhoneVerifyModal();
  const location = useLocation();
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [expandedFeatureCards, setExpandedFeatureCards] = useState({
    pdf: false,
    podcast: false,
    video: false,
  });

  // Redirect authenticated users to dashboard moved to bottom to avoid conditional hooks
  // if (!authLoading && isAuthenticated) {
  //   return <Navigate to="dashboard" replace />;
  // }

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

  // Condition return AFTER hooks
  const meta = getRouteMeta(location.pathname);
  const showLocalizedPromo =
    i18n.language === 'zh' ||
    i18n.language === 'vi' ||
    i18n.language === 'mn' ||
    i18n.language.startsWith('zh-');

  const demoAssets = {
    userAvatar: '/landing/avatar-user.svg',
  } as const;

  const toggleFeatureCard = (key: keyof typeof expandedFeatureCards) => {
    setExpandedFeatureCards(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (!authLoading && isAuthenticated) {
    return <Navigate to="dashboard" replace />;
  }

  return (
    <div className="min-h-screen font-landing antialiased text-slate-900 overflow-x-hidden bg-[#FAFAFA] selection:bg-[#FFDE59] selection:text-black">
      <SEO
        title={meta.title}
        description={meta.description}
        keywords={meta.keywords}
        noIndex={meta.noIndex}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'DuHan Korean Learning',
            description: meta.description,
            applicationCategory: 'EducationalApplication',
            operatingSystem: 'Web',
            url: 'https://koreanstudy.me',
            offers: [
              {
                '@type': 'Offer',
                name: 'Monthly Subscription',
                price: '6.90',
                priceCurrency: 'USD',
                priceValidUntil: '2026-12-31',
                availability: 'https://schema.org/InStock',
              },
              {
                '@type': 'Offer',
                name: 'Annual Subscription',
                price: '49.00',
                priceCurrency: 'USD',
                priceValidUntil: '2026-12-31',
                availability: 'https://schema.org/InStock',
              },
              {
                '@type': 'Offer',
                name: 'Lifetime Access',
                price: '99.00',
                priceCurrency: 'USD',
                priceValidUntil: '2026-12-31',
                availability: 'https://schema.org/InStock',
              },
            ],
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: '4.8',
              ratingCount: '500',
              bestRating: '5',
              worstRating: '1',
            },
            publisher: {
              '@type': 'Organization',
              name: 'DuHan',
              url: 'https://koreanstudy.me',
            },
          }),
        }}
      />

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
              className="w-10 h-10 rounded-xl shadow-lg"
            />
            <span className="font-heading font-bold text-2xl tracking-tight">
              {t('common.appName')}
            </span>
          </LocalizedLink>

          <div className="hidden md:flex items-center gap-8 font-semibold text-slate-600 text-sm">
            <a href="#topik" className="hover:text-emerald-600 transition-colors">
              {t('landing.nav.topik')}
            </a>
            <a href="#fsrs" className="hover:text-[#FFDE59] transition-colors">
              {t('landing.nav.fsrs')}
            </a>
            <a href="#ai" className="hover:text-violet-500 transition-colors">
              {t('landing.nav.ai')}
            </a>
            <a href="#pricing" className="hover:text-black transition-colors">
              {t('landing.nav.pricing')}
            </a>
            <button
              onClick={() => navigate('/register')}
              className="bg-slate-900 text-white px-5 py-2.5 rounded-full font-bold hover:bg-slate-800 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              {t('landing.nav.cta')}
            </button>
            <div className="ml-6">
              <LanguageSwitcher />
            </div>
          </div>

          <div className="md:hidden flex items-center gap-2">
            <button
              className="p-2"
              aria-label={mobileMenuOpen ? t('landing.nav.closeMenu') : t('landing.nav.openMenu')}
              onClick={() => setMobileMenuOpen(v => !v)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <div className="ml-2">
              <LanguageSwitcher />
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-200 px-6 py-5 space-y-4">
            <div className="flex items-center justify-end">
              <button
                onClick={() => {
                  navigate('/login');
                  setMobileMenuOpen(false);
                }}
                className="text-sm font-semibold text-slate-700"
              >
                {t('login')}
              </button>
            </div>
            <div className="grid gap-3 text-sm font-semibold text-slate-700">
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
            <button
              onClick={() => {
                navigate('/register');
                setMobileMenuOpen(false);
              }}
              className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold"
            >
              {t('landing.nav.cta')}
            </button>
          </div>
        )}
      </nav>

      <header className="pt-40 pb-32 px-6 relative overflow-hidden bg-[linear-gradient(#f0f0f0_1px,transparent_1px),linear-gradient(90deg,#f0f0f0_1px,transparent_1px)] [background-size:40px_40px]">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 shadow-sm text-slate-600 text-sm font-semibold mb-8">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            {t('landing.hero.badge')}
          </div>

          <h1 className="text-6xl md:text-8xl font-heading font-extrabold leading-[1.05] mb-8 text-slate-900 tracking-tight">
            {t('landing.hero.titleLine1')}
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-pink-500">
              {t('landing.hero.titleGradient')}
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-slate-500 font-medium max-w-2xl mx-auto mb-12 leading-relaxed">
            {t('landing.hero.desc')}
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-5">
            <button
              onClick={() => navigate('/register')}
              className="px-10 py-5 bg-[#FFDE59] border-2 border-black text-black text-lg font-bold rounded-2xl shadow-pop hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] transition-all flex items-center justify-center gap-3"
            >
              {t('landing.hero.ctaPrimary')}
              <ArrowRight className="w-5 h-5" />
            </button>
            <a
              href="#topik"
              className="px-10 py-5 bg-white text-slate-700 text-lg font-bold rounded-2xl border-2 border-slate-200 hover:border-black hover:text-black transition-all flex items-center justify-center gap-3"
            >
              <PlayCircle className="w-5 h-5" />
              {t('landing.hero.ctaSecondary')}
            </a>
          </div>
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-500/5 rounded-full blur-3xl -z-10" />
      </header>

      <div className="border-y border-slate-200 bg-white py-12">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="text-4xl font-heading font-extrabold text-slate-900 mb-1">
              {t('landing.stats.topikCoverageValue')}
            </div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              {t('landing.stats.topikCoverageLabel')}
            </div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-heading font-extrabold text-slate-900 mb-1">
              {t('landing.stats.aiValue')}
            </div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              {t('landing.stats.aiLabel')}
            </div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-heading font-extrabold text-slate-900 mb-1">
              {t('landing.stats.fsrsValue')}
            </div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              {t('landing.stats.fsrsLabel')}
            </div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-heading font-extrabold text-slate-900 mb-1">
              {t('landing.stats.levelRange')}
            </div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              {t('landing.stats.levelSupportLabel')}
            </div>
          </div>
        </div>
      </div>

      <main className="space-y-0">
        <section id="topik" className="py-32 overflow-hidden bg-white">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center gap-20">
            <div className="md:w-1/2 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-600 rounded-lg font-bold text-sm mb-6">
                <Trophy className="w-4 h-4" />
                {t('landing.topik.badge')}
              </div>
              <h2 className="text-4xl md:text-5xl font-heading font-bold mb-6 leading-tight">
                {t('landing.topik.titleLine1')}
                <br />
                <span className="text-emerald-600">{t('landing.topik.titleHighlight')}</span>
              </h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                {t('landing.topik.desc')}
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-4">
                  <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600 mt-1">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{t('landing.topik.point1Title')}</h4>
                    <p className="text-sm text-slate-500">{t('landing.topik.point1Desc')}</p>
                  </div>
                </li>
                <li className="flex items-start gap-4">
                  <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600 mt-1">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{t('landing.topik.point2Title')}</h4>
                    <p className="text-sm text-slate-500">{t('landing.topik.point2Desc')}</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="md:w-1/2 relative">
              <div className="absolute inset-0 bg-emerald-500/10 rounded-[3rem] transform rotate-3 scale-105 -z-10" />
              <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 p-4 flex gap-2 items-center">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="mx-auto bg-white px-4 py-1 rounded-md text-xs font-bold text-slate-400 shadow-sm border border-slate-100 flex items-center gap-2">
                    <Lock className="w-3 h-3" /> {t('landing.topik.mockDomain')}
                  </div>
                </div>
                <div className="p-8">
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h3 className="font-bold text-xl">{t('landing.topik.mockTitle')}</h3>
                      <p className="text-sm text-slate-500">{t('landing.topik.mockSubtitle')}</p>
                    </div>
                    <div className="bg-red-50 text-red-600 px-4 py-2 rounded-xl font-mono font-bold border border-red-100">
                      58:42
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                      <p className="font-bold mb-4 text-lg">{t('landing.topik.mockQuestion')}</p>
                      <p className="mb-4 text-slate-700">{t('landing.topik.mockStem')}</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-white border border-slate-200 rounded-lg hover:border-emerald-600 cursor-pointer flex gap-3 items-center">
                          <div className="w-5 h-5 rounded-full border border-slate-300" />
                          {t('landing.topik.mockChoice1')}
                        </div>
                        <div className="p-3 bg-emerald-600 text-white border border-emerald-600 rounded-lg shadow-md cursor-pointer flex gap-3 items-center">
                          <div className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[10px]">
                            ✓
                          </div>
                          {t('landing.topik.mockChoice2')}
                        </div>
                        <div className="p-3 bg-white border border-slate-200 rounded-lg cursor-pointer flex gap-3 items-center">
                          <div className="w-5 h-5 rounded-full border border-slate-300" />
                          {t('landing.topik.mockChoice3')}
                        </div>
                        <div className="p-3 bg-white border border-slate-200 rounded-lg cursor-pointer flex gap-3 items-center">
                          <div className="w-5 h-5 rounded-full border border-slate-300" />
                          {t('landing.topik.mockChoice4')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="fsrs" className="py-32 bg-slate-50 relative border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row-reverse items-center gap-20">
            <div className="md:w-1/2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FFDE59]/30 text-slate-900 rounded-lg font-bold text-sm mb-6">
                <BrainCircuit className="w-4 h-4" />
                {t('landing.fsrs.badge')}
              </div>
              <h2 className="text-4xl md:text-5xl font-heading font-bold mb-6 leading-tight">
                {t('landing.fsrs.titleLine1')}
                <br />
                <span className="text-[#FFDE59] drop-shadow-sm [text-shadow:1px_1px_0_#000]">
                  {t('landing.fsrs.titleHighlight')}
                </span>
              </h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                {t('landing.fsrs.desc')}
              </p>
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                  <div className="text-3xl font-bold text-slate-900 mb-1">
                    {t('landing.fsrs.stat1Value')}
                  </div>
                  <div className="text-sm font-bold text-slate-400">
                    {t('landing.fsrs.stat1Label')}
                  </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                  <div className="text-3xl font-bold text-slate-900 mb-1">
                    {t('landing.fsrs.stat2Value')}
                  </div>
                  <div className="text-sm font-bold text-slate-400">
                    {t('landing.fsrs.stat2Label')}
                  </div>
                </div>
              </div>
            </div>

            <div className="md:w-1/2 relative">
              <div className="absolute -inset-4 bg-gradient-to-tr from-[#FFDE59]/20 to-orange-100 rounded-full blur-3xl opacity-60" />
              <div className="relative grid gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-2xl border-2 border-black transform md:-rotate-3 z-20">
                  <div className="flex justify-between items-start mb-8">
                    <span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-500">
                      {t('landing.fsrs.cardBadge')}
                    </span>
                    <Volume2 className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="text-center py-8">
                    <div className="text-4xl font-extrabold text-slate-900 mb-2">
                      {t('landing.fsrs.word')}
                    </div>
                    <div className="text-xl text-slate-400 font-serif italic">
                      {t('landing.fsrs.wordMeaning')}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-8">
                    <button className="py-2 rounded-lg bg-red-50 text-red-600 text-xs font-bold border border-red-100">
                      {t('landing.fsrs.rateAgain')}
                      <br />
                      <span className="opacity-60">{t('landing.fsrs.rateAgainHint')}</span>
                    </button>
                    <button className="py-2 rounded-lg bg-orange-50 text-orange-600 text-xs font-bold border border-orange-100">
                      {t('landing.fsrs.rateHard')}
                      <br />
                      <span className="opacity-60">{t('landing.fsrs.rateHardHint')}</span>
                    </button>
                    <button className="py-2 rounded-lg bg-green-50 text-green-600 text-xs font-bold border border-green-100">
                      {t('landing.fsrs.rateGood')}
                      <br />
                      <span className="opacity-60">{t('landing.fsrs.rateGoodHint')}</span>
                    </button>
                    <button className="py-2 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold border border-blue-100">
                      {t('landing.fsrs.rateEasy')}
                      <br />
                      <span className="opacity-60">{t('landing.fsrs.rateEasyHint')}</span>
                    </button>
                  </div>
                </div>
                <div className="absolute top-4 left-4 w-full h-full bg-[#FFDE59]/30 rounded-2xl border-2 border-black -z-10 transform rotate-2" />
              </div>
            </div>
          </div>
        </section>

        <section id="ai" className="py-32 bg-white border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center gap-20">
            <div className="md:w-1/2">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-100 text-violet-600 rounded-lg font-bold text-sm mb-6">
                <Sparkles className="w-4 h-4" />
                {t('landing.ai.badge')}
              </div>
              <h2 className="text-4xl md:text-5xl font-heading font-bold mb-6 leading-tight">
                {t('landing.ai.titleLine1')}
                <br />
                <span className="text-violet-600">{t('landing.ai.titleHighlight')}</span>
              </h2>
              <p className="text-lg text-slate-600 mb-8 leading-relaxed">{t('landing.ai.desc')}</p>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <h4 className="font-bold mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-violet-600" />
                  {t('landing.ai.supportTitle')}
                </h4>
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
              </div>
            </div>

            <div className="md:w-1/2 relative">
              <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-w-md mx-auto">
                <div className="bg-violet-600 p-6 text-white">
                  <div className="font-bold text-lg mb-1">{t('landing.ai.chatTitle')}</div>
                  <div className="text-violet-200 text-sm">{t('landing.ai.chatSubtitle')}</div>
                </div>
                <div className="p-6 space-y-6 bg-slate-50 min-h-[400px]">
                  <div className="flex gap-4 flex-row-reverse">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0 overflow-hidden">
                      <img
                        src={demoAssets.userAvatar}
                        alt={t('landing.ai.userAlt')}
                        className="w-full h-full"
                      />
                    </div>
                    <div className="bg-violet-600 text-white p-4 rounded-2xl rounded-tr-none shadow-md max-w-[80%]">
                      <p className="text-sm">{t('landing.ai.userQuestion')}</p>
                      <p className="text-xs bg-white/20 mt-2 p-2 rounded">
                        {t('landing.ai.userExample')}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 text-white">
                      <Bot className="w-6 h-6" />
                    </div>
                    <div className="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-slate-200 max-w-[90%]">
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {t('landing.ai.botAnswer')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-6 relative overflow-hidden bg-slate-900 text-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-5xl md:text-7xl font-heading font-extrabold tracking-tight mb-5">
                {t('landing.toolbox.title')}
              </h2>
              <p className="text-lg md:text-2xl text-slate-400/90">
                {t('landing.toolbox.subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
              <div
                role="button"
                tabIndex={0}
                aria-expanded={expandedFeatureCards.pdf}
                onClick={() => toggleFeatureCard('pdf')}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') toggleFeatureCard('pdf');
                }}
                className={`group cursor-pointer bg-slate-800 rounded-3xl border border-slate-700 hover:border-[#FFDE59] hover:bg-slate-800/80 transition-all duration-300 overflow-hidden relative outline-none flex flex-col ${
                  expandedFeatureCards.pdf ? 'ring-2 ring-[#FFDE59] md:min-h-[760px]' : ''
                }`}
              >
                <div className="p-8 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#FFDE59]/10 text-[#FFDE59] flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300">
                      <FileDown className="w-6 h-6 text-[#FFDE59]" />
                    </div>
                    <ChevronDown
                      className={`w-6 h-6 text-slate-500 transition-transform duration-300 ${
                        expandedFeatureCards.pdf ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                  <h3 className="text-2xl font-bold mb-2 text-white">
                    {t('landing.toolbox.card1Title')}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-4">
                    {t('landing.toolbox.card1Desc')}
                  </p>

                  <div className="flex-1 min-h-0">
                    <div
                      className={`grid h-full min-h-0 transition-all duration-500 ease-in-out ${
                        expandedFeatureCards.pdf ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                      }`}
                    >
                      <div className="overflow-hidden min-h-0 flex flex-col">
                        <div className="pt-6 border-t border-slate-700/50 flex-1 min-h-0 flex flex-col">
                          <div className="grid grid-cols-2 gap-3 mb-6">
                            <div className="bg-slate-700/50 p-3 rounded-xl border border-slate-600 text-xs text-slate-300">
                              <strong className="text-[#FFDE59] block mb-1">
                                {t('landing.toolbox.demo.pdf.block1Title')}
                              </strong>
                              {t('landing.toolbox.demo.pdf.block1Value')}
                            </div>
                            <div className="bg-slate-700/50 p-3 rounded-xl border border-slate-600 text-xs text-slate-300">
                              <strong className="text-[#FFDE59] block mb-1">
                                {t('landing.toolbox.demo.pdf.block2Title')}
                              </strong>
                              {t('landing.toolbox.demo.pdf.block2Value')}
                            </div>
                          </div>

                          <div className="relative w-full bg-white text-slate-900 p-6 rounded-sm shadow-paper transform hover:scale-[1.02] transition-transform duration-500 mb-6 font-sans">
                            <div className="flex justify-between items-end border-b-2 border-slate-800 pb-3 mb-4">
                              <div>
                                <h4 className="font-bold text-lg leading-none">
                                  {t('landing.toolbox.demo.pdf.sheetTitle')}
                                </h4>
                                <div className="flex gap-2 mt-2">
                                  <span className="text-[10px] bg-slate-100 px-1 border border-slate-300">
                                    {t('landing.toolbox.demo.pdf.badge1')}
                                  </span>
                                  <span className="text-[10px] bg-slate-800 text-white px-1">
                                    {t('landing.toolbox.demo.pdf.badge2')}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-xs">www.koreanstudy.me</div>
                                <div className="text-[8px] text-slate-400">
                                  {t('landing.toolbox.demo.pdf.siteTagline')}
                                </div>
                              </div>
                            </div>

                            <table className="w-full text-left">
                              <thead className="bg-slate-50 border-y border-slate-300 text-[10px] font-bold text-slate-600">
                                <tr>
                                  <th className="py-1 pl-2 w-8">#</th>
                                  <th className="py-1">
                                    {t('landing.toolbox.demo.pdf.tableWord')}
                                  </th>
                                  <th className="py-1">
                                    {t('landing.toolbox.demo.pdf.tableMeaning')}
                                  </th>
                                  <th className="py-1 w-12 text-center">
                                    {t('landing.toolbox.demo.pdf.tableQuiz')}
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="text-sm">
                                <tr className="border-b border-slate-100">
                                  <td className="py-3 pl-2 text-slate-400 text-xs font-mono">01</td>
                                  <td className="py-3 font-bold font-serif text-lg">더운물</td>
                                  <td className="py-3 text-slate-600 text-xs">
                                    {t('landing.toolbox.demo.pdf.meaning1')}
                                  </td>
                                  <td className="py-3 text-center">
                                    <div className="w-4 h-4 border border-slate-300 rounded mx-auto" />
                                  </td>
                                </tr>
                                <tr className="border-b border-slate-100">
                                  <td className="py-3 pl-2 text-slate-400 text-xs font-mono">02</td>
                                  <td className="py-3 font-bold font-serif text-lg">먹다</td>
                                  <td className="py-3 text-slate-600 text-xs">
                                    {t('landing.toolbox.demo.pdf.meaning2')}
                                  </td>
                                  <td className="py-3 text-center">
                                    <div className="w-4 h-4 border border-slate-300 rounded mx-auto" />
                                  </td>
                                </tr>
                                <tr className="border-b border-slate-100 opacity-30">
                                  <td className="py-3 pl-2 text-slate-400 text-xs font-mono">03</td>
                                  <td className="py-3 font-bold font-serif text-lg">공부하다</td>
                                  <td className="py-3 text-slate-600 text-xs">
                                    {t('landing.toolbox.demo.pdf.meaning3')}
                                  </td>
                                  <td className="py-3 text-center">
                                    <div className="w-4 h-4 border border-slate-300 rounded mx-auto" />
                                  </td>
                                </tr>
                              </tbody>
                            </table>

                            <div className="mt-6 pt-2 border-t border-slate-200 flex justify-between items-center text-[8px] text-slate-400">
                              <span>{t('landing.toolbox.demo.pdf.footerLeft')}</span>
                              <span>{t('landing.toolbox.demo.pdf.footerRight')}</span>
                            </div>

                            <div
                              className="absolute bottom-0 right-0 w-8 h-8 bg-gradient-to-tl from-slate-300 to-white shadow-sm"
                              style={{ clipPath: 'polygon(100% 0, 0 100%, 100% 100%)' }}
                            />
                          </div>

                          <button
                            onClick={e => e.stopPropagation()}
                            className="w-full py-3 bg-[#FFDE59] text-black font-bold rounded-xl hover:bg-white transition-colors shadow-lg flex justify-center gap-2 items-center mt-auto"
                          >
                            <Download className="w-4 h-4" /> {t('landing.toolbox.card1Cta')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                role="button"
                tabIndex={0}
                aria-expanded={expandedFeatureCards.podcast}
                onClick={() => toggleFeatureCard('podcast')}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') toggleFeatureCard('podcast');
                }}
                className={`group cursor-pointer bg-slate-800 rounded-3xl border border-slate-700 hover:border-[#EC4899] hover:bg-slate-800/80 transition-all duration-300 overflow-hidden relative outline-none flex flex-col ${
                  expandedFeatureCards.podcast ? 'ring-2 ring-[#EC4899] md:min-h-[760px]' : ''
                }`}
              >
                <div className="p-8 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#EC4899]/10 text-[#EC4899] flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300">
                      <Mic2 className="w-6 h-6 text-[#EC4899]" />
                    </div>
                    <ChevronDown
                      className={`w-6 h-6 text-slate-500 transition-transform duration-300 ${
                        expandedFeatureCards.podcast ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                  <h3 className="text-2xl font-bold mb-2 text-white">
                    {t('landing.toolbox.card2Title')}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-4">
                    {t('landing.toolbox.card2Desc')}
                  </p>

                  <div className="flex-1 min-h-0">
                    <div
                      className={`grid h-full min-h-0 transition-all duration-500 ease-in-out ${
                        expandedFeatureCards.podcast ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                      }`}
                    >
                      <div className="overflow-hidden min-h-0 flex flex-col">
                        <div className="pt-6 border-t border-slate-700/50 flex-1 min-h-0 flex flex-col">
                          <ul className="space-y-2 text-sm text-slate-300 mb-6">
                            <li className="flex gap-2">
                              <Check className="w-4 h-4 text-[#EC4899]" />
                              <strong>{t('landing.toolbox.card2Point1Title')}</strong>:{' '}
                              {t('landing.toolbox.card2Point1Desc')}
                            </li>
                            <li className="flex gap-2">
                              <Check className="w-4 h-4 text-[#EC4899]" />
                              <strong>{t('landing.toolbox.card2Point2Title')}</strong>:{' '}
                              {t('landing.toolbox.card2Point2Desc')}
                            </li>
                          </ul>

                          <div className="bg-black border border-slate-700 rounded-xl overflow-hidden mb-6 relative shadow-2xl">
                            <div className="bg-slate-900/80 p-3 flex items-center gap-3 backdrop-blur-md border-b border-slate-800">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#EC4899] to-purple-600 flex items-center justify-center animate-pulse">
                                <BarChart2 className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex-1">
                                <div className="text-[10px] text-slate-400">
                                  {t('landing.toolbox.demo.podcast.nowPlaying')}
                                </div>
                                <div className="text-xs font-bold text-white">
                                  {t('landing.toolbox.demo.podcast.episodeTitle')}
                                </div>
                              </div>
                            </div>

                            <div className="h-48 p-4 relative overflow-hidden bg-slate-900">
                              <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-transparent to-slate-900 z-10 pointer-events-none" />

                              <div className="space-y-4 pt-12">
                                <p className="text-slate-600 text-xs text-center blur-[0.5px]">
                                  안녕하세요 여러분...
                                </p>

                                <div className="bg-slate-800/50 p-3 rounded-lg border-l-4 border-[#EC4899] transform scale-105 transition-all">
                                  <p className="text-white text-sm font-bold leading-relaxed">
                                    오늘 날씨가 정말{' '}
                                    <span className="bg-[#EC4899] text-white px-1 rounded cursor-help relative group/tooltip">
                                      좋네요
                                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white text-black text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap opacity-0 group-hover/tooltip:opacity-100 transition-opacity">
                                        {t('landing.toolbox.demo.podcast.tooltip')}
                                      </span>
                                    </span>
                                    .
                                  </p>
                                  <p className="text-slate-400 text-[10px] mt-1">
                                    {t('landing.toolbox.demo.podcast.translation')}
                                  </p>
                                </div>

                                <p className="text-slate-600 text-xs text-center blur-[0.5px]">
                                  어디 놀러 가고 싶어요.
                                </p>
                              </div>
                            </div>

                            <div className="p-3 bg-slate-900 border-t border-slate-800 flex justify-center gap-4">
                              <SkipBack className="w-4 h-4 text-slate-400" />
                              <PauseCircle className="w-8 h-8 text-brand-pink -my-2" />
                              <SkipForward className="w-4 h-4 text-slate-400" />
                            </div>
                          </div>

                          <button
                            onClick={e => e.stopPropagation()}
                            className="w-full py-3 bg-[#EC4899] text-white font-bold rounded-xl hover:bg-pink-500 transition-colors shadow-lg mt-auto"
                          >
                            {t('landing.toolbox.card2Cta')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                role="button"
                tabIndex={0}
                aria-expanded={expandedFeatureCards.video}
                onClick={() => toggleFeatureCard('video')}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') toggleFeatureCard('video');
                }}
                className={`group cursor-pointer bg-slate-800 rounded-3xl border border-slate-700 hover:border-[#8B5CF6] hover:bg-slate-800/80 transition-all duration-300 overflow-hidden relative outline-none flex flex-col ${
                  expandedFeatureCards.video ? 'ring-2 ring-[#8B5CF6] md:min-h-[760px]' : ''
                }`}
              >
                <div className="p-8 flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#8B5CF6]/10 text-[#8B5CF6] flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300">
                      <Youtube className="w-6 h-6 text-[#8B5CF6]" />
                    </div>
                    <ChevronDown
                      className={`w-6 h-6 text-slate-500 transition-transform duration-300 ${
                        expandedFeatureCards.video ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                  <h3 className="text-2xl font-bold mb-2 text-white">
                    {t('landing.toolbox.card3Title')}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed mb-4">
                    {t('landing.toolbox.card3Desc')}
                  </p>

                  <div className="flex-1 min-h-0">
                    <div
                      className={`grid h-full min-h-0 transition-all duration-500 ease-in-out ${
                        expandedFeatureCards.video ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                      }`}
                    >
                      <div className="overflow-hidden min-h-0 flex flex-col">
                        <div className="pt-6 border-t border-slate-700/50 flex-1 min-h-0 flex flex-col">
                          <div className="bg-[#8B5CF6]/10 p-3 rounded-lg border border-[#8B5CF6]/30 mb-6 flex gap-3 items-center">
                            <Sparkles className="w-4 h-4 text-[#8B5CF6]" />
                            <span className="text-xs text-[#8B5CF6] font-bold">
                              {t('landing.toolbox.card3Tip')}
                            </span>
                          </div>

                          <div className="bg-black h-[288px] rounded-xl border border-slate-700 relative mb-6 flex flex-col justify-end group/video shadow-2xl">
                            <div className="absolute inset-0 overflow-hidden rounded-xl">
                              <div
                                className="absolute inset-0 bg-cover bg-center opacity-60"
                                style={{
                                  backgroundImage:
                                    "url('https://images.unsplash.com/photo-1532292404099-b50a2673010b?q=80&w=600&auto=format&fit=crop')",
                                }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
                            </div>

                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/video:opacity-100 transition-opacity cursor-pointer">
                              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                                <Play className="w-5 h-5 text-white" />
                              </div>
                            </div>

                            <div className="relative z-20 p-6 text-center pb-8">
                              <div className="inline-block bg-black/80 backdrop-blur-md px-4 py-2 rounded-xl text-lg text-white font-medium mb-2 border border-slate-700 shadow-xl">
                                김치를{' '}
                                <span className="text-[#8B5CF6] font-bold border-b-2 border-[#8B5CF6] cursor-help relative group/ai">
                                  먹어서
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-56 bg-white text-slate-900 p-4 rounded-xl shadow-2xl text-left pointer-events-none opacity-0 group-hover/ai:opacity-100 transition-all duration-300 z-50 transform translate-y-2 group-hover/ai:translate-y-0">
                                    <div className="flex items-center gap-2 mb-2 border-b border-slate-100 pb-2">
                                      <div className="bg-[#8B5CF6] text-white p-1 rounded">
                                        <Bot className="w-3 h-3" />
                                      </div>
                                      <span className="text-xs font-bold text-[#8B5CF6]">
                                        {t('landing.toolbox.demo.video.aiTitle')}
                                      </span>
                                    </div>
                                    <div className="text-xs space-y-2">
                                      <p>
                                        <strong className="text-black">
                                          {t('landing.toolbox.demo.video.baseForm')}
                                        </strong>
                                        : {t('landing.toolbox.demo.video.baseFormValue')}
                                      </p>
                                      <p>
                                        <strong className="text-black">
                                          {t('landing.toolbox.demo.video.grammar')}
                                        </strong>
                                        : {t('landing.toolbox.demo.video.grammarValue')}
                                      </p>
                                      <p className="text-slate-500 bg-slate-100 p-1 rounded">
                                        {t('landing.toolbox.demo.video.gloss')}
                                      </p>
                                    </div>
                                    <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white rotate-45 border-r border-b border-slate-100" />
                                  </div>
                                </span>{' '}
                                매워요.
                              </div>
                              <div className="text-xs text-slate-300 font-medium">
                                {t('landing.toolbox.demo.video.translation')}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={e => e.stopPropagation()}
                            className="w-full py-3 bg-[#8B5CF6] text-white font-bold rounded-xl hover:bg-purple-500 transition-colors shadow-lg mt-auto"
                          >
                            {t('landing.toolbox.card3Cta')}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="py-32 bg-white">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-heading font-bold mb-4">{t('landing.pricing.title')}</h2>
              <p className="text-slate-500">{t('landing.pricing.subtitle')}</p>
            </div>

            {showLocalizedPromo && (
              <div className="max-w-xl mx-auto bg-[#E9FBF4] border-2 border-[#10B981] rounded-2xl shadow-pop p-6 flex items-center justify-between gap-4 mb-10">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="w-12 h-12 bg-[#10B981] rounded-full border-2 border-black flex items-center justify-center flex-shrink-0">
                    <Gift className="w-6 h-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-heading font-extrabold text-slate-900">
                        {t('pricingDetails.promo.card.title')}
                      </h3>
                      <span className="bg-[#FFDE59] text-black border border-black rounded px-2 py-0.5 text-[10px] font-black">
                        {t('pricingDetails.promo.card.badge')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">
                      {t('pricingDetails.promo.card.description')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    open();
                  }}
                  className="bg-white text-black border-2 border-black rounded-xl shadow-pop px-4 py-2 text-sm font-bold hover:shadow-pop-hover hover:-translate-y-0.5 transition-all whitespace-nowrap"
                >
                  {t('pricingDetails.promo.card.cta')}
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
              <div className="p-8 border border-slate-200 rounded-3xl">
                <div className="font-bold text-lg mb-2">{t('landing.pricing.free.title')}</div>
                <div className="text-4xl font-extrabold mb-6">
                  {t('landing.pricing.free.price')}
                </div>
                <ul className="space-y-4 text-sm text-slate-600 mb-8">
                  <li className="flex gap-2">
                    <Check className="w-4 h-4" />
                    {t('landing.pricing.free.feature1')}
                  </li>
                  <li className="flex gap-2">
                    <Check className="w-4 h-4" />
                    {t('landing.pricing.free.feature2')}
                  </li>
                  <li className="flex gap-2">
                    <Check className="w-4 h-4" />
                    {t('landing.pricing.free.feature3')}
                  </li>
                </ul>
                <button
                  onClick={() => navigate('/register')}
                  className="w-full py-3 rounded-xl border border-slate-300 font-bold hover:bg-slate-50"
                >
                  {t('landing.pricing.free.cta')}
                </button>
              </div>

              <div
                className={`p-8 text-white rounded-3xl shadow-xl relative transform md:scale-105 border-4 border-[#FFDE59] overflow-hidden ${
                  showLocalizedPromo ? 'bg-[#173C41]' : 'bg-slate-900'
                }`}
              >
                {showLocalizedPromo ? (
                  <div className="absolute top-5 right-5 bg-[#10B981] text-black border-2 border-black px-4 py-2 rounded-xl font-black text-xs tracking-wider animate-float">
                    {t('pricingDetails.promo.activated')}
                  </div>
                ) : (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#FFDE59] text-black px-4 py-1 rounded-full text-xs font-bold uppercase">
                    {t('landing.pricing.pro.badge')}
                  </div>
                )}

                <div className="font-bold text-lg mb-2 text-[#FFDE59]">
                  {t('landing.pricing.pro.title')}
                </div>

                {showLocalizedPromo ? (
                  <>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-3xl font-black text-[#10B981]">$</span>
                      <span className="text-6xl font-extrabold text-[#10B981]">1.9</span>
                      <span className="text-slate-400 text-sm">
                        {t('pricingDetails.period.month', '/月')}
                      </span>
                    </div>
                    <div className="text-slate-400 font-bold text-sm mb-6">
                      {t('pricingDetails.originalLabel', '原价')}{' '}
                      <span className="line-through decoration-red-500 decoration-wavy decoration-2">
                        $6.90
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-5xl font-extrabold mb-1">
                      {t('landing.pricing.pro.price')}
                    </div>
                    <div className="text-slate-400 text-sm mb-6">
                      {t('landing.pricing.pro.period')}
                    </div>
                  </>
                )}

                <ul className="space-y-4 text-sm text-slate-200 mb-8">
                  <li className="flex gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    {t('landing.pricing.pro.feature1')}
                  </li>
                  <li className="flex gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    {t('landing.pricing.pro.feature2')}
                  </li>
                  <li className="flex gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    {t('landing.pricing.pro.feature3')}
                  </li>
                  <li className="flex gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    {t('landing.pricing.pro.feature4')}
                  </li>
                </ul>

                <button
                  onClick={() => {
                    if (showLocalizedPromo) {
                      open();
                      return;
                    }
                    navigate('/pricing/details?plan=ANNUAL&source=landing');
                  }}
                  className="w-full py-4 bg-[#FFDE59] text-black rounded-xl font-bold shadow-lg hover:bg-yellow-300 transition-colors"
                >
                  {showLocalizedPromo
                    ? t('pricingDetails.promo.verifyNow')
                    : t('landing.pricing.pro.cta')}
                </button>
              </div>

              <div className="p-8 border border-slate-200 rounded-3xl bg-slate-50">
                <div className="font-bold text-lg mb-2">{t('landing.pricing.lifetime.title')}</div>
                <div className="text-4xl font-extrabold mb-6">
                  {t('landing.pricing.lifetime.price')}
                </div>
                <ul className="space-y-4 text-sm text-slate-600 mb-8">
                  <li className="flex gap-2">
                    <Check className="w-4 h-4" />
                    {t('landing.pricing.lifetime.feature1')}
                  </li>
                  <li className="flex gap-2">
                    <Check className="w-4 h-4" />
                    {t('landing.pricing.lifetime.feature2')}
                  </li>
                </ul>
                <button
                  onClick={() => navigate('/pricing/details?plan=LIFETIME&source=landing')}
                  className="w-full py-3 rounded-xl border border-slate-300 font-bold hover:bg-white"
                >
                  {t('landing.pricing.lifetime.cta')}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="py-24 bg-slate-50 border-t border-slate-200">
          <div className="max-w-3xl mx-auto px-6">
            <h2 className="text-3xl font-heading font-bold mb-12 text-center">
              {t('landing.faq.title')}
            </h2>
            <div className="space-y-6">
              <details className="bg-white p-6 rounded-2xl border border-slate-200 group cursor-pointer">
                <summary className="font-bold text-lg list-none flex justify-between items-center">
                  {t('landing.faq.q1')}
                  <ChevronDown className="w-5 h-5 group-open:rotate-180 transition-transform" />
                </summary>
                <p className="mt-4 text-slate-600 leading-relaxed">{t('landing.faq.a1')}</p>
              </details>
              <details className="bg-white p-6 rounded-2xl border border-slate-200 group cursor-pointer">
                <summary className="font-bold text-lg list-none flex justify-between items-center">
                  {t('landing.faq.q2')}
                  <ChevronDown className="w-5 h-5 group-open:rotate-180 transition-transform" />
                </summary>
                <p className="mt-4 text-slate-600 leading-relaxed">{t('landing.faq.a2')}</p>
              </details>
              <details className="bg-white p-6 rounded-2xl border border-slate-200 group cursor-pointer">
                <summary className="font-bold text-lg list-none flex justify-between items-center">
                  {t('landing.faq.q3')}
                  <ChevronDown className="w-5 h-5 group-open:rotate-180 transition-transform" />
                </summary>
                <p className="mt-4 text-slate-600 leading-relaxed">{t('landing.faq.a3')}</p>
              </details>
            </div>
          </div>
        </section>

        <footer className="bg-white py-12 border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src="/logo.png" alt={t('common.appName')} className="w-9 h-9 rounded-lg" />
              <div className="font-heading font-bold text-2xl">{t('common.appName')}</div>
            </div>
            <div className="flex justify-center gap-6 text-sm text-slate-500 font-semibold mb-8">
              <a href="#topik" className="hover:text-black">
                {t('landing.footer.about')}
              </a>
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
            <p className="text-xs text-slate-400">{t('landing.footer.copyright')}</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
