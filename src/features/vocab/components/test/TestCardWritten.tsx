import React, { useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import type { Language } from '../../../../types';

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
  const correctLabel = language === 'zh' ? '正确' : 'Correct';
  const wrongLabel = language === 'zh' ? '错误' : 'Wrong';
  const resultLabel = isCorrect ? correctLabel : wrongLabel;

  return (
    <div className="mt-4 flex items-center justify-between gap-3">
      <div
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-2xl font-black ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
      >
        {isCorrect ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
        {resultLabel}
      </div>
      <div className="text-sm text-slate-500 font-bold">
        {language === 'zh' ? '正确答案：' : 'Answer: '}
        <span className="font-black text-slate-900">{correctAnswer}</span>
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
  const [input, setInput] = useState(() => answered?.input ?? '');
  const isReview = mode === 'review' && typeof correctAnswer === 'string';
  const isCorrectReview =
    isReview && correctAnswer
      ? normalizeText(input) === normalizeText(correctAnswer)
      : null;

  const placeholder = useMemo(() => {
    return language === 'zh' ? '请输入答案…' : 'Type your answer...';
  }, [language]);

  const submit = () => {
    const v = input.trim();
    onSubmit(v);
  };

  return (
    <div className="mt-6">
      <div className="text-xs font-black text-slate-400">
        {language === 'zh' ? '书写回答' : 'Written answer'}
      </div>
      <div className="text-3xl font-black text-slate-900 mt-3">{prompt}</div>

      <div className="mt-6">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={placeholder}
          disabled={isReview}
          className="w-full px-5 py-4 rounded-2xl border-2 border-slate-200 bg-white text-lg font-bold text-slate-900 disabled:bg-slate-50"
        />

        {isReview && correctAnswer && typeof isCorrectReview === 'boolean' ? (
          <ResultDisplay
            isCorrect={isCorrectReview}
            language={language}
            correctAnswer={correctAnswer}
          />
        ) : (
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={submit}
              disabled={input.trim().length === 0}
              className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl bg-slate-900 text-white font-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-5 h-5" />
              {language === 'zh' ? '确认' : 'Confirm'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
