import React, { useMemo, useState } from 'react';
import { Check, RefreshCw } from 'lucide-react';
import type { Language } from '../../../../types';

type Pair = { korean: string; native: string };

type Item = {
  wordId: string;
  pair: Pair;
};

type Answer = {
  filled: string[];
  directionUsed: Direction;
};

type Direction = 'KR_TO_NATIVE' | 'NATIVE_TO_KR';

type Mode = 'test' | 'review';

type Props = Readonly<{
  language: Language;
  items: Item[];
  initialDirection: Direction;
  answered?: Answer;
  mode?: Mode;
  onSubmit: (filled: string[], directionUsed: Direction) => void;
}>;

const shuffleArray = <T,>(array: T[]): T[] => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const FillSlot = ({
  idx,
  val,
  isTarget,
  isReview,
  isCorrect,
  answer,
  language,
  onClear,
  onSelect,
}: {
  idx: number;
  val: string;
  isTarget: boolean;
  isReview: boolean;
  isCorrect: boolean | null;
  answer: string;
  language: Language;
  onClear: (idx: number) => void;
  onSelect: (idx: number) => void;
}) => {
  const label = val || (language === 'zh' ? '未作答' : '—');

  let className =
    'w-full h-14 rounded-2xl border-2 px-4 text-left font-black transition-all';
  if (isReview) {
    className += isCorrect
      ? ' bg-green-50 border-green-300 text-green-800'
      : ' bg-red-50 border-red-300 text-red-800';
  } else if (val) {
    className += ' bg-slate-50 border-slate-300 text-slate-900 hover:border-slate-400';
  } else if (isTarget) {
    className += ' bg-blue-50 border-blue-300 text-blue-800';
  } else {
    className += ' bg-white border-slate-200 text-slate-400 hover:border-slate-400';
  }

  return (
    <div className="w-full">
      <button
        type="button"
        disabled={isReview}
        onClick={() => (val ? onClear(idx) : onSelect(idx))}
        className={className}
      >
        {label}
      </button>
      {isReview && !isCorrect ? (
        <div className="mt-1 text-xs text-slate-500 font-bold">
          {language === 'zh' ? '正确答案：' : 'Answer: '}
          <span className="font-black text-slate-900">{answer}</span>
        </div>
      ) : null}
    </div>
  );
};

export default function TestCardFill10({
  language,
  items,
  initialDirection,
  answered,
  mode = 'test',
  onSubmit,
}: Props) {
  const isReview = mode === 'review' && !!answered;
  const [direction, setDirection] = useState<Direction>(
    answered?.directionUsed || initialDirection
  );
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const derived = useMemo(() => {
    const prompts = items.map(it =>
      direction === 'KR_TO_NATIVE' ? it.pair.korean : it.pair.native
    );
    const answers = items.map(it =>
      direction === 'KR_TO_NATIVE' ? it.pair.native : it.pair.korean
    );
    return { prompts, answers };
  }, [direction, items]);

  const [filled, setFilled] = useState<string[]>(() =>
    answered?.filled?.length === items.length
      ? answered.filled
      : new Array(items.length).fill('')
  );
  const [optionPool, setOptionPool] = useState<string[]>(() => {
    const used =
      answered?.filled?.length === items.length
        ? answered.filled.filter(v => v.trim().length > 0)
        : [];
    return shuffleArray(derived.answers).filter(o => !used.includes(o));
  });

  const isComplete = filled.every(v => v.trim().length > 0);

  const reset = () => {
    if (isReview) return;
    setFilled(new Array(items.length).fill(''));
    setOptionPool(shuffleArray(derived.answers));
    setActiveIndex(null);
  };

  const toggleDirection = () => {
    if (isReview) return;
    const nextDirection = direction === 'KR_TO_NATIVE' ? 'NATIVE_TO_KR' : 'KR_TO_NATIVE';
    setDirection(nextDirection);
    setFilled(new Array(items.length).fill(''));
    setOptionPool(
      shuffleArray(
        items.map(it => (nextDirection === 'KR_TO_NATIVE' ? it.pair.native : it.pair.korean))
      )
    );
    setActiveIndex(null);
  };

  const takeOption = (opt: string) => {
    if (isReview) return;
    const targetIndex = activeIndex ?? filled.findIndex(v => v.trim().length === 0);
    if (targetIndex < 0) return;
    if (filled[targetIndex]) return;

    setFilled(prev => {
      const next = [...prev];
      next[targetIndex] = opt;
      return next;
    });
    setOptionPool(prev => prev.filter(o => o !== opt));
    const nextEmpty = filled.findIndex((v, i) => i !== targetIndex && v.trim().length === 0);
    setActiveIndex(nextEmpty >= 0 ? nextEmpty : null);
  };

  const clearSlot = (index: number) => {
    if (isReview) return;
    const current = filled[index];
    if (!current) return;
    setFilled(prev => {
      const next = [...prev];
      next[index] = '';
      return next;
    });
    setOptionPool(prev => shuffleArray([...prev, current]));
    setActiveIndex(index);
  };

  const submit = () => {
    if (isReview || !isComplete) return;
    onSubmit(filled, direction);
  };

  const switchKR = language === 'zh' ? '切换到韩语' : 'Switch to Korean';
  const switchNative = language === 'zh' ? '切换到母语' : 'Switch to Native';
  const switchLabel = direction === 'KR_TO_NATIVE' ? switchKR : switchNative;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-black text-slate-400">
          {language === 'zh' ? '从下方列表中选择' : 'Pick from the list below'}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleDirection}
            disabled={isReview}
            className="px-3 py-2 rounded-xl bg-white border-2 border-slate-200 font-black text-sm text-slate-700 disabled:opacity-50"
          >
            {switchLabel}
          </button>
          <button
            type="button"
            onClick={reset}
            disabled={isReview}
            className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center disabled:opacity-50"
            aria-label={language === 'zh' ? '重置' : 'Reset'}
          >
            <RefreshCw className="w-5 h-5 text-slate-700" />
          </button>
        </div>
      </div>

      <div className="mt-4 bg-white rounded-3xl border-2 border-slate-200 overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-[1.1fr_1px_1fr]">
          <div className="p-6 sm:p-8 space-y-3">
            {items.map((it, idx) => (
              <FillSlot
                key={`${it.wordId}-${it.pair.korean}-${idx}`}
                idx={idx}
                val={filled[idx]}
                isTarget={activeIndex === idx}
                isReview={isReview}
                isCorrect={
                  isReview
                    ? filled[idx].trim() === (derived.answers[idx] || '').trim()
                    : null
                }
                answer={derived.answers[idx] || ''}
                language={language}
                onClear={clearSlot}
                onSelect={setActiveIndex}
              />
            ))}
          </div>

          <div className="hidden sm:block bg-slate-200" />

          <div className="p-6 sm:p-8 space-y-3">
            {derived.prompts.map((p, idx) => (
              <div key={`prompt-${p}-${idx}`} className="h-14 flex items-center">
                <div className="text-xl font-black text-slate-900 truncate">{p}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isReview ? null : (
        <>
          <div className="mt-6 flex flex-wrap gap-2">
            {optionPool.map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => takeOption(opt)}
                className="px-4 py-3 rounded-2xl bg-white border-2 border-slate-200 font-black text-slate-900 hover:border-slate-400"
              >
                {opt}
              </button>
            ))}
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={submit}
              disabled={!isComplete}
              className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl bg-slate-900 text-white font-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-5 h-5" />
              {language === 'zh' ? '确认本卡' : 'Confirm'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
