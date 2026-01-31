import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { ArrowLeft, Eye, EyeOff, ChevronLeft, ChevronRight, Volume2 } from 'lucide-react';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useAuth } from '../contexts/AuthContext';
import { getLabels } from '../utils/i18n';
import { VOCAB } from '../utils/convexRefs';
import { useTTS } from '../hooks/useTTS';

type VocabBookCategory = 'UNLEARNED' | 'DUE' | 'MASTERED';
type ImmersiveMode = 'BROWSE' | 'RECALL';

interface WordCardProps {
  current: any;
  mode: ImmersiveMode;
  revealed: boolean;
  onReveal: () => void;
  onSpeak: () => void;
  labels: any;
}

const WordCard: React.FC<WordCardProps> = ({
  current,
  mode,
  revealed,
  onReveal,
  onSpeak,
  labels,
}) => {
  const exampleMeaning =
    current.exampleMeaning ||
    current.exampleMeaningEn ||
    current.exampleMeaningVi ||
    current.exampleMeaningMn;

  const renderBrowseContent = () => (
    <div className="mt-6 space-y-4">
      <p className="text-slate-800 text-lg font-bold">{current.meaning}</p>
      {current.exampleSentence && (
        <div className="rounded-2xl bg-slate-50 border-2 border-slate-100 p-4">
          <p className="font-bold text-slate-800">{current.exampleSentence}</p>
          {exampleMeaning && <p className="mt-2 text-slate-600 font-medium">{exampleMeaning}</p>}
        </div>
      )}
    </div>
  );

  const renderRecallContent = () => (
    <div className="mt-6 space-y-4">
      {current.exampleSentence ? (
        <div className="rounded-2xl bg-slate-50 border-2 border-slate-100 p-4">
          <p className="font-bold text-slate-800">{current.exampleSentence}</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-50 border-2 border-slate-100 p-4">
          <p className="font-bold text-slate-500">{labels.vocab?.noExample || '无例句'}</p>
        </div>
      )}

      {revealed ? (
        <div className="rounded-2xl bg-slate-50 border-2 border-slate-100 p-5">
          <p className="text-slate-800 text-lg font-black">{current.meaning}</p>
          {exampleMeaning && <p className="mt-2 text-slate-600 font-medium">{exampleMeaning}</p>}
        </div>
      ) : (
        <button
          onClick={onReveal}
          className="w-full py-16 rounded-2xl bg-slate-50 border-2 border-slate-100 hover:border-indigo-200"
        >
          <p className="text-slate-500 font-black text-lg">
            {labels.vocab?.tapToReveal || '点击空白处显示答案'}
          </p>
        </button>
      )}
    </div>
  );

  return (
    <div className="rounded-[28px] border-[3px] border-slate-200 bg-white shadow-[0_20px_80px_rgba(15,23,42,0.12)] overflow-hidden">
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900">
                {current.word}
              </h1>
              {current.partOfSpeech && (
                <span className="px-3 py-1 rounded-2xl bg-slate-100 border-2 border-slate-200 text-xs font-black text-slate-700">
                  {current.partOfSpeech}
                </span>
              )}
            </div>
            {current.pronunciation && (
              <p className="text-slate-500 font-medium mt-2">{current.pronunciation}</p>
            )}
          </div>
          <button
            onClick={onSpeak}
            className="p-3 rounded-2xl bg-white border-2 border-slate-200 hover:border-indigo-300 shadow-[0_2px_10px_rgba(0,0,0,0.06)]"
            aria-label="朗读"
          >
            <Volume2 className="w-5 h-5 text-slate-700" />
          </button>
        </div>

        {mode === 'BROWSE' ? renderBrowseContent() : renderRecallContent()}
      </div>
    </div>
  );
};

interface NavigationControlsProps {
  onPrev: () => void;
  onNext: () => void;
  onSpeak: () => void;
  labels: any;
}

const NavigationControls: React.FC<NavigationControlsProps> = ({
  onPrev,
  onNext,
  onSpeak,
  labels,
}) => (
  <div className="px-6 sm:px-8 py-5 border-t-2 border-slate-100 bg-white flex items-center justify-between">
    <button
      onClick={onPrev}
      className="px-4 py-3 rounded-2xl bg-white border-2 border-slate-200 hover:border-indigo-300 font-black inline-flex items-center gap-2"
    >
      <ChevronLeft className="w-5 h-5 text-slate-700" />
      {labels.common?.prev || '上一词'}
    </button>

    <button
      onClick={onSpeak}
      className="px-4 py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-400 font-black inline-flex items-center gap-2 text-white border-2 border-indigo-400"
    >
      <Volume2 className="w-5 h-5" />
      {labels.vocab?.play || '播放'}
    </button>

    <button
      onClick={onNext}
      className="px-4 py-3 rounded-2xl bg-white border-2 border-slate-200 hover:border-indigo-300 font-black inline-flex items-center gap-2"
    >
      {labels.common?.next || '下一词'}
      <ChevronRight className="w-5 h-5 text-slate-700" />
    </button>
  </div>
);

const VocabBookImmersivePage: React.FC = () => {
  const navigate = useLocalizedNavigate();
  const { language } = useAuth();
  const labels = useMemo(() => getLabels(language), [language]);
  const [params] = useSearchParams();
  const { speak, stop } = useTTS();

  useEffect(() => stop, [stop]);

  const categoryParam = (params.get('category') || 'DUE').toUpperCase();
  const q = params.get('q')?.trim();

  const category: VocabBookCategory =
    categoryParam === 'UNLEARNED' || categoryParam === 'MASTERED' || categoryParam === 'DUE'
      ? (categoryParam as VocabBookCategory)
      : 'DUE';

  const vocabBookResult = useQuery(VOCAB.getVocabBook, {
    includeMastered: true,
    search: q || undefined,
  });
  const loading = vocabBookResult === undefined;
  const items = useMemo(() => vocabBookResult ?? [], [vocabBookResult]);

  const filtered = useMemo(() => {
    return items.filter(item => {
      const p = item.progress;
      const isMastered = p.status === 'MASTERED';
      const isUnlearned = p.state === 0 || p.status === 'NEW';
      if (isMastered) return category === 'MASTERED';
      if (isUnlearned) return category === 'UNLEARNED';
      return category === 'DUE';
    });
  }, [items, category]);

  const [mode, setMode] = useState<ImmersiveMode>('BROWSE');
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const total = filtered.length;
  const safeIndex = total === 0 ? 0 : Math.min(index, total - 1);
  const current = filtered[safeIndex];

  const prev = () => {
    if (total === 0) return;
    setIndex(() => (safeIndex - 1 + total) % total);
    setRevealed(false);
  };

  const next = () => {
    if (total === 0) return;
    setIndex(() => (safeIndex + 1) % total);
    setRevealed(false);
  };

  const speakCurrent = async () => {
    if (!current) return;
    await speak(current.word);
    if (current.exampleSentence) {
      await speak(current.exampleSentence);
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="py-24 text-center text-slate-500 font-bold">
          {labels.common?.loading || 'Loading...'}
        </div>
      );
    }

    if (total === 0) {
      return (
        <div className="py-24 text-center">
          <p className="text-xl font-black text-slate-800">
            {labels.dashboard?.vocab?.noDueNow || '暂无单词'}
          </p>
          <p className="text-slate-500 font-medium mt-2">
            {labels.vocab?.tryAnotherFilter || '换个分类或搜索试试'}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <WordCard
          current={current}
          mode={mode}
          revealed={revealed}
          onReveal={() => setRevealed(true)}
          onSpeak={speakCurrent}
          labels={labels}
        />

        <NavigationControls onPrev={prev} onNext={next} onSpeak={speakCurrent} labels={labels} />

        <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
          <span>
            {labels.vocab?.currentFilter || '当前筛选'}: {category}
          </span>
          <button
            onClick={() => {
              setMode('RECALL');
              setRevealed(false);
            }}
            className="inline-flex items-center gap-2 hover:text-slate-700"
          >
            <Volume2 className="w-4 h-4" />
            {labels.vocab?.practiceRecall || '回想练习'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 text-slate-900">
      <div className="sticky top-0 z-20 bg-white/70 backdrop-blur-xl border-b-[3px] border-indigo-100">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/vocab-book')}
            className="p-2.5 rounded-2xl bg-white border-[3px] border-slate-200 hover:border-indigo-300 transition-all duration-200"
            aria-label="返回"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>

          <div className="text-center">
            <p className="text-xs font-black tracking-widest text-indigo-600 uppercase">
              {labels.vocab?.modeImmersive || '沉浸刷词'}
            </p>
            <p className="text-sm font-black text-slate-700">
              {total === 0 ? '0/0' : `${safeIndex + 1}/${total}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setMode(m => (m === 'BROWSE' ? 'RECALL' : 'BROWSE'));
                setRevealed(false);
              }}
              className="px-3 py-2 rounded-2xl bg-white border-[3px] border-slate-200 hover:border-indigo-300 text-xs font-black text-slate-800 transition-all duration-200"
            >
              {mode === 'BROWSE' ? (
                <span className="inline-flex items-center gap-2">
                  <EyeOff className="w-4 h-4 text-slate-600" />
                  {labels.vocab?.recallMode || '回想'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Eye className="w-4 h-4 text-slate-600" />
                  {labels.vocab?.browseMode || '浏览'}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">{renderContent()}</div>
    </div>
  );
};

export default VocabBookImmersivePage;
