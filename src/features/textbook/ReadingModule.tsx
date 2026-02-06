import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Settings,
  Volume2,
  Plus,
  Languages,
  PenLine,
  Highlighter,
  MessageSquare,
  Sparkles,
  Send,
  X,
  ChevronDown,
  Menu,
} from 'lucide-react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { aRef, mRef, qRef } from '../../utils/convexRefs';
import BottomSheet from '../../components/common/BottomSheet';
import { Language } from '../../types';
import { getLocalizedContent } from '../../utils/languageUtils';
import { getLabels } from '../../utils/i18n';
import { ListeningModuleSkeleton } from '../../components/common';
import { useTTS } from '../../hooks/useTTS';
import { notify } from '../../utils/notify';
import { extractBestMeaning, normalizeLookupWord } from '../../utils/dictionaryMeaning';
import { useUserActions } from '../../hooks/useUserActions';
import { useActivityLogger } from '../../hooks/useActivityLogger';

// Legacy API removed - using Convex

// =========================================
// Types
// =========================================
interface SavedWord {
  id: string;
  word: string;
  meaning: string;
  timestamp: number;
}

type HighlightColor = 'yellow' | 'green' | 'pink';

interface Note {
  id: string;
  text: string;
  comment: string;
  color: HighlightColor;
  startOffset: number;
  endOffset: number;
  timestamp: number;
}

interface Highlight {
  id: string;
  text: string;
  color: HighlightColor;
  startOffset: number;
  endOffset: number;
}

// API Response Types
interface TextToken {
  surface: string; // Conjugated form (e.g., "갔습니다")
  base: string; // Dictionary form (e.g., "가다")
  offset: number;
  length: number;
  pos: string;
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

interface GrammarItem {
  id: string;
  title: string;
  type: string;
  summary: string;
  explanation: string;
}

interface GrammarMatch {
  id: string;
  title: string;
  summary: string;
  type: string;
  level: string;
}

interface AnnotationItem {
  id: string;
  startOffset?: number;
  endOffset?: number;
  text: string;
  color?: string;
  note?: string;
  createdAt: string;
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
  token: {
    surface: string;
    lemma: string;
    pos: string | null;
    begin: number | null;
    len: number | null;
  };
  morphemes: Array<{ form: string; tag: string; begin: number; len: number }>;
  wordFromDb: null | {
    word: string;
    meaning: string;
    partOfSpeech: string;
    pronunciation?: string;
    hanja?: string;
    audioUrl?: string;
  };
  grammarMatches: Array<{
    id: string;
    title: string;
    summary: string;
    type: string;
    level: string;
  }>;
  krdict: SearchResult | null;
  krdictError: string | null;
}

// =========================================
// Constants & Utils
// =========================================
const HIGHLIGHT_COLORS: Record<HighlightColor, string> = {
  yellow: '#FEF08A',
  green: '#BBF7D0',
  pink: '#FBCFE8',
};

const HIGHLIGHT_CLASSES: Record<HighlightColor, string> = {
  yellow: 'bg-yellow-200',
  green: 'bg-green-200',
  pink: 'bg-pink-200',
};

// =========================================
// Sub-Components
// =========================================

// Word Flashcard Popover
interface FlashcardPopoverProps {
  word: string;
  lemma?: string;
  meaning: string;
  contextTranslation?: string;
  grammarMatches?: Array<{
    id: string;
    title: string;
    summary: string;
    type: string;
    level: string;
  }>;
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

// Text Word Component
interface WordEntryProps {
  part: string;
  normalizedWord: string;
  offset: number;
  sentenceIndex: number;
  hasHighlight?: Highlight;
  hasNote?: Note;
}

const WordEntry: React.FC<WordEntryProps> = ({
  part,
  normalizedWord,
  offset,
  sentenceIndex,
  hasHighlight,
  hasNote,
}) => {
  let className = 'cursor-pointer hover:bg-yellow-100 rounded px-0.5 transition-colors';
  if (hasHighlight) {
    className += ` ${HIGHLIGHT_CLASSES[hasHighlight.color]}`;
  }
  if (hasNote) {
    className += ' underline decoration-wavy decoration-amber-500';
  }

  return (
    <span
      data-word={normalizedWord}
      data-offset={String(offset)}
      data-sentence-index={String(sentenceIndex)}
      className={className}
      style={{
        backgroundColor: hasHighlight ? HIGHLIGHT_COLORS[hasHighlight.color] : undefined,
      }}
    >
      {part}
    </span>
  );
};

// Selection Toolbar
interface SelectionToolbarProps {
  position: { x: number; y: number };
  onTranslate: () => void;
  onSpeak: () => void;
  onNote: () => void;
  onHighlight: (color: HighlightColor) => void;
  language: Language;
}

const SelectionToolbar: React.FC<SelectionToolbarProps> = ({
  position,
  onTranslate,
  onSpeak,
  onNote,
  onHighlight,
  language,
}) => {
  const labels = getLabels(language);
  const [showColors, setShowColors] = useState(false);

  return (
    <div
      className="fixed z-50 bg-zinc-900 text-white rounded-lg shadow-lg flex items-center gap-1 p-1"
      style={{ left: position.x, top: position.y }}
    >
      <button
        onClick={onTranslate}
        className="flex items-center gap-1 px-3 py-2 rounded hover:bg-zinc-700 text-xs font-bold transition-colors"
      >
        <Languages className="w-3 h-3" />
        {labels.dashboard?.reading?.translate || '翻译'}
      </button>
      <button
        onClick={onSpeak}
        className="flex items-center gap-1 px-3 py-2 rounded hover:bg-zinc-700 text-xs font-bold transition-colors"
      >
        <Volume2 className="w-3 h-3" />
        {labels.dashboard?.common?.read || '朗读'}
      </button>
      <button
        onClick={onNote}
        className="flex items-center gap-1 px-3 py-2 rounded hover:bg-zinc-700 text-xs font-bold transition-colors"
      >
        <PenLine className="w-3 h-3" />
        {labels.dashboard?.reading?.note || '笔记'}
      </button>
      <div className="relative">
        <button
          onClick={() => setShowColors(!showColors)}
          className="flex items-center gap-1 px-3 py-2 rounded hover:bg-zinc-700 text-xs font-bold transition-colors"
        >
          <Highlighter className="w-3 h-3" />
          {labels.dashboard?.reading?.highlight || '高亮'}
        </button>
        {showColors && (
          <div className="absolute top-full left-0 mt-1 bg-zinc-800 rounded-lg p-2 flex gap-2">
            <button
              onClick={() => {
                onHighlight('yellow');
                setShowColors(false);
              }}
              className="w-5 h-5 bg-yellow-300 rounded-full border-2 border-white hover:scale-110 transition-transform"
            />
            <button
              onClick={() => {
                onHighlight('green');
                setShowColors(false);
              }}
              className="w-5 h-5 bg-green-300 rounded-full border-2 border-white hover:scale-110 transition-transform"
            />
            <button
              onClick={() => {
                onHighlight('pink');
                setShowColors(false);
              }}
              className="w-5 h-5 bg-pink-300 rounded-full border-2 border-white hover:scale-110 transition-transform"
            />
          </div>
        )}
      </div>
    </div>
  );
};

// Note Input Modal
interface NoteInputModalProps {
  selectedText: string;
  onSave: (comment: string, color: HighlightColor) => void;
  onClose: () => void;
  language: Language;
}

const NoteInputModal: React.FC<NoteInputModalProps> = ({
  selectedText,
  onSave,
  onClose,
  language,
}) => {
  const labels = getLabels(language);
  const [comment, setComment] = useState('');
  const [color, setColor] = useState<HighlightColor>('yellow');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#FDFBF7] border-2 border-zinc-900 rounded-xl shadow-[8px_8px_0px_0px_#18181B] p-6 w-96">
        <h3 className="font-black text-lg mb-4">
          {labels.dashboard?.reading?.addNote || '添加笔记'}
        </h3>

        <div className="bg-zinc-100 border-2 border-zinc-300 rounded-lg p-3 mb-4">
          <p className="text-sm text-zinc-600 font-bold">
            {labels.dashboard?.reading?.selectedText || '选中文本：'}
          </p>
          <p className="text-zinc-900 font-bold">{selectedText}</p>
        </div>

        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder={labels.dashboard?.reading?.writeNote || '写下你的笔记...'}
          className="w-full h-24 px-3 py-2 border-2 border-zinc-900 rounded-lg font-bold text-sm focus:shadow-[2px_2px_0px_0px_#18181B] outline-none resize-none mb-4"
        />

        <div className="flex items-center gap-4 mb-4">
          <span className="text-sm font-bold text-zinc-600">
            {labels.dashboard?.reading?.color || '颜色：'}
          </span>
          <div className="flex gap-2">
            {(['yellow', 'green', 'pink'] as HighlightColor[]).map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full border-2 ${
                  color === c ? 'border-zinc-900 scale-110' : 'border-zinc-400'
                } ${HIGHLIGHT_CLASSES[c]} transition-all`}
                aria-label={c}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-white border-2 border-zinc-900 rounded-lg font-bold hover:bg-zinc-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none shadow-[2px_2px_0px_0px_#18181B] transition-all"
          >
            {labels.dashboard?.reading?.cancel || '取消'}
          </button>
          <button
            onClick={() => onSave(comment, color)}
            disabled={!comment.trim()}
            className="flex-1 px-4 py-2 bg-lime-300 border-2 border-zinc-900 rounded-lg font-bold hover:bg-lime-400 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none shadow-[2px_2px_0px_0px_#18181B] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {labels.dashboard?.reading?.save || '保存'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Settings Panel
interface SettingsPanelProps {
  fontSize: number;
  isSerif: boolean;
  onFontSizeChange: (size: number) => void;
  onSerifToggle: () => void;
  onClose: () => void;
  language: Language;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  fontSize,
  isSerif,
  onFontSizeChange,
  onSerifToggle,
  onClose,
  language,
}) => {
  const labels = getLabels(language);
  return (
    <div className="absolute right-0 top-full mt-2 bg-[#FDFBF7] border-2 border-zinc-900 rounded-lg shadow-[4px_4px_0px_0px_#18181B] p-4 w-56 z-50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-black text-sm">{labels.dashboard?.reading?.settings || '阅读设置'}</h4>
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
          {labels.dashboard?.reading?.fontSize || '字体大小'}
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
          {labels.dashboard?.reading?.serif || '衬线字体'}
        </span>
        <button
          onClick={onSerifToggle}
          className={`w-12 h-6 rounded-full border-2 border-zinc-900 relative transition-colors ${isSerif ? 'bg-lime-300' : 'bg-zinc-200'}`}
        >
          <div
            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full border border-zinc-900 transition-all ${isSerif ? 'left-6' : 'left-0.5'}`}
          />
        </button>
      </div>
    </div>
  );
};

// =========================================
// Main Component
// =========================================
interface ReadingModuleProps {
  courseId: string;
  unitIndex?: number;
  unitTitle?: string;
  language?: Language;
  onBack?: () => void;
}

const ReadingModule: React.FC<ReadingModuleProps> = ({
  courseId,
  unitIndex: initialUnitIndex = 1,
  unitTitle = 'Unit 1: Self-introduction',
  language = 'zh',
  onBack,
}) => {
  const labels = getLabels(language);
  const { speak: speakTTS, stop: stopTTS } = useTTS();
  const { saveWord } = useUserActions();
  const { logActivity } = useActivityLogger();

  useEffect(() => stopTTS, [stopTTS]);
  // State for selected unit (allows changing within the component)
  const [selectedUnitIndexOverride, setSelectedUnitIndexOverride] = useState(initialUnitIndex);

  // Fetch available units for course (for unit selector)
  const availableUnits = useQuery(
    qRef<{ courseId: string }, { unitIndex: number }[]>('units:getByCourse'),
    { courseId }
  );
  const uniqueUnitIndices = useMemo(() => {
    if (!availableUnits) return [];
    const indices = [...new Set(availableUnits.map((u: { unitIndex: number }) => u.unitIndex))];
    return indices.sort((a, b) => a - b);
  }, [availableUnits]);

  const selectedUnitIndex = useMemo(() => {
    if (uniqueUnitIndices.length === 0) return selectedUnitIndexOverride;
    return uniqueUnitIndices.includes(selectedUnitIndexOverride)
      ? selectedUnitIndexOverride
      : uniqueUnitIndices[0];
  }, [uniqueUnitIndices, selectedUnitIndexOverride]);

  const setSelectedUnitIndex = (next: number) => setSelectedUnitIndexOverride(next);
  // ========================================
  // Convex Query: Fetch unit data
  // ========================================
  // Convex Query: Fetch unit data
  // =====================================
  type UnitArticle = {
    _id?: string;
    articleIndex?: number;
    title?: string;
    readingText?: string;
    translation?: string;
    translationEn?: string;
    translationVi?: string;
    translationMn?: string;
    analysisData?: TextToken[];
    audioUrl?: string;
    transcriptData?: unknown;
  };
  const unitDetails = useQuery(
    qRef<
      { courseId: string; unitIndex: number },
      {
        unit?: UnitArticle & { _id: string };
        articles?: UnitArticle[];
        vocabList?: VocabItem[];
        grammarList?: GrammarItem[];
        annotations?: AnnotationItem[];
      } | null
    >('units:getDetails'),
    { courseId, unitIndex: selectedUnitIndex }
  );

  // Convex Mutation: Complete Unit - must be before any conditional returns
  const completeUnitMutation = useMutation(
    mRef<{ courseId: string; unitIndex: number }, unknown>('progress:completeUnit')
  );
  const touchCourseMutation = useMutation(
    mRef<{ courseId: string; unitIndex?: number }, unknown>('progress:touchCourse')
  );

  // Use loading state instead of early return to avoid hooks order issues
  const isLoading = unitDetails === undefined;

  const queryError = null; // Convex throws/nulls usually, simplest check is undefined

  // Extract data from query
  const unit = unitDetails?.unit;
  const unitArticles = unitDetails?.articles;
  const articles = useMemo(() => {
    if (Array.isArray(unitArticles) && unitArticles.length > 0) return unitArticles;
    if (unit) return [{ ...unit, articleIndex: 1 }];
    return [];
  }, [unitArticles, unit]);
  const [activeArticleIndexOverride, setActiveArticleIndexOverride] = useState(1);
  const activeArticleIndex = useMemo(() => {
    if (articles.length === 0) return activeArticleIndexOverride;
    const available = articles.map(a => a.articleIndex || 1);
    const first = available[0] || 1;
    return available.includes(activeArticleIndexOverride) ? activeArticleIndexOverride : first;
  }, [articles, activeArticleIndexOverride]);

  const setActiveArticleIndex = (next: number) => setActiveArticleIndexOverride(next);

  const readingAccumulatedRef = useRef(0);
  const lastTickRef = useRef(0);
  const lastInteractionRef = useRef(0);
  const activityContextRef = useRef({
    courseId,
    unitIndex: selectedUnitIndex,
    articleIndex: activeArticleIndex,
  });

  const flushReadingTime = useCallback(
    (force = false) => {
      const seconds = readingAccumulatedRef.current;
      if (seconds <= 0) return;
      if (!force && seconds < 30) return;
      const minutes = Number((seconds / 60).toFixed(2));
      readingAccumulatedRef.current = 0;
      logActivity('READING', minutes, 0, { ...activityContextRef.current, auto: true });
    },
    [logActivity]
  );

  useEffect(() => {
    flushReadingTime(true);
    activityContextRef.current = {
      courseId,
      unitIndex: selectedUnitIndex,
      articleIndex: activeArticleIndex,
    };
    lastTickRef.current = Date.now();
    lastInteractionRef.current = Date.now();
  }, [courseId, selectedUnitIndex, activeArticleIndex, flushReadingTime]);

  useEffect(() => {
    const handleInteraction = () => {
      lastInteractionRef.current = Date.now();
    };

    document.addEventListener('scroll', handleInteraction, true);
    window.addEventListener('keydown', handleInteraction);
    window.addEventListener('pointerdown', handleInteraction, { passive: true });
    window.addEventListener('touchstart', handleInteraction, { passive: true });
    window.addEventListener('mousemove', handleInteraction, { passive: true });

    return () => {
      document.removeEventListener('scroll', handleInteraction, true);
      window.removeEventListener('keydown', handleInteraction);
      window.removeEventListener('pointerdown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('mousemove', handleInteraction);
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = Date.now();
      const deltaSeconds = Math.max(0, (now - lastTickRef.current) / 1000);
      lastTickRef.current = now;

      if (document.visibilityState !== 'visible') return;
      if (now - lastInteractionRef.current > 15000) return;
      if (deltaSeconds <= 0) return;

      readingAccumulatedRef.current += deltaSeconds;
      if (readingAccumulatedRef.current >= 60) {
        flushReadingTime();
      }
    }, 5000);

    return () => {
      window.clearInterval(interval);
      flushReadingTime(true);
    };
  }, [flushReadingTime]);

  useEffect(() => {
    void touchCourseMutation({ courseId, unitIndex: selectedUnitIndex });
  }, [touchCourseMutation, courseId, selectedUnitIndex]);

  // Select the active article - ensure we always have a valid selection
  const unitData = useMemo(() => {
    if (articles.length === 0) return null;
    // Try to find article by activeArticleIndex
    const found = articles.find(
      (a: { articleIndex?: number }) => a.articleIndex === activeArticleIndex
    );
    // If not found, use first article
    return found || articles[0];
  }, [articles, activeArticleIndex]);

  const vocabList = useMemo(() => unitDetails?.vocabList || [], [unitDetails?.vocabList]);
  const grammarList = useMemo(() => unitDetails?.grammarList || [], [unitDetails?.grammarList]);
  const apiAnnotations = useMemo(() => unitDetails?.annotations || [], [unitDetails?.annotations]);

  // Process annotations from API
  const { notes: notesFromApi, highlights: highlightsFromApi } = useMemo(() => {
    const notesFromApi = apiAnnotations
      .filter((a: AnnotationItem) => a.note)
      .map((a: AnnotationItem) => ({
        id: a.id,
        text: a.text,
        comment: a.note || '',
        color: (a.color || 'yellow') as HighlightColor,
        startOffset: a.startOffset || 0,
        endOffset: a.endOffset || 0,
        timestamp: new Date(a.createdAt).getTime(),
      }));

    const highlightsFromApi = apiAnnotations
      .filter((a: AnnotationItem) => a.color && !a.note)
      .map((a: AnnotationItem) => ({
        id: a.id,
        text: a.text,
        color: (a.color || 'yellow') as HighlightColor,
        startOffset: a.startOffset || 0,
        endOffset: a.endOffset || 0,
      }));

    return { notes: notesFromApi, highlights: highlightsFromApi };
  }, [apiAnnotations]);

  // UI State
  const [fontSize, setFontSize] = useState(18);
  const [isSerif, setIsSerif] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Local word list (user's saved words for this session)
  const [savedWords, setSavedWords] = useState<SavedWord[]>([]);
  const [notesOverride, setNotesOverride] = useState<Note[] | null>(null);
  const [highlightsOverride, setHighlightsOverride] = useState<Highlight[] | null>(null);
  const notes = notesOverride ?? notesFromApi;
  const highlights = highlightsOverride ?? highlightsFromApi;
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
  const dictionaryRequestRef = useRef(0);
  const translationLang = useMemo(() => {
    if (language === 'en' || language === 'zh' || language === 'vi' || language === 'mn') {
      return language;
    }
    return undefined;
  }, [language]);

  // Selection & Popover state
  const [selectedWord, setSelectedWord] = useState<{
    word: string;
    lemma?: string;
    meaning: string;
    baseForm?: string;
    contextTranslation?: string;
    grammarMatches?: GrammarMatch[];
    position: { x: number; y: number };
    isFromVocabList: boolean;
  } | null>(null);
  const [selectionToolbar, setSelectionToolbar] = useState<{
    text: string;
    position: { x: number; y: number };
    range: Range;
  } | null>(null);
  const popoverStateRef = useRef<{
    selectedWord: typeof selectedWord;
    selectionToolbar: typeof selectionToolbar;
  }>({ selectedWord: null, selectionToolbar: null });
  const [noteModal, setNoteModal] = useState<{
    text: string;
    startOffset: number;
    endOffset: number;
  } | null>(null);

  useEffect(() => {
    popoverStateRef.current.selectedWord = selectedWord;
    popoverStateRef.current.selectionToolbar = selectionToolbar;
  }, [selectedWord, selectionToolbar]);

  // Right panel tab
  const [activeTab, setActiveTab] = useState<'notes' | 'grammar' | 'ai'>('grammar');

  // Mobile bottom sheet state
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [aiInput, setAiInput] = useState('');
  // Initial AI message - Role is assistant per typical patterns, though codebase used ai
  const [aiMessages, setAiMessages] = useState<{ role: string; content: string }[]>(() => [
    {
      role: 'assistant',
      content: labels.dashboard?.reading?.aiGreeting || 'Hi! I am your AI assistant.',
    },
  ]);

  const readerRef = useRef<HTMLDivElement>(null);
  const error = queryError ? '加载失败，请重试' : null;

  // ========================================
  // Smart Word Lookup: Find base form using analysisData
  // ========================================
  const findBaseForm = useCallback(
    (clickedWord: string, charIndex?: number): { base: string; surface: string } | null => {
      if (!unitData?.analysisData) return null;

      const tokens = unitData.analysisData;

      // Strategy 1: Try to find by exact surface match
      const exactMatch = tokens.find((t: TextToken) => t.surface === clickedWord);
      if (exactMatch) {
        return { base: exactMatch.base, surface: exactMatch.surface };
      }

      // Strategy 2: If we have character index, find token containing that position
      if (charIndex !== undefined) {
        const tokenAtPosition = tokens.find(
          (t: TextToken) => charIndex >= t.offset && charIndex < t.offset + t.length
        );
        if (tokenAtPosition) {
          return { base: tokenAtPosition.base, surface: tokenAtPosition.surface };
        }
      }

      // Strategy 3: Find token where surface contains the clicked word
      const partialMatch = tokens.find((t: TextToken) => t.surface.includes(clickedWord));
      if (partialMatch) {
        return { base: partialMatch.base, surface: partialMatch.surface };
      }

      return null;
    },
    [unitData]
  );

  // ========================================
  // Look up word in vocab list (by base form)
  // ========================================
  const lookupInVocabList = useCallback(
    (word: string): VocabItem | null => {
      // Direct match
      const directMatch = vocabList.find((v: VocabItem) => v.korean === word);
      if (directMatch) return directMatch;

      // Try removing common endings for verb/adj lookup
      const endings = ['다', '요', '습니다', '습니까', '세요', '어요', '아요'];
      for (const ending of endings) {
        if (word.endsWith(ending)) {
          const stem = word.slice(0, -ending.length);
          const stemMatch = vocabList.find(
            (v: VocabItem) => v.korean === stem + '다' || v.korean.startsWith(stem)
          );
          if (stemMatch) return stemMatch;
        }
      }

      return null;
    },
    [vocabList]
  );

  const normalizeLookupWordCb = useCallback((value: string) => normalizeLookupWord(value), []);
  const translationSentences = useMemo(() => {
    const translation = unitData ? getLocalizedContent(unitData, 'translation', language) : '';
    if (!translation) return [];

    const byLine = translation
      .split(/\n+/)
      .map(s => s.trim())
      .filter(Boolean);
    if (byLine.length > 1) return byLine;

    const byPunctuation = translation.match(/[^。！？.!?]+[。！？.!?]?/g);
    return (byPunctuation ?? [translation]).map(s => s.trim()).filter(Boolean);
  }, [language, unitData]);

  // ========================================
  // Handle word click - Smart lookup logic
  // ========================================
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

  const performDictionaryLookup = useCallback(
    async (
      clickedWord: string,
      query: string,
      fallbackMeaning: string,
      requestId: number,
      charIndex?: number
    ) => {
      try {
        const fullText = unitData?.readingText;
        let contextText: string | undefined;
        let charIndexInContext: number | undefined;

        if (fullText && charIndex !== undefined) {
          const safeIndex = Math.max(0, Math.min(charIndex, fullText.length - 1));
          const before = fullText.slice(0, safeIndex);
          const after = fullText.slice(safeIndex);
          const startBoundary = Math.max(
            before.lastIndexOf('\n'),
            before.lastIndexOf('.'),
            before.lastIndexOf('?'),
            before.lastIndexOf('!'),
            before.lastIndexOf('。'),
            before.lastIndexOf('！'),
            before.lastIndexOf('？')
          );
          const start = startBoundary >= 0 ? startBoundary + 1 : 0;
          const endCandidates = [
            after.indexOf('\n'),
            after.indexOf('.'),
            after.indexOf('?'),
            after.indexOf('!'),
            after.indexOf('。'),
            after.indexOf('！'),
            after.indexOf('？'),
          ].filter(v => v >= 0);
          const endOffset =
            endCandidates.length > 0 ? Math.min(...endCandidates) + 1 : after.length;
          const end = Math.min(fullText.length, safeIndex + endOffset);
          contextText = fullText.slice(start, end);
          charIndexInContext = safeIndex - start;
        }

        const res = await lookupWithMorphology({
          surface: clickedWord,
          contextText,
          charIndexInContext,
          translationLang,
          num: 10,
        });

        if (dictionaryRequestRef.current !== requestId) return;

        const lemma = normalizeLookupWordCb(res.token.lemma || query) || query;

        let meaning = fallbackMeaning;
        if (res.wordFromDb?.meaning) {
          meaning = res.wordFromDb.meaning;
        } else if (res.krdict) {
          meaning = extractBestMeaning(res.krdict, lemma, fallbackMeaning);
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
        console.error('[ReadingModule] Dictionary lookup failed:', error);
        setSelectedWord(prev => (prev ? { ...prev, meaning: fallbackMeaning } : prev));
      }
    },
    [lookupWithMorphology, translationLang, unitData, normalizeLookupWordCb]
  );

  // ========================================
  // Handle word click - Smart lookup logic
  // ========================================
  const handleWordClick = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      const target = e.target as HTMLElement;
      const wordEl = target.closest<HTMLElement>('[data-word]');
      if (!wordEl) return;

      const clickedWord = normalizeLookupWordCb(wordEl.dataset.word ?? '');
      if (!clickedWord) return;

      const charIndexStr = wordEl.dataset.offset;
      const charIndex = charIndexStr ? Number.parseInt(charIndexStr, 10) : undefined;
      const sentenceIndexStr = wordEl.dataset.sentenceIndex;
      const sentenceIndex = sentenceIndexStr ? Number.parseInt(sentenceIndexStr, 10) : undefined;
      const contextTranslation =
        sentenceIndex === undefined ? undefined : translationSentences[sentenceIndex];

      const tokenInfo = findBaseForm(clickedWord, charIndex);
      const query = tokenInfo?.base || clickedWord;

      const vocabMatch = lookupInVocabList(query) || lookupInVocabList(clickedWord);
      const fallbackMeaning =
        vocabMatch?.meaning || labels.dashboard?.common?.noMeaning || '暂无释义';

      const requestId = dictionaryRequestRef.current + 1;
      dictionaryRequestRef.current = requestId;

      const rect = wordEl.getBoundingClientRect();
      const position = getPopoverPosition(rect, 260, contextTranslation ? 220 : 180);

      setSelectedWord({
        word: clickedWord,
        lemma: tokenInfo?.base,
        meaning: vocabMatch?.meaning || labels.dashboard?.common?.loading || '查询中...',
        baseForm: tokenInfo?.base,
        grammarMatches: [],
        contextTranslation,
        position,
        isFromVocabList: !!vocabMatch,
      });
      setSelectionToolbar(null);

      void performDictionaryLookup(clickedWord, query, fallbackMeaning, requestId, charIndex);
    },
    [
      findBaseForm,
      labels.dashboard?.common?.loading,
      labels.dashboard?.common?.noMeaning,
      lookupInVocabList,
      normalizeLookupWordCb,
      translationSentences,
      performDictionaryLookup,
    ]
  );

  // Handle text selection
  const handleMouseUp = useCallback(() => {
    const selection = globalThis.getSelection();
    if (selection && selection.toString().trim().length > 0 && !selectedWord) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectionToolbar({
        text: selection.toString(),
        position: { x: rect.left + rect.width / 2 - 100, y: rect.top - 50 },
        range: range.cloneRange(),
      });
    }
  }, [selectedWord]);

  // Attach event listeners manually to avoid cyclical accessibility lint warnings
  useEffect(() => {
    const reader = readerRef.current;
    if (!reader) return;

    const onMouseUp = () => handleMouseUp();
    const onClick = (e: MouseEvent) => handleWordClick(e);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        const target = e.target as HTMLElement;
        if (target.closest('[data-word]')) {
          handleWordClick(e as unknown as MouseEvent);
        }
      }
    };

    reader.addEventListener('mouseup', onMouseUp);
    reader.addEventListener('click', onClick);
    reader.addEventListener('keydown', onKeyDown);

    return () => {
      reader.removeEventListener('mouseup', onMouseUp);
      reader.removeEventListener('click', onClick);
      reader.removeEventListener('keydown', onKeyDown);
    };
  }, [handleMouseUp, handleWordClick]);

  // Close popovers on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const { selectedWord: currentSelectedWord, selectionToolbar: currentSelectionToolbar } =
        popoverStateRef.current;
      if (currentSelectedWord || currentSelectionToolbar) {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-popover]') && !target.closest('[data-word]')) {
          setSelectedWord(null);
          setSelectionToolbar(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const speak = useCallback(
    (text: string) => {
      void speakTTS(text);
    },
    [speakTTS]
  );

  // Save word to vocab
  const saveWordToVocab = (word: string, meaning: string) => {
    if (!savedWords.some(w => w.word === word)) {
      setSavedWords(prev => [
        ...prev,
        { id: Date.now().toString(), word, meaning, timestamp: Date.now() },
      ]);
    }
    void saveWord(word, meaning);
    setSelectedWord(null);
  };

  // Add highlight
  const addHighlight = (color: 'yellow' | 'green' | 'pink') => {
    if (selectionToolbar) {
      setHighlightsOverride(prev => [
        ...(prev ?? highlightsFromApi),
        {
          id: Date.now().toString(),
          text: selectionToolbar.text,
          color,
          startOffset: 0,
          endOffset: 0,
        },
      ]);
      setSelectionToolbar(null);
      globalThis.getSelection()?.removeAllRanges();
    }
  };

  // Save note
  const saveNote = (comment: string, color: 'yellow' | 'green' | 'pink') => {
    if (noteModal) {
      setNotesOverride(prev => [
        ...(prev ?? notesFromApi),
        {
          id: Date.now().toString(),
          text: noteModal.text,
          comment,
          color,
          startOffset: noteModal.startOffset,
          endOffset: noteModal.endOffset,
          timestamp: Date.now(),
        },
      ]);
      setNoteModal(null);
    }
  };

  const renderContent = (content: string) => {
    const parts = content.split(/(\s+)/);
    const isSentenceEnd = (value: string) => /([다요까]\.|습니다\.|습니까\?|[?!])$/.test(value);

    let currentOffset = 0;
    let sentenceIndex = 0;
    let breakNextWhitespace = false;

    return parts.map((part, i) => {
      const startOffset = currentOffset;
      currentOffset += part.length;

      if (/^\s+$/.test(part)) {
        const hasNewline = part.includes('\n');
        if (hasNewline || breakNextWhitespace) {
          breakNextWhitespace = false;
          return <br key={`br-${startOffset}-${i}`} />;
        }
        return <span key={`ws-${startOffset}-${i}`}> </span>;
      }

      const normalizedWord = normalizeLookupWord(part);
      const currentSentenceIndex = sentenceIndex;

      if (isSentenceEnd(part)) {
        sentenceIndex += 1;
        breakNextWhitespace = true;
      }

      if (!normalizedWord) {
        return <span key={`text-${startOffset}-${i}`}>{part}</span>;
      }

      const hasHighlight = highlights.find(h => h.text.includes(part));
      const hasNote = notes.find(n => n.text.includes(part));

      return (
        <WordEntry
          key={`word-${startOffset}-${normalizedWord}-${i}`}
          part={part}
          normalizedWord={normalizedWord}
          offset={startOffset}
          sentenceIndex={currentSentenceIndex}
          hasHighlight={hasHighlight}
          hasNote={hasNote}
        />
      );
    });
  };

  // Send AI message
  const sendAiMessage = () => {
    if (!aiInput.trim()) return;
    setAiMessages(prev => [...prev, { role: 'user', content: aiInput }]);
    // Mock AI response
    setTimeout(() => {
      setAiMessages(prev => [
        ...prev,
        {
          role: 'ai',
          content: `关于"${aiInput}"的解释：这是一个很好的问题！在韩语中，这个语法点用于表示...（AI回复示例）`,
        },
      ]);
    }, 500);
    setAiInput('');
  };

  return (
    <div
      className="h-[calc(100vh-48px)] h-[calc(100dvh-48px)] flex flex-col"
      style={{
        backgroundImage: 'radial-gradient(#d4d4d8 1px, transparent 1px)',
        backgroundSize: '20px 20px',
        backgroundColor: '#f4f4f5',
      }}
    >
      {/* Loading State */}
      {isLoading && <ListeningModuleSkeleton />}

      {/* Error State */}
      {error && !isLoading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-zinc-400">
            <p className="font-bold mb-4">
              {labels.dashboard?.common?.error || '加载失败，请重试'}
            </p>
            <button
              onClick={onBack}
              className="px-4 py-2 bg-zinc-900 text-white rounded-lg font-bold"
            >
              {labels.dashboard?.common?.back || '返回'}
            </button>
          </div>
        </div>
      )}

      {/* Main Content - only show when loaded */}
      {!isLoading && !error && (
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
              <h1 className="font-black text-lg">{unitData?.title || unitTitle}</h1>
            </div>

            {/* Center: Unit Info Badge + Article Selector */}
            <div className="flex gap-2 items-center">
              {/* Unit Selector - Green styled dropdown with arrow */}
              <div className="relative">
                <select
                  value={selectedUnitIndex}
                  onChange={e => setSelectedUnitIndex(Number(e.target.value))}
                  className="px-4 py-2 pr-8 bg-lime-300 border-2 border-zinc-900 rounded-lg font-bold text-sm cursor-pointer hover:bg-lime-400 transition-colors appearance-none"
                >
                  {(uniqueUnitIndices.length > 0 ? uniqueUnitIndices : [selectedUnitIndex]).map(
                    (idx: number) => (
                      <option key={idx} value={idx}>
                        📖{' '}
                        {(labels.dashboard?.reading?.lesson || '第 {idx} 课').replace(
                          '{idx}',
                          idx.toString()
                        )}
                      </option>
                    )
                  )}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" />
              </div>

              {/* Article Selector */}
              {articles.length > 1 && (
                <div className="flex bg-white border-2 border-zinc-900 rounded-lg overflow-hidden">
                  {articles.map(article => {
                    const articleIndex = article.articleIndex ?? 1;
                    return (
                      <button
                        key={articleIndex}
                        onClick={() => setActiveArticleIndex(articleIndex)}
                        className={`px-3 py-2 font-bold text-xs transition-colors border-r-2 border-zinc-900 last:border-r-0 ${
                          activeArticleIndex === article.articleIndex
                            ? 'bg-zinc-900 text-white'
                            : 'hover:bg-zinc-50'
                        }`}
                      >
                        {(labels.dashboard?.reading?.article || '文章').replace(
                          '{index}',
                          articleIndex.toString()
                        )}{' '}
                        {articleIndex}
                      </button>
                    );
                  })}
                </div>
              )}

              {grammarList.length > 0 && (
                <span className="hidden md:inline-block px-3 py-2 bg-white border-2 border-zinc-900 rounded-lg font-bold text-xs">
                  {(labels.dashboard?.reading?.grammarCount || '{count} 个语法点').replace(
                    '{count}',
                    grammarList.length.toString()
                  )}
                </span>
              )}
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
                  isSerif={isSerif}
                  onFontSizeChange={setFontSize}
                  onSerifToggle={() => setIsSerif(!isSerif)}
                  onClose={() => setShowSettings(false)}
                  language={language}
                />
              )}
            </div>
          </header>

          {/* Main Content: Split Screen */}
          <div className="flex-1 flex overflow-hidden">
            {/* Left: Reader Panel (65% desktop, full width mobile) */}
            <div className="w-full md:w-[65%] md:border-r-2 border-zinc-900 overflow-y-auto p-4 md:p-8">
              <div
                ref={readerRef}
                className={`bg-[#FDFBF7] border-2 border-zinc-900 rounded-xl shadow-[6px_6px_0px_0px_#18181B] p-8 max-w-2xl mx-auto ${isSerif ? 'font-serif' : 'font-sans'}`}
                style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}
                aria-label={labels.dashboard?.reading?.readerLabel || '文章阅读器'}
              >
                <h2 className="text-2xl font-black mb-6 text-zinc-900">
                  {unitData?.title || labels.dashboard?.reading?.noArticles || '暂无文章'}
                </h2>
                <div className="text-zinc-800 leading-loose">
                  {unitData?.readingText ? (
                    renderContent(unitData.readingText)
                  ) : (
                    <p className="text-zinc-400">
                      {labels.dashboard?.reading?.noContent || '暂无内容'}
                    </p>
                  )}
                </div>

                {/* Translation Toggle */}
                {unitData?.translation && (
                  <div className="mt-8 pt-6 border-t-2 border-zinc-200">
                    <details className="group">
                      <summary className="cursor-pointer font-bold text-sm text-zinc-500 hover:text-zinc-700 flex items-center gap-2">
                        <Languages className="w-4 h-4" />
                        {labels.dashboard?.reading?.showTranslation || '显示翻译'}
                        <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="mt-4 p-4 bg-zinc-50 rounded-lg text-sm text-zinc-600 whitespace-pre-wrap">
                        {getLocalizedContent(unitData, 'translation', language)}
                      </div>
                    </details>
                  </div>
                )}

                {/* Complete Unit Button */}
                <div className="mt-8 pt-6 border-t-2 border-zinc-200 flex justify-center">
                  <button
                    onClick={async () => {
                      try {
                        await completeUnitMutation({ courseId, unitIndex: selectedUnitIndex });
                        flushReadingTime(true);
                        // Show success feedback
                        notify.success(labels.dashboard?.reading?.learned || '🎉 本课学习已完成！');
                      } catch (e) {
                        console.error('Failed to mark unit complete:', e);
                      }
                    }}
                    className="px-8 py-3 bg-lime-300 border-2 border-zinc-900 rounded-xl font-bold text-sm hover:bg-lime-400 shadow-[4px_4px_0px_0px_#18181B] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
                  >
                    ✅ {labels.dashboard?.reading?.completeLesson || '完成本课学习'}
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Study Hub (35% - hidden on mobile) */}
            <div className="hidden md:flex w-[35%] bg-[#FDFBF7] flex-col overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b-2 border-zinc-900 shrink-0">
                {(
                  [
                    {
                      key: 'grammar',
                      label: labels.dashboard?.reading?.grammar || '语法点',
                      icon: Sparkles,
                    },
                    {
                      key: 'notes',
                      label: labels.dashboard?.reading?.note || '笔记',
                      icon: PenLine,
                    },
                    {
                      key: 'ai',
                      label: labels.dashboard?.reading?.aiAssistant || 'AI助教',
                      icon: MessageSquare,
                    },
                  ] as const
                ).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 font-bold text-sm border-r-2 border-zinc-900 last:border-r-0 transition-colors ${
                      activeTab === tab.key ? 'bg-lime-300' : 'bg-white hover:bg-zinc-100'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {activeTab === 'notes' && (
                  <div className="space-y-3">
                    {notes.length === 0 ? (
                      <div className="text-center text-zinc-400 py-8">
                        <PenLine className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="font-bold">
                          {labels.dashboard?.reading?.noNotes || '暂无笔记'}
                        </p>
                        <p className="text-xs">
                          {labels.dashboard?.reading?.selectedText || '选中文本添加笔记'}
                        </p>
                      </div>
                    ) : (
                      notes.map(note => (
                        <div
                          key={note.id}
                          className="bg-white border-2 border-zinc-900 rounded-lg p-3 cursor-pointer hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none shadow-[3px_3px_0px_0px_#18181B] transition-all"
                          style={{
                            borderLeftColor: HIGHLIGHT_COLORS[note.color],
                            borderLeftWidth: 4,
                          }}
                        >
                          <p className="font-bold text-sm text-zinc-900 mb-1 underline decoration-wavy decoration-amber-500">
                            {note.text}
                          </p>
                          <p className="text-xs text-zinc-600">{note.comment}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'grammar' && (
                  <div className="space-y-3">
                    {grammarList.length === 0 ? (
                      <div className="text-center text-zinc-400 py-8">
                        <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="font-bold">
                          {labels.dashboard?.reading?.noGrammar || '本课暂无语法点'}
                        </p>
                        <p className="text-xs">
                          {labels.dashboard?.reading?.addGrammar || '请先添加课程语法'}
                        </p>
                      </div>
                    ) : (
                      grammarList.map((grammar: GrammarItem) => (
                        <div
                          key={grammar.id}
                          className="bg-white border-2 border-zinc-900 rounded-lg p-4 shadow-[2px_2px_0px_0px_#18181B]"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 bg-violet-200 text-violet-800 rounded text-xs font-bold">
                              {grammar.type || '语法'}
                            </span>
                            <h4 className="font-bold text-zinc-900">{grammar.title}</h4>
                          </div>
                          <p className="text-sm text-zinc-600">{grammar.summary}</p>
                          {grammar.explanation && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-700">
                                {labels.dashboard?.reading?.viewExplanation || '查看详细解释'}
                              </summary>
                              <p className="mt-2 text-xs text-zinc-500 bg-zinc-50 p-2 rounded">
                                {grammar.explanation}
                              </p>
                            </details>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'ai' && (
                  <div className="flex flex-col h-full">
                    <div className="flex-1 space-y-3 mb-4 overflow-y-auto">
                      {aiMessages.map(msg => (
                        <div
                          key={`ai-msg-${msg.role}-${msg.content.slice(0, 20)}`}
                          className={`p-3 rounded-lg border-2 border-zinc-900 ${
                            msg.role === 'user' ? 'bg-lime-100 ml-8' : 'bg-white mr-8'
                          }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <input
                        type="text"
                        value={aiInput}
                        onChange={e => setAiInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendAiMessage()}
                        placeholder={labels.dashboard?.reading?.placeholder || '问我语法问题...'}
                        className="flex-1 px-4 py-2 border-2 border-zinc-900 rounded-lg font-bold text-sm focus:shadow-[2px_2px_0px_0px_#18181B] outline-none"
                      />
                      <button
                        onClick={sendAiMessage}
                        className="px-4 py-2 bg-lime-300 border-2 border-zinc-900 rounded-lg font-bold hover:bg-lime-400 active:translate-x-0.5 active:translate-y-0.5 shadow-[2px_2px_0px_0px_#18181B] active:shadow-none transition-all"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Popovers */}
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
                onSave={() => saveWordToVocab(selectedWord.word, selectedWord.meaning)}
                onSpeak={() => speak(selectedWord.word)}
                language={language}
              />
            </div>
          )}

          {selectionToolbar && (
            <div data-popover>
              <SelectionToolbar
                position={selectionToolbar.position}
                onTranslate={() => {
                  notify.info(`翻译：${selectionToolbar.text}`);
                  setSelectionToolbar(null);
                }}
                onSpeak={() => {
                  speak(selectionToolbar.text);
                  setSelectionToolbar(null);
                }}
                onNote={() => {
                  setNoteModal({
                    text: selectionToolbar.text,
                    startOffset: 0,
                    endOffset: 0,
                  });
                  setSelectionToolbar(null);
                }}
                onHighlight={addHighlight}
                language={language}
              />
            </div>
          )}

          {noteModal && (
            <NoteInputModal
              selectedText={noteModal.text}
              onSave={saveNote}
              onClose={() => setNoteModal(null)}
              language={language}
            />
          )}

          {/* Mobile: Floating Action Button for Study Hub */}
          <button
            onClick={() => setMobileSheetOpen(true)}
            className="md:hidden fixed bottom-28 right-4 z-40 w-14 h-14 bg-lime-400 border-2 border-zinc-900 rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px_#18181B] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
          >
            <Menu className="w-6 h-6 text-zinc-900" />
          </button>

          {/* Mobile: Bottom Sheet for Study Hub */}
          <BottomSheet
            isOpen={mobileSheetOpen}
            onClose={() => setMobileSheetOpen(false)}
            title={labels.dashboard?.reading?.studyTool || '学习工具'}
            height="half"
          >
            {/* Mobile Tabs */}
            <div className="flex border-b border-zinc-200 mb-4 -mx-5 px-5">
              {(
                [
                  {
                    key: 'grammar',
                    label: labels.dashboard?.reading?.grammar || '语法',
                    icon: Sparkles,
                  },
                  { key: 'notes', label: labels.dashboard?.reading?.note || '笔记', icon: PenLine },
                ] as const
              ).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-1 py-2 text-sm font-bold transition-colors border-b-2 -mb-[2px] ${
                    activeTab === tab.key
                      ? 'border-lime-500 text-lime-600'
                      : 'border-transparent text-zinc-400'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Mobile Content */}

            {activeTab === 'grammar' && (
              <div className="space-y-2">
                {grammarList.slice(0, 5).map((g: GrammarItem) => (
                  <div key={g.id} className="p-3 bg-zinc-50 rounded-lg">
                    <div className="font-bold text-zinc-900">{g.title}</div>
                    <div className="text-sm text-zinc-500">{g.explanation}</div>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'notes' && (
              <div className="space-y-2">
                {notes.length === 0 ? (
                  <p className="text-center text-zinc-400 py-4">
                    {labels.dashboard?.reading?.selectedText || '选中文本添加笔记'}
                  </p>
                ) : (
                  notes.map(note => (
                    <div
                      key={note.id}
                      className="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400"
                    >
                      <div className="font-bold text-sm">{note.text}</div>
                      <div className="text-xs text-zinc-500">{note.comment}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </BottomSheet>
        </>
      )}
    </div>
  );
};

export default ReadingModule;
