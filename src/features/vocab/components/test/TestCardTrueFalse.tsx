import { Check, X } from 'lucide-react';
import { getLabels } from '../../../../utils/i18n';
import type { Language } from '../../../../types';
import { Button } from '../../../../components/ui';

type Answer = {
  isTrue: boolean;
};

type Mode = 'test' | 'review';

type Props = Readonly<{
  language: Language;
  prompt: string;
  statement: string;
  answered?: Answer;
  mode?: Mode;
  correctIsTrue?: boolean;
  onSubmit: (isTrue: boolean) => void;
}>;

export default function TestCardTrueFalse({
  language,
  prompt,
  statement,
  answered,
  mode = 'test',
  correctIsTrue,
  onSubmit,
}: Props) {
  const labels = getLabels(language);
  const trueLabel = labels.vocabTest?.trueLabel || 'True';
  const falseLabel = labels.vocabTest?.falseLabel || 'False';
  const isReview = mode === 'review' && typeof correctIsTrue === 'boolean';

  const renderButton = (isTrue: boolean) => {
    const isSelected = answered?.isTrue === isTrue;
    const base =
      'flex-1 h-14 rounded-2xl border-2 font-black text-lg flex items-center justify-center gap-2 transition-all';

    let className = base;

    if (isReview) {
      const isTheCorrectAnswer = correctIsTrue === isTrue;
      const isCorrectChoice = isSelected && isTheCorrectAnswer;
      const isWrongChoice = isSelected && !isTheCorrectAnswer;

      if (isCorrectChoice) {
        className += ' bg-green-500 border-green-600 text-white';
      } else if (isWrongChoice) {
        className += ' bg-red-500 border-red-600 text-white';
      } else if (isTheCorrectAnswer) {
        className += ' bg-green-50 border-green-300 text-green-700';
      } else {
        className += ' bg-card border-border text-muted-foreground';
      }
    } else if (isSelected) {
      className += ' bg-blue-600 border-blue-700 text-white';
    } else {
      className += ' bg-card border-border text-foreground hover:border-border';
    }

    return (
      <Button
        variant="ghost"
        size="auto"
        type="button"
        disabled={isReview}
        onClick={() => onSubmit(isTrue)}
        className={className}
      >
        {isReview && correctIsTrue === isTrue ? <Check className="w-5 h-5" /> : null}
        {isReview && isSelected && correctIsTrue !== isTrue ? <X className="w-5 h-5" /> : null}
        {isTrue ? trueLabel : falseLabel}
      </Button>
    );
  };

  return (
    <div className="mt-6">
      <div className="bg-card rounded-3xl border-2 border-border overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2">
          <div className="p-6 sm:p-8 border-b sm:border-b-0 sm:border-r border-border">
            <div className="text-xs font-black text-muted-foreground">
              {labels.vocabTest?.definitionLabel || 'Definition'}
            </div>
            <div className="mt-3 text-3xl font-black text-foreground leading-tight">
              {statement}
            </div>
          </div>
          <div className="p-6 sm:p-8">
            <div className="text-xs font-black text-muted-foreground">
              {labels.vocabTest?.termLabel || 'Term'}
            </div>
            <div className="mt-3 text-3xl font-black text-foreground leading-tight">{prompt}</div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-4">
        {renderButton(true)}
        {renderButton(false)}
      </div>
    </div>
  );
}
