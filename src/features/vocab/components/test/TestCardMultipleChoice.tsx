import { Check, X } from 'lucide-react';
import { getLabels } from '../../../../utils/i18n';
import type { Language } from '../../../../types';
import { Button } from '../../../../components/ui';

type Answer = {
  selectedIndex: number;
};

type Mode = 'test' | 'review';

type Props = Readonly<{
  language: Language;
  prompt: string;
  options: string[];
  answered?: Answer;
  mode?: Mode;
  correctIndex?: number;
  onSubmit: (selectedIndex: number) => void;
}>;

const OptionButton = ({
  opt,
  idx,
  isSelected,
  isReview,
  correctIndex,
  onSelect,
}: {
  opt: string;
  idx: number;
  isSelected: boolean;
  isReview: boolean;
  correctIndex?: number;
  onSelect: (idx: number) => void;
}) => {
  const isCorrect = idx === correctIndex;
  const isCorrectChoice = isSelected && isCorrect;
  const isWrongChoice = isSelected && !isCorrect;

  const base =
    'w-full rounded-2xl border-2 px-4 py-4 text-left font-black transition-all flex items-center justify-between gap-3';

  let className = base;

  if (isReview) {
    if (isCorrectChoice) {
      className += ' bg-green-500 border-green-600 text-white';
    } else if (isWrongChoice) {
      className += ' bg-red-500 border-red-600 text-white';
    } else if (isCorrect) {
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
      onClick={() => onSelect(idx)}
      className={className}
    >
      <span className="min-w-0 truncate">{opt}</span>
      {isReview && isCorrect ? <Check className="w-5 h-5 shrink-0" /> : null}
      {isReview && isWrongChoice ? <X className="w-5 h-5 shrink-0" /> : null}
    </Button>
  );
};

export default function TestCardMultipleChoice({
  language,
  prompt,
  options,
  answered,
  mode = 'test',
  correctIndex,
  onSubmit,
}: Props) {
  const labels = getLabels(language);
  const isReview = mode === 'review' && typeof correctIndex === 'number';
  return (
    <div className="mt-6">
      <div className="text-xs font-black text-muted-foreground">
        {labels.vocabTest?.chooseAnswer || 'Choose an answer'}
      </div>
      <div className="text-3xl font-black text-foreground mt-3">{prompt}</div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((opt, idx) => (
          <OptionButton
            key={`${opt}-${idx}`}
            idx={idx}
            opt={opt}
            isSelected={answered?.selectedIndex === idx}
            isReview={isReview}
            correctIndex={correctIndex}
            onSelect={onSubmit}
          />
        ))}
      </div>
    </div>
  );
}
