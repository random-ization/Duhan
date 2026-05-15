import React, {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  lazy,
} from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useParams, useSearchParams } from 'react-router-dom';
// import {
//   BookOpen,
//   Check,
//   Languages,
//   Star,
// } from 'lucide-react';
import { AI, DICTIONARY, NEWS, VOCAB, SENTENCE_EXPLAINER } from '../utils/convexRefs';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useAuth } from '../contexts/AuthContext';
import { useTTS } from '../hooks/useTTS';
import { useTranslation } from 'react-i18next';
// import { Button } from '../components/ui';
import { useIsMobile } from '../hooks/useIsMobile';
import { cleanArticleBodyText } from '../../constants/news-cleanup';
import { buildMediaPath } from '../utils/mediaRoutes';
import { resolveSafeReturnTo } from '../utils/navigation';
import {
  buildReadingArticleSessionStorageKey,
  loadReadingArticleSessionState,
  persistReadingArticleSessionState,
} from '../utils/readingSession';
import { formatReadingPublishedDate, getReadingSourceLabel } from '../utils/readingMetadata';
import { useScopedAnnotations } from '../features/annotation-kit/hooks/useScopedAnnotations';
import { classifySelectionKind } from '../features/annotation-kit/utils/selection';
import { useOutsideDismiss } from '../hooks/useOutsideDismiss';
import { ContentSkeleton } from '../components/common';

import {
  toParagraphs,
  summarizeArticle,
  extractVocabulary,
  extractGrammar,
  normalizeInlineWhitespace,
  getDictionaryMeaning,
  translationLanguageLabel,
  handleReadingToggleSpeak,
  resolveReadingNoteVisualState,
  areReaderNotesEqual,
  areStringArraysEqual,
  discardDraftNoteSelection,
  resolveReadingUiLanguage,
  resolveReadingTranslationLanguage,
  getReadingArticleQueryArg,
  getNextReadingFontSize,
  difficultyClass,
  difficultyLabel,
  findContextSentence,
  getClosestParagraphElement,
  normalizeAnnotationNoteColor,
  normalizePartOfSpeech,
  toTranslationErrorMessage,
} from './reading/helpers';

import type { SentenceExplanationPayload } from '../../convex/sentenceExplainer/shared';

import type {
  NewsArticle,
  PanelTab,
  NoteVisualState,
  NoteAnchor,
  VocabularyItem,
  //   GrammarItem,
  DictionaryEntry,
  DictionarySearchResult,
  ReadingAiResult,
  ReadingTranslationResult,
  NoteColor,
  ReaderNote,
  DraftNote,
  SelectionToolbarState,
  DictionaryFallbackResult,
} from './reading/types';

const DesktopReadingArticlePage = lazy(() => import('./desktop/DesktopReadingArticlePage'));
const MobileReadingArticlePage = lazy(() => import('./mobile/MobileReadingArticlePage'));

import { ReadingArticleSidebar, renderReadingArticleState } from './reading/ReadingComponents';

const SELECTION_TOOLBAR_DISMISS_SELECTORS = [
  '[data-reading-selection-toolbar]',
  '[data-annotation-toolbar]',
] as const;

function createNoteId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ReadingArticlePage() {
  const isMobile = useIsMobile();
  const { articleId = '' } = useParams<{ articleId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useLocalizedNavigate();
  const { t } = useTranslation();
  const { language } = useAuth();
  const uiLanguage = resolveReadingUiLanguage(language);
  const backPath = useMemo(
    () =>
      resolveSafeReturnTo(
        searchParams.get('returnTo'),
        isMobile ? buildMediaPath('reading') : '/reading'
      ),
    [isMobile, searchParams]
  );
  const sessionStorageKey = useMemo(
    () => buildReadingArticleSessionStorageKey(articleId),
    [articleId]
  );
  const persistedSessionState = useMemo(
    () => loadReadingArticleSessionState(sessionStorageKey),
    [sessionStorageKey]
  );
  const contentRef = useRef<HTMLDivElement | null>(null);
  const restoredSessionKeyRef = useRef<string | null>(null);
  const persistSessionTimeoutRef = useRef<number | null>(null);
  const [panelTab, setPanelTab] = useState<PanelTab>(() => persistedSessionState?.panelTab ?? 'ai');
  const [fontSize, setFontSize] = useState(() => persistedSessionState?.fontSize ?? 18);
  const [translationEnabled, setTranslationEnabled] = useState(
    () => persistedSessionState?.translationEnabled ?? false
  );
  const [translations, setTranslations] = useState<string[]>([]);
  const [translationLoading, setTranslationLoading] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [selectionToolbar, setSelectionToolbar] = useState<SelectionToolbarState>({
    visible: false,
    x: 0,
    y: 0,
    text: '',
    anchor: null,
    selectionKind: 'phrase',
  });
  const [noteColor, setNoteColor] = useState<NoteColor>('yellow');
  const [notes, setNotes] = useState<ReaderNote[]>([]);
  const [draftNote, setDraftNote] = useState<DraftNote | null>(null);
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [activeWord, setActiveWord] = useState<string>(
    () => persistedSessionState?.activeWord ?? ''
  );
  const [dictionaryQuery, setDictionaryQuery] = useState('');
  const [dictionaryResult, setDictionaryResult] = useState<DictionarySearchResult | null>(null);
  const [dictionaryLoading, setDictionaryLoading] = useState(false);
  const [dictionaryError, setDictionaryError] = useState<string | null>(null);
  const [dictionaryFallback, setDictionaryFallback] = useState<DictionaryFallbackResult | null>(
    null
  );
  const [dictionaryFallbackLoading, setDictionaryFallbackLoading] = useState(false);
  const [dictionaryFallbackError, setDictionaryFallbackError] = useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<ReadingAiResult | null>(null);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [aiAnalysisError, setAiAnalysisError] = useState<string | null>(null);
  const [savedWords, setSavedWords] = useState<Record<string, boolean>>({});
  const [savingWordKey, setSavingWordKey] = useState<string | null>(null);
  const [noteSyncError, setNoteSyncError] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [_mobileParagraphProgress, setMobileParagraphProgress] = useState(1);

  // --- Sentence Explainer State ---
  const [explainingSentence, setExplainingSentence] = useState<string | null>(null);
  const [sentenceExplanation, setSentenceExplanation] = useState<{ id: string; data: SentenceExplanationPayload } | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);
  const explainSentenceAction = useAction(SENTENCE_EXPLAINER.explainSentence);
  const saveAssetsMutation = useMutation(SENTENCE_EXPLAINER.saveAssets);

  const analyzeReadingArticle = useAction(AI.analyzeReadingArticle);
  const explainWordFallback = useAction(AI.explainWordFallback);
  const translateReadingParagraphs = useAction(AI.translateReadingParagraphs);
  const searchDictionary = useAction(DICTIONARY.searchDictionary);
  const addToReview = useMutation(VOCAB.addToReview);
  const markArticleRead = useMutation(NEWS.markArticleRead);
  const { speak, stop, isLoading: speakingLoading, error: ttsError } = useTTS();

  const translationLang = useMemo(() => resolveReadingTranslationLanguage(language), [language]);
  const _translationLabel = useMemo(
    () => translationLanguageLabel(translationLang),
    [translationLang]
  );
  const dateLocale = useMemo(() => {
    if (uiLanguage === 'zh') return 'zh-CN';
    if (uiLanguage === 'vi') return 'vi-VN';
    if (uiLanguage === 'mn') return 'mn-MN';
    return 'en-US';
  }, [uiLanguage]);

  const article = useQuery(NEWS.getById, getReadingArticleQueryArg(articleId)) as
    | NewsArticle
    | null
    | undefined;
  const markedArticleIdRef = useRef<string | null>(null);
  const articleResetKeyRef = useRef<string | null>(null);

  const cleanedBodyText = useMemo(
    () => (article ? cleanArticleBodyText(article.bodyText) : ''),
    [article]
  );
  const fallbackVocabulary = useMemo(
    () =>
      cleanedBodyText
        ? extractVocabulary(
            cleanedBodyText,
            uiLanguage,
            t('readingArticle.vocabFallbackMeaning', {
              defaultValue: 'Core contextual word (tap to look up)',
            })
          )
        : [],
    [cleanedBodyText, t, uiLanguage]
  );
  const fallbackGrammar = useMemo(
    () => (cleanedBodyText ? extractGrammar(cleanedBodyText, uiLanguage) : []),
    [cleanedBodyText, uiLanguage]
  );
  const fallbackSummary = useMemo(
    () =>
      article ? summarizeArticle(article.title, article.summary, cleanedBodyText, uiLanguage) : '',
    [article, cleanedBodyText, uiLanguage]
  );
  const vocabulary = useMemo(
    () => (aiAnalysis?.vocabulary?.length ? aiAnalysis.vocabulary : fallbackVocabulary),
    [aiAnalysis, fallbackVocabulary]
  );
  const grammar = useMemo(
    () => (aiAnalysis?.grammar?.length ? aiAnalysis.grammar : fallbackGrammar),
    [aiAnalysis, fallbackGrammar]
  );
  const summary = useMemo(
    () => (aiAnalysis?.summary ? aiAnalysis.summary : fallbackSummary),
    [aiAnalysis, fallbackSummary]
  );
  const paragraphs = useMemo(
    () => (cleanedBodyText ? toParagraphs(cleanedBodyText) : []),
    [cleanedBodyText]
  );
  const articleConvexId = article?._id ?? '';
  const annotationScopeId = articleId || articleConvexId || 'reading-pending';
  const articleTitle = article?.title ?? '';
  const articleSummary = article?.summary;
  const aiAnalysisRequestKeyRef = useRef<string | null>(null);
  const translationRequestKeyRef = useRef<string | null>(null);
  const dictionaryLookupKeyRef = useRef<string | null>(null);
  const { annotations: scopedAnnotations, upsert: upsertScopedAnnotation } = useScopedAnnotations({
    scopeType: 'READING_ARTICLE',
    scopeId: annotationScopeId,
    targetType: 'TEXTBOOK',
    sourceModule: 'READING_ARTICLE',
    contentTitle: articleTitle,
    extraTags: ['reading', 'news'],
  });

  useEffect(() => {
    restoredSessionKeyRef.current = null;
    setPanelTab(persistedSessionState?.panelTab ?? 'ai');
    setFontSize(persistedSessionState?.fontSize ?? 18);
    setTranslationEnabled(persistedSessionState?.translationEnabled ?? false);
    setActiveWord(persistedSessionState?.activeWord ?? '');
    setHoveredNoteId(null);
    setSelectedNoteId(null);
    setDraftNote(null);
  }, [persistedSessionState, sessionStorageKey]);

  useEffect(() => {
    if (!scopedAnnotations || scopedAnnotations.length === 0) {
      setNotes(prev => (prev.length === 0 ? prev : []));
      return;
    }

    const nextNotes: ReaderNote[] = scopedAnnotations
      .filter(
        item =>
          typeof item.note === 'string' &&
          item.note.trim().length > 0 &&
          typeof item.startOffset === 'number' &&
          typeof item.endOffset === 'number'
      )
      .map(item => {
        const blockId = item.blockId || 'P0';
        const parsedParagraphIndex = Number.parseInt(blockId.replace(/^P/i, ''), 10);
        return {
          id: String(item.id),
          quote: item.quote || item.text,
          comment: item.note || '',
          color: normalizeAnnotationNoteColor(item.color),
          createdAt: item.updatedAt || item.createdAt || 0,
          anchor: {
            paragraphIndex: Number.isFinite(parsedParagraphIndex) ? parsedParagraphIndex : 0,
            start: item.startOffset || 0,
            end: item.endOffset || (item.quote || item.text || '').length,
          },
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);

    setNotes(prev => (areReaderNotesEqual(prev, nextNotes) ? prev : nextNotes));
  }, [scopedAnnotations]);

  useEffect(() => {
    if (articleResetKeyRef.current === articleConvexId) return;
    articleResetKeyRef.current = articleConvexId;
    setTranslations([]);
    setTranslationEnabled(persistedSessionState?.translationEnabled ?? false);
    setTranslationError(null);
    setSavedWords({});
    setNotes(prev => (prev.length === 0 ? prev : []));
    setNoteSyncError(null);
    setSpeaking(false);
    stop();
  }, [articleConvexId, persistedSessionState?.translationEnabled, stop]);

  useEffect(() => {
    if (!articleConvexId || !articleTitle || !cleanedBodyText) {
      aiAnalysisRequestKeyRef.current = null;
      setAiAnalysis(null);
      setAiAnalysisLoading(false);
      setAiAnalysisError(null);
      return;
    }

    const requestKey = `${articleConvexId}:${translationLang ?? 'ko'}:${cleanedBodyText.length}`;
    if (aiAnalysisRequestKeyRef.current === requestKey) return;
    aiAnalysisRequestKeyRef.current = requestKey;

    let cancelled = false;
    setAiAnalysisLoading(true);
    setAiAnalysisError(null);

    const run = async () => {
      try {
        const result = await analyzeReadingArticle({
          title: articleTitle,
          summary: articleSummary,
          bodyText: cleanedBodyText,
          language: translationLang,
        });
        if (cancelled) return;
        setAiAnalysis(result);
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : String(error);
        setAiAnalysis(null);
        setAiAnalysisError(
          message ||
            t('readingArticle.errors.aiAnalysisFailed', { defaultValue: 'AI analysis failed' })
        );
      } finally {
        if (!cancelled) {
          setAiAnalysisLoading(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [
    analyzeReadingArticle,
    articleConvexId,
    articleTitle,
    articleSummary,
    cleanedBodyText,
    translationLang,
    t,
  ]);

  useEffect(() => {
    if (!article?._id) return;
    if (markedArticleIdRef.current === article._id) return;
    markedArticleIdRef.current = article._id;
    void markArticleRead({ articleId: article._id }).catch(() => undefined);
  }, [article?._id, markArticleRead]);

  const requestTranslations = useCallback(async () => {
    if (!articleTitle || paragraphs.length === 0) {
      setTranslations(prev => (prev.length === 0 ? prev : []));
      setTranslationLoading(false);
      setTranslationError(null);
      return;
    }

    setTranslationLoading(true);
    setTranslationError(null);
    try {
      const result = (await translateReadingParagraphs({
        title: articleTitle,
        paragraphs,
        language: translationLang,
      })) as ReadingTranslationResult | null;
      const next = Array.isArray(result?.translations) ? result.translations : [];
      const normalized = paragraphs.map((_, index) => next[index] || '');
      setTranslations(prev => (areStringArraysEqual(prev, normalized) ? prev : normalized));
      const hasAnyTranslation = normalized.some(item => item.trim().length > 0);
      setTranslationError(
        hasAnyTranslation
          ? null
          : t('readingArticle.errors.translationUnavailable', {
              defaultValue: 'Translation service is currently unavailable.',
            })
      );
    } catch (error) {
      setTranslations(prev => (prev.length === 0 ? prev : []));
      setTranslationError(toTranslationErrorMessage(error, uiLanguage));
    } finally {
      setTranslationLoading(false);
    }
  }, [articleTitle, paragraphs, t, translateReadingParagraphs, translationLang, uiLanguage]);

  const onToggleTranslation = useCallback(() => {
    setTranslationEnabled(prev => {
      const next = !prev;
      if (
        next &&
        !translationLoading &&
        (translations.length === 0 || !translations.some(item => item.trim().length > 0))
      ) {
        void requestTranslations();
      }
      return next;
    });
  }, [requestTranslations, translationLoading, translations]);

  useEffect(() => {
    if (!article || !articleTitle || paragraphs.length === 0) {
      translationRequestKeyRef.current = null;
      setTranslations(prev => (prev.length === 0 ? prev : []));
      setTranslationLoading(false);
      setTranslationError(null);
      return;
    }

    const requestKey = `${articleConvexId}:${translationLang ?? 'ko'}:${paragraphs.length}`;
    const pretranslated =
      translationLang && article.paragraphTranslations?.[translationLang]
        ? article.paragraphTranslations[translationLang]
        : undefined;
    if (Array.isArray(pretranslated) && pretranslated.length >= paragraphs.length) {
      const normalized = paragraphs.map((_, index) => pretranslated[index] || '');
      translationRequestKeyRef.current = requestKey;
      setTranslations(prev => (areStringArraysEqual(prev, normalized) ? prev : normalized));
      setTranslationLoading(false);
      setTranslationError(null);
      return;
    }

    if (!translationEnabled) {
      translationRequestKeyRef.current = null;
      setTranslations(prev => (prev.length === 0 ? prev : []));
      setTranslationLoading(false);
      setTranslationError(null);
      return;
    }

    if (translationRequestKeyRef.current === requestKey) return;
    translationRequestKeyRef.current = requestKey;
    void requestTranslations();
  }, [
    article,
    articleConvexId,
    articleTitle,
    paragraphs,
    requestTranslations,
    translationEnabled,
    translationLang,
  ]);

  useEffect(() => {
    const onMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        setSelectionToolbar(prev => ({ ...prev, visible: false }));
        return;
      }
      const text = selection.toString().trim();
      if (!text) {
        setSelectionToolbar(prev => ({ ...prev, visible: false }));
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const container = contentRef.current;
      if (!container) return;
      if (!container.contains(range.commonAncestorContainer)) {
        setSelectionToolbar(prev => ({ ...prev, visible: false }));
        return;
      }

      const noteElement = (
        range.commonAncestorContainer.nodeType === Node.ELEMENT_NODE
          ? (range.commonAncestorContainer as Element)
          : range.commonAncestorContainer.parentElement
      )?.closest('[data-note-id]');
      if (noteElement instanceof HTMLElement && noteElement.dataset.noteId) {
        setSelectedNoteId(noteElement.dataset.noteId);
      }

      let anchor: NoteAnchor | null = null;
      const startParagraph = getClosestParagraphElement(range.startContainer);
      const endParagraph = getClosestParagraphElement(range.endContainer);
      if (startParagraph && endParagraph && startParagraph === endParagraph) {
        const paragraphIndex = Number(startParagraph.dataset.paragraphIndex ?? -1);
        if (Number.isInteger(paragraphIndex) && paragraphIndex >= 0) {
          const visibleParagraphText = normalizeInlineWhitespace(startParagraph.innerText || '');
          const selectedVisibleText = normalizeInlineWhitespace(text);
          const start = visibleParagraphText.indexOf(selectedVisibleText);
          if (start >= 0) {
            const end = start + selectedVisibleText.length;
            anchor = { paragraphIndex, start, end };
          }
        }
      }

      setSelectionToolbar({
        visible: true,
        x: rect.left + rect.width / 2,
        y: Math.max(72, rect.top - 14),
        text,
        anchor,
        selectionKind: classifySelectionKind(text),
      });
    };

    document.addEventListener('mouseup', onMouseUp);
    return () => document.removeEventListener('mouseup', onMouseUp);
  }, []);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  useOutsideDismiss({
    enabled: selectionToolbar.visible,
    onDismiss: () => setSelectionToolbar(prev => ({ ...prev, visible: false })),
    ignoreSelectors: SELECTION_TOOLBAR_DISMISS_SELECTORS,
  });

  const toggleSpeak = () =>
    handleReadingToggleSpeak({
      article,
      speaking,
      speakingLoading,
      stop,
      setSpeaking,
      cleanedBodyText,
      speak,
    });

  const onWordClick = useCallback((word: string) => {
    setActiveWord(word);
    setPanelTab('notes');
  }, []);

  const runAIDictionaryFallback = useCallback(
    async (query: string) => {
      setDictionaryFallbackLoading(true);
      setDictionaryFallbackError(null);
      try {
        const result = await explainWordFallback({
          word: query,
          context: findContextSentence(cleanedBodyText, query),
          language: translationLang,
        });
        setDictionaryFallback(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setDictionaryFallback(null);
        setDictionaryFallbackError(
          message ||
            t('readingArticle.errors.aiDictionaryFailed', {
              defaultValue: 'AI dictionary fallback failed',
            })
        );
      } finally {
        setDictionaryFallbackLoading(false);
      }
    },
    [cleanedBodyText, explainWordFallback, t, translationLang]
  );

  const runDictionaryLookup = useCallback(
    async (rawWord: string) => {
      const query = normalizeInlineWhitespace(rawWord);
      if (!query) {
        setDictionaryResult(null);
        setDictionaryError(null);
        setDictionaryLoading(false);
        setDictionaryFallback(null);
        setDictionaryFallbackError(null);
        setDictionaryFallbackLoading(false);
        return;
      }

      setDictionaryQuery(query);
      setDictionaryLoading(true);
      setDictionaryError(null);
      setDictionaryResult(null);
      setDictionaryFallback(null);
      setDictionaryFallbackError(null);

      try {
        const result = await searchDictionary({
          query,
          translationLang,
          num: 5,
          part: 'word',
          sort: 'popular',
        });
        setDictionaryResult(result);
        if ((result.entries ?? []).length === 0) {
          await runAIDictionaryFallback(query);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setDictionaryResult(null);
        setDictionaryError(
          message ||
            t('readingArticle.errors.dictionaryLookupFailed', {
              defaultValue: 'Dictionary lookup failed',
            })
        );
        await runAIDictionaryFallback(query);
      } finally {
        setDictionaryLoading(false);
      }
    },
    [runAIDictionaryFallback, searchDictionary, t, translationLang]
  );

  useEffect(() => {
    if (!activeWord) {
      dictionaryLookupKeyRef.current = null;
      return;
    }
    const requestKey = `${translationLang ?? 'ko'}:${normalizeInlineWhitespace(activeWord)}`;
    if (dictionaryLookupKeyRef.current === requestKey) return;
    dictionaryLookupKeyRef.current = requestKey;
    void runDictionaryLookup(activeWord);
  }, [activeWord, runDictionaryLookup, translationLang]);

  useEffect(() => {
    if (!isMobile) return;
    if (activeWord) return;
    const fallbackWord = vocabulary[0]?.term;
    if (!fallbackWord) return;
    setActiveWord(fallbackWord);
  }, [activeWord, isMobile, vocabulary]);

  const saveWordToReview = useCallback(
    async ({
      word,
      meaning,
      partOfSpeech,
      source,
    }: {
      word: string;
      meaning: string;
      partOfSpeech?: string;
      source: string;
    }) => {
      const normalizedWord = normalizeInlineWhitespace(word);
      if (!normalizedWord) return;
      const saveKey = normalizedWord.toLowerCase();
      if (savedWords[saveKey]) return;
      setSavingWordKey(saveKey);
      try {
        await addToReview({
          word: normalizedWord,
          meaning:
            meaning.trim() ||
            t('readingArticle.vocabDefaultMeaning', { defaultValue: 'Reading vocabulary' }),
          partOfSpeech: normalizePartOfSpeech(partOfSpeech),
          context: findContextSentence(cleanedBodyText, normalizedWord),
          source,
        });
        setSavedWords(prev => ({ ...prev, [saveKey]: true }));
      } finally {
        setSavingWordKey(current => (current === saveKey ? null : current));
      }
    },
    [addToReview, cleanedBodyText, savedWords, t]
  );

  const onSaveVocabularyItem = useCallback(
    async (item: VocabularyItem) => {
      await saveWordToReview({
        word: item.term,
        meaning: item.meaning,
        partOfSpeech: 'NOUN',
        source: 'READING_AI_CORE',
      });
    },
    [saveWordToReview]
  );

  const onSaveDictionaryEntry = useCallback(
    async (entry: DictionaryEntry) => {
      await saveWordToReview({
        word: entry.word,
        meaning:
          getDictionaryMeaning(entry) ||
          t('readingArticle.dictionaryFallbackMeaning', {
            defaultValue: 'Reading dictionary meaning',
          }),
        partOfSpeech: entry.pos,
        source: 'READING_DICTIONARY',
      });
    },
    [saveWordToReview, t]
  );

  const onSaveDictionaryFallback = useCallback(async () => {
    if (!dictionaryFallback) return;
    await saveWordToReview({
      word: dictionaryFallback.word,
      meaning:
        dictionaryFallback.meaning ||
        t('readingArticle.aiMeaningFallback', { defaultValue: 'AI explanation' }),
      partOfSpeech: dictionaryFallback.pos,
      source: 'READING_DICTIONARY_AI',
    });
  }, [dictionaryFallback, saveWordToReview, t]);

  const onSaveSelectionWord = useCallback(
    async (text: string) => {
      const query = normalizeInlineWhitespace(text);
      if (!query) return;

      setActiveWord(query);
      setPanelTab('notes');
      setSelectionToolbar(prev => ({ ...prev, visible: false }));

      try {
        const result = await searchDictionary({
          query,
          translationLang,
          num: 5,
          part: 'word',
          sort: 'popular',
        });
        const firstEntry = result.entries?.[0];

        if (firstEntry) {
          await saveWordToReview({
            word: firstEntry.word,
            meaning:
              getDictionaryMeaning(firstEntry) ||
              t('readingArticle.dictionaryFallbackMeaning', {
                defaultValue: 'Reading dictionary meaning',
              }),
            partOfSpeech: firstEntry.pos,
            source: 'READING_SELECTION_WORD',
          });
          return;
        }

        const fallback = await explainWordFallback({
          word: query,
          context: findContextSentence(cleanedBodyText, query),
          language: translationLang,
        });

        if (fallback) {
          await saveWordToReview({
            word: fallback.word,
            meaning:
              fallback.meaning ||
              t('readingArticle.aiMeaningFallback', { defaultValue: 'AI explanation' }),
            partOfSpeech: fallback.pos,
            source: 'READING_SELECTION_WORD_AI',
          });
        }
      } catch (error) {
        console.error('Failed to save selected word to vocab:', error);
      }
    },
    [cleanedBodyText, explainWordFallback, saveWordToReview, searchDictionary, t, translationLang]
  );

  const startNoteFromSelection = () => {
    const quote = normalizeInlineWhitespace(selectionToolbar.text);
    const anchor = selectionToolbar.anchor;
    if (!quote || !anchor) return;
    setDraftNote({ quote, color: noteColor, comment: '', anchor });
    setSelectionToolbar(prev => ({ ...prev, visible: false }));
    setPanelTab('notes');
  };

  const onLookupSelection = () => {
    const text = selectionToolbar.text.trim();
    if (!text) return;
    setActiveWord(text);
    setPanelTab('notes');
    setSelectionToolbar(prev => ({ ...prev, visible: false }));
  };

  const onExplainSelection = async () => {
    const text = selectionToolbar.text.trim();
    if (!text) return;
    setExplainingSentence(text);
    setPanelTab('explain');
    setSelectionToolbar(prev => ({ ...prev, visible: false }));
    setExplainLoading(true);
    setExplainError(null);
    setSentenceExplanation(null);
    try {
      const result = await explainSentenceAction({
        sentence: text,
        targetLanguage: translationLang,
        source: 'reading_page',
        sourceRefId: articleId,
      });
      if (result.success && result.explanationId && result.data) {
        setSentenceExplanation({ id: result.explanationId, data: result.data });
      } else {
        setExplainError(result.error || 'Failed to explain sentence');
      }
    } catch (e) {
      setExplainError(e instanceof Error ? e.message : 'Failed to explain sentence');
    } finally {
      setExplainLoading(false);
    }
  };

  const onDraftCommentChange = useCallback((value: string) => {
    setDraftNote(prev => (prev ? { ...prev, comment: value } : prev));
  }, []);

  const onSaveDraftNote = useCallback(async () => {
    if (!draftNote) return;
    const quote = normalizeInlineWhitespace(draftNote.quote);
    const nextNote: ReaderNote = {
      id: createNoteId(),
      quote,
      color: draftNote.color,
      comment: draftNote.comment.trim(),
      createdAt: Date.now(),
      anchor: draftNote.anchor,
    };
    setNotes(prev => [nextNote, ...prev]);
    setDraftNote(null);
    setNoteSyncError(null);
    try {
      const paragraphText = normalizeInlineWhitespace(
        paragraphs[nextNote.anchor.paragraphIndex] || ''
      );
      await upsertScopedAnnotation({
        anchor: {
          blockId: `P${nextNote.anchor.paragraphIndex}`,
          start: nextNote.anchor.start,
          end: nextNote.anchor.end,
          quote: nextNote.quote,
          contextBefore: paragraphText.slice(
            Math.max(0, nextNote.anchor.start - 36),
            nextNote.anchor.start
          ),
          contextAfter: paragraphText.slice(nextNote.anchor.end, nextNote.anchor.end + 36),
        },
        note: nextNote.comment,
        color: nextNote.color,
        contextKey: `READING:${annotationScopeId}:P${nextNote.anchor.paragraphIndex}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setNoteSyncError(
        message ||
          t('readingArticle.errors.noteSyncFailed', {
            defaultValue: 'Failed to sync note to Notebook',
          })
      );
    }
  }, [annotationScopeId, draftNote, paragraphs, t, upsertScopedAnnotation]);

  const onDiscardDraftNote = useCallback(() => {
    discardDraftNoteSelection(setSelectedNoteId, setDraftNote);
  }, []);

  const dictionaryEntries = useMemo(
    () => dictionaryResult?.entries ?? [],
    [dictionaryResult?.entries]
  );

  const getNoteVisualState = useCallback(
    (noteId: string): NoteVisualState =>
      resolveReadingNoteVisualState(noteId, hoveredNoteId, selectedNoteId),
    [hoveredNoteId, selectedNoteId]
  );

  const increaseFontSize = () => {
    setFontSize(previous => getNextReadingFontSize(previous));
  };

  const persistArticleSession = useCallback(
    (scrollTop?: number) => {
      if (restoredSessionKeyRef.current !== sessionStorageKey) return;
      const nextScrollTop = Math.max(0, scrollTop ?? contentRef.current?.scrollTop ?? 0);

      if (persistSessionTimeoutRef.current !== null) {
        globalThis.window.clearTimeout(persistSessionTimeoutRef.current);
      }

      persistSessionTimeoutRef.current = globalThis.window.setTimeout(() => {
        persistReadingArticleSessionState(sessionStorageKey, {
          scrollTop: nextScrollTop,
          fontSize,
          translationEnabled,
          panelTab,
          activeWord: normalizeInlineWhitespace(activeWord),
          timestamp: Date.now(),
        });
      }, 180);
    },
    [activeWord, fontSize, panelTab, sessionStorageKey, translationEnabled]
  );

  useLayoutEffect(() => {
    const container = contentRef.current;
    if (!container) return;
    if (restoredSessionKeyRef.current === sessionStorageKey) return;

    const targetScrollTop = Math.max(0, persistedSessionState?.scrollTop ?? 0);
    let frame = requestAnimationFrame(() => {
      if (!contentRef.current) return;
      contentRef.current.scrollTop = targetScrollTop;
      restoredSessionKeyRef.current = sessionStorageKey;
    });

    return () => cancelAnimationFrame(frame);
  }, [paragraphs.length, persistedSessionState?.scrollTop, sessionStorageKey]);

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    let frame = 0;
    const handleScroll = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        persistArticleSession(container.scrollTop);
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      if (frame) cancelAnimationFrame(frame);
      if (persistSessionTimeoutRef.current !== null) {
        globalThis.window.clearTimeout(persistSessionTimeoutRef.current);
        persistSessionTimeoutRef.current = null;
      }
      persistArticleSession(container.scrollTop);
      container.removeEventListener('scroll', handleScroll);
    };
  }, [persistArticleSession]);

  useEffect(() => {
    if (!isMobile) {
      setMobileParagraphProgress(1);
      return;
    }
    const container = contentRef.current;
    if (!container) return;

    const updateProgress = () => {
      const totalParagraphs = Math.max(1, paragraphs.length);
      const scrollableHeight = Math.max(1, container.scrollHeight - container.clientHeight);
      const ratio = Math.max(0, Math.min(1, container.scrollTop / scrollableHeight));
      const paragraphIndex = Math.min(
        totalParagraphs,
        Math.max(1, Math.round(ratio * (totalParagraphs - 1)) + 1)
      );
      setMobileParagraphProgress(paragraphIndex);
    };

    updateProgress();
    container.addEventListener('scroll', updateProgress, { passive: true });
    return () => container.removeEventListener('scroll', updateProgress);
  }, [isMobile, paragraphs.length]);

  useEffect(() => {
    persistArticleSession();
  }, [persistArticleSession]);

  useEffect(() => {
    return () => {
      if (persistSessionTimeoutRef.current !== null) {
        globalThis.window.clearTimeout(persistSessionTimeoutRef.current);
      }
    };
  }, []);

  const focusNote = useCallback((noteId: string) => {
    setSelectedNoteId(noteId);
    requestAnimationFrame(() => {
      const container = contentRef.current;
      if (!container) return;
      const el = container.querySelector(`[data-note-id="${noteId}"]`);
      if (!(el instanceof HTMLElement)) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, []);

  const readingSidebarContent = useMemo(
    () => (
      <ReadingArticleSidebar
        panelTab={panelTab}
        setPanelTab={setPanelTab}
        t={t}
        aiAnalysisLoading={aiAnalysisLoading}
        aiAnalysisError={aiAnalysisError}
        summary={summary}
        vocabulary={vocabulary}
        onWordClick={onWordClick}
        onSaveVocabularyItem={onSaveVocabularyItem}
        savingWordKey={savingWordKey}
        savedWords={savedWords}
        grammar={grammar}
        activeWord={activeWord}
        dictionaryQuery={dictionaryQuery}
        dictionaryLoading={dictionaryLoading}
        dictionaryError={dictionaryError}
        dictionaryFallbackLoading={dictionaryFallbackLoading}
        dictionaryFallbackError={dictionaryFallbackError}
        dictionaryFallback={dictionaryFallback}
        dictionaryEntries={dictionaryEntries}
        onSaveDictionaryEntry={onSaveDictionaryEntry}
        onSaveDictionaryFallback={onSaveDictionaryFallback}
        noteSyncError={noteSyncError}
        draftNote={draftNote}
        onDraftCommentChange={onDraftCommentChange}
        onDiscardDraftNote={onDiscardDraftNote}
        onSaveDraftNote={onSaveDraftNote}
        notes={notes}
        focusNote={focusNote}
        setHoveredNoteId={setHoveredNoteId}
        getNoteVisualState={getNoteVisualState}
        explainingSentence={explainingSentence}
        sentenceExplanation={sentenceExplanation}
        explainLoading={explainLoading}
        explainError={explainError}
        saveAssetsMutation={saveAssetsMutation}
      />
    ),
    [
      activeWord,
      aiAnalysisError,
      aiAnalysisLoading,
      dictionaryEntries,
      dictionaryError,
      dictionaryFallback,
      dictionaryFallbackError,
      dictionaryFallbackLoading,
      dictionaryLoading,
      dictionaryQuery,
      draftNote,
      focusNote,
      getNoteVisualState,
      grammar,
      noteSyncError,
      notes,
      onDiscardDraftNote,
      onDraftCommentChange,
      onSaveDictionaryEntry,
      onSaveDictionaryFallback,
      onSaveDraftNote,
      onSaveVocabularyItem,
      onWordClick,
      panelTab,
      savedWords,
      savingWordKey,
      setHoveredNoteId,
      setPanelTab,
      summary,
      t,
      vocabulary,
      explainingSentence,
      sentenceExplanation,
      explainLoading,
      explainError,
      saveAssetsMutation,
    ]
  );

  const stateView = renderReadingArticleState({
    articleId,
    article,
    t,
    navigate,
    backPath,
  });
  if (stateView) return stateView;
  const resolvedArticle = article as NewsArticle;
  const sourceDisplayLabel = getReadingSourceLabel(
    resolvedArticle.sourceKey,
    t('readingArticle.meta.unknownSource', { defaultValue: 'Unknown source' })
  );
  const publishedDateLabel = formatReadingPublishedDate(
    resolvedArticle.publishedAt,
    dateLocale,
    t('readingArticle.meta.dateUnavailable', { defaultValue: 'Date unavailable' })
  );

  const wordCount = Math.max(1, Math.round(cleanedBodyText.length / 2));
  const mobilePrimaryEntry = dictionaryEntries[0] ?? null;
  const mobileEntryMeaning = mobilePrimaryEntry ? getDictionaryMeaning(mobilePrimaryEntry) : '';
  const mobileFallbackMeaning = dictionaryFallback?.meaning || '';
  const mobileWordMeaning =
    mobileEntryMeaning ||
    mobileFallbackMeaning ||
    t('readingArticle.vocabDefaultMeaning', { defaultValue: 'Reading vocabulary' });
  const mobileWordPos = mobilePrimaryEntry?.pos || dictionaryFallback?.pos || 'NOUN';
  const mobileWordSaveKey = (activeWord || '').trim().toLowerCase();
  const mobileWordSaved = mobileWordSaveKey ? Boolean(savedWords[mobileWordSaveKey]) : false;

  const handleMobileSaveWord = () => {
    if (!activeWord.trim()) return;
    if (mobilePrimaryEntry) {
      void onSaveDictionaryEntry(mobilePrimaryEntry);
      return;
    }
    if (dictionaryFallback) {
      void onSaveDictionaryFallback();
      return;
    }
    void saveWordToReview({
      word: activeWord,
      meaning: mobileWordMeaning,
      partOfSpeech: mobileWordPos,
      source: 'READING_MOBILE_QUICK_SAVE',
    });
  };
  return (
    <Suspense fallback={<ContentSkeleton />}>
      {isMobile ? (
        <MobileReadingArticlePage
          t={t}
          navigate={navigate}
          backPath={backPath}
          resolvedArticle={resolvedArticle}
          difficultyClass={difficultyClass}
          difficultyLabel={difficultyLabel}
          sourceDisplayLabel={sourceDisplayLabel}
          increaseFontSize={increaseFontSize}
          toggleSpeak={toggleSpeak}
          speaking={speaking}
          speakingLoading={speakingLoading}
          ttsError={ttsError}
          translationError={translationError}
          translationLoading={translationLoading}
          translationEnabled={translationEnabled}
          onToggleTranslation={onToggleTranslation}
          fontSize={fontSize}
          paragraphs={paragraphs}
          translations={translations}
          draftNote={draftNote}
          notes={notes}
          getNoteVisualState={getNoteVisualState}
          focusNote={focusNote}
          setHoveredNoteId={setHoveredNoteId}
          contentRef={contentRef}
          wordCount={wordCount}
          publishedDateLabel={publishedDateLabel}
          readingSidebarContent={readingSidebarContent}
          selectionToolbar={selectionToolbar}
          noteColor={noteColor}
          setNoteColor={setNoteColor}
          onLookupSelection={onLookupSelection}
          onExplainSelection={onExplainSelection}
          onSaveSelectionWord={onSaveSelectionWord}
          startNoteFromSelection={startNoteFromSelection}
          setSelectionToolbar={setSelectionToolbar}
          mobilePanelOpen={mobilePanelOpen}
          setMobilePanelOpen={setMobilePanelOpen}
          handleMobileSaveWord={handleMobileSaveWord}
          mobileWordSaved={mobileWordSaved}
        />
      ) : (
        <DesktopReadingArticlePage
          t={t}
          navigate={navigate}
          resolvedArticle={resolvedArticle}
          difficultyLabel={difficultyLabel}
          sourceDisplayLabel={sourceDisplayLabel}
          increaseFontSize={increaseFontSize}
          toggleSpeak={toggleSpeak}
          speaking={speaking}
          onToggleTranslation={onToggleTranslation}
          translationEnabled={translationEnabled}
          fontSize={fontSize}
          paragraphs={paragraphs}
          translations={translations}
          wordCount={wordCount}
          publishedDateLabel={publishedDateLabel}
          readingSidebarContent={readingSidebarContent}
          onWordClick={onWordClick}
          activeWord={activeWord}
          selectionToolbar={selectionToolbar}
          noteColor={noteColor}
          setNoteColor={setNoteColor}
          onLookupSelection={onLookupSelection}
          onExplainSelection={onExplainSelection}
          onSaveSelectionWord={onSaveSelectionWord}
          startNoteFromSelection={startNoteFromSelection}
          setSelectionToolbar={setSelectionToolbar}
          contentRef={contentRef}
        />
      )}
    </Suspense>
  );
}
