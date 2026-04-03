import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowLeft,
  Settings,
  Volume2,
  Plus,
  Languages,
  Headphones,
  X,
  ChevronDown,
} from 'lucide-react';
import { useQuery, useAction, useMutation } from 'convex/react';
import { aRef, INSTITUTES, qRef, mRef } from '../../utils/convexRefs';
import { StickyAudioPlayer } from '../../components/audio/StickyAudioPlayer';
import { Language } from '../../types';
import { getLocalizedContent } from '../../utils/languageUtils';
import { getLabels } from '../../utils/i18n';
import { ListeningModuleSkeleton } from '../../components/common';
import { useTTS } from '../../hooks/useTTS';
import { extractBestMeaning, normalizeLookupWord } from '../../utils/dictionaryMeaning';
import { useUserActions } from '../../hooks/useUserActions';
import { useActivityLogger } from '../../hooks/useActivityLogger';
import { createLearningSessionId, useLearningAnalytics } from '../../hooks/useLearningAnalytics';
import { notify } from '../../utils/notify';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../../components/ui';
import { Popover, PopoverContent, PopoverPortal } from '../../components/ui';
import { Button, Select } from '../../components/ui';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';

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

type ListeningUnitRecord = {
  _id: string;
  title: string;
  audioUrl?: string;
  transcriptData?: unknown;
};

type ListeningUnitDetails = {
  unit?: ListeningUnitRecord;
  vocabList?: VocabItem[];
} | null;

interface VocabItem {
  id: string;
  korean: string;
  meaning: string;
  meaningEn?: string;
  meaningVi?: string;
  meaningMn?: string;
  pronunciation?: string;
  hanja?: string;
  pos?: string;
  exampleSentence?: string;
  exampleMeaning?: string;
  exampleMeaningEn?: string;
  exampleMeaningVi?: string;
  exampleMeaningMn?: string;
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

type ListeningLabels = ReturnType<typeof getLabels>;
type SelectedListeningWord = {
  word: string;
  lemma?: string;
  meaning: string;
  baseForm?: string;
  contextTranslation?: string;
  grammarMatches?: Array<{
    id: string;
    title: string;
    summary: string;
    type: string;
    level: string;
  }>;
  position: { x: number; y: number };
  isFromVocabList: boolean;
};

const KOREAN_ENDINGS = ['다', '요', '습니다', '습니까', '세요', '어요', '아요'] as const;

function parseTranscriptToken(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const tokenRecord = value as Record<string, unknown>;
  const surface = tokenRecord.surface;
  const base = tokenRecord.base;
  const pos = tokenRecord.pos;
  if (typeof surface !== 'string' || typeof base !== 'string' || typeof pos !== 'string') {
    return null;
  }
  return { surface, base, pos };
}

function parseTranscriptSegment(value: unknown): TranscriptSegment | null {
  if (!value || typeof value !== 'object') return null;
  const segmentRecord = value as Record<string, unknown>;
  const start = segmentRecord.start;
  const end = segmentRecord.end;
  const text = segmentRecord.text;
  if (typeof start !== 'number' || typeof end !== 'number' || typeof text !== 'string') {
    return null;
  }
  const segment: TranscriptSegment = { start, end, text };
  if (typeof segmentRecord.translation === 'string')
    segment.translation = segmentRecord.translation;
  if (typeof segmentRecord.translationEn === 'string')
    segment.translationEn = segmentRecord.translationEn;
  if (typeof segmentRecord.translationVi === 'string')
    segment.translationVi = segmentRecord.translationVi;
  if (typeof segmentRecord.translationMn === 'string')
    segment.translationMn = segmentRecord.translationMn;
  if (Array.isArray(segmentRecord.tokens)) {
    segment.tokens = segmentRecord.tokens
      .map(token => parseTranscriptToken(token))
      .filter((token): token is { surface: string; base: string; pos: string } => token !== null);
  }
  return segment;
}

function parseListeningUnitData(unit: ListeningUnitRecord | undefined): UnitData | null {
  if (!unit) return null;
  const transcriptData = Array.isArray(unit.transcriptData)
    ? unit.transcriptData
        .map(segment => parseTranscriptSegment(segment))
        .filter((segment): segment is TranscriptSegment => segment !== null)
    : undefined;
  return {
    id: unit._id,
    title: unit.title,
    audioUrl: unit.audioUrl || '',
    transcriptData,
  };
}

function findVocabMatch(word: string, vocabList: VocabItem[]): VocabItem | null {
  const directMatch = vocabList.find(item => item.korean === word);
  if (directMatch) return directMatch;
  for (const ending of KOREAN_ENDINGS) {
    if (!word.endsWith(ending)) continue;
    const stem = word.slice(0, -ending.length);
    const stemMatch = vocabList.find(
      item => item.korean === `${stem}다` || item.korean.startsWith(stem)
    );
    if (stemMatch) return stemMatch;
  }
  return null;
}

function resolveTranslationLanguage(language: Language): 'en' | 'zh' | 'vi' | 'mn' | undefined {
  if (language === 'en' || language === 'zh' || language === 'vi' || language === 'mn') {
    return language;
  }
  return undefined;
}

function getLocalizedVocabMeaning(vocab: VocabItem, language: Language): string {
  return getLocalizedContent(vocab as never, 'meaning', language) || vocab.meaning;
}

function getUniqueUnitIndices(units: { unitIndex: number }[] | undefined) {
  if (!units) return [];
  const indices = [...new Set(units.map(item => item.unitIndex))];
  return indices.sort((a, b) => a - b);
}

function getFallbackUnitCount(totalUnits: number | undefined, unitIndex: number) {
  if (typeof totalUnits === 'number' && totalUnits > 0) return totalUnits;
  return Math.max(unitIndex, 10);
}

function getSelectableUnitIndices(uniqueUnitIndices: number[], fallbackUnitCount: number) {
  if (uniqueUnitIndices.length > 0) return uniqueUnitIndices;
  return Array.from({ length: fallbackUnitCount }, (_, index) => index + 1);
}

function resolveSelectedUnitIndex(
  selectableUnitIndices: number[],
  selectedUnitIndexOverride: number
) {
  if (selectableUnitIndices.length === 0) return selectedUnitIndexOverride;
  if (selectableUnitIndices.includes(selectedUnitIndexOverride)) return selectedUnitIndexOverride;
  return selectableUnitIndices[0];
}

function resolveListeningTitle(unitData: UnitData | null, unitTitle: string) {
  if (unitData?.title) return unitData.title;
  return unitTitle;
}

function hasListeningTranscript(unitData: UnitData | null) {
  return Boolean(unitData?.transcriptData && unitData.transcriptData.length > 0);
}

function getTranslationToggleClass(showTranslation: boolean) {
  if (showTranslation) {
    return 'px-3 py-2 border-2 border-foreground rounded-lg font-bold text-xs text-foreground transition-colors bg-blue-100 dark:bg-blue-900/30';
  }
  return 'px-3 py-2 border-2 border-foreground rounded-lg font-bold text-xs text-foreground transition-colors bg-card';
}

function shouldRenderAudioPlayer(loading: boolean, unitData: UnitData | null) {
  return !loading && Boolean(unitData?.audioUrl);
}

function getActiveListeningSegmentIndex(
  unitData: UnitData | null,
  isKaraokeMode: boolean,
  currentTime: number
) {
  if (!unitData?.transcriptData || !isKaraokeMode) return -1;
  return unitData.transcriptData.findIndex(
    segment => currentTime >= segment.start && currentTime <= segment.end
  );
}

type ListeningUiText = {
  unitLabelTemplate: string;
  translationLabel: string;
  transcriptLabel: string;
  hintLabel: string;
  completeLessonLabel: string;
};

function getListeningUiText(labels: ListeningLabels): ListeningUiText {
  return {
    unitLabelTemplate: labels.dashboard?.listening?.title || 'Unit {index} · Listening',
    translationLabel: labels.dashboard?.listening?.translate || 'Translation',
    transcriptLabel: labels.dashboard?.listening?.transcript || 'Transcript',
    hintLabel: labels.dashboard?.listening?.hint || '💡 Tap any sentence to seek playback',
    completeLessonLabel: labels.dashboard?.reading?.completeLesson || 'Complete lesson',
  };
}

function getListeningUnitOptionLabel(template: string, index: number) {
  return template.replace('{index}', String(index));
}

function getPopoverPosition(rect: DOMRect, popoverWidth: number, popoverHeight: number) {
  const x = Math.min(
    Math.max(8, rect.left),
    Math.max(8, globalThis.window.innerWidth - popoverWidth - 8)
  );
  const y = Math.min(
    Math.max(8, rect.bottom + 8),
    Math.max(8, globalThis.window.innerHeight - popoverHeight - 8)
  );
  return { x, y };
}

function handleListeningTimeUpdate(
  time: number,
  setCurrentTime: React.Dispatch<React.SetStateAction<number>>,
  lastAudioTimeRef: React.MutableRefObject<number | null>,
  listeningAccumulatedRef: React.MutableRefObject<number>,
  flushListeningTime: (force?: boolean) => void
) {
  setCurrentTime(time);
  const previousTime = lastAudioTimeRef.current;
  lastAudioTimeRef.current = time;
  if (previousTime === null) return;
  const delta = time - previousTime;
  if (delta <= 0 || delta > 2.5) return;
  listeningAccumulatedRef.current += delta;
  if (listeningAccumulatedRef.current >= 60) {
    flushListeningTime();
  }
}

function handleListeningSegmentClick(
  segment: TranscriptSegment,
  event: React.MouseEvent | React.KeyboardEvent,
  onWordClick: (event: React.MouseEvent | React.KeyboardEvent) => void,
  setCurrentTime: React.Dispatch<React.SetStateAction<number>>
) {
  const wordElement = (event.target as Element).closest<HTMLElement>('[data-word]');
  if (wordElement) {
    onWordClick(event);
    return;
  }
  setCurrentTime(segment.start);
}

type DictionaryLookupArgs = {
  clickedWord: string;
  query: string;
  segment: TranscriptSegment | undefined;
  requestId: number;
  translationLang: 'en' | 'zh' | 'vi' | 'mn' | undefined;
  selectedWord: SelectedListeningWord | null;
  labels: ListeningLabels;
  normalizeLookupWordCb: (value: string) => string;
  lookupWithMorphology: (args: {
    surface: string;
    contextText?: string;
    translationLang?: string;
    num?: number;
  }) => Promise<MorphologyLookupResult>;
  dictionaryRequestRef: React.MutableRefObject<number>;
  setSelectedWord: React.Dispatch<React.SetStateAction<SelectedListeningWord | null>>;
};

async function performListeningDictionaryLookup({
  clickedWord,
  query,
  segment,
  requestId,
  translationLang,
  selectedWord,
  labels,
  normalizeLookupWordCb,
  lookupWithMorphology,
  dictionaryRequestRef,
  setSelectedWord,
}: DictionaryLookupArgs) {
  try {
    const result = await lookupWithMorphology({
      surface: clickedWord,
      contextText: segment?.text,
      translationLang,
      num: 10,
    });
    if (dictionaryRequestRef.current !== requestId) return;
    const lemma = normalizeLookupWordCb(result.token.lemma || query) || query;
    let meaning = selectedWord?.meaning || labels.dashboard?.common?.noMeaning || 'No meaning';
    if (result.wordFromDb?.meaning) {
      meaning = result.wordFromDb.meaning;
    } else if (result.krdict) {
      meaning = extractBestMeaning(result.krdict, lemma, meaning);
    }
    setSelectedWord(previous =>
      previous
        ? {
            ...previous,
            lemma,
            baseForm: lemma,
            grammarMatches: result.grammarMatches,
            meaning,
          }
        : previous
    );
  } catch (error) {
    if (dictionaryRequestRef.current !== requestId) return;
    console.error('[ListeningModule] Dictionary lookup failed:', error);
    setSelectedWord(previous =>
      previous
        ? {
            ...previous,
            meaning:
              previous.meaning === labels.dashboard?.common?.loading
                ? 'Lookup failed'
                : previous.meaning,
          }
        : previous
    );
  }
}

type ListeningWordClickArgs = {
  event: React.MouseEvent | React.KeyboardEvent;
  normalizeLookupWordCb: (value: string) => string;
  lookupInVocabList: (word: string) => VocabItem | null;
  unitData: UnitData | null;
  language: Language;
  labels: ListeningLabels;
  dictionaryRequestRef: React.MutableRefObject<number>;
  setSelectedWord: React.Dispatch<React.SetStateAction<SelectedListeningWord | null>>;
  performLookup: (
    clickedWord: string,
    query: string,
    segment: TranscriptSegment | undefined,
    requestId: number
  ) => Promise<void>;
};

function handleListeningWordClick({
  event,
  normalizeLookupWordCb,
  lookupInVocabList,
  unitData,
  language,
  labels,
  dictionaryRequestRef,
  setSelectedWord,
  performLookup,
}: ListeningWordClickArgs) {
  const wordElement = (event.target as Element).closest<HTMLElement>('[data-word]');
  if (!wordElement) return;
  const clickedWord = normalizeLookupWordCb(wordElement.dataset.word ?? '');
  if (!clickedWord) return;

  const baseForm = wordElement.dataset.base
    ? normalizeLookupWordCb(wordElement.dataset.base)
    : undefined;
  const query = baseForm || clickedWord;
  const vocabMatch = lookupInVocabList(query) || lookupInVocabList(clickedWord);
  const localizedVocabMeaning = vocabMatch
    ? getLocalizedVocabMeaning(vocabMatch, language)
    : undefined;
  const segmentIndex = wordElement.dataset.segIndex
    ? Number.parseInt(wordElement.dataset.segIndex, 10)
    : undefined;
  const segment =
    typeof segmentIndex === 'number' ? unitData?.transcriptData?.[segmentIndex] : undefined;
  const contextTranslation = segment
    ? getLocalizedContent(segment, 'translation', language)
    : undefined;

  const requestId = dictionaryRequestRef.current + 1;
  dictionaryRequestRef.current = requestId;

  const rect = wordElement.getBoundingClientRect();
  const position = getPopoverPosition(rect, 260, contextTranslation ? 220 : 180);

  setSelectedWord({
    word: clickedWord,
    lemma: baseForm,
    meaning: localizedVocabMeaning || labels.dashboard?.common?.loading || 'Looking up...',
    baseForm,
    grammarMatches: [],
    contextTranslation,
    position,
    isFromVocabList: !!vocabMatch,
  });

  void performLookup(clickedWord, query, segment, requestId);
}

async function completeListeningUnit(args: {
  completingUnit: boolean;
  setCompletingUnit: React.Dispatch<React.SetStateAction<boolean>>;
  completeUnitMutation: (args: { courseId: string; unitIndex: number }) => Promise<unknown>;
  courseId: string;
  selectedUnitIndex: number;
  flushListeningTime: (force?: boolean) => void;
  labels: ListeningLabels;
}) {
  const {
    completingUnit,
    setCompletingUnit,
    completeUnitMutation,
    courseId,
    selectedUnitIndex,
    flushListeningTime,
    labels,
  } = args;
  if (completingUnit) return;
  try {
    setCompletingUnit(true);
    await completeUnitMutation({ courseId, unitIndex: selectedUnitIndex });
    flushListeningTime(true);
    notify.success(labels.dashboard?.reading?.learned || '🎉 Lesson completed!');
  } catch (error) {
    console.error('Failed to mark unit complete:', error);
    notify.error(labels.dashboard?.common?.error || 'Action failed. Please try again.');
  } finally {
    setCompletingUnit(false);
  }
}

async function saveListeningSelectedWord(args: {
  selectedWord: SelectedListeningWord | null;
  setSelectedWord: React.Dispatch<React.SetStateAction<SelectedListeningWord | null>>;
  saveWord: (word: string, meaning: string) => Promise<unknown>;
  addToReview: (args: {
    word: string;
    meaning: string;
    partOfSpeech?: string;
    context?: string;
    source?: string;
  }) => Promise<void>;
}) {
  const { selectedWord, setSelectedWord, saveWord, addToReview } = args;
  if (!selectedWord) {
    setSelectedWord(null);
    return;
  }
  try {
    await saveWord(selectedWord.lemma || selectedWord.word, selectedWord.meaning);
    await addToReview({
      word: selectedWord.lemma || selectedWord.word,
      meaning: selectedWord.meaning,
      context: selectedWord.contextTranslation,
      source: 'LISTENING',
    });
  } catch (error) {
    console.error('Failed to save word:', error);
  }
  setSelectedWord(null);
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
                    <span className="font-bold">
                      {getLocalizedContent(g as never, 'title', language) || g.title}
                    </span>
                    {getLocalizedContent(g as never, 'summary', language) || g.summary ? (
                      <span className="text-muted-foreground">
                        {' '}
                        · {getLocalizedContent(g as never, 'summary', language) || g.summary}
                      </span>
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
              {labels.dashboard?.common?.read || 'Read'}
            </Button>
            <Button
              variant="ghost"
              size="auto"
              onClick={onSave}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-lime-300 dark:bg-slate-700 dark:text-slate-100 border-2 border-foreground rounded-lg font-bold text-xs text-foreground hover:bg-lime-400 dark:hover:bg-slate-600 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none shadow-[2px_2px_0px_0px_#18181B] transition-all"
            >
              <Plus className="w-3 h-3" />
              {labels.dashboard?.common?.addVocab || 'Save Word'}
            </Button>
          </div>
        </PopoverContent>
      </PopoverPortal>
    </Popover>
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
    <div className="bg-card dark:bg-slate-900 border-2 border-foreground rounded-lg shadow-[4px_4px_0px_0px_#18181B] dark:shadow-[4px_4px_0px_0px_rgba(148,163,184,0.22)] p-4 w-56">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-black text-sm">
          {labels.dashboard?.listening?.settings || 'Listening Settings'}
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
          {labels.dashboard?.listening?.fontSize || 'Font Size'}
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
          {labels.dashboard?.listening?.karaoke || 'Karaoke Highlight'}
        </span>
        <Button
          variant="ghost"
          size="auto"
          onClick={onKaraokeModeToggle}
          className={`w-12 h-6 rounded-full border-2 border-foreground relative transition-colors ${
            isKaraokeMode ? 'bg-lime-300 dark:bg-slate-700' : 'bg-muted'
          }`}
        >
          <div
            className={`absolute top-0.5 w-4 h-4 bg-card rounded-full border border-foreground transition-all ${isKaraokeMode ? 'left-6' : 'left-0.5'}`}
          />
        </Button>
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

  const localizedTranslation =
    getLocalizedContent(segment, 'translation', language) || segment.translation;

  return (
    <Button
      variant="ghost"
      size="auto"
      ref={setRef}
      onClick={onClick}
      onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onClick(e)}
      className={`w-full p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 text-left !block !whitespace-normal ${
        isActive
          ? 'bg-lime-100 border-lime-400 shadow-[4px_4px_0px_0px_#84cc16] scale-[1.02] dark:bg-slate-800 dark:border-emerald-700 dark:shadow-[3px_3px_0px_0px_rgba(16,185,129,0.35)]'
          : 'bg-card border-border hover:border-border'
      }`}
    >
      {/* Timestamp */}
      <div className="text-xs font-mono text-muted-foreground mb-2">
        {formatTime(segment.start)} - {formatTime(segment.end)}
      </div>

      {/* Korean text with word click */}
      <div
        className={`font-medium break-words ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}
      >
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
        <div className="mt-2 text-sm text-muted-foreground break-words">{localizedTranslation}</div>
      )}
    </Button>
  );
};

interface ListeningTranscriptBodyProps {
  unitData: UnitData | null;
  fontSize: number;
  isKaraokeMode: boolean;
  activeSegmentIndex: number;
  showTranslation: boolean;
  language: Language;
  labels: ListeningLabels;
  segmentRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>;
  onSegmentClick: (
    segment: TranscriptSegment,
    index: number,
    event: React.MouseEvent | React.KeyboardEvent
  ) => void;
}

const ListeningTranscriptBody: React.FC<ListeningTranscriptBodyProps> = ({
  unitData,
  fontSize,
  isKaraokeMode,
  activeSegmentIndex,
  showTranslation,
  language,
  labels,
  segmentRefs,
  onSegmentClick,
}) => {
  if (unitData?.transcriptData && unitData.transcriptData.length > 0) {
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
            onClick={event => onSegmentClick(segment, index, event)}
            setRef={element => {
              segmentRefs.current[index] = element;
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="text-center py-12 text-muted-foreground">
      <Headphones className="w-12 h-12 mx-auto mb-4 opacity-30" />
      <p className="font-bold">
        {labels.dashboard?.listening?.empty || 'No listening content yet'}
      </p>
      <p className="text-sm mt-2">
        {labels.dashboard?.listening?.emptyDesc ||
          'Please add listening audio and timestamp transcript in admin panel'}
      </p>
    </div>
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

const WordView: React.FC<WordViewProps> = ({
  word,
  normalizedWord,
  baseForm,
  segmentIndex,
  isActive,
}) => {
  return (
    <span
      data-word={normalizedWord}
      data-base={baseForm}
      data-seg-index={segmentIndex}
      className={`cursor-pointer rounded px-0.5 transition-colors ${
        isActive ? 'hover:bg-lime-200 dark:hover:bg-slate-700' : 'hover:bg-yellow-100'
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
  language = 'en',
  onBack,
}) => {
  const navigate = useLocalizedNavigate();
  const labels = getLabels(language);
  const { saveWord } = useUserActions();
  const { logActivity } = useActivityLogger();
  const { trackLearningEvent } = useLearningAnalytics();
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
  const dictionaryRequestRef = useRef(0);
  const translationLang = useMemo(() => resolveTranslationLanguage(language), [language]);

  const normalizeLookupWordCb = useCallback((value: string) => normalizeLookupWord(value), []);

  useEffect(() => stopTTS, [stopTTS]);
  const [selectedUnitIndexOverride, setSelectedUnitIndexOverride] = useState(unitIndex);
  useEffect(() => {
    setSelectedUnitIndexOverride(unitIndex);
  }, [unitIndex]);
  const instituteMeta = useQuery(INSTITUTES.get, courseId ? { id: courseId } : 'skip');
  const availableUnits = useQuery(
    qRef<{ courseId: string }, { unitIndex: number }[]>('units:getByCourse'),
    { courseId }
  );
  const uniqueUnitIndices = useMemo(() => getUniqueUnitIndices(availableUnits), [availableUnits]);
  const fallbackUnitCount = useMemo(
    () => getFallbackUnitCount(instituteMeta?.totalUnits, unitIndex),
    [instituteMeta?.totalUnits, unitIndex]
  );
  const selectableUnitIndices = useMemo(
    () => getSelectableUnitIndices(uniqueUnitIndices, fallbackUnitCount),
    [uniqueUnitIndices, fallbackUnitCount]
  );
  const selectedUnitIndex = useMemo(
    () => resolveSelectedUnitIndex(selectableUnitIndices, selectedUnitIndexOverride),
    [selectableUnitIndices, selectedUnitIndexOverride]
  );

  // UI State
  const [fontSize, setFontSize] = useState(20);
  const [showSettings, setShowSettings] = useState(false);
  const [isKaraokeMode, setIsKaraokeMode] = useState(true);
  const [showTranslation, setShowTranslation] = useState(false);
  const [completingUnit, setCompletingUnit] = useState(false);

  // Audio/Karaoke State
  const [currentTime, setCurrentTime] = useState(0);
  const listeningAccumulatedRef = useRef(0);
  const lastAudioTimeRef = useRef<number | null>(null);
  const learningSessionIdRef = useRef('');
  const activityContextRef = useRef({ courseId, unitIndex: selectedUnitIndex });

  // Word popup state
  const [selectedWord, setSelectedWord] = useState<SelectedListeningWord | null>(null);

  const segmentRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const flushListeningTime = useCallback(
    (force = false) => {
      const seconds = listeningAccumulatedRef.current;
      if (seconds <= 0) return;
      if (!force && seconds < 30) return;
      const minutes = Number((seconds / 60).toFixed(2));
      listeningAccumulatedRef.current = 0;
      logActivity('LISTENING', minutes, 0, {
        sessionId: learningSessionIdRef.current,
        surface: 'LISTENING_MODULE',
        courseId: activityContextRef.current.courseId,
        unitId: activityContextRef.current.unitIndex,
        contentId: `${activityContextRef.current.courseId}:${activityContextRef.current.unitIndex}`,
        source: 'listening_module',
        auto: true,
      });
    },
    [logActivity]
  );

  useEffect(() => {
    flushListeningTime(true);
    learningSessionIdRef.current = createLearningSessionId(
      `listening-${courseId}-${selectedUnitIndex}`
    );
    activityContextRef.current = { courseId, unitIndex: selectedUnitIndex };
    listeningAccumulatedRef.current = 0;
    lastAudioTimeRef.current = null;
    void trackLearningEvent({
      sessionId: learningSessionIdRef.current,
      module: 'LISTENING',
      surface: 'LISTENING_MODULE',
      courseId,
      unitId: selectedUnitIndex,
      contentId: `${courseId}:${selectedUnitIndex}`,
      eventName: 'session_started',
      source: 'listening_module',
    });
    void trackLearningEvent({
      sessionId: learningSessionIdRef.current,
      module: 'LISTENING',
      surface: 'LISTENING_MODULE',
      courseId,
      unitId: selectedUnitIndex,
      contentId: `${courseId}:${selectedUnitIndex}`,
      eventName: 'content_opened',
      source: 'listening_module',
    });
  }, [courseId, selectedUnitIndex, flushListeningTime, trackLearningEvent]);

  useEffect(() => () => flushListeningTime(true), [flushListeningTime]);

  useEffect(() => {
    void touchCourseMutation({ courseId, unitIndex: selectedUnitIndex });
  }, [touchCourseMutation, courseId, selectedUnitIndex]);

  useEffect(() => {
    void updateLearningProgressMutation({
      lastInstitute: courseId,
      lastUnit: selectedUnitIndex,
      lastModule: 'LISTENING',
    });
  }, [updateLearningProgressMutation, courseId, selectedUnitIndex]);

  // ========================================
  // Data Fetching - Use dedicated listening API
  // ========================================
  // Data Fetching - Use dedicated listening API
  // ========================================
  const unitDetails = useQuery(
    qRef<{ courseId: string; unitIndex: number }, ListeningUnitDetails>('units:getDetails'),
    { courseId, unitIndex: selectedUnitIndex }
  );

  const loading = unitDetails === undefined;
  const vocabList = useMemo(() => unitDetails?.vocabList ?? [], [unitDetails?.vocabList]);
  const unitData = useMemo<UnitData | null>(
    () => parseListeningUnitData(unitDetails?.unit),
    [unitDetails]
  );
  const moduleTitle = useMemo(
    () => resolveListeningTitle(unitData, unitTitle),
    [unitData, unitTitle]
  );
  const hasTranscript = useMemo(() => hasListeningTranscript(unitData), [unitData]);
  const shouldShowAudioPlayer = useMemo(
    () => shouldRenderAudioPlayer(loading, unitData),
    [loading, unitData]
  );
  const translationToggleClass = useMemo(
    () => getTranslationToggleClass(showTranslation),
    [showTranslation]
  );
  const uiText = useMemo(() => getListeningUiText(labels), [labels]);
  const completeButtonLoadingText = useMemo(
    () => `✅ ${uiText.completeLessonLabel}`,
    [uiText.completeLessonLabel]
  );

  const lookupInVocabList = useCallback(
    (word: string): VocabItem | null => findVocabMatch(word, vocabList),
    [vocabList]
  );

  // Cleanup error state logic as useQuery handles it differently (returns undefined on loading)

  // ========================================
  // Karaoke Logic: Update active segment based on current time
  // ========================================
  const activeSegmentIndex = useMemo(
    () => getActiveListeningSegmentIndex(unitData, isKaraokeMode, currentTime),
    [unitData, isKaraokeMode, currentTime]
  );

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
  const handleTimeUpdate = useCallback(
    (time: number) => {
      handleListeningTimeUpdate(
        time,
        setCurrentTime,
        lastAudioTimeRef,
        listeningAccumulatedRef,
        flushListeningTime
      );
    },
    [flushListeningTime]
  );

  const handleToggleTranslation = useCallback(() => {
    setShowTranslation(prev => !prev);
  }, []);

  const performDictionaryLookup = useCallback(
    async (
      clickedWord: string,
      query: string,
      segment: TranscriptSegment | undefined,
      requestId: number
    ) => {
      await performListeningDictionaryLookup({
        clickedWord,
        query,
        segment,
        requestId,
        translationLang,
        selectedWord,
        labels,
        normalizeLookupWordCb,
        lookupWithMorphology,
        dictionaryRequestRef,
        setSelectedWord,
      });
    },
    [
      translationLang,
      selectedWord,
      labels,
      normalizeLookupWordCb,
      lookupWithMorphology,
      dictionaryRequestRef,
      setSelectedWord,
    ]
  );

  const handleWordClick = useCallback(
    (event: React.MouseEvent | React.KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const clickedWord = normalizeLookupWordCb(
        target?.closest<HTMLElement>('[data-word]')?.dataset.word ?? ''
      );
      if (clickedWord) {
        void trackLearningEvent({
          sessionId: learningSessionIdRef.current,
          module: 'LISTENING',
          surface: 'LISTENING_MODULE',
          courseId,
          unitId: selectedUnitIndex,
          contentId: `${courseId}:${selectedUnitIndex}`,
          eventName: 'dictionary_lookup',
          source: 'listening_module',
          metadata: {
            clickedWordLength: clickedWord.length,
          },
        });
      }
      handleListeningWordClick({
        event,
        normalizeLookupWordCb,
        lookupInVocabList,
        unitData,
        language,
        labels,
        dictionaryRequestRef,
        setSelectedWord,
        performLookup: performDictionaryLookup,
      });
    },
    [
      courseId,
      selectedUnitIndex,
      normalizeLookupWordCb,
      lookupInVocabList,
      unitData,
      language,
      labels,
      dictionaryRequestRef,
      setSelectedWord,
      performDictionaryLookup,
      trackLearningEvent,
    ]
  );

  const handleSegmentClick = useCallback(
    (segment: TranscriptSegment, _index: number, event: React.MouseEvent | React.KeyboardEvent) => {
      handleListeningSegmentClick(segment, event, handleWordClick, setCurrentTime);
    },
    [handleWordClick]
  );

  const speak = useCallback(
    (text: string) => {
      void speakTTS(text);
    },
    [speakTTS]
  );

  const handleCompleteUnit = useCallback(async () => {
    const completedDurationSec = listeningAccumulatedRef.current;
    await completeListeningUnit({
      completingUnit,
      setCompletingUnit,
      completeUnitMutation,
      courseId,
      selectedUnitIndex,
      flushListeningTime,
      labels,
    });
    void trackLearningEvent({
      sessionId: learningSessionIdRef.current,
      module: 'LISTENING',
      surface: 'LISTENING_MODULE',
      courseId,
      unitId: selectedUnitIndex,
      contentId: `${courseId}:${selectedUnitIndex}`,
      eventName: 'content_completed',
      durationSec: completedDurationSec,
      result: 'unit_completed',
      source: 'listening_module',
    });
  }, [
    completingUnit,
    setCompletingUnit,
    completeUnitMutation,
    courseId,
    selectedUnitIndex,
    flushListeningTime,
    labels,
    trackLearningEvent,
  ]);

  const handleSaveSelectedWord = useCallback(async () => {
    await saveListeningSelectedWord({
      selectedWord,
      setSelectedWord,
      saveWord,
      addToReview,
    });
  }, [selectedWord, setSelectedWord, saveWord, addToReview]);

  return (
    <div className="h-[calc(100vh-48px)] h-[calc(100dvh-48px)] flex flex-col pb-20 overflow-x-hidden bg-zinc-100 bg-[radial-gradient(#d4d4d8_1px,transparent_1px)] bg-[length:20px_20px] dark:bg-slate-950 dark:bg-[radial-gradient(rgba(148,163,184,0.20)_1px,transparent_1px)] dark:bg-[length:20px_20px]">
      {/* Loading State */}
      {loading && <ListeningModuleSkeleton />}

      {/* Main Content - only show when loaded */}
      {!loading && (
        <>
          {/* Header */}
          <header className="bg-card dark:bg-slate-900 border-b-2 border-foreground px-3 sm:px-6 py-3 shrink-0">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              {/* Left: Back + Title */}
              <div className="flex items-center gap-3 min-w-0">
                <Button
                  variant="ghost"
                  size="auto"
                  onClick={onBack}
                  className="w-10 h-10 bg-card border-2 border-foreground rounded-lg flex items-center justify-center hover:bg-muted active:translate-x-0.5 active:translate-y-0.5 shadow-[3px_3px_0px_0px_#18181B] active:shadow-none transition-all"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="font-black text-base sm:text-lg flex items-center gap-2 truncate">
                  <Headphones className="w-5 h-5 text-lime-600 shrink-0" />
                  <span className="truncate">{moduleTitle}</span>
                </h1>
              </div>

              {/* Middle: Unit controls */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <div className="relative w-full sm:w-auto">
                  <Select
                    value={selectedUnitIndex}
                    onChange={e => setSelectedUnitIndexOverride(Number(e.target.value))}
                    className="!h-auto w-full sm:w-auto !px-4 !py-2 !pr-8 !bg-lime-300 dark:!bg-slate-700 dark:hover:!bg-slate-600 dark:!text-slate-100 !border-2 !border-foreground !rounded-lg font-bold text-sm cursor-pointer hover:!bg-lime-400 transition-colors appearance-none !shadow-none"
                  >
                    {selectableUnitIndices.map(idx => (
                      <option key={idx} value={idx}>
                        🎧 {getListeningUnitOptionLabel(uiText.unitLabelTemplate, idx)}
                      </option>
                    ))}
                  </Select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" />
                </div>
                <Button
                  variant="ghost"
                  size="auto"
                  onClick={handleToggleTranslation}
                  className={translationToggleClass}
                >
                  <Languages className="w-4 h-4 inline mr-1" />
                  {uiText.translationLabel}
                </Button>
                <Button
                  variant="outline"
                  size="auto"
                  onClick={() => navigate('/courses')}
                  className="px-3 py-2 border-2 border-foreground rounded-lg font-bold text-xs text-foreground transition-colors bg-card"
                >
                  {labels.learningFlow?.actions?.switchMaterial || 'Switch textbook'}
                </Button>
              </div>

              {/* Right: Settings */}
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
                      isKaraokeMode={isKaraokeMode}
                      onFontSizeChange={setFontSize}
                      onKaraokeModeToggle={() => setIsKaraokeMode(!isKaraokeMode)}
                      onClose={() => setShowSettings(false)}
                      language={language}
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Main Content: Full Width Transcript Panel */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-8">
            <div className="bg-card dark:bg-slate-900 border-2 border-foreground rounded-xl shadow-[6px_6px_0px_0px_#18181B] dark:shadow-[6px_6px_0px_0px_rgba(148,163,184,0.22)] p-4 sm:p-6 md:p-8 max-w-full sm:max-w-3xl mx-auto">
              <h2 className="text-2xl font-black mb-6 text-foreground flex items-center gap-2">
                <Headphones className="w-6 h-6 text-lime-600" />
                {uiText.transcriptLabel}
              </h2>

              {/* Karaoke hint */}
              {hasTranscript && (
                <div className="mb-6 p-3 bg-lime-50 dark:bg-slate-800 border border-lime-200 dark:border-emerald-800 rounded-lg text-sm text-lime-700 dark:text-emerald-200">
                  {uiText.hintLabel}
                </div>
              )}
              <ListeningTranscriptBody
                unitData={unitData}
                fontSize={fontSize}
                isKaraokeMode={isKaraokeMode}
                activeSegmentIndex={activeSegmentIndex}
                showTranslation={showTranslation}
                language={language}
                labels={labels}
                segmentRefs={segmentRefs}
                onSegmentClick={handleSegmentClick}
              />

              <div className="mt-8 pt-6 border-t-2 border-border flex justify-center">
                <Button
                  variant="ghost"
                  size="auto"
                  onClick={handleCompleteUnit}
                  disabled={completingUnit}
                  loading={completingUnit}
                  loadingText={completeButtonLoadingText}
                  loadingIconClassName="w-4 h-4"
                  className="px-8 py-3 bg-lime-300 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-100 border-2 border-foreground rounded-xl font-bold text-sm text-foreground hover:bg-lime-400 shadow-[4px_4px_0px_0px_#18181B] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
                >
                  ✅ {uiText.completeLessonLabel}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Word Popover */}
      {selectedWord && (
        <FlashcardPopover
          word={selectedWord.word}
          lemma={selectedWord.lemma}
          meaning={selectedWord.meaning}
          contextTranslation={selectedWord.contextTranslation}
          grammarMatches={selectedWord.grammarMatches}
          position={selectedWord.position}
          onClose={() => setSelectedWord(null)}
          onSave={handleSaveSelectedWord}
          onSpeak={() => speak(selectedWord.word)}
          language={language}
        />
      )}

      {/* Sticky Audio Player */}
      {shouldShowAudioPlayer && unitData?.audioUrl && (
        <StickyAudioPlayer audioUrl={unitData.audioUrl} onTimeUpdate={handleTimeUpdate} />
      )}
    </div>
  );
};

export default ListeningModule;
