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
import { Button } from '../ui';
import { Input } from '../ui';

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
    <div className="bg-muted min-h-screen pb-24">
      {/* 1. Header */}
      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="flex justify-between items-center gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt="Avatar"
                  className="w-9 h-9 rounded-full border border-border"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-400/14 flex items-center justify-center text-indigo-600 dark:text-indigo-200 font-bold border border-indigo-200 dark:border-indigo-300/25">
                  {user?.name?.[0] || 'U'}
                </div>
              )}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-card"></div>
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-foreground leading-none">
                {getGreeting()},
              </h1>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
                {user?.name?.split(' ')[0] || 'Learner'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-orange-50 dark:bg-orange-400/10 px-2 py-1 rounded-lg border border-orange-100 dark:border-orange-300/25">
              <Flame className="w-3.5 h-3.5 text-orange-500 dark:text-orange-300 fill-orange-500 dark:fill-orange-300" />
              <span className="text-xs font-black text-orange-600 dark:text-orange-200">
                {stats.streak}
              </span>
            </div>
          </div>
        </div>

        {/* Dictionary Search Input */}
        <form onSubmit={handleSearch} className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-muted-foreground" />
          </div>
          <Input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('dashboard.dictionary.placeholder', {
              defaultValue: 'Dictionary Search...',
            })}
            className="w-full bg-muted border border-border text-foreground text-sm rounded-xl py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-ring focus:bg-card transition-all shadow-sm placeholder:text-muted-foreground font-medium"
          />
        </form>
      </header>

      <main className="px-4 space-y-5 pt-5 animate-in fade-in duration-500">
        {/* 2. Learner Stats Card */}
        <section className="bg-gradient-to-br from-indigo-600 to-purple-700 dark:from-slate-800 dark:to-foreground/90 rounded-3xl p-5 text-white shadow-xl shadow-indigo-200/60 dark:shadow-slate-950/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-card/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div>
              <h2 className="font-bold text-lg">
                {t('dashboard.summary.title', { defaultValue: "Today's Goal" })}
              </h2>
              <p className="text-indigo-100 dark:text-indigo-200/80 text-xs font-medium">
                {t('dashboard.mobile.keepMomentum')}
              </p>
            </div>
            <div className="bg-card/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-white/10 flex items-center gap-1">
              <Target className="w-3 h-3" />
              {Math.round(goalPercent)}%
            </div>
          </div>
          <div className="mb-4 relative z-10">
            <div className="flex justify-between text-xs font-semibold text-indigo-100 dark:text-indigo-200/80 mb-1.5">
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
                className="h-full bg-gradient-to-r from-emerald-300 to-teal-300 dark:from-emerald-400/75 dark:to-teal-400/75 rounded-full shadow-[0_0_10px_rgba(110,231,183,0.5)] dark:shadow-[0_0_8px_rgba(52,211,153,0.28)] transition-all duration-500"
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
        <Button
          variant="ghost"
          size="auto"
          onClick={() => navigate('/courses')}
          className="w-full text-left bg-sky-50 dark:bg-sky-400/10 rounded-3xl p-5 border border-sky-100 dark:border-sky-300/20 relative overflow-hidden group active:scale-[0.98] transition-all duration-200"
        >
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-2">
              <span className="bg-sky-500 dark:bg-sky-400/30 text-white dark:text-sky-100 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                {t('dashboard.textbook.label', { defaultValue: 'Current Course' })}
              </span>
              <span className="text-sky-600 dark:text-sky-200 font-bold text-xs bg-card dark:bg-sky-400/14 px-2 py-0.5 rounded shadow-sm">
                {selectedLevel || t('dashboard.mobile.levelFallback', { defaultValue: 'Lvl 1' })}
              </span>
            </div>
            <h3 className="text-2xl font-black text-foreground leading-tight mb-1 pr-12">
              {instituteName}
            </h3>
            <div className="mt-4 bg-card/60 dark:bg-sky-400/10 backdrop-blur-sm p-3 rounded-xl border border-white/50 dark:border-sky-300/20">
              <div className="flex justify-between text-xs font-bold text-sky-700 dark:text-sky-200 mb-1.5">
                <span>
                  {t('dashboard.mobile.chapterLabel', {
                    unit: currentUnit,
                    defaultValue: 'Chapter {{unit}}',
                  })}
                </span>
                <span>{progressPercent}%</span>
              </div>
              <div className="h-2 bg-sky-200 dark:bg-sky-400/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-500 dark:bg-sky-300/75 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm font-bold text-foreground">
              <span>{t('dashboard.common.continueLearning')}</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
          <img
            src={ASSETS.book}
            className="absolute -right-6 -bottom-6 w-32 h-32 opacity-80 rotate-12"
            alt="book"
          />
        </Button>

        {/* 4. Tools Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Vocab */}
          <Button
            variant="ghost"
            size="auto"
            onClick={() => navigate('/vocab-book')}
            className="bg-indigo-50 dark:bg-indigo-400/10 p-4 rounded-3xl border border-indigo-100 dark:border-indigo-300/20 relative overflow-hidden text-left active:scale-95 transition-transform"
          >
            <div className="relative z-10">
              <span className="bg-indigo-500 dark:bg-indigo-400/30 text-white dark:text-indigo-100 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                {t('dashboard.mobile.review')}
              </span>
              <h4 className="font-black text-lg text-foreground mt-1">
                {t('dashboard.vocab.title', { defaultValue: 'My Vocab' })}
              </h4>
              <p className="text-indigo-600 dark:text-indigo-200/90 text-xs font-bold mt-0.5">
                {wordsToReview} {t('dashboard.mobile.due')}
              </p>
            </div>
            <img
              src={ASSETS.vocabBook}
              className="absolute -right-3 -bottom-3 w-16 h-16 rotate-12"
              alt="vocab"
            />
          </Button>

          {/* Notes */}
          <Button
            variant="ghost"
            size="auto"
            onClick={() => navigate('/notebook')}
            className="bg-orange-50 dark:bg-orange-400/10 p-4 rounded-3xl border border-orange-100 dark:border-orange-300/20 relative overflow-hidden text-left active:scale-95 transition-transform"
          >
            <div className="relative z-10">
              <span className="bg-orange-500 dark:bg-orange-400/30 text-white dark:text-orange-100 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                {t('dashboard.mobile.notes')}
              </span>
              <h4 className="font-black text-lg text-foreground mt-1">
                {t('dashboard.mobile.mistakes')}
              </h4>
              <div className="flex gap-1 mt-1">
                <span className="bg-red-100 dark:bg-red-400/14 text-red-600 dark:text-red-200 text-[9px] font-bold px-1.5 py-0.5 rounded">
                  {t('dashboard.mobile.check')}
                </span>
              </div>
            </div>
            <img
              src={ASSETS.memo}
              className="absolute -right-3 -bottom-3 w-16 h-16 -rotate-6"
              alt="memo"
            />
          </Button>

          {/* Typing */}
          <Button
            variant="ghost"
            size="auto"
            onClick={() => navigate('/typing')}
            className="bg-emerald-50 dark:bg-emerald-400/10 p-4 rounded-3xl border border-emerald-100 dark:border-emerald-300/20 relative overflow-hidden text-left active:scale-95 transition-transform"
          >
            <div className="relative z-10">
              <span className="bg-emerald-500 dark:bg-emerald-400/30 text-white dark:text-emerald-100 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                {t('dashboard.mobile.typing')}
              </span>
              <h4 className="font-black text-lg text-foreground mt-1">
                {t('dashboard.mobile.practice')}
              </h4>
              <p className="text-emerald-700 dark:text-emerald-200/90 text-xs font-bold mt-0.5">
                {t('dashboard.mobile.start')}
              </p>
            </div>
            <img
              src={ASSETS.typing}
              className="absolute -right-3 -bottom-3 w-16 h-16 rotate-6"
              alt="typing"
            />
          </Button>

          {/* TOPIK */}
          <Button
            variant="ghost"
            size="auto"
            onClick={() => navigate('/topik')}
            className="bg-amber-50 dark:bg-amber-400/10 p-4 rounded-3xl border border-amber-100 dark:border-amber-300/20 relative overflow-hidden text-left active:scale-95 transition-transform"
          >
            <div className="relative z-10">
              <span className="bg-amber-500 dark:bg-amber-400/30 text-white dark:text-amber-100 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                {t('dashboard.mobile.exam')}
              </span>
              <h4 className="font-black text-lg text-foreground mt-1">{t('nav.topik')}</h4>
              <p className="text-amber-700 dark:text-amber-200/90 text-xs font-bold mt-0.5">
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
          </Button>
        </div>

        {/* 5. Media Grid */}
        <div className="grid grid-cols-1 gap-3 pb-8">
          {/* Podcast */}
          <Button
            variant="ghost"
            size="auto"
            onClick={() => navigate('/podcasts')}
            className="bg-violet-50 dark:bg-violet-400/10 p-4 rounded-3xl border border-violet-100 dark:border-violet-300/20 flex items-center justify-between shadow-sm active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-violet-100 dark:bg-violet-400/16 flex items-center justify-center text-violet-600 dark:text-violet-200">
                <Headphones className="w-7 h-7" />
              </div>
              <div className="text-left">
                <span className="bg-violet-500 dark:bg-violet-400/30 text-white dark:text-violet-100 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                  {t('dashboard.mobile.listen')}
                </span>
                <h4 className="font-bold text-foreground text-lg leading-tight mt-1">
                  {t('dashboard.podcast.label')}
                </h4>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[10px] font-bold text-violet-600 dark:text-violet-200/90">
                    {t('dashboard.mobile.latestEpisodes')}
                  </span>
                </div>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </Button>

          {/* Video */}
          <Button
            variant="ghost"
            size="auto"
            onClick={() => navigate('/videos')}
            className="bg-rose-50 dark:bg-rose-400/10 p-4 rounded-3xl border border-rose-100 dark:border-rose-300/20 flex items-center justify-between shadow-sm active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-400/16 flex items-center justify-center text-rose-600 dark:text-rose-200">
                <Tv className="w-7 h-7" />
              </div>
              <div className="text-left">
                <span className="bg-rose-500 dark:bg-rose-400/30 text-white dark:text-rose-100 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                  {t('dashboard.mobile.watch')}
                </span>
                <h4 className="font-bold text-foreground text-lg leading-tight mt-1">
                  {t('dashboard.mobile.videoLibrary')}
                </h4>
                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-200/90 mt-1 block">
                  {t('dashboard.mobile.immersion')}
                </span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>
      </main>
    </div>
  );
};
