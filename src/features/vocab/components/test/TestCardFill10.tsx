import { useMemo, useState } from 'react';
import { Info, ChevronRight } from 'lucide-react';
import type { Language } from '../../../../types';
import { Button } from '../../../../components/ui';

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

type PairSelection = Readonly<{
  leftId: string;
  rightId: string;
  pairNum: number;
}>;

type Props = Readonly<{
  language: Language;
  items: readonly Item[];
  initialDirection: Direction;
  answered?: Answer;
  mode?: Mode;
  onSubmit: (filled: string[], directionUsed: Direction) => void;
}>;

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function deterministicSort<T>(
  items: readonly T[],
  getKey: (item: T) => string,
  seed: string
): T[] {
  return [...items].sort((left, right) => {
    const leftKey = getKey(left);
    const rightKey = getKey(right);
    const leftHash = hashString(`${seed}:${leftKey}`);
    const rightHash = hashString(`${seed}:${rightKey}`);
    if (leftHash !== rightHash) {
      return leftHash - rightHash;
    }
    return leftKey.localeCompare(rightKey);
  });
}

function buildReviewPairs(answered: Answer | undefined, items: readonly Item[]): PairSelection[] {
  if (!answered) {
    return [];
  }

  return items.flatMap((item, index) => {
    const rightId = answered.filled[index];
    if (!rightId) {
      return [];
    }

    return [
      {
        leftId: item.wordId,
        rightId,
        pairNum: index + 1,
      },
    ];
  });
}

export default function TestCardFill10({
  items,
  initialDirection,
  answered,
  mode = 'test',
  onSubmit,
}: Props) {
  const isReview = mode === 'review' && !!answered;
  const direction = answered?.directionUsed || initialDirection;

  const leftCol = useMemo(
    () => items.map(item => ({ id: item.wordId, text: item.pair.korean })),
    [items]
  );
  const rightCol = useMemo(
    () =>
      deterministicSort(
        items.map(item => ({ id: item.wordId, text: item.pair.native })),
        item => item.id,
        `${direction}:right-column`
      ),
    [direction, items]
  );
  const reviewPairs = useMemo(() => buildReviewPairs(answered, items), [answered, items]);

  const [draftPairs, setDraftPairs] = useState<PairSelection[]>([]);
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [selectedRight, setSelectedRight] = useState<string | null>(null);

  const pairs = isReview ? reviewPairs : draftPairs;

  const handleKeyClick = (side: 'left' | 'right', id: string) => {
    if (isReview) return;

    const existingPair = pairs.find(pair => (side === 'left' ? pair.leftId === id : pair.rightId === id));
    if (existingPair) {
      setDraftPairs(prev => prev.filter(pair => pair.pairNum !== existingPair.pairNum));
      return;
    }

    if (side === 'left') {
      if (selectedRight) {
        setDraftPairs(prev => [
          ...prev,
          { leftId: id, rightId: selectedRight, pairNum: prev.length + 1 },
        ]);
        setSelectedLeft(null);
        setSelectedRight(null);
        return;
      }

      setSelectedLeft(prev => (prev === id ? null : id));
      return;
    }

    if (selectedLeft) {
      setDraftPairs(prev => [
        ...prev,
        { leftId: selectedLeft, rightId: id, pairNum: prev.length + 1 },
      ]);
      setSelectedLeft(null);
      setSelectedRight(null);
      return;
    }

    setSelectedRight(prev => (prev === id ? null : id));
  };

  const progress = pairs.length;
  const isAllPaired = progress === items.length;

  const handleSubmit = () => {
    const results = leftCol.map(leftItem => pairs.find(pair => pair.leftId === leftItem.id)?.rightId || '');
    onSubmit(results, direction);
  };

  const getPairNum = (side: 'left' | 'right', id: string) => {
    return pairs.find(pair => (side === 'left' ? pair.leftId === id : pair.rightId === id))?.pairNum;
  };

  return (
    <div className="flex flex-col">
      <div className="mb-6 text-center">
        <p className="mb-1 text-[11px] font-black tracking-[0.2em] text-slate-500">十选一配对</p>
        <p className="text-[10px] font-bold tracking-widest text-slate-400">
          请将左侧韩语与右侧释义一一对应
        </p>
      </div>

      <div className="relative grid grid-cols-2 gap-x-4 gap-y-3 pb-6">
        <div className="pointer-events-none absolute bottom-6 left-1/2 top-0 -translate-x-[1px] border-l-2 border-dashed border-slate-200" />

        <div className="flex flex-col space-y-3">
          {leftCol.map(item => {
            const pairNum = getPairNum('left', item.id);
            const isSelected = selectedLeft === item.id;

            return (
              <Button
                variant="ghost"
                size="auto"
                key={item.id}
                type="button"
                onClick={() => handleKeyClick('left', item.id)}
                className={`vt-match-key w-full rounded-xl px-2 py-3.5 flex items-center justify-center transition-all ${isSelected ? 'selected' : ''} ${pairNum ? 'paired hover:bg-[#F1F5F9]' : 'hover:bg-gradient-to-b hover:from-white hover:to-[#F8F9FA]'}`}
              >
                <span className="text-[15px] font-black tracking-wide">{item.text}</span>
                <div
                  className={`absolute right-0 top-0 rounded-bl-lg bg-blue-500 px-1.5 py-0.5 text-[10px] font-black text-white shadow-sm transition-all duration-200 ${pairNum ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}
                >
                  {pairNum || ''}
                </div>
              </Button>
            );
          })}
        </div>

        <div className="flex flex-col space-y-3">
          {rightCol.map(item => {
            const pairNum = getPairNum('right', item.id);
            const isSelected = selectedRight === item.id;

            return (
              <Button
                variant="ghost"
                size="auto"
                key={item.id}
                type="button"
                onClick={() => handleKeyClick('right', item.id)}
                className={`vt-match-key w-full rounded-xl px-2 py-3.5 flex items-center justify-center transition-all ${isSelected ? 'selected' : ''} ${pairNum ? 'paired hover:bg-[#F1F5F9]' : 'hover:bg-gradient-to-b hover:from-white hover:to-[#F8F9FA]'}`}
              >
                <span className="text-center text-[14px] font-bold tracking-wide text-slate-700">
                  {item.text}
                </span>
                <div
                  className={`absolute right-0 top-0 rounded-bl-lg bg-blue-500 px-1.5 py-0.5 text-[10px] font-black text-white shadow-sm transition-all duration-200 ${pairNum ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}
                >
                  {pairNum || ''}
                </div>
              </Button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-5">
        <div className="flex items-center space-x-2 text-[11px] font-bold text-slate-400">
          <Info className="h-3.5 w-3.5" />
          <span>
            已连线 <span className="font-black text-blue-600">{progress}</span>/{items.length}
          </span>
        </div>

        {!isReview && (
          <Button
            variant="ghost"
            size="auto"
            type="button"
            onClick={handleSubmit}
            disabled={!isAllPaired}
            className={`disable-hover-state flex items-center space-x-1.5 rounded-xl px-6 py-3 text-[13px] font-black tracking-widest text-white shadow-[0_4px_12px_rgba(0,0,0,0.2)] transition-all active:scale-95 ${isAllPaired ? 'bg-blue-600 hover:bg-blue-600 hover:text-white' : 'pointer-events-none bg-slate-900 opacity-40 hover:bg-slate-900'}`}
          >
            <span>下一题</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
