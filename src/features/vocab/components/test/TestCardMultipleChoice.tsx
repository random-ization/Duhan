import { Button } from '../../../../components/ui';
import type { Language } from '../../../../types';

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
  const isCorrectChoice = isReview && isSelected && isCorrect;
  const isWrongChoice = isReview && isSelected && !isCorrect;
  const isCorrectNotSelected = isReview && isCorrect && !isSelected;

  let containerClass = 'vt-test-option w-full rounded-[1.2rem] py-4 px-5 flex items-center justify-between group transition-all';
  let letterClass = 'w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-[11px] font-black transition-colors';
  let labelClass = 'font-bold text-[15px] tracking-wide transition-colors';

  if (isSelected || isCorrectChoice) {
    containerClass += ' selected';
  }

  // Handle Review colors override
  if (isReview) {
    if (isCorrectChoice) {
      containerClass = 'w-full rounded-[1.2rem] py-4 px-5 flex items-center justify-between bg-emerald-50 border-emerald-500 shadow-sm transition-all';
      labelClass = 'option-label font-bold text-[15px] tracking-wide text-emerald-700';
      letterClass = 'option-letter w-7 h-7 rounded-full bg-emerald-500 border-emerald-600 flex items-center justify-center text-[11px] font-black text-white';
    } else if (isWrongChoice) {
      containerClass = 'w-full rounded-[1.2rem] py-4 px-5 flex items-center justify-between bg-rose-50 border-rose-500 shadow-sm transition-all';
      labelClass = 'option-label font-bold text-[15px] tracking-wide text-rose-700';
      letterClass = 'option-letter w-7 h-7 rounded-full bg-rose-500 border-rose-600 flex items-center justify-center text-[11px] font-black text-white';
    } else if (isCorrectNotSelected) {
      containerClass = 'w-full rounded-[1.2rem] py-4 px-5 flex items-center justify-between border-dashed border-emerald-300 bg-emerald-50/30 transition-all';
      labelClass = 'option-label font-bold text-[15px] tracking-wide text-emerald-600';
      letterClass = 'option-letter w-7 h-7 rounded-full border border-emerald-300 flex items-center justify-center text-[11px] font-black text-emerald-500';
    } else {
      labelClass += ' option-label text-slate-400';
      letterClass += ' option-letter text-slate-300 bg-slate-50';
    }
  } else if (isSelected) {
    labelClass += ' option-label';
    letterClass += ' option-letter';
  } else {
    labelClass += ' option-label text-slate-700';
    letterClass += ' option-letter text-slate-400 bg-white';
  }

  const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

  return (
    <Button
      variant="ghost"
      size="auto"
      type="button"
      disabled={isReview}
      onClick={() => onSelect(idx)}
      className={containerClass}
    >
      <span className={labelClass}>{opt}</span>
      <span className={letterClass}>{letters[idx] || '?'}</span>
    </Button>
  );
};

export default function TestCardMultipleChoice({
  prompt,
  options,
  answered,
  mode = 'test',
  correctIndex,
  onSubmit,
}: Props) {
  const isReview = mode === 'review' && typeof correctIndex === 'number';

  return (
    <div className="flex flex-col">
      <div className="text-center mb-8">
        <p className="text-[11px] font-black text-slate-500 tracking-[0.2em] mb-4">选择正确的含义</p>
        <h4 className="text-5xl font-black text-slate-900 tracking-tight">{prompt}</h4>
      </div>

      <div className="space-y-3.5">
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

