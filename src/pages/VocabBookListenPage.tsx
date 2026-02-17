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
import { motion } from 'framer-motion';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useAuth } from '../contexts/AuthContext';
import { getLabels } from '../utils/i18n';
import { VOCAB } from '../utils/convexRefs';
import { useTTS } from '../hooks/useTTS';
import { Dialog, DialogContent, DialogOverlay, DialogPortal } from '../components/ui';
import { Button } from '../components/ui';
import { Switch } from '../components/ui';

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
    <div className="sticky top-0 z-20 bg-card/70 backdrop-blur-xl border-b-[3px] border-amber-100 dark:border-amber-300/20">
      <div className="max-w-3xl mx-auto px-4 py-5 flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="auto"
          onClick={() => navigate('/vocab-book')}
          className="p-2.5 rounded-2xl bg-card border-[3px] border-border hover:border-amber-300 dark:hover:border-amber-300/35 transition-all duration-200"
          aria-label="返回"
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </Button>

        <div className="text-center">
          <p className="text-xs font-black text-amber-500 dark:text-amber-300 tracking-wider uppercase">
            {title}
          </p>
          <p className="text-sm font-black text-muted-foreground">
            {total === 0 ? '0/0' : `${index + 1}/${total}`}
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="auto"
          onClick={() => setSettingsOpen(true)}
          className="p-2.5 rounded-2xl bg-card border-[3px] border-border hover:border-amber-300 dark:hover:border-amber-300/35 transition-all duration-200"
          aria-label="设置"
        >
          <Settings2 className="w-5 h-5 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );

  const renderModeSelector = () => (
    <div className="grid grid-cols-2 gap-3">
      <Button
        type="button"
        variant="ghost"
        size="auto"
        onClick={() => {
          stopAll();
          setMode('BASIC');
        }}
        className={`!flex !w-full !items-start !justify-start p-4 rounded-3xl border-[3px] text-left transition-all ${
          mode === 'BASIC'
            ? 'border-amber-400 bg-card shadow-[0_10px_30px_rgba(245,158,11,0.15)] dark:border-amber-300/35 dark:shadow-[0_10px_30px_rgba(253,230,138,0.15)]'
            : 'border-border bg-card'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-400/14 flex items-center justify-center">
            <Headphones className="w-6 h-6 text-amber-700 dark:text-amber-300" />
          </div>
          <div>
            <p className="font-black text-foreground">{labels.vocab?.listenBasic || '基础模式'}</p>
            <p className="text-xs font-bold text-muted-foreground">
              {labels.vocab?.listenBasicDesc || '单词 + 例句'}
            </p>
          </div>
        </div>
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="auto"
        onClick={() => {
          stopAll();
          setMode('ADVANCED');
        }}
        className={`!flex !w-full !items-start !justify-start p-4 rounded-3xl border-[3px] text-left transition-all ${
          mode === 'ADVANCED'
            ? 'border-amber-400 bg-card shadow-[0_10px_30px_rgba(245,158,11,0.15)] dark:border-amber-300/35 dark:shadow-[0_10px_30px_rgba(253,230,138,0.15)]'
            : 'border-border bg-card'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-100 dark:bg-indigo-400/14 flex items-center justify-center">
            <Rocket className="w-6 h-6 text-indigo-600 dark:text-indigo-300" />
          </div>
          <div>
            <p className="font-black text-foreground">
              {labels.vocab?.listenAdvanced || '进阶模式'}
            </p>
            <p className="text-xs font-bold text-muted-foreground">
              {labels.vocab?.listenAdvancedDesc || '仅播单词'}
            </p>
          </div>
        </div>
      </Button>
    </div>
  );

  const renderBasicSettings = () => (
    <div className="space-y-3">
      <label className="flex items-center justify-between p-4 rounded-2xl bg-muted border-2 border-border">
        <span className="font-black text-muted-foreground">
          {labels.vocab?.playMeaning || '播放单词释义'}
        </span>
        <Switch
          checked={playMeaning}
          onCheckedChange={setPlayMeaning}
          className="h-6 w-11 data-[state=checked]:bg-amber-500 dark:data-[state=checked]:bg-amber-400/80 data-[state=unchecked]:bg-background border border-border"
        />
      </label>

      <label className="flex items-center justify-between p-4 rounded-2xl bg-muted border-2 border-border">
        <span className="font-black text-muted-foreground">
          {labels.vocab?.playExampleTranslation || '播放例句译文'}
        </span>
        <Switch
          checked={playExampleTranslation}
          onCheckedChange={setPlayExampleTranslation}
          className="h-6 w-11 data-[state=checked]:bg-amber-500 dark:data-[state=checked]:bg-amber-400/80 data-[state=unchecked]:bg-background border border-border"
        />
      </label>
    </div>
  );

  const renderAdvancedSettings = () => (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-black text-muted-foreground tracking-wider uppercase mb-2">
          {labels.vocab?.repeatCount || '单词播放次数'}
        </p>
        <div className="grid grid-cols-4 gap-2">
          {([1, 2, 3, 'INFINITE'] as const).map(v => (
            <Button
              type="button"
              variant="ghost"
              size="auto"
              key={String(v)}
              onClick={() => setRepeatCount(v)}
              className={`py-3 rounded-2xl border-[3px] font-black ${
                repeatCount === v
                  ? 'border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-300/35 dark:bg-amber-400/12 dark:text-amber-200'
                  : 'border-border bg-card text-muted-foreground'
              }`}
            >
              {v === 'INFINITE' ? labels.vocab?.infinite || '无限' : `${v}次`}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-black text-muted-foreground tracking-wider uppercase mb-2">
          {labels.vocab?.speed || '倍速'}
        </p>
        <div className="grid grid-cols-4 gap-2">
          {([0.8, 1, 1.2, 1.4] as const).map(v => (
            <Button
              type="button"
              variant="ghost"
              size="auto"
              key={String(v)}
              onClick={() => setSpeed(v)}
              className={`py-3 rounded-2xl border-[3px] font-black ${
                speed === v
                  ? 'border-amber-400 bg-amber-50 text-amber-700 dark:border-amber-300/35 dark:bg-amber-400/12 dark:text-amber-200'
                  : 'border-border bg-card text-muted-foreground'
              }`}
            >
              {v.toFixed(1)}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPlayerCard = () => {
    if (loading) {
      return (
        <div className="py-20 flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-amber-200 dark:border-amber-300/25 border-t-amber-500 dark:border-t-amber-300 rounded-full animate-spin" />
          <p className="text-muted-foreground font-bold">{labels.loading || '加载中...'}</p>
        </div>
      );
    }

    if (total === 0 || !current) {
      return (
        <div className="py-20 text-center">
          <div className="w-20 h-20 bg-muted rounded-[32px] flex items-center justify-center mx-auto mb-4 border-[3px] border-border">
            <Headphones className="w-10 h-10 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-black">{labels.vocab?.noData || '暂无数据'}</p>
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
            className="text-5xl font-black text-foreground tracking-tight"
          >
            {current.word}
          </motion.h1>
          <p className="text-xl font-bold text-muted-foreground">{current.pronunciation || ' '}</p>
        </div>

        <div className="flex items-center justify-center gap-6">
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={goPrev}
            className="p-4 rounded-2xl bg-muted border-[3px] border-border text-muted-foreground hover:border-amber-300 dark:hover:border-amber-300/35 transition-all active:scale-95"
            aria-label="上一个"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={playing ? stopAll : start}
            className={`w-20 h-20 rounded-[32px] flex items-center justify-center shadow-lg transition-all active:scale-90 ${
              playing
                ? 'bg-primary text-primary-foreground hover:bg-primary/90 dark:hover:bg-primary/80'
                : 'bg-amber-400 text-amber-950 dark:bg-amber-400/80 dark:text-amber-100 hover:bg-amber-500 dark:hover:bg-amber-300/80'
            }`}
          >
            {playing ? (
              <Square className="w-8 h-8 fill-current" />
            ) : (
              <Play className="w-8 h-8 fill-current ml-1" />
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={goNext}
            className="p-4 rounded-2xl bg-muted border-[3px] border-border text-muted-foreground hover:border-amber-300 dark:hover:border-amber-300/35 transition-all active:scale-95"
            aria-label="下一个"
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </div>

        <div className="bg-muted rounded-2xl p-5 border-2 border-border flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-card flex items-center justify-center border-2 border-border shrink-0">
            <Volume2 className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-foreground truncate">
              {current.meaning || current.meaningEn || '...'}
            </p>
            {current.exampleSentence && (
              <p className="text-xs font-bold text-muted-foreground truncate mt-0.5">
                {current.exampleSentence}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSettingsModal = () => (
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
                  {labels.settings || '设置'}
                </p>
                <h2 className="text-2xl font-black text-foreground">{title}</h2>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="auto"
                onClick={() => setSettingsOpen(false)}
                className="p-2 rounded-xl hover:bg-muted"
                aria-label="关闭"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </Button>
            </div>

            {mode === 'BASIC' ? renderBasicSettings() : renderAdvancedSettings()}

            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => setSettingsOpen(false)}
              className="mt-6 w-full py-3 rounded-2xl bg-primary text-primary-foreground font-black"
            >
              {labels.done || '完成'}
            </Button>
          </motion.div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 dark:from-amber-400/8 dark:via-background dark:to-amber-300/8">
      {renderHeader()}
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
        {renderModeSelector()}
        <div className="rounded-[28px] bg-card border-[3px] border-border shadow-[0_10px_35px_rgba(0,0,0,0.06)] p-6">
          {renderPlayerCard()}
        </div>
      </div>
      {renderSettingsModal()}
    </div>
  );
};

export default VocabBookListenPage;
