import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { PlayCircle, Zap, BookOpen, Trophy, Flame, ChevronRight } from 'lucide-react';

interface MobileCourseDashboardProps {
  readonly courseName: string;
  readonly instituteId: string;
  readonly overallProgress: number;
  // We can pass more data here as needed
}

export function MobileCourseDashboard({
  courseName,
  instituteId,
  overallProgress,
}: MobileCourseDashboardProps) {
  const navigate = useLocalizedNavigate();
  const { t } = useTranslation();

  // Mock data for the "Bento" look if real data isn't fully ready for all widgets,
  // but we should try to use real props where possible.

  return (
    <div className="flex flex-col min-h-screen px-4 pb-32 space-y-4 animate-in fade-in duration-500">
      {/* 1. Header (Already handled by MobileHeader, so we can skip or add a sub-header/greeting) */}
      <div className="flex justify-between items-end py-2">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
            {t('common.currentFocus', 'Current Focus')}
          </p>
          <h2 className="text-2xl font-black text-slate-900 leading-none">{courseName}</h2>
        </div>
        {/* Streak badge */}
        <div className="flex items-center gap-1 bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full border border-orange-100">
          <Flame size={16} className="fill-orange-500" />
          <span className="font-black text-sm">7</span>
        </div>
      </div>

      {/* 2. Bento Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Main Action Block (Square, Large) - Unit Review */}
        <button
          type="button"
          onClick={() => navigate(`/course/${instituteId}/reading`)} // Assuming reading is main flow
          className="col-span-2 aspect-[2/1] bg-slate-900 rounded-3xl p-6 text-white relative overflow-hidden group active:scale-[0.98] transition-all shadow-xl"
        >
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <BookOpen size={120} strokeWidth={1} />
          </div>
          <div className="relative z-10 h-full flex flex-col justify-between items-start">
            <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-white/10">
              {t('dashboard.course.unit', { n: 5, defaultValue: 'UNIT {{n}}' })}
            </span>
            <div>
              <h3 className="text-3xl font-black mb-1">
                {t('dashboard.course.continueLearning', { defaultValue: 'Continue Learning' })}
              </h3>
              <p className="text-slate-400 text-sm font-medium">Self Introduction</p>
            </div>
          </div>
        </button>

        {/* Quick Review (Small Square) */}
        <button
          type="button"
          onClick={() => navigate(`/course/${instituteId}/vocab`)}
          className="aspect-square bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between items-center group active:scale-95 transition-all"
        >
          <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-colors">
            <Zap size={24} className="fill-current" />
          </div>
          <span className="font-bold text-sm text-slate-600 mb-1">
            {t('dashboard.course.vocab', { defaultValue: 'Vocab' })}
          </span>
        </button>

        {/* Exam / Test (Small Square) */}
        <button
          type="button"
          onClick={() => navigate(`/course/${instituteId}/grammar`)} // Or quiz path
          className="aspect-square bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between items-center group active:scale-95 transition-all"
        >
          <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-colors">
            <Trophy size={24} className="fill-current" />
          </div>
          <span className="font-bold text-sm text-slate-600 mb-1">
            {t('dashboard.course.grammar', { defaultValue: 'Grammar' })}
          </span>
        </button>

        {/* Podcast / Media (Wide) */}
        <button
          type="button"
          onClick={() => navigate('/podcasts')}
          className="col-span-2 bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-all"
        >
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 flex-shrink-0 flex items-center justify-center relative overflow-hidden">
            {/* Placeholder cover */}
            <PlayCircle size={32} className="text-indigo-500 relative z-10" />
            <div className="absolute inset-0 bg-indigo-500/10"></div>
          </div>
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {t('dashboard.course.newEpisode', { defaultValue: 'New Episode' })}
              </span>
            </div>
            <h4 className="font-bold text-slate-900 leading-tight">Coffee Break Korean</h4>
            <p className="text-xs text-slate-500 mt-0.5">Episode 42 • 15 min</p>
          </div>
          <div className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center">
            <ChevronRight size={20} className="text-slate-300" />
          </div>
        </button>
      </div>

      {/* 3. Stats / Progress (Pill) */}
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <span className="font-bold text-slate-700 text-sm">
            {t('dashboard.course.overallProgress', { defaultValue: 'Overall Progress' })}
          </span>
          <span className="font-black text-slate-900">{overallProgress}%</span>
        </div>
        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
          <div
            className="bg-slate-900 h-full rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
