import { useEffect, useState } from 'react';
import { Check, Keyboard, X } from 'lucide-react';
import type { Language } from '../../../../types';
import { getLabels } from '../../../../utils/i18n';
import { KT } from '../../../../components/mobile/ksoft/ksoft';

type Answer = {
  input: string;
};

type Mode = 'test' | 'review';

type Props = Readonly<{
  language: Language;
  prompt: string;
  answered?: Answer;
  mode?: Mode;
  correctAnswer?: string;
  onSubmit: (input: string) => void;
}>;

const normalizeText = (s: string) => s.trim().replaceAll(/\s+/g, ' ').toLowerCase();

export default function TestCardWritten({
  language,
  prompt,
  answered,
  mode = 'test',
  correctAnswer,
  onSubmit,
}: Props) {
  const labels = getLabels(language);
  const [input, setInput] = useState(() => answered?.input ?? '');
  const isReview = mode === 'review' && typeof correctAnswer === 'string';
  const isCorrectReview =
    isReview && correctAnswer ? normalizeText(input) === normalizeText(correctAnswer) : null;

  useEffect(() => {
    const nextValue = answered?.input ?? '';
    const schedule =
      typeof globalThis.queueMicrotask === 'function'
        ? globalThis.queueMicrotask
        : (callback: () => void) => {
            globalThis.setTimeout(callback, 0);
          };
    schedule(() => setInput(nextValue));
  }, [answered?.input]);

  const submit = () => {
    const value = input.trim();
    if (value.length > 0) {
      onSubmit(value);
    }
  };

  return (
    <div className="flex flex-col">
      <div style={{ marginBottom: 14 }}>
        <p style={{ marginBottom: 8, fontSize: 12, fontWeight: 800, color: KT.sub, letterSpacing: 0.5 }}>
          {labels.vocabTest?.writtenAnswer || 'Written answer'}
        </p>
        <h4 style={{ fontSize: 38, fontWeight: 900, color: KT.ink, lineHeight: 1.14 }}>{prompt}</h4>
      </div>

      <div
        style={{
          marginBottom: 12,
          borderRadius: 18,
          border: `1px solid ${KT.line}`,
          background: KT.card,
          padding: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: 11,
            background: KT.bg2,
            color: KT.sub,
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <Keyboard size={16} />
        </span>
        <input
          type="text"
          value={input}
          onChange={event => setInput(event.target.value)}
          placeholder={labels.vocabTest?.writtenPlaceholder || 'Type your answer...'}
          disabled={isReview}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              submit();
            }
          }}
          style={{
            width: '100%',
            border: 'none',
            background: 'transparent',
            color: KT.ink,
            fontSize: 22,
            fontWeight: 900,
            outline: 'none',
          }}
        />
      </div>

      {isReview ? (
        <div
          style={{
            borderRadius: 16,
            border: `1px solid ${isCorrectReview ? KT.mintDeep : KT.pinkDeep}`,
            background: isCorrectReview ? `${KT.mint}55` : `${KT.pink}55`,
            padding: '12px 14px',
            color: isCorrectReview ? KT.mintDeep : KT.pinkDeep,
          }}
        >
          <div className="mb-1 flex items-center gap-2 text-sm font-extrabold">
            {isCorrectReview ? <Check size={16} /> : <X size={16} />}
            <span>{isCorrectReview ? (labels.vocabTest?.correct || 'Correct') : (labels.vocabTest?.wrong || 'Wrong')}</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{correctAnswer}</div>
        </div>
      ) : (
        <button
          type="button"
          onClick={submit}
          disabled={input.trim().length === 0}
          style={{
            width: '100%',
            minHeight: 48,
            borderRadius: 14,
            border: 'none',
            background: KT.ink,
            color: KT.card,
            fontSize: 14,
            fontWeight: 800,
            opacity: input.trim().length === 0 ? 0.45 : 1,
          }}
        >
          {labels.vocabTest?.confirm || 'Confirm'}
        </button>
      )}
    </div>
  );
}
