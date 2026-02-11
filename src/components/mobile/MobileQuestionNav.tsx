import React from 'react';
import { BottomSheet } from '../common/BottomSheet';
import { cn } from '../../lib/utils';

interface MobileQuestionNavProps {
  totalQuestions: number;
  currentQuestionIndex: number;
  userAnswers: Record<number, number>;
  onSelectQuestion: (index: number) => void;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MobileQuestionNav: React.FC<MobileQuestionNavProps> = ({
  totalQuestions,
  currentQuestionIndex,
  userAnswers,
  onSelectQuestion,
  isOpen,
  onOpenChange,
}) => {
  // Generate question indices
  const questions = Array.from({ length: totalQuestions }, (_, i) => i);

  // BottomSheet uses onClose which takes void, but onOpenChange takes boolean.
  // We can bridge them.
  const handleClose = () => onOpenChange(false);

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} height="half" title="Question Navigator">
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto pb-4">
          <div className="grid grid-cols-5 gap-3">
            {questions.map(index => {
              const isAnswered = userAnswers[index] !== undefined;
              const isCurrent = currentQuestionIndex === index;

              return (
                <button
                  key={index}
                  onClick={() => {
                    onSelectQuestion(index);
                    handleClose();
                  }}
                  className={cn(
                    'aspect-square rounded-xl flex flex-col items-center justify-center relative transition-all',
                    isCurrent
                      ? 'bg-slate-900 text-white shadow-lg scale-110 z-10'
                      : isAnswered
                        ? 'bg-indigo-50 text-indigo-700 border-2 border-indigo-200'
                        : 'bg-slate-50 text-slate-400 border border-slate-200 hover:bg-slate-100'
                  )}
                >
                  <span
                    className={cn('text-sm font-bold', isCurrent ? 'text-white' : 'text-inherit')}
                  >
                    {index + 1}
                  </span>
                  {isAnswered && !isCurrent && (
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 bg-white">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-900" />
              <span>Current</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-indigo-100 border border-indigo-300" />
              <span>Answered</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-50 border border-slate-200" />
              <span>To do</span>
            </div>
          </div>
        </div>
      </div>
    </BottomSheet>
  );
};
