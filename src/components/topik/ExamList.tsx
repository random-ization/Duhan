import React, { useState, useMemo } from 'react';
import {
  Calendar,
  CheckCircle2,
  FileText,
  History,
  ArrowLeft,
  Eye,
  Lock,
  Trash2,
  Search,
  Filter,
  Headphones,
  BookOpen,
  Trophy,
  PlayCircle
} from 'lucide-react';
import { TopikExam, ExamAttempt, Language } from '../../types';
import { getLabels } from '../../utils/i18n';

interface ExamListProps {
  exams: TopikExam[];
  history: ExamAttempt[];
  language: Language;
  onSelectExam: (exam: TopikExam) => void;
  onViewHistory: () => void;
  onReviewAttempt: (attempt: ExamAttempt) => void;
  showHistoryView?: boolean;
  onBack?: () => void;
  canAccessContent?: (exam: TopikExam) => boolean;
  onDeleteAttempt?: (attemptId: string) => void;
}

export const ExamList: React.FC<ExamListProps> = ({
  exams,
  history,
  language,
  onSelectExam,
  onViewHistory,
  onReviewAttempt,
  showHistoryView = false,
  onBack,
  canAccessContent,
  onDeleteAttempt,
}) => {
  const labels = getLabels(language);
  const [filterType, setFilterType] = useState<'ALL' | 'READING' | 'LISTENING'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const getAttemptCount = (examId: string) => {
    return history.filter(h => h.examId === examId).length;
  };

  const getBestScore = (examId: string): number | null => {
    const attempts = history.filter(h => h.examId === examId);
    if (attempts.length === 0) return null;
    const scores = attempts.map(a => {
      const total = a.totalScore || a.maxScore;
      return total > 0 ? (a.score / total) * 100 : 0;
    });
    return Math.max(...scores);
  };

  // Filter exams
  const filteredExams = useMemo(() => {
    return exams.filter(exam => {
      const matchesType = filterType === 'ALL' || exam.type === filterType;
      const matchesSearch = exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exam.round.toString().includes(searchQuery);
      return matchesType && matchesSearch;
    });
  }, [exams, filterType, searchQuery]);

  // --- HISTORY VIEW ---
  if (showHistoryView) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="group flex items-center justify-center w-10 h-10 rounded-full bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
              </button>
            )}
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                {labels.examHistory || '考试记录'}
              </h2>
              <p className="text-slate-500 text-sm">Review your past performance</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {history.length === 0 && (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <History className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-500 font-medium">{labels.noHistory || '暂无考试记录'}</p>
            </div>
          )}

          {history.map((attempt, idx) => {
            const matchingExam = exams.find(e => e.id === attempt.examId);
            const totalScore = attempt.maxScore || attempt.totalScore || 100;
            const percentage = totalScore > 0 ? (attempt.score / totalScore) * 100 : 0;
            const passed = percentage >= 60;

            const totalQuestions = matchingExam ? (matchingExam.questions?.length || '?') : (attempt as any).totalQuestions || '?';
            const correctCount = attempt.correctCount ?? '?';

            return (
              <div
                key={idx}
                className="group bg-white rounded-2xl p-6 border border-slate-200 hover:border-indigo-200 hover:shadow-lg transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 ${passed ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                    }`}>
                    {percentage.toFixed(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg mb-1">{attempt.examTitle}</h3>
                    <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {attempt.timestamp ? new Date(attempt.timestamp).toLocaleDateString() : 'N/A'}
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        {correctCount} / {totalQuestions} {labels.correct}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 md:self-center self-end">
                  <button
                    onClick={() => onReviewAttempt(attempt)}
                    className="px-5 py-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700 rounded-xl font-bold transition-colors flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span>{language === 'zh' ? '复习错题' : 'Review'}</span>
                  </button>

                  {onDeleteAttempt && (
                    <button
                      onClick={() => {
                        if (window.confirm(language === 'zh' ? '确定要删除这条记录吗？' : 'Delete this attempt?')) {
                          onDeleteAttempt(attempt.id);
                        }
                      }}
                      className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // --- EXAM LIST VIEW ---
  return (
    <div className="max-w-[1200px] mx-auto space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold mb-3 uppercase tracking-wider">
            <Trophy className="w-3 h-3" /> TOPIK Preparation
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            {labels.topikExams || 'TOPIK 实战模拟'}
          </h1>
          <p className="text-slate-500 mt-2 font-medium max-w-lg">
            通过历年真题模拟考试，熟悉考试节奏，精准定位薄弱环节。
          </p>
        </div>

        <div className="flex items-center gap-3">
          {history.length > 0 && (
            <button
              onClick={onViewHistory}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
            >
              <History className="w-4 h-4" />
              {labels.history}
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-2">
        <div className="flex p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterType === 'ALL' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            全部
          </button>
          <button
            onClick={() => setFilterType('READING')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${filterType === 'READING' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            <BookOpen className="w-4 h-4" /> 阅读
          </button>
          <button
            onClick={() => setFilterType('LISTENING')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${filterType === 'LISTENING' ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            <Headphones className="w-4 h-4" /> 听力
          </button>
        </div>

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="搜索届数或标题..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 h-full bg-transparent outline-none text-sm font-medium placeholder-slate-400"
          />
        </div>
      </div>

      {/* Exam Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredExams.map(exam => {
          const attemptCount = getAttemptCount(exam.id);
          const bestScore = getBestScore(exam.id);
          const isLocked = canAccessContent != null && !canAccessContent(exam);
          const isReading = exam.type === 'READING';

          return (
            <div
              key={exam.id}
              onClick={() => !isLocked && onSelectExam(exam)}
              className={`group relative bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 hover:-translate-y-1 transition-all ${isLocked ? 'opacity-90 cursor-not-allowed' : 'cursor-pointer'} overflow-hidden flex flex-col h-full`}
            >
              {/* Top Decor */}
              <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-16 -mt-16 transition-colors ${isReading ? 'bg-blue-50 group-hover:bg-blue-100' : 'bg-violet-50 group-hover:bg-violet-100'
                }`}></div>

              <div className="relative z-10 flex justify-between items-start mb-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${isReading ? 'bg-blue-50 text-blue-600' : 'bg-violet-50 text-violet-600'
                  }`}>
                  {isReading ? <BookOpen className="w-6 h-6" /> : <Headphones className="w-6 h-6" />}
                </div>
                <div className="flex gap-2">
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-lg border border-slate-200">
                    第 {exam.round} 届
                  </span>
                  {isLocked && (
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-lg flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Premium
                    </span>
                  )}
                </div>
              </div>

              <div className="relative z-10 flex-1">
                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">
                  {exam.title}
                </h3>
                <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4" />
                    {exam.questions?.length || 0} 题
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {exam.timeLimit} 分钟
                  </span>
                </div>
              </div>

              {/* Footer / Stats */}
              <div className="relative z-10 mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                {attemptCount > 0 ? (
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-lg ${(bestScore || 0) >= 60 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                      <Trophy className="w-3 h-3" />
                      最高分: {bestScore?.toFixed(0)}
                    </div>
                    <span className="text-xs text-slate-400">{attemptCount} 次练习</span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 font-medium">尚未开始</span>
                )}

                <button className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isReading
                  ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white'
                  : 'bg-violet-50 text-violet-600 group-hover:bg-violet-600 group-hover:text-white'
                  }`}>
                  <PlayCircle className="w-5 h-5 fill-current" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredExams.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Filter className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-slate-500 font-medium">没有找到符合条件的考试</p>
          <button onClick={() => { setFilterType('ALL'); setSearchQuery(''); }} className="mt-4 text-indigo-600 font-bold hover:underline">
            清除筛选
          </button>
        </div>
      )}
    </div>
  );
};
