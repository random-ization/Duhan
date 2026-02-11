import React from 'react';
import { clsx } from 'clsx';
import { TopikQuestion } from '../../../types';
import { sanitizeStrictHtml } from '../../../utils/sanitize';

interface MobileQuestionRendererProps {
  question: TopikQuestion;
  userAnswer?: number;
  onAnswerChange: (optionIndex: number) => void;
}

export const MobileQuestionRenderer: React.FC<
  MobileQuestionRendererProps & { showPassage?: boolean }
> = ({ question, userAnswer, onAnswerChange, showPassage = false }) => {
  const sanitize = (html?: string) => sanitizeStrictHtml(String(html ?? ''));
  // Check both imageUrl and image (legacy/alias)
  const questionImage = question.imageUrl || question.image;
  const isImageQuestion = question.layout === 'IMAGE' || !!questionImage;

  return (
    <div className="flex flex-col h-full">
      {/* Question Header / Prompts */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 border border-slate-200 shrink-0">
        <div className="flex items-start gap-3">
          <span className="bg-indigo-600 text-white w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 mt-0.5 shadow-sm shadow-indigo-200">
            {question.number || '?'}
          </span>
          <div className="min-w-0 flex-1">
            <h2
              className="font-bold text-lg text-slate-900 leading-snug break-keep whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: sanitize(question.question) }}
            />
            {question.instruction && (
              <p className="text-slate-500 text-xs mt-1 font-medium">{question.instruction}</p>
            )}
          </div>
        </div>

        {/* Optional Passage (for non-grouped questions like Q5-8) */}
        {showPassage && question.passage && (
          <div
            className="mt-4 bg-amber-50 rounded-xl p-5 text-slate-800 leading-8 text-base whitespace-pre-wrap border border-amber-100/50 font-serif break-keep text-justify"
            dangerouslySetInnerHTML={{ __html: sanitize(question.passage) }}
          />
        )}

        {/* Image Display */}
        {isImageQuestion && questionImage && (
          <div className="mt-4 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 relative aspect-[4/3] flex items-center justify-center group">
            <img
              src={questionImage}
              alt="Question Visual"
              className="w-full h-full object-contain"
            />
          </div>
        )}

        {/* Context Box (Example: <보기> or just reading text) */}
        {question.contextBox && (
          <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-5 font-serif text-base leading-8 text-slate-800 break-keep text-justify">
            {question.contextBox.includes('<보기>')
              ? null
              : // Only show <보기> if it's explicitly needed or maybe just let the text handle it?
                // Usually "Bo-gi" is part of the box title.
                // If we want to be safe, let's just render the content nicely.
                // But wait, some questions might rely on "Bo-gi" context.
                // Actually, standard TOPIK Q5-8 text is just text.
                // Let's remove the hardcoded label and assume content is sufficient.
                null}
            <div
              className="whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: sanitize(question.contextBox) }}
            />
          </div>
        )}
      </div>

      {/* Choices Area */}
      <div className="space-y-3 pb-8">
        {question.optionImages && question.optionImages.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {question.optionImages.map((imgUrl, idx) => {
              const isSelectedOption = userAnswer === idx;
              return (
                <button
                  key={idx}
                  onClick={() => onAnswerChange(idx)}
                  className={clsx(
                    'relative rounded-xl border-2 overflow-hidden aspect-[4/3] transition-all active:scale-[0.98] group',
                    isSelectedOption
                      ? 'border-indigo-600 ring-2 ring-indigo-600 ring-offset-1'
                      : 'border-slate-200 hover:border-indigo-200'
                  )}
                >
                  <img
                    src={imgUrl}
                    alt={`Option ${idx + 1}`}
                    className="w-full h-full object-contain bg-white"
                  />
                  <div
                    className={clsx(
                      'absolute top-2 left-2 w-7 h-7 rounded-full font-bold flex items-center justify-center text-xs shadow-sm',
                      isSelectedOption
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white/90 text-slate-600 backdrop-blur-sm border border-slate-200'
                    )}
                  >
                    {idx + 1}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          question.options.map((option: string, idx: number) => {
            const isSelectedOption = userAnswer === idx;

            return (
              <button
                key={idx}
                onClick={() => onAnswerChange(idx)}
                className={clsx(
                  'w-full p-4 rounded-xl border-2 text-left active:scale-[0.99] transition-all group relative overflow-hidden',
                  isSelectedOption
                    ? 'border-indigo-600 bg-indigo-50 shadow-md ring-1 ring-indigo-600'
                    : 'border-slate-200 bg-white hover:border-indigo-200'
                )}
              >
                <div className="flex items-start gap-4 relative z-10">
                  <span
                    className={clsx(
                      'w-7 h-7 rounded-full font-bold flex items-center justify-center text-xs shrink-0 transition-colors mt-0.5',
                      isSelectedOption
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                    )}
                  >
                    {idx + 1}
                  </span>
                  <span
                    className={clsx(
                      'text-base font-medium leading-relaxed',
                      isSelectedOption ? 'text-indigo-900' : 'text-slate-700'
                    )}
                  >
                    {/* Use dangerouslySetInnerHTML for options too if they might have tags? Usually no, but to be sure... strictly options are strings. */}
                    {option}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
