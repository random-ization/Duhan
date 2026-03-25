import { makeFunctionReference } from 'convex/server';
import type { DefaultFunctionArgs, PaginationOptions, PaginationResult } from 'convex/server';
import type { Id } from '../../convex/_generated/dataModel';

// Import types only to avoid runtime cycles
import type { GrammarStatsDto, GrammarItemDto, UnitGrammarDto } from '../../convex/grammars';
import type { InstituteClientDto } from '../../convex/institutes';
import type { SearchResult } from '../../convex/dictionary';

export type NoArgs = Record<string, never>;

export const qRef = <Args extends DefaultFunctionArgs, Ret>(name: string) =>
  makeFunctionReference<'query', Args, Ret>(name);

export const mRef = <Args extends DefaultFunctionArgs, Ret>(name: string) =>
  makeFunctionReference<'mutation', Args, Ret>(name);

export const aRef = <Args extends DefaultFunctionArgs, Ret>(name: string) =>
  makeFunctionReference<'action', Args, Ret>(name);

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
    { uploadUrl: string; publicUrl: string; key: string; headers: Record<string, string> }
  >('storage:getUploadUrl'),
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
      category?: 'ALL' | 'UNLEARNED' | 'DUE' | 'MASTERED';
      cursor?: string;
    },
    VocabBookPageDto
  >('vocab:getVocabBookPage'),
  getReviewSummary: qRef<{ savedByUserOnly?: boolean }, VocabReviewSummaryDto>(
    'vocab:getReviewSummary'
  ),
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
    },
    void
  >('vocab:addToReview'),
  setMastery: mRef<
    { wordId: Id<'words'>; mastered: boolean },
    { success: boolean; action: string }
  >('vocab:setMastery'),
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
  type: string;
  paperType?: string;
  timeLimit: number;
  audioUrl?: string;
  description?: string;
  isPaid?: boolean;
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

export const ANNOTATIONS = {
  getByContext: qRef<{ contextKey: string }, unknown[]>('annotations:getByContext'),
  getByPrefix: qRef<{ prefix: string; limit?: number }, unknown[]>('annotations:getByPrefix'),
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
