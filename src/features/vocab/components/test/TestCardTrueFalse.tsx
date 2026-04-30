import type { ReactNode } from 'react';
import { Check, X } from 'lucide-react';
import type { Language } from '../../../../types';
import { getLabels } from '../../../../utils/i18n';
import { KT } from '../../../../components/mobile/ksoft/ksoft';

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

function TruthButton({
  label,
  active,
  isReview,
  isCorrect,
  isWrong,
  onClick,
  icon,
}: Readonly<{
  label: string;
  active: boolean;
  isReview: boolean;
  isCorrect: boolean;
  isWrong: boolean;
  onClick: () => void;
  icon: ReactNode;
}>) {
  let border: string = `1px solid ${KT.line}`;
  let background: string = KT.card;
  let textColor: string = KT.ink;
  let iconBg: string = KT.bg2;
  let iconColor: string = KT.sub;

  if (active && !isReview) {
    border = `1px solid ${KT.mintDeep}`;
    background = `${KT.mint}66`;
    iconBg = KT.mintDeep;
    iconColor = KT.card;
    textColor = KT.mintDeep;
  }

  if (isCorrect) {
    border = `2px solid ${KT.mintDeep}`;
    background = `${KT.mint}66`;
    iconBg = KT.mintDeep;
    iconColor = KT.card;
    textColor = KT.mintDeep;
  } else if (isWrong) {
    border = `2px solid ${KT.pinkDeep}`;
    background = `${KT.pink}66`;
    iconBg = KT.pinkDeep;
    iconColor = KT.card;
    textColor = KT.pinkDeep;
  }

  return (
    <button
      type="button"
      disabled={isReview}
      onClick={onClick}
      style={{
        minHeight: 92,
        borderRadius: 18,
        border,
        background,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}
    >
      <span
        style={{
          width: 34,
          height: 34,
          borderRadius: 17,
          background: iconBg,
          color: iconColor,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        {icon}
      </span>
      <span style={{ fontSize: 15, fontWeight: 800, color: textColor }}>{label}</span>
    </button>
  );
}

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
  const isReview = mode === 'review' && typeof correctIsTrue === 'boolean';
  const trueLabel = labels.vocabTest?.trueLabel || 'True';
  const falseLabel = labels.vocabTest?.falseLabel || 'False';
  const title =
    labels.vocabTest?.trueFalseTitle ||
    labels.vocabTest?.questionTypeTrueFalse ||
    'True / False';

  return (
    <div className="flex flex-col">
      <div style={{ marginBottom: 14 }}>
        <p style={{ marginBottom: 8, fontSize: 12, fontWeight: 800, color: KT.sub, letterSpacing: 0.5 }}>
          {title}
        </p>
        <h4 style={{ fontSize: 44, fontWeight: 900, color: KT.ink, lineHeight: 1.08 }}>{prompt}</h4>
      </div>

      <div
        style={{
          marginBottom: 16,
          borderRadius: 18,
          border: `1px solid ${KT.line}`,
          background: KT.bg2,
          padding: '12px 14px',
          fontSize: 16,
          fontWeight: 700,
          color: KT.ink,
        }}
      >
        {statement}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TruthButton
          label={trueLabel}
          active={answered?.isTrue === true}
          isReview={isReview}
          isCorrect={isReview && correctIsTrue === true}
          isWrong={isReview && answered?.isTrue === true && correctIsTrue === false}
          onClick={() => onSubmit(true)}
          icon={<Check size={18} />}
        />
        <TruthButton
          label={falseLabel}
          active={answered?.isTrue === false}
          isReview={isReview}
          isCorrect={isReview && correctIsTrue === false}
          isWrong={isReview && answered?.isTrue === false && correctIsTrue === true}
          onClick={() => onSubmit(false)}
          icon={<X size={18} />}
        />
      </div>
    </div>
  );
}
