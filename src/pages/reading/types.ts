import type { AnnotationSelectionKind } from '../../features/annotation-kit/types';

export type PanelTab = 'ai' | 'notes' | 'explain';
export type NoteVisualState = 'default' | 'selected' | 'hovered';

export type VocabularyItem = {
  term: string;
  meaning: string;
  level: string;
};

export type GrammarItem = {
  pattern: string;
  explanation: string;
  example: string;
};

export type DictionaryEntry = {
  targetCode: string;
  word: string;
  pronunciation?: string;
  pos?: string;
  senses: Array<{
    order: number;
    definition: string;
    translation?: { lang: string; word: string; definition: string };
  }>;
};

export type DictionarySearchResult = {
  total: number;
  start: number;
  num: number;
  entries: DictionaryEntry[];
};

export type ReadingAiResult = {
  summary: string;
  vocabulary: VocabularyItem[];
  grammar: GrammarItem[];
};

export type ReadingTranslationResult = {
  translations: string[];
};

export type SentenceToken = {
  surface: string;
  lemma?: string;
  partOfSpeech?: string;
  start?: number;
  end?: number;
  length?: number;
  wordPosition?: number;
  sentencePosition?: number;
};

export type SentenceVocabularyItem = {
  surface: string;
  lemma?: string;
  partOfSpeech?: string;
  meaning?: string;
  difficultyLevel?: string;
  difficultyScore?: number;
};

export type SentenceGrammarItem = {
  pattern: string;
  explanation?: string;
  reason?: string;
  start?: number;
  end?: number;
};

export type SentenceExplanationPayload = {
  sentence: string;
  normalizedText?: string;
  summary?: string;
  overallMeaning?: string;
  naturalTranslation?: string;
  tokens?: SentenceToken[];
  vocabulary?: SentenceVocabularyItem[];
  grammar?: SentenceGrammarItem[];
  notes?: string[];
};

export type DictionaryFallbackResult = {
  word: string;
  pos: string;
  meaning: string;
  example: string;
  note: string;
};

export type NoteColor = 'yellow' | 'green' | 'blue' | 'pink';

export type ReaderNote = {
  id: string;
  quote: string;
  comment: string;
  color: NoteColor;
  createdAt: number;
  anchor: NoteAnchor;
};

export type NoteAnchor = {
  paragraphIndex: number;
  start: number;
  end: number;
};

export type DraftNote = {
  quote: string;
  color: NoteColor;
  comment: string;
  anchor: NoteAnchor;
};

export type SelectionToolbarState = {
  visible: boolean;
  x: number;
  y: number;
  text: string;
  anchor: NoteAnchor | null;
  selectionKind: AnnotationSelectionKind;
};

export type NewsArticle = {
  _id: string;
  sourceKey: string;
  sourceUrl: string;
  title: string;
  summary?: string;
  bodyText: string;
  publishedAt: number;
  difficultyLevel: 'L1' | 'L2' | 'L3';
  difficultyScore: number;
  paragraphTranslations?: Partial<Record<'zh' | 'en' | 'vi' | 'mn', string[]>>;
};
