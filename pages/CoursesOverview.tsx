import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import {
    ArrowLeft, BookOpen, GraduationCap,
    Crown, X as XIcon, CheckCircle2, FileText, Filter, Clock
} from 'lucide-react';
import PricingSection from '../components/PricingSection';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useLearning } from '../contexts/LearningContext';

const CoursesOverview: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user } = useAuth();
    const { institutes } = useData();
    const { setSelectedInstitute, setSelectedLevel } = useLearning();

    // --- Textbook Selection (Logged In) ---
    if (user) {
        return (
            <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
                {/* 1. Header & Filter */}
                <div className="max-w-7xl mx-auto px-6 py-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                        <div>
                            <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3 mb-2">
                                <span className="text-indigo-600">|||\</span> 选择教材系列
                            </h1>
                            <p className="text-slate-500 font-medium">请选择一本教材，开始您的韩语学习之旅</p>
                        </div>

                        {/* Fake Filter Dropdown (Visual Only for now) */}
                        <div className="bg-white border border-slate-200 rounded-lg shadow-sm px-4 py-2 flex items-center gap-2 text-slate-600 cursor-pointer hover:border-indigo-300 transition">
                            <Filter size={16} />
                            <span className="font-bold text-sm">全部语学院</span>
                        </div>
                    </div>

                    {/* 2. Books Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {institutes.map(inst => (
                            <div
                                key={inst.id}
                                className="group relative flex flex-col items-center"
                            >
                                {/* Book Cover Card */}
                                <div
                                    onClick={() => {
                                        setSelectedInstitute(inst.id);
                                        // Default to level 1 for now regarding the UI flow
                                        setSelectedLevel(1);
                                        navigate('/dashboard/course');
                                    }}
                                    className="bg-white p-4 rounded-xl shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 border border-slate-100 cursor-pointer w-full max-w-[280px] aspect-[3/4] flex items-center justify-center relative overflow-hidden"
                                >
                                    {inst.coverUrl ? (
                                        <img src={inst.coverUrl} className="w-full h-full object-contain drop-shadow-md" alt={inst.name} />
                                    ) : (
                                        <div className="text-center p-6">
                                            <div className="w-20 h-20 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <BookOpen size={32} />
                                            </div>
                                            <h3 className="font-bold text-slate-800">{inst.name}</h3>
                                        </div>
                                    )}

                                    {/* Continuing Badge (Mock) */}
                                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur text-indigo-600 text-xs font-bold px-3 py-1 rounded-full shadow-sm flex items-center gap-1 border border-indigo-100">
                                        <Clock size={12} /> 继续
                                    </div>
                                </div>

                                {/* Details Below */}
                                <div className="mt-4 text-center">
                                    <h3 className="font-black text-slate-800 text-lg mb-1">{inst.name}</h3>
                                    <p className="text-slate-400 text-xs font-bold">1级 (上册)</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // --- Marketing Page (Existing Code) ---
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('opacity-100', 'translate-y-0');
                    entry.target.classList.remove('opacity-0', 'translate-y-10');
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, []);

    return (
        <div className="min-h-screen bg-white font-sans text-slate-900 selection:bg-indigo-100">

            {/* Navigation */}
            <nav className="relative w-full bg-white/80 backdrop-blur-md border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center text-slate-500 hover:text-indigo-600 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        {t('coursesOverview.backToHome')}
                    </button>
                    <span className="font-bold text-lg tracking-tight hidden md:block">{t('coursesOverview.navTitle')}</span>
                    <button
                        onClick={() => navigate('/register')}
                        className="bg-indigo-600 text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                    >
                        <Crown className="w-4 h-4" />
                        {t('coursesOverview.activatePremium')}
                    </button>
                </div>
            </nav>

            {/* Header */}
            <header className="pt-16 pb-16 px-4 text-center max-w-4xl mx-auto">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 text-orange-700 text-sm font-bold mb-6 border border-orange-200">
                    <Crown className="w-4 h-4 fill-current" />
                    {t('coursesOverview.enhanceExperience')}
                </div>
                <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 mb-6 leading-tight">
                    <Trans i18nKey="coursesOverview.unlockTitle">
                        解锁 <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">读韩 Premium</span>
                    </Trans>
                    <br />
                    {t('coursesOverview.achieveGoal')}
                </h1>
                <p className="text-lg text-slate-500 leading-relaxed max-w-2xl mx-auto">
                    {t('coursesOverview.freeVsPremiumDesc')}
                </p>
            </header>

            {/* --- Free vs Premium Comparison Table --- */}
            <section className="py-16 bg-white">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12 reveal opacity-0 translate-y-10 transition-all duration-700">
                        <h2 className="text-3xl font-bold text-slate-900">{t('coursesOverview.benefitComparison')}</h2>
                        <p className="text-slate-500 mt-2">{t('coursesOverview.seeDifference')}</p>
                    </div>

                    <div className="overflow-hidden rounded-3xl border border-slate-200 shadow-xl reveal opacity-0 translate-y-10 transition-all duration-700 delay-100">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="p-6 text-slate-500 font-medium w-1/3">{t('coursesOverview.featurePrivilege')}</th>
                                    <th className="p-6 text-slate-900 font-bold w-1/3 text-center text-lg">{t('free')}</th>
                                    <th className="p-6 text-white font-bold w-1/3 text-center text-lg bg-indigo-600 relative overflow-hidden">
                                        <div className="relative z-10 flex items-center justify-center gap-2">
                                            <Crown className="w-5 h-5 fill-current" /> {t('premium')}
                                        </div>
                                        <div className="absolute inset-0 bg-white/20 translate-y-1/2 blur-2xl"></div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {[
                                    { feature: t('coursesOverview.textbookAccess'), free: t('coursesOverview.limited3Lessons'), premium: t('coursesOverview.fullAccess1to6') },
                                    { feature: t('coursesOverview.topikAccess'), free: t('coursesOverview.limitedRecent'), premium: t('coursesOverview.allPastExams') },
                                    { feature: t('coursesOverview.listeningAccess'), free: t('coursesOverview.limited'), premium: t('coursesOverview.unlimited') },
                                    { feature: t('coursesOverview.grammarAccess'), free: t('coursesOverview.daily3Times'), premium: t('coursesOverview.unlimitedTimes') },
                                    { feature: t('coursesOverview.vocabAccess'), free: t('coursesOverview.vocab50'), premium: t('coursesOverview.vocabUnlimited') },
                                    { feature: t('coursesOverview.offlineAccess'), free: <XIcon className="w-5 h-5 text-slate-300 mx-auto" />, premium: <CheckCircle2 className="w-5 h-5 text-green-400 mx-auto" /> },
                                    { feature: t('coursesOverview.adFree'), free: <XIcon className="w-5 h-5 text-slate-300 mx-auto" />, premium: <CheckCircle2 className="w-5 h-5 text-green-400 mx-auto" /> },
                                ].map((row, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-5 text-slate-700 font-medium border-r border-slate-100">{row.feature}</td>
                                        <td className="p-5 text-slate-500 text-center border-r border-slate-100">{row.free}</td>
                                        <td className="p-5 text-indigo-700 font-bold text-center bg-indigo-50/30">{row.premium}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* Feature 1: Curriculum */}
            <section className="py-20 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        <div className="w-full lg:w-1/2 reveal opacity-0 translate-y-10 transition-all duration-700">
                            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
                                <BookOpen className="w-6 h-6 text-blue-600" />
                            </div>
                            <h2 className="text-3xl font-bold mb-4">{t('coursesOverview.feature1Title')}</h2>
                            <p className="text-slate-600 text-lg mb-8 leading-relaxed">
                                <Trans i18nKey="coursesOverview.feature1Desc">
                                    <span className="text-indigo-600 font-bold">Premium Members</span> unlock full digital textbooks from Yonsei, Sogang, SNU, and more. From beginner grammar to advanced reading, content is always up-to-date without buying physical books.
                                </Trans>
                            </p>
                            <ul className="space-y-4">
                                {[t('coursesOverview.feature1List1'), t('coursesOverview.feature1List2'), t('coursesOverview.feature1List3')].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                                        <span className="text-slate-700">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="w-full lg:w-1/2 reveal opacity-0 translate-y-10 transition-all duration-700 delay-200">
                            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 h-80 flex items-center justify-center relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50"></div>
                                <div className="relative z-10 text-center">
                                    <div className="text-6xl font-bold text-blue-200 mb-2">100+</div>
                                    <div className="text-xl font-bold text-slate-400">{t('coursesOverview.booksDigitized')}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Feature 2: TOPIK */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
                        <div className="w-full lg:w-1/2 reveal opacity-0 translate-y-10 transition-all duration-700">
                            <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center mb-6">
                                <GraduationCap className="w-6 h-6 text-violet-600" />
                            </div>
                            <h2 className="text-3xl font-bold mb-4">{t('coursesOverview.feature2Title')}</h2>
                            <p className="text-slate-600 text-lg mb-8 leading-relaxed">
                                {t('coursesOverview.feature2Desc')}
                            </p>
                            <ul className="space-y-4">
                                {[t('coursesOverview.feature2List1'), t('coursesOverview.feature2List2'), t('coursesOverview.feature2List3')].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-violet-600 flex-shrink-0" />
                                        <span className="text-slate-700">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="w-full lg:w-1/2 reveal opacity-0 translate-y-10 transition-all duration-700 delay-200">
                            <div className="bg-slate-900 rounded-2xl shadow-xl p-8 h-80 flex items-center justify-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/20 rounded-full blur-3xl"></div>
                                <div className="relative z-10 text-center">
                                    <div className="text-6xl font-bold text-violet-400 mb-2">35+</div>
                                    <div className="text-xl font-bold text-slate-400">{t('coursesOverview.examPapers')}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Feature 3: Grammar Support */}
            <section className="py-20 bg-slate-50">
                <div className="max-w-4xl mx-auto px-4 text-center reveal opacity-0 translate-y-10 transition-all duration-700">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-pink-100 rounded-full mb-6">
                        <FileText className="w-8 h-8 text-pink-500" />
                    </div>
                    <h2 className="text-3xl font-bold mb-6">{t('coursesOverview.feature3Title')}</h2>
                    <p className="text-xl text-slate-600 mb-10 leading-relaxed">
                        <Trans i18nKey="coursesOverview.feature3Desc">
                            Stuck on a sentence?<br />
                            Our built-in grammar library and syntax system are here.<br />
                            One-click to break down sentence structure and grammar points, removing blind spots in self-study.
                        </Trans>
                    </p>
                </div>
            </section>

            {/* Pricing Section with Banner */}
            <section id="pricing" className="py-20 bg-slate-900 text-white scroll-mt-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <span className="inline-block py-1 px-3 rounded-full bg-indigo-500/20 text-indigo-300 text-sm font-bold mb-4 border border-indigo-500/30">
                            {t('pricing.limitedOffer')}
                        </span>
                        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
                            {t('selectPlan')}
                        </h2>
                        <p className="text-slate-400 max-w-2xl mx-auto text-lg">
                            {t('pricing.paymentMethods')}
                        </p>
                    </div>

                    <div className="dark">
                        <PricingSection />
                    </div>

                    <div className="mt-12 text-center border-t border-slate-800 pt-12">
                        <p className="text-slate-400 mb-6">{t('pricing.notSure')}</p>
                        <button
                            onClick={() => navigate('/register')}
                            className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold transition-all"
                        >
                            {t('pricing.trial')}
                        </button>
                    </div>
                </div>
            </section>

        </div>
    );
};

export default CoursesOverview;
