import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { ArrowLeft, Eye, EyeOff, ChevronLeft, ChevronRight, Volume2 } from 'lucide-react';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useAuth } from '../contexts/AuthContext';
import { getLabels } from '../utils/i18n';
import { VOCAB } from '../utils/convexRefs';
import { useTTS } from '../hooks/useTTS';
import { Button } from '../components/ui';

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
      <p className="text-muted-foreground text-lg font-bold">{current.meaning}</p>
      {current.exampleSentence && (
        <div className="rounded-2xl bg-muted border-2 border-border p-4">
          <p className="font-bold text-muted-foreground">{current.exampleSentence}</p>
          {exampleMeaning && (
            <p className="mt-2 text-muted-foreground font-medium">{exampleMeaning}</p>
          )}
        </div>
      )}
    </div>
  );

  const renderRecallContent = () => (
    <div className="mt-6 space-y-4">
      {current.exampleSentence ? (
        <div className="rounded-2xl bg-muted border-2 border-border p-4">
          <p className="font-bold text-muted-foreground">{current.exampleSentence}</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-muted border-2 border-border p-4">
          <p className="font-bold text-muted-foreground">{labels.vocab?.noExample || '无例句'}</p>
        </div>
      )}

      {revealed ? (
        <div className="rounded-2xl bg-muted border-2 border-border p-5">
          <p className="text-muted-foreground text-lg font-black">{current.meaning}</p>
          {exampleMeaning && (
            <p className="mt-2 text-muted-foreground font-medium">{exampleMeaning}</p>
          )}
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="auto"
          onClick={onReveal}
          className="w-full py-16 rounded-2xl bg-muted border-2 border-border hover:border-indigo-200 dark:hover:border-indigo-300/25"
        >
          <p className="text-muted-foreground font-black text-lg">
            {labels.vocab?.tapToReveal || '点击空白处显示答案'}
          </p>
        </Button>
      )}
    </div>
  );

  return (
    <div className="rounded-[28px] border-[3px] border-border bg-card shadow-[0_20px_80px_rgba(15,23,42,0.12)] overflow-hidden">
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-foreground">
                {current.word}
              </h1>
              {current.partOfSpeech && (
                <span className="px-3 py-1 rounded-2xl bg-muted border-2 border-border text-xs font-black text-muted-foreground">
                  {current.partOfSpeech}
                </span>
              )}
            </div>
            {current.pronunciation && (
              <p className="text-muted-foreground font-medium mt-2">{current.pronunciation}</p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={onSpeak}
            className="p-3 rounded-2xl bg-card border-2 border-border hover:border-indigo-300 dark:hover:border-indigo-300/35 shadow-[0_2px_10px_rgba(0,0,0,0.06)]"
            aria-label="朗读"
          >
            <Volume2 className="w-5 h-5 text-muted-foreground" />
          </Button>
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
  <div className="px-6 sm:px-8 py-5 border-t-2 border-border bg-card flex items-center justify-between">
    <Button
      type="button"
      variant="ghost"
      size="auto"
      onClick={onPrev}
      className="px-4 py-3 rounded-2xl bg-card border-2 border-border hover:border-indigo-300 dark:hover:border-indigo-300/35 font-black inline-flex items-center gap-2"
    >
      <ChevronLeft className="w-5 h-5 text-muted-foreground" />
      {labels.common?.prev || '上一词'}
    </Button>

    <Button
      type="button"
      variant="ghost"
      size="auto"
      onClick={onSpeak}
      className="px-4 py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-400 dark:bg-indigo-400/80 dark:hover:bg-indigo-300/80 font-black inline-flex items-center gap-2 text-primary-foreground border-2 border-indigo-400 dark:border-indigo-300/35"
    >
      <Volume2 className="w-5 h-5" />
      {labels.vocab?.play || '播放'}
    </Button>

    <Button
      type="button"
      variant="ghost"
      size="auto"
      onClick={onNext}
      className="px-4 py-3 rounded-2xl bg-card border-2 border-border hover:border-indigo-300 dark:hover:border-indigo-300/35 font-black inline-flex items-center gap-2"
    >
      {labels.common?.next || '下一词'}
      <ChevronRight className="w-5 h-5 text-muted-foreground" />
    </Button>
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
        <div className="py-24 text-center text-muted-foreground font-bold">
          {labels.common?.loading || 'Loading...'}
        </div>
      );
    }

    if (total === 0) {
      return (
        <div className="py-24 text-center">
          <p className="text-xl font-black text-muted-foreground">
            {labels.dashboard?.vocab?.noDueNow || '暂无单词'}
          </p>
          <p className="text-muted-foreground font-medium mt-2">
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

        <div className="flex items-center justify-between text-muted-foreground text-xs font-bold">
          <span>
            {labels.vocab?.currentFilter || '当前筛选'}: {category}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={() => {
              setMode('RECALL');
              setRevealed(false);
            }}
            className="inline-flex items-center gap-2 hover:text-muted-foreground"
          >
            <Volume2 className="w-4 h-4" />
            {labels.vocab?.practiceRecall || '回想练习'}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-indigo-400/8 dark:via-background dark:to-indigo-300/8 text-foreground">
      <div className="sticky top-0 z-20 bg-card/70 backdrop-blur-xl border-b-[3px] border-indigo-100 dark:border-indigo-300/20">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={() => navigate('/vocab-book')}
            className="p-2.5 rounded-2xl bg-card border-[3px] border-border hover:border-indigo-300 dark:hover:border-indigo-300/35 transition-all duration-200"
            aria-label="返回"
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Button>

          <div className="text-center">
            <p className="text-xs font-black tracking-widest text-indigo-600 dark:text-indigo-200 uppercase">
              {labels.vocab?.modeImmersive || '沉浸刷词'}
            </p>
            <p className="text-sm font-black text-muted-foreground">
              {total === 0 ? '0/0' : `${safeIndex + 1}/${total}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => {
                setMode(m => (m === 'BROWSE' ? 'RECALL' : 'BROWSE'));
                setRevealed(false);
              }}
              className="px-3 py-2 rounded-2xl bg-card border-[3px] border-border hover:border-indigo-300 dark:hover:border-indigo-300/35 text-xs font-black text-muted-foreground transition-all duration-200"
            >
              {mode === 'BROWSE' ? (
                <span className="inline-flex items-center gap-2">
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                  {labels.vocab?.recallMode || '回想'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  {labels.vocab?.browseMode || '浏览'}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">{renderContent()}</div>
    </div>
  );
};

export default VocabBookImmersivePage;
