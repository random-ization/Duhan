import React from 'react';
import {
  Book,
  Clock,
  Library,
  Trophy,
  Flame,
  ChevronRight,
  Share2,
  AlertCircle,
  BookMarked,
  RefreshCw,
  Trash2,
  Headphones,
  Sparkles,
  BookOpen,
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
    <div className="w-full space-y-8 pb-20">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2">{labels.dashboard}</h1>
          <p className="text-slate-500">{labels.welcomeBackUser.replace('{name}', user.name)}</p>
        </div>

        {/* Current Course Card */}
        <div className="w-full md:w-auto bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center justify-between gap-6 min-w-[300px]">
          <div className="flex items-center space-x-4">
            <div className="bg-indigo-600 p-3 rounded-xl text-white shadow-md shadow-indigo-200">
              <Library className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wide">
                {institute ? institute.name : labels.noCourseSelected}
              </h2>
              <p className="text-indigo-600 font-bold text-lg">Level {level}</p>
            </div>
          </div>
          <button
            onClick={onChangeCourse}
            className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            {labels.changeCourse}
          </button>
        </div>
      </div>

      {/* 2. Main Learning Modules Grid - EXPANDED */}
      <div>
        <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center">
          <span className="w-1 h-6 bg-indigo-600 rounded-full mr-3"></span>
          {labels.textbookLearning}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <button
            onClick={() => onStartModule(LearningModuleType.VOCABULARY)}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-indigo-300 hover:-translate-y-1 transition-all text-left flex flex-col h-full group"
          >
            <div className="bg-emerald-100 w-12 h-12 rounded-2xl text-emerald-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Book className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">{labels.vocab}</h3>
            <p className="text-sm text-slate-500 mb-4 flex-1">{labels.vocabDesc}</p>
            <div className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full w-fit">
              {labels.startLearning} <ChevronRight className="w-3 h-3 ml-1" />
            </div>
          </button>

          <button
            onClick={() => onStartModule(LearningModuleType.READING)}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-indigo-300 hover:-translate-y-1 transition-all text-left flex flex-col h-full group"
          >
            <div className="bg-blue-100 w-12 h-12 rounded-2xl text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">{labels.reading}</h3>
            <p className="text-sm text-slate-500 mb-4 flex-1">{labels.readingDesc}</p>
            <div className="flex items-center text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full w-fit">
              {labels.startReading} <ChevronRight className="w-3 h-3 ml-1" />
            </div>
          </button>

          <button
            onClick={() => onStartModule(LearningModuleType.LISTENING)}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-indigo-300 hover:-translate-y-1 transition-all text-left flex flex-col h-full group"
          >
            <div className="bg-violet-100 w-12 h-12 rounded-2xl text-violet-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Headphones className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">{labels.listening}</h3>
            <p className="text-sm text-slate-500 mb-4 flex-1">{labels.listeningDesc}</p>
            <div className="flex items-center text-xs font-bold text-violet-600 bg-violet-50 px-3 py-1 rounded-full w-fit">
              {labels.startListening} <ChevronRight className="w-3 h-3 ml-1" />
            </div>
          </button>

          <button
            onClick={() => onStartModule(LearningModuleType.GRAMMAR)}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-indigo-300 hover:-translate-y-1 transition-all text-left flex flex-col h-full group"
          >
            <div className="bg-amber-100 w-12 h-12 rounded-2xl text-amber-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">{labels.grammar}</h3>
            <p className="text-sm text-slate-500 mb-4 flex-1">{labels.grammarDesc}</p>
            <div className="flex items-center text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full w-fit">
              {labels.startGrammar} <ChevronRight className="w-3 h-3 ml-1" />
            </div>
          </button>
        </div>
      </div>

      <div className="border-t border-slate-200"></div>

      {/* 3. Review & Notebooks Grid */}
      <div>
        <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center">
          <span className="w-1 h-6 bg-slate-300 rounded-full mr-3"></span>
          {labels.review}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Vocab Book */}
          <button
            onClick={onOpenVocabBook}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all text-left relative group overflow-hidden flex flex-col h-full"
          >
            <div className="absolute -right-6 -top-6 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:rotate-12 duration-500">
              <BookMarked className="w-32 h-32 text-indigo-500" />
            </div>
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                <BookMarked className="w-6 h-6" />
              </div>
              <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">
                {user.savedWords.length}
              </span>
            </div>
            <h4 className="font-bold text-lg text-slate-800 mb-1">{labels.vocabBook}</h4>
            <p className="text-sm text-slate-500 flex-1">{labels.savedWordsDesc}</p>
          </button>

          {/* Mistake Notebook */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-red-200 transition-all text-left relative group overflow-hidden flex flex-col h-full">
            <div className="absolute -right-6 -top-6 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:rotate-12 duration-500">
              <AlertCircle className="w-32 h-32 text-red-500" />
            </div>
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-600">
                <AlertCircle className="w-6 h-6" />
              </div>
              <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">
                {user.mistakes.length}
              </span>
            </div>
            <h4 className="font-bold text-lg text-slate-800 mb-1">{labels.mistakeBook}</h4>
            <p className="text-sm text-slate-500 mb-4 flex-1">{labels.mistakeWordsDesc}</p>

            <div className="flex gap-2 relative z-10 mt-auto">
              <button
                onClick={onOpenMistakeBook}
                disabled={user.mistakes.length === 0}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors text-sm font-bold flex items-center justify-center ${
                  user.mistakes.length > 0
                    ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                <RefreshCw className="w-4 h-4 mr-1" /> {labels.startReview}
              </button>
              {user.mistakes.length > 0 && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onClearMistakes();
                  }}
                  className="px-3 py-2 bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 rounded-lg transition-colors text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
