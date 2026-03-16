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
import { aRef, INSTITUTES, mRef, qRef } from '../../utils/convexRefs';
import BottomSheet from '../../components/common/BottomSheet';
import { Language } from '../../types';
import { getLocalizedContent } from '../../utils/languageUtils';
import { getLabels } from '../../utils/i18n';
import { ListeningModuleSkeleton } from '../../components/common';
import { useTTS } from '../../hooks/useTTS';
import { useOutsideDismiss } from '../../hooks/useOutsideDismiss';
import { notify } from '../../utils/notify';
import { extractBestMeaning, normalizeLookupWord } from '../../utils/dictionaryMeaning';
import { useUserActions } from '../../hooks/useUserActions';
import { useActivityLogger } from '../../hooks/useActivityLogger';
import { Dialog, DialogContent, DialogOverlay, DialogPortal } from '../../components/ui';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../../components/ui';
import { Popover, PopoverContent, PopoverPortal } from '../../components/ui';
import { Button, Input, Select, Textarea } from '../../components/ui';

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

interface SelectedWordState {
  word: string;
  lemma?: string;
  meaning: string;
  baseForm?: string;
  contextTranslation?: string;
  grammarMatches?: GrammarMatch[];
  position: { x: number; y: number };
  isFromVocabList: boolean;
}

interface SelectionToolbarState {
  text: string;
  position: { x: number; y: number };
  range: Range;
}

interface NoteModalState {
  text: string;
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

const POPOVER_DISMISS_SELECTORS = ['[data-popover]', '[data-word]'] as const;

// =========================================
// Constants & Utils
// =========================================
type ReadingTranslationLanguage = 'en' | 'zh' | 'vi' | 'mn';

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

function resolveReadingTranslationLanguage(
  language: Language
): ReadingTranslationLanguage | undefined {
  if (language === 'en' || language === 'zh' || language === 'vi' || language === 'mn') {
    return language;
  }
  return undefined;
}

function resolveUniqueUnitIndices(availableUnits: { unitIndex: number }[] | undefined): number[] {
  if (!availableUnits) return [];
  const indices = [...new Set(availableUnits.map((unit: { unitIndex: number }) => unit.unitIndex))];
  return indices.sort((a, b) => a - b);
}

function resolveFallbackUnitCount(
  totalUnits: number | undefined,
  initialUnitIndex: number
): number {
  if (typeof totalUnits === 'number' && totalUnits > 0) {
    return totalUnits;
  }
  return Math.max(initialUnitIndex, 10);
}

function resolveSelectableUnitIndices(
  uniqueUnitIndices: number[],
  fallbackUnitCount: number
): number[] {
  if (uniqueUnitIndices.length > 0) return uniqueUnitIndices;
  return Array.from({ length: fallbackUnitCount }, (_, index) => index + 1);
}

function resolveSelectedUnitIndex(
  selectableUnitIndices: number[],
  selectedUnitIndexOverride: number
): number {
  if (selectableUnitIndices.length === 0) return selectedUnitIndexOverride;
  return selectableUnitIndices.includes(selectedUnitIndexOverride)
    ? selectedUnitIndexOverride
    : selectableUnitIndices[0];
}

function resolveArticles(
  unitArticles: UnitArticle[] | undefined,
  unit: UnitArticle | undefined
): UnitArticle[] {
  if (Array.isArray(unitArticles) && unitArticles.length > 0) return unitArticles;
  if (unit) return [{ ...unit, articleIndex: 1 }];
  return [];
}

function resolveActiveArticleIndex(
  articles: UnitArticle[],
  activeArticleIndexOverride: number
): number {
  if (articles.length === 0) return activeArticleIndexOverride;
  const available = articles.map(article => article.articleIndex || 1);
  const first = available[0] || 1;
  return available.includes(activeArticleIndexOverride) ? activeArticleIndexOverride : first;
}

function fallbackText(value: string | undefined | null, fallback: string): string {
  if (value) return value;
  return fallback;
}

function resolveInstituteQueryArg(courseId: string) {
  return courseId ? { id: courseId } : 'skip';
}

function resolveReadingModuleText(labels: ReturnType<typeof getLabels>) {
  return {
    noMeaning: fallbackText(labels.dashboard?.common?.noMeaning, 'No meaning'),
    loading: fallbackText(labels.dashboard?.common?.loading, 'Looking up...'),
    aiGreeting: fallbackText(labels.dashboard?.reading?.aiGreeting, 'Hi! I am your AI assistant.'),
    lessonLearned: fallbackText(labels.dashboard?.reading?.learned, '🎉 Lesson completed!'),
  };
}

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
    <Popover open onOpenChange={open => !open && onClose()}>
      <PopoverPortal>
        <PopoverContent
          unstyled
          data-popover
          className="fixed z-50 min-w-[200px] rounded-lg border-2 border-foreground bg-card dark:bg-slate-900 p-4 shadow-[4px_4px_0px_0px_#18181B] dark:shadow-[4px_4px_0px_0px_rgba(148,163,184,0.22)]"
          style={{ left: position.x, top: position.y }}
        >
          <Button
            variant="ghost"
            size="auto"
            onClick={onClose}
            className="absolute -top-2 -right-2 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center hover:bg-red-500 transition-colors"
          >
            <X className="w-3 h-3" />
          </Button>

          <div className="text-xl font-black text-foreground mb-1">{headword}</div>
          {lemma && lemma !== word && (
            <div className="text-xs text-muted-foreground mb-2">{word}</div>
          )}
          <div className="text-sm text-muted-foreground mb-3">{meaning}</div>
          {grammarMatches && grammarMatches.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-bold text-foreground mb-1">
                {labels.grammar || 'Grammar'}
              </div>
              <div className="space-y-1">
                {grammarMatches.slice(0, 5).map(g => (
                  <div key={g.id} className="text-xs text-muted-foreground">
                    <span className="font-bold">{g.title}</span>
                    {g.summary ? (
                      <span className="text-muted-foreground"> · {g.summary}</span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}
          {contextTranslation && (
            <div className="text-xs text-muted-foreground mb-3 whitespace-pre-wrap">
              {contextTranslation}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="auto"
              onClick={onSpeak}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-card border-2 border-foreground rounded-lg font-bold text-xs text-foreground hover:bg-muted active:translate-x-0.5 active:translate-y-0.5 active:shadow-none shadow-[2px_2px_0px_0px_#18181B] transition-all"
            >
              <Volume2 className="w-3 h-3" />
              {labels.dashboard?.common?.read || 'Read aloud'}
            </Button>
            <Button
              variant="ghost"
              size="auto"
              onClick={onSave}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-lime-300 border-2 border-foreground rounded-lg font-bold text-xs text-foreground hover:bg-lime-400 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none shadow-[2px_2px_0px_0px_#18181B] transition-all"
            >
              <Plus className="w-3 h-3" />
              {labels.dashboard?.common?.addVocab || 'Save word'}
            </Button>
          </div>
        </PopoverContent>
      </PopoverPortal>
    </Popover>
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
      className="fixed z-50 bg-primary text-white rounded-lg shadow-lg flex items-center gap-1 p-1"
      style={{ left: position.x, top: position.y }}
    >
      <Button
        variant="ghost"
        size="auto"
        onClick={onTranslate}
        className="flex items-center gap-1 px-3 py-2 rounded hover:bg-muted text-xs font-bold transition-colors text-primary-foreground"
      >
        <Languages className="w-3 h-3" />
        {labels.dashboard?.reading?.translate || 'Translate'}
      </Button>
      <Button
        variant="ghost"
        size="auto"
        onClick={onSpeak}
        className="flex items-center gap-1 px-3 py-2 rounded hover:bg-muted text-xs font-bold transition-colors text-primary-foreground"
      >
        <Volume2 className="w-3 h-3" />
        {labels.dashboard?.common?.read || 'Read aloud'}
      </Button>
      <Button
        variant="ghost"
        size="auto"
        onClick={onNote}
        className="flex items-center gap-1 px-3 py-2 rounded hover:bg-muted text-xs font-bold transition-colors text-primary-foreground"
      >
        <PenLine className="w-3 h-3" />
        {labels.dashboard?.reading?.note || 'Notes'}
      </Button>
      <div className="relative">
        <DropdownMenu open={showColors} onOpenChange={setShowColors}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="auto"
              type="button"
              className="flex items-center gap-1 px-3 py-2 rounded hover:bg-muted text-xs font-bold transition-colors text-primary-foreground"
            >
              <Highlighter className="w-3 h-3" />
              {labels.dashboard?.reading?.highlight || 'Highlight'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            unstyled
            className="absolute top-full left-0 mt-1 bg-muted rounded-lg p-2 flex gap-2"
          >
            <Button
              variant="ghost"
              size="auto"
              type="button"
              onClick={() => {
                onHighlight('yellow');
                setShowColors(false);
              }}
              className="w-5 h-5 bg-yellow-300 rounded-full border-2 border-white hover:scale-110 transition-transform"
            />
            <Button
              variant="ghost"
              size="auto"
              type="button"
              onClick={() => {
                onHighlight('green');
                setShowColors(false);
              }}
              className="w-5 h-5 bg-green-300 rounded-full border-2 border-white hover:scale-110 transition-transform"
            />
            <Button
              variant="ghost"
              size="auto"
              type="button"
              onClick={() => {
                onHighlight('pink');
                setShowColors(false);
              }}
              className="w-5 h-5 bg-pink-300 rounded-full border-2 border-white hover:scale-110 transition-transform"
            />
          </DropdownMenuContent>
        </DropdownMenu>
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
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogPortal>
        <DialogOverlay unstyled closeOnClick={false} className="fixed inset-0 bg-black/50 z-50" />
        <DialogContent
          unstyled
          closeOnEscape={false}
          lockBodyScroll={false}
          className="fixed inset-0 z-[51] flex items-center justify-center pointer-events-none"
        >
          <div className="pointer-events-auto bg-card dark:bg-slate-900 border-2 border-foreground rounded-xl shadow-[8px_8px_0px_0px_#18181B] dark:shadow-[8px_8px_0px_0px_rgba(148,163,184,0.22)] p-6 w-96">
            <h3 className="font-black text-lg mb-4">
              {labels.dashboard?.reading?.addNote || 'Add note'}
            </h3>

            <div className="bg-muted border-2 border-border rounded-lg p-3 mb-4">
              <p className="text-sm text-muted-foreground font-bold">
                {labels.dashboard?.reading?.selectedText || 'Selected text:'}
              </p>
              <p className="text-foreground font-bold">{selectedText}</p>
            </div>

            <Textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder={labels.dashboard?.reading?.writeNote || 'Write your note...'}
              className="w-full !h-24 !px-3 !py-2 !border-2 !border-foreground !rounded-lg font-bold text-sm focus-visible:shadow-[2px_2px_0px_0px_#18181B] outline-none resize-none mb-4 !shadow-none"
            />

            <div className="flex items-center gap-4 mb-4">
              <span className="text-sm font-bold text-muted-foreground">
                {labels.dashboard?.reading?.color || 'Color:'}
              </span>
              <div className="flex gap-2">
                {(['yellow', 'green', 'pink'] as HighlightColor[]).map(c => (
                  <Button
                    variant="ghost"
                    size="auto"
                    key={c}
                    onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full border-2 ${
                      color === c ? 'border-foreground scale-110' : 'border-border'
                    } ${HIGHLIGHT_CLASSES[c]} transition-all`}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="ghost"
                size="auto"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-card border-2 border-foreground rounded-lg font-bold text-foreground hover:bg-muted active:translate-x-0.5 active:translate-y-0.5 active:shadow-none shadow-[2px_2px_0px_0px_#18181B] transition-all"
              >
                {labels.dashboard?.reading?.cancel || 'Cancel'}
              </Button>
              <Button
                variant="ghost"
                size="auto"
                onClick={() => onSave(comment, color)}
                disabled={!comment.trim()}
                className="flex-1 px-4 py-2 bg-lime-300 border-2 border-foreground rounded-lg font-bold text-foreground hover:bg-lime-400 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none shadow-[2px_2px_0px_0px_#18181B] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {labels.dashboard?.reading?.save || 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
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
    <div className="bg-card dark:bg-slate-900 border-2 border-foreground rounded-lg shadow-[4px_4px_0px_0px_#18181B] dark:shadow-[4px_4px_0px_0px_rgba(148,163,184,0.22)] p-4 w-56">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-black text-sm">
          {labels.dashboard?.reading?.settings || 'Reading Settings'}
        </h4>
        <Button
          variant="ghost"
          size="auto"
          onClick={onClose}
          className="w-6 h-6 rounded-full bg-card border-2 border-foreground flex items-center justify-center hover:bg-muted active:translate-x-0.5 active:translate-y-0.5 transition-all"
          aria-label={labels.dashboard?.common?.close || 'Close'}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>

      <div className="mb-4">
        <label className="text-xs font-bold text-muted-foreground mb-2 block">
          {labels.dashboard?.reading?.fontSize || 'Font Size'}
        </label>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="auto"
            onClick={() => onFontSizeChange(Math.max(14, fontSize - 2))}
            className="px-3 py-1 bg-card border-2 border-foreground rounded font-bold text-sm text-foreground hover:bg-muted active:translate-x-0.5 active:translate-y-0.5 shadow-[2px_2px_0px_0px_#18181B] active:shadow-none transition-all"
          >
            A-
          </Button>
          <span className="flex-1 text-center font-bold">{fontSize}px</span>
          <Button
            variant="ghost"
            size="auto"
            onClick={() => onFontSizeChange(Math.min(28, fontSize + 2))}
            className="px-3 py-1 bg-card border-2 border-foreground rounded font-bold text-sm text-foreground hover:bg-muted active:translate-x-0.5 active:translate-y-0.5 shadow-[2px_2px_0px_0px_#18181B] active:shadow-none transition-all"
          >
            A+
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-muted-foreground">
          {labels.dashboard?.reading?.serif || 'Serif font'}
        </span>
        <Button
          variant="ghost"
          size="auto"
          onClick={onSerifToggle}
          className={`w-12 h-6 rounded-full border-2 border-foreground relative transition-colors ${isSerif ? 'bg-lime-300' : 'bg-muted'}`}
        >
          <div
            className={`absolute top-0.5 w-4 h-4 bg-card rounded-full border border-foreground transition-all ${isSerif ? 'left-6' : 'left-0.5'}`}
          />
        </Button>
      </div>
    </div>
  );
};

type ReadingLabels = ReturnType<typeof getLabels>;
type ReadingModuleTab = 'notes' | 'grammar' | 'ai';

interface ReadingErrorStateProps {
  labels: ReadingLabels;
  onBack?: () => void;
}

const ReadingErrorState: React.FC<ReadingErrorStateProps> = ({ labels, onBack }) => (
  <div className="flex-1 flex items-center justify-center">
    <div className="text-center text-muted-foreground">
      <p className="font-bold mb-4">
        {labels.dashboard?.common?.error || 'Failed to load. Please try again.'}
      </p>
      <Button
        variant="ghost"
        size="auto"
        onClick={onBack}
        className="px-4 py-2 bg-primary text-white rounded-lg font-bold"
      >
        {labels.dashboard?.common?.back || 'Back'}
      </Button>
    </div>
  </div>
);

interface ReadingModuleHeaderProps {
  labels: ReadingLabels;
  onBack?: () => void;
  unitTitle: string;
  unitData: UnitArticle | null;
  selectedUnitIndex: number;
  selectableUnitIndices: number[];
  formatLessonLabel: (idx: number) => string;
  setSelectedUnitIndex: (next: number) => void;
  articles: UnitArticle[];
  activeArticleIndex: number;
  setActiveArticleIndex: (next: number) => void;
  grammarCount: number;
  showSettings: boolean;
  setShowSettings: React.Dispatch<React.SetStateAction<boolean>>;
  fontSize: number;
  isSerif: boolean;
  setFontSize: React.Dispatch<React.SetStateAction<number>>;
  setIsSerif: React.Dispatch<React.SetStateAction<boolean>>;
  language: Language;
}

const ReadingModuleHeader: React.FC<ReadingModuleHeaderProps> = ({
  labels,
  onBack,
  unitTitle,
  unitData,
  selectedUnitIndex,
  selectableUnitIndices,
  formatLessonLabel,
  setSelectedUnitIndex,
  articles,
  activeArticleIndex,
  setActiveArticleIndex,
  grammarCount,
  showSettings,
  setShowSettings,
  fontSize,
  isSerif,
  setFontSize,
  setIsSerif,
  language,
}) => (
  <header className="bg-card dark:bg-slate-900 border-b-2 border-foreground px-3 sm:px-6 py-3 shrink-0">
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3 min-w-0">
        <Button
          variant="ghost"
          size="auto"
          onClick={onBack}
          className="w-10 h-10 bg-card border-2 border-foreground rounded-lg flex items-center justify-center hover:bg-muted active:translate-x-0.5 active:translate-y-0.5 shadow-[3px_3px_0px_0px_#18181B] active:shadow-none transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-black text-base sm:text-lg truncate">{unitData?.title || unitTitle}</h1>
      </div>

      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
        <div className="relative w-full sm:w-auto">
          <Select
            value={selectedUnitIndex}
            onChange={e => setSelectedUnitIndex(Number(e.target.value))}
            className="!h-auto w-full sm:w-auto !px-4 !py-2 !pr-8 !bg-lime-300 dark:!bg-slate-700 dark:hover:!bg-slate-600 dark:!text-slate-100 !border-2 !border-foreground !rounded-lg font-bold text-sm cursor-pointer hover:!bg-lime-400 transition-colors appearance-none !shadow-none"
          >
            {selectableUnitIndices.map((idx: number) => (
              <option key={idx} value={idx}>
                📖 {formatLessonLabel(idx)}
              </option>
            ))}
          </Select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" />
        </div>

        {articles.length > 1 && (
          <div className="flex flex-wrap bg-card border-2 border-foreground rounded-lg overflow-hidden">
            {articles.map(article => {
              const articleIndex = article.articleIndex ?? 1;
              return (
                <Button
                  variant="ghost"
                  size="auto"
                  key={articleIndex}
                  onClick={() => setActiveArticleIndex(articleIndex)}
                  className={`px-3 py-2 font-bold text-xs text-foreground transition-colors border-r-2 border-foreground last:border-r-0 ${
                    activeArticleIndex === articleIndex ? 'bg-primary text-white' : 'hover:bg-muted'
                  }`}
                >
                  {(labels.dashboard?.reading?.article || 'Article').replace(
                    '{index}',
                    articleIndex.toString()
                  )}{' '}
                  {articleIndex}
                </Button>
              );
            })}
          </div>
        )}

        {grammarCount > 0 && (
          <span className="hidden sm:inline-block px-3 py-2 bg-card border-2 border-foreground rounded-lg font-bold text-xs">
            {(labels.dashboard?.reading?.grammarCount || '{count} grammar points').replace(
              '{count}',
              grammarCount.toString()
            )}
          </span>
        )}
      </div>

      <div className="self-end md:self-auto relative">
        <DropdownMenu open={showSettings} onOpenChange={setShowSettings}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="auto"
              type="button"
              className="w-10 h-10 bg-card border-2 border-foreground rounded-lg flex items-center justify-center hover:bg-muted active:translate-x-0.5 active:translate-y-0.5 shadow-[3px_3px_0px_0px_#18181B] active:shadow-none transition-all"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent unstyled className="absolute right-0 top-full mt-2 z-50">
            <SettingsPanel
              fontSize={fontSize}
              isSerif={isSerif}
              onFontSizeChange={setFontSize}
              onSerifToggle={() => setIsSerif(prev => !prev)}
              onClose={() => setShowSettings(false)}
              language={language}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  </header>
);

interface ReadingReaderPanelProps {
  labels: ReadingLabels;
  readerRef: React.RefObject<HTMLDivElement | null>;
  isSerif: boolean;
  fontSize: number;
  unitData: UnitArticle | null;
  renderContent: (content: string) => React.ReactNode;
  language: Language;
  completingUnit: boolean;
  onCompleteUnit: () => void;
}

const ReadingReaderPanel: React.FC<ReadingReaderPanelProps> = ({
  labels,
  readerRef,
  isSerif,
  fontSize,
  unitData,
  renderContent,
  language,
  completingUnit,
  onCompleteUnit,
}) => {
  const readerLabel = fallbackText(labels.dashboard?.reading?.readerLabel, 'Article reader');
  const emptyArticleLabel = fallbackText(labels.dashboard?.reading?.noArticles, 'No article');
  const readerTitle = fallbackText(unitData?.title, emptyArticleLabel);
  const noContentLabel = fallbackText(labels.dashboard?.reading?.noContent, 'No content');
  const showTranslationLabel = fallbackText(
    labels.dashboard?.reading?.showTranslation,
    'Show translation'
  );
  const completeLessonLabel = fallbackText(
    labels.dashboard?.reading?.completeLesson,
    'Complete lesson'
  );

  return (
    <div className="w-full md:w-[65%] md:border-r-2 border-foreground overflow-y-auto p-3 sm:p-4 md:p-8">
      <div
        ref={readerRef}
        className={`bg-card dark:bg-slate-900 border-2 border-foreground rounded-xl shadow-[6px_6px_0px_0px_#18181B] dark:shadow-[6px_6px_0px_0px_rgba(148,163,184,0.22)] p-4 sm:p-6 md:p-8 max-w-full sm:max-w-2xl mx-auto ${isSerif ? 'font-serif' : 'font-sans'}`}
        style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}
        aria-label={readerLabel}
      >
        <h2 className="text-2xl font-black mb-6 text-foreground">{readerTitle}</h2>
        <div className="text-muted-foreground leading-loose break-words">
          {unitData?.readingText ? (
            renderContent(unitData.readingText)
          ) : (
            <p className="text-muted-foreground">{noContentLabel}</p>
          )}
        </div>

        {unitData?.translation && (
          <div className="mt-8 pt-6 border-t-2 border-border">
            <details className="group">
              <summary className="cursor-pointer font-bold text-sm text-muted-foreground hover:text-muted-foreground flex items-center gap-2">
                <Languages className="w-4 h-4" />
                {showTranslationLabel}
                <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-4 p-4 bg-muted rounded-lg text-sm text-muted-foreground whitespace-pre-wrap">
                {getLocalizedContent(unitData, 'translation', language)}
              </div>
            </details>
          </div>
        )}

        <div className="mt-8 pt-6 border-t-2 border-border flex justify-center">
          <Button
            variant="ghost"
            size="auto"
            onClick={onCompleteUnit}
            disabled={completingUnit}
            loading={completingUnit}
            loadingText={`✅ ${completeLessonLabel}`}
            loadingIconClassName="w-4 h-4"
            className="px-8 py-3 bg-lime-300 border-2 border-foreground rounded-xl font-bold text-sm hover:bg-lime-400 shadow-[4px_4px_0px_0px_#18181B] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
          >
            ✅ {completeLessonLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

interface DesktopNotesTabProps {
  notes: Note[];
  labels: ReadingLabels;
}

const DesktopNotesTab: React.FC<DesktopNotesTabProps> = ({ notes, labels }) => (
  <div className="space-y-3">
    {notes.length === 0 ? (
      <div className="text-center text-muted-foreground py-8">
        <PenLine className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="font-bold">{labels.dashboard?.reading?.noNotes || 'No notes'}</p>
        <p className="text-xs">
          {labels.dashboard?.reading?.selectedText || 'Select text to add a note'}
        </p>
      </div>
    ) : (
      notes.map(note => (
        <div
          key={note.id}
          className="bg-card border-2 border-foreground rounded-lg p-3 cursor-pointer hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none shadow-[3px_3px_0px_0px_#18181B] transition-all"
          style={{ borderLeftColor: HIGHLIGHT_COLORS[note.color], borderLeftWidth: 4 }}
        >
          <p className="font-bold text-sm text-foreground mb-1 underline decoration-wavy decoration-amber-500">
            {note.text}
          </p>
          <p className="text-xs text-muted-foreground">{note.comment}</p>
        </div>
      ))
    )}
  </div>
);

interface DesktopGrammarTabProps {
  grammarList: GrammarItem[];
  labels: ReadingLabels;
}

const DesktopGrammarTab: React.FC<DesktopGrammarTabProps> = ({ grammarList, labels }) => (
  <div className="space-y-3">
    {grammarList.length === 0 ? (
      <div className="text-center text-muted-foreground py-8">
        <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="font-bold">
          {labels.dashboard?.reading?.noGrammar || 'No grammar in this lesson'}
        </p>
        <p className="text-xs">
          {labels.dashboard?.reading?.addGrammar || 'Please add grammar for this lesson first'}
        </p>
      </div>
    ) : (
      grammarList.map(grammar => (
        <div
          key={grammar.id}
          className="bg-card border-2 border-foreground rounded-lg p-4 shadow-[2px_2px_0px_0px_#18181B]"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-violet-200 text-violet-800 rounded text-xs font-bold">
              {grammar.type || 'Grammar'}
            </span>
            <h4 className="font-bold text-foreground">{grammar.title}</h4>
          </div>
          <p className="text-sm text-muted-foreground">{grammar.summary}</p>
          {grammar.explanation && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-muted-foreground">
                {labels.dashboard?.reading?.viewExplanation || 'View detailed explanation'}
              </summary>
              <p className="mt-2 text-xs text-muted-foreground bg-muted p-2 rounded">
                {grammar.explanation}
              </p>
            </details>
          )}
        </div>
      ))
    )}
  </div>
);

interface DesktopAiTabProps {
  aiMessages: { role: string; content: string }[];
  aiInput: string;
  setAiInput: React.Dispatch<React.SetStateAction<string>>;
  sendAiMessage: () => void;
  labels: ReadingLabels;
}

const DesktopAiTab: React.FC<DesktopAiTabProps> = ({
  aiMessages,
  aiInput,
  setAiInput,
  sendAiMessage,
  labels,
}) => (
  <div className="flex flex-col h-full">
    <div className="flex-1 space-y-3 mb-4 overflow-y-auto">
      {aiMessages.map(msg => (
        <div
          key={`ai-msg-${msg.role}-${msg.content.slice(0, 20)}`}
          className={`p-3 rounded-lg border-2 border-foreground ${
            msg.role === 'user'
              ? 'bg-lime-100 dark:bg-lime-900/30 ml-8'
              : 'bg-card dark:bg-slate-800 mr-8'
          }`}
        >
          <p className="text-sm">{msg.content}</p>
        </div>
      ))}
    </div>
    <div className="flex gap-2 shrink-0">
      <Input
        type="text"
        value={aiInput}
        onChange={e => setAiInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && sendAiMessage()}
        placeholder={labels.dashboard?.reading?.placeholder || 'Ask a grammar question...'}
        className="flex-1 !h-auto !px-4 !py-2 !border-2 !border-foreground !rounded-lg font-bold text-sm focus-visible:shadow-[2px_2px_0px_0px_#18181B] outline-none !shadow-none"
      />
      <Button
        variant="ghost"
        size="auto"
        onClick={sendAiMessage}
        className="px-4 py-2 bg-lime-300 border-2 border-foreground rounded-lg font-bold hover:bg-lime-400 active:translate-x-0.5 active:translate-y-0.5 shadow-[2px_2px_0px_0px_#18181B] active:shadow-none transition-all"
      >
        <Send className="w-4 h-4" />
      </Button>
    </div>
  </div>
);

interface ReadingDesktopStudyHubProps {
  labels: ReadingLabels;
  activeTab: ReadingModuleTab;
  setActiveTab: React.Dispatch<React.SetStateAction<ReadingModuleTab>>;
  notes: Note[];
  grammarList: GrammarItem[];
  aiMessages: { role: string; content: string }[];
  aiInput: string;
  setAiInput: React.Dispatch<React.SetStateAction<string>>;
  sendAiMessage: () => void;
}

const ReadingDesktopStudyHub: React.FC<ReadingDesktopStudyHubProps> = ({
  labels,
  activeTab,
  setActiveTab,
  notes,
  grammarList,
  aiMessages,
  aiInput,
  setAiInput,
  sendAiMessage,
}) => (
  <div className="hidden md:flex w-[35%] bg-card dark:bg-slate-900 flex-col overflow-hidden">
    <div className="flex border-b-2 border-foreground shrink-0">
      {(
        [
          {
            key: 'grammar',
            label: labels.dashboard?.reading?.grammar || 'Grammar points',
            icon: Sparkles,
          },
          { key: 'notes', label: labels.dashboard?.reading?.note || 'Notes', icon: PenLine },
          {
            key: 'ai',
            label: labels.dashboard?.reading?.aiAssistant || 'AI tutor',
            icon: MessageSquare,
          },
        ] as const
      ).map(tab => (
        <Button
          variant="ghost"
          size="auto"
          key={tab.key}
          onClick={() => setActiveTab(tab.key)}
          className={`flex-1 flex items-center justify-center gap-2 py-3 font-bold text-sm text-foreground border-r-2 border-foreground last:border-r-0 transition-colors ${
            activeTab === tab.key
              ? 'bg-lime-300 dark:bg-slate-700 dark:text-slate-100'
              : 'bg-card hover:bg-muted'
          }`}
        >
          <tab.icon className="w-4 h-4" />
          {tab.label}
        </Button>
      ))}
    </div>

    <div className="flex-1 overflow-y-auto p-4">
      {activeTab === 'notes' && <DesktopNotesTab notes={notes} labels={labels} />}
      {activeTab === 'grammar' && <DesktopGrammarTab grammarList={grammarList} labels={labels} />}
      {activeTab === 'ai' && (
        <DesktopAiTab
          aiMessages={aiMessages}
          aiInput={aiInput}
          setAiInput={setAiInput}
          sendAiMessage={sendAiMessage}
          labels={labels}
        />
      )}
    </div>
  </div>
);

interface ReadingPopoversProps {
  selectedWord: SelectedWordState | null;
  setSelectedWord: React.Dispatch<React.SetStateAction<SelectedWordState | null>>;
  saveWordToVocab: (word: string, meaning: string) => void;
  speak: (text: string) => void;
  selectionToolbar: SelectionToolbarState | null;
  setSelectionToolbar: React.Dispatch<React.SetStateAction<SelectionToolbarState | null>>;
  setNoteModal: React.Dispatch<React.SetStateAction<NoteModalState | null>>;
  addHighlight: (color: HighlightColor) => void;
  noteModal: NoteModalState | null;
  saveNote: (comment: string, color: HighlightColor) => void;
  language: Language;
}

const ReadingPopovers: React.FC<ReadingPopoversProps> = ({
  selectedWord,
  setSelectedWord,
  saveWordToVocab,
  speak,
  selectionToolbar,
  setSelectionToolbar,
  setNoteModal,
  addHighlight,
  noteModal,
  saveNote,
  language,
}) => (
  <>
    {selectedWord && (
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
    )}

    {selectionToolbar && (
      <div data-popover>
        <SelectionToolbar
          position={selectionToolbar.position}
          onTranslate={() => {
            notify.info(`Translate：${selectionToolbar.text}`);
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
  </>
);

interface ReadingMobileStudyHubProps {
  labels: ReadingLabels;
  activeTab: ReadingModuleTab;
  setActiveTab: React.Dispatch<React.SetStateAction<ReadingModuleTab>>;
  mobileSheetOpen: boolean;
  setMobileSheetOpen: React.Dispatch<React.SetStateAction<boolean>>;
  grammarList: GrammarItem[];
  notes: Note[];
}

const ReadingMobileStudyHub: React.FC<ReadingMobileStudyHubProps> = ({
  labels,
  activeTab,
  setActiveTab,
  mobileSheetOpen,
  setMobileSheetOpen,
  grammarList,
  notes,
}) => (
  <>
    <Button
      variant="ghost"
      size="auto"
      onClick={() => setMobileSheetOpen(true)}
      className="md:hidden fixed bottom-28 right-4 z-40 w-14 h-14 bg-lime-400 border-2 border-foreground rounded-full flex items-center justify-center shadow-[4px_4px_0px_0px_#18181B] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
    >
      <Menu className="w-6 h-6 text-foreground" />
    </Button>

    <BottomSheet
      isOpen={mobileSheetOpen}
      onClose={() => setMobileSheetOpen(false)}
      title={labels.dashboard?.reading?.studyTool || 'Study tools'}
      height="half"
    >
      <div className="flex border-b border-border mb-4 -mx-5 px-5">
        {(
          [
            {
              key: 'grammar',
              label: labels.dashboard?.reading?.grammar || 'Grammar',
              icon: Sparkles,
            },
            { key: 'notes', label: labels.dashboard?.reading?.note || 'Notes', icon: PenLine },
          ] as const
        ).map(tab => (
          <Button
            variant="ghost"
            size="auto"
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 text-sm font-bold transition-colors border-b-2 -mb-[2px] ${
              activeTab === tab.key
                ? 'border-lime-500 text-lime-600'
                : 'border-transparent text-muted-foreground'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </Button>
        ))}
      </div>

      {activeTab === 'grammar' && (
        <div className="space-y-2">
          {grammarList.slice(0, 5).map(grammar => (
            <div key={grammar.id} className="p-3 bg-muted rounded-lg">
              <div className="font-bold text-foreground">{grammar.title}</div>
              <div className="text-sm text-muted-foreground">{grammar.explanation}</div>
            </div>
          ))}
        </div>
      )}
      {activeTab === 'notes' && (
        <div className="space-y-2">
          {notes.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              {labels.dashboard?.reading?.selectedText || 'Select text to add a note'}
            </p>
          ) : (
            notes.map(note => (
              <div
                key={note.id}
                className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-l-4 border-yellow-400"
              >
                <div className="font-bold text-sm">{note.text}</div>
                <div className="text-xs text-muted-foreground">{note.comment}</div>
              </div>
            ))
          )}
        </div>
      )}
    </BottomSheet>
  </>
);

interface ReadingLoadedContentProps {
  labels: ReadingLabels;
  onBack?: () => void;
  unitTitle: string;
  unitData: UnitArticle | null;
  selectedUnitIndex: number;
  selectableUnitIndices: number[];
  formatLessonLabel: (idx: number) => string;
  setSelectedUnitIndex: (next: number) => void;
  articles: UnitArticle[];
  activeArticleIndex: number;
  setActiveArticleIndex: (next: number) => void;
  grammarList: GrammarItem[];
  showSettings: boolean;
  setShowSettings: React.Dispatch<React.SetStateAction<boolean>>;
  fontSize: number;
  setFontSize: React.Dispatch<React.SetStateAction<number>>;
  isSerif: boolean;
  setIsSerif: React.Dispatch<React.SetStateAction<boolean>>;
  readerRef: React.RefObject<HTMLDivElement | null>;
  renderContent: (content: string) => React.ReactNode;
  language: Language;
  completingUnit: boolean;
  onCompleteUnit: () => void;
  activeTab: ReadingModuleTab;
  setActiveTab: React.Dispatch<React.SetStateAction<ReadingModuleTab>>;
  notes: Note[];
  aiMessages: { role: string; content: string }[];
  aiInput: string;
  setAiInput: React.Dispatch<React.SetStateAction<string>>;
  sendAiMessage: () => void;
  selectedWord: SelectedWordState | null;
  setSelectedWord: React.Dispatch<React.SetStateAction<SelectedWordState | null>>;
  saveWordToVocab: (word: string, meaning: string) => void;
  speak: (text: string) => void;
  selectionToolbar: SelectionToolbarState | null;
  setSelectionToolbar: React.Dispatch<React.SetStateAction<SelectionToolbarState | null>>;
  setNoteModal: React.Dispatch<React.SetStateAction<NoteModalState | null>>;
  addHighlight: (color: HighlightColor) => void;
  noteModal: NoteModalState | null;
  saveNote: (comment: string, color: HighlightColor) => void;
  mobileSheetOpen: boolean;
  setMobileSheetOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const ReadingLoadedContent: React.FC<ReadingLoadedContentProps> = ({
  labels,
  onBack,
  unitTitle,
  unitData,
  selectedUnitIndex,
  selectableUnitIndices,
  formatLessonLabel,
  setSelectedUnitIndex,
  articles,
  activeArticleIndex,
  setActiveArticleIndex,
  grammarList,
  showSettings,
  setShowSettings,
  fontSize,
  setFontSize,
  isSerif,
  setIsSerif,
  readerRef,
  renderContent,
  language,
  completingUnit,
  onCompleteUnit,
  activeTab,
  setActiveTab,
  notes,
  aiMessages,
  aiInput,
  setAiInput,
  sendAiMessage,
  selectedWord,
  setSelectedWord,
  saveWordToVocab,
  speak,
  selectionToolbar,
  setSelectionToolbar,
  setNoteModal,
  addHighlight,
  noteModal,
  saveNote,
  mobileSheetOpen,
  setMobileSheetOpen,
}) => (
  <>
    <ReadingModuleHeader
      labels={labels}
      onBack={onBack}
      unitTitle={unitTitle}
      unitData={unitData}
      selectedUnitIndex={selectedUnitIndex}
      selectableUnitIndices={selectableUnitIndices}
      formatLessonLabel={formatLessonLabel}
      setSelectedUnitIndex={setSelectedUnitIndex}
      articles={articles}
      activeArticleIndex={activeArticleIndex}
      setActiveArticleIndex={setActiveArticleIndex}
      grammarCount={grammarList.length}
      showSettings={showSettings}
      setShowSettings={setShowSettings}
      fontSize={fontSize}
      isSerif={isSerif}
      setFontSize={setFontSize}
      setIsSerif={setIsSerif}
      language={language}
    />

    <div className="flex-1 flex overflow-hidden">
      <ReadingReaderPanel
        labels={labels}
        readerRef={readerRef}
        isSerif={isSerif}
        fontSize={fontSize}
        unitData={unitData}
        renderContent={renderContent}
        language={language}
        completingUnit={completingUnit}
        onCompleteUnit={onCompleteUnit}
      />
      <ReadingDesktopStudyHub
        labels={labels}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        notes={notes}
        grammarList={grammarList}
        aiMessages={aiMessages}
        aiInput={aiInput}
        setAiInput={setAiInput}
        sendAiMessage={sendAiMessage}
      />
    </div>

    <ReadingPopovers
      selectedWord={selectedWord}
      setSelectedWord={setSelectedWord}
      saveWordToVocab={saveWordToVocab}
      speak={speak}
      selectionToolbar={selectionToolbar}
      setSelectionToolbar={setSelectionToolbar}
      setNoteModal={setNoteModal}
      addHighlight={addHighlight}
      noteModal={noteModal}
      saveNote={saveNote}
      language={language}
    />

    <ReadingMobileStudyHub
      labels={labels}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      mobileSheetOpen={mobileSheetOpen}
      setMobileSheetOpen={setMobileSheetOpen}
      grammarList={grammarList}
      notes={notes}
    />
  </>
);

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
  language = 'en',
  onBack,
}) => {
  const labels = getLabels(language);
  const moduleText = useMemo(() => resolveReadingModuleText(labels), [labels]);
  const { speak: speakTTS, stop: stopTTS } = useTTS();
  const { saveWord } = useUserActions();
  const { logActivity } = useActivityLogger();

  useEffect(() => stopTTS, [stopTTS]);
  // State for selected unit (allows changing within the component)
  const [selectedUnitIndexOverride, setSelectedUnitIndexOverride] = useState(initialUnitIndex);
  useEffect(() => {
    setSelectedUnitIndexOverride(initialUnitIndex);
  }, [initialUnitIndex]);
  const instituteMeta = useQuery(INSTITUTES.get, resolveInstituteQueryArg(courseId));

  // Fetch available units for course (for unit selector)
  const availableUnits = useQuery(
    qRef<{ courseId: string }, { unitIndex: number }[]>('units:getByCourse'),
    { courseId }
  );
  const uniqueUnitIndices = useMemo(
    () => resolveUniqueUnitIndices(availableUnits),
    [availableUnits]
  );
  const fallbackUnitCount = useMemo(
    () => resolveFallbackUnitCount(instituteMeta?.totalUnits, initialUnitIndex),
    [instituteMeta?.totalUnits, initialUnitIndex]
  );
  const selectableUnitIndices = useMemo(
    () => resolveSelectableUnitIndices(uniqueUnitIndices, fallbackUnitCount),
    [uniqueUnitIndices, fallbackUnitCount]
  );

  const selectedUnitIndex = useMemo(
    () => resolveSelectedUnitIndex(selectableUnitIndices, selectedUnitIndexOverride),
    [selectableUnitIndices, selectedUnitIndexOverride]
  );
  // ========================================
  // Convex Query: Fetch unit data
  // ========================================
  // Convex Query: Fetch unit data
  // =====================================
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
  const updateLearningProgressMutation = useMutation(
    mRef<
      { lastInstitute?: string; lastLevel?: number; lastUnit?: number; lastModule?: string },
      unknown
    >('user:updateLearningProgress')
  );

  // Use loading state instead of early return to avoid hooks order issues
  const isLoading = unitDetails === undefined;

  const error: string | null = null;

  // Extract data from query
  const unit = unitDetails?.unit;
  const unitArticles = unitDetails?.articles;
  const articles = useMemo(() => resolveArticles(unitArticles, unit), [unitArticles, unit]);
  const [activeArticleIndexOverride, setActiveArticleIndexOverride] = useState(1);
  const activeArticleIndex = useMemo(
    () => resolveActiveArticleIndex(articles, activeArticleIndexOverride),
    [articles, activeArticleIndexOverride]
  );

  const setSelectedUnitIndex = (next: number) => {
    setSelectedUnitIndexOverride(next);
    setActiveArticleIndexOverride(1);
  };
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

  useEffect(() => {
    void updateLearningProgressMutation({
      lastInstitute: courseId,
      lastUnit: selectedUnitIndex,
      lastModule: 'READING',
    });
  }, [updateLearningProgressMutation, courseId, selectedUnitIndex]);

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
  const [completingUnit, setCompletingUnit] = useState(false);

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
  const translationLang = useMemo(() => resolveReadingTranslationLanguage(language), [language]);

  // Selection & Popover state
  const [selectedWord, setSelectedWord] = useState<SelectedWordState | null>(null);
  const [selectionToolbar, setSelectionToolbar] = useState<SelectionToolbarState | null>(null);
  const [noteModal, setNoteModal] = useState<NoteModalState | null>(null);

  // Right panel tab
  const [activeTab, setActiveTab] = useState<ReadingModuleTab>('grammar');

  // Mobile bottom sheet state
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const formatLessonLabel = useCallback(
    (idx: number) => {
      const template = labels.dashboard?.reading?.lesson;
      if (template && template.includes('{idx}')) {
        return template.replace('{idx}', idx.toString());
      }
      if (template && template.trim().length > 0) {
        return `${template} ${idx}`;
      }
      return `Lesson ${idx}`;
    },
    [labels.dashboard?.reading?.lesson]
  );
  // Initial AI message - Role is assistant per typical patterns, though codebase used ai
  const [aiMessages, setAiMessages] = useState<{ role: string; content: string }[]>(() => [
    {
      role: 'assistant',
      content: moduleText.aiGreeting,
    },
  ]);

  const readerRef = useRef<HTMLDivElement>(null);

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

  const parseDatasetIndex = useCallback(
    (value: string | undefined): number | undefined =>
      value ? Number.parseInt(value, 10) : undefined,
    []
  );

  const getSentenceTranslation = useCallback(
    (sentences: string[], sentenceIndex: number | undefined): string | undefined => {
      if (sentenceIndex === undefined) return undefined;
      return sentences[sentenceIndex];
    },
    []
  );

  const resolveLookupFallbackMeaning = useCallback(
    (meaning: string | undefined, defaultMeaning: string | undefined): string =>
      meaning ?? defaultMeaning ?? 'No meaning',
    []
  );

  const resolveLookupLoadingMeaning = useCallback(
    (meaning: string | undefined, loadingMeaning: string | undefined): string =>
      meaning ?? loadingMeaning ?? 'Looking up...',
    []
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

      const charIndex = parseDatasetIndex(wordEl.dataset.offset);
      const sentenceIndex = parseDatasetIndex(wordEl.dataset.sentenceIndex);
      const contextTranslation = getSentenceTranslation(translationSentences, sentenceIndex);

      const tokenInfo = findBaseForm(clickedWord, charIndex);
      const baseForm = tokenInfo?.base;
      const query = baseForm ?? clickedWord;

      const vocabMatch = lookupInVocabList(query) ?? lookupInVocabList(clickedWord);
      const fallbackMeaning = resolveLookupFallbackMeaning(
        vocabMatch?.meaning,
        moduleText.noMeaning
      );

      const requestId = dictionaryRequestRef.current + 1;
      dictionaryRequestRef.current = requestId;

      const rect = wordEl.getBoundingClientRect();
      const position = getPopoverPosition(rect, 260, contextTranslation ? 220 : 180);

      setSelectedWord({
        word: clickedWord,
        lemma: baseForm,
        meaning: resolveLookupLoadingMeaning(vocabMatch?.meaning, moduleText.loading),
        baseForm,
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
      lookupInVocabList,
      moduleText.loading,
      moduleText.noMeaning,
      normalizeLookupWordCb,
      parseDatasetIndex,
      getSentenceTranslation,
      translationSentences,
      resolveLookupFallbackMeaning,
      resolveLookupLoadingMeaning,
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

  useOutsideDismiss({
    enabled: Boolean(selectedWord || selectionToolbar),
    onDismiss: () => {
      setSelectedWord(null);
      setSelectionToolbar(null);
    },
    ignoreSelectors: POPOVER_DISMISS_SELECTORS,
  });

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
          content: `About "${aiInput}": great question! In Korean, this grammar point is used to express... (AI sample response)`,
        },
      ]);
    }, 500);
    setAiInput('');
  };

  const handleCompleteUnit = useCallback(async () => {
    if (completingUnit) return;
    try {
      setCompletingUnit(true);
      await completeUnitMutation({ courseId, unitIndex: selectedUnitIndex });
      flushReadingTime(true);
      notify.success(moduleText.lessonLearned);
    } catch (error) {
      console.error('Failed to mark unit complete:', error);
    } finally {
      setCompletingUnit(false);
    }
  }, [
    completingUnit,
    completeUnitMutation,
    courseId,
    selectedUnitIndex,
    flushReadingTime,
    moduleText.lessonLearned,
  ]);

  return (
    <div className="h-[calc(100vh-48px)] h-[calc(100dvh-48px)] flex flex-col overflow-x-hidden bg-zinc-100 bg-[radial-gradient(#d4d4d8_1px,transparent_1px)] bg-[length:20px_20px] dark:bg-slate-950 dark:bg-[radial-gradient(rgba(148,163,184,0.20)_1px,transparent_1px)] dark:bg-[length:20px_20px]">
      {isLoading && <ListeningModuleSkeleton />}
      {error && !isLoading && <ReadingErrorState labels={labels} onBack={onBack} />}
      {!isLoading && !error && (
        <ReadingLoadedContent
          labels={labels}
          onBack={onBack}
          unitTitle={unitTitle}
          unitData={unitData}
          selectedUnitIndex={selectedUnitIndex}
          selectableUnitIndices={selectableUnitIndices}
          formatLessonLabel={formatLessonLabel}
          setSelectedUnitIndex={setSelectedUnitIndex}
          articles={articles}
          activeArticleIndex={activeArticleIndex}
          setActiveArticleIndex={setActiveArticleIndex}
          grammarList={grammarList}
          showSettings={showSettings}
          setShowSettings={setShowSettings}
          fontSize={fontSize}
          setFontSize={setFontSize}
          isSerif={isSerif}
          setIsSerif={setIsSerif}
          readerRef={readerRef}
          renderContent={renderContent}
          language={language}
          completingUnit={completingUnit}
          onCompleteUnit={() => {
            void handleCompleteUnit();
          }}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          notes={notes}
          aiMessages={aiMessages}
          aiInput={aiInput}
          setAiInput={setAiInput}
          sendAiMessage={sendAiMessage}
          selectedWord={selectedWord}
          setSelectedWord={setSelectedWord}
          saveWordToVocab={saveWordToVocab}
          speak={speak}
          selectionToolbar={selectionToolbar}
          setSelectionToolbar={setSelectionToolbar}
          setNoteModal={setNoteModal}
          addHighlight={addHighlight}
          noteModal={noteModal}
          saveNote={saveNote}
          mobileSheetOpen={mobileSheetOpen}
          setMobileSheetOpen={setMobileSheetOpen}
        />
      )}
    </div>
  );
};

export default ReadingModule;
