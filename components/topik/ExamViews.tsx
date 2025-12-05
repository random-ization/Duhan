import React from 'react';
import { TopikExam, Language, Annotation } from '../../types';
import { Clock, FileText, Trophy, RotateCcw, ArrowLeft, CheckCircle, Calendar } from 'lucide-react';
import { getLabels } from '../../utils/i18n';
import { QuestionRenderer } from './QuestionRenderer';

// Exam Cover View
interface ExamCoverViewProps {
  exam: TopikExam;
  language: Language;
  onStart: () => void;
  onBack: () => void;
}

export const ExamCoverView: React.FC<ExamCoverViewProps> = ({ exam, language, onStart, onBack }) => {
  const labels = getLabels(language);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8">
        <button onClick={onBack} className="mb-6 text-indigo-600 hover:text-indigo-700 flex items-center space-x-2">
          <ArrowLeft className="w-5 h-5" />
          <span>{labels.back || 'Back'}</span>
        </button>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full mb-4">
            <FileText className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{exam.title}</h1>
          <p className="text-gray-600">{exam.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-indigo-50 p-4 rounded-lg text-center">
            <div className="text-indigo-600 font-semibold mb-1">{labels.questions || 'Questions'}</div>
            <div className="text-2xl font-bold text-gray-900">{exam.questions.length}</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg text-center">
            <div className="text-purple-600 font-semibold mb-1">{labels.timeLimit || 'Time Limit'}</div>
            <div className="text-2xl font-bold text-gray-900">{exam.timeLimit} {labels.minutes || 'min'}</div>
          </div>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <p className="text-sm text-yellow-800">
            <strong>{labels.note || 'Note'}:</strong> {labels.examNote || 'Timer starts automatically. You can pause anytime but the timer continues. Submit before time runs out!'}
          </p>
        </div>

        <button
          onClick={onStart}
          className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold text-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
        >
          <Clock className="w-6 h-6" />
          <span>{labels.startExam || 'Start Exam'}</span>
        </button>
      </div>
    </div>
  );
};

// Exam Result View
interface ExamResultViewProps {
  exam: TopikExam;
  result: {
    score: number;
    totalScore: number;
    correctCount: number;
    totalQuestions: number;
  };
  language: Language;
  onReview: () => void;
  onTryAgain: () => void;
  onBackToList: () => void;
}

export const ExamResultView: React.FC<ExamResultViewProps> = ({
  exam,
  result,
  language,
  onReview,
  onTryAgain,
  onBackToList
}) => {
  const labels = getLabels(language);
  const percentage = (result.score / result.totalScore) * 100;
  const passed = percentage >= 60;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full mb-4 ${
            passed ? 'bg-gradient-to-br from-green-400 to-green-600' : 'bg-gradient-to-br from-red-400 to-red-600'
          }`}>
            {passed ? <Trophy className="w-12 h-12 text-white" /> : <Clock className="w-12 h-12 text-white" />}
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {passed ? (labels.congratulations || 'Congratulations!') : (labels.examComplete || 'Exam Complete')}
          </h1>
          <p className="text-gray-600">{exam.title}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className={`p-6 rounded-lg text-center ${passed ? 'bg-green-50' : 'bg-red-50'}`}>
            <div className={`font-semibold mb-2 ${passed ? 'text-green-600' : 'text-red-600'}`}>
              {labels.score || 'Score'}
            </div>
            <div className="text-4xl font-bold text-gray-900">
              {percentage.toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600 mt-2">
              {result.score} / {result.totalScore} {labels.points || 'points'}
            </div>
          </div>

          <div className="bg-indigo-50 p-6 rounded-lg text-center">
            <div className="text-indigo-600 font-semibold mb-2">{labels.correct || 'Correct'}</div>
            <div className="text-4xl font-bold text-gray-900">{result.correctCount}</div>
            <div className="text-sm text-gray-600 mt-2">
              {labels.outOf || 'out of'} {result.totalQuestions}
            </div>
          </div>
        </div>

        <div className={`border-l-4 p-4 mb-6 rounded ${
          passed ? 'bg-green-50 border-green-400' : 'bg-red-50 border-red-400'
        }`}>
          <p className={`font-semibold ${passed ? 'text-green-800' : 'text-red-800'}`}>
            {passed
              ? (labels.passMessage || 'Great job! You passed the exam.')
              : (labels.failMessage || 'Keep practicing! You can try again.')
            }
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={onReview}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
          >
            <CheckCircle className="w-5 h-5" />
            <span>{labels.reviewAnswers || 'Review Answers'}</span>
          </button>

          <button
            onClick={onTryAgain}
            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
          >
            <RotateCcw className="w-5 h-5" />
            <span>{labels.tryAgain || 'Try Again'}</span>
          </button>

          <button
            onClick={onBackToList}
            className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold transition-colors flex items-center justify-center space-x-2"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>{labels.backToList || 'Back to List'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Exam Review View
interface ExamReviewViewProps {
  exam: TopikExam;
  userAnswers: Record<number, number>;
  language: Language;
  annotations: Annotation[];
  onSaveAnnotation: (annotation: Annotation) => void;
  onDeleteAnnotation: (contextKey: string) => void;
  onBack: () => void;
}

export const ExamReviewView: React.FC<ExamReviewViewProps> = ({
  exam,
  userAnswers,
  language,
  annotations,
  onSaveAnnotation,
  onDeleteAnnotation,
  onBack
}) => {
  const labels = getLabels(language);

  // Calculate stats
  let correctCount = 0;
  exam.questions.forEach((q, idx) => {
    if (userAnswers[idx] === q.correctOptionIndex) {
      correctCount++;
    }
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={onBack}
                className="mb-2 text-indigo-600 hover:text-indigo-700 flex items-center space-x-2"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>{labels.back || 'Back'}</span>
              </button>
              <h2 className="text-xl font-semibold">{exam.title} - {labels.review || 'Review'}</h2>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">{labels.yourScore || 'Your Score'}</div>
              <div className="text-2xl font-bold text-indigo-600">
                {correctCount} / {exam.questions.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {exam.questions.map((question, idx) => (
            <div key={idx} className="bg-white p-6 rounded-lg shadow">
              <QuestionRenderer
                question={question}
                questionIndex={idx}
                userAnswer={userAnswers[idx]}
                correctAnswer={question.correctOptionIndex}
                language={language}
                showCorrect={true}
                annotations={annotations}
                contextPrefix={`TOPIK-${exam.id}`}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
