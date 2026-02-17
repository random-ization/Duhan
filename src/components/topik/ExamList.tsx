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
  PlayCircle,
} from 'lucide-react';
import { TopikExam, ExamAttempt, Language } from '../../types';
import { getLabel, getLabels } from '../../utils/i18n';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Input,
} from '../ui';

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
  const [pendingDeleteAttemptId, setPendingDeleteAttemptId] = useState<string | null>(null);
  const format = (template: string, vars: Record<string, string | number>) =>
    template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ''));

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
      const matchesSearch =
        exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
              <Button
                type="button"
                variant="ghost"
                size="auto"
                onClick={onBack}
                className="group flex items-center justify-center w-10 h-10 rounded-full bg-card border border-border hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
              </Button>
            )}
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                {getLabel(labels, ['topikExamList', 'historyTitle']) ||
                  labels.examHistory ||
                  'Exam History'}
              </h2>
              <p className="text-muted-foreground text-sm">
                {getLabel(labels, ['topikExamList', 'historySubtitle']) ||
                  'Review your past performance'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {history.length === 0 && (
            <div className="text-center py-20 bg-card rounded-3xl border border-border border-dashed">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <History className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">
                {getLabel(labels, ['topikExamList', 'noHistory']) ||
                  labels.noHistory ||
                  'No exam history yet'}
              </p>
            </div>
          )}

          {history.map((attempt, idx) => {
            const matchingExam = exams.find(e => e.id === attempt.examId);
            const totalScore = attempt.maxScore || attempt.totalScore || 100;
            const percentage = totalScore > 0 ? (attempt.score / totalScore) * 100 : 0;
            const passed = percentage >= 60;

            const attemptRecord = attempt as unknown as Record<string, unknown>;
            const attemptTotalQuestions =
              typeof attemptRecord.totalQuestions === 'number'
                ? attemptRecord.totalQuestions
                : undefined;
            const totalQuestions: number | string = matchingExam
              ? matchingExam.questions?.length || '?'
              : (attemptTotalQuestions ?? '?');
            const correctCount = attempt.correctCount ?? '?';

            return (
              <div
                key={attempt.id || idx}
                className="group bg-card rounded-2xl p-6 border border-border hover:border-indigo-200 hover:shadow-lg transition-all flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 ${
                      passed ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                    }`}
                  >
                    {percentage.toFixed(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-muted-foreground text-lg mb-1">
                      {attempt.examTitle}
                    </h3>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {attempt.timestamp
                          ? new Date(attempt.timestamp).toLocaleDateString()
                          : 'N/A'}
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        {correctCount} / {totalQuestions} {labels.correct}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 md:self-center self-end">
                  <Button
                    type="button"
                    size="auto"
                    onClick={() => onReviewAttempt(attempt)}
                    className="px-5 py-2.5 bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/25 hover:text-indigo-700 dark:hover:text-indigo-200 rounded-xl font-bold transition-colors flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span>{getLabel(labels, ['topikExamList', 'review']) || 'Review'}</span>
                  </Button>

                  {onDeleteAttempt && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="auto"
                      onClick={() => setPendingDeleteAttemptId(attempt.id)}
                      className="p-2.5 text-muted-foreground hover:text-red-500 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-500/15 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <AlertDialog
          open={pendingDeleteAttemptId !== null}
          onOpenChange={open => {
            if (!open) setPendingDeleteAttemptId(null);
          }}
        >
          <AlertDialogContent className="max-w-md border-2 border-foreground rounded-2xl shadow-pop">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-black text-foreground">
                {getLabel(labels, ['topikExamList', 'deleteAttemptTitle']) || 'Delete attempt?'}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm font-semibold text-muted-foreground">
                {getLabel(labels, ['topikExamList', 'deleteConfirm']) || 'Delete this attempt?'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row justify-end gap-2">
              <AlertDialogCancel onClick={() => setPendingDeleteAttemptId(null)}>
                {getLabel(labels, ['common', 'cancel']) || 'Cancel'}
              </AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  if (pendingDeleteAttemptId && onDeleteAttempt)
                    onDeleteAttempt(pendingDeleteAttemptId);
                  setPendingDeleteAttemptId(null);
                }}
              >
                {getLabel(labels, ['common', 'delete']) || 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // --- EXAM LIST VIEW ---
  return (
    <div className="max-w-[1200px] mx-auto space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 text-xs font-bold mb-3 uppercase tracking-wider">
            <Trophy className="w-3 h-3" />{' '}
            {getLabel(labels, ['topikExamList', 'badge']) || 'TOPIK Preparation'}
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">
            {getLabel(labels, ['topikExamList', 'title']) ||
              labels.topikExams ||
              'TOPIK Practice Exams'}
          </h1>
          <p className="text-muted-foreground mt-2 font-medium max-w-lg">
            {getLabel(labels, ['topikExamList', 'subtitle']) ||
              'Practice with past exams to master the pace and find your weak spots.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {history.length > 0 && (
            <Button
              type="button"
              size="auto"
              variant="ghost"
              onClick={onViewHistory}
              className="flex items-center gap-2 px-5 py-2.5 bg-card border border-border text-muted-foreground font-bold rounded-xl hover:bg-muted hover:border-border transition-all shadow-sm"
            >
              <History className="w-4 h-4" />
              {labels.history}
            </Button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-card p-2 rounded-2xl border border-border shadow-sm flex flex-col sm:flex-row gap-2">
        <div className="flex p-1 bg-muted rounded-xl">
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={() => setFilterType('ALL')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              filterType === 'ALL'
                ? 'bg-card text-indigo-600 shadow-sm'
                : 'text-muted-foreground hover:text-muted-foreground'
            }`}
          >
            {getLabel(labels, ['topikExamList', 'filterAll']) || 'All'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={() => setFilterType('READING')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
              filterType === 'READING'
                ? 'bg-card text-blue-600 shadow-sm'
                : 'text-muted-foreground hover:text-muted-foreground'
            }`}
          >
            <BookOpen className="w-4 h-4" />{' '}
            {getLabel(labels, ['topikExamList', 'filterReading']) || 'Reading'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={() => setFilterType('LISTENING')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
              filterType === 'LISTENING'
                ? 'bg-card text-violet-600 shadow-sm'
                : 'text-muted-foreground hover:text-muted-foreground'
            }`}
          >
            <Headphones className="w-4 h-4" />{' '}
            {getLabel(labels, ['topikExamList', 'filterListening']) || 'Listening'}
          </Button>
        </div>

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={
              getLabel(labels, ['topikExamList', 'searchPlaceholder']) ||
              'Search by round or title...'
            }
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 h-full bg-transparent text-sm font-medium placeholder:text-muted-foreground border-none shadow-none focus-visible:ring-0"
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
            <Button
              key={exam.id}
              type="button"
              size="auto"
              variant="ghost"
              onClick={() => !isLocked && onSelectExam(exam)}
              disabled={isLocked}
              className={`group relative bg-card rounded-3xl p-6 border border-border shadow-sm hover:shadow-xl hover:border-indigo-200 hover:-translate-y-1 transition-all text-left w-full ${isLocked ? 'opacity-90 cursor-not-allowed' : 'cursor-pointer'} overflow-hidden flex flex-col h-full outline-none focus:ring-2 focus:ring-indigo-500/50`}
            >
              {/* Top Decor */}
              <div
                className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl -mr-16 -mt-16 transition-colors ${
                  isReading
                    ? 'bg-blue-50 dark:bg-blue-500/10 group-hover:bg-blue-100 dark:group-hover:bg-blue-500/20'
                    : 'bg-violet-50 dark:bg-violet-500/10 group-hover:bg-violet-100 dark:group-hover:bg-violet-500/20'
                }`}
              ></div>

              <div className="relative z-10 flex justify-between items-start mb-6">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${
                    isReading
                      ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300'
                      : 'bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-300'
                  }`}
                >
                  {isReading ? (
                    <BookOpen className="w-6 h-6" />
                  ) : (
                    <Headphones className="w-6 h-6" />
                  )}
                </div>
                <div className="flex gap-2">
                  <span className="px-2.5 py-1 bg-muted text-muted-foreground text-xs font-bold rounded-lg border border-border">
                    {format(getLabel(labels, ['topikExamList', 'round']) || 'Round {round}', {
                      round: exam.round,
                    })}
                  </span>
                  {isLocked && (
                    <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-200 text-xs font-bold rounded-lg flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Premium
                    </span>
                  )}
                </div>
              </div>

              <div className="relative z-10 flex-1">
                <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-indigo-600 transition-colors">
                  {exam.title}
                </h3>
                <div className="flex items-center gap-4 text-sm text-muted-foreground font-medium">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4" />
                    {format(
                      getLabel(labels, ['topikExamList', 'questionCount']) || '{count} questions',
                      { count: exam.questions?.length || 0 }
                    )}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {format(getLabel(labels, ['topikExamList', 'timeMinutes']) || '{minutes} min', {
                      minutes: exam.timeLimit,
                    })}
                  </span>
                </div>
              </div>

              {/* Footer / Stats */}
              <div className="relative z-10 mt-6 pt-4 border-t border-border flex items-center justify-between">
                {attemptCount > 0 ? (
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-lg ${
                        (bestScore || 0) >= 60
                          ? 'bg-green-100 dark:bg-green-500/15 text-green-700 dark:text-green-200'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <Trophy className="w-3 h-3" />
                      {format(getLabel(labels, ['topikExamList', 'bestScore']) || 'Best: {score}', {
                        score: bestScore ? bestScore.toFixed(0) : '0',
                      })}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(
                        getLabel(labels, ['topikExamList', 'attempts']) || '{count} attempts',
                        { count: attemptCount }
                      )}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground font-medium">
                    {getLabel(labels, ['topikExamList', 'notStarted']) || 'Not started'}
                  </span>
                )}

                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isReading
                      ? 'bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300 group-hover:bg-blue-600 group-hover:text-white'
                      : 'bg-violet-50 dark:bg-violet-500/15 text-violet-600 dark:text-violet-300 group-hover:bg-violet-600 group-hover:text-white'
                  }`}
                >
                  <PlayCircle className="w-5 h-5 fill-current" />
                </div>
              </div>
            </Button>
          );
        })}
      </div>

      {filteredExams.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Filter className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">
            {getLabel(labels, ['topikExamList', 'noResults']) || 'No exams match your filters'}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={() => {
              setFilterType('ALL');
              setSearchQuery('');
            }}
            className="mt-4 text-indigo-600 font-bold hover:underline"
          >
            {getLabel(labels, ['topikExamList', 'clearFilters']) || 'Clear filters'}
          </Button>
        </div>
      )}
    </div>
  );
};
