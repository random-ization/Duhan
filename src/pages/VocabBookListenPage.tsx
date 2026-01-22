import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import {
  ArrowLeft,
  Headphones,
  Rocket,
  Settings2,
  Play,
  Square,
  ChevronLeft,
  ChevronRight,
  Volume2,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useAuth } from '../contexts/AuthContext';
import { getLabels } from '../utils/i18n';
import { VOCAB } from '../utils/convexRefs';
import { useTTS } from '../hooks/useTTS';

type VocabBookCategory = 'UNLEARNED' | 'DUE' | 'MASTERED';
type ListenMode = 'BASIC' | 'ADVANCED';

const KOREAN_VOICE = 'ko-KR-SunHiNeural';
const ZH_VOICE = 'zh-CN-XiaoxiaoNeural';

function rateForSpeed(speed: number): string {
  if (speed <= 0.8) return '-20%';
  if (speed <= 1.0) return '0%';
  if (speed <= 1.2) return '+20%';
  return '+40%';
}

const VocabBookListenPage: React.FC = () => {
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
      const c: VocabBookCategory = isMastered ? 'MASTERED' : isUnlearned ? 'UNLEARNED' : 'DUE';
      return c === category;
    });
  }, [items, category]);

  const [mode, setMode] = useState<ListenMode>('BASIC');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [playMeaning, setPlayMeaning] = useState(true);
  const [playExampleTranslation, setPlayExampleTranslation] = useState(true);

  const [repeatCount, setRepeatCount] = useState<1 | 2 | 3 | 'INFINITE'>(2);
  const [speed, setSpeed] = useState<0.8 | 1.0 | 1.2 | 1.4>(1.0);

  const [index, setIndex] = useState(0);
  const indexRef = useRef(0);
  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    setIndex(0);
  }, [category, q]);

  const total = filtered.length;
  const current = filtered[index];

  const runIdRef = useRef(0);
  const [playing, setPlaying] = useState(false);

  const stopAll = () => {
    runIdRef.current += 1;
    stop();
    setPlaying(false);
  };

  const goPrev = () => {
    if (total === 0) return;
    setIndex(i => (i - 1 + total) % total);
  };

  const goNext = () => {
    if (total === 0) return;
    setIndex(i => (i + 1) % total);
  };

  const speakLocalizedMeaning = async (text: string) => {
    await speak(text, { voice: ZH_VOICE });
  };

  const speakKorean = async (text: string, rate?: string) => {
    await speak(text, { voice: KOREAN_VOICE, rate });
  };

  const playOnce = async (myRunId: number) => {
    const word = filtered[indexRef.current];
    if (!word) return;

    if (mode === 'ADVANCED') {
      const rate = rateForSpeed(speed);
      if (repeatCount === 'INFINITE') {
        while (myRunId === runIdRef.current) {
          await speakKorean(word.word, rate);
        }
        return;
      }

      const n = repeatCount;
      for (let i = 0; i < n; i += 1) {
        if (myRunId !== runIdRef.current) return;
        await speakKorean(word.word, rate);
      }
      if (myRunId !== runIdRef.current) return;
      goNext();
      return;
    }

    await speakKorean(word.word);
    if (myRunId !== runIdRef.current) return;

    if (playMeaning) {
      const meaning = word.meaning || word.meaningEn || word.meaningVi || word.meaningMn;
      if (meaning) {
        await speakLocalizedMeaning(meaning);
      }
      if (myRunId !== runIdRef.current) return;
    }

    if (word.exampleSentence) {
      await speakKorean(word.exampleSentence);
      if (myRunId !== runIdRef.current) return;
    }

    if (playExampleTranslation) {
      const ex =
        word.exampleMeaning ||
        word.exampleMeaningEn ||
        word.exampleMeaningVi ||
        word.exampleMeaningMn;
      if (ex) {
        await speakLocalizedMeaning(ex);
      }
      if (myRunId !== runIdRef.current) return;
    }

    goNext();
  };

  const start = async () => {
    if (playing) return;
    if (total === 0) return;

    const myRunId = (runIdRef.current += 1);
    setPlaying(true);

    try {
      while (myRunId === runIdRef.current) {
        await playOnce(myRunId);
        if (mode === 'ADVANCED' && repeatCount === 'INFINITE') {
          return;
        }
        if (myRunId !== runIdRef.current) return;
      }
    } finally {
      if (myRunId === runIdRef.current) {
        setPlaying(false);
      }
    }
  };

  const title = labels.vocab?.modeListen || '随身听';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50">
      <div className="sticky top-0 z-20 bg-white/70 backdrop-blur-xl border-b-[3px] border-amber-100">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-center justify-between">
          <button
            onClick={() => navigate('/vocab-book')}
            className="p-2.5 rounded-2xl bg-white border-[3px] border-slate-200 hover:border-amber-300 transition-all duration-200"
            aria-label="返回"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>

          <div className="text-center">
            <p className="text-xs font-black text-amber-500 tracking-wider uppercase">{title}</p>
            <p className="text-sm font-black text-slate-700">
              {total === 0 ? '0/0' : `${index + 1}/${total}`}
            </p>
          </div>

          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2.5 rounded-2xl bg-white border-[3px] border-slate-200 hover:border-amber-300 transition-all duration-200"
            aria-label="设置"
          >
            <Settings2 className="w-5 h-5 text-slate-700" />
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              stopAll();
              setMode('BASIC');
            }}
            className={`p-4 rounded-3xl border-[3px] text-left transition-all ${
              mode === 'BASIC'
                ? 'border-amber-400 bg-white shadow-[0_10px_30px_rgba(245,158,11,0.15)]'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-100 flex items-center justify-center">
                <Headphones className="w-6 h-6 text-amber-700" />
              </div>
              <div>
                <p className="font-black text-slate-900">
                  {labels.vocab?.listenBasic || '基础模式'}
                </p>
                <p className="text-xs font-bold text-slate-400">
                  {labels.vocab?.listenBasicDesc || '单词 + 例句'}
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => {
              stopAll();
              setMode('ADVANCED');
            }}
            className={`p-4 rounded-3xl border-[3px] text-left transition-all ${
              mode === 'ADVANCED'
                ? 'border-amber-400 bg-white shadow-[0_10px_30px_rgba(245,158,11,0.15)]'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-100 flex items-center justify-center">
                <Rocket className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="font-black text-slate-900">
                  {labels.vocab?.listenAdvanced || '进阶模式'}
                </p>
                <p className="text-xs font-bold text-slate-400">
                  {labels.vocab?.listenAdvancedDesc || '仅播单词'}
                </p>
              </div>
            </div>
          </button>
        </div>

        <div className="rounded-[28px] bg-white border-[3px] border-slate-200 shadow-[0_10px_35px_rgba(0,0,0,0.06)] p-6">
          {loading ? (
            <p className="text-slate-400 font-bold">{labels.common?.loading || 'Loading...'}</p>
          ) : total === 0 ? (
            <p className="text-slate-500 font-bold">
              {labels.dashboard?.vocab?.noDueNow || '暂无单词'}
            </p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                    {current.word}
                  </h1>
                  <p className="mt-2 text-slate-600 font-bold">{current.meaning}</p>
                  {current.exampleSentence && (
                    <p className="mt-3 text-sm text-slate-500 font-medium">
                      {current.exampleSentence}
                    </p>
                  )}
                </div>
                <button
                  onClick={async () => {
                    stopAll();
                    await speak(current.word, { voice: KOREAN_VOICE });
                  }}
                  className="p-3 rounded-2xl bg-slate-900 text-white hover:bg-slate-800"
                  aria-label="播放当前"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => {
                    stopAll();
                    goPrev();
                  }}
                  className="px-4 py-3 rounded-2xl border-[3px] border-slate-200 font-black text-slate-700 hover:border-slate-300 inline-flex items-center gap-2"
                >
                  <ChevronLeft className="w-5 h-5" />
                  {labels.common?.prev || '上一词'}
                </button>

                {playing ? (
                  <button
                    onClick={stopAll}
                    className="px-5 py-3 rounded-2xl bg-rose-500 text-white font-black border-[3px] border-rose-400 inline-flex items-center gap-2"
                  >
                    <Square className="w-5 h-5" />
                    {labels.vocab?.stop || '停止'}
                  </button>
                ) : (
                  <button
                    onClick={start}
                    className="px-5 py-3 rounded-2xl bg-amber-500 text-white font-black border-[3px] border-amber-400 inline-flex items-center gap-2"
                  >
                    <Play className="w-5 h-5" />
                    {labels.vocab?.play || '播放'}
                  </button>
                )}

                <button
                  onClick={() => {
                    stopAll();
                    goNext();
                  }}
                  className="px-4 py-3 rounded-2xl border-[3px] border-slate-200 font-black text-slate-700 hover:border-slate-300 inline-flex items-center gap-2"
                >
                  {labels.common?.next || '下一词'}
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

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
                    {labels.settings || '设置'}
                  </p>
                  <h2 className="text-2xl font-black text-slate-900">{title}</h2>
                </div>
                <button
                  onClick={() => setSettingsOpen(false)}
                  className="p-2 rounded-xl hover:bg-slate-100"
                  aria-label="关闭"
                >
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              {mode === 'BASIC' ? (
                <div className="space-y-3">
                  <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border-2 border-slate-100">
                    <span className="font-black text-slate-800">
                      {labels.vocab?.playMeaning || '播放单词释义'}
                    </span>
                    <input
                      type="checkbox"
                      checked={playMeaning}
                      onChange={e => setPlayMeaning(e.target.checked)}
                      className="w-6 h-6 accent-amber-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border-2 border-slate-100">
                    <span className="font-black text-slate-800">
                      {labels.vocab?.playExampleTranslation || '播放例句译文'}
                    </span>
                    <input
                      type="checkbox"
                      checked={playExampleTranslation}
                      onChange={e => setPlayExampleTranslation(e.target.checked)}
                      className="w-6 h-6 accent-amber-500"
                    />
                  </label>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <p className="text-xs font-black text-slate-400 tracking-wider uppercase mb-2">
                      {labels.vocab?.repeatCount || '单词播放次数'}
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {([1, 2, 3, 'INFINITE'] as const).map(v => (
                        <button
                          key={String(v)}
                          onClick={() => setRepeatCount(v)}
                          className={`py-3 rounded-2xl border-[3px] font-black ${
                            repeatCount === v
                              ? 'border-amber-400 bg-amber-50 text-amber-700'
                              : 'border-slate-200 bg-white text-slate-700'
                          }`}
                        >
                          {v === 'INFINITE' ? labels.vocab?.infinite || '无限' : `${v}次`}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-black text-slate-400 tracking-wider uppercase mb-2">
                      {labels.vocab?.speed || '倍速'}
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {([0.8, 1.0, 1.2, 1.4] as const).map(v => (
                        <button
                          key={String(v)}
                          onClick={() => setSpeed(v)}
                          className={`py-3 rounded-2xl border-[3px] font-black ${
                            speed === v
                              ? 'border-amber-400 bg-amber-50 text-amber-700'
                              : 'border-slate-200 bg-white text-slate-700'
                          }`}
                        >
                          {v.toFixed(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() => setSettingsOpen(false)}
                className="mt-6 w-full py-3 rounded-2xl bg-slate-900 text-white font-black"
              >
                {labels.done || '完成'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VocabBookListenPage;
