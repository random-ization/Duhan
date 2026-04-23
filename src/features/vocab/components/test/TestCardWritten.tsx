import { useState } from 'react';
import { Keyboard, Check, X } from 'lucide-react';
import type { Language } from '../../../../types';
import { Button } from '../../../../components/ui';

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
  prompt,
  answered,
  mode = 'test',
  correctAnswer,
  onSubmit,
}: Props) {
  const [input, setInput] = useState(() => answered?.input ?? '');
  const isReview = mode === 'review' && typeof correctAnswer === 'string';
  const isCorrectReview =
    isReview && correctAnswer ? normalizeText(input) === normalizeText(correctAnswer) : null;

  const submit = () => {
    const v = input.trim();
    if (v.length > 0) onSubmit(v);
  };

  return (
    <div className="flex flex-col">
      <div className="text-center mb-8">
        <p className="text-[11px] font-black text-slate-500 tracking-[0.2em] mb-4">根据释义拼写单词</p>
        <h4 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">{prompt}</h4>
      </div>

      <div className={`vt-inset-slot rounded-[1.2rem] p-2 flex items-center mb-6 transition-all ${isReview ? (isCorrectReview ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200') : 'focus-within:ring-2 focus-within:ring-blue-500/50'}`}>
        <div className={`w-10 h-10 rounded-[10px] bg-white border flex items-center justify-center shadow-sm shrink-0 ${isReview ? (isCorrectReview ? 'text-emerald-500 border-emerald-100' : 'text-rose-500 border-rose-100') : 'text-slate-400 border-slate-200'}`}>
          <Keyboard className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="输入拼写..."
          disabled={isReview}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
          className={`w-full bg-transparent border-none text-center text-2xl font-black placeholder-slate-300 focus:outline-none px-2 ${isReview ? (isCorrectReview ? 'text-emerald-700' : 'text-rose-700') : 'text-slate-900'}`}
        />
      </div>

      {isReview ? (
        <div className={`p-4 rounded-xl border text-center ${isCorrectReview ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800' : 'bg-rose-50/50 border-rose-100 text-rose-800'}`}>
          <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">
            {isCorrectReview ? '拼写正确' : '正确答案'}
          </p>
          <p className="text-xl font-black">{correctAnswer}</p>
          {!isCorrectReview && (
              <div className="mt-2 flex items-center justify-center gap-1.5 text-xs font-bold opacity-70">
                  <X className="w-3 h-3" />
                  <span>你的输入: {input || '(未填写)'}</span>
              </div>
          )}
          {isCorrectReview && (
              <div className="mt-2 flex items-center justify-center gap-1.5 text-xs font-bold opacity-70">
                  <Check className="w-3 h-3" />
                  <span>Perfect Score</span>
              </div>
          )}
        </div>
      ) : (
        <Button
          variant="ghost"
          size="auto"
          type="button"
          onClick={submit}
          disabled={input.trim().length === 0}
          className="w-full text-[13px] font-black text-white bg-slate-900 py-3.5 rounded-xl shadow-[0_4px_12px_rgba(0,0,0,0.2)] active:scale-95 transition-transform tracking-widest disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-900 hover:text-white"
        >
          提交答案
        </Button>
      )}
    </div>
  );
}

