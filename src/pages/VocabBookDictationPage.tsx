import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import {
  ArrowLeft,
  Mic,
  Type,
  Play,
  Square,
  Settings2,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useAuth } from '../contexts/AuthContext';
import { getLabels } from '../utils/i18n';
import { VOCAB } from '../utils/convexRefs';
import { useTTS } from '../hooks/useTTS';
import { VocabBookDictationSkeleton } from '../components/common';
import { Dialog, DialogContent, DialogOverlay, DialogPortal } from '../components/ui';
import { Button } from '../components/ui';
import { Switch } from '../components/ui';

type VocabBookCategory = 'UNLEARNED' | 'DUE' | 'MASTERED';
type DictationMode = 'HEAR_PRONUNCIATION' | 'HEAR_MEANING';

const KOREAN_VOICE = 'ko-KR-SunHiNeural';
const ZH_VOICE = 'zh-CN-XiaoxiaoNeural';

const PLAY_COUNT_OPTIONS = [1, 2, 3] as const;
const GAP_SECOND_OPTIONS = [2, 4, 6, 8] as const;

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

const formatTemplate = (template: string, vars: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ''));

const DictationEmptyState = ({ labels }: { labels: ReturnType<typeof getLabels> }) => (
  <div className="py-24 text-center">
    <p className="text-xl font-black text-muted-foreground">
      {labels.vocab?.noDueNow || labels.dashboard?.vocab?.noDueNow || 'No words yet'}
    </p>
    <p className="text-muted-foreground font-medium mt-2">
      {labels.vocab?.tryAnotherFilter || 'Try another category or search'}
    </p>
  </div>
);

const DictationPlayerPanel = ({
  mode,
  labels,
  statusText,
  playing,
  onPrev,
  onStop,
  onStartPlayback,
  onNext,
}: {
  mode: DictationMode;
  labels: ReturnType<typeof getLabels>;
  statusText: string;
  playing: boolean;
  onPrev: () => void;
  onStop: () => void;
  onStartPlayback: () => void;
  onNext: () => void;
}) => (
  <div className="space-y-5">
    <div className="rounded-[28px] bg-card border-[3px] border-border shadow-[0_10px_35px_rgba(0,0,0,0.06)] p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black text-muted-foreground tracking-wider uppercase">
            {mode === 'HEAR_PRONUNCIATION'
              ? labels.vocab?.dictationHearPron || 'Hear pronunciation'
              : labels.vocab?.dictationHearMeaning || 'Hear meaning'}
          </p>
          <h1 className="text-3xl font-black text-foreground mt-1">
            {labels.vocab?.dictationPlayerTitle || 'Dictation Player'}
          </h1>
          <p className="mt-2 text-muted-foreground font-bold">
            {labels.vocab?.dictationPlayerSubtitle || 'Listen and write'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-black text-muted-foreground tracking-wider uppercase">
            {statusText}
          </p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          size="auto"
          onClick={onPrev}
          className="px-4 py-3 rounded-2xl border-[3px] border-border font-black text-muted-foreground hover:border-border inline-flex items-center gap-2"
        >
          <ChevronLeft className="w-5 h-5" />
          {labels.common?.prev || 'Previous'}
        </Button>

        {playing ? (
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={onStop}
            className="px-5 py-3 rounded-2xl bg-rose-500 dark:bg-rose-400/80 text-primary-foreground font-black border-[3px] border-rose-400 dark:border-rose-300/35 inline-flex items-center gap-2"
          >
            <Square className="w-5 h-5" />
            {labels.vocab?.stop || 'Stop'}
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={onStartPlayback}
            className="px-5 py-3 rounded-2xl bg-primary text-primary-foreground font-black border-[3px] border-border inline-flex items-center gap-2"
          >
            <Play className="w-5 h-5" />
            {labels.vocab?.play || 'Play'}
          </Button>
        )}

        <Button
          type="button"
          variant="ghost"
          size="auto"
          onClick={onNext}
          className="px-4 py-3 rounded-2xl border-[3px] border-border font-black text-muted-foreground hover:border-border disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          {labels.common?.next || 'Next'}
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  </div>
);

const DictationSetupPanel = ({
  mode,
  setMode,
  labels,
  playCount,
  setPlayCount,
  gapSeconds,
  setGapSeconds,
  autoNext,
  setAutoNext,
  onStart,
}: {
  mode: DictationMode;
  setMode: React.Dispatch<React.SetStateAction<DictationMode>>;
  labels: ReturnType<typeof getLabels>;
  playCount: 1 | 2 | 3;
  setPlayCount: React.Dispatch<React.SetStateAction<1 | 2 | 3>>;
  gapSeconds: 2 | 4 | 6 | 8;
  setGapSeconds: React.Dispatch<React.SetStateAction<2 | 4 | 6 | 8>>;
  autoNext: boolean;
  setAutoNext: React.Dispatch<React.SetStateAction<boolean>>;
  onStart: () => void;
}) => (
  <div className="space-y-5">
    <div className="grid grid-cols-2 gap-3">
      <Button
        type="button"
        variant="ghost"
        size="auto"
        onClick={() => setMode('HEAR_PRONUNCIATION')}
        className={`!flex !w-full !items-start !justify-start p-5 rounded-3xl border-[3px] text-left transition-all ${
          mode === 'HEAR_PRONUNCIATION'
            ? 'border-rose-400 bg-card shadow-[0_10px_30px_rgba(244,63,94,0.12)] dark:border-rose-300/35 dark:shadow-[0_10px_30px_rgba(251,113,133,0.14)]'
            : 'border-border bg-card'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-400/14 flex items-center justify-center">
            <Mic className="w-6 h-6 text-rose-600 dark:text-rose-300" />
          </div>
          <div>
            <p className="font-black text-foreground">
              {labels.vocab?.dictationHearPron || 'Hear pronunciation'}
            </p>
            <p className="text-xs font-bold text-muted-foreground">
              {labels.vocab?.dictationHearPronDesc || 'Write the word/meaning'}
            </p>
          </div>
        </div>
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="auto"
        onClick={() => setMode('HEAR_MEANING')}
        className={`!flex !w-full !items-start !justify-start p-5 rounded-3xl border-[3px] text-left transition-all ${
          mode === 'HEAR_MEANING'
            ? 'border-rose-400 bg-card shadow-[0_10px_30px_rgba(244,63,94,0.12)] dark:border-rose-300/35 dark:shadow-[0_10px_30px_rgba(251,113,133,0.14)]'
            : 'border-border bg-card'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-100 dark:bg-indigo-400/14 flex items-center justify-center">
            <Type className="w-6 h-6 text-indigo-600 dark:text-indigo-300" />
          </div>
          <div>
            <p className="font-black text-foreground">
              {labels.vocab?.dictationHearMeaning || 'Hear meaning'}
            </p>
            <p className="text-xs font-bold text-muted-foreground">
              {labels.vocab?.dictationHearMeaningDesc || 'Write the word'}
            </p>
          </div>
        </div>
      </Button>
    </div>

    <div className="rounded-[28px] bg-card border-[3px] border-border shadow-[0_10px_35px_rgba(0,0,0,0.06)] p-6 space-y-6">
      <div>
        <p className="text-xs font-black text-muted-foreground tracking-wider uppercase mb-2">
          {labels.vocab?.repeatCount || 'Repetitions'}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {PLAY_COUNT_OPTIONS.map(v => (
            <Button
              type="button"
              variant="ghost"
              size="auto"
              key={v}
              onClick={() => setPlayCount(v)}
              className={`py-3 rounded-2xl border-[3px] font-black ${
                playCount === v
                  ? 'border-rose-400 bg-rose-50 text-rose-600 dark:border-rose-300/35 dark:bg-rose-400/12 dark:text-rose-200'
                  : 'border-border bg-card text-muted-foreground'
              }`}
            >
              {formatTemplate(labels.vocab?.repeatTimes || '{count}x', { count: v })}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-black text-muted-foreground tracking-wider uppercase mb-2">
          {labels.vocab?.playGap || 'Repeat interval'}
        </p>
        <div className="grid grid-cols-4 gap-2">
          {GAP_SECOND_OPTIONS.map(v => (
            <Button
              type="button"
              variant="ghost"
              size="auto"
              key={v}
              onClick={() => setGapSeconds(v)}
              className={`py-3 rounded-2xl border-[3px] font-black ${
                gapSeconds === v
                  ? 'border-rose-400 bg-rose-50 text-rose-600 dark:border-rose-300/35 dark:bg-rose-400/12 dark:text-rose-200'
                  : 'border-border bg-card text-muted-foreground'
              }`}
            >
              {formatTemplate(labels.vocab?.seconds || '{count}s', { count: v })}
            </Button>
          ))}
        </div>
      </div>

      <label className="flex items-center justify-between p-4 rounded-2xl bg-muted border-2 border-border">
        <span className="font-black text-muted-foreground">
          {labels.vocab?.autoNext || 'Auto next'}
        </span>
        <Switch
          checked={autoNext}
          onCheckedChange={setAutoNext}
          className="h-6 w-11 data-[state=checked]:bg-rose-500 dark:data-[state=checked]:bg-rose-400/80 data-[state=unchecked]:bg-background border border-border"
        />
      </label>

      <Button
        type="button"
        variant="ghost"
        size="auto"
        onClick={onStart}
        className="w-full py-4 rounded-2xl bg-rose-500 dark:bg-rose-400/80 text-primary-foreground font-black border-[3px] border-rose-400 dark:border-rose-300/35"
      >
        {labels.vocab?.dictationStartButton || 'Start playback'}
      </Button>
    </div>
  </div>
);

const DictationContent = ({
  total,
  started,
  labels,
  mode,
  statusText,
  playing,
  onPrev,
  onStop,
  onStartPlayback,
  onNext,
  setMode,
  playCount,
  setPlayCount,
  gapSeconds,
  setGapSeconds,
  autoNext,
  setAutoNext,
  onStart,
}: {
  total: number;
  started: boolean;
  labels: ReturnType<typeof getLabels>;
  mode: DictationMode;
  statusText: string;
  playing: boolean;
  onPrev: () => void;
  onStop: () => void;
  onStartPlayback: () => void;
  onNext: () => void;
  setMode: React.Dispatch<React.SetStateAction<DictationMode>>;
  playCount: 1 | 2 | 3;
  setPlayCount: React.Dispatch<React.SetStateAction<1 | 2 | 3>>;
  gapSeconds: 2 | 4 | 6 | 8;
  setGapSeconds: React.Dispatch<React.SetStateAction<2 | 4 | 6 | 8>>;
  autoNext: boolean;
  setAutoNext: React.Dispatch<React.SetStateAction<boolean>>;
  onStart: () => void;
}) => {
  if (total === 0) return <DictationEmptyState labels={labels} />;
  if (started) {
    return (
      <DictationPlayerPanel
        mode={mode}
        labels={labels}
        statusText={statusText}
        playing={playing}
        onPrev={onPrev}
        onStop={onStop}
        onStartPlayback={onStartPlayback}
        onNext={onNext}
      />
    );
  }
  return (
    <DictationSetupPanel
      mode={mode}
      setMode={setMode}
      labels={labels}
      playCount={playCount}
      setPlayCount={setPlayCount}
      gapSeconds={gapSeconds}
      setGapSeconds={setGapSeconds}
      autoNext={autoNext}
      setAutoNext={setAutoNext}
      onStart={onStart}
    />
  );
};

const DictationPageShell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50 dark:from-rose-400/8 dark:via-background dark:to-rose-300/8">
    {children}
  </div>
);

const DictationTopBar = ({
  labels,
  progressText,
  onBack,
  onOpenSettings,
}: {
  labels: ReturnType<typeof getLabels>;
  progressText: string;
  onBack: () => void;
  onOpenSettings?: () => void;
}) => (
  <div className="sticky top-0 z-20 bg-card/70 backdrop-blur-xl border-b-[3px] border-rose-100 dark:border-rose-300/20">
    <div className="max-w-3xl mx-auto px-4 py-5 flex items-center justify-between">
      <Button
        type="button"
        variant="ghost"
        size="auto"
        onClick={onBack}
        className="p-2.5 rounded-2xl bg-card border-[3px] border-border hover:border-rose-300 dark:hover:border-rose-300/35 transition-all duration-200"
        aria-label={labels.common?.back || 'Back'}
      >
        <ArrowLeft className="w-5 h-5 text-muted-foreground" />
      </Button>

      <div className="text-center">
        <p className="text-xs font-black text-rose-500 dark:text-rose-300 tracking-wider uppercase">
          {labels.vocab?.modeDictation || 'Dictation'}
        </p>
        <p className="text-sm font-black text-muted-foreground">{progressText}</p>
      </div>

      {onOpenSettings ? (
        <Button
          type="button"
          variant="ghost"
          size="auto"
          onClick={onOpenSettings}
          className="p-2.5 rounded-2xl bg-card border-[3px] border-border hover:border-rose-300 dark:hover:border-rose-300/35 transition-all duration-200"
          aria-label={labels.vocab?.settings || 'Settings'}
        >
          <Settings2 className="w-5 h-5 text-muted-foreground" />
        </Button>
      ) : (
        <div className="w-12" />
      )}
    </div>
  </div>
);

const DictationSettingsDialog = ({
  open,
  labels,
  autoNext,
  setAutoNext,
  onClose,
}: {
  open: boolean;
  labels: ReturnType<typeof getLabels>;
  autoNext: boolean;
  setAutoNext: React.Dispatch<React.SetStateAction<boolean>>;
  onClose: () => void;
}) => (
  <Dialog open={open} onOpenChange={open => !open && onClose()}>
    <DialogPortal>
      <DialogOverlay
        unstyled
        forceMount
        className="fixed inset-0 z-[80] bg-black/50 transition-opacity data-[state=open]:opacity-100 data-[state=closed]:opacity-0"
      />
      <DialogContent
        unstyled
        forceMount
        closeOnEscape={false}
        lockBodyScroll={false}
        className="fixed inset-0 z-[81] flex items-end sm:items-center justify-center p-4 pointer-events-none data-[state=closed]:pointer-events-none"
      >
        <motion.div
          initial={false}
          animate={open ? { y: 0, opacity: 1 } : { y: 40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="pointer-events-auto w-full max-w-lg bg-card rounded-[28px] border-[3px] border-border shadow-2xl p-6"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs font-black text-muted-foreground tracking-wider uppercase">
                {labels.vocab?.settings || labels.settings || 'Settings'}
              </p>
              <h2 className="text-2xl font-black text-foreground">
                {labels.vocab?.modeDictation || 'Dictation'}
              </h2>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-muted"
              aria-label={labels.common?.close || 'Close'}
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </Button>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-4 rounded-2xl bg-muted border-2 border-border">
              <span className="font-black text-muted-foreground">
                {labels.vocab?.autoNext || 'Auto next'}
              </span>
              <Switch
                checked={autoNext}
                onCheckedChange={setAutoNext}
                className="h-6 w-11 data-[state=checked]:bg-rose-500 dark:data-[state=checked]:bg-rose-400/80 data-[state=unchecked]:bg-background border border-border"
              />
            </label>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={onClose}
            className="mt-6 w-full py-3 rounded-2xl bg-primary text-primary-foreground font-black"
          >
            {labels.done || 'Done'}
          </Button>
        </motion.div>
      </DialogContent>
    </DialogPortal>
  </Dialog>
);

const VocabBookDictationPage: React.FC = () => {
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

  const [mode, setMode] = useState<DictationMode>('HEAR_PRONUNCIATION');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [playCount, setPlayCount] = useState<1 | 2 | 3>(2);
  const [gapSeconds, setGapSeconds] = useState<2 | 4 | 6 | 8>(2);
  const [autoNext, setAutoNext] = useState(true);

  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const total = filtered.length;

  const runIdRef = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [repeatIteration, setRepeatIteration] = useState(0);

  const stopAll = () => {
    runIdRef.current += 1;
    stop();
    setPlaying(false);
    setRepeatIteration(0);
  };

  const playOne = async (myRunId: number) => {
    const w = filtered[indexRef.current];
    if (!w) return;

    const gapMs = gapSeconds * 1000;
    const promptText =
      mode === 'HEAR_PRONUNCIATION'
        ? w.word
        : w.meaning || w.meaningEn || w.meaningVi || w.meaningMn || '';
    const voice = mode === 'HEAR_PRONUNCIATION' ? KOREAN_VOICE : ZH_VOICE;

    if (!promptText) return;

    for (let i = 1; i <= playCount; i += 1) {
      if (myRunId !== runIdRef.current) return;
      setRepeatIteration(i);
      await speak(promptText, { voice });
      if (myRunId !== runIdRef.current) return;
      if (i < playCount) {
        await wait(gapMs);
      }
    }
    setRepeatIteration(0);
  };

  const startPlayback = async () => {
    if (playing) return;
    if (total === 0) return;

    const myRunId = (runIdRef.current += 1);
    setPlaying(true);

    try {
      while (myRunId === runIdRef.current) {
        await playOne(myRunId);
        if (myRunId !== runIdRef.current) return;
        if (!autoNext) return;
        if (indexRef.current >= total - 1) return;
        setIndex(i => Math.min(total - 1, i + 1));
        await wait(50);
      }
    } finally {
      if (myRunId === runIdRef.current) {
        setPlaying(false);
        setRepeatIteration(0);
      }
    }
  };

  const prev = () => {
    if (total === 0) return;
    const wasPlaying = playing;
    stopAll();
    setIndex(i => Math.max(0, i - 1));
    if (wasPlaying) {
      void (async () => {
        await wait(60);
        await startPlayback();
      })();
    }
  };

  const next = async () => {
    if (total === 0) return;
    const wasPlaying = playing;
    stopAll();
    setIndex(i => Math.min(total - 1, i + 1));
    if (wasPlaying) {
      await wait(60);
      await startPlayback();
    }
  };

  const start = async () => {
    setStarted(true);
    setIndex(0);
    await wait(60);
    await startPlayback();
  };
  const statusText =
    repeatIteration > 0
      ? formatTemplate(labels.vocab?.dictationStatusPlaying || 'Playing {current}/{total}', {
          current: repeatIteration,
          total: playCount,
        })
      : labels.vocab?.dictationStatusIdle || 'Idle';

  if (loading) {
    return (
      <DictationPageShell>
        <DictationTopBar labels={labels} progressText="" onBack={() => navigate('/vocab-book')} />
        <VocabBookDictationSkeleton />
      </DictationPageShell>
    );
  }

  return (
    <DictationPageShell>
      <DictationTopBar
        labels={labels}
        progressText={started ? `${index + 1}/${total || 0}` : ''}
        onBack={() => navigate('/vocab-book')}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="max-w-3xl mx-auto px-4 py-8">
        <DictationContent
          total={total}
          started={started}
          labels={labels}
          mode={mode}
          statusText={statusText}
          playing={playing}
          onPrev={prev}
          onStop={stopAll}
          onStartPlayback={() => {
            void startPlayback();
          }}
          onNext={() => {
            void next();
          }}
          setMode={setMode}
          playCount={playCount}
          setPlayCount={setPlayCount}
          gapSeconds={gapSeconds}
          setGapSeconds={setGapSeconds}
          autoNext={autoNext}
          setAutoNext={setAutoNext}
          onStart={() => {
            void start();
          }}
        />
      </div>

      <DictationSettingsDialog
        open={settingsOpen}
        labels={labels}
        autoNext={autoNext}
        setAutoNext={setAutoNext}
        onClose={() => setSettingsOpen(false)}
      />
    </DictationPageShell>
  );
};

export default VocabBookDictationPage;
