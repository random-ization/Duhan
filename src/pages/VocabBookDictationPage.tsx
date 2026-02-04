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
import { motion, AnimatePresence } from 'framer-motion';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useAuth } from '../contexts/AuthContext';
import { getLabels } from '../utils/i18n';
import { VOCAB } from '../utils/convexRefs';
import { useTTS } from '../hooks/useTTS';

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
            {labels.vocab?.noDueNow || labels.dashboard?.vocab?.noDueNow || 'No words yet'}
          </p>
          <p className="text-slate-400 font-medium mt-2">
            {labels.vocab?.tryAnotherFilter || 'Try another category or search'}
          </p>
        </div>
      );
    }

    if (started) {
      return (
        <div className="space-y-5">
          <div className="rounded-[28px] bg-white border-[3px] border-slate-200 shadow-[0_10px_35px_rgba(0,0,0,0.06)] p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black text-slate-400 tracking-wider uppercase">
                  {mode === 'HEAR_PRONUNCIATION'
                    ? labels.vocab?.dictationHearPron || 'Hear pronunciation'
                    : labels.vocab?.dictationHearMeaning || 'Hear meaning'}
                </p>
                <h1 className="text-3xl font-black text-slate-900 mt-1">
                  {labels.vocab?.dictationPlayerTitle || 'Dictation Player'}
                </h1>
                <p className="mt-2 text-slate-600 font-bold">
                  {labels.vocab?.dictationPlayerSubtitle || 'Listen and write'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-slate-400 tracking-wider uppercase">
                  {getStatusText()}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                onClick={prev}
                className="px-4 py-3 rounded-2xl border-[3px] border-slate-200 font-black text-slate-700 hover:border-slate-300 inline-flex items-center gap-2"
              >
                <ChevronLeft className="w-5 h-5" />
                {labels.common?.prev || 'Previous'}
              </button>

              {playing ? (
                <button
                  onClick={stopAll}
                  className="px-5 py-3 rounded-2xl bg-rose-500 text-white font-black border-[3px] border-rose-400 inline-flex items-center gap-2"
                >
                  <Square className="w-5 h-5" />
                  {labels.vocab?.stop || 'Stop'}
                </button>
              ) : (
                <button
                  onClick={startPlayback}
                  className="px-5 py-3 rounded-2xl bg-slate-900 text-white font-black border-[3px] border-slate-800 inline-flex items-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  {labels.vocab?.play || 'Play'}
                </button>
              )}

              <button
                onClick={next}
                className="px-4 py-3 rounded-2xl border-[3px] border-slate-200 font-black text-slate-700 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
              >
                {labels.common?.next || 'Next'}
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setMode('HEAR_PRONUNCIATION')}
            className={`p-5 rounded-3xl border-[3px] text-left transition-all ${
              mode === 'HEAR_PRONUNCIATION'
                ? 'border-rose-400 bg-white shadow-[0_10px_30px_rgba(244,63,94,0.12)]'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 flex items-center justify-center">
                <Mic className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <p className="font-black text-slate-900">
                  {labels.vocab?.dictationHearPron || 'Hear pronunciation'}
                </p>
                <p className="text-xs font-bold text-slate-400">
                  {labels.vocab?.dictationHearPronDesc || 'Write the word/meaning'}
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setMode('HEAR_MEANING')}
            className={`p-5 rounded-3xl border-[3px] text-left transition-all ${
              mode === 'HEAR_MEANING'
                ? 'border-rose-400 bg-white shadow-[0_10px_30px_rgba(244,63,94,0.12)]'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-100 flex items-center justify-center">
                <Type className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="font-black text-slate-900">
                  {labels.vocab?.dictationHearMeaning || 'Hear meaning'}
                </p>
                <p className="text-xs font-bold text-slate-400">
                  {labels.vocab?.dictationHearMeaningDesc || 'Write the word'}
                </p>
              </div>
            </div>
          </button>
        </div>

        <div className="rounded-[28px] bg-white border-[3px] border-slate-200 shadow-[0_10px_35px_rgba(0,0,0,0.06)] p-6 space-y-6">
          <div>
            <p className="text-xs font-black text-slate-400 tracking-wider uppercase mb-2">
              {labels.vocab?.repeatCount || 'Repetitions'}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {([1, 2, 3] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setPlayCount(v)}
                  className={`py-3 rounded-2xl border-[3px] font-black ${
                    playCount === v
                      ? 'border-rose-400 bg-rose-50 text-rose-600'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  {format(labels.vocab?.repeatTimes || '{count}x', { count: v })}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-black text-slate-400 tracking-wider uppercase mb-2">
              {labels.vocab?.playGap || 'Repeat interval'}
            </p>
            <div className="grid grid-cols-4 gap-2">
              {([2, 4, 6, 8] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setGapSeconds(v)}
                  className={`py-3 rounded-2xl border-[3px] font-black ${
                    gapSeconds === v
                      ? 'border-rose-400 bg-rose-50 text-rose-600'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  {format(labels.vocab?.seconds || '{count}s', { count: v })}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border-2 border-slate-100">
            <span className="font-black text-slate-800">
              {labels.vocab?.autoNext || 'Auto next'}
            </span>
            <input
              type="checkbox"
              checked={autoNext}
              onChange={e => setAutoNext(e.target.checked)}
              className="w-6 h-6 accent-rose-500"
            />
          </label>

          <button
            onClick={start}
            className="w-full py-4 rounded-2xl bg-rose-500 text-white font-black border-[3px] border-rose-400"
          >
            {labels.vocab?.dictationStartButton || 'Start playback'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50">
      <div className="sticky top-0 z-20 bg-white/70 backdrop-blur-xl border-b-[3px] border-rose-100">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-center justify-between">
          <button
            onClick={() => navigate('/vocab-book')}
            className="p-2.5 rounded-2xl bg-white border-[3px] border-slate-200 hover:border-rose-300 transition-all duration-200"
            aria-label={labels.common?.back || 'Back'}
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>

          <div className="text-center">
            <p className="text-xs font-black text-rose-500 tracking-wider uppercase">
              {labels.vocab?.modeDictation || 'Dictation'}
            </p>
            <p className="text-sm font-black text-slate-700">
              {started ? `${index + 1}/${total || 0}` : ''}
            </p>
          </div>

          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2.5 rounded-2xl bg-white border-[3px] border-slate-200 hover:border-rose-300 transition-all duration-200"
            aria-label={labels.vocab?.settings || 'Settings'}
          >
            <Settings2 className="w-5 h-5 text-slate-700" />
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">{renderContent()}</div>

      <AnimatePresence>
        {settingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setSettingsOpen(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="w-full max-w-lg bg-white rounded-[28px] border-[3px] border-slate-200 shadow-2xl p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-xs font-black text-slate-400 tracking-wider uppercase">
                    {labels.vocab?.settings || labels.settings || 'Settings'}
                  </p>
                  <h2 className="text-2xl font-black text-slate-900">
                    {labels.vocab?.modeDictation || 'Dictation'}
                  </h2>
                </div>
                <button
                  onClick={() => setSettingsOpen(false)}
                  className="p-2 rounded-xl hover:bg-slate-100"
                  aria-label={labels.common?.close || 'Close'}
                >
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border-2 border-slate-100">
                  <span className="font-black text-slate-800">
                    {labels.vocab?.autoNext || 'Auto next'}
                  </span>
                  <input
                    type="checkbox"
                    checked={autoNext}
                    onChange={e => setAutoNext(e.target.checked)}
                    className="w-6 h-6 accent-rose-500"
                  />
                </label>
              </div>

              <button
                onClick={() => setSettingsOpen(false)}
                className="mt-6 w-full py-3 rounded-2xl bg-slate-900 text-white font-black"
              >
                {labels.done || 'Done'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VocabBookDictationPage;
