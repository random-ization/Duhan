import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { Mic, Type, Play, Square, Settings2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { m as motion } from 'framer-motion';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useAuth } from '../contexts/AuthContext';
import { getLabels } from '../utils/i18n';
import { getLocalizedContent } from '../utils/languageUtils';
import { VOCAB } from '../utils/convexRefs';
import { useTTS } from '../hooks/useTTS';
import { VocabBookDictationSkeleton } from '../components/common';
import { Dialog, DialogContent, DialogOverlay, DialogPortal } from '../components/ui';
import { Button } from '../components/ui';
import { Switch } from '../components/ui';
import { useGlobalSettings } from '../hooks/useGlobalSettings';
import { buildVocabBookPath } from '../utils/vocabBookRoutes';
import {
  matchesVocabBookPracticeCategory,
  normalizeVocabBookPracticeCategory,
  type VocabBookPracticeCategory,
} from '../utils/vocabBookPractice';
import {
  buildVocabBookPracticeSessionStorageKey,
  loadVocabBookDictationSessionState,
  persistVocabBookDictationSessionState,
} from '../utils/vocabBookPracticeSession';
import type { VocabBookItemDto } from '../../convex/vocab';

type DictationMode = 'HEAR_PRONUNCIATION' | 'HEAR_MEANING';

const KOREAN_VOICE = 'ko-KR-SunHiNeural';
const ZH_VOICE = 'zh-CN-XiaoxiaoNeural';
const EN_VOICE = 'en-US-JennyNeural';
const VI_VOICE = 'vi-VN-HoaiMyNeural';
const MN_VOICE = 'mn-MN-YesuiNeural';

const PAGE_SIZE = 80;
const PREFETCH_THRESHOLD = 10;

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

const resolveMeaningVoice = (language?: string): string => {
  const normalized = (language || '').toLowerCase();
  if (normalized.startsWith('en')) return EN_VOICE;
  if (normalized.startsWith('vi')) return VI_VOICE;
  if (normalized.startsWith('mn')) return MN_VOICE;
  return ZH_VOICE;
};

const getLocalizedMeaning = (word: VocabBookItemDto, language?: string): string =>
  getLocalizedContent(word as never, 'meaning', (language || 'zh') as never) ||
  word.meaning ||
  word.meaningEn ||
  word.meaningVi ||
  word.meaningMn ||
  '';

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
  <div className="space-y-4">
    <div className="rounded-[28px] bg-[linear-gradient(135deg,#5A7394_0%,#8B7299_100%)] p-6 text-white shadow-[0_20px_45px_rgba(31,27,23,0.25)]">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute right-0 top-[-22px] font-serif text-[92px] leading-none text-white/10">
          聽
        </div>
        <div className="relative">
          <div className="inline-flex rounded-full border border-white/30 bg-white/15 px-3 py-1 text-[11px] font-black tracking-[0.12em]">
            {mode === 'HEAR_PRONUNCIATION'
              ? labels.vocab?.dictationHearPron || 'Hear pronunciation'
              : labels.vocab?.dictationHearMeaning || 'Hear meaning'}
          </div>
          <div className="mt-5 flex h-[52px] items-end justify-center gap-1">
            {[0.25, 0.62, 0.8, 1, 0.92, 0.68, 0.4, 0.72, 0.95, 0.86, 0.7, 0.52, 0.34].map(
              (height, idx) => (
                <span
                  key={`wave-${idx}`}
                  className="w-[3px] rounded-full bg-white/90"
                  style={{ height: `${Math.round(height * 50)}px`, opacity: 0.35 + height * 0.55 }}
                />
              )
            )}
          </div>
          <div className="mt-4 text-center text-xs font-bold tracking-[0.12em] text-white/75">
            {statusText}
          </div>
        </div>
      </div>
    </div>

    <div className="rounded-[22px] border border-[#E3D8C5] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onPrev}
          className="grid h-10 w-10 place-items-center rounded-full border border-[#D6C8B2] bg-[#F9F3E6] text-[#1F1B17]"
          aria-label={labels.common?.prev || 'Previous'}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {playing ? (
          <button
            type="button"
            onClick={onStop}
            className="grid h-14 w-14 place-items-center rounded-full bg-[#1F1B17] text-white shadow-[0_10px_24px_rgba(31,27,23,0.25)]"
            aria-label={labels.vocab?.stop || 'Stop'}
          >
            <Square className="h-5 w-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onStartPlayback}
            className="grid h-14 w-14 place-items-center rounded-full bg-[#1F1B17] text-white shadow-[0_10px_24px_rgba(31,27,23,0.25)]"
            aria-label={labels.vocab?.play || 'Play'}
          >
            <Play className="h-6 w-6" />
          </button>
        )}

        <button
          type="button"
          onClick={onNext}
          className="grid h-10 w-10 place-items-center rounded-full border border-[#D6C8B2] bg-[#F9F3E6] text-[#1F1B17]"
          aria-label={labels.common?.next || 'Next'}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { key: '慢', label: labels.vocab?.playGap || 'Repeat gap' },
          { key: '文', label: labels.vocab?.dictationPlayerTitle || 'Dictation' },
          { key: '譯', label: labels.vocab?.dictationHearMeaning || 'Meaning' },
        ].map(item => (
          <div
            key={item.key}
            className="rounded-xl border border-[#E3D8C5] bg-[#F9F3E6] px-2 py-2 text-center"
          >
            <div className="font-serif text-[13px] font-semibold text-[#A23B2E]">{item.key}</div>
            <div className="mt-1 text-[10px] font-bold text-[#8C8377]">{item.label}</div>
          </div>
        ))}
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
  playCount: DictationPlayCount;
  setPlayCount: (value: DictationPlayCount) => void;
  gapSeconds: DictationGapSeconds;
  setGapSeconds: (value: DictationGapSeconds) => void;
  autoNext: boolean;
  setAutoNext: (value: boolean) => void;
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
          {DICTATION_PLAY_COUNT_VALUES.map(v => (
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
          {DICTATION_GAP_SECOND_VALUES.map(v => (
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
  playCount: DictationPlayCount;
  setPlayCount: (value: DictationPlayCount) => void;
  gapSeconds: DictationGapSeconds;
  setGapSeconds: (value: DictationGapSeconds) => void;
  autoNext: boolean;
  setAutoNext: (value: boolean) => void;
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
  <div className="min-h-screen bg-[#F5EFE2] text-[#1F1B17]">{children}</div>
);

const DictationTopBar = ({
  labels,
  total,
  progressText,
  onBack,
  onOpenSettings,
}: {
  labels: ReturnType<typeof getLabels>;
  total: number;
  progressText: string;
  onBack: () => void;
  onOpenSettings?: () => void;
}) => (
  <div className="sticky top-0 z-20 border-b border-[#E3D8C5] bg-[#F5EFE2]/95 px-5 pb-3 pt-[calc(env(safe-area-inset-top)+12px)] backdrop-blur">
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        className="grid h-10 w-10 place-items-center rounded-full bg-black/5 text-[#1F1B17]"
        aria-label={labels.common?.back || 'Back'}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div className="flex-1 text-center">
        <div className="text-[11px] font-black tracking-[0.16em] text-[#8C8377]">
          聽寫 · {progressText || `0/${total}`}
        </div>
        <div className="mt-0.5 text-sm font-black text-[#1F1B17]">
          {labels.vocab?.modeDictation || 'Dictation'}
        </div>
      </div>
      {onOpenSettings ? (
        <button
          type="button"
          onClick={onOpenSettings}
          className="grid h-10 w-10 place-items-center rounded-full bg-black/5 text-[#1F1B17]"
          aria-label={labels.vocab?.settings || 'Settings'}
        >
          <Settings2 className="h-4 w-4" />
        </button>
      ) : (
        <span className="h-10 w-10" />
      )}
    </div>
  </div>
);

const DictationSettingsDialog = ({
  open,
  labels,
  playCount,
  setPlayCount,
  gapSeconds,
  setGapSeconds,
  autoNext,
  setAutoNext,
  onClose,
}: {
  open: boolean;
  labels: ReturnType<typeof getLabels>;
  playCount: DictationPlayCount;
  setPlayCount: (value: DictationPlayCount) => void;
  gapSeconds: DictationGapSeconds;
  setGapSeconds: (value: DictationGapSeconds) => void;
  autoNext: boolean;
  setAutoNext: (value: boolean) => void;
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
            <div>
              <p className="text-xs font-black text-muted-foreground tracking-wider uppercase mb-2">
                {labels.vocab?.repeatCount || 'Repetitions'}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {DICTATION_PLAY_COUNT_VALUES.map(option => (
                  <Button
                    key={option}
                    type="button"
                    variant="ghost"
                    size="auto"
                    onClick={() => setPlayCount(option)}
                    className={`py-3 rounded-2xl border-[3px] font-black ${
                      playCount === option
                        ? 'border-rose-400 bg-rose-50 text-rose-600 dark:border-rose-300/35 dark:bg-rose-400/12 dark:text-rose-200'
                        : 'border-border bg-card text-muted-foreground'
                    }`}
                  >
                    {formatTemplate(labels.vocab?.repeatTimes || '{count}x', { count: option })}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-black text-muted-foreground tracking-wider uppercase mb-2">
                {labels.vocab?.playGap || 'Repeat interval'}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {DICTATION_GAP_SECOND_VALUES.map(option => (
                  <Button
                    key={option}
                    type="button"
                    variant="ghost"
                    size="auto"
                    onClick={() => setGapSeconds(option)}
                    className={`py-3 rounded-2xl border-[3px] font-black ${
                      gapSeconds === option
                        ? 'border-rose-400 bg-rose-50 text-rose-600 dark:border-rose-300/35 dark:bg-rose-400/12 dark:text-rose-200'
                        : 'border-border bg-card text-muted-foreground'
                    }`}
                  >
                    {formatTemplate(labels.vocab?.seconds || '{count}s', { count: option })}
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
  const meaningVoice = useMemo(() => resolveMeaningVoice(language), [language]);
  const [params] = useSearchParams();
  const backPath = useMemo(() => buildVocabBookPath(params), [params]);
  const sessionStorageKey = useMemo(
    () => buildVocabBookPracticeSessionStorageKey('dictation', params),
    [params]
  );
  const persistedState = useMemo(
    () => loadVocabBookDictationSessionState(sessionStorageKey),
    [sessionStorageKey]
  );
  const { speak, stop } = useTTS();

  useEffect(() => stop, [stop]);

  const categoryParam = (params.get('category') || 'DUE').toUpperCase();
  const q = params.get('q')?.trim();
  const selected = params.get('selected')?.trim();
  const selectedWordIds = useMemo(
    () =>
      selected
        ? selected
            .split(',')
            .map(id => id.trim())
            .filter(Boolean)
        : undefined,
    [selected]
  );
  const category: VocabBookPracticeCategory = normalizeVocabBookPracticeCategory(categoryParam);

  const [pageCursor, setPageCursor] = useState<string | null>(null);
  const [loadedItems, setLoadedItems] = useState<VocabBookItemDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const vocabBookPage = useQuery(VOCAB.getVocabBookPage, {
    includeMastered: true,
    search: q || undefined,
    savedByUserOnly: true,
    selectedWordIds,
    category,
    cursor: pageCursor || undefined,
    limit: PAGE_SIZE,
  });
  const loading = vocabBookPage === undefined && loadedItems.length === 0;
  const loadingMore = vocabBookPage === undefined && loadedItems.length > 0;

  useEffect(() => {
    if (!vocabBookPage) return;
    setNextCursor(vocabBookPage.nextCursor);
    setLoadedItems(prev => {
      if (pageCursor === null) return vocabBookPage.items;
      const existing = new Set(prev.map(item => String(item.id)));
      const appended = vocabBookPage.items.filter(item => !existing.has(String(item.id)));
      return [...prev, ...appended];
    });
  }, [vocabBookPage, pageCursor]);

  const items = useMemo(() => loadedItems, [loadedItems]);

  const filtered = useMemo(() => {
    return items.filter(item => matchesVocabBookPracticeCategory(item.progress, category));
  }, [items, category]);

  const [mode, setMode] = useState<DictationMode>(
    () => persistedState?.mode ?? 'HEAR_PRONUNCIATION'
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { settings, updateSettings } = useGlobalSettings();
  const playCount = settings.dictationPlayCount;
  const gapSeconds = settings.dictationGapSeconds;
  const autoNext = settings.dictationAutoNext;
  const setPlayCount = (value: DictationPlayCount) => {
    void updateSettings({ dictationPlayCount: value });
  };
  const setGapSeconds = (value: DictationGapSeconds) => {
    void updateSettings({ dictationGapSeconds: value });
  };
  const setAutoNext = (value: boolean) => {
    void updateSettings({ dictationAutoNext: value });
  };

  const [started, setStarted] = useState(() => persistedState?.started ?? false);
  const [index, setIndex] = useState(() => persistedState?.index ?? 0);
  const indexRef = useRef(0);
  const totalRef = useRef(0);

  useLayoutEffect(() => {
    setPageCursor(null);
    setLoadedItems([]);
    setNextCursor(null);
    setIndex(persistedState?.index ?? 0);
    setStarted(persistedState?.started ?? false);
    setMode(persistedState?.mode ?? 'HEAR_PRONUNCIATION');
  }, [persistedState, sessionStorageKey]);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  const total = filtered.length;
  useEffect(() => {
    totalRef.current = total;
    if (total === 0) return;
    setIndex(prev => Math.min(prev, total - 1));
  }, [total]);

  useEffect(() => {
    persistVocabBookDictationSessionState(sessionStorageKey, {
      index,
      started,
      mode,
      timestamp: Date.now(),
    });
  }, [index, mode, sessionStorageKey, started]);

  useEffect(() => {
    if (!nextCursor || loadingMore || total === 0) return;
    if (total - index <= PREFETCH_THRESHOLD) {
      setPageCursor(nextCursor);
    }
  }, [index, total, nextCursor, loadingMore]);

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
    const promptText = mode === 'HEAR_PRONUNCIATION' ? w.word : getLocalizedMeaning(w, language);
    const voice = mode === 'HEAR_PRONUNCIATION' ? KOREAN_VOICE : meaningVoice;

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
        if (indexRef.current >= totalRef.current - 1) return;
        setIndex(i => Math.min(Math.max(0, totalRef.current - 1), i + 1));
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
        <DictationTopBar
          labels={labels}
          total={total}
          progressText=""
          onBack={() => navigate(backPath)}
        />
        <VocabBookDictationSkeleton />
      </DictationPageShell>
    );
  }

  return (
    <DictationPageShell>
      <DictationTopBar
        labels={labels}
        total={total}
        progressText={started ? `${index + 1}/${total || 0}` : ''}
        onBack={() => navigate(backPath)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="max-w-3xl mx-auto px-4 py-8 pb-[calc(var(--mobile-safe-bottom)+2rem)]">
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
        playCount={playCount}
        setPlayCount={setPlayCount}
        gapSeconds={gapSeconds}
        setGapSeconds={setGapSeconds}
        autoNext={autoNext}
        setAutoNext={setAutoNext}
        onClose={() => setSettingsOpen(false)}
      />
    </DictationPageShell>
  );
};

export default VocabBookDictationPage;
