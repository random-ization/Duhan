import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Clock, ChevronLeft, ChevronRight, LayoutGrid, FileText } from 'lucide-react';
import { cn } from '../../lib/utils';
import { TopikExam, Language } from '../../types';
import { QuestionRenderer } from '../topik/QuestionRenderer';
import { MobileQuestionNav } from './MobileQuestionNav';
import { BottomSheet } from '../common/BottomSheet';
// import { getLabels } from '../../utils/i18n'; // Unused for now

interface MobileExamSessionProps {
  exam: TopikExam;
  language: Language;
  userAnswers: Record<number, number>;
  timeLeft: number;
  onAnswerChange: (questionIndex: number, optionIndex: number) => void;
  onSubmit: () => void;
  onExit?: () => void;
}

export const MobileExamSession: React.FC<MobileExamSessionProps> = ({
  exam,
  language,
  userAnswers,
  timeLeft,
  onAnswerChange,
  onSubmit,
  onExit: _onExit,
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [showPassage, setShowPassage] = useState(false);

  const totalQuestions = exam.questions.length;
  const currentQuestion = exam.questions[currentQuestionIndex];

  // Format timer
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isLowTime = minutes < 5;

  // Scroll to top when question changes
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentQuestionIndex]);

  // Determine if we have a passage
  const hasPassage = Boolean(currentQuestion?.passage);

  // --- Navigation Handlers ---
  const handlePrev = () => {
    if (currentQuestionIndex > 0) setCurrentQuestionIndex(i => i - 1);
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) setCurrentQuestionIndex(i => i + 1);
  };

  const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;

  // Calculate answered count
  const answeredCount = Object.keys(userAnswers).length;

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-50 overflow-hidden">
      {/* Header: Timer & Global Progress */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-sm z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono font-bold text-sm tabular-nums transition-colors',
              isLowTime ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-700'
            )}
          >
            <Clock className="w-3.5 h-3.5" />
            {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
          </div>
          <div className="text-xs font-bold text-slate-400">
            {answeredCount}/{totalQuestions} Answered
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onSubmit}
          className="text-indigo-600 font-bold hover:bg-indigo-50 hover:text-indigo-700"
        >
          Submit
        </Button>
      </div>

      {/* Progress Bar */}
      <div className="h-1 bg-slate-100 w-full shrink-0">
        <div
          className="h-full bg-indigo-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden relative flex flex-col">
        {/* Passage Toggle (Floating, if passage exists) */}
        {hasPassage && (
          <div className="absolute top-4 right-4 z-30">
            <Button
              size="sm"
              onClick={() => setShowPassage(true)}
              className="shadow-lg bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 font-bold gap-2 rounded-full"
            >
              <FileText className="w-4 h-4 text-indigo-500" />
              Show Passage
            </Button>
          </div>
        )}

        {/* Question Scroll Area */}
        <div ref={contentRef} className="flex-1 overflow-y-auto p-5 pb-24">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6 min-h-[50vh]">
            <QuestionRenderer
              question={currentQuestion}
              questionIndex={currentQuestionIndex}
              userAnswer={userAnswers[currentQuestionIndex]}
              language={language}
              showCorrect={false}
              onAnswerChange={optIdx => onAnswerChange(currentQuestionIndex, optIdx)}
              hidePassage={hasPassage}
              showInlineNumber
            />
          </div>
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <div className="bg-white border-t border-slate-200 px-4 py-3 pb-safe flex items-center justify-between shrink-0 z-20">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePrev}
          disabled={currentQuestionIndex === 0}
          className="h-12 w-12 rounded-full text-slate-500 hover:bg-slate-100"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>

        <Button
          variant="ghost"
          onClick={() => setIsNavOpen(true)}
          className="flex flex-col items-center gap-1 h-auto py-2 px-4 hover:bg-slate-100 rounded-xl"
        >
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-slate-900">{currentQuestionIndex + 1}</span>
            <span className="text-sm font-bold text-slate-400">/ {totalQuestions}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
            <LayoutGrid className="w-3 h-3" />
            View All
          </div>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleNext}
          disabled={currentQuestionIndex === totalQuestions - 1}
          className="h-12 w-12 rounded-full text-slate-500 hover:bg-slate-100"
        >
          <ChevronRight className="w-6 h-6" />
        </Button>
      </div>

      {/* Passage Sheet */}
      <BottomSheet
        isOpen={showPassage}
        onClose={() => setShowPassage(false)}
        height="full"
        title="Passage"
      >
        <div className="h-full overflow-y-auto bg-slate-50 p-4 rounded-xl">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-lg leading-loose font-serif">
            {currentQuestion?.passage && (
              <div dangerouslySetInnerHTML={{ __html: currentQuestion.passage }} />
            )}
            {!currentQuestion?.passage && (
              <div className="text-center text-slate-400 py-10">No passage for this question.</div>
            )}
          </div>
        </div>
      </BottomSheet>

      {/* Question Navigator */}
      <MobileQuestionNav
        totalQuestions={totalQuestions}
        currentQuestionIndex={currentQuestionIndex}
        userAnswers={userAnswers}
        onSelectQuestion={setCurrentQuestionIndex}
        isOpen={isNavOpen}
        onOpenChange={setIsNavOpen}
      />
    </div>
  );
};
