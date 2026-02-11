import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'convex/react';
import { Flame, Search, Target, ArrowRight, Headphones, Tv, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLearning } from '../../contexts/LearningContext';
import { useData } from '../../contexts/DataContext';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { qRef, NoArgs } from '../../utils/convexRefs';
import { ExamAttempt } from '../../types';

// Assets
const ASSETS = {
  wave: '/emojis/Waving_Hand.png',
  fire: '/emojis/Fire.png',
  gem: '/emojis/Gem_Stone.png',
  book: '/emojis/Open_Book.png',
  trophy: '/emojis/Trophy.png',
  tv: '/emojis/Television.png',
  headphone: '/emojis/Headphone.png',
  memo: '/emojis/Spiral_Calendar.png',
  typing: '/emojis/keyboard_icon_3d_1769658200654.png',
  vocabBook: '/emojis/flashcards_icon_3d_1769658215552.png',
};

export const MobileDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useLocalizedNavigate();
  const { selectedInstitute, selectedLevel } = useLearning();
  const { institutes } = useData();

  // -- Data Fetching (Replicated from DashboardPage & LearnerSummaryCard) --

  // 1. User Stats (Streak, Minutes)
  type UserStats = {
    streak: number;
    dailyMinutes: number;
    dailyGoal: number;
    vocabStats: { dueReviews: number };
  };
  const userStats = useQuery(qRef<NoArgs, UserStats>('userStats:getStats'));

  // 2. Vocab Count
  const vocabBookCount = useQuery(
    qRef<{ includeMastered?: boolean }, { count: number }>('vocab:getVocabBookCount'),
    user ? { includeMastered: true } : 'skip'
  );
  const wordsToReview = vocabBookCount?.count || 0;

  // 3. Exam Attempts (for Best Score)
  const examAttempts = useQuery(
    qRef<{ limit?: number }, ExamAttempt[]>('user:getExamAttempts'),
    user ? { limit: 200 } : 'skip'
  );
  const topScore = useMemo(() => {
    if (!examAttempts || examAttempts.length === 0) return 0;
    return Math.max(...examAttempts.map(e => e.score));
  }, [examAttempts]);

  // 4. Course Progress
  const courseProgress = useQuery(
    qRef<
      { courseId: string },
      {
        completedUnits: number[];
        totalUnits: number;
        progressPercent: number;
        lastUnitIndex?: number;
      } | null
    >('progress:getCourseProgress'),
    user && selectedInstitute ? { courseId: selectedInstitute } : 'skip'
  );

  // -- Derived Data --
  const completedUnits = courseProgress?.completedUnits ?? [];
  const totalUnits = courseProgress?.totalUnits || 10;
  const inferredUnit =
    completedUnits.length > 0 ? Math.min(Math.max(...completedUnits) + 1, totalUnits) : 1;
  const currentUnit = courseProgress?.lastUnitIndex || user?.lastUnit || inferredUnit;
  const progressPercent =
    courseProgress?.progressPercent ?? Math.min(100, Math.round((currentUnit / totalUnits) * 100));

  const instituteName = useMemo(() => {
    if (!selectedInstitute) return t('dashboard.textbook.label', { defaultValue: 'Textbook' });
    const inst = institutes.find(i => i.id === selectedInstitute);
    return inst ? inst.name : selectedInstitute;
  }, [selectedInstitute, institutes, t]);

  // -- Search Logic --
  const [searchQuery, setSearchQuery] = useState('');
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length >= 1) {
      navigate(`/dictionary/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // -- Render Helpers --
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.greeting.morning', { defaultValue: 'Good morning' });
    if (hour < 18) return t('dashboard.greeting.afternoon', { defaultValue: 'Good afternoon' });
    return t('dashboard.greeting.evening', { defaultValue: 'Good evening' });
  };

  const stats = userStats || {
    streak: 0,
    dailyMinutes: 0,
    dailyGoal: 30,
    vocabStats: { dueReviews: 0 },
  };
  const goalPercent = Math.min(100, (stats.dailyMinutes / (stats.dailyGoal || 1)) * 100);

  return (
    <div className="bg-slate-50 min-h-screen pb-24">
      {/* 1. Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-3">
        <div className="flex justify-between items-center gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt="Avatar"
                  className="w-9 h-9 rounded-full border border-slate-200"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold border border-indigo-200">
                  {user?.name?.[0] || 'U'}
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-slate-900 leading-none">
                {getGreeting()},
              </h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                {user?.name?.split(' ')[0] || 'Learner'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-orange-50 px-2 py-1 rounded-lg border border-orange-100">
              <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
              <span className="text-xs font-black text-orange-600">{stats.streak}</span>
            </div>
          </div>
        </div>

        {/* Dictionary Search Input */}
        <form onSubmit={handleSearch} className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-slate-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('dashboard.dictionary.placeholder', {
              defaultValue: 'Dictionary Search...',
            })}
            className="w-full bg-slate-100 border border-slate-200 text-slate-900 text-sm rounded-xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-sm placeholder:text-slate-400 font-medium"
          />
        </form>
      </header>

      <main className="px-4 space-y-5 pt-5 animate-in fade-in duration-500">
        {/* 2. Learner Stats Card */}
        <section className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-5 text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <h2 className="font-bold text-lg">
                {t('dashboard.summary.title', { defaultValue: "Today's Goal" })}
              </h2>
              <p className="text-indigo-100 text-xs font-medium">
                {t('dashboard.mobile.keepMomentum')}
              </p>
            </div>
            <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-white/10 flex items-center gap-1">
              <Target className="w-3 h-3" />
              {Math.round(goalPercent)}%
            </div>
          </div>
          <div className="mb-4 relative z-10">
            <div className="flex justify-between text-xs font-semibold text-indigo-100 mb-1.5">
              <span>
                {stats.dailyMinutes} / {stats.dailyGoal} mins
              </span>
              <span>
                {t('dashboard.mobile.leftMinutes', {
                  count: Math.max(0, stats.dailyGoal - stats.dailyMinutes),
                  defaultValue: '{{count}} left',
                })}
              </span>
            </div>
            <div className="h-2.5 bg-black/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-300 to-teal-300 rounded-full shadow-[0_0_10px_rgba(110,231,183,0.5)] transition-all duration-500"
                style={{ width: `${goalPercent}%` }}
              ></div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-3 relative z-10">
            <div className="text-center">
              <div className="text-xl font-black">{stats.dailyMinutes}</div>
              <div className="text-[10px] opacity-70 uppercase tracking-wide">
                {t('dashboard.mobile.minutesShort', { defaultValue: 'Mins' })}
              </div>
            </div>
            <div className="text-center border-l border-white/10">
              <div className="text-xl font-black">{stats.vocabStats.dueReviews}</div>
              <div className="text-[10px] opacity-70 uppercase tracking-wide">
                {t('dashboard.mobile.dueShort', { defaultValue: 'Due' })}
              </div>
            </div>
            <div className="text-center border-l border-white/10">
              <div className="text-xl font-black">{stats.streak}</div>
              <div className="text-[10px] opacity-70 uppercase tracking-wide">
                {t('dashboard.mobile.streakShort', { defaultValue: 'Streak' })}
              </div>
            </div>
          </div>
        </section>

        {/* 3. Textbook (Hero) */}
        <button
          onClick={() => navigate('/courses')}
          className="w-full text-left bg-sky-50 rounded-3xl p-5 border border-sky-100 relative overflow-hidden group active:scale-[0.98] transition-all duration-200"
        >
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-2">
              <span className="bg-sky-500 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">
                {t('dashboard.textbook.label', { defaultValue: 'Current Course' })}
              </span>
              <span className="text-sky-600 font-bold text-xs bg-white px-2 py-0.5 rounded shadow-sm">
                {selectedLevel || t('dashboard.mobile.levelFallback', { defaultValue: 'Lvl 1' })}
              </span>
            </div>
            <h3 className="text-2xl font-black text-slate-900 leading-tight mb-1 pr-12">
              {instituteName}
            </h3>
            <div className="mt-4 bg-white/60 backdrop-blur-sm p-3 rounded-xl border border-white/50">
              <div className="flex justify-between text-xs font-bold text-sky-700 mb-1.5">
                <span>
                  {t('dashboard.mobile.chapterLabel', {
                    unit: currentUnit,
                    defaultValue: 'Chapter {{unit}}',
                  })}
                </span>
                <span>{progressPercent}%</span>
              </div>
              <div className="h-2 bg-sky-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-500 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm font-bold text-slate-900">
              <span>{t('dashboard.common.continueLearning')}</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
          <img
            src={ASSETS.book}
            className="absolute -right-6 -bottom-6 w-32 h-32 opacity-80 rotate-12"
            alt="book"
          />
        </button>

        {/* 4. Tools Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Vocab */}
          <button
            onClick={() => navigate('/vocab-book')}
            className="bg-indigo-50 p-4 rounded-3xl border border-indigo-100 relative overflow-hidden text-left active:scale-95 transition-transform"
          >
            <div className="relative z-10">
              <span className="bg-indigo-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                {t('dashboard.mobile.review')}
              </span>
              <h4 className="font-black text-lg text-slate-900 mt-1">
                {t('dashboard.vocab.title', { defaultValue: 'My Vocab' })}
              </h4>
              <p className="text-indigo-600 text-xs font-bold mt-0.5">
                {wordsToReview} {t('dashboard.mobile.due')}
              </p>
            </div>
            <img
              src={ASSETS.vocabBook}
              className="absolute -right-3 -bottom-3 w-16 h-16 rotate-12"
              alt="vocab"
            />
          </button>

          {/* Notes */}
          <button
            onClick={() => navigate('/notebook')}
            className="bg-orange-50 p-4 rounded-3xl border border-orange-100 relative overflow-hidden text-left active:scale-95 transition-transform"
          >
            <div className="relative z-10">
              <span className="bg-orange-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                {t('dashboard.mobile.notes')}
              </span>
              <h4 className="font-black text-lg text-slate-900 mt-1">
                {t('dashboard.mobile.mistakes')}
              </h4>
              <div className="flex gap-1 mt-1">
                <span className="bg-red-100 text-red-600 text-[9px] font-bold px-1.5 py-0.5 rounded">
                  {t('dashboard.mobile.check')}
                </span>
              </div>
            </div>
            <img
              src={ASSETS.memo}
              className="absolute -right-3 -bottom-3 w-16 h-16 -rotate-6"
              alt="memo"
            />
          </button>

          {/* Typing */}
          <button
            onClick={() => navigate('/typing')}
            className="bg-emerald-50 p-4 rounded-3xl border border-emerald-100 relative overflow-hidden text-left active:scale-95 transition-transform"
          >
            <div className="relative z-10">
              <span className="bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                {t('dashboard.mobile.typing')}
              </span>
              <h4 className="font-black text-lg text-slate-900 mt-1">
                {t('dashboard.mobile.practice')}
              </h4>
              <p className="text-emerald-700 text-xs font-bold mt-0.5">
                {t('dashboard.mobile.start')}
              </p>
            </div>
            <img
              src={ASSETS.typing}
              className="absolute -right-3 -bottom-3 w-16 h-16 rotate-6"
              alt="typing"
            />
          </button>

          {/* TOPIK */}
          <button
            onClick={() => navigate('/topik')}
            className="bg-amber-50 p-4 rounded-3xl border border-amber-100 relative overflow-hidden text-left active:scale-95 transition-transform"
          >
            <div className="relative z-10">
              <span className="bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                {t('dashboard.mobile.exam')}
              </span>
              <h4 className="font-black text-lg text-slate-900 mt-1">{t('nav.topik')}</h4>
              <p className="text-amber-700 text-xs font-bold mt-0.5">
                {t('dashboard.mobile.bestScoreLabel', {
                  score: topScore,
                  defaultValue: 'Best: {{score}}',
                })}
              </p>
            </div>
            <img
              src={ASSETS.trophy}
              className="absolute -right-3 -bottom-3 w-16 h-16 -rotate-12"
              alt="trophy"
            />
          </button>
        </div>

        {/* 5. Media Grid */}
        <div className="grid grid-cols-1 gap-3 pb-8">
          {/* Podcast */}
          <button
            onClick={() => navigate('/podcasts')}
            className="bg-violet-50 p-4 rounded-3xl border border-violet-100 flex items-center justify-between shadow-sm active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center text-violet-600">
                <Headphones className="w-7 h-7" />
              </div>
              <div className="text-left">
                <span className="bg-violet-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                  {t('dashboard.mobile.listen')}
                </span>
                <h4 className="font-bold text-slate-900 text-lg leading-tight mt-1">
                  {t('dashboard.podcast.label')}
                </h4>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[10px] font-bold text-violet-600">
                    {t('dashboard.mobile.latestEpisodes')}
                  </span>
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>

          {/* Video */}
          <button
            onClick={() => navigate('/videos')}
            className="bg-rose-50 p-4 rounded-3xl border border-rose-100 flex items-center justify-between shadow-sm active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600">
                <Tv className="w-7 h-7" />
              </div>
              <div className="text-left">
                <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                  {t('dashboard.mobile.watch')}
                </span>
                <h4 className="font-bold text-slate-900 text-lg leading-tight mt-1">
                  {t('dashboard.mobile.videoLibrary')}
                </h4>
                <span className="text-[10px] font-bold text-rose-600 mt-1 block">
                  {t('dashboard.mobile.immersion')}
                </span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </main>
    </div>
  );
};
