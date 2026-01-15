import React from 'react';
import { User, Language } from '../types';
import { getLabels } from '../utils/i18n';
import DailyPhrase from './DailyPhrase';
import {
  BookOpen,
  ArrowRight,
  Flame,
  Trophy,
  Clock,
  BookMarked,
  Activity,
  ChevronRight
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
    <div className="max-w-[1200px] mx-auto space-y-8 pb-12">
      {/* 1. Hero Section - Glassmorphism Style */}
      <div className="relative bg-gradient-to-r from-indigo-600 to-violet-700 rounded-[2rem] p-8 md:p-12 text-white shadow-2xl shadow-indigo-200 overflow-hidden group">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1 rounded-full text-sm font-medium mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            {language === 'zh' ? '学习状态: 活跃' : 'Status: Active Learner'}
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight leading-tight">
            {labels.welcomeBack}, <br />{user.name}! 👋
          </h1>
          <p className="text-indigo-100 text-lg md:text-xl mb-8 opacity-90 leading-relaxed max-w-lg">
            {labels.readyToLearn}
          </p>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => onNavigate('dashboard')}
              className="px-8 py-3.5 bg-white text-indigo-700 rounded-xl font-bold hover:bg-indigo-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center"
            >
              {labels.continueLearning} <ArrowRight className="w-5 h-5 ml-2" />
            </button>
            <button
              onClick={() => onNavigate('topik')}
              className="px-8 py-3.5 bg-indigo-500/30 text-white border border-white/30 rounded-xl font-bold hover:bg-indigo-500/40 transition-all backdrop-blur-md hover:-translate-y-0.5"
            >
              {labels.topikChallenge}
            </button>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>
        <div className="absolute bottom-0 right-20 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl group-hover:translate-y-10 transition-transform duration-1000"></div>
      </div>

      {/* 2. Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Left Column: Stats & Quick Actions */}
        <div className="md:col-span-2 space-y-6">

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: labels.dayStreak, value: stats.dayStreak, icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50' },
              { label: labels.totalWords, value: stats.wordsLearned, icon: Trophy, color: 'text-emerald-500', bg: 'bg-emerald-50' },
              { label: labels.learningHours, value: stats.listeningHours, icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
              { label: labels.examsTaken || 'Exams', value: user.examHistory?.length || 0, icon: Activity, color: 'text-purple-500', bg: 'bg-purple-50' }
            ].map((stat, idx) => (
              <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all group">
                <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div className="text-2xl font-black text-slate-800 tracking-tight">{stat.value}</div>
                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Main Course Card */}
          <div
            onClick={() => onNavigate('dashboard')}
            className="group relative bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all cursor-pointer overflow-hidden"
          >
            <div className="relative z-10 flex items-start justify-between">
              <div>
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-6 transition-transform">
                  <BookOpen className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">{labels.textbookLearning}</h3>
                <p className="text-slate-500 max-w-md">{labels.jumpBackIn}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>
            {/* Progress Bar Mockup */}
            <div className="mt-8">
              <div className="flex justify-between text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                <span>Current Progress</span>
                <span>Level {user.lastLevel || 1} • Unit {user.lastUnit || 1}</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${((user.lastUnit || 1) / 12) * 100}%` }}></div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Review & Daily */}
        <div className="space-y-6">

          {/* Daily Expression - Using DailyPhrase Component */}
          <DailyPhrase />

          {/* Review Center */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-900 text-lg">{labels.reviewCenter}</h3>
              <div className="px-2 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-500">
                Today
              </div>
            </div>

            <div className="space-y-4 flex-1">
              <button
                onClick={() => onNavigate('dashboard')}
                className="w-full flex items-center p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group"
              >
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                  <BookMarked className="w-5 h-5" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-bold text-slate-700 text-sm">{labels.vocabBook}</div>
                  <div className="text-xs text-slate-400">{(user.savedWords || []).length} words saved</div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500" />
              </button>

              <button
                onClick={() => onNavigate('dashboard')}
                className="w-full flex items-center p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all group"
              >
                <div className="w-10 h-10 bg-red-50 text-red-500 rounded-lg flex items-center justify-center mr-3 group-hover:scale-110 transition-transform">
                  <Activity className="w-5 h-5" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-bold text-slate-700 text-sm">{labels.mistakeBook}</div>
                  <div className="text-xs text-slate-400">{(user.mistakes || []).length} words to review</div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-red-500" />
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Home;
