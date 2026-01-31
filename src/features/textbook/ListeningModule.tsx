import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ArrowLeft, Settings, Volume2, Plus, Languages, Headphones, X } from 'lucide-react';
import { useQuery, useAction, useMutation } from 'convex/react';
import { aRef, qRef, mRef } from '../../utils/convexRefs';
import { StickyAudioPlayer } from '../../components/audio/StickyAudioPlayer';
import { Language } from '../../types';
import { getLocalizedContent } from '../../utils/languageUtils';
import { getLabels } from '../../utils/i18n';
import { ListeningModuleSkeleton } from '../../components/common';
import { useTTS } from '../../hooks/useTTS';
import { extractBestMeaning, normalizeLookupWord } from '../../utils/dictionaryMeaning';

// =========================================
// Types
// =========================================

interface TranscriptSegment {
  start: number; // Start time in seconds
  end: number; // End time in seconds
  text: string; // Korean text
  translation?: string; // Chinese translation
  translationEn?: string;
  translationVi?: string;
  translationMn?: string;
  tokens?: { surface: string; base: string; pos: string }[];
}

interface UnitData {
  id: string;
  title: string;
  audioUrl: string;
  transcriptData?: TranscriptSegment[];
}

interface VocabItem {
  id: string;
  korean: string;
  meaning: string;
  pronunciation?: string;
  hanja?: string;
  pos?: string;
  exampleSentence?: string;
  exampleMeaning?: string;
}

interface DictionaryEntry {
  targetCode: string;
  word: string;
  pronunciation?: string;
  pos?: string;
  senses: Array<{
    order: number;
    definition: string;
    translation?: { lang: string; word: string; definition: string };
  }>;
}

interface SearchResult {
  total: number;
  start: number;
  num: number;
  entries: DictionaryEntry[];
}

interface MorphologyLookupResult {
  token: { surface: string; lemma: string; pos: string | null; begin: number | null; len: number | null };
  morphemes: Array<{ form: string; tag: string; begin: number; len: number }>;
  wordFromDb: null | {
    word: string;
    meaning: string;
    partOfSpeech: string;
    pronunciation?: string;
    hanja?: string;
    audioUrl?: string;
  };
  grammarMatches: Array<{ id: string; title: string; summary: string; type: string; level: string }>;
  krdict: SearchResult | null;
  krdictError: string | null;
}

// =========================================
// Sub-Components
// =========================================

// Word Flashcard Popover
interface FlashcardPopoverProps {
  word: string;
  lemma?: string;
  meaning: string;
  contextTranslation?: string;
  grammarMatches?: Array<{ id: string; title: string; summary: string; type: string; level: string }>;
  position: { x: number; y: number };
  onClose: () => void;
  onSave: () => void;
  onSpeak: () => void;
  language: Language;
}

const FlashcardPopover: React.FC<FlashcardPopoverProps> = ({
  word,
  lemma,
  meaning,
  contextTranslation,
  grammarMatches,
  position,
  onClose,
  onSave,
  onSpeak,
  language,
}) => {
  const labels = getLabels(language);
  const headword = lemma || word;
  return (
    <div
      className="fixed z-50 bg-[#FDFBF7] border-2 border-zinc-900 rounded-lg shadow-[4px_4px_0px_0px_#18181B] p-4 min-w-[200px]"
      style={{ left: position.x, top: position.y }}
    >
      <button
        onClick={onClose}
        className="absolute -top-2 -right-2 w-6 h-6 bg-zinc-900 text-white rounded-full flex items-center justify-center hover:bg-red-500 transition-colors"
      >
        <X className="w-3 h-3" />
      </button>

      <div className="text-xl font-black text-zinc-900 mb-1">{headword}</div>
      {lemma && lemma !== word && <div className="text-xs text-zinc-500 mb-2">{word}</div>}
      <div className="text-sm text-zinc-600 mb-3">{meaning}</div>
      {grammarMatches && grammarMatches.length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-bold text-zinc-900 mb-1">语法</div>
          <div className="space-y-1">
            {grammarMatches.slice(0, 5).map(g => (
              <div key={g.id} className="text-xs text-zinc-700">
                <span className="font-bold">{g.title}</span>
                {g.summary ? <span className="text-zinc-500"> · {g.summary}</span> : null}
              </div>
            ))}
          </div>
        </div>
      )}
      {contextTranslation && (
        <div className="text-xs text-zinc-500 mb-3 whitespace-pre-wrap">{contextTranslation}</div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onSpeak}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-white border-2 border-zinc-900 rounded-lg font-bold text-xs hover:bg-zinc-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none shadow-[2px_2px_0px_0px_#18181B] transition-all"
        >
          <Volume2 className="w-3 h-3" />
          {labels.dashboard?.common?.read || '朗读'}
        </button>
        <button
          onClick={onSave}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-lime-300 border-2 border-zinc-900 rounded-lg font-bold text-xs hover:bg-lime-400 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none shadow-[2px_2px_0px_0px_#18181B] transition-all"
        >
          <Plus className="w-3 h-3" />
          {labels.dashboard?.common?.addVocab || '加入生词本'}
        </button>
      </div>
    </div>
  );
};

interface SettingsPanelProps {
  fontSize: number;
  isKaraokeMode: boolean;
  onFontSizeChange: (size: number) => void;
  onKaraokeModeToggle: () => void;
  onClose: () => void;
  language: Language;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  fontSize,
  isKaraokeMode,
  onFontSizeChange,
  onKaraokeModeToggle,
  onClose,
  language,
}) => {
  const labels = getLabels(language);
  return (
    <div className="absolute right-0 top-full mt-2 bg-[#FDFBF7] border-2 border-zinc-900 rounded-lg shadow-[4px_4px_0px_0px_#18181B] p-4 w-56 z-50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-black text-sm">
          {labels.dashboard?.listening?.settings || '听力设置'}
        </h4>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-full bg-white border-2 border-zinc-900 flex items-center justify-center hover:bg-zinc-100 active:translate-x-0.5 active:translate-y-0.5 transition-all"
          aria-label={labels.dashboard?.common?.close || '关闭'}
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="mb-4">
        <label className="text-xs font-bold text-zinc-600 mb-2 block">
          {labels.dashboard?.listening?.fontSize || '字体大小'}
        </label>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onFontSizeChange(Math.max(14, fontSize - 2))}
            className="px-3 py-1 bg-white border-2 border-zinc-900 rounded font-bold text-sm hover:bg-zinc-100 active:translate-x-0.5 active:translate-y-0.5 shadow-[2px_2px_0px_0px_#18181B] active:shadow-none transition-all"
          >
            A-
          </button>
          <span className="flex-1 text-center font-bold">{fontSize}px</span>
          <button
            onClick={() => onFontSizeChange(Math.min(28, fontSize + 2))}
            className="px-3 py-1 bg-white border-2 border-zinc-900 rounded font-bold text-sm hover:bg-zinc-100 active:translate-x-0.5 active:translate-y-0.5 shadow-[2px_2px_0px_0px_#18181B] active:shadow-none transition-all"
          >
            A+
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-zinc-600">
          {labels.dashboard?.listening?.karaoke || '卡拉OK高亮'}
        </span>
        <button
          onClick={onKaraokeModeToggle}
          className={`w-12 h-6 rounded-full border-2 border-zinc-900 relative transition-colors ${isKaraokeMode ? 'bg-lime-300' : 'bg-zinc-200'}`}
        >
          <div
            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full border border-zinc-900 transition-all ${isKaraokeMode ? 'left-6' : 'left-0.5'}`}
          />
        </button>
      </div>
    </div>
  );
};
// Transcription Segment Component
interface SegmentViewProps {
  segment: TranscriptSegment;
  index: number;
  isActive: boolean;
  showTranslation: boolean;
  language: Language;
  onClick: (e: React.MouseEvent | React.KeyboardEvent) => void;
  setRef: (el: HTMLButtonElement | null) => void;
}

const SegmentView: React.FC<SegmentViewProps> = ({
  segment,
  index,
  isActive,
  showTranslation,
  language,
  onClick,
  setRef,
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const localizedTranslation = getLocalizedContent(segment, 'translation', language) || segment.translation;

  return (
    <button
      ref={setRef}
      onClick={onClick}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onClick(e)}
      className={`w-full p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 text-left ${isActive
        ? 'bg-lime-100 border-lime-400 shadow-[4px_4px_0px_0px_#84cc16] scale-[1.02]'
        : 'bg-white border-zinc-200 hover:border-zinc-400'
        }`}
    >
      {/* Timestamp */}
      <div className="text-xs font-mono text-zinc-400 mb-2">
        {formatTime(segment.start)} - {formatTime(segment.end)}
      </div>

      {/* Korean text with word click */}
      <div className={`font-medium ${isActive ? 'text-zinc-900' : 'text-zinc-700'}`}>
        {segment.text.split(/\s+/).map((word, wordIndex) => {
          const normalizedWord = normalizeLookupWord(word);
          if (!normalizedWord) {
            return <span key={`text-${index}-${wordIndex}`}>{word} </span>;
          }
          const baseForm = segment.tokens?.find(
            t => normalizeLookupWord(t.surface) === normalizedWord
          )?.base;

          return (
            <WordView
              key={`word-${index}-${wordIndex}`}
              word={word}
              normalizedWord={normalizedWord}
              baseForm={baseForm}
              segmentIndex={index}
              isActive={isActive}
            />
          );
        })}
      </div>

      {/* Translation */}
      {(showTranslation || isActive) && localizedTranslation && (
        <div className="mt-2 text-sm text-zinc-500">
          {localizedTranslation}
        </div>
      )}
    </button>
  );
};

// Word Component
interface WordViewProps {
  word: string;
  normalizedWord: string;
  baseForm?: string;
  segmentIndex: number;
  isActive: boolean;
}

const WordView: React.FC<WordViewProps> = ({ word, normalizedWord, baseForm, segmentIndex, isActive }) => {
  return (
    <span
      data-word={normalizedWord}
      data-base={baseForm}
      data-seg-index={segmentIndex}
      className={`cursor-pointer rounded px-0.5 transition-colors ${isActive ? 'hover:bg-lime-200' : 'hover:bg-yellow-100'
        }`}
    >
      {word}{' '}
    </span>
  );
};

// =========================================
// Main Component
// =========================================
interface ListeningModuleProps {
  courseId: string;
  unitIndex?: number;
  unitTitle?: string;
  language?: Language;
  onBack?: () => void;
}

const ListeningModule: React.FC<ListeningModuleProps> = ({
  courseId,
  unitIndex = 1,
  unitTitle = 'Unit 1: Listening Practice',
  language = 'zh',
  onBack,
}) => {
  const labels = getLabels(language);
  const { speak: speakTTS, stop: stopTTS } = useTTS();
  const lookupWithMorphology = useAction(
    aRef<
      {
        surface: string;
        contextText?: string;
        charIndexInContext?: number;
        translationLang?: string;
        num?: number;
      },
      MorphologyLookupResult
    >('dictionary:lookupWithMorphology')
  );
  const addToReview = useMutation(
    mRef<
      {
        word: string;
        meaning: string;
        partOfSpeech?: string;
        context?: string;
        source?: string;
      },
      void
    >('vocab:addToReview')
  );
  const dictionaryRequestRef = useRef(0);
  const translationLang = useMemo(() => {
    if (language === 'en' || language === 'zh' || language === 'vi' || language === 'mn') {
      return language;
    }
    return undefined;
  }, [language]);

  const normalizeLookupWordCb = useCallback((value: string) => normalizeLookupWord(value), []);

  useEffect(() => stopTTS, [stopTTS]);

  // UI State
  const [fontSize, setFontSize] = useState(20);
  const [showSettings, setShowSettings] = useState(false);
  const [isKaraokeMode, setIsKaraokeMode] = useState(true);
  const [showTranslation, setShowTranslation] = useState(false);

  // Audio/Karaoke State
  const [currentTime, setCurrentTime] = useState(0);

  // Word popup state
  const [selectedWord, setSelectedWord] = useState<{
    word: string;
    lemma?: string;
    meaning: string;
    baseForm?: string;
    contextTranslation?: string;
    grammarMatches?: Array<{ id: string; title: string; summary: string; type: string; level: string }>;
    position: { x: number; y: number };
    isFromVocabList: boolean;
  } | null>(null);

  const segmentRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // ========================================
  // Data Fetching - Use dedicated listening API
  // ========================================
  // Data Fetching - Use dedicated listening API
  // ========================================
  const unitDetails = useQuery(
    qRef<
      { courseId: string; unitIndex: number },
      {
        unit?: { _id: string; title: string; audioUrl?: string; transcriptData?: unknown };
        vocabList?: VocabItem[];
      } | null
    >('units:getDetails'),
    { courseId, unitIndex }
  );

  const loading = unitDetails === undefined;
  const vocabList = useMemo(() => unitDetails?.vocabList || [], [unitDetails?.vocabList]);
  const unitData = useMemo<UnitData | null>(() => {
    if (!unitDetails?.unit) return null;
    const transcriptData = Array.isArray(unitDetails.unit.transcriptData)
      ? unitDetails.unit.transcriptData
        .map((s): TranscriptSegment | null => {
          if (!s || typeof s !== 'object') return null;
          const r = s as Record<string, unknown>;
          const start = r.start;
          const end = r.end;
          const text = r.text;
          if (typeof start !== 'number' || typeof end !== 'number' || typeof text !== 'string')
            return null;
          const segment: TranscriptSegment = { start, end, text };
          if (typeof r.translation === 'string') segment.translation = r.translation;
          if (typeof r.translationEn === 'string') segment.translationEn = r.translationEn;
          if (typeof r.translationVi === 'string') segment.translationVi = r.translationVi;
          if (typeof r.translationMn === 'string') segment.translationMn = r.translationMn;
          if (Array.isArray(r.tokens)) {
            segment.tokens = r.tokens
              .map(t => {
                if (!t || typeof t !== 'object') return null;
                const tr = t as Record<string, unknown>;
                const surface = tr.surface;
                const base = tr.base;
                const pos = tr.pos;
                if (
                  typeof surface !== 'string' ||
                  typeof base !== 'string' ||
                  typeof pos !== 'string'
                )
                  return null;
                return { surface, base, pos };
              })
              .filter((t): t is { surface: string; base: string; pos: string } => t !== null);
          }
          return segment;
        })
        .filter((s): s is TranscriptSegment => s !== null)
      : undefined;
    return {
      id: unitDetails.unit._id,
      title: unitDetails.unit.title,
      audioUrl: unitDetails.unit.audioUrl || '',
      transcriptData,
    };
  }, [unitDetails]);

  const lookupInVocabList = useCallback(
    (word: string): VocabItem | null => {
      const directMatch = vocabList.find(v => v.korean === word);
      if (directMatch) return directMatch;

      const endings = ['다', '요', '습니다', '습니까', '세요', '어요', '아요'];
      for (const ending of endings) {
        if (word.endsWith(ending)) {
          const stem = word.slice(0, -ending.length);
          const stemMatch = vocabList.find(v => v.korean === stem + '다' || v.korean.startsWith(stem));
          if (stemMatch) return stemMatch;
        }
      }

      return null;
    },
    [vocabList]
  );

  // Cleanup error state logic as useQuery handles it differently (returns undefined on loading)

  // ========================================
  // Karaoke Logic: Update active segment based on current time
  // ========================================
  const activeSegmentIndex = useMemo(() => {
    if (!unitData?.transcriptData || !isKaraokeMode) return -1;
    return unitData.transcriptData.findIndex(
      seg => currentTime >= seg.start && currentTime <= seg.end
    );
  }, [currentTime, unitData, isKaraokeMode]);

  useEffect(() => {
    if (activeSegmentIndex < 0) return;
    segmentRefs.current[activeSegmentIndex]?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, [activeSegmentIndex]);

  // ========================================
  // Handlers
  // ========================================
  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
  };

  const handleSegmentClick = (segment: TranscriptSegment, _index: number, e: React.MouseEvent | React.KeyboardEvent) => {
    // If a word was clicked, handleWordClick will handle it via bubbling if we want,
    // but here we can explicitly check to avoid seeking if a word was clicked.
    const wordEl = (e.target as Element).closest<HTMLElement>('[data-word]');
    if (wordEl) {
      handleWordClick(e);
      return;
    }

    // This will trigger the audio to seek to this time
    setCurrentTime(segment.start);
  };

  const getPopoverPosition = (rect: DOMRect, popoverWidth: number, popoverHeight: number) => {
    const x = Math.min(
      Math.max(8, rect.left),
      Math.max(8, globalThis.window.innerWidth - popoverWidth - 8)
    );
    const y = Math.min(
      Math.max(8, rect.bottom + 8),
      Math.max(8, globalThis.window.innerHeight - popoverHeight - 8)
    );
    return { x, y };
  };

  const performDictionaryLookup = async (
    clickedWord: string,
    query: string,
    segment: TranscriptSegment | undefined,
    requestId: number
  ) => {
    try {
      const res = await lookupWithMorphology({
        surface: clickedWord,
        contextText: segment?.text,
        translationLang,
        num: 10,
      });

      if (dictionaryRequestRef.current !== requestId) return;

      const lemma = normalizeLookupWordCb(res.token.lemma || query) || query;
      let meaning =
        selectedWord?.meaning || labels.dashboard?.common?.noMeaning || '暂无释义';

      if (res.wordFromDb?.meaning) {
        meaning = res.wordFromDb.meaning;
      } else if (res.krdict) {
        meaning = extractBestMeaning(res.krdict, lemma, meaning);
      }

      setSelectedWord(prev =>
        prev
          ? {
            ...prev,
            lemma,
            baseForm: lemma,
            grammarMatches: res.grammarMatches,
            meaning,
          }
          : prev
      );
    } catch (error: unknown) {
      if (dictionaryRequestRef.current !== requestId) return;
      console.error('[ListeningModule] Dictionary lookup failed:', error);
      setSelectedWord(prev =>
        prev
          ? {
            ...prev,
            meaning: prev.meaning === labels.dashboard?.common?.loading ? '查询失败' : prev.meaning,
          }
          : prev
      );
    }
  };

  const handleWordClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    const wordEl = (e.target as Element).closest<HTMLElement>('[data-word]');
    if (!wordEl) return;

    const clickedWord = normalizeLookupWordCb(wordEl.dataset.word ?? '');
    if (!clickedWord) return;

    const baseForm = wordEl.dataset.base ? normalizeLookupWordCb(wordEl.dataset.base) : undefined;
    const query = baseForm || clickedWord;
    const vocabMatch = lookupInVocabList(query) || lookupInVocabList(clickedWord);
    const segIndex = wordEl.dataset.segIndex ? Number.parseInt(wordEl.dataset.segIndex, 10) : undefined;
    const segment =
      typeof segIndex === 'number' ? unitData?.transcriptData?.[segIndex] : undefined;
    const contextTranslation = segment ? getLocalizedContent(segment, 'translation', language) : undefined;

    const requestId = dictionaryRequestRef.current + 1;
    dictionaryRequestRef.current = requestId;

    const rect = wordEl.getBoundingClientRect();
    const position = getPopoverPosition(rect, 260, contextTranslation ? 220 : 180);

    setSelectedWord({
      word: clickedWord,
      lemma: baseForm,
      meaning: vocabMatch?.meaning || labels.dashboard?.common?.loading || '查询中...',
      baseForm,
      grammarMatches: [],
      contextTranslation,
      position,
      isFromVocabList: !!vocabMatch,
    });

    void performDictionaryLookup(clickedWord, query, segment, requestId);
  };

  const speak = useCallback(
    (text: string) => {
      void speakTTS(text);
    },
    [speakTTS]
  );

  // Close popup on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectedWord) {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-popover]') && !target.closest('[data-word]')) {
          setSelectedWord(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedWord]);

  // ========================================
  // Render Transcript with Karaoke Highlighting
  // ========================================
  const renderTranscript = () => {
    // No listening unit exists yet, or no transcript data
    if (unitData?.transcriptData && unitData.transcriptData.length > 0) {
      // Render karaoke-style transcript
      return (
        <div className="space-y-4" style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}>
          {unitData.transcriptData.map((segment, index) => (
            <SegmentView
              key={`seg-${segment.start}-${segment.end}`}
              segment={segment}
              index={index}
              isActive={isKaraokeMode && index === activeSegmentIndex}
              showTranslation={showTranslation}
              language={language}
              onClick={e => handleSegmentClick(segment, index, e)}
              setRef={el => {
                segmentRefs.current[index] = el;
              }}
            />
          ))}
        </div>
      );
    }

    // No transcript data - show empty state
    return (
      <div className="text-center py-12 text-zinc-400">
        <Headphones className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p className="font-bold">{labels.dashboard?.listening?.empty || '暂无听力内'}</p>
        <p className="text-sm mt-2">
          {labels.dashboard?.listening?.emptyDesc || '请在管理后台添加听力音频和时间戳文稿'}
        </p>
      </div>
    );
  };


  return (
    <div
      className="h-[calc(100vh-48px)] h-[calc(100dvh-48px)] flex flex-col pb-20"
      style={{
        backgroundImage: 'radial-gradient(#d4d4d8 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        backgroundColor: '#f4f4f5',
      }}
    >
      {/* Loading State */}
      {loading && <ListeningModuleSkeleton />}

      {/* Main Content - only show when loaded */}
      {!loading && (
        <>
          {/* Header */}
          <header className="bg-[#FDFBF7] border-b-2 border-zinc-900 px-6 py-3 flex items-center justify-between shrink-0">
            {/* Left: Back + Title */}
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="w-10 h-10 bg-white border-2 border-zinc-900 rounded-lg flex items-center justify-center hover:bg-zinc-100 active:translate-x-0.5 active:translate-y-0.5 shadow-[3px_3px_0px_0px_#18181B] active:shadow-none transition-all"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="font-black text-lg flex items-center gap-2">
                <Headphones className="w-5 h-5 text-lime-600" />
                {unitData?.title || unitTitle}
              </h1>
            </div>

            {/* Center: Unit Info Badge */}
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-white border-2 border-zinc-900 rounded-lg font-bold text-xs shadow-[2px_2px_0px_0px_#18181B]">
                {(labels.dashboard?.listening?.title || '第 {index} 课 · 听力').replace(
                  '{index}',
                  String(unitIndex)
                )}
              </span>
              <button
                onClick={() => setShowTranslation(!showTranslation)}
                className={`px-3 py-2 border-2 border-zinc-900 rounded-lg font-bold text-xs transition-colors ${showTranslation ? 'bg-blue-100' : 'bg-white'
                  }`}
              >
                <Languages className="w-4 h-4 inline mr-1" />
                {labels.dashboard?.listening?.translate || '译文'}
              </button>
            </div>

            {/* Right: Settings */}
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="w-10 h-10 bg-white border-2 border-zinc-900 rounded-lg flex items-center justify-center hover:bg-zinc-100 active:translate-x-0.5 active:translate-y-0.5 shadow-[3px_3px_0px_0px_#18181B] active:shadow-none transition-all"
              >
                <Settings className="w-5 h-5" />
              </button>
              {showSettings && (
                <SettingsPanel
                  fontSize={fontSize}
                  isKaraokeMode={isKaraokeMode}
                  onFontSizeChange={setFontSize}
                  onKaraokeModeToggle={() => setIsKaraokeMode(!isKaraokeMode)}
                  onClose={() => setShowSettings(false)}
                  language={language}
                />
              )}
            </div>
          </header>

          {/* Main Content: Full Width Transcript Panel */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="bg-[#FDFBF7] border-2 border-zinc-900 rounded-xl shadow-[6px_6px_0px_0px_#18181B] p-8 max-w-3xl mx-auto">
              <h2 className="text-2xl font-black mb-6 text-zinc-900 flex items-center gap-2">
                <Headphones className="w-6 h-6 text-lime-600" />
                {labels.dashboard?.listening?.transcript || '听力文稿'}
              </h2>

              {/* Karaoke hint */}
              {unitData?.transcriptData && unitData.transcriptData.length > 0 && (
                <div className="mb-6 p-3 bg-lime-50 border border-lime-200 rounded-lg text-sm text-lime-700">
                  {labels.dashboard?.listening?.hint || '💡 点击任意句子可跳转到对应位置播放'}
                </div>
              )}

              {renderTranscript()}
            </div>
          </div>
        </>
      )}

      {/* Word Popover */}
      {selectedWord && (
        <div data-popover>
          <FlashcardPopover
            word={selectedWord.word}
            lemma={selectedWord.lemma}
            meaning={selectedWord.meaning}
            contextTranslation={selectedWord.contextTranslation}
            grammarMatches={selectedWord.grammarMatches}
            position={selectedWord.position}
            onClose={() => setSelectedWord(null)}
            onSave={async () => {
              if (selectedWord) {
                try {
                  await addToReview({
                    word: selectedWord.lemma || selectedWord.word,
                    meaning: selectedWord.meaning,
                    context: selectedWord.contextTranslation,
                    source: 'LISTENING',
                  });
                } catch (err) {
                  console.error('Failed to save word:', err);
                }
              }
              setSelectedWord(null);
            }}
            onSpeak={() => speak(selectedWord.word)}
            language={language}
          />
        </div>
      )}

      {/* Sticky Audio Player */}
      {!loading && unitData?.audioUrl && (
        <StickyAudioPlayer audioUrl={unitData.audioUrl} onTimeUpdate={handleTimeUpdate} />
      )}
    </div>
  );
};

export default ListeningModule;
