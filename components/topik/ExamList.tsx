import React from 'react';
import { Calendar, CheckCircle, FileText, History as HistoryIcon } from 'lucide-react';
import { TopikExam, ExamAttempt, Language } from '../../types';
import { getLabels } from '../../utils/i18n';

interface ExamListProps {
  exams: TopikExam[];
  history: ExamAttempt[];
  language: Language;
  onStartExam: (exam: TopikExam) => void;
  onViewHistory: () => void;
  canAccessContent?: (content: any) => boolean;
  onShowUpgradePrompt?: () => void;
}

const ExamList: React.FC<ExamListProps> = ({
  exams,
  history,
  language,
  onStartExam,
  onViewHistory,
  canAccessContent,
  onShowUpgradePrompt,
}) => {
  const labels = getLabels(language);

  const getAttemptCount = (examId: string) => {
    return history.filter(h => h.examId === examId).length;
  };

  const getBestScore = (examId: string): number | null => {
    const attempts = history.filter(h => h.examId === examId);
    if (attempts.length === 0) return null;
    const scores = attempts.map(a => (a.score / a.total) * 100);
    return Math.max(...scores);
  };

  const handleExamClick = (exam: TopikExam) => {
    // Check permissions
    if (canAccessContent && !canAccessContent(exam)) {
      onShowUpgradePrompt?.();
      return;
    }
    onStartExam(exam);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">{labels.topikExams}</h2>
        {history.length > 0 && (
          <button
            onClick={onViewHistory}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
          >
            <HistoryIcon className="w-4 h-4" />
            {labels.history}
          </button>
        )}
      </div>

      {/* Exam List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {exams.map((exam) => {
          const attemptCount = getAttemptCount(exam.id);
          const bestScore = getBestScore(exam.id);
          const isLocked = canAccessContent && !canAccessContent(exam);

          return (
            <div
              key={exam.id}
              onClick={() => handleExamClick(exam)}
              className={`bg-white rounded-xl p-6 border-2 transition-all ${
                isLocked
                  ? 'border-slate-200 opacity-70 cursor-not-allowed'
                  : 'border-slate-200 hover:border-indigo-300 hover:shadow-lg cursor-pointer'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800 mb-1">{exam.title}</h3>
                  <p className="text-sm text-slate-500">{exam.description}</p>
                </div>
                {isLocked && (
                  <div className="ml-2 px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded">
                    {labels.premium || 'Premium'}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm text-slate-600">
                <div className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  <span>{exam.totalQuestions} {labels.questions}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{exam.timeLimit} {labels.minutes}</span>
                </div>
              </div>

              {attemptCount > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span>{attemptCount} {attemptCount === 1 ? labels.attempt : labels.attempts}</span>
                  </div>
                  {bestScore !== null && (
                    <div className="text-sm font-bold text-indigo-600">
                      {labels.best}: {bestScore.toFixed(0)}%
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {exams.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>{labels.noExams || 'No exams available'}</p>
        </div>
      )}
    </div>
  );
};

export default ExamList;
