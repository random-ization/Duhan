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
  const format = (template: string, vars: Record<string, string | number>) =>
    template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ''));

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
        await new Promise<void>(resolve => setTimeout(resolve, gapMs));
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
        await new Promise<void>(resolve => setTimeout(resolve, 50));
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
        await new Promise<void>(resolve => setTimeout(resolve, 60));
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
      await new Promise<void>(resolve => setTimeout(resolve, 60));
      await startPlayback();
    }
  };

  const start = async () => {
    setStarted(true);
    setIndex(0);
    await new Promise<void>(resolve => setTimeout(resolve, 60));
    await startPlayback();
  };

  const getStatusText = () => {
    if (repeatIteration > 0) {
      return format(labels.vocab?.dictationStatusPlaying || 'Playing {current}/{total}', {
        current: repeatIteration,
        total: playCount,
      });
    }
    return labels.vocab?.dictationStatusIdle || 'Idle';
  };

  const renderContent = () => {
    if (total === 0) {
      return (
        <div className="py-24 text-center">
          <p className="text-xl font-black text-muted-foreground">
            {labels.vocab?.noDueNow || labels.dashboard?.vocab?.noDueNow || 'No words yet'}
          </p>
          <p className="text-muted-foreground font-medium mt-2">
            {labels.vocab?.tryAnotherFilter || 'Try another category or search'}
          </p>
        </div>
      );
    }

    if (started) {
      return (
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
                  {getStatusText()}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                size="auto"
                onClick={prev}
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
                  onClick={stopAll}
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
                  onClick={startPlayback}
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
                onClick={next}
                className="px-4 py-3 rounded-2xl border-[3px] border-border font-black text-muted-foreground hover:border-border disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {labels.common?.next || 'Next'}
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
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
              {([1, 2, 3] as const).map(v => (
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
                  {format(labels.vocab?.repeatTimes || '{count}x', { count: v })}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-black text-muted-foreground tracking-wider uppercase mb-2">
              {labels.vocab?.playGap || 'Repeat interval'}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {([2, 4, 6, 8] as const).map(v => (
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
                  {format(labels.vocab?.seconds || '{count}s', { count: v })}
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
            onClick={start}
            className="w-full py-4 rounded-2xl bg-rose-500 dark:bg-rose-400/80 text-primary-foreground font-black border-[3px] border-rose-400 dark:border-rose-300/35"
          >
            {labels.vocab?.dictationStartButton || 'Start playback'}
          </Button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50 dark:from-rose-400/8 dark:via-background dark:to-rose-300/8">
        <div className="sticky top-0 z-20 bg-card/70 backdrop-blur-xl border-b-[3px] border-rose-100 dark:border-rose-300/20">
          <div className="max-w-3xl mx-auto px-4 py-5 flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => navigate('/vocab-book')}
              className="p-2.5 rounded-2xl bg-card border-[3px] border-border hover:border-rose-300 dark:hover:border-rose-300/35 transition-all duration-200"
              aria-label={labels.common?.back || 'Back'}
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </Button>

            <div className="text-center">
              <p className="text-xs font-black text-rose-500 dark:text-rose-300 tracking-wider uppercase">
                {labels.vocab?.modeDictation || 'Dictation'}
              </p>
              <p className="text-sm font-black text-muted-foreground" />
            </div>

            <div className="w-12" />
          </div>
        </div>
        <VocabBookDictationSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50 dark:from-rose-400/8 dark:via-background dark:to-rose-300/8">
      <div className="sticky top-0 z-20 bg-card/70 backdrop-blur-xl border-b-[3px] border-rose-100 dark:border-rose-300/20">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={() => navigate('/vocab-book')}
            className="p-2.5 rounded-2xl bg-card border-[3px] border-border hover:border-rose-300 dark:hover:border-rose-300/35 transition-all duration-200"
            aria-label={labels.common?.back || 'Back'}
          >
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Button>

          <div className="text-center">
            <p className="text-xs font-black text-rose-500 dark:text-rose-300 tracking-wider uppercase">
              {labels.vocab?.modeDictation || 'Dictation'}
            </p>
            <p className="text-sm font-black text-muted-foreground">
              {started ? `${index + 1}/${total || 0}` : ''}
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={() => setSettingsOpen(true)}
            className="p-2.5 rounded-2xl bg-card border-[3px] border-border hover:border-rose-300 dark:hover:border-rose-300/35 transition-all duration-200"
            aria-label={labels.vocab?.settings || 'Settings'}
          >
            <Settings2 className="w-5 h-5 text-muted-foreground" />
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">{renderContent()}</div>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
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
              animate={settingsOpen ? { y: 0, opacity: 1 } : { y: 40, opacity: 0 }}
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
                  onClick={() => setSettingsOpen(false)}
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
                onClick={() => setSettingsOpen(false)}
                className="mt-6 w-full py-3 rounded-2xl bg-primary text-primary-foreground font-black"
              >
                {labels.done || 'Done'}
              </Button>
            </motion.div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </div>
  );
};

export default VocabBookDictationPage;
