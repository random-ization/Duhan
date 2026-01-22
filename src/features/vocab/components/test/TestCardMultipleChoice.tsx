import React from 'react';
import { Check, X } from 'lucide-react';
import type { Language } from '../../../../types';

type Answer = {
  selectedIndex: number;
};

type Mode = 'test' | 'review';

type Props = {
  language: Language;
  prompt: string;
  options: string[];
  answered?: Answer;
  mode?: Mode;
  correctIndex?: number;
  onSubmit: (selectedIndex: number) => void;
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
  const isReview = mode === 'review' && typeof correctIndex === 'number';
  return (
    <div className="mt-6">
      <div className="text-xs font-black text-slate-400">
        {language === 'zh' ? '选择答案' : 'Choose an answer'}
      </div>
      <div className="text-3xl font-black text-slate-900 mt-3">{prompt}</div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((opt, idx) => {
          const isSelected = answered?.selectedIndex === idx;

          const base =
            'w-full rounded-2xl border-2 px-4 py-4 text-left font-black transition-all flex items-center justify-between gap-3';
          const classes = isReview
            ? (() => {
                const isCorrect = idx === correctIndex;
                const isCorrectChoice = isSelected && isCorrect;
                const isWrongChoice = isSelected && !isCorrect;
                if (isCorrectChoice) return `${base} bg-green-500 border-green-600 text-white`;
                if (isWrongChoice) return `${base} bg-red-500 border-red-600 text-white`;
                if (isCorrect) return `${base} bg-green-50 border-green-300 text-green-700`;
                return `${base} bg-white border-slate-200 text-slate-600`;
              })()
            : answered
              ? isSelected
                ? `${base} bg-blue-600 border-blue-700 text-white`
                : `${base} bg-white border-slate-200 text-slate-500`
              : `${base} bg-white border-slate-200 text-slate-900 hover:border-slate-400`;

          return (
            <button
              key={idx}
              type="button"
              disabled={isReview}
              onClick={() => onSubmit(idx)}
              className={classes}
            >
              <span className="min-w-0 truncate">{opt}</span>
              {isReview && idx === correctIndex ? <Check className="w-5 h-5 shrink-0" /> : null}
              {isReview && isSelected && idx !== correctIndex ? (
                <X className="w-5 h-5 shrink-0" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
