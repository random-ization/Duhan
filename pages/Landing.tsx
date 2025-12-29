import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { LanguageSwitcher } from '../src/components/common/LanguageSwitcher';
import {
    ArrowRight, BookOpen, Film, MousePointerClick, Mic,
    Lightbulb, Headphones, Mic2, PauseCircle, Rewind, FastForward,
    GraduationCap, Sparkles, PlayCircle, Library, Rss, ScanText, WifiOff,
    Menu, X
} from 'lucide-react';

export default function Landing() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [isAnnual, setIsAnnual] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen text-slate-900 font-sans antialiased overflow-x-hidden"
            style={{
                backgroundColor: '#F0F4F8',
                backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)',
                backgroundSize: '24px 24px'
            }}
        >
            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 bg-[#F0F4F8]/90 backdrop-blur-md border-b-2 border-black">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 bg-indigo-500 border-2 border-black rounded-lg flex items-center justify-center text-white font-display text-2xl shadow-pop group-hover:translate-y-1 group-hover:shadow-none transition-all">
                            H
                        </div>
                        <span className="font-display text-2xl tracking-wide">{t('appName')}</span>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center gap-8 font-bold text-slate-700">
                        <a href="#features" className="hover:text-indigo-600 hover:underline decoration-2 underline-offset-4 decoration-black">
                            {t('landing.features.videoTag')}
                        </a>
                        <a href="#pricing" className="hover:text-indigo-600 hover:underline decoration-2 underline-offset-4 decoration-black">
                            {t('landing.pricing')}
                        </a>
                        <LanguageSwitcher />
                        <button onClick={() => navigate('/login')} className="text-black hover:text-indigo-600">
                            {t('login')}
                        </button>
                        <button
                            onClick={() => navigate('/register')}
                            className="bg-black text-white px-6 py-2.5 rounded-xl border-2 border-transparent shadow-pop hover:shadow-pop-hover hover:-translate-y-1 transition-all active:translate-y-0 active:shadow-none"
                        >
                            {t('startLearning')}
                        </button>
                    </div>

                    {/* Mobile Menu Button */}
                    <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden bg-white border-t-2 border-black p-6 space-y-4">
                        <LanguageSwitcher />
                        <button onClick={() => { navigate('/login'); setMobileMenuOpen(false); }} className="block w-full text-left font-bold py-2">
                            {t('login')}
                        </button>
                        <button onClick={() => { navigate('/register'); setMobileMenuOpen(false); }} className="block w-full bg-black text-white px-6 py-3 rounded-xl font-bold text-center">
                            {t('startLearning')}
                        </button>
                    </div>
                )}
            </nav>

            {/* Hero Section */}
            <header className="relative pt-40 pb-24 px-6 overflow-hidden">
                <div className="max-w-5xl mx-auto text-center z-10 relative">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-300 border-2 border-black shadow-pop mb-8 transform rotate-1 hover:rotate-0 transition-transform cursor-default">
                        <Sparkles className="w-4 h-4" />
                        <span className="font-bold text-sm">{t('landing.heroBadge')}</span>
                    </div>

                    {/* Title */}
                    <h1 className="font-display text-5xl md:text-7xl leading-[1.1] mb-8 text-slate-900">
                        {t('landing.heroTitle1')} <br />
                        Start <span className="text-indigo-500 bg-yellow-200 px-2 underline decoration-wavy decoration-black decoration-2 underline-offset-8">
                            Living
                        </span> the Language.
                    </h1>

                    {/* Description */}
                    <p className="text-xl md:text-2xl text-slate-600 mb-12 font-medium leading-relaxed max-w-3xl mx-auto">
                        The only platform that combines <strong>fun immersion</strong> (K-Dramas, Podcasts) with <strong>serious academics</strong> (University Textbooks, TOPIK).
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <button
                            onClick={() => navigate('/register')}
                            className="w-full sm:w-auto px-10 py-5 bg-indigo-600 text-white text-xl font-bold rounded-2xl border-2 border-black shadow-pop hover:shadow-pop-hover hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
                        >
                            Start Learning Free <ArrowRight className="w-6 h-6" />
                        </button>
                        <button
                            onClick={() => navigate('/pricing')}
                            className="w-full sm:w-auto px-10 py-5 bg-white text-black text-xl font-bold rounded-2xl border-2 border-black shadow-pop hover:shadow-pop-hover hover:-translate-y-1 transition-all flex items-center justify-center gap-3"
                        >
                            <BookOpen className="w-6 h-6" /> View Curriculum
                        </button>
                    </div>
                </div>
            </header>

            {/* Stats Bar */}
            <div className="border-y-2 border-black bg-white py-12">
                <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    <div>
                        <p className="font-display text-4xl text-indigo-600 mb-1">500+</p>
                        <p className="font-bold text-slate-500 text-sm uppercase tracking-wider">{t('landing.features.videoTag')}</p>
                    </div>
                    <div>
                        <p className="font-display text-4xl text-pink-500 mb-1">Level 1-6</p>
                        <p className="font-bold text-slate-500 text-sm uppercase tracking-wider">{t('landing.features.textbookTag')}</p>
                    </div>
                    <div>
                        <p className="font-display text-4xl text-yellow-500 mb-1">GPT-4</p>
                        <p className="font-bold text-slate-500 text-sm uppercase tracking-wider">AI Tutor</p>
                    </div>
                    <div>
                        <p className="font-display text-4xl text-green-500 mb-1">TOPIK II</p>
                        <p className="font-bold text-slate-500 text-sm uppercase tracking-wider">{t('landing.features.topikTag')}</p>
                    </div>
                </div>
            </div>

            {/* Feature 1: Video Center */}
            <section id="features" className="py-24 px-6 border-b-2 border-black bg-indigo-50">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-16">
                    {/* Mockup */}
                    <div className="md:w-1/2 relative">
                        <div className="absolute -inset-4 bg-black rounded-[2rem] transform rotate-2"></div>
                        <div className="relative bg-white border-2 border-black rounded-3xl p-2 shadow-pop-card overflow-hidden">
                            <div className="bg-slate-800 aspect-video rounded-xl flex items-center justify-center relative overflow-hidden group">
                                <div className="absolute bottom-8 left-0 right-0 text-center px-4">
                                    <span className="bg-black/70 text-white px-4 py-2 rounded-lg text-lg font-medium backdrop-blur-md">
                                        {t('landing.mock.videoSubtitle')}
                                    </span>
                                    <div className="mt-4 flex justify-center gap-2">
                                        <span className="bg-indigo-500 text-white px-2 py-1 rounded text-sm font-bold cursor-pointer hover:bg-indigo-400">
                                            {t('landing.mock.videoWord1')}
                                        </span>
                                        <span className="text-white px-2 py-1 text-sm">{t('landing.mock.videoWord2')}</span>
                                        <span className="text-white px-2 py-1 text-sm">{t('landing.mock.videoWord3')}</span>
                                    </div>
                                </div>
                                <PlayCircle className="w-20 h-20 text-white opacity-80" />
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="md:w-1/2">
                        <div className="w-16 h-16 bg-indigo-100 border-2 border-black rounded-2xl flex items-center justify-center mb-6 shadow-pop text-indigo-600">
                            <Film className="w-8 h-8" />
                        </div>
                        <h2 className="font-display text-4xl md:text-5xl mb-6 text-slate-900">
                            {t('landing.features.videoTitle')}
                        </h2>
                        <p className="text-lg text-slate-700 mb-6 font-medium leading-relaxed">
                            {t('landing.features.videoDesc')}
                        </p>
                        <ul className="space-y-4 font-bold text-slate-600">
                            <li className="flex items-start gap-3">
                                <MousePointerClick className="w-6 h-6 text-indigo-500 mt-0.5" />
                                <div>
                                    <span className="text-black">{t('landing.features.videoPoint1')}</span>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <Mic className="w-6 h-6 text-indigo-500 mt-0.5" />
                                <div>
                                    <span className="text-black">{t('landing.features.videoPoint2')}</span>
                                </div>
                            </li>
                            <li className="flex items-start gap-3">
                                <Mic className="w-6 h-6 text-indigo-500 mt-0.5" />
                                <div>
                                    <span className="text-black">{t('landing.features.videoPoint3')}</span>
                                </div>
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* Feature 2: University Curriculum */}
            <section className="py-24 px-6 border-b-2 border-black bg-white">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row-reverse items-center gap-16">
                    {/* Mockup */}
                    <div className="md:w-1/2 relative">
                        <div className="absolute -inset-4 bg-green-200 rounded-[2rem] transform -rotate-2 border-2 border-black"></div>
                        <div className="relative bg-white border-2 border-black rounded-3xl p-6 shadow-pop-card">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between border-b-2 border-slate-100 pb-2">
                                    <span className="font-display text-xl">{t('landing.mock.textbookTitle')}</span>
                                    <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded border border-green-200">Level 1</span>
                                </div>
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center font-bold">A</div>
                                    <div className="flex-1 bg-slate-50 p-3 rounded-xl rounded-tl-none border border-slate-200 text-sm">
                                        {t('landing.mock.textbookContent')}
                                    </div>
                                </div>
                                <div className="bg-yellow-50 p-4 rounded-xl border-2 border-yellow-200">
                                    <p className="font-bold text-yellow-800 text-sm mb-1 flex items-center gap-1">
                                        <Lightbulb className="w-4 h-4" /> {t('landing.mock.grammarTitle')}
                                    </p>
                                    <p className="text-xs text-yellow-700">{t('landing.mock.grammarExplanation')}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="md:w-1/2">
                        <div className="w-16 h-16 bg-green-100 border-2 border-black rounded-2xl flex items-center justify-center mb-6 shadow-pop text-green-700">
                            <Library className="w-8 h-8" />
                        </div>
                        <h2 className="font-display text-4xl md:text-5xl mb-6 text-slate-900">
                            {t('landing.features.textbookTitle')}
                        </h2>
                        <p className="text-lg text-slate-700 mb-6 font-medium leading-relaxed">
                            {t('landing.features.textbookDesc')}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-200">
                                <h4 className="font-display font-bold mb-1">{t('landing.curriculum.beginner')}</h4>
                                <p className="text-sm text-slate-500">{t('landing.curriculum.beginnerDesc')}</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-200">
                                <h4 className="font-display font-bold mb-1">{t('landing.curriculum.intermediate')}</h4>
                                <p className="text-sm text-slate-500">{t('landing.curriculum.intermediateDesc')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Feature 3: Podcast */}
            <section className="py-24 px-6 border-b-2 border-black bg-yellow-50">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-16">
                    {/* Mockup */}
                    <div className="md:w-1/2 relative">
                        <div className="absolute -inset-4 bg-yellow-300 rounded-[2rem] transform rotate-2 border-2 border-black"></div>
                        <div className="relative bg-white border-2 border-black rounded-3xl p-6 shadow-pop-card overflow-hidden">
                            <div className="bg-slate-900 rounded-2xl p-6 text-white mb-4">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                                        <Mic2 className="w-8 h-8 text-white" />
                                    </div>
                                    <div>
                                        <h4 className="font-display font-bold text-lg">{t('landing.mock.podcastTitle')}</h4>
                                        <p className="text-slate-400 text-sm">{t('landing.mock.podcastHost')}</p>
                                    </div>
                                </div>
                                {/* Waveform */}
                                <div className="flex items-end justify-between h-8 gap-1 mb-4 opacity-70">
                                    {[3, 5, 8, 4, 2, 6, 7, 3, 5, 4].map((h, i) => (
                                        <div key={i} className={`w-1 rounded-full ${i === 2 ? 'bg-yellow-400' : 'bg-white'}`} style={{ height: `${h * 4}px` }} />
                                    ))}
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-mono">04:20</span>
                                    <div className="flex gap-4 items-center">
                                        <Rewind className="w-6 h-6" />
                                        <PauseCircle className="w-8 h-8 text-yellow-400" />
                                        <FastForward className="w-6 h-6" />
                                    </div>
                                    <span className="text-xs font-mono">12:00</span>
                                </div>
                            </div>
                            <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4 h-24 overflow-hidden relative">
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-50 to-transparent z-10 pointer-events-none"></div>
                                <p className="text-sm text-slate-400 mb-2">...previous sentence.</p>
                                <p className="text-base font-bold text-slate-900 bg-yellow-100 inline p-1 rounded">
                                    {t('landing.mock.topikQuestion')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="md:w-1/2">
                        <div className="w-16 h-16 bg-yellow-300 border-2 border-black rounded-2xl flex items-center justify-center mb-6 shadow-pop text-black">
                            <Headphones className="w-8 h-8" />
                        </div>
                        <h2 className="font-display text-4xl md:text-5xl mb-6 text-slate-900">
                            {t('landing.features.podcastTitle')}
                        </h2>
                        <p className="text-lg text-slate-700 mb-6 font-medium leading-relaxed">
                            {t('landing.features.podcastDesc')}
                        </p>
                        <ul className="space-y-4 font-bold text-slate-600">
                            <li className="flex items-start gap-3">
                                <div className="bg-black text-white p-1 rounded"><Rss className="w-4 h-4" /></div>
                                <span className="text-black">{t('landing.features.podcastPoint1')}</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="bg-black text-white p-1 rounded"><ScanText className="w-4 h-4" /></div>
                                <span className="text-black">{t('landing.features.podcastPoint2')}</span>
                            </li>
                            <li className="flex items-start gap-3">
                                <div className="bg-black text-white p-1 rounded"><WifiOff className="w-4 h-4" /></div>
                                <span className="text-black">{t('landing.features.podcastPoint3')}</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* Feature 4: TOPIK */}
            <section className="py-24 px-6 border-b-2 border-black bg-white">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row-reverse items-center gap-16">
                    {/* Mockup */}
                    <div className="md:w-1/2 relative">
                        <div className="absolute -inset-4 bg-pink-300 rounded-[2rem] transform -rotate-2 border-2 border-black"></div>
                        <div className="relative bg-white border-2 border-black rounded-3xl p-6 shadow-pop-card">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-display font-bold text-xl">TOPIK II (Writing)</h3>
                                <div className="bg-slate-100 px-3 py-1 rounded-lg border border-slate-300 font-mono text-red-500 font-bold animate-pulse">
                                    24:59 left
                                </div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-200 mb-4">
                                <p className="text-sm font-bold mb-2">{t('landing.mock.topikQuestion')}</p>
                                <div className="h-20 bg-white border border-slate-200 rounded-lg flex items-end justify-center gap-4 p-2">
                                    <div className="w-8 bg-blue-400 h-1/2"></div>
                                    <div className="w-8 bg-blue-600 h-3/4"></div>
                                    <div className="w-8 bg-blue-800 h-full"></div>
                                </div>
                            </div>
                            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 relative">
                                <div className="absolute -top-3 -right-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-lg shadow-sm">
                                    AI Feedback
                                </div>
                                <p className="text-xs text-green-800 font-mono mb-1">Grammar Check:</p>
                                <p className="text-sm text-slate-700">
                                    You wrote: <span className="line-through text-red-400">증가하고 있다</span> <br />
                                    Better: <span className="font-bold text-green-600 bg-green-100 px-1">증가하는 추세이다</span>
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="md:w-1/2">
                        <div className="w-16 h-16 bg-pink-200 border-2 border-black rounded-2xl flex items-center justify-center mb-6 shadow-pop text-pink-600">
                            <GraduationCap className="w-8 h-8" />
                        </div>
                        <h2 className="font-display text-4xl md:text-5xl mb-6 text-slate-900">
                            {t('landing.features.topikTitle')}
                        </h2>
                        <p className="text-lg text-slate-700 mb-6 font-medium leading-relaxed">
                            {t('landing.features.topikDesc')}
                        </p>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-200 flex gap-4 hover:border-pink-300 transition-colors">
                                <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center font-bold text-lg">📝</div>
                                <div>
                                    <h4 className="font-display font-bold text-slate-900">{t('landing.features.topikPoint1')}</h4>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-200 flex gap-4 hover:border-pink-300 transition-colors">
                                <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center font-bold text-lg">📊</div>
                                <div>
                                    <h4 className="font-display font-bold text-slate-900">{t('landing.features.topikPoint2')}</h4>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-200 flex gap-4 hover:border-pink-300 transition-colors">
                                <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center font-bold text-lg">🕒</div>
                                <div>
                                    <h4 className="font-display font-bold text-slate-900">{t('landing.features.topikPoint3')}</h4>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-24 px-6 relative">
                <div className="max-w-5xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="font-display text-4xl md:text-5xl mb-4 text-slate-900">{t('landing.pricingTitle')}</h2>
                        <div className="inline-flex bg-white p-1 rounded-xl border-2 border-black shadow-pop">
                            <button
                                onClick={() => setIsAnnual(false)}
                                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${!isAnnual ? 'bg-indigo-500 text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'text-slate-500 hover:text-black'}`}
                            >
                                {t('landing.pricingMonthly')}
                            </button>
                            <button
                                onClick={() => setIsAnnual(true)}
                                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${isAnnual ? 'bg-indigo-500 text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'text-slate-500 hover:text-black'}`}
                            >
                                {t('landing.pricingAnnual')} (Save 40%)
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                        {/* Monthly */}
                        <div className="bg-white p-8 rounded-3xl border-2 border-black shadow-pop hover:-translate-y-1 transition-all">
                            <h3 className="font-display text-xl mb-4">{t('landing.pricingMonthly')}</h3>
                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-4xl font-black text-slate-900">$6.90</span>
                                <span className="text-slate-500 font-bold">/{t('landing.pricingMonth')}</span>
                            </div>
                            <button
                                onClick={() => navigate('/register')}
                                className="block w-full py-3 border-2 border-black rounded-xl text-center font-bold hover:bg-slate-50 hover:shadow-pop-sm transition-all"
                            >
                                {t('landing.pricingGetStarted')}
                            </button>
                        </div>

                        {/* Annual - Featured */}
                        <div className="bg-indigo-500 p-8 rounded-3xl border-2 border-black shadow-pop-card relative transform md:-translate-y-4 md:scale-105 z-10">
                            <div className="absolute top-0 right-0 bg-yellow-400 text-black px-4 py-2 border-l-2 border-b-2 border-black rounded-bl-xl font-bold text-xs uppercase tracking-wider">
                                {t('landing.pricingPopular')}
                            </div>
                            <h3 className="font-display text-xl text-white mb-4">{t('landing.pricingAnnual')}</h3>
                            <div className="flex items-baseline gap-1 mb-1">
                                <span className="text-5xl font-black text-white">$49.00</span>
                                <span className="text-indigo-200 font-bold">/yr</span>
                            </div>
                            <p className="text-sm text-white/80 font-bold mb-8">Just $4.08/{t('landing.pricingMonth')}</p>
                            <button
                                onClick={() => navigate('/register')}
                                className="block w-full py-4 bg-white text-black border-2 border-black rounded-xl text-center font-bold shadow-pop hover:shadow-pop-hover hover:-translate-y-1 transition-all"
                            >
                                {t('landing.pricingStartTrial')}
                            </button>
                        </div>

                        {/* Lifetime */}
                        <div className="bg-white p-8 rounded-3xl border-2 border-black shadow-pop hover:-translate-y-1 transition-all">
                            <h3 className="font-display text-xl mb-4">Lifetime</h3>
                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-4xl font-black text-slate-900">$99.00</span>
                                <span className="text-slate-500 font-bold">once</span>
                            </div>
                            <button
                                onClick={() => navigate('/register')}
                                className="block w-full py-3 bg-slate-100 border-2 border-black rounded-xl text-center font-bold hover:bg-white hover:shadow-pop-sm transition-all"
                            >
                                Get Lifetime
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white border-t-2 border-black py-12 px-6 mt-12">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-display">H</div>
                        <span className="font-bold text-slate-900">© 2025 {t('appName')}.</span>
                    </div>
                    <div className="flex gap-8 text-sm font-bold text-slate-500">
                        <Link to="/privacy" className="hover:text-black">{t('landing.privacy')}</Link>
                        <Link to="/terms" className="hover:text-black">{t('landing.term')}</Link>
                        <a href="mailto:support@koreanstudy.me" className="hover:text-black">{t('landing.contactUs')}</a>
                    </div>
                </div>
            </footer>
        </div>
    );
}
