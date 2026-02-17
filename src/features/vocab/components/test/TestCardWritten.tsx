import { useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import { getLabels } from '../../../../utils/i18n';
import type { Language } from '../../../../types';
import { Button } from '../../../../components/ui';
import { Input } from '../../../../components/ui';

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

const ResultDisplay = ({
  isCorrect,
  language,
  correctAnswer,
}: {
  isCorrect: boolean;
  language: Language;
  correctAnswer: string;
}) => {
  const labels = getLabels(language);
  const correctLabel = labels.vocabTest?.correct || 'Correct';
  const wrongLabel = labels.vocabTest?.wrong || 'Wrong';
  const resultLabel = isCorrect ? correctLabel : wrongLabel;

  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <div
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-2xl font-black ${
          isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}
      >
        {isCorrect ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
        {resultLabel}
      </div>
      <div className="text-sm text-muted-foreground font-bold">
        {labels.vocabTest?.answerLabel || 'Answer: '}
        <span className="font-black text-foreground">{correctAnswer}</span>
      </div>
    </div>
  );
};

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

  const placeholder = useMemo(() => {
    return labels.vocabTest?.writtenPlaceholder || 'Type your answer...';
  }, [labels.vocabTest?.writtenPlaceholder]);

  const submit = () => {
    const v = input.trim();
    onSubmit(v);
  };

  return (
    <div className="mt-6">
      <div className="text-xs font-black text-muted-foreground">
        {labels.vocabTest?.writtenAnswer || 'Written answer'}
      </div>
      <div className="text-3xl font-black text-foreground mt-3">{prompt}</div>

      <div className="mt-6">
        <Input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={placeholder}
          disabled={isReview}
          className="w-full px-5 py-4 rounded-2xl border-2 border-border bg-card text-lg font-bold text-foreground disabled:bg-muted"
        />

        {isReview && correctAnswer && typeof isCorrectReview === 'boolean' ? (
          <ResultDisplay
            isCorrect={isCorrectReview}
            language={language}
            correctAnswer={correctAnswer}
          />
        ) : (
          <div className="mt-4 flex justify-end">
            <Button
              variant="ghost"
              size="auto"
              type="button"
              onClick={submit}
              disabled={input.trim().length === 0}
              className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl bg-primary text-white font-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-5 h-5" />
              {labels.vocabTest?.confirm || 'Confirm'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
