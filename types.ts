export enum UserTier {
  FREE = 'FREE',
  PAID = 'PAID',
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
  color: 'yellow' | 'green' | 'blue' | 'pink' | null;
  note: string;
  timestamp: number;
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
  lastActive: number;
  savedWords: VocabularyItem[]; // Changed to reuse VocabularyItem for simplicity
  mistakes: VocabularyItem[]; // New: For tracking mistakes
  annotations: Annotation[];
  statistics?: UserStatistics;
  examHistory: ExamAttempt[]; // New: Track exam results
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

export interface Institute {
  id: string;
  name: string; // e.g., Yonsei, Sogang, Ewha
  levels: number[]; // 1 to 6
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
  premiumUsers: number;
  totalRevenue: number;
  contentCoverage: number; // percentage of units with content
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
  layout?: QuestionLayout;
  imageUrl?: string; // New: URL/Base64 of the uploaded crop from PDF
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
}

export interface TopikExam {
  id: string;
  title: string; // e.g. "64th TOPIK II Reading"
  round: number; // e.g. 64
  type: TopikType;
  paperType?: 'A' | 'B'; // A or B type paper
  timeLimit: number; // in minutes (60 or 70)
  audioUrl?: string; // New: For Listening exams
  questions: TopikQuestion[];
  isPaid?: boolean; // Whether this exam requires paid subscription
}
