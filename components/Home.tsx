import React from 'react';
import { User, Language } from '../types';
import { getLabels } from '../utils/i18n';
import {
  BookOpen,
  GraduationCap,
  ArrowRight,
  Flame,
  Trophy,
  Clock,
  BookMarked,
  MessageSquare,
} from 'lucide-react';

interface HomeProps {
  user: User;
  onNavigate: (page: string) => void;
  language: Language;
}

const Home: React.FC<HomeProps> = ({ user, onNavigate, language }) => {
  const labels = getLabels(language);
  const stats = user.statistics || { wordsLearned: 0, dayStreak: 0, listeningHours: 0 };

  return (
    <div className="max-w-[1600px] mx-auto space-y-8">
      {/* 1. Hero Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-3xl p-8 md:p-12 text-white shadow-xl shadow-indigo-200 relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">
            {labels.welcomeBack}, {user.name}! 👋
          </h1>
          <p className="text-indigo-100 text-lg md:text-xl mb-8 opacity-90">
            {labels.readyToLearn}
          </p>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-colors shadow-sm flex items-center"
            >
              {labels.continueLearning} <ArrowRight className="w-5 h-5 ml-2" />
            </button>
            <button
              onClick={() => onNavigate('topik')}
              className="px-6 py-3 bg-indigo-500/30 text-white border border-white/20 rounded-xl font-bold hover:bg-indigo-500/50 transition-colors backdrop-blur-sm"
            >
              {labels.topikChallenge}
            </button>
          </div>
        </div>

        {/* Decorative Circles */}
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 -mb-20 w-64 h-64 bg-indigo-900/20 rounded-full blur-2xl"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 2. Main Content (Left Column) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions Grid */}
          <h3 className="text-xl font-bold text-slate-800">{labels.quickStats}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center hover:border-orange-200 transition-colors">
              <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-2">
                <Flame className="w-5 h-5" />
              </div>
              <span className="text-2xl font-bold text-slate-800">{stats.dayStreak}</span>
              <span className="text-xs text-slate-500 font-medium">{labels.dayStreak}</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center hover:border-emerald-200 transition-colors">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                <Trophy className="w-5 h-5" />
              </div>
              <span className="text-2xl font-bold text-slate-800">{stats.wordsLearned}</span>
              <span className="text-xs text-slate-500 font-medium">{labels.totalWords}</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center hover:border-blue-200 transition-colors">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-2">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-2xl font-bold text-slate-800">{stats.listeningHours}</span>
              <span className="text-xs text-slate-500 font-medium">{labels.learningHours}</span>
            </div>
            <div
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center hover:border-purple-200 transition-colors cursor-pointer group"
              onClick={() => onNavigate('dashboard')}
            >
              <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                <BookMarked className="w-5 h-5" />
              </div>
              <span className="text-sm font-bold text-slate-800 mt-1">{labels.openReview}</span>
            </div>
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">{labels.textbookLearning}</h3>
              <p className="text-slate-500 text-sm mb-6 flex-1">{labels.jumpBackIn}</p>
              <button
                onClick={() => onNavigate('dashboard')}
                className="w-full py-2.5 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors text-sm"
              >
                {labels.goToTextbooks}
              </button>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col">
              <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-xl flex items-center justify-center mb-4">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">{labels.topikChallenge}</h3>
              <p className="text-slate-500 text-sm mb-6 flex-1">{labels.topikDesc}</p>
              <button
                onClick={() => onNavigate('topik')}
                className="w-full py-2.5 bg-violet-50 text-violet-700 font-bold rounded-xl hover:bg-violet-100 transition-colors text-sm"
              >
                {labels.practiceNow}
              </button>
            </div>
          </div>
        </div>

        {/* 3. Sidebar (Right Column) - Daily Content */}
        <div className="space-y-6">
          <div className="bg-[#fff9e6] p-6 rounded-2xl border border-yellow-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-yellow-300 rounded-full opacity-20"></div>

            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-yellow-600" />
              <span className="text-xs font-bold text-yellow-700 uppercase tracking-widest">
                {labels.dailyExpression}
              </span>
            </div>

            <div className="space-y-2 mb-4">
              <h3 className="text-2xl font-bold text-slate-800">좋은 하루 되세요!</h3>
              <p className="text-slate-600 font-medium">Jo-eun ha-ru doe-se-yo!</p>
            </div>

            <div className="bg-white/60 p-3 rounded-lg backdrop-blur-sm border border-yellow-100/50">
              <p className="text-sm text-slate-700">{labels.dailyMeaning}</p>
            </div>
          </div>

          {/* Review Mini Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center">
              <div className="w-1.5 h-4 bg-red-500 rounded-full mr-2"></div>
              {labels.reviewCenter}
            </h3>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">{labels.vocabBook}</span>
              <span className="text-sm font-bold text-indigo-600">
                {user.savedWords.length} words
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mb-4">
              <div
                className="bg-indigo-500 h-full rounded-full"
                style={{ width: `${Math.min(user.savedWords.length, 100)}%` }}
              ></div>
            </div>

            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">{labels.mistakeBook}</span>
              <span className="text-sm font-bold text-red-500">{user.mistakes.length} words</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mb-6">
              <div
                className="bg-red-500 h-full rounded-full"
                style={{ width: `${Math.min(user.mistakes.length * 5, 100)}%` }}
              ></div>
            </div>

            <p className="text-xs text-slate-400 mb-4">{labels.reviewDesc}</p>

            <button
              onClick={() => onNavigate('dashboard')}
              className="w-full py-2 text-sm font-bold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
            >
              {labels.openReview}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
