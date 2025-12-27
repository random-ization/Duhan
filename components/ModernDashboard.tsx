import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import {
    Play, Calendar, TrendingUp, BookOpen,
    Target, Zap, Clock,
    Flame, CheckCircle2, ChevronRight, BarChart3,
    Headphones, Settings, X
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useLearning } from '../contexts/LearningContext';
import { api } from '../services/api';
import DailyPhrase from './DailyPhrase';
import LearnerSummaryCard from './dashboard/LearnerSummaryCard';

// TOPIK 考试日期表 (2026年)
const TOPIK_EXAMS = [
    { round: 104, type: 'PBT', date: new Date('2026-01-11'), name: 'TOPIK II (104届)' },
    { round: 11, type: 'IBT', date: new Date('2026-02-28'), name: 'TOPIK IBT (11届)' },
    { round: 12, type: 'IBT', date: new Date('2026-03-21'), name: 'TOPIK IBT (12届)' },
    { round: 105, type: 'PBT', date: new Date('2026-04-12'), name: 'TOPIK II (105届)' },
    { round: 106, type: 'PBT', date: new Date('2026-05-17'), name: 'TOPIK II (106届)' },
    { round: 13, type: 'IBT', date: new Date('2026-06-13'), name: 'TOPIK IBT (13届)' },
    { round: 107, type: 'PBT', date: new Date('2026-07-05'), name: 'TOPIK II (107届)' },
    { round: 14, type: 'IBT', date: new Date('2026-09-12'), name: 'TOPIK IBT (14届)' },
    { round: 108, type: 'PBT', date: new Date('2026-10-18'), name: 'TOPIK II (108届)' },
    { round: 15, type: 'IBT', date: new Date('2026-10-24'), name: 'TOPIK IBT (15届)' },
    { round: 109, type: 'PBT', date: new Date('2026-11-15'), name: 'TOPIK II (109届)' },
    { round: 16, type: 'IBT', date: new Date('2026-11-28'), name: 'TOPIK IBT (16届)' },
];

// 默认每日目标
const DEFAULT_DAILY_GOALS = {
    words: 20,
    readings: 2,
    listenings: 2,
};

interface LearningStats {
    streak: number;
    weeklyMinutes: number[];
    todayActivities: {
        wordsLearned: number;
        readingsCompleted: number;
        listeningsCompleted: number;
    };
}

export default function ModernDashboard() {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user } = useAuth();
    const { institutes } = useData();
    const { selectedInstitute } = useLearning();

    // 每日目标设置
    const [dailyGoals, setDailyGoals] = useState(() => {
        const saved = localStorage.getItem('dailyGoals');
        return saved ? JSON.parse(saved) : DEFAULT_DAILY_GOALS;
    });
    const [showGoalSettings, setShowGoalSettings] = useState(false);

    // 学习统计数据
    const [stats, setStats] = useState<LearningStats>({
        streak: 0,
        weeklyMinutes: [0, 0, 0, 0, 0, 0, 0],
        todayActivities: { wordsLearned: 0, readingsCompleted: 0, listeningsCompleted: 0 },
    });

    // 获取学习统计
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.getUserStats();
                if (response) {
                    setStats({
                        streak: response.streak || 0,
                        weeklyMinutes: response.weeklyMinutes || [0, 0, 0, 0, 0, 0, 0],
                        todayActivities: response.todayActivities || { wordsLearned: 0, readingsCompleted: 0, listeningsCompleted: 0 },
                    });
                }
            } catch (error) {
                console.error('Failed to fetch stats:', error);
            }
        };
        if (user) fetchStats();
    }, [user]);

    // 保存目标设置到 localStorage
    const saveGoals = (newGoals: typeof dailyGoals) => {
        setDailyGoals(newGoals);
        localStorage.setItem('dailyGoals', JSON.stringify(newGoals));
        setShowGoalSettings(false);
    };

    // 计算下一场 TOPIK 考试
    const nextExam = useMemo(() => {
        const now = new Date();
        const upcoming = TOPIK_EXAMS.filter(exam => exam.date > now)
            .sort((a, b) => a.date.getTime() - b.date.getTime());

        if (upcoming.length === 0) return null;

        const exam = upcoming[0];
        const daysLeft = Math.ceil((exam.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        return {
            name: exam.name,
            date: exam.date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }),
            daysLeft,
        };
    }, []);

    // 获取上次学习的课程信息
    const lastCourse = useMemo(() => {
        if (!user?.lastInstitute) return null;
        const institute = institutes.find(i => i.id === user.lastInstitute);
        if (!institute) return null;

        return {
            title: institute.name,
            displayLevel: institute.displayLevel,
            volume: institute.volume,
            unit: `第 ${user.lastUnit || 1} 课`,
            progress: 45,
            coverUrl: institute.coverUrl,
            themeColor: institute.themeColor || '#6366f1',
            instituteId: institute.id,
            level: user.lastLevel || 1,
            unitNum: user.lastUnit || 1,
        };
    }, [user, institutes]);

    // 每日目标进度
    const goalProgress = {
        words: { target: dailyGoals.words, completed: stats.todayActivities.wordsLearned },
        readings: { target: dailyGoals.readings, completed: stats.todayActivities.readingsCompleted },
        listenings: { target: dailyGoals.listenings, completed: stats.todayActivities.listeningsCompleted },
    };

    const completedGoals = [
        goalProgress.words.completed >= goalProgress.words.target,
        goalProgress.readings.completed >= goalProgress.readings.target,
        goalProgress.listenings.completed >= goalProgress.listenings.target,
    ].filter(Boolean).length;

    // 计算本周最大学习时长
    const maxMinutes = Math.max(...stats.weeklyMinutes, 60);

    // 问候语
    const greeting = (() => {
        const hour = new Date().getHours();
        if (hour < 12) return t('dashboard.greeting.morning');
        if (hour < 18) return t('dashboard.greeting.afternoon');
        return t('dashboard.greeting.evening');
    })();

    const userName = user?.name || user?.email?.split('@')[0] || t('displayName');

    if (!user) {
        return (
            <div className="p-8 text-center text-gray-500">
                {t('login')}
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">

            {/* 1. 顶部欢迎与状态栏 */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800">
                        {greeting}，{userName} 👋
                    </h1>
                    <p className="text-slate-500 mt-1">
                        {t('dashboard.greeting.goalPart1')} <span className="font-bold text-indigo-600">{t('dashboard.greeting.goalPart2')}</span> {t('dashboard.greeting.goalPart3')}
                    </p>
                </div>


                {/* 状态卡片 */}
                <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                            <Flame className="w-5 h-5 fill-current" />
                        </div>
                        <div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('dashboard.common.streak')}</div>
                            <div className="font-bold text-slate-800 text-sm">{t('dashboard.common.days', { count: stats.streak || 1 })}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Upgrade Banner for Free Users - 增强版 */}
            {
                user?.role !== 'ADMIN' && (!user?.subscriptionType || user.subscriptionType === 'FREE') && (
                    <div className="mb-8">
                        <div
                            onClick={() => navigate('/pricing')}
                            className="bg-gradient-to-r from-indigo-900 to-violet-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group cursor-pointer border border-indigo-700/50"
                        >
                            {/* 装饰背景 */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-white/10 transition-colors"></div>

                            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 bg-gradient-to-br from-amber-300 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                                        <Zap className="w-8 h-8 text-white fill-current" />
                                    </div>
                                    <div className="text-center sm:text-left">
                                        <h3 className="font-bold text-xl mb-1">{t('dashboard.banner.upgradeTitle')}</h3>
                                        <p className="text-indigo-200 text-sm max-w-md">
                                            <Trans i18nKey="dashboard.banner.upgradeDesc">
                                                您当前使用的是<span className="text-white font-bold">免费版</span>，仅可访问部分基础课程。
                                            </Trans>
                                            <br />{t('dashboard.banner.unlockDesc')}
                                        </p>
                                    </div>
                                </div>
                                <button className="px-6 py-3 bg-white text-indigo-900 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors shadow-lg whitespace-nowrap flex items-center gap-2">
                                    {t('dashboard.banner.viewBenefits')}
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* 2. 左侧主区域 (2/3 宽度) */}
                <div className="lg:col-span-2 space-y-6">

                    {/* A. "继续学习" 英雄卡片 */}
                    {lastCourse ? (
                        <div
                            onClick={() => navigate(`/dashboard/${lastCourse.instituteId}`)}
                            className="bg-slate-900 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden group cursor-pointer shadow-xl shadow-slate-200 hover:-translate-y-1 transition-all duration-300"
                        >
                            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full blur-[80px] opacity-20 group-hover:opacity-30 transition-opacity" />

                            <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center">
                                {/* 封面 */}
                                <div
                                    className="w-24 h-32 md:w-32 md:h-40 rounded-lg shadow-2xl flex-shrink-0 relative transform group-hover:-translate-y-2 transition-transform duration-300 overflow-hidden"
                                    style={{ backgroundColor: lastCourse.themeColor }}
                                >
                                    {lastCourse.coverUrl ? (
                                        <img src={lastCourse.coverUrl} alt={lastCourse.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center text-center p-2 font-bold opacity-90 text-sm text-white">
                                            {lastCourse.title}
                                        </div>
                                    )}
                                    <div className="absolute left-0 top-0 bottom-0 w-2 bg-black/20 mix-blend-multiply" />
                                </div>

                                <div className="flex-1 text-center md:text-left w-full">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-medium mb-3 border border-white/10">
                                        <BookOpen className="w-3 h-3" />
                                        {t('dashboard.common.lastStudied')}
                                    </div>
                                    <h2 className="text-2xl font-bold mb-2">{lastCourse.title}</h2>
                                    <p className="text-slate-400 text-sm mb-6">
                                        {lastCourse.displayLevel && `${lastCourse.displayLevel} · `}{lastCourse.volume && `${lastCourse.volume} · `}{lastCourse.unit}
                                    </p>

                                    {/* 进度条 */}
                                    <div className="flex items-center gap-4 max-w-md mx-auto md:mx-0">
                                        <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                                                style={{ width: `${lastCourse.progress}%` }}
                                            />
                                        </div>
                                        <span className="text-sm font-mono">{lastCourse.progress}%</span>
                                    </div>

                                    <div className="mt-6">
                                        <button className="bg-white text-slate-900 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors flex items-center gap-2 mx-auto md:mx-0 shadow-lg shadow-white/10">
                                            <Play className="w-4 h-4 fill-current" />
                                            {t('dashboard.common.continueLearning')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div
                            onClick={() => navigate('/dashboard')}
                            className="bg-slate-100 rounded-2xl p-8 text-center text-slate-400 border-2 border-dashed border-slate-200 cursor-pointer hover:border-indigo-300 transition-colors"
                        >
                            <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-20" />
                            <p>{t('dashboard.common.noCourse')}</p>
                        </div>
                    )}

                    {/* B. 核心功能入口 */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {[
                            { icon: Target, label: t('dashboard.tools.topik_mock'), color: "text-rose-600 bg-rose-50", desc: t('dashboard.tools.mock_desc'), path: "/topik" },
                            { icon: BookOpen, label: t('dashboard.tools.flashcards'), color: "text-amber-600 bg-amber-50", desc: t('dashboard.tools.flashcards_desc'), path: "/dashboard" },
                            { icon: Clock, label: t('dashboard.tools.listening'), color: "text-blue-600 bg-blue-50", desc: t('dashboard.tools.listening_desc'), path: "/dashboard" },
                            { icon: BarChart3, label: t('dashboard.tools.mistakes'), color: "text-emerald-600 bg-emerald-50", desc: t('dashboard.tools.mistakes_desc'), path: "/dashboard" },
                            { icon: Headphones, label: t('notebook') || '我的笔记', color: "text-indigo-600 bg-indigo-50", desc: "复习笔记", path: "/notebook" },
                        ].map((item, idx) => (
                            <div
                                key={idx}
                                onClick={() => navigate(item.path)}
                                className="bg-white p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer group"
                            >
                                <div className={`w-10 h-10 ${item.color} rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                                    <item.icon className="w-5 h-5" />
                                </div>
                                <h3 className="font-bold text-slate-800 text-sm">{item.label}</h3>
                                <p className="text-xs text-slate-400 mt-1">{item.desc}</p>
                            </div>
                        ))}
                    </div>

                    {/* C. 学习统计图表 */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm md:text-base">
                                <TrendingUp className="w-5 h-5 text-indigo-600" />
                                {t('dashboard.common.weeklyStudyTime')}
                            </h3>
                            <select className="text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 outline-none text-slate-600 cursor-pointer">
                                <option>最近 7 天</option>
                            </select>
                        </div>
                        <div className="h-48 flex items-end justify-between gap-2 md:gap-4 px-2">
                            {stats.weeklyMinutes.map((mins, i) => {
                                const height = maxMinutes > 0 ? (mins / maxMinutes) * 100 : 0;
                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                                        <div className="w-full relative h-full flex items-end">
                                            <div
                                                className={`w-full rounded-t-lg transition-all duration-500 ${mins > 0 ? 'bg-slate-200 group-hover:bg-indigo-300' : 'bg-slate-100'}`}
                                                style={{ height: `${Math.max(height, 4)}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] md:text-xs text-slate-400">
                                            {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* 3. 右侧侧边栏 (1/3 宽度) */}
                <div className="space-y-6">

                    {/* TODAY'S LEARNING SUMMARY CARD */}
                    <LearnerSummaryCard />

                    {/* D. 每日目标 */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-800 text-sm md:text-base">{t('dashboard.common.dailyGoal')}</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full font-bold">{completedGoals}/3</span>
                                <button
                                    onClick={() => setShowGoalSettings(true)}
                                    className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <Settings className="w-4 h-4 text-slate-400" />
                                </button>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {[
                                { id: 'words', title: t('dashboard.common.goalWords', { target: goalProgress.words.target }), done: goalProgress.words.completed >= goalProgress.words.target },
                                { id: 'readings', title: t('dashboard.common.goalReadings', { target: goalProgress.readings.target }), done: goalProgress.readings.completed >= goalProgress.readings.target },
                                { id: 'listenings', title: t('dashboard.common.goalListenings', { target: goalProgress.listenings.target }), done: goalProgress.listenings.completed >= goalProgress.listenings.target },
                            ].map((goal) => (
                                <div key={goal.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group">
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${goal.done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 group-hover:border-indigo-400'
                                        }`}>
                                        {goal.done && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                    </div>
                                    <span className={`text-sm font-medium ${goal.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                        {goal.title}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <button className="w-full mt-4 py-2 text-xs font-bold text-slate-400 hover:text-indigo-600 flex items-center justify-center gap-1 transition-colors group">
                            {t('dashboard.common.viewAllPlans')} <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>

                    {/* E. 考试倒计时 */}
                    {nextExam && (
                        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-2xl text-white shadow-lg shadow-indigo-200 hover:-translate-y-1 transition-transform duration-300">
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <div className="text-indigo-200 text-[10px] font-bold uppercase tracking-wider mb-1">{t('dashboard.common.comingUp')}</div>
                                    <h3 className="font-bold text-lg">{nextExam.name}</h3>
                                </div>
                                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                                    <Calendar className="w-5 h-5" />
                                </div>
                            </div>

                            <div className="flex items-baseline gap-1 mb-2">
                                <span className="text-4xl font-bold">{nextExam.daysLeft}</span>
                                <span className="text-sm text-indigo-200">{t('dashboard.common.daysLeft')}</span>
                            </div>
                            <p className="text-xs text-indigo-200/80 mb-4">
                                {t('dashboard.common.examDate', { date: nextExam.date })}
                            </p>

                            <button
                                onClick={() => navigate('/topik')}
                                className="w-full py-2 bg-white text-indigo-700 rounded-lg text-sm font-bold hover:bg-indigo-50 transition-colors"
                            >
                                {t('dashboard.common.makePlan')}
                            </button>
                        </div>
                    )}

                    {/* F. 每日一句 */}
                    <DailyPhrase />

                </div>
            </div>

            {/* 目标设置弹窗 */}
            {
                showGoalSettings && (
                    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
                            <div className="flex items-center justify-between px-6 py-4 border-b">
                                <h2 className="text-lg font-bold">{t('dashboard.common.settings.title')}</h2>
                                <button onClick={() => setShowGoalSettings(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('dashboard.common.settings.words')}</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="100"
                                        value={dailyGoals.words}
                                        onChange={(e) => setDailyGoals({ ...dailyGoals, words: parseInt(e.target.value) || 1 })}
                                        className="w-full px-4 py-2 border rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('dashboard.common.settings.readings')}</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="10"
                                        value={dailyGoals.readings}
                                        onChange={(e) => setDailyGoals({ ...dailyGoals, readings: parseInt(e.target.value) || 1 })}
                                        className="w-full px-4 py-2 border rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('dashboard.common.settings.listenings')}</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="10"
                                        value={dailyGoals.listenings}
                                        onChange={(e) => setDailyGoals({ ...dailyGoals, listenings: parseInt(e.target.value) || 1 })}
                                        className="w-full px-4 py-2 border rounded-lg"
                                    />
                                </div>
                            </div>
                            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                                <button
                                    onClick={() => setShowGoalSettings(false)}
                                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                                >
                                    {t('dashboard.common.settings.cancel')}
                                </button>
                                <button
                                    onClick={() => saveGoals(dailyGoals)}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                >
                                    {t('dashboard.common.settings.save')}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
