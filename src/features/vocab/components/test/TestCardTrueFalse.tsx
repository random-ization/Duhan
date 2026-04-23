import { Check, X } from 'lucide-react';
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
  prompt,
  statement,
  answered,
  mode = 'test',
  correctIsTrue,
  onSubmit,
}: Props) {
  const isReview = mode === 'review' && typeof correctIsTrue === 'boolean';

  const renderButton = (isTrue: boolean) => {
    const isSelected = answered?.isTrue === isTrue;
    const isCorrect = isReview && isTrue === correctIsTrue;
    const isWrongChoice = isReview && isSelected && isTrue !== correctIsTrue;
    const isCorrectNotSelected = isReview && isTrue === correctIsTrue && !isSelected;

    let containerClass = 'vt-test-option rounded-[1.2rem] py-5 flex flex-col items-center justify-center space-y-2.5 transition-all w-full';
    let iconClass = 'w-10 h-10 rounded-full flex items-center justify-center border transition-colors';
    let labelClass = 'font-black text-[14px] tracking-widest transition-colors';

    if (isSelected || (isReview && isCorrect)) {
        containerClass += ' selected';
    }

    if (isReview) {
        if (isCorrect && isSelected) {
            containerClass = 'rounded-[1.2rem] py-5 flex flex-col items-center justify-center space-y-2.5 bg-emerald-50 border-emerald-500 shadow-sm transition-all w-full';
            iconClass = 'w-10 h-10 rounded-full bg-emerald-500 text-white border-emerald-600 flex items-center justify-center';
            labelClass = 'font-black text-[14px] tracking-widest text-emerald-700';
        } else if (isWrongChoice) {
            containerClass = 'rounded-[1.2rem] py-5 flex flex-col items-center justify-center space-y-2.5 bg-rose-50 border-rose-500 shadow-sm transition-all w-full';
            iconClass = 'w-10 h-10 rounded-full bg-rose-500 text-white border-rose-600 flex items-center justify-center';
            labelClass = 'font-black text-[14px] tracking-widest text-rose-700';
        } else if (isCorrectNotSelected) {
            containerClass = 'rounded-[1.2rem] py-5 flex flex-col items-center justify-center space-y-2.5 border-dashed border-emerald-300 bg-emerald-50/30 transition-all w-full';
            iconClass = 'w-10 h-10 rounded-full bg-white text-emerald-500 border-emerald-200 flex items-center justify-center';
            labelClass = 'font-black text-[14px] tracking-widest text-emerald-600';
        } else {
            iconClass += ' bg-slate-50 text-slate-300 border-slate-100';
            labelClass += ' text-slate-300';
        }
    } else if (isSelected) {
        iconClass += ' bg-blue-100 text-blue-600 border-blue-200';
        labelClass += ' text-blue-700';
    } else {
        iconClass += ' bg-slate-100 text-slate-400 border-slate-200';
        labelClass += ' text-slate-600';
    }

    return (
      <Button
        variant="ghost"
        size="auto"
        type="button"
        disabled={isReview}
        onClick={() => onSubmit(isTrue)}
        className={containerClass}
      >
        <div className={iconClass}>
          {isTrue ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
        </div>
        <span className={labelClass}>{isTrue ? '正确' : '错误'}</span>
      </Button>
    );
  };

  return (
    <div className="flex flex-col">
      <div className="text-center mb-10">
        <p className="text-[11px] font-black text-slate-500 tracking-[0.2em] mb-4">判断释义是否匹配</p>
        <h4 className="text-5xl font-black text-slate-900 tracking-tight mb-5">{prompt}</h4>
        <div className="vt-inset-slot rounded-[1rem] py-3.5 px-6 inline-block">
          <span className="text-[15px] font-black text-slate-800 tracking-wide">{statement}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 option-group">
        {renderButton(true)}
        {renderButton(false)}
      </div>
    </div>
  );
}
