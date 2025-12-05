import React, { useMemo, useCallback } from 'react';
import { Calendar, CheckCircle, FileText, History as HistoryIcon, ArrowLeft, Eye } from 'lucide-react';
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
}

export const ExamList: React.FC<ExamListProps> = React.memo(({
  exams,
  history,
  language,
  onSelectExam,
  onViewHistory,
  onReviewAttempt,
  showHistoryView = false,
  onBack,
}) => {
  const labels = useMemo(() => getLabels(language), [language]);

  const getAttemptCount = useCallback((examId: string) => {
    return history.filter(h => h.examId === examId).length;
  }, [history]);

  const getBestScore = useCallback((examId: string): number | null => {
    const attempts = history.filter(h => h.examId === examId);
    if (attempts.length === 0) return null;
    const scores = attempts.map(a => (a.score / a.totalScore) * 100);
    return Math.max(...scores);
  }, [history]);

  // Show history view
  if (showHistoryView) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            {onBack && (
              <button
                onClick={onBack}
                className="mb-2 text-indigo-600 hover:text-indigo-700 flex items-center space-x-2"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>{labels.back || 'Back'}</span>
              </button>
            )}
            <h2 className="text-2xl font-bold text-slate-800">{labels.examHistory || 'Exam History'}</h2>
          </div>
        </div>

        <div className="space-y-3">
          {history.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <HistoryIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>{labels.noHistory || 'No exam history yet'}</p>
            </div>
          )}

          {history.map((attempt, idx) => {
            const percentage = (attempt.score / attempt.totalScore) * 100;
            const passed = percentage >= 60;

            return (
              <div key={idx} className="bg-white rounded-lg p-4 border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800">{attempt.examTitle}</h3>
                    <div className="flex items-center gap-4 text-sm text-slate-600 mt-1">
                      <span>{new Date(attempt.date).toLocaleDateString()}</span>
                      <span>
                        {attempt.correctCount} / {attempt.totalQuestions} {labels.correct || 'correct'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className={`text-right px-4 py-2 rounded-lg ${
                      passed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      <div className="text-2xl font-bold">{percentage.toFixed(1)}%</div>
                      <div className="text-xs">{passed ? labels.passed || 'Passed' : labels.failed || 'Failed'}</div>
                    </div>

                    <button
                      onClick={() => onReviewAttempt(attempt)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                    >
                      <Eye className="w-4 h-4" />
                      <span>{labels.review || 'Review'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Show exam list view
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
              onClick={() => onSelectExam(exam)}
              className="bg-white rounded-xl p-6 border-2 border-slate-200 hover:border-indigo-300 hover:shadow-lg cursor-pointer transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800 mb-1">{exam.title}</h3>
                  <p className="text-sm text-slate-500">{exam.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-slate-600">
                <div className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  <span>{exam.questions.length} {labels.questions || 'questions'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{exam.timeLimit} {labels.minutes || 'min'}</span>
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
});

// Export as named export
export default ExamList;
