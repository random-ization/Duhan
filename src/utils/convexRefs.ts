import type { PaginationOptions, PaginationResult } from 'convex/server';
import type { Doc, Id } from '../../convex/_generated/dataModel';

// Import types only to avoid runtime cycles
import type { GrammarStatsDto, GrammarItemDto, UnitGrammarDto } from '../../convex/grammars';
import type { InstituteClientDto } from '../../convex/institutes';
import type { SearchResult } from '../../convex/dictionary';
import type { ViewerAccessSnapshot } from './entitlements';
import type {
  GlobalUserSettings,
  GlobalUserSettingsUpdate,
  StoredGlobalUserSettings,
} from '../types/globalUserSettings';
import type { LearnerStatsDto, CourseDashboardDto } from '../../convex/learningStats';
import type { CommunityUserProfileDto } from '../../convex/userProfile';
import type { DailyTaskPlanDto } from '../../convex/dailyTask/shared';
import type {
  ImportedContentListItem,
  ImportedContentSentenceRecord,
  ImportedContentStudyState,
  ImportedContentWithSentences,
} from '../../convex/importedContent';
import type { ImportedContentUrlImportResult } from '../../convex/contentImport/shared';
import type { DiagnosisQuestionDto } from '../../convex/onboarding/shared';
import type {
  OnboardingStateDto,
  SubmitDiagnosisResult,
  SubmitGoalsResult,
} from '../../convex/onboarding';
import type {
  SentenceExplanationPayload,
  SentenceGrammarItem,
  SentenceVocabularyItem,
} from '../../convex/sentenceExplainer/shared';
import type {
  SentenceQualityQueueItem,
  SentenceQualityBulkReviewResult,
  SentenceQualityCorrectionInput,
  SentenceQualityQueueReasonFilter,
  SentenceQualityReviewStats,
  SentenceQualityReviewResult,
} from '../../convex/sentenceExplainer/quality';
import type {
  TopikHotTopic,
  TopikImprovementPlanRecord,
  TopikImprovementPlanResult,
  TopikMistakeBookResult,
  TopikPredictionResult,
  TopikScorePredictionRecord,
  TopikWritingProgressResult,
} from '../../convex/topikCoach/writing';
import type { TopikCoachWeakPoint } from '../../convex/topikCoach/weakPoints';
import type { WeeklyFocusApplyResult, WeeklyReportData } from '../../convex/weeklyReport';
import type { DueReviewItem } from '../../convex/fsrsReview';

export type NoArgs = Record<string, never>;

import { qRef, mRef, aRef } from './convexRefs/base';
export { qRef, mRef, aRef };

/**
 * COMMON REFS
 */
export const INSTITUTES = {
  getAll: qRef<NoArgs, InstituteClientDto[]>('institutes:getAll'),
  get: qRef<{ id: string }, InstituteClientDto | null>('institutes:get'),
};

export const STORAGE = {
  getUploadUrl: aRef<
    { filename: string; contentType: string; fileSize: number; folder?: string },
    {
      uploadUrl: string;
      publicUrl: string;
      key: string;
      method?: 'PUT';
      headers: Record<string, string>;
    }
  >('storage:getUploadUrl'),
};

export const USER_SETTINGS = {
  getSettings: qRef<NoArgs, GlobalUserSettings>('userSettings:getSettings'),
  getStoredSettings: qRef<NoArgs, StoredGlobalUserSettings | null>(
    'userSettings:getStoredSettings'
  ),
  updateSettings: mRef<GlobalUserSettingsUpdate, Id<'user_settings'> | null>(
    'userSettings:updateSettings'
  ),
};

export const DICTIONARY = {
  searchDictionary: aRef<
    {
      query: string;
      translationLang?: string;
      start?: number;
      num?: number;
      part?: string;
      sort?: string;
    },
    SearchResult
  >('dictionary:searchDictionary'),
};

export const AI = {
  grammarTutorChat: aRef<
    {
      grammarTitle: string;
      grammarSummary?: string;
      grammarExplanation?: string;
      language?: string;
      messages: Array<{ role: 'assistant' | 'user'; content: string }>;
    },
    { success?: boolean; reply?: string; error?: string } | null
  >('ai:grammarTutorChat'),
  analyzeReadingArticle: aRef<
    {
      title: string;
      summary?: string;
      bodyText: string;
      language?: string;
    },
    {
      summary: string;
      vocabulary: Array<{ term: string; meaning: string; level: string }>;
      grammar: Array<{ pattern: string; explanation: string; example: string }>;
    } | null
  >('ai:analyzeReadingArticle'),
  explainWordFallback: aRef<
    {
      word: string;
      context?: string;
      language?: string;
    },
    {
      word: string;
      pos: string;
      meaning: string;
      example: string;
      note: string;
    } | null
  >('ai:explainWordFallback'),
  translateReadingParagraphs: aRef<
    {
      title: string;
      paragraphs: string[];
      language?: string;
    },
    {
      translations: string[];
      errorCode?: string;
    } | null
  >('ai:translateReadingParagraphs'),
  adminClassifyTopikBySemantics: aRef<
    {
      items: Array<{
        key: string;
        language: 'zh' | 'en';
        title: string;
        summary?: string;
        explanation?: string;
      }>;
    },
    {
      success: boolean;
      error?: string;
      results: Array<{
        key: string;
        categoryId: number;
        confidence: number;
        status: 'AUTO_OK' | 'NEEDS_REVIEW';
        reason?: string;
        evidence?: string;
        channels?: {
          embeddingCategoryId: number;
          embeddingScore: number;
          llmCategoryId: number;
          llmConfidence: number;
        };
      }>;
    } | null
  >('ai:adminClassifyTopikBySemantics'),
};

export const DAILY_TASK = {
  getTodayPlan: qRef<{ language?: string }, DailyTaskPlanDto>('dailyTask:getTodayPlan'),
  generateTodayPlan: mRef<{ language?: string }, DailyTaskPlanDto>('dailyTask:generateTodayPlan'),
  updateTaskCompletion: mRef<
    { taskId: string; completed: boolean; currentCount?: number },
    DailyTaskPlanDto
  >('dailyTask:updateTaskCompletion'),
  scheduleTopikRewriteTask: mRef<
    {
      taskType: string;
      promptPreview: string;
      latestAttemptId: Id<'topik_writing_attempts'>;
      revisionFocus?: string[];
    },
    DailyTaskPlanDto
  >('dailyTask:scheduleTopikRewriteTask'),
};

export const IMPORTED_CONTENT = {
  importTextContent: mRef<{ title: string; rawText: string }, Id<'imported_contents'>>(
    'importedContent:importTextContent'
  ),
  updateContentTags: mRef<{ contentId: Id<'imported_contents'>; tags: string[] }, string[]>(
    'importedContent:updateContentTags'
  ),
  updateContentFolder: mRef<
    { contentId: Id<'imported_contents'>; folderName: string },
    string | undefined
  >('importedContent:updateContentFolder'),
  importFromUrl: aRef<
    {
      url: string;
      customTitle?: string;
    },
    ImportedContentUrlImportResult
  >('contentImport:importFromUrl'),
  listImportedContents: qRef<{ limit?: number }, ImportedContentListItem[]>(
    'importedContent:listImportedContents'
  ),
  listStudyStates: qRef<{ limit?: number }, ImportedContentStudyState[]>(
    'importedContent:listStudyStates'
  ),
  getImportedContentWithSentences: qRef<
    { contentId: Id<'imported_contents'> },
    ImportedContentWithSentences | null
  >('importedContent:getImportedContentWithSentences'),
  getImportedSentence: qRef<
    { sentenceId: Id<'content_sentences'> },
    ImportedContentSentenceRecord | null
  >('importedContent:getImportedSentence'),
};

export const WEEKLY_REPORT = {
  getWeeklyReport: qRef<{ weekOffset?: number }, WeeklyReportData | null>(
    'weeklyReport:getWeeklyReport'
  ),
  applyWeeklyFocusToTodayPlan: mRef<
    { weekOffset?: number; language?: string },
    WeeklyFocusApplyResult
  >('weeklyReport:applyWeeklyFocusToTodayPlan'),
};

export const ONBOARDING = {
  getState: qRef<NoArgs, OnboardingStateDto>('onboarding:getState'),
  getDiagnosisQuestions: qRef<{ language?: string }, DiagnosisQuestionDto[]>(
    'onboarding:getDiagnosisQuestions'
  ),
  submitGoals: mRef<
    {
      preferredLanguage?: string;
      currentLevel?: string;
      targetLevel?: string;
      targetExam?: string;
      dailyMinutes?: number;
      studyFocus?: string[];
    },
    SubmitGoalsResult
  >('onboarding:submitGoals'),
  submitDiagnosisResult: mRef<
    {
      language?: string;
      answers: Array<{ questionId: string; optionId: string }>;
    },
    SubmitDiagnosisResult
  >('onboarding:submitDiagnosisResult'),
};

export type SentenceExplanationResult = {
  success: boolean;
  source?: string;
  sourceRefId?: string;
  explanationId?: Id<'sentence_explanations'>;
  cacheHit?: boolean;
  data?: SentenceExplanationPayload;
  error?: string;
};

export type SentenceSaveAssetsResult = {
  success: boolean;
  source?: string;
  sourceRefId?: string;
  quality?: {
    confidence?: number;
    promptVersion?: string;
    provider?: string;
    reviewStatus?: string;
    source?: string;
    sourceRefId?: string;
  };
  savedSentenceId?: Id<'user_saved_sentences'>;
  notePageId?: Id<'note_pages'>;
  savedWordCount?: number;
  savedGrammarCount?: number;
  recentWords?: Array<{
    id: Id<'words'>;
    word: string;
    meaning: string;
    reviewStatus?: string;
    qualityReviewStatus?: string;
    confidence?: number;
    promptVersion?: string;
    provider?: string;
    source?: string;
    sourceRefId?: string;
  }>;
};

export type SentenceRemoveVocabularyAssetResult = {
  success: true;
  removed: boolean;
};

export type SentenceSavedState = {
  hasSavedSentence: boolean;
  savedGrammarCount: number;
  savedWordCount: number;
  notePageId: Id<'note_pages'> | null;
};
export const SENTENCE_EXPLAINER = {
  explainSentence: aRef<
    {
      sentence: string;
      sentenceId?: Id<'content_sentences'>;
      targetLanguage?: string;
      source?: string;
      sourceRefId?: string;
      forceRefresh?: boolean;
    },
    SentenceExplanationResult
  >('sentenceExplainer/explain:explainSentence'),
  saveAssets: mRef<
    {
      explanationId: Id<'sentence_explanations'>;
      saveSentence?: boolean;
      selectedWords?: SentenceVocabularyItem[];
      selectedGrammar?: SentenceGrammarItem[];
      createNotePage?: boolean;
      enqueueForReview?: boolean;
      noteTitle?: string;
      source?: string;
      sourceRefId?: string;
    },
    SentenceSaveAssetsResult
  >('sentenceExplainer/save:saveAssets'),
  removeSavedVocabularyAsset: mRef<
    {
      wordId: Id<'words'>;
      source?: string;
      sourceRefId?: string;
    },
    SentenceRemoveVocabularyAssetResult
  >('sentenceExplainer/save:removeSavedVocabularyAsset'),
  getLatest: qRef<
    {
      sentenceId?: Id<'content_sentences'>;
      textHash?: string;
      targetLanguage?: string;
    },
    Doc<'sentence_explanations'> | null
  >('sentenceExplainer/query:getLatest'),
  getSavedState: qRef<
    {
      explanationId: Id<'sentence_explanations'>;
    },
    SentenceSavedState
  >('sentenceExplainer/query:getSavedState'),
  getQualityReviewQueue: qRef<
    { limit?: number; maxConfidence?: number; reason?: SentenceQualityQueueReasonFilter },
    SentenceQualityQueueItem[]
  >('sentenceExplainer/quality:getQualityReviewQueue'),
  getQualityReviewStats: qRef<
    { limit?: number; maxConfidence?: number },
    SentenceQualityReviewStats | null
  >('sentenceExplainer/quality:getQualityReviewStats'),
  reviewQualityItem: mRef<
    {
      explanationId: Id<'sentence_explanations'>;
      decision: 'human_reviewed' | 'rejected';
      corrections?: SentenceQualityCorrectionInput;
      reviewNote?: string;
    },
    SentenceQualityReviewResult
  >('sentenceExplainer/quality:reviewQualityItem'),
  bulkReviewQualityItems: mRef<
    {
      explanationIds: Id<'sentence_explanations'>[];
      decision: 'human_reviewed' | 'rejected';
      reviewNote?: string;
    },
    SentenceQualityBulkReviewResult
  >('sentenceExplainer/quality:bulkReviewQualityItems'),
};

export const UNITS = {
  bulkImport: mRef<
    {
      courseId: string;
      items: Array<{
        unitIndex: number;
        articleIndex: number;
        title: string;
        readingText: string;
        translation?: string;
        translationEn?: string;
        translationVi?: string;
        translationMn?: string;
        audioUrl?: string;
      }>;
    },
    {
      success: boolean;
      results: {
        success: number;
        failed: number;
        created: number;
        updated: number;
        errors: string[];
      };
    }
  >('units:bulkImport'),
};

/**
 * GRAMMAR REFS
 */
export const GRAMMARS = {
  getStats: qRef<{ courseId: string; language?: string }, GrammarStatsDto>('grammars:getStats'),
  getByCourse: qRef<{ courseId: string; language?: string }, GrammarItemDto[]>(
    'grammars:getByCourse'
  ),
  getUnitGrammar: qRef<{ courseId: string; unitId: number; language?: string }, UnitGrammarDto[]>(
    'grammars:getUnitGrammar'
  ),
  search: qRef<{ query: string }, GrammarItemDto[]>('grammars:search'),
  create: mRef<
    { title: string; summary: string; explanation: string; type: string; level: string },
    { id: string }
  >('grammars:create'),
  getAdminById: qRef<
    { grammarId: string },
    { id: string; title: string; searchPatterns: string[] } | null
  >('grammars:getAdminById'),
  updateSearchPatterns: mRef<{ grammarId: string; searchPatterns: string[] }, void>(
    'grammars:updateSearchPatterns'
  ),
  assignToUnit: mRef<{ courseId: string; unitId: number; grammarId: string }, unknown>(
    'grammars:assignToUnit'
  ),
  removeFromUnit: mRef<{ courseId: string; unitId: number; grammarId: string }, void>(
    'grammars:removeFromUnit'
  ),
  updateStatus: mRef<
    { grammarId: string; status: string },
    { status: string; proficiency: number }
  >('grammars:updateStatus'),
  bulkImport: mRef<
    {
      items: Array<{
        title: string;
        summary?: string;
        explanation?: string;
        type?: string;
        level?: string;
        unitId?: number;
      }>;
      courseId?: string;
    },
    {
      success: boolean;
      results: { success: number; failed: number; newGrammars: number; errors: string[] };
    }
  >('grammars:bulkImport'),
  adminPreserveTopikViMnSnapshot: mRef<
    { courseId: string },
    { success: boolean; courseId: string; count: number; snapshot: unknown[] }
  >('grammars:adminPreserveTopikViMnSnapshot'),
  adminResetTopikCourseLinks: mRef<
    { courseId: string; deleteOrphanGrammars?: boolean },
    { success: boolean; courseId: string; deletedLinks: number; deletedOrphans: number }
  >('grammars:adminResetTopikCourseLinks'),
  adminImportTopikMarkdownByLanguage: mRef<
    {
      courseId: string;
      language: 'zh' | 'en' | 'vi' | 'mn';
      items: Array<{
        title: string;
        titleEn?: string;
        titleZh?: string;
        summary?: string;
        summaryEn?: string;
        explanation?: string;
        explanationEn?: string;
        grammarKey?: string;
        sourcePath?: string;
        checksum?: string;
        categoryId?: number;
        categoryConfidence?: number;
        categoryStatus?: 'AUTO_OK' | 'NEEDS_REVIEW';
        categoryReason?: string;
        categoryEvidence?: string;
      }>;
      defaultCategoryId?: number;
    },
    {
      success: boolean;
      courseId: string;
      language: string;
      created: number;
      linked: number;
      errors: string[];
    }
  >('grammars:adminImportTopikMarkdownByLanguage'),
  adminApplyTopikReviewDecisions: mRef<
    {
      decisions: Array<{
        linkId: string;
        categoryId: number;
        confidence?: number;
        status?: 'AUTO_OK' | 'NEEDS_REVIEW';
        reason?: string;
        evidence?: string;
      }>;
    },
    { success: boolean; updated: number; errors: string[] }
  >('grammars:adminApplyTopikReviewDecisions'),
  saveToReview: mRef<
    { grammarId: string; source?: string; sourceRefId?: string },
    { success: boolean; savedId?: string; action?: 'saved' | 'already_saved'; reason?: string }
  >('grammars:saveGrammarToReview'),
};

/**
 * VOCAB REFS
 */
import {
  VocabStatsDto,
  VocabWordDto,
  VocabReviewDeckDto,
  DailyPhraseDto,
  VocabBookItemDto,
  VocabBookPageDto,
  VocabReviewSummaryDto,
  VocabDashboardInsightsDto,
  UnitProgressDto,
} from '../../convex/vocab';

export const VOCAB = {
  getStats: qRef<{ courseId: string }, VocabStatsDto>('vocab:getStats'),
  getOfCourse: qRef<{ courseId: string; unitId?: number; limit?: number }, VocabWordDto[]>(
    'vocab:getOfCourse'
  ),
  getReviewDeck: qRef<
    { courseId: string; unitId?: number | string; limit?: number },
    VocabReviewDeckDto[]
  >('vocab:getReviewDeck'),
  getDailyPhrase: qRef<{ language?: string }, DailyPhraseDto | null>('vocab:getDailyPhrase'),
  getVocabBook: qRef<
    { search?: string; includeMastered?: boolean; limit?: number; savedByUserOnly?: boolean },
    VocabBookItemDto[]
  >('vocab:getVocabBook'),
  getVocabBookPage: qRef<
    {
      search?: string;
      includeMastered?: boolean;
      limit?: number;
      savedByUserOnly?: boolean;
      selectedWordIds?: string[];
      category?: 'ALL' | 'UNLEARNED' | 'DUE' | 'MASTERED';
      cursor?: string;
      courseId?: string;
      unit?: number;
    },
    VocabBookPageDto
  >('vocab:getVocabBookPage'),
  getReviewSummary: qRef<{ courseId?: string; savedByUserOnly?: boolean }, VocabReviewSummaryDto>(
    'vocab:getReviewSummary'
  ),
  getDashboardInsights: qRef<NoArgs, VocabDashboardInsightsDto>('vocab:getDashboardInsights'),
  getActiveLearningSession: qRef<
    { instituteId: string; unitId: number; mode: 'FLASHCARD' | 'LEARN' | 'TEST' },
    {
      id: string;
      instituteId: string;
      unitId: number;
      mode: 'FLASHCARD' | 'LEARN' | 'TEST';
      status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
      snapshot?: unknown;
      startedAt: number;
      updatedAt: number;
      completedAt?: number;
    } | null
  >('vocab:getActiveLearningSession'),
  getUnitProgress: qRef<{ courseId: string }, UnitProgressDto[]>('vocab:getUnitProgress'),
  // Mutations
  updateProgress: mRef<
    { wordId: string; quality: number },
    { success: boolean; progress: LegacySrsProgressDto }
  >('vocab:updateProgress'),
  updateProgressV2: mRef<
    {
      wordId: Id<'words'>;
      rating: number;
      fsrsState: FSRSCardState;
    },
    { success: boolean; progress?: FSRSProgressDto }
  >('vocab:updateProgressV2'),
  updateProgressBatch: mRef<
    {
      items: Array<{
        wordId: Id<'words'>;
        rating: number;
        fsrsState: FSRSCardState;
        reviewDurationMs?: number;
        reviewedAt?: number;
      }>;
    },
    { success: boolean; processed: number; updated: number; inserted: number }
  >('vocab:updateProgressBatch'),
  upsertLearningSession: mRef<
    {
      instituteId: string;
      unitId: number;
      mode: 'FLASHCARD' | 'LEARN' | 'TEST';
      snapshot: unknown;
    },
    { success: boolean; sessionId: string; action: 'created' | 'updated' }
  >('vocab:upsertLearningSession'),
  completeLearningSession: mRef<{ sessionId: string }, { success: boolean; reason?: 'not_found' }>(
    'vocab:completeLearningSession'
  ),
  abandonLearningSession: mRef<{ sessionId: string }, { success: boolean; reason?: 'not_found' }>(
    'vocab:abandonLearningSession'
  ),
  getAllPaginated: qRef<
    { paginationOpts: PaginationOptions; courseId?: string },
    PaginationResult<unknown>
  >('vocab:getAllPaginated'),
  bulkImport: mRef<
    { items: unknown[] },
    {
      success: boolean;
      results: {
        success: number;
        failed: number;
        smartFilled: number;
        newWords: number;
        errors: string[];
      };
    }
  >('vocab:bulkImport'),
  updateVocab: mRef<
    {
      wordId: Id<'words'>;
      appearanceId?: Id<'vocabulary_appearances'>;
      word?: string;
      meaning?: string;
      meaningEn?: string;
      meaningVi?: string;
      meaningMn?: string;
      partOfSpeech?: string;
      unitId?: number;
      exampleSentence?: string;
      exampleMeaning?: string;
      exampleMeaningEn?: string;
      exampleMeaningVi?: string;
      exampleMeaningMn?: string;
    },
    { success: boolean; wordId: Id<'words'>; action?: string }
  >('vocab:updateVocab'),
  saveWord: mRef<
    {
      word: string;
      meaning: string;
      partOfSpeech: string;
      hanja?: string;
      pronunciation?: string;
      courseId: string;
      unitId: number;
      exampleSentence?: string;
      exampleMeaning?: string;
    },
    void
  >('vocab:saveWord'),
  // SRS Review
  getDueForReview: qRef<NoArgs, import('../../convex/vocab').VocabReviewItemDto[]>(
    'vocab:getDueForReview'
  ),
  addToReview: mRef<
    {
      word: string;
      meaning: string;
      partOfSpeech?: string;
      context?: string;
      source?: string;
      sourceRefId?: string;
    },
    void
  >('vocab:addToReview'),
  setMastery: mRef<
    { wordId: Id<'words'>; mastered: boolean },
    { success: boolean; action: string }
  >('vocab:setMastery'),
  setMasteryBulk: mRef<
    { wordIds: Id<'words'>[]; mastered: boolean },
    { success: boolean; updated: number }
  >('vocab:setMasteryBulk'),
  removeFromVocabBookBulk: mRef<{ wordIds: Id<'words'>[] }, { success: boolean; removed: number }>(
    'vocab:removeFromVocabBookBulk'
  ),
  getForecast: qRef<NoArgs, number[]>('vocab:getForecast'),
};

export const ENTITLEMENTS = {
  viewerAccess: qRef<NoArgs, ViewerAccessSnapshot>('entitlements:viewerAccess'),
  consumeVocabTestAttempt: mRef<
    NoArgs,
    { allowed: boolean; remaining: number | null; consumed: boolean }
  >('entitlements:consumeVocabTestAttempt'),
  consumeMediaPlay: mRef<
    { resourceKey: string },
    {
      allowed: boolean;
      remaining: number | null;
      consumed: boolean;
      speedAllowed: boolean;
    }
  >('entitlements:consumeMediaPlay'),
  assertHistoryAnalytics: qRef<NoArgs, { allowed: boolean; plan: ViewerAccessSnapshot['plan'] }>(
    'entitlements:assertHistoryAnalytics'
  ),
};

export const VOCAB_PDF = {
  exportVocabBookPdf: aRef<
    {
      origin: string;
      language: string;
      mode: 'A4_DICTATION' | 'LANG_LIST' | 'KO_LIST';
      shuffle: boolean;
      category: 'UNLEARNED' | 'DUE' | 'MASTERED';
      q?: string;
      selectedWordIds?: string[];
    },
    { url: string }
  >('vocabPdf:exportVocabBookPdf'),
};

/**
 * FSRS REFS
 */
export type FSRSCardState = {
  state: number;
  due: number;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  last_review: number | null;
};

export type FSRSReviewLog = {
  rating: number;
  state: number;
  due: number;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  review: number;
};

export type FSRSNextScheduleResult = FSRSCardState & {
  review_log: FSRSReviewLog;
};

export type FSRSProgressDto = FSRSCardState & {
  id: string;
  status: string;
  interval: number;
  streak: number;
  nextReviewAt: number;
  lastReviewedAt: number;
};

export type LegacySrsProgressDto = {
  id: Id<'user_vocab_progress'>;
  status: string;
  interval: number;
  streak: number;
  lastReviewedAt: number;
  nextReviewAt: number;
};

export const FSRS = {
  calculateNextSchedule: aRef<
    {
      currentCard?: Omit<FSRSCardState, 'last_review'> & { last_review?: number };
      rating: number;
      now?: number;
    },
    FSRSNextScheduleResult
  >('fsrs:calculateNextSchedule'),
};

/**
 * TOPIK REFS
 */
import { TopikQuestionDto, TopikExamDto } from '../../convex/topik';

export type TopikSaveQuestionInput = {
  id: number;
  number?: number;
  passage?: string;
  question: string;
  contextBox?: string;
  options: string[];
  correctAnswer: number;
  image?: string;
  optionImages?: string[];
  explanation?: string;
  score: number;
  instruction?: string;
  layout?: string;
  groupCount?: number;
};

export type TopikSaveExamArgs = {
  id: string;
  title: string;
  round: number;
  level?: 1 | 2;
  type: string;
  paperType?: string;
  timeLimit: number;
  audioUrl?: string;
  description?: string;
  isPaid?: boolean;
  accessLevel?: 'FREE_SAMPLE' | 'PRO';
  scheduledAt?: number;
  questions: TopikSaveQuestionInput[];
};

export const TOPIK = {
  getExams: qRef<
    {
      paginationOpts?: PaginationOptions;
      type?: 'READING' | 'LISTENING' | 'WRITING';
      limit?: number;
    },
    PaginationResult<TopikExamDto> | TopikExamDto[]
  >('topik:getExams'),
  getExamsPaginated: qRef<
    {
      paginationOpts: PaginationOptions;
      type?: 'READING' | 'LISTENING' | 'WRITING';
      limit?: number;
    },
    PaginationResult<TopikExamDto>
  >('topik:getExams'),
  getUpcoming: qRef<NoArgs, TopikExamDto | null>('topik:getUpcoming'),
  getLobbyStats: qRef<
    NoArgs,
    {
      upcomingExam: { round: number; date?: number; title: string } | null;
      weakAreas: Array<{ type: string; score: number; label: string; subLabel: string }>;
    }
  >('topik:getLobbyStats'),
  getExamById: qRef<{ examId: string }, TopikExamDto | null>('topik:getExamById'),
  getExamQuestions: qRef<{ examId: string }, TopikQuestionDto[]>('topik:getExamQuestions'),
  // Mutations
  saveExam: mRef<TopikSaveExamArgs, { success: boolean; examId: string }>('topik:saveExam'),
  submitExam: mRef<
    { sessionId: string; answers: Record<number, number> },
    { success: boolean; score: number }
  >('topik:submitExam'),
  deleteExam: mRef<{ examId: string }, unknown>('topik:deleteExam'),
};

export const READING_BOOKS = {
  listPublishedBooks: qRef<
    NoArgs,
    Array<{
      _id: string;
      slug: string;
      title: string;
      pageTitle?: string;
      levelLabel?: string;
      coverImageUrl?: string;
      pageCount: number;
      readingMinutes?: number;
      sourceBookId: number;
    }>
  >('readingBooks:listPublishedBooks'),
  getBookBySlug: qRef<
    { slug: string },
    {
      _id: string;
      slug: string;
      title: string;
      pageTitle?: string;
      levelLabel?: string;
      coverImageUrl?: string;
      pageCount: number;
      readingMinutes?: number;
      sourcePage: string;
      sourceBookId: number;
    } | null
  >('readingBooks:getBookBySlug'),
  getBookPageData: qRef<
    { slug: string; pageIndex?: number },
    {
      book: {
        _id: string;
        slug: string;
        title: string;
        pageTitle?: string;
        levelLabel?: string;
        coverImageUrl?: string;
        pageCount: number;
        readingMinutes?: number;
      };
      page: {
        _id: string;
        pageIndex: number;
        imageUrl: string;
        layoutClass?: string;
        sentenceCount: number;
        sentences: Array<{
          _id: string;
          sentenceIndex: number;
          spanId?: string;
          text: string;
          audioUrl?: string;
          clipBeginMs?: number;
          clipEndMs?: number;
          durationMs?: number;
        }>;
      } | null;
      pageCount: number;
      pageIndex: number;
      hasPreviousPage: boolean;
      hasNextPage: boolean;
    } | null
  >('readingBooks:getBookPageData'),
};

export const NEWS = {
  getById: qRef<
    { articleId: string },
    {
      _id: string;
      sourceKey: string;
      sourceType: string;
      sourceGuid?: string;
      sourceUrl: string;
      canonicalUrl: string;
      urlHash: string;
      title: string;
      summary?: string;
      bodyText: string;
      bodyHtml?: string;
      language: string;
      section?: string;
      tags?: string[];
      author?: string;
      publishedAt: number;
      fetchedAt: number;
      difficultyLevel: string;
      difficultyScore: number;
      difficultyReason: string[];
      dedupeClusterId: string;
      normalizedTitle?: string;
      simhash?: string;
      projectedAt?: number;
      projectedCourseId?: string;
      projectedUnitIndex?: number;
      projectedArticleIndex?: number;
      status: string;
      licenseTier: string;
    } | null
  >('newsIngestion:getById'),
  listRecent: qRef<
    { difficultyLevel?: string; sourceKey?: string; limit?: number },
    Array<{
      _id: string;
      sourceKey: string;
      sourceType: string;
      sourceGuid?: string;
      sourceUrl: string;
      canonicalUrl: string;
      urlHash: string;
      title: string;
      summary?: string;
      bodyText: string;
      bodyHtml?: string;
      language: string;
      section?: string;
      tags?: string[];
      author?: string;
      publishedAt: number;
      fetchedAt: number;
      difficultyLevel: string;
      difficultyScore: number;
      difficultyReason: string[];
      dedupeClusterId: string;
      normalizedTitle?: string;
      simhash?: string;
      projectedAt?: number;
      projectedCourseId?: string;
      projectedUnitIndex?: number;
      projectedArticleIndex?: number;
      status: string;
      licenseTier: string;
    }>
  >('newsIngestion:listRecent'),
  getUserFeed: qRef<
    { newsLimit?: number; articleLimit?: number },
    {
      news: Array<{
        _id: string;
        sourceKey: string;
        sourceType: string;
        sourceGuid?: string;
        sourceUrl: string;
        canonicalUrl: string;
        urlHash: string;
        title: string;
        summary?: string;
        bodyText: string;
        bodyHtml?: string;
        language: string;
        section?: string;
        tags?: string[];
        author?: string;
        publishedAt: number;
        fetchedAt: number;
        difficultyLevel: string;
        difficultyScore: number;
        difficultyReason: string[];
        dedupeClusterId: string;
        normalizedTitle?: string;
        simhash?: string;
        projectedAt?: number;
        projectedCourseId?: string;
        projectedUnitIndex?: number;
        projectedArticleIndex?: number;
        status: string;
        licenseTier: string;
      }>;
      articles: Array<{
        _id: string;
        sourceKey: string;
        sourceType: string;
        sourceGuid?: string;
        sourceUrl: string;
        canonicalUrl: string;
        urlHash: string;
        title: string;
        summary?: string;
        bodyText: string;
        bodyHtml?: string;
        language: string;
        section?: string;
        tags?: string[];
        author?: string;
        publishedAt: number;
        fetchedAt: number;
        difficultyLevel: string;
        difficultyScore: number;
        difficultyReason: string[];
        dedupeClusterId: string;
        normalizedTitle?: string;
        simhash?: string;
        projectedAt?: number;
        projectedCourseId?: string;
        projectedUnitIndex?: number;
        projectedArticleIndex?: number;
        status: string;
        licenseTier: string;
      }>;
      refresh: {
        needsInitialization: boolean;
        hasReadSinceRefresh: boolean;
        autoRefreshEligible: boolean;
        nextAutoRefreshAt: number | null;
        manualRefreshLimit: number;
        manualRefreshUsed: number;
        manualRefreshRemaining: number;
        lastRefreshedAt: number | null;
        userScoped: boolean;
      };
    }
  >('newsIngestion:getUserFeed'),
  ensureUserFeed: mRef<
    { newsLimit?: number; articleLimit?: number },
    { created: boolean; hasReadSinceRefresh: boolean; manualRefreshRemaining: number }
  >('newsIngestion:ensureUserFeed'),
  refreshUserFeedIfEligible: mRef<
    { newsLimit?: number; articleLimit?: number },
    { refreshed: boolean; reason: 'OK' | 'NOT_ELIGIBLE'; nextAutoRefreshAt: number | null }
  >('newsIngestion:refreshUserFeedIfEligible'),
  manualRefreshUserFeed: mRef<
    { newsLimit?: number; articleLimit?: number },
    { refreshed: boolean; reason: 'OK' | 'DAILY_LIMIT'; manualRefreshRemaining: number }
  >('newsIngestion:manualRefreshUserFeed'),
  markArticleRead: mRef<{ articleId: string }, { marked: boolean }>(
    'newsIngestion:markArticleRead'
  ),
  listSources: qRef<
    NoArgs,
    Array<{
      key: string;
      name: string;
      type: 'rss' | 'api';
      endpoint: string;
      pollMinutes: number;
      enabled: boolean;
    }>
  >('newsAdmin:listSources'),
  triggerSource: mRef<{ sourceKey: string }, { scheduled: boolean; sourceKey: string }>(
    'newsAdmin:triggerSource'
  ),
  triggerAllSources: mRef<{ delayMs?: number }, { scheduled: number; delayMs: number }>(
    'newsAdmin:triggerAllSources'
  ),
  getSourceHealth: qRef<
    NoArgs,
    Array<{
      sourceKey: string;
      name: string;
      enabled: boolean;
      pollMinutes: number;
      degradeThreshold: number;
      totalRuns: number;
      totalFailures: number;
      consecutiveFailures: number;
      degraded: boolean;
      degradedSince?: number;
      lastRunAt?: number;
      lastStatus?: string;
      lastError?: string;
      lastSuccessAt?: number;
    }>
  >('newsAdmin:getSourceHealth'),
  triggerProjection: mRef<
    { courseId?: string; limit?: number },
    { scheduled: boolean; jobId: string; courseId: string; limit: number }
  >('newsProjection:triggerProjection'),
  getProjectionStats: qRef<
    { courseId?: string },
    { courseId: string; recentActiveCount: number; projectedCount: number; pendingCount: number }
  >('newsProjection:getProjectionStats'),
};

import type { CommunityActivityDto } from '../../convex/community';
import type {
  FriendSearchItemDto,
  FriendShareLinkDto,
  FriendSummaryDto,
  SendByCodeResult,
  FriendProfileDto,
  FriendRequestDto,
  SendRequestResult,
  RespondRequestResult,
} from '../../convex/friends';
import type {
  StudyGroupDto,
  StudyGroupDetailDto,
  StudyGroupInviteDto,
  GroupLeaderboardEntry,
  GroupActivityDto,
} from '../../convex/groups';
import type { LeagueMetaDto, LeagueEntryDto } from '../../convex/league';
export const COMMUNITY = {
  getViewer: qRef<NoArgs, { _id: Id<'users'>; name?: string; avatar: string | null } | null>(
    'community:getViewer'
  ),
  getCommunityFeed: qRef<{ limit?: number; filter?: string }, CommunityActivityDto[]>(
    'community:getCommunityFeed'
  ),
  getRecentFriendActivity: qRef<{ limit?: number }, CommunityActivityDto[]>(
    'community:getRecentFriendActivity'
  ),
  createPost: mRef<
    {
      content: string;
      type?: 'all' | 'following' | 'milestones' | 'qa' | 'resources';
      images?: string[];
      attachment?: { type: string; id: string; title: string; description?: string };
    },
    string
  >('community:createPost'),
  likeActivity: mRef<
    { activityId: string; kind: 'event' | 'post' },
    { liked: boolean; likeCount: number }
  >('community:likeActivity'),
  unlikeActivity: mRef<
    { activityId: string; kind: 'event' | 'post' },
    { liked: boolean; likeCount: number }
  >('community:unlikeActivity'),
  addComment: mRef<{ postId: Id<'community_posts'>; content: string }, Id<'community_comments'>>(
    'community:addComment'
  ),
  getComments: qRef<
    { postId: Id<'community_posts'> },
    Array<{
      _id: Id<'community_comments'>;
      postId: Id<'community_posts'>;
      userId: Id<'users'>;
      content: string;
      createdAt: number;
      userName: string;
      userAvatar: string | null;
    }>
  >('community:getComments'),
};

// --- Q&A Forum ---
import type { QAQuestionDto, QAQuestionDetailDto } from '../../convex/qaForum';

export const QA_FORUM = {
  listQuestions: qRef<
    { topicSlug?: string; sort?: 'recent' | 'unanswered' | 'top'; limit?: number },
    QAQuestionDto[]
  >('qaForum:listQuestions'),
  getQuestion: qRef<{ questionId: Id<'qa_questions'> }, QAQuestionDetailDto | null>(
    'qaForum:getQuestion'
  ),
  createQuestion: mRef<{ title: string; content: string; topicSlug: string }, Id<'qa_questions'>>(
    'qaForum:createQuestion'
  ),
  createAnswer: mRef<{ questionId: Id<'qa_questions'>; content: string }, Id<'qa_answers'>>(
    'qaForum:createAnswer'
  ),
  incrementViewCount: mRef<{ questionId: Id<'qa_questions'> }, void>('qaForum:incrementViewCount'),
  voteOnTarget: mRef<
    { target: 'question' | 'answer'; targetId: string; value: 1 | -1 },
    { ok: boolean }
  >('qaForum:voteOnTarget'),
  acceptAnswer: mRef<{ answerId: Id<'qa_answers'> }, { accepted: boolean }>('qaForum:acceptAnswer'),
  editQuestion: mRef<
    { questionId: Id<'qa_questions'>; title: string; content: string; topicSlug: string },
    { ok: true }
  >('qaForum:editQuestion'),
  editAnswer: mRef<{ answerId: Id<'qa_answers'>; content: string }, { ok: true }>(
    'qaForum:editAnswer'
  ),
  deleteQuestion: mRef<{ questionId: Id<'qa_questions'> }, { ok: true }>('qaForum:deleteQuestion'),
  deleteAnswer: mRef<{ answerId: Id<'qa_answers'> }, { ok: true }>('qaForum:deleteAnswer'),
  searchQuestions: qRef<
    { searchQuery: string; topicSlug?: string; limit?: number },
    QAQuestionDto[]
  >('qaForum:searchQuestions'),
  getMyVotes: qRef<{ targetIds: string[] }, Record<string, number>>('qaForum:getMyVotes'),
};

export const QA_TOPICS = {
  listTopics: qRef<
    Record<string, never>,
    Array<{
      _id: string;
      slug: string;
      nameKey: string;
      icon: string;
      order: number;
      isActive: boolean;
    }>
  >('qaTopics:listTopics'),
};

export const QA_REPORTS = {
  reportContent: mRef<
    {
      target: 'question' | 'answer' | 'post' | 'comment';
      targetId: string;
      reason: string;
      details?: string;
    },
    { ok: true }
  >('reports:reportContent'),
  listReports: qRef<
    { status?: 'open' | 'resolved' | 'dismissed'; limit?: number },
    Array<{
      _id: string;
      target: 'question' | 'answer' | 'post' | 'comment';
      targetId: string;
      reason: string;
      details?: string;
      status: 'open' | 'resolved' | 'dismissed';
      createdAt: number;
    }>
  >('reports:listReports'),
};

export const USER_PROFILE = {
  getUserProfile: qRef<{ userId: Id<'users'> }, CommunityUserProfileDto | null>(
    'userProfile:getUserProfile'
  ),
};

export const FRIENDS = {
  getMyShareLink: qRef<NoArgs, FriendShareLinkDto>('friends:getMyShareLink'),
  getMyFriendSummary: qRef<NoArgs, FriendSummaryDto>('friends:getMyFriendSummary'),
  searchUsers: qRef<{ query: string; limit?: number }, FriendSearchItemDto[]>(
    'friends:searchUsers'
  ),
  sendRequestByCode: mRef<{ code: string }, SendByCodeResult>('friends:sendRequestByCode'),
  regenerateMyFriendCode: mRef<NoArgs, FriendShareLinkDto>('friends:regenerateMyFriendCode'),
  listFriends: qRef<NoArgs, FriendProfileDto[]>('friends:listFriends'),
  listIncomingRequests: qRef<NoArgs, FriendRequestDto[]>('friends:listIncomingRequests'),
  listOutgoingRequests: qRef<NoArgs, FriendRequestDto[]>('friends:listOutgoingRequests'),
  sendRequest: mRef<{ targetUserId: Id<'users'> }, SendRequestResult>('friends:sendRequest'),
  respondRequest: mRef<
    { targetUserId: Id<'users'>; action: 'accept' | 'decline' },
    RespondRequestResult
  >('friends:respondRequest'),
  cancelRequest: mRef<{ targetUserId: Id<'users'> }, { ok: boolean }>('friends:cancelRequest'),
  removeFriend: mRef<{ targetUserId: Id<'users'> }, { ok: boolean }>('friends:removeFriend'),
};

export const GROUPS = {
  listMine: qRef<NoArgs, StudyGroupDto[]>('groups:listMine'),
  getDetail: qRef<{ groupId: Id<'study_groups'> }, StudyGroupDetailDto | null>('groups:getDetail'),
  listIncomingInvites: qRef<NoArgs, StudyGroupInviteDto[]>('groups:listIncomingInvites'),
  getWeeklyLeaderboard: qRef<{ groupId: Id<'study_groups'> }, GroupLeaderboardEntry[]>(
    'groups:getWeeklyLeaderboard'
  ),
  getRecentActivity: qRef<{ groupId: Id<'study_groups'>; limit?: number }, GroupActivityDto[]>(
    'groups:getRecentActivity'
  ),
  create: mRef<{ name: string; description?: string }, { groupId: Id<'study_groups'> }>(
    'groups:create'
  ),
  invite: mRef<
    { groupId: Id<'study_groups'>; targetUserId: Id<'users'> },
    {
      inviteId: Id<'study_group_invites'> | null;
      status: 'sent' | 'already_member' | 'already_invited';
    }
  >('groups:invite'),
  respondInvite: mRef<
    { inviteId: Id<'study_group_invites'>; action: 'accept' | 'decline' },
    { status: 'accepted' | 'declined' | 'not_found' | 'group_full' }
  >('groups:respondInvite'),
  leave: mRef<{ groupId: Id<'study_groups'> }, { ok: boolean }>('groups:leave'),
};

export const LEAGUE = {
  getMyLeagueMeta: qRef<NoArgs, LeagueMetaDto | null>('league:getMyLeagueMeta'),
  getMyLeagueBoard: qRef<{ limit?: number }, LeagueEntryDto[]>('league:getMyLeagueBoard'),
  bootstrapMyMembership: mRef<NoArgs, { created: boolean }>('league:bootstrapMyMembership'),
};

import type { DailyChallengeClaimResult, DailyChallengeDto } from '../../convex/dailyChallenges';

export const DAILY_CHALLENGES = {
  getTodayChallenge: qRef<{ language?: string }, DailyChallengeDto>(
    'dailyChallenges:getTodayChallenge'
  ),
  claimReward: mRef<NoArgs, DailyChallengeClaimResult>('dailyChallenges:claimReward'),
};

export type RecentAnnotation = {
  id: Id<'annotations'>;
  contextKey: string;
  text: string;
  note?: string;
  color?: string;
  startOffset?: number;
  endOffset?: number;
  createdAt: number;
  updatedAt?: number;
  scopeType?: string;
  scopeId?: string;
  blockId?: string;
  quote?: string;
  contextBefore?: string;
  contextAfter?: string;
};

import type { NextBestAction } from '../../convex/recommendations';
import type {
  WeakGrammarPattern,
  WeakVocabCategory,
  WritingErrorSummary,
  CrossDimensionWeakPoint,
} from '../../convex/weakPoints';
import type { NotificationDto, NotificationPreferencesDto } from '../../convex/notifications';
import type {
  LeaderboardEntry,
  LeaderboardSnapshot,
  MyRankResult,
  WeeklyOverview,
} from '../../convex/leaderboard';
import type { PartnershipDto, ActivePartnershipDto } from '../../convex/partnerships';
import type { SearchAllResult } from '../../convex/search';

export type { NextBestAction, NextBestActionKind } from '../../convex/recommendations';
export type {
  WeakGrammarPattern,
  WeakVocabCategory,
  WritingErrorSummary,
  CrossDimensionWeakPoint,
} from '../../convex/weakPoints';
export type {
  NotificationDto,
  NotificationKind,
  NotificationPreferencesDto,
  NotificationCategory,
  NotificationPriority,
} from '../../convex/notifications';
export type {
  LeaderboardEntry,
  LeaderboardSnapshot,
  MyRankResult,
  WeeklyOverview,
} from '../../convex/leaderboard';
export type {
  PartnershipDto,
  ActivePartnershipDto,
  PartnershipStatus,
  PartnerProfileLite,
} from '../../convex/partnerships';
export type { SearchAllResult, SearchHit, SearchBucketKind } from '../../convex/search';
export type {
  FriendShareLinkDto,
  FriendSearchItemDto,
  FriendSummaryDto,
  FriendProfileDto,
  FriendRequestDto,
  SendRequestResult,
  RespondRequestResult,
} from '../../convex/friends';
export type {
  StudyGroupDto,
  StudyGroupDetailDto,
  StudyGroupInviteDto,
  StudyGroupMemberDto,
  GroupLeaderboardEntry,
  GroupActivityDto,
} from '../../convex/groups';
export type { LeagueMetaDto, LeagueEntryDto, LeagueTier } from '../../convex/league';

export const RECOMMENDATIONS = {
  getNextBestAction: qRef<{ localHour?: number }, NextBestAction | null>(
    'recommendations:getNextBestAction'
  ),
  logInteraction: mRef<
    {
      actionKind: string;
      module: string;
      reasonCode: string;
      interaction: string;
      contentId?: string;
      localHour?: number;
      engagementMs?: number;
    },
    void
  >('recommendations:logRecommendationInteraction'),
  getStats: qRef<
    NoArgs,
    {
      totalShown: number;
      modules: Array<{
        module: string;
        shown: number;
        clicked: number;
        completed: number;
        skipped: number;
        clickRate: number;
        avgEngagementMs: number;
      }>;
    } | null
  >('recommendations:getRecommendationStats'),
};

export const READING_PROGRESS = {
  getProgress: qRef<
    { contentType: string; contentId: string },
    Doc<'user_reading_progress'> | null
  >('readingProgress:getProgress'),
  getRecentReading: qRef<{ limit?: number }, Doc<'user_reading_progress'>[]>(
    'readingProgress:getRecentReading'
  ),
  updateProgress: mRef<
    {
      contentType: string;
      contentId: string;
      lastSentenceId?: string;
      lastSentenceIndex?: number;
      completedSentenceCount?: number;
      totalSentenceCount?: number;
      readingTimeIncrement?: number;
    },
    Id<'user_reading_progress'>
  >('readingProgress:updateProgress'),
  incrementSavedCounts: mRef<
    {
      contentType: string;
      contentId: string;
      savedWordsDelta?: number;
      savedSentencesDelta?: number;
    },
    void
  >('readingProgress:incrementSavedCounts'),
  markCompleted: mRef<{ contentType: string; contentId: string }, Id<'user_reading_progress'>>(
    'readingProgress:markCompleted'
  ),
};

export const AI_CONTENT_FEEDBACK = {
  submitFeedback: mRef<
    {
      targetType: string;
      targetId: string;
      feedbackType: string;
      comment?: string;
    },
    unknown
  >('aiContentFeedback:submitFeedback'),
};

export const TOPIK_COACH = {
  getScorePrediction: qRef<Record<string, never>, TopikScorePredictionRecord | null>(
    'topikCoach/index:getScorePrediction'
  ),
  getImprovementPlan: qRef<Record<string, never>, TopikImprovementPlanRecord | null>(
    'topikCoach/index:getImprovementPlan'
  ),
  getMistakeBook: qRef<{ limit?: number }, TopikMistakeBookResult | null>(
    'topikCoach/index:getMistakeBook'
  ),
  getWeakPoints: qRef<{ limit?: number; daysBack?: number }, TopikCoachWeakPoint[]>(
    'topikCoach/index:getWeakPoints'
  ),
  getHotTopics: qRef<Record<string, never>, TopikHotTopic[]>('topikCoach/index:getHotTopics'),
  getWritingProgress: qRef<{ limit?: number }, TopikWritingProgressResult | null>(
    'topikCoach/index:getWritingProgress'
  ),
  predictScore: mRef<Record<string, never>, TopikPredictionResult>('topikCoach/index:predictScore'),
  generateImprovementPlan: mRef<{ targetLevel?: number }, TopikImprovementPlanResult>(
    'topikCoach/index:generateImprovementPlan'
  ),
};

export const WEAK_POINTS = {
  getWeakGrammarPatterns: qRef<{ limit?: number; language?: string }, WeakGrammarPattern[]>(
    'weakPoints:getWeakGrammarPatterns'
  ),
  getWeakVocabCategories: qRef<{ limit?: number; language?: string }, WeakVocabCategory[]>(
    'weakPoints:getWeakVocabCategories'
  ),
  getWritingErrorsByKagas: qRef<{ limit?: number; daysBack?: number }, WritingErrorSummary[]>(
    'weakPoints:getWritingErrorsByKagas'
  ),
  getCrossDimensionWeakPoints: qRef<{ language?: string }, CrossDimensionWeakPoint[]>(
    'weakPoints:getCrossDimensionWeakPoints'
  ),
};

export const FSRS_REVIEW = {
  getDueItems: qRef<{ kind?: 'sentence' | 'grammar' | 'all'; limit?: number }, DueReviewItem[]>(
    'fsrsReview:getDueItems'
  ),
  getReviewSummary: qRef<
    Record<string, never>,
    { dueSentences: number; dueGrammar: number; totalSentences: number; totalGrammar: number }
  >('fsrsReview:getReviewSummary'),
  applyReviewResult: mRef<
    {
      itemId: string;
      kind: 'sentence' | 'grammar';
      newCardState: {
        state: number;
        due: number;
        stability: number;
        difficulty: number;
        elapsed_days: number;
        scheduled_days: number;
        learning_steps: number;
        reps: number;
        lapses: number;
        last_review?: number | null;
      };
    },
    { success: boolean }
  >('fsrsReview:applyReviewResult'),
  initializeFsrsForExistingItems: mRef<
    Record<string, never>,
    { initialized: { sentences: number; grammar: number } }
  >('fsrsReview:initializeFsrsForExistingItems'),
};

export const NOTIFICATIONS = {
  getPreferences: qRef<NoArgs, NotificationPreferencesDto>('notifications:getPreferences'),
  updatePreferences: mRef<
    {
      enabled?: boolean;
      channels?: {
        inApp?: boolean;
        pwa?: boolean;
      };
      categories?: {
        learning?: boolean;
        exam?: boolean;
        social?: boolean;
        system?: boolean;
      };
      dailyReminderLocalTime?: string;
      timezone?: string;
      quietHours?: {
        enabled?: boolean;
        start?: string;
        end?: string;
      };
    },
    NotificationPreferencesDto
  >('notifications:updatePreferences'),
  subscribePush: mRef<
    {
      subscription: {
        endpoint: string;
        expirationTime?: number | null;
        keys: {
          p256dh: string;
          auth: string;
        };
      };
      userAgent?: string;
    },
    { ok: true }
  >('notifications:subscribePush'),
  unsubscribePush: mRef<{ endpoint?: string }, { ok: true }>('notifications:unsubscribePush'),
  getVapidPublicKey: qRef<NoArgs, string | null>('notifications:getVapidPublicKey'),
  listUnread: qRef<{ limit?: number }, NotificationDto[]>('notifications:listUnread'),
  listRecent: qRef<{ limit?: number }, NotificationDto[]>('notifications:listRecent'),
  getUnreadCount: qRef<NoArgs, number>('notifications:getUnreadCount'),
  markRead: mRef<{ id: Id<'notifications'> }, { ok: boolean }>('notifications:markRead'),
  markAllRead: mRef<NoArgs, { updated: number }>('notifications:markAllRead'),
  dismiss: mRef<{ id: Id<'notifications'> }, { ok: boolean }>('notifications:dismiss'),
};

export const LEADERBOARD = {
  getWeeklyTop: qRef<{ limit?: number }, LeaderboardEntry[]>('leaderboard:getWeeklyTop'),
  getMyRank: qRef<NoArgs, MyRankResult>('leaderboard:getMyRank'),
  getWeeklyOverview: qRef<NoArgs, WeeklyOverview>('leaderboard:getWeeklyOverview'),
  /**
   * Prefer this on pages that need top + my-rank + overview at the same time —
   * it runs a single scan + single user batch instead of 3 separate ones.
   */
  getSnapshot: qRef<{ topLimit?: number }, LeaderboardSnapshot>(
    'leaderboard:getLeaderboardSnapshot'
  ),
};

export const SEARCH = {
  searchAll: qRef<{ query: string; limitPerBucket?: number }, SearchAllResult>('search:searchAll'),
};

export const PARTNERSHIPS = {
  getActivePartnership: qRef<NoArgs, ActivePartnershipDto | null>(
    'partnerships:getActivePartnership'
  ),
  listPending: qRef<NoArgs, PartnershipDto[]>('partnerships:listPending'),
  invitePartner: mRef<
    { targetUserId: Id<'users'> },
    { id: Id<'studyPartnerships'>; alreadyExists: boolean }
  >('partnerships:invitePartner'),
  acceptPartnership: mRef<
    { partnershipId: Id<'studyPartnerships'> },
    { ok: boolean; reason?: string }
  >('partnerships:acceptPartnership'),
  declinePartnership: mRef<{ partnershipId: Id<'studyPartnerships'> }, { ok: boolean }>(
    'partnerships:declinePartnership'
  ),
  endPartnership: mRef<{ partnershipId: Id<'studyPartnerships'> }, { ok: boolean }>(
    'partnerships:endPartnership'
  ),
};

export const ANNOTATIONS = {
  getByContext: qRef<{ contextKey: string }, unknown[]>('annotations:getByContext'),
  getByPrefix: qRef<{ prefix: string; limit?: number }, unknown[]>('annotations:getByPrefix'),
  getRecent: qRef<{ limit?: number }, RecentAnnotation[]>('annotations:getRecent'),
  listByScope: qRef<
    { scopeType: string; scopeId: string; blockId?: string; limit?: number },
    unknown[]
  >('annotations:listByScope'),
  save: mRef<
    {
      contextKey: string;
      text: string;
      note?: string;
      color?: string;
      startOffset?: number;
      endOffset?: number;
      scopeType?: string;
      scopeId?: string;
      blockId?: string;
      quote?: string;
      contextBefore?: string;
      contextAfter?: string;
    },
    { id: string; success: boolean; upserted?: boolean }
  >('annotations:save'),
  upsertByAnchor: mRef<
    {
      scopeType: string;
      scopeId: string;
      blockId: string;
      start: number;
      end: number;
      quote: string;
      contextBefore?: string;
      contextAfter?: string;
      note?: string;
      color?: string;
      targetType?: string;
      contextKey?: string;
    },
    { id: string; success: boolean; upserted: boolean }
  >('annotations:upsertByAnchor'),
  deleteById: mRef<{ annotationId: Id<'annotations'> }, { success: boolean; error?: string }>(
    'annotations:deleteById'
  ),
  updateNote: mRef<{ annotationId: Id<'annotations'>; note: string }, { success: boolean }>(
    'annotations:updateNote'
  ),
};

export const NOTE_PAGES = {
  listPages: qRef<
    { parentPageId?: Id<'note_pages'>; includeArchived?: boolean; limit?: number },
    unknown[]
  >('notePages:listPages'),
  listNotebooks: qRef<
    NoArgs,
    {
      notebooks: Array<{
        id: Id<'note_pages'>;
        title: string;
        icon?: string;
        sortOrder: number;
        noteCount: number;
        reviewCount: number;
        sourceModule: string | null;
        updatedAt: number;
        createdAt: number;
      }>;
      totals: {
        notebooks: number;
        notes: number;
        unassigned: number;
      };
    }
  >('notePages:listNotebooks'),
  search: qRef<
    {
      query?: string;
      tag?: string;
      tags?: string[];
      status?: string;
      statuses?: string[];
      sourceModule?: string;
      sourceModules?: string[];
      noteType?: string;
      noteTypes?: string[];
      pinned?: boolean;
      reviewed?: boolean;
      hasNote?: boolean;
      hasHighlight?: boolean;
      notebookId?: Id<'note_pages'>;
      updatedAfter?: number;
      updatedBefore?: number;
      limit?: number;
    },
    { items: unknown[]; nextCursor: number | null }
  >('notePages:search'),
  listFacets: qRef<
    {
      query?: string;
      sourceModules?: string[];
      noteTypes?: string[];
      statuses?: string[];
      hasNote?: boolean;
      hasHighlight?: boolean;
      notebookId?: Id<'note_pages'>;
      updatedAfter?: number;
      updatedBefore?: number;
    },
    {
      total: number;
      todayAdded: number;
      withNote: number;
      withHighlight: number;
      sources: Array<{ key: string; count: number; unreviewed: number; todayAdded: number }>;
      noteTypes: Array<{ key: string; count: number }>;
      statuses: Array<{ key: string; count: number }>;
    }
  >('notePages:listFacets'),
  getPage: qRef<{ pageId: Id<'note_pages'> }, unknown>('notePages:getPage'),
  listReviewQueue: qRef<{ status?: string; limit?: number }, unknown[]>(
    'notePages:listReviewQueue'
  ),
  listTemplates: qRef<NoArgs, unknown[]>('notePages:listTemplates'),
  createPage: mRef<
    {
      parentPageId?: Id<'note_pages'>;
      title: string;
      icon?: string;
      cover?: string;
      tags?: string[];
      metadata?: Record<string, unknown>;
      isTemplate?: boolean;
      sortOrder?: number;
    },
    { success: boolean; id: Id<'note_pages'> }
  >('notePages:createPage'),
  createNotebook: mRef<
    {
      name: string;
      icon?: string;
      sourceModule?: string;
    },
    { success: boolean; id: Id<'note_pages'>; created: boolean }
  >('notePages:createNotebook'),
  updatePage: mRef<
    {
      pageId: Id<'note_pages'>;
      title?: string;
      icon?: string;
      cover?: string;
      tags?: string[];
      metadata?: Record<string, unknown>;
      sortOrder?: number;
    },
    { success: boolean; error?: string }
  >('notePages:updatePage'),
  movePage: mRef<
    {
      pageId: Id<'note_pages'>;
      parentPageId?: Id<'note_pages'>;
      sortOrder?: number;
    },
    { success: boolean; error?: string }
  >('notePages:movePage'),
  archivePage: mRef<
    { pageId: Id<'note_pages'>; archived: boolean },
    { success: boolean; error?: string }
  >('notePages:archivePage'),
  togglePin: mRef<
    { pageId: Id<'note_pages'>; pinned: boolean },
    { success: boolean; error?: string }
  >('notePages:togglePin'),
  markReviewed: mRef<
    { pageId: Id<'note_pages'>; reviewedAt?: number; queueStatus?: string },
    { success: boolean; reviewedAt?: number; error?: string }
  >('notePages:markReviewed'),
  enqueueReview: mRef<
    { pageId: Id<'note_pages'>; scheduledFor?: number },
    { success: boolean; scheduledFor?: number; error?: string }
  >('notePages:enqueueReview'),
  saveBlocks: mRef<
    {
      pageId: Id<'note_pages'>;
      blocks?: Array<{
        blockKey?: string;
        blockType: string;
        content: unknown;
        props?: Record<string, unknown>;
        sortOrder: number;
      }>;
      upsertBlocks?: Array<{
        blockKey?: string;
        blockType: string;
        content: unknown;
        props?: Record<string, unknown>;
        sortOrder: number;
      }>;
      deleteBlockKeys?: string[];
      reorderBlockKeys?: string[];
    },
    { success: boolean; count?: number; mode?: string; error?: string }
  >('notePages:saveBlocks'),
  saveEditorDoc: mRef<
    {
      pageId: Id<'note_pages'>;
      doc: Record<string, unknown>;
    },
    { success: boolean; error?: string }
  >('notePages:saveEditorDoc'),
  upsertFromAnnotation: mRef<
    {
      scopeType: string;
      scopeId: string;
      blockId: string;
      start: number;
      end: number;
      quote: string;
      contextBefore?: string;
      contextAfter?: string;
      note?: string;
      color?: string;
      contextKey?: string;
      sourceModule?: string;
      contentId?: string;
      contentTitle?: string;
      annotationId?: Id<'annotations'>;
      tags?: string[];
    },
    { success: boolean; pageId: Id<'note_pages'>; created: boolean; anchorKey: string }
  >('notePages:upsertFromAnnotation'),
  ingestFromSource: mRef<
    {
      notebookId?: Id<'note_pages'>;
      sourceModule: string;
      sourceRef?: Record<string, unknown>;
      noteType?: string;
      title?: string;
      quote?: string;
      note?: string;
      color?: string;
      tags?: string[];
      status?: string;
      pinned?: boolean;
      dedupeKey?: string;
      blocks?: Array<{
        blockKey?: string;
        blockType: string;
        content: unknown;
        props?: Record<string, unknown>;
        sortOrder: number;
      }>;
      createReviewQueue?: boolean;
      scheduledFor?: number;
      scopeType?: string;
      scopeId?: string;
      blockId?: string;
      start?: number;
      end?: number;
      contextBefore?: string;
      contextAfter?: string;
      contextKey?: string;
      contentId?: string;
      contentTitle?: string;
      annotationId?: string;
    },
    {
      success: boolean;
      pageId: Id<'note_pages'>;
      created: boolean;
      dedupeKey: string;
      sourceRef: Record<string, unknown>;
      hasNote: boolean;
      hasHighlight: boolean;
    }
  >('notePages:ingestFromSource'),
  deleteBySourceRef: mRef<
    {
      pageId?: Id<'note_pages'>;
      dedupeKey?: string;
      sourceRef?: Record<string, unknown>;
      softDelete?: boolean;
    },
    { success: boolean; archived?: boolean; error?: string }
  >('notePages:deleteBySourceRef'),
  createLink: mRef<
    { sourcePageId: Id<'note_pages'>; targetPageId: Id<'note_pages'> },
    { success: boolean; id?: Id<'note_links'>; duplicated?: boolean; error?: string }
  >('notePages:createLink'),
  removeLink: mRef<
    { sourcePageId: Id<'note_pages'>; targetPageId: Id<'note_pages'> },
    { success: boolean; removed: number }
  >('notePages:removeLink'),
  createTemplate: mRef<
    {
      name: string;
      description?: string;
      icon?: string;
      blocks: Array<{
        blockKey?: string;
        blockType: string;
        content: unknown;
        props?: Record<string, unknown>;
        sortOrder: number;
      }>;
    },
    { success: boolean; id: Id<'note_templates'> }
  >('notePages:createTemplate'),
  applyTemplate: mRef<
    { pageId: Id<'note_pages'>; templateId: Id<'note_templates'> },
    { success: boolean; count?: number; error?: string }
  >('notePages:applyTemplate'),
  migrateLegacyAnnotationsWithNotes: mRef<
    { dryRun?: boolean; limit?: number },
    {
      success: boolean;
      dryRun: boolean;
      found: number;
      noteRows: number;
      deduped: number;
      createdPages?: number;
      rootPageId?: Id<'note_pages'>;
    }
  >('notePages:migrateLegacyAnnotationsWithNotes'),
  migrateLegacyAllNotes: mRef<
    { dryRun?: boolean; limit?: number },
    {
      success: boolean;
      dryRun: boolean;
      createdPages?: number;
      rootPageId?: Id<'note_pages'>;
      createdNotebookPages?: number;
      createdAnnotationPages?: number;
    }
  >('notePages:migrateLegacyAllNotes'),
  migrateNotesIntoSourceNotebooks: mRef<
    { dryRun?: boolean; limit?: number },
    {
      success: boolean;
      dryRun: boolean;
      alreadyMigrated?: boolean;
      movedNotes?: number;
      createdNotebooks?: number;
      buckets?: Array<{ key: string; title: string; icon: string; count: number }>;
    }
  >('notePages:migrateNotesIntoSourceNotebooks'),
};

/**
 * TYPING PRACTICE REFS
 */
export type TypingTextDto = Doc<'typing_texts'>;

export type TypingUserStatsDto = {
  totalTests: number;
  averageWpm: number;
  averageAccuracy: number;
  highestWpm: number;
  totalTime: number;
  recentWpm: Array<{ wpm: number; date: number }>;
  sessionsThisWeek: number;
  lastPracticeMode: string | null;
  lastCategoryId: string | null;
  latestAccuracy: number | null;
};

export const TYPING = {
  listTexts: qRef<
    { type?: string; category?: string; onlyPublic?: boolean; paginationOpts: PaginationOptions },
    PaginationResult<TypingTextDto>
  >('typing:listTexts'),
  getText: qRef<{ id: Id<'typing_texts'> }, TypingTextDto | null>('typing:getText'),
  listCategories: qRef<NoArgs, string[]>('typing:listCategories'),
  getUserStats: qRef<NoArgs, TypingUserStatsDto | null>('typing:getUserStats'),
  saveRecord: mRef<
    {
      practiceMode: string;
      categoryId?: Id<'typing_texts'>;
      wpm: number;
      accuracy: number;
      errorCount: number;
      duration: number;
      charactersTyped: number;
      sentencesCompleted: number;
      targetWpm?: number;
      isTargetAchieved?: boolean;
    },
    Id<'typing_records'>
  >('typing:saveRecord'),
};

/**
 * USER & STATS REFS
 */
export const USER_STATS = {
  getStats: qRef<NoArgs, LearnerStatsDto>('userStats:getStats'),
  getCourseDashboard: qRef<NoArgs, CourseDashboardDto>('userStats:getCourseDashboard'),
};

export type MyXpStats = {
  currentWeekXp: number;
  totalXp: number;
};

export const XP = {
  getMyXpStats: qRef<NoArgs, MyXpStats | null>('xp:getMyXpStats'),
};

export const USERS = {
  updateCurrentCourse: mRef<
    { courseId: string; level?: number; unit?: number; module?: string },
    { success: boolean }
  >('users:updateCurrentCourse'),
};

/**
 * ABILITY PROFILER REFS
 */
export type AbilityDimensions = {
  vocabulary: number;
  grammar: number;
  reading: number;
  writing: number;
  listening: number;
};

export type AbilitySnapshot = {
  _id: string;
  overallScore: number;
  dimensions: AbilityDimensions;
  estimatedTopikLevel?: number;
  takenAt: number;
  dataCounts?: {
    vocabItems: number;
    grammarItems: number;
    readingAttempts: number;
    writingAttempts: number;
    listeningAttempts: number;
  };
  trigger: string;
};

export type LiveAbilityScores = {
  source: 'snapshot' | 'live_estimate';
  overallScore: number;
  dimensions: AbilityDimensions;
  estimatedTopikLevel?: number;
  takenAt: number;
};

export const ABILITY_PROFILER = {
  getLatestSnapshot: qRef<NoArgs, AbilitySnapshot | null>('abilityProfiler:getLatestSnapshot'),
  getSnapshotHistory: qRef<{ limit?: number }, AbilitySnapshot[]>(
    'abilityProfiler:getSnapshotHistory'
  ),
  computeSnapshot: mRef<
    { trigger?: string },
    {
      _id: string;
      overallScore: number;
      dimensions: AbilityDimensions;
      estimatedTopikLevel: number;
    }
  >('abilityProfiler:computeSnapshot'),
  getLiveAbilityScores: qRef<NoArgs, LiveAbilityScores | null>(
    'abilityProfiler:getLiveAbilityScores'
  ),
};

/**
 * COMMUNITY INSIGHTS REFS
 */
export type CommunityInsightData = {
  data: unknown;
  sampleSize: number;
  computedAt: number;
} | null;

export type CommunityStanding = {
  totalWords: number;
  masteredWords: number;
  communityAvgWords: number;
  communityActiveUsers: number;
};

export const COMMUNITY_INSIGHTS = {
  getInsight: qRef<{ statType: string }, CommunityInsightData>('communityInsights:getInsight'),
  getAllInsights: qRef<
    NoArgs,
    Record<string, { data: unknown; sampleSize: number; computedAt: number } | null>
  >('communityInsights:getAllInsights'),
  getMyStanding: qRef<NoArgs, CommunityStanding | null>('communityInsights:getMyStanding'),
};

/**
 * READING LIBRARY REFS - Moved to separate file
 */

/**
 * READING LIBRARY REFS (Simplified) - Moved to separate file
 */
// Import from readingLibrary.ts instead
export { READING_LIBRARY } from './convexRefs/readingLibrary';

/**
 * SPEAKING COACH REFS
 */
export type SpeakingSessionDto = {
  _id: string;
  mode: string;
  targetText: string;
  source?: string;
  sourceRefId?: string;
  attemptCount: number;
  bestAccuracy?: number;
  durationSec?: number;
  status: string;
  createdAt: number;
  updatedAt: number;
};

export type SyllableFeedback = {
  target: string;
  recognized: string;
  correct: boolean;
  phoneticRule?: string;
};

export type RecordAttemptResult = {
  scoreId: string;
  accuracy: number;
  bestAccuracy: number;
  attemptCount: number;
  syllableFeedback: SyllableFeedback[];
  issues: string[];
};

export type SpeakingProgressSummary = {
  totalSessions: number;
  totalMinutes: number;
  avgAccuracy: number;
  recentAvgAccuracy: number;
  recentSessionCount: number;
  modeBreakdown: Record<string, { count: number; avgAccuracy: number }>;
};

export const SPEAKING_COACH = {
  createSession: mRef<
    { mode: string; targetText: string; source?: string; sourceRefId?: string },
    { sessionId: string }
  >('speakingCoach:createSession'),
  recordAttempt: mRef<
    { sessionId: string; recognizedText: string; durationSec?: number },
    RecordAttemptResult
  >('speakingCoach:recordAttempt'),
  completeSession: mRef<
    { sessionId: string },
    { sessionId: string; attemptCount: number; bestAccuracy?: number; durationSec: number }
  >('speakingCoach:completeSession'),
  getRecentSessions: qRef<{ limit?: number; mode?: string }, SpeakingSessionDto[]>(
    'speakingCoach:getRecentSessions'
  ),
  getSessionDetail: qRef<
    { sessionId: string },
    (SpeakingSessionDto & { attempts: unknown[] }) | null
  >('speakingCoach:getSessionDetail'),
  getProgressSummary: qRef<NoArgs, SpeakingProgressSummary | null>(
    'speakingCoach:getProgressSummary'
  ),
};

/**
 * SEMANTIC EMBEDDINGS REFS (BGE-M3)
 */
export type EmbeddingSearchResult = {
  _id: string;
  _score: number;
  sourceTable: string;
  sourceId: string;
  text: string;
};

export type EmbeddingStats = {
  total: number;
  bySource: Record<string, number>;
  model: string;
  dimensions: number;
};

export const EMBEDDINGS = {
  embedText: aRef<
    { text: string; sourceTable: string; sourceId: string },
    { embeddingId: string; cached: boolean }
  >('embeddings:embedText'),
  embedBatch: aRef<
    { items: Array<{ text: string; sourceTable: string; sourceId: string }> },
    { embedded: number; skipped: number }
  >('embeddings:embedBatch'),
  ensureEmbedding: aRef<
    { text: string; sourceTable: string; sourceId: string },
    { status: 'exists' | 'created' | 'skipped' }
  >('embeddings:ensureEmbedding'),
  searchSimilar: aRef<
    { query: string; sourceTable?: string; limit?: number },
    EmbeddingSearchResult[]
  >('embeddings:searchSimilar'),
  checkSimilarity: aRef<{ textA: string; textB: string }, { similarity: number }>(
    'embeddings:checkSimilarity'
  ),
  getBySource: qRef<{ sourceTable: string; sourceId: string }, unknown | null>(
    'embeddings:getBySource'
  ),
  getStats: qRef<NoArgs, EmbeddingStats>('embeddings:getStats'),
};
