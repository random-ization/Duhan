import React from 'react';
import { clsx } from 'clsx';
import { TopikQuestion } from '../../../types';
import { sanitizeStrictHtml } from '../../../utils/sanitize';
import { Button } from '../../ui';

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
      <div className="bg-card rounded-2xl shadow-sm p-4 mb-4 border border-border shrink-0">
        <div className="flex items-start gap-3">
          <span className="bg-indigo-600 dark:bg-indigo-400/75 text-white w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 mt-0.5 shadow-sm shadow-indigo-200/80 dark:shadow-indigo-950/30">
            {question.number || '?'}
          </span>
          <div className="min-w-0 flex-1">
            <h2
              className="font-bold text-lg text-foreground leading-snug break-keep whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: sanitize(question.question) }}
            />
            {question.instruction && (
              <p className="text-muted-foreground text-xs mt-1 font-medium">
                {question.instruction}
              </p>
            )}
          </div>
        </div>

        {/* Optional Passage (for non-grouped questions like Q5-8) */}
        {showPassage && question.passage && (
          <div
            className="mt-4 bg-amber-50 dark:bg-amber-400/12 rounded-xl p-5 text-muted-foreground leading-8 text-base whitespace-pre-wrap border border-amber-100/50 dark:border-amber-300/20 font-serif break-keep text-justify"
            dangerouslySetInnerHTML={{ __html: sanitize(question.passage) }}
          />
        )}

        {/* Image Display */}
        {isImageQuestion && questionImage && (
          <div className="mt-4 bg-muted rounded-xl overflow-hidden border border-border relative aspect-[4/3] flex items-center justify-center group">
            <img
              src={questionImage}
              alt="Question Visual"
              className="w-full h-full object-contain"
            />
          </div>
        )}

        {/* Context Box (Example: <보기> or just reading text) */}
        {question.contextBox && (
          <div className="mt-4 bg-muted border border-border rounded-xl p-5 font-serif text-base leading-8 text-muted-foreground break-keep text-justify">
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
                <Button
                  variant="ghost"
                  size="auto"
                  key={idx}
                  onClick={() => onAnswerChange(idx)}
                  className={clsx(
                    'relative rounded-xl border-2 overflow-hidden aspect-[4/3] transition-all active:scale-[0.98] group',
                    isSelectedOption
                      ? 'border-indigo-600 dark:border-indigo-300 ring-2 ring-indigo-600 dark:ring-indigo-300 ring-offset-1'
                      : 'border-border hover:border-indigo-200 dark:hover:border-indigo-300/40'
                  )}
                >
                  <img
                    src={imgUrl}
                    alt={`Option ${idx + 1}`}
                    className="w-full h-full object-contain bg-card"
                  />
                  <div
                    className={clsx(
                      'absolute top-2 left-2 w-7 h-7 rounded-full font-bold flex items-center justify-center text-xs shadow-sm',
                      isSelectedOption
                        ? 'bg-indigo-600 dark:bg-indigo-400/80 text-white'
                        : 'bg-card/90 text-muted-foreground backdrop-blur-sm border border-border'
                    )}
                  >
                    {idx + 1}
                  </div>
                </Button>
              );
            })}
          </div>
        ) : (
          question.options.map((option: string, idx: number) => {
            const isSelectedOption = userAnswer === idx;

            return (
              <Button
                variant="ghost"
                size="auto"
                key={idx}
                onClick={() => onAnswerChange(idx)}
                className={clsx(
                  'w-full p-4 rounded-xl border-2 text-left active:scale-[0.99] transition-all group relative overflow-hidden',
                  isSelectedOption
                    ? 'border-indigo-600 dark:border-indigo-300 bg-indigo-50 dark:bg-indigo-500/15 shadow-md ring-1 ring-indigo-600 dark:ring-indigo-300'
                    : 'border-border bg-card hover:border-indigo-200 dark:hover:border-indigo-300/40'
                )}
              >
                <div className="flex items-start gap-4 relative z-10">
                  <span
                    className={clsx(
                      'w-7 h-7 rounded-full font-bold flex items-center justify-center text-xs shrink-0 transition-colors mt-0.5',
                      isSelectedOption
                        ? 'bg-indigo-600 dark:bg-indigo-400/80 text-white'
                        : 'bg-muted text-muted-foreground group-hover:bg-indigo-50 dark:group-hover:bg-indigo-400/12 group-hover:text-indigo-600 dark:group-hover:text-indigo-300'
                    )}
                  >
                    {idx + 1}
                  </span>
                  <span
                    className={clsx(
                      'text-base font-medium leading-relaxed',
                      isSelectedOption
                        ? 'text-indigo-900 dark:text-indigo-100'
                        : 'text-muted-foreground'
                    )}
                  >
                    {/* Use dangerouslySetInnerHTML for options too if they might have tags? Usually no, but to be sure... strictly options are strings. */}
                    {option}
                  </span>
                </div>
              </Button>
            );
          })
        )}
      </div>
    </div>
  );
};
