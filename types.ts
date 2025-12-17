export enum UserTier {
  FREE = 'FREE',
  PAID = 'PAID',
}

export enum SubscriptionType {
  ANNUAL = 'ANNUAL',
  LIFETIME = 'LIFETIME',
}

export type UserRole = 'STUDENT' | 'ADMIN';

export type Language = 'en' | 'zh' | 'vi' | 'mn';

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
  userAnswers: Record<number, number>; // questionId -> optionIndex
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string; // URL to avatar image
  tier: UserTier;
  role: UserRole;
  joinDate: number;
  createdAt?: number; // Alias for joinDate
  lastActive: number;
  savedWords: VocabularyItem[]; // Changed to reuse VocabularyItem for simplicity
  mistakes: VocabularyItem[]; // New: For tracking mistakes
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
  // Subscription details
  subscriptionType?: SubscriptionType; // ANNUAL or LIFETIME for PAID users
  subscriptionExpiry?: number; // Timestamp for annual subscriptions
}

export interface SavedWord {
  word: string;
  meaning: string;
  dateAdded: number;
}

export interface LevelConfig {
  level: number;
  units: number;  // Number of units in this level
}

export interface Institute {
  id: string;
  name: string; // e.g., Yonsei, Sogang, Ewha
  levels: LevelConfig[] | number[]; // Support both old format and new format
  coverUrl?: string; // Cover image URL for all books in this series
  themeColor?: string; // Theme color for book styling (hex color)
  publisher?: string; // University/Publisher name for filtering (e.g., "延世大学")
  displayLevel?: string; // Display level like "一级", "1급", "Level 1"
  volume?: string; // Volume like "上册", "下册", "A", "B"
}

export enum LearningModuleType {
  VOCABULARY = 'VOCABULARY',
  LISTENING = 'LISTENING',
  READING = 'READING',
  GRAMMAR = 'GRAMMAR',
}

export interface VocabularyItem {
  korean: string;
  english: string;
  pos?: string; // Part of Speech (e.g. Noun, Verb, etc.)
  exampleSentence: string;
  exampleTranslation: string;
  unit?: number; // Optional reference
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
  usages: { situation: string; example: string; translation: string }[];
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
  visualData?: any; // For tables/charts (Deprecated for Q5-10, used for data structure if needed)
  question: string; // The actual question prompt
  options: string[]; // Array of 4 options
  optionImages?: string[]; // New: Array of 4 image URLs/Base64 for IMAGE_CHOICE questions (Listening Q1-3)
  correctAnswer: number; // 0-3 index
  score: number;
  explanation?: string; // Explanation for the correct answer
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
  contentKr: string;           // Korean original text
  translations: Partial<Record<TranslationLanguage, string>>;
  createdAt: number;
}

// V2: Listening Track (multiple per unit)
export interface ListeningTrackV2 {
  id: string;
  title: string;
  audioUrl: string | null;
  audioFileName?: string;      // Original file name for display
  scriptKr: string;            // Korean script
  translations: Partial<Record<TranslationLanguage, string>>;
  createdAt: number;
}

// V2: Enhanced Vocabulary with multi-language
export interface VocabularyItemV2 {
  id: string;
  korean: string;
  pos?: string;                // Part of Speech
  translations: Partial<Record<TranslationLanguage, string>>;
  example?: string;            // Example sentence in Korean
  exampleTranslations?: Partial<Record<TranslationLanguage, string>>;
}

// V2: Grammar Point
export interface GrammarPointV2 {
  id: string;
  pattern: string;             // e.g., "-아/어서"
  meaning: string;             // Brief meaning
  conjugation: string;         // How to conjugate
  explanation: string;         // Detailed explanation
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
export const isTextbookContentV2 = (content: any): content is TextbookContentV2 => {
  return content && content.version === 2;
};

