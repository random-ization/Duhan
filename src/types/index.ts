export enum UserTier {
  FREE = 'FREE',
  PAID = 'PAID',
  PREMIUM = 'PREMIUM',
}

export enum SubscriptionType {
  FREE = 'FREE',
  MONTHLY = 'MONTHLY',
  SEMIANNUAL = 'SEMIANNUAL',
  QUARTERLY = 'QUARTERLY',
  ANNUAL = 'ANNUAL',
  LIFETIME = 'LIFETIME',
}

export type UserRole = 'STUDENT' | 'ADMIN';

export type Language = 'en' | 'zh' | 'vi' | 'mn';

// Canvas data structure for drawing annotations
export interface CanvasLineData {
  id: string;
  tool: 'pen' | 'highlighter' | 'eraser';
  points: number[];
  color: string;
  strokeWidth: number;
  opacity: number;
}

export interface CanvasData {
  lines: CanvasLineData[];
  version: number;
}

export interface Annotation {
  id: string;
  contextKey: string; // e.g. "yonsei-1-1-READING"
  startOffset?: number; // Global character offset start
  endOffset?: number; // Global character offset end
  sentenceIndex?: number; // Index of sentence for Listening module
  text: string; // The selected text content
  selectedText?: string; // Alias for text
  color: 'yellow' | 'green' | 'blue' | 'pink' | null;
  note: string;
  timestamp: number;
  createdAt?: number; // Alias for timestamp

  // Canvas annotation fields (TOPIK drawing)
  targetType?: 'TEXTBOOK' | 'EXAM';
  targetId?: string;
  pageIndex?: number;
  data?: CanvasData; // Canvas vector line data
  visibility?: 'PRIVATE' | 'PUBLIC' | 'CLASS';
}

export interface UserStatistics {
  wordsLearned: number;
  readingsCompleted: number;
  listeningHours: number;
  dayStreak: number;
  activityLog: boolean[]; // Array representing last 365 days or similar, true if active
}

export interface ExamAttempt {
  id: string;
  examId: string;
  examTitle: string;
  score: number;
  maxScore: number;
  totalScore?: number; // Alias for maxScore
  correctCount?: number; // Number of correct answers
  timestamp: number;
  userAnswers: Record<number, number>;
}

// Mistake model - simplified version, matches Prisma Mistake model
export interface Mistake {
  id: string;
  korean: string;
  english: string;
  createdAt?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string; // URL to avatar image
  tier: UserTier;
  role: UserRole;
  subscriptionType?: SubscriptionType; // New field
  subscriptionExpiry?: string; // New field
  phoneRegion?: 'CN' | 'VN' | 'MN' | 'OTHER';
  isRegionalPromoEligible?: boolean;
  phoneVerifiedAt?: string;
  kycStatus?: 'NONE' | 'VERIFIED';
  joinDate: number;
  createdAt?: number; // Alias for joinDate
  lastActive: number;
  savedWords: VocabularyItem[]; // Changed to reuse VocabularyItem for simplicity
  mistakes: Mistake[]; // Matches Prisma Mistake model
  annotations: Annotation[];
  statistics?: UserStatistics;
  examHistory: ExamAttempt[]; // New: Track exam results
  wordsLearned?: number; // Total words learned
  examsTaken?: number; // Total exams taken
  // Learning progress tracking
  lastInstitute?: string;
  lastLevel?: number;
  lastUnit?: number;
  lastModule?: string;
}

export interface SavedWord {
  word: string;
  meaning: string;
  dateAdded: number;
}

export interface LevelConfig {
  level: number;
  units: number; // Number of units in this level
}

export interface Institute {
  id: string;
  name: string; // e.g., Yonsei, Sogang, Ewha
  nameZh?: string;
  nameEn?: string;
  nameVi?: string;
  nameMn?: string;
  levels: (LevelConfig | number)[]; // Support both old format and new format mixed array from Convex
  coverUrl?: string; // Cover image URL for all books in this series
  themeColor?: string; // Theme color for book styling (hex color)
  publisher?: string; // University/Publisher name for filtering (e.g., "延世大学")
  displayLevel?: string; // Display level like "一级", "1급", "Level 1"
  volume?: string; // Volume like "上册", "下册", "A", "B"
  totalUnits?: number; // Total number of units in this textbook (e.g., 10)
}

export enum LearningModuleType {
  VOCABULARY = 'VOCABULARY',
  LISTENING = 'LISTENING',
  READING = 'READING',
  GRAMMAR = 'GRAMMAR',
}

export type PartOfSpeech = 'NOUN' | 'VERB_T' | 'VERB_I' | 'ADJ' | 'ADV' | 'PARTICLE';

// SRS Learning System Types
export type WordStatus = 'NEW' | 'LEARNING' | 'REVIEW' | 'MASTERED';

export interface UserWordProgress {
  id: string;
  status: WordStatus;
  interval: number;
  streak: number;
  nextReviewAt: number | null;
}

export interface VocabTips {
  synonyms?: string[];
  antonyms?: string[];
  nuance?: string;
}

export interface VocabularyItem {
  id?: string;
  korean: string; // Legacy field alias for 'word'
  english: string; // Legacy field alias for 'meaning'
  word?: string; // Database field
  meaning?: string; // Database field
  meaningEn?: string; // Localized meaning
  meaningVi?: string;
  meaningMn?: string;
  pronunciation?: string;
  audioUrl?: string;
  pos?: string; // Legacy field
  partOfSpeech?: PartOfSpeech;
  hanja?: string;
  tips?: VocabTips;
  exampleSentence?: string;
  exampleTranslation?: string; // Legacy alias
  exampleTranslationEn?: string;
  exampleTranslationVi?: string;
  exampleTranslationMn?: string;
  exampleMeaning?: string; // Database field
  unit?: number;
  courseId?: string;
  unitId?: string;
  progress?: UserWordProgress | null; // SRS progress
}

export interface ReadingContent {
  title: string;
  koreanText: string;
  englishTranslation: string;
  keyVocabulary: { word: string; meaning: string; pos?: string }[];
}

export interface GrammarPoint {
  pattern: string;
  explanation: string;
  explanationEn?: string;
  explanationVi?: string;
  explanationMn?: string;
  usages: {
    situation: string;
    example: string;
    translation: string;
    translationEn?: string;
    translationVi?: string;
    translationMn?: string;
  }[];
}

export interface CourseSelection {
  instituteId: string;
  level: number;
  textbookUnit: number;
}

// Detailed Content Structure provided by Admin
export interface TextbookContent {
  generalContext: string; // General themes/notes
  vocabularyList: string; // Raw list of words provided by admin

  readingText: string; // The specific reading passage text
  readingTranslation: string; // Manual translation provided by admin
  readingTitle: string;

  listeningScript: string; // The script for the audio
  listeningTranslation?: string; // New: Translation for the script
  listeningTitle?: string; // New: Title for listening
  listeningAudioUrl: string | null; // Base64 or URL to uploaded audio

  grammarList?: string; // New: Raw list of GrammarPoint[] provided by admin
  isPaid?: boolean; // Whether this unit requires paid subscription
}

// Map key "instituteId-level-unit" to the structured content
export type TextbookContextMap = Record<string, TextbookContent>;

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  activeLearners: number;
  premiumUsers: number;
  totalRevenue: number;
  contentCoverage: number; // percentage of units with content
  totalTextbooks: number;
  totalTopikExams: number;
}

// --- TOPIK TYPES ---

export type TopikType = 'READING' | 'LISTENING';

export type QuestionLayout =
  | 'DEFAULT'
  | 'IMAGE' // New: For pure image questions (Q5-8, Q9, Q10)
  | 'NEWS_HEADLINE' // Q25-27
  | 'INSERT_BOX'; // Q39-41 (<보기>)

export interface TopikQuestion {
  id: number;
  number?: number; // Question number for display
  layout?: QuestionLayout;
  imageUrl?: string; // New: URL/Base64 of the uploaded crop from PDF
  image?: string; // Alias for imageUrl
  instruction?: string; // New: The "※ [1~2]..." text that appears ABOVE the question block
  groupCount?: number; // New: If > 1, this question shares its PASSAGE with the next (n-1) questions.
  passage?: string; // The text or context for the question
  contextBox?: string; // Additional context (like <보기>)
  visualData?: unknown; // For tables/charts (Deprecated for Q5-10, used for data structure if needed)
  question: string; // The actual question prompt
  options: string[]; // Array of 4 options
  optionImages?: string[]; // New: Array of 4 image URLs/Base64 for IMAGE_CHOICE questions (Listening Q1-3)
  correctAnswer: number; // 0-3 index
  score: number;
  explanation?: string; // Explanation for the correct answer
  explanationEn?: string;
  explanationVi?: string;
  explanationMn?: string;
}

export interface TopikExam {
  id: string;
  title: string; // e.g. "64th TOPIK II Reading"
  description?: string; // Optional description
  round: number; // e.g. 64
  type: TopikType;
  paperType?: 'A' | 'B'; // A or B type paper
  timeLimit: number; // in minutes (60 or 70)
  audioUrl?: string; // New: For Listening exams
  questions: TopikQuestion[];
  isPaid?: boolean; // Whether this exam requires paid subscription
}

// Legal Documents
export interface LegalDocument {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

// ==============================================
// V2 CONTENT STRUCTURES (Multi-article, Multi-language)
// ==============================================

// Language codes for translations
export type TranslationLanguage = 'cn' | 'en' | 'vi' | 'mn';

// V2: Reading Article (multiple per unit)
export interface ReadingArticleV2 {
  id: string;
  title: string;
  contentKr: string; // Korean original text
  translations: Partial<Record<TranslationLanguage, string>>;
  createdAt: number;
}

// V2: Listening Track (multiple per unit)
export interface ListeningTrackV2 {
  id: string;
  title: string;
  audioUrl: string | null;
  audioFileName?: string; // Original file name for display
  scriptKr: string; // Korean script
  translations: Partial<Record<TranslationLanguage, string>>;
  createdAt: number;
}

// V2: Enhanced Vocabulary with multi-language
export interface VocabularyItemV2 {
  id: string;
  korean: string;
  pos?: string; // Part of Speech
  translations: Partial<Record<TranslationLanguage, string>>;
  example?: string; // Example sentence in Korean
  exampleTranslations?: Partial<Record<TranslationLanguage, string>>;
}

// V2: Grammar Point
export interface GrammarPointV2 {
  id: string;
  pattern: string; // e.g., "-아/어서"
  meaning: string; // Brief meaning
  conjugation: string; // How to conjugate
  explanation: string; // Detailed explanation
  examples?: { korean: string; translation: string }[];
}

// V2: Unit Content Structure (replaces TextbookContent for new data)
export interface TextbookContentV2 {
  version: 2;
  readings: ReadingArticleV2[];
  listenings: ListeningTrackV2[];
  vocabulary: VocabularyItemV2[];
  grammar: GrammarPointV2[];
  isPaid?: boolean;
}

// Helper type guard
export const isTextbookContentV2 = (content: unknown): content is TextbookContentV2 => {
  return (
    typeof content === 'object' &&
    content !== null &&
    (content as Record<string, unknown>).version === 2
  );
};

// ==============================================
// PODCAST TYPES
// ==============================================

export interface PodcastChannel {
  id?: string;
  itunesId?: string;
  title: string;
  author: string;
  feedUrl: string;
  artworkUrl?: string;
  artwork?: string; // Alias
  description?: string;
}

export interface PodcastEpisode {
  id?: string;
  guid?: string;
  title: string;
  audioUrl: string;
  image?: string;
  itunes?: { image?: string; duration?: string };
  channelTitle?: string;
  channelArtwork?: string;
  pubDate?: string | Date;
  duration?: number | string;
  description?: string;
  channel?: {
    id?: string;
    itunesId?: string;
    title?: string;
    author?: string;
    feedUrl?: string;
    artworkUrl?: string;
    artwork?: string;
  };
}

export interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  translation?: string;
  words?: TranscriptWord[];
}

export interface TranscriptWord {
  word: string;
  start: number;
  end: number;
}

export interface TranscriptResult {
  segments: TranscriptSegment[];
  language: string;
  duration?: number;
  cached?: boolean;
}

export interface ListeningHistoryItem {
  id: string;
  episodeGuid: string;
  episodeTitle: string;
  episodeUrl: string;
  channelName: string;
  channelImage: string | null;
  playedAt: string;
}

export interface SentenceAnalysis {
  vocabulary: { word: string; root: string; meaning: string; type: string }[];
  grammar: { structure: string; explanation: string }[];
  nuance: string;
  cached?: boolean;
}

// Grammar Training Module Types
export interface GrammarPointData {
  id: string;
  title: string;
  slug?: string;
  level?: string; // "TOPIK 1", "TOPIK 2"

  // Chinese summary (default)
  summary: string;
  // Multi-language summaries
  summaryEn?: string;
  summaryVi?: string;
  summaryMn?: string;

  type: string; // "ENDING", "PARTICLE", "CONNECTIVE"

  // Chinese explanation (default)
  explanation: string;
  // Multi-language explanations
  explanationEn?: string;
  explanationVi?: string;
  explanationMn?: string;

  construction?: Record<string, string>; // Legacy field
  conjugationRules?: unknown; // New: flexible rules object

  // Examples with multi-language support
  examples: {
    kr: string;
    cn: string;
    en?: string;
    vi?: string;
    mn?: string;
    audio?: string;
  }[];

  displayOrder?: number;
  customNote?: string;
  // User progress
  status?: 'NEW' | 'LEARNING' | 'MASTERED';
  proficiency?: number; // 0-100
  lastReviewed?: string | null;
}

export interface UnitGrammarData {
  unitId: number;
  unitTitle: string;
  grammarPoints: GrammarPointData[];
}

export interface DictionaryEntry {
  id?: string;
  word?: string;
  korean: string;
  english?: string;
  type?: string;
  pos?: string;
  definitions?: string[];
  examples?: { sentence: string; translation: string }[];
}
