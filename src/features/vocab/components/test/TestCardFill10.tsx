import { useMemo, useState } from 'react';
import { Info, ChevronRight } from 'lucide-react';
import type { Language } from '../../../../types';
import { getLabels } from '../../../../utils/i18n';
import { KT } from '../../../../components/mobile/ksoft/ksoft';

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
  language,
  items,
  initialDirection,
  answered,
  mode = 'test',
  onSubmit,
}: Props) {
  const labels = getLabels(language);
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
      <div className="mb-4 text-center">
        <p style={{ marginBottom: 4, fontSize: 12, fontWeight: 800, color: KT.sub, letterSpacing: 0.5 }}>
          {labels.vocabTest?.fillPrompt || 'Complete the blanks'}
        </p>
        <p style={{ fontSize: 11, fontWeight: 700, color: KT.sub }}>
          {labels.vocabTest?.pickFromList || 'Pick from the list below'}
        </p>
      </div>

      <div className="relative grid grid-cols-2 gap-x-3 gap-y-2.5 pb-4">
        <div
          className="pointer-events-none absolute bottom-4 left-1/2 top-0 -translate-x-[1px]"
          style={{ borderLeft: `1px dashed ${KT.line2}` }}
        />

        <div className="flex flex-col space-y-3">
          {leftCol.map(item => {
            const pairNum = getPairNum('left', item.id);
            const isSelected = selectedLeft === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleKeyClick('left', item.id)}
                style={{
                  width: '100%',
                  minHeight: 54,
                  borderRadius: 14,
                  border:
                    pairNum != null
                      ? `1px solid ${KT.mintDeep}`
                      : isSelected
                        ? `1px solid ${KT.mintDeep}`
                        : `1px solid ${KT.line}`,
                  background: pairNum != null || isSelected ? `${KT.mint}55` : KT.card,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  padding: '0 8px',
                }}
              >
                <span style={{ fontSize: 16, fontWeight: 800, color: KT.ink }}>{item.text}</span>
                <div
                  style={{
                    position: 'absolute',
                    right: 6,
                    top: 6,
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    background: pairNum != null ? KT.mintDeep : 'transparent',
                    color: KT.card,
                    fontSize: 11,
                    fontWeight: 800,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  {pairNum ?? ''}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col space-y-3">
          {rightCol.map(item => {
            const pairNum = getPairNum('right', item.id);
            const isSelected = selectedRight === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleKeyClick('right', item.id)}
                style={{
                  width: '100%',
                  minHeight: 54,
                  borderRadius: 14,
                  border:
                    pairNum != null
                      ? `1px solid ${KT.mintDeep}`
                      : isSelected
                        ? `1px solid ${KT.mintDeep}`
                        : `1px solid ${KT.line}`,
                  background: pairNum != null || isSelected ? `${KT.mint}55` : KT.card,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  padding: '0 8px',
                }}
              >
                <span style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: KT.ink }}>
                  {item.text}
                </span>
                <div
                  style={{
                    position: 'absolute',
                    right: 6,
                    top: 6,
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    background: pairNum != null ? KT.mintDeep : 'transparent',
                    color: KT.card,
                    fontSize: 11,
                    fontWeight: 800,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  {pairNum ?? ''}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t pt-4" style={{ borderColor: KT.line }}>
        <div className="flex items-center space-x-2 text-[11px] font-bold" style={{ color: KT.sub }}>
          <Info className="h-3.5 w-3.5" />
          <span>
            {labels.vocabTest?.answered || 'Answered'}{' '}
            <span style={{ fontWeight: 900, color: KT.mintDeep }}>{progress}</span>/{items.length}
          </span>
        </div>

        {!isReview && (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isAllPaired}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              borderRadius: 12,
              padding: '10px 16px',
              fontSize: 13,
              fontWeight: 800,
              border: 'none',
              color: KT.card,
              background: KT.ink,
              opacity: isAllPaired ? 1 : 0.42,
            }}
          >
            <span>{labels.vocabTest?.nextQuestion || 'Next'}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
