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
  if (speed <= 1) return '0%';
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
      let c: VocabBookCategory = 'DUE';
      if (isMastered) {
        c = 'MASTERED';
      } else if (isUnlearned) {
        c = 'UNLEARNED';
      }
      return c === category;
    });
  }, [items, category]);

  const [mode, setMode] = useState<ListenMode>('BASIC');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [playMeaning, setPlayMeaning] = useState(true);
  const [playExampleTranslation, setPlayExampleTranslation] = useState(true);

  const [repeatCount, setRepeatCount] = useState<1 | 2 | 3 | 'INFINITE'>(2);
  const [speed, setSpeed] = useState<0.8 | 1 | 1.2 | 1.4>(1);

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

  const playAdvancedMode = async (word: any, myRunId: number) => {
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
  };

  const playBasicMode = async (word: any, myRunId: number) => {
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

  const playOnce = async (myRunId: number) => {
    const word = filtered[indexRef.current];
    if (!word) return;

    if (mode === 'ADVANCED') {
      await playAdvancedMode(word, myRunId);
    } else {
      await playBasicMode(word, myRunId);
    }
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

  const renderHeader = () => (
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
  );

  const renderModeSelector = () => (
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
            <p className="font-black text-slate-900">{labels.vocab?.listenBasic || '基础模式'}</p>
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
            <p className="font-black text-slate-900">{labels.vocab?.listenAdvanced || '进阶模式'}</p>
            <p className="text-xs font-bold text-slate-400">
              {labels.vocab?.listenAdvancedDesc || '仅播单词'}
            </p>
          </div>
        </div>
      </button>
    </div>
  );

  const renderBasicSettings = () => (
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
  );

  const renderAdvancedSettings = () => (
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
          {([0.8, 1, 1.2, 1.4] as const).map(v => (
            <button
              key={String(v)}
              onClick={() => setSpeed(v)}
              className={`py-3 rounded-2xl border-[3px] font-black ${
                speed === v ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              {v.toFixed(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPlayerCard = () => {
    if (loading) {
      return (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-slate-400 font-bold">{labels.loading || '加载中...'}</p>
        </div>
      );
    }

    if (total === 0 || !current) {
      return (
        <div className="py-20 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center mx-auto mb-4 border-[3px] border-slate-100">
            <Headphones className="w-10 h-10 text-slate-200" />
          </div>
          <p className="text-slate-400 font-black">{labels.vocab?.noData || '暂无数据'}</p>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <motion.h1
            key={`word-${index}`}
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-5xl font-black text-slate-900 tracking-tight"
          >
            {current.word}
          </motion.h1>
          <p className="text-xl font-bold text-slate-400">
            {current.pronunciation || ' '}
          </p>
        </div>

        <div className="flex items-center justify-center gap-6">
          <button
            onClick={goPrev}
            className="p-4 rounded-2xl bg-slate-50 border-[3px] border-slate-200 text-slate-600 hover:border-amber-300 transition-all active:scale-95"
            aria-label="上一个"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={playing ? stopAll : start}
            className={`w-20 h-20 rounded-[32px] flex items-center justify-center shadow-lg transition-all active:scale-90 ${
              playing
                ? 'bg-slate-900 text-white hover:bg-slate-800'
                : 'bg-amber-400 text-amber-950 hover:bg-amber-500'
            }`}
          >
            {playing ? (
              <Square className="w-8 h-8 fill-current" />
            ) : (
              <Play className="w-8 h-8 fill-current ml-1" />
            )}
          </button>

          <button
            onClick={goNext}
            className="p-4 rounded-2xl bg-slate-50 border-[3px] border-slate-200 text-slate-600 hover:border-amber-300 transition-all active:scale-95"
            aria-label="下一个"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        <div className="bg-slate-50 rounded-2xl p-5 border-2 border-slate-100 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center border-2 border-slate-100 shrink-0">
            <Volume2 className="w-5 h-5 text-slate-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-900 truncate">
              {current.meaning || current.meaningEn || '...'}
            </p>
            {current.exampleSentence && (
              <p className="text-xs font-bold text-slate-400 truncate mt-0.5">
                {current.exampleSentence}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSettingsModal = () => (
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

            {mode === 'BASIC' ? renderBasicSettings() : renderAdvancedSettings()}

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
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50">
      {renderHeader()}
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
        {renderModeSelector()}
        <div className="rounded-[28px] bg-white border-[3px] border-slate-200 shadow-[0_10px_35px_rgba(0,0,0,0.06)] p-6">
          {renderPlayerCard()}
        </div>
      </div>
      {renderSettingsModal()}
    </div>
  );
};

export default VocabBookListenPage;
