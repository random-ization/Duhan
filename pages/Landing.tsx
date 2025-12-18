import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import {
    BookOpen, GraduationCap, Headphones, Brain, ArrowRight,
    CheckCircle2, Globe, PlayCircle, Star, Users, Zap
} from 'lucide-react';
import { Language } from '../types';

interface LandingProps {
    language: Language;
    onLanguageChange: (lang: Language) => void;
}

const Landing: React.FC<LandingProps> = ({ language, onLanguageChange }) => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

    // 滚动显现动画 Hook
    const useScrollReveal = () => {
        useEffect(() => {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('opacity-100', 'translate-y-0');
                        entry.target.classList.remove('opacity-0', 'translate-y-10');
                    }
                });
            }, { threshold: 0.1 });

            document.querySelectorAll('.reveal-on-scroll').forEach((el) => observer.observe(el));
            return () => observer.disconnect();
        }, []);
    };

    useScrollReveal();

    return (
        <div className="flex flex-col min-h-screen font-sans bg-slate-50 overflow-x-hidden selection:bg-indigo-500 selection:text-white">

            {/* --- Navbar --- */}
            <nav className="fixed w-full z-50 top-0 transition-all duration-300 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-2">
                            <img src="/logo.jpg" alt="Logo" className="w-8 h-8 rounded-lg shadow-lg" />
                            <span className="font-bold text-xl text-slate-900 tracking-tight">{t('appName')}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            {/* New Navigation Links */}
                            <div className="hidden md:flex items-center gap-6 mr-6">
                                <button
                                    onClick={() => navigate('/courses')}
                                    className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors"
                                >
                                    {t('landing.viewCourses')}
                                </button>
                            </div>

                            {/* Language Selector */}
                            <div className="relative">
                                <button
                                    onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                                    className={`flex items-center gap-1 text-sm font-medium transition-colors p-2 rounded-lg ${isLangMenuOpen ? 'bg-slate-100 text-indigo-600' : 'text-slate-600 hover:text-indigo-600'}`}
                                >
                                    <Globe className="w-4 h-4" />
                                    <span>{language === 'en' ? 'EN' : language === 'zh' ? '中文' : language === 'vi' ? 'VN' : 'MN'}</span>
                                </button>

                                {isLangMenuOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setIsLangMenuOpen(false)}></div>
                                        <div className="absolute right-0 mt-2 w-32 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                                            {[
                                                { val: 'en', label: 'English' },
                                                { val: 'zh', label: '中文' },
                                                { val: 'vi', label: 'Tiếng Việt' },
                                                { val: 'mn', label: 'Монгол' }
                                            ].map((opt) => (
                                                <button
                                                    key={opt.val}
                                                    onClick={() => {
                                                        onLanguageChange(opt.val as Language);
                                                        setIsLangMenuOpen(false);
                                                    }}
                                                    className={`w-full text-left px-4 py-2 text-sm hover:bg-indigo-50 ${language === opt.val ? 'text-indigo-600 font-bold' : 'text-slate-600'}`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>

                            <button onClick={() => navigate('/login')} className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">{t('login')}</button>
                            <button onClick={() => navigate('/register')} className="text-sm font-bold bg-slate-900 text-white px-4 py-2 rounded-full hover:bg-slate-800 transition-all hover:shadow-lg transform hover:-translate-y-0.5">
                                {t('startLearning')}
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* --- Hero Section --- */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
                {/* Animated Background Blobs */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full z-0 pointer-events-none">
                    <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
                    <div className="absolute top-20 right-10 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
                    <div className="absolute -bottom-32 left-1/2 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/50 border border-indigo-100 backdrop-blur-sm mb-8 animate-fade-in-up">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                        </span>
                        <span className="text-sm font-medium text-indigo-900">{t('landing.heroBadge')}</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 tracking-tight mb-8 leading-[1.1] animate-fade-in-up animation-delay-100">
                        {t('landing.heroTitle1')}<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
                            {t('landing.heroTitle2')}
                        </span>
                    </h1>

                    <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up animation-delay-200">
                        {t('landing.heroDesc')}
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up animation-delay-300">
                        <button
                            onClick={() => navigate('/register')}
                            className="w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-1 flex items-center justify-center gap-2"
                        >
                            {t('landing.startTrial')}
                            <ArrowRight className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => navigate('/courses')}
                            className="w-full sm:w-auto px-8 py-4 bg-white text-slate-700 border border-slate-200 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-all hover:-translate-y-1 flex items-center justify-center gap-2"
                        >
                            <PlayCircle className="w-5 h-5 text-indigo-500" />
                            {t('landing.viewBenefits')}
                        </button>
                    </div>

                    {/* Social Proof / Stats */}
                    <div className="mt-16 pt-8 border-t border-slate-200/60 flex flex-wrap justify-center gap-8 md:gap-16 opacity-0 translate-y-10 reveal-on-scroll transition-all duration-700">
                        {[
                            { label: t('landing.statTextbooks'), value: '20+' },
                            { label: t('landing.statPassRate'), value: 'High' },
                            { label: t('landing.statRecommend'), value: '98%' },
                        ].map((stat, i) => (
                            <div key={i} className="flex flex-col items-center">
                                <span className="text-3xl font-bold text-slate-900">{stat.value}</span>
                                <span className="text-sm font-medium text-slate-500 uppercase tracking-wide">{stat.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* --- Scrolling Marquee (Universities/Methods) --- */}
            <div className="bg-slate-900 py-6 overflow-hidden">
                <div className="flex gap-12 animate-scroll whitespace-nowrap text-slate-400 font-bold text-sm tracking-widest uppercase items-center">
                    {/* Duplicate list for infinite scroll effect */}
                    {[...Array(2)].map((_, i) => (
                        <React.Fragment key={i}>
                            <span>Yonsei University (延世)</span>
                            <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                            <span>Sogang University (西江)</span>
                            <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                            <span>Ewha Womans University (梨花)</span>
                            <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                            <span>Seoul National University (首尔大)</span>
                            <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                            <span>Kyung Hee University (庆熙)</span>
                            <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                            <span>TOPIK I & II</span>
                            <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                        </React.Fragment>
                    ))}
                </div>
            </div>

            {/* --- Bento Grid Features --- */}
            <section className="py-24 bg-white relative">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16 opacity-0 translate-y-10 reveal-on-scroll transition-all duration-700">
                        <h2 className="text-base font-bold text-indigo-600 uppercase tracking-wide mb-2">{t('landing.featureEyebrow')}</h2>
                        <p className="text-3xl md:text-4xl font-bold text-slate-900">{t('landing.featureTitle')}</p>
                        <p className="text-slate-500 mt-4 max-w-2xl mx-auto">{t('landing.featureDesc')}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Big Card - Curriculum */}
                        <div className="md:col-span-2 bg-slate-50 rounded-3xl p-8 border border-slate-100 hover:border-indigo-100 transition-all hover:shadow-xl hover:shadow-indigo-100/50 group overflow-hidden relative opacity-0 translate-y-10 reveal-on-scroll duration-700 delay-100">
                            <div className="relative z-10">
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-6 group-hover:scale-110 transition-transform duration-300">
                                    <BookOpen className="w-6 h-6 text-blue-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-3">{t('landing.card1Title')}</h3>
                                <p className="text-slate-500 max-w-md">
                                    {t('landing.card1Desc')}
                                </p>
                            </div>
                            {/* Abstract UI Mockup */}
                            <div className="absolute right-0 bottom-0 w-1/2 h-4/5 bg-white rounded-tl-3xl border-t border-l border-slate-200 shadow-lg translate-x-4 translate-y-4 group-hover:translate-x-2 group-hover:translate-y-2 transition-transform duration-500">
                                <div className="p-4 space-y-3">
                                    <div className="h-2 w-1/3 bg-slate-100 rounded"></div>
                                    <div className="h-8 w-3/4 bg-indigo-50 rounded-lg"></div>
                                    <div className="h-8 w-full bg-white border border-slate-100 rounded-lg"></div>
                                    <div className="h-8 w-5/6 bg-white border border-slate-100 rounded-lg"></div>
                                </div>
                            </div>
                        </div>

                        {/* Tall Card - TOPIK */}
                        <div className="md:row-span-2 bg-slate-900 text-white rounded-3xl p-8 relative overflow-hidden group opacity-0 translate-y-10 reveal-on-scroll duration-700 delay-200">
                            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-600 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity"></div>
                            <div className="relative z-10 h-full flex flex-col">
                                <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm mb-6">
                                    <GraduationCap className="w-6 h-6 text-indigo-300" />
                                </div>
                                <h3 className="text-2xl font-bold mb-3">{t('landing.card2Title')}</h3>
                                <p className="text-slate-400 mb-8">{t('landing.card2Desc')}</p>

                                <div className="mt-auto space-y-3">
                                    {(t('landing.card2List', { returnObjects: true }) as string[]).map((item: string, i: number) => (
                                        <div key={i} className="flex items-center gap-3 bg-white/5 p-3 rounded-xl backdrop-blur-sm border border-white/5">
                                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                                            <span className="text-sm font-medium">{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Small Card - Listening */}
                        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:border-indigo-200 hover:shadow-lg transition-all group opacity-0 translate-y-10 reveal-on-scroll duration-700 delay-300">
                            <div className="w-12 h-12 bg-violet-50 rounded-2xl flex items-center justify-center mb-4 group-hover:rotate-12 transition-transform">
                                <Headphones className="w-6 h-6 text-violet-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">{t('landing.card3Title')}</h3>
                            <p className="text-sm text-slate-500">
                                {t('landing.card3Desc')}
                            </p>
                        </div>

                        {/* Small Card - Vocabulary */}
                        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm hover:border-indigo-200 hover:shadow-lg transition-all group opacity-0 translate-y-10 reveal-on-scroll duration-700 delay-400">
                            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-4 group-hover:rotate-12 transition-transform">
                                <Brain className="w-6 h-6 text-emerald-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">{t('landing.card4Title')}</h3>
                            <p className="text-sm text-slate-500">
                                {t('landing.card4Desc')}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- Steps Section --- */}
            <section className="py-24 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row gap-12 items-center">
                        <div className="w-full md:w-1/2 opacity-0 translate-x-[-20px] reveal-on-scroll duration-700">
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">{t('landing.stepTitle')}</h2>
                            <div className="space-y-8">
                                {[
                                    { title: t('landing.step1Title'), desc: t('landing.step1Desc'), icon: Globe },
                                    { title: t('landing.step2Title'), desc: t('landing.step2Desc'), icon: Zap },
                                    { title: t('landing.step3Title'), desc: t('landing.step3Desc'), icon: Star },
                                ].map((step, idx) => (
                                    <div key={idx} className="flex gap-4">
                                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold relative z-10 ring-4 ring-indigo-50">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-bold text-slate-900 mb-1">{step.title}</h4>
                                            <p className="text-slate-500">{step.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="w-full md:w-1/2 relative opacity-0 translate-x-[20px] reveal-on-scroll duration-700 delay-200">
                            {/* Decorative Mockup */}
                            <div className="relative bg-white rounded-2xl shadow-2xl p-6 border border-slate-200 transform rotate-2 hover:rotate-0 transition-transform duration-500">
                                <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-4">
                                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                                </div>
                                <div className="space-y-4">
                                    <div className="h-8 bg-slate-100 rounded w-1/3"></div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="h-32 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-center">
                                            <BookOpen className="text-indigo-200 w-12 h-12" />
                                        </div>
                                        <div className="h-32 bg-slate-50 rounded-xl flex items-center justify-center">
                                            <GraduationCap className="text-slate-300 w-12 h-12" />
                                        </div>
                                    </div>
                                    <div className="h-24 bg-slate-50 rounded-xl"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- CTA Section --- */}
            <section className="py-24 relative overflow-hidden">
                <div className="absolute inset-0 bg-indigo-900 z-0">
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                    <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20"></div>
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20"></div>
                </div>

                <div className="max-w-4xl mx-auto px-4 relative z-10 text-center reveal-on-scroll">
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-8 tracking-tight">{t('landing.ctaTitle')}</h2>
                    <p className="text-xl text-indigo-200 mb-12 max-w-2xl mx-auto">
                        {t('landing.ctaDesc')}
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <button
                            onClick={() => navigate('/register')}
                            className="px-10 py-5 bg-white text-indigo-900 rounded-full font-bold text-xl hover:bg-indigo-50 transition-all hover:scale-105 shadow-2xl shadow-indigo-900/50"
                        >
                            {t('landing.ctaBtn')}
                        </button>
                    </div>
                    <p className="mt-8 text-sm text-indigo-300">{t('landing.ctaNote')}</p>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white py-12 border-t border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <img src="/logo.jpg" alt="Logo" className="w-8 h-8 rounded-lg" />
                        <span className="font-bold text-slate-900">{t('appName')}</span>
                    </div>
                    <div className="text-slate-500 text-sm">
                        © {new Date().getFullYear()} DuHan Learning. {t('allRightsReserved')}
                    </div>
                    <div className="flex gap-6 text-sm font-medium text-slate-600">
                        <a href="/privacy" className="hover:text-indigo-600">{t('landing.privacy')}</a>
                        <a href="/terms" className="hover:text-indigo-600">{t('landing.term')}</a>
                        {/* {t('landing.legal')} - could handle multiple here if needed */}
                        <a href="/refund" className="hover:text-indigo-600">{t('landing.refundPolicy')}</a>
                        <a href="#" className="hover:text-indigo-600">{t('landing.contactUs')}</a>
                    </div>
                </div>
            </footer>

            {/* --- Styles for Animations (Same as before) --- */}
            <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-scroll {
          animation: scroll 20s linear infinite;
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
          opacity: 0;
          transform: translateY(20px);
        }
        @keyframes fadeInUp {
          to { opacity: 1; transform: translateY(0); }
        }
        .animation-delay-100 { animation-delay: 0.1s; }
        .animation-delay-200 { animation-delay: 0.2s; }
        .animation-delay-300 { animation-delay: 0.3s; }
      `}</style>
        </div>
    );
};

export default Landing;
