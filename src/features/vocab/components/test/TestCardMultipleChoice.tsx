import { Check } from 'lucide-react';
import type { Language } from '../../../../types';
import { getLabels } from '../../../../utils/i18n';
import { KT } from '../../../../components/mobile/ksoft/ksoft';

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

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

function OptionButton({
  text,
  idx,
  isSelected,
  isReview,
  correctIndex,
  onSelect,
}: Readonly<{
  text: string;
  idx: number;
  isSelected: boolean;
  isReview: boolean;
  correctIndex?: number;
  onSelect: (index: number) => void;
}>) {
  const isCorrect = typeof correctIndex === 'number' && idx === correctIndex;
  const showCorrect = isReview && isCorrect;
  const showWrong = isReview && isSelected && !isCorrect;

  let border: string = `1px solid ${KT.line}`;
  let background: string = KT.card;
  let letterBg: string = KT.bg2;
  let letterColor: string = KT.ink;
  let textColor: string = KT.ink;
  let iconColor: string = 'transparent';

  if (isSelected && !isReview) {
    border = `1px solid ${KT.mintDeep}`;
    background = `${KT.mint}66`;
    letterBg = KT.mintDeep;
    letterColor = KT.card;
  }

  if (showCorrect) {
    border = `2px solid ${KT.mintDeep}`;
    background = `${KT.mint}66`;
    letterBg = KT.mintDeep;
    letterColor = KT.card;
    iconColor = KT.mintDeep;
  } else if (showWrong) {
    border = `2px solid ${KT.pinkDeep}`;
    background = `${KT.pink}66`;
    letterBg = KT.pinkDeep;
    letterColor = KT.card;
    textColor = KT.pinkDeep;
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(idx)}
      disabled={isReview}
      style={{
        width: '100%',
        minHeight: 66,
        borderRadius: 18,
        border,
        background,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        textAlign: 'left',
      }}
    >
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          background: letterBg,
          color: letterColor,
          fontSize: 22,
          fontFamily: KT.serif,
          fontWeight: 600,
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        {LETTERS[idx] || '?'}
      </span>
      <span style={{ flex: 1, color: textColor, fontSize: 16, fontWeight: 800 }}>{text}</span>
      <Check size={18} color={iconColor} />
    </button>
  );
}

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
    <div className="flex flex-col">
      <div style={{ marginBottom: 14 }}>
        <p style={{ marginBottom: 8, fontSize: 12, fontWeight: 800, color: KT.sub, letterSpacing: 0.5 }}>
          {labels.vocabTest?.chooseAnswer || 'Choose an answer'}
        </p>
        <h4 style={{ fontSize: 44, fontWeight: 900, color: KT.ink, lineHeight: 1.08 }}>{prompt}</h4>
      </div>

      <div className="space-y-3">
        {options.map((opt, idx) => (
          <OptionButton
            key={`${idx}-${opt}`}
            idx={idx}
            text={opt}
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
