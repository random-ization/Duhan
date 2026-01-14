import React from 'react';
import {
  Book, Clock, Library, Trophy, Flame, ChevronRight,
  Share2, AlertCircle, BookMarked, RefreshCw, Trash2,
  Headphones, Sparkles, BookOpen, ArrowLeft
} from 'lucide-react';
import { Institute, Language, User, LearningModuleType } from '../types';
import { getLabels } from '../utils/i18n';

interface DashboardProps {
  user: User;
  institute: Institute | undefined;
  level: number;
  onChangeCourse: () => void;
  language: Language;
  onOpenVocabBook: () => void;
  onOpenMistakeBook: () => void;
  onClearMistakes: () => void;
  onStartModule: (module: LearningModuleType) => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  user,
  institute,
  level,
  onChangeCourse,
  language,
  onOpenVocabBook,
  onOpenMistakeBook,
  onClearMistakes,
  onStartModule,
}) => {
  const labels = getLabels(language);

  return (
    <div className="w-full max-w-[1200px] mx-auto pb-20">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-10">
        <div>
          <button
            onClick={onChangeCourse}
            className="text-slate-400 hover:text-slate-600 text-sm font-bold flex items-center mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> {labels.changeCourse || 'Change Course'}
          </button>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            {institute ? institute.name : labels.noCourseSelected}
            <span className="text-indigo-600 ml-3">Level {level}</span>
          </h1>
          <p className="text-slate-500 mt-2 font-medium">Continue where you left off in your curriculum.</p>
        </div>
      </div>

      {/* 2. Main Learning Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {[
          {
            id: LearningModuleType.VOCABULARY,
            label: labels.vocabLabel,
            desc: labels.vocabDesc,
            icon: Book,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
            border: 'hover:border-emerald-200',
            shadow: 'hover:shadow-emerald-100'
          },
          {
            id: LearningModuleType.READING,
            label: labels.reading,
            desc: labels.readingDesc,
            icon: BookOpen,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            border: 'hover:border-blue-200',
            shadow: 'hover:shadow-blue-100'
          },
          {
            id: LearningModuleType.LISTENING,
            label: labels.listening,
            desc: labels.listeningDesc,
            icon: Headphones,
            color: 'text-violet-600',
            bg: 'bg-violet-50',
            border: 'hover:border-violet-200',
            shadow: 'hover:shadow-violet-100'
          },
          {
            id: LearningModuleType.GRAMMAR,
            label: labels.grammar,
            desc: labels.grammarDesc,
            icon: Sparkles,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            border: 'hover:border-amber-200',
            shadow: 'hover:shadow-amber-100'
          }
        ].map((mod) => (
          <button
            key={mod.id}
            onClick={() => onStartModule(mod.id)}
            className={`group relative bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${mod.border} ${mod.shadow} text-left flex flex-col h-full overflow-hidden`}
          >
            <div className={`w-14 h-14 ${mod.bg} ${mod.color} rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
              <mod.icon className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">{mod.label}</h3>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed flex-1">{mod.desc}</p>

            <div className={`flex items-center text-sm font-bold ${mod.color} opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300`}>
              {labels.startLearning || 'Start'} <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-4 mb-6">
        <h3 className="text-lg font-bold text-slate-800">{labels.review || 'Review Center'}</h3>
        <div className="h-px bg-slate-200 flex-1"></div>
      </div>

      {/* 3. Review & Notebooks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Vocab Book */}
        <button
          onClick={onOpenVocabBook}
          className="group bg-gradient-to-br from-white to-slate-50 p-6 rounded-3xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all text-left relative overflow-hidden"
        >
          <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-indigo-100 transition-colors"></div>

          <div className="relative z-10 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-600">
                  <BookMarked className="w-6 h-6" />
                </div>
                <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold border border-indigo-200">
                  {(user.savedWords || []).length} items
                </span>
              </div>
              <h4 className="font-bold text-xl text-slate-800 mb-1">{labels.vocabBook}</h4>
              <p className="text-sm text-slate-500">{labels.savedWordsDesc}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
              <ChevronRight className="w-5 h-5" />
            </div>
          </div>
        </button>

        {/* Mistake Notebook */}
        <div className="group bg-gradient-to-br from-white to-slate-50 p-6 rounded-3xl border border-slate-200 hover:border-red-300 hover:shadow-lg transition-all text-left relative overflow-hidden flex flex-col">
          <div className="absolute right-0 top-0 w-32 h-32 bg-red-50 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-red-100 transition-colors"></div>

          <div className="relative z-10 flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-white rounded-lg shadow-sm text-red-600">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold border border-red-200">
                  {(user.mistakes || []).length} items
                </span>
              </div>
              <h4 className="font-bold text-xl text-slate-800 mb-1">{labels.mistakeBook}</h4>
              <p className="text-sm text-slate-500">{labels.mistakeWordsDesc}</p>
            </div>
          </div>

          <div className="relative z-10 flex gap-3 mt-auto">
            <button
              onClick={onOpenMistakeBook}
              disabled={(user.mistakes || []).length === 0}
              className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${(user.mistakes || []).length > 0
                ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
            >
              <RefreshCw className="w-4 h-4" /> {labels.startReview}
            </button>
            {(user.mistakes || []).length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClearMistakes();
                }}
                className="px-4 py-2.5 bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 rounded-xl transition-colors"
                title="Clear all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
