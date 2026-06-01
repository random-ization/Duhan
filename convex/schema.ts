import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { authTables } from '@convex-dev/auth/server';
import { transcriptArrayValidator } from './transcriptSchema';
import {
  reading_library_books,
  reading_library_chapters,
  reading_library_progress,
} from './readingLibrarySchema';
import {
  WRITING_ANSWER_MAP_VALIDATOR,
  WRITING_GRADING_CRITERIA_VALIDATOR,
  WRITING_QUESTION_TYPE_VALIDATOR,
} from './topikWritingValidators';
import {
  LooseJsonDeepValueValidator,
  LooseJsonObjectLeafValidator,
  LooseJsonValueValidator,
  SettingPrimitiveValidator,
  SettingValueValidator,
} from './jsonValidators';

const ReadingAnalysisPayloadValidator = v.object({
  summary: v.string(),
  vocabulary: v.array(
    v.object({
      term: v.string(),
      meaning: v.string(),
      level: v.string(),
    })
  ),
  grammar: v.array(
    v.object({
      pattern: v.string(),
      explanation: v.string(),
      example: v.string(),
    })
  ),
});

const ReadingTranslationPayloadValidator = v.object({
  translations: v.array(v.string()),
});

const NotebookGeneralContentValidator = v.object({
  text: v.string(),
  notes: v.optional(v.string()),
  source: v.optional(v.string()),
  articleId: v.optional(v.string()),
  articleTitle: v.optional(v.string()),
  articleSource: v.optional(v.string()),
  color: v.optional(v.string()),
  createdAt: v.optional(v.number()),
});

const NotebookMistakeContentValidator = v.object({
  questionText: v.string(),
  options: v.array(v.string()),
  correctAnswer: v.number(),
  imageUrl: v.optional(v.string()),
  aiAnalysis: v.object({
    translation: v.string(),
    keyPoint: v.string(),
    analysis: v.string(),
    wrongOptions: v.array(v.string()),
  }),
});

const NotebookVocabContentValidator = v.object({
  word: v.string(),
  pronunciation: v.optional(v.string()),
  meaning: v.optional(v.string()),
  context: v.optional(v.string()),
  analysis: v.optional(v.string()),
  examTitle: v.optional(v.string()),
});

const NotebookContentValidator = v.union(
  v.string(),
  NotebookGeneralContentValidator,
  NotebookMistakeContentValidator,
  NotebookVocabContentValidator
);

const SentenceTokenValidator = v.object({
  surface: v.string(),
  lemma: v.optional(v.string()),
  partOfSpeech: v.optional(v.string()),
  start: v.optional(v.number()),
  end: v.optional(v.number()),
  length: v.optional(v.number()),
  wordPosition: v.optional(v.number()),
  sentencePosition: v.optional(v.number()),
});

const SentenceVocabularyItemValidator = v.object({
  surface: v.string(),
  lemma: v.optional(v.string()),
  partOfSpeech: v.optional(v.string()),
  meaning: v.optional(v.string()),
  difficultyLevel: v.optional(v.string()),
  difficultyScore: v.optional(v.number()),
});

const SentenceGrammarItemValidator = v.object({
  pattern: v.string(),
  explanation: v.optional(v.string()),
  reason: v.optional(v.string()),
  start: v.optional(v.number()),
  end: v.optional(v.number()),
});

const SentenceExplanationPayloadValidator = v.object({
  sentence: v.string(),
  normalizedText: v.optional(v.string()),
  summary: v.optional(v.string()),
  overallMeaning: v.optional(v.string()),
  naturalTranslation: v.optional(v.string()),
  tokens: v.optional(v.array(SentenceTokenValidator)),
  vocabulary: v.optional(v.array(SentenceVocabularyItemValidator)),
  grammar: v.optional(v.array(SentenceGrammarItemValidator)),
  notes: v.optional(v.array(v.string())),
});

const SentenceQualityCorrectionChangeValidator = v.object({
  field: v.union(v.literal('naturalTranslation'), v.literal('summary')),
  before: v.optional(v.string()),
  after: v.string(),
});

const SentenceQualityCorrectionHistoryValidator = v.object({
  reviewedBy: v.id('users'),
  reviewedAt: v.number(),
  decision: v.union(v.literal('human_reviewed'), v.literal('rejected')),
  reviewNote: v.optional(v.string()),
  changes: v.array(SentenceQualityCorrectionChangeValidator),
});

const DailyTaskItemValidator = v.object({
  taskId: v.string(),
  kind: v.string(),
  title: v.string(),
  description: v.optional(v.string()),
  targetCount: v.optional(v.number()),
  currentCount: v.optional(v.number()),
  completed: v.boolean(),
  linkPath: v.optional(v.string()),
  assetType: v.optional(v.string()),
  assetRefId: v.optional(v.string()),
  metadata: v.optional(v.record(v.string(), SettingPrimitiveValidator)),
});

const DailyTaskReviewSummaryValidator = v.object({
  dueVocabCount: v.optional(v.number()),
  dueNoteCount: v.optional(v.number()),
  dueSentenceCount: v.optional(v.number()),
  dueGrammarCount: v.optional(v.number()),
  weakPointSummary: v.optional(v.string()),
});

const DiagnosisSnapshotValidator = v.object({
  averageScore: v.number(),
  submittedAt: v.number(),
  answers: v.array(
    v.object({
      questionId: v.string(),
      optionId: v.string(),
      score: v.number(),
    })
  ),
  recommendedCurrentLevel: v.string(),
  suggestedDailyMinutes: v.number(),
});

const WeeklyReportTopikProgressValidator = v.object({
  writingAttempts: v.optional(v.number()),
  avgWritingScore: v.optional(v.number()),
  predictedLevel: v.optional(v.string()),
  targetLevel: v.optional(v.string()),
});

const WeeklyReportKagasErrorSummaryValidator = v.array(
  v.object({
    type: v.string(),
    labelKo: v.optional(v.string()),
    labelZh: v.optional(v.string()),
    count: v.number(),
  })
);

const CommunityStatDataValidator = v.union(
  v.array(
    v.object({
      wordId: v.string(),
      avgLapses: v.number(),
      userCount: v.number(),
      avgReps: v.number(),
      korean: v.string(),
      meaning: v.string(),
    })
  ),
  v.array(
    v.object({
      errorType: v.string(),
      totalCount: v.number(),
      userCount: v.number(),
      examples: v.array(
        v.object({
          original: v.string(),
          corrected: v.string(),
        })
      ),
    })
  ),
  v.array(
    v.object({
      contentId: v.string(),
      module: v.string(),
      sessionCount: v.number(),
      userCount: v.number(),
      totalMinutes: v.number(),
    })
  ),
  v.object({
    activeUsers: v.number(),
    totalReviews: v.number(),
    totalMinutes: v.number(),
    avgWordsPerUser: v.number(),
    totalRegisteredUsers: v.number(),
  })
);

const GrammarConjugationRulesValidator = v.union(
  v.record(v.string(), v.string()),
  v.array(v.string()),
  v.array(v.record(v.string(), v.string()))
);

const GrammarLocalizedTextValidator = v.object({
  zh: v.optional(v.string()),
  en: v.optional(v.string()),
  vi: v.optional(v.string()),
  mn: v.optional(v.string()),
});

const GrammarSectionsValidator = v.object({
  introduction: v.optional(GrammarLocalizedTextValidator),
  core: v.optional(GrammarLocalizedTextValidator),
  comparative: v.optional(GrammarLocalizedTextValidator),
  cultural: v.optional(GrammarLocalizedTextValidator),
  commonMistakes: v.optional(GrammarLocalizedTextValidator),
  review: v.optional(GrammarLocalizedTextValidator),
});

const GrammarQuizItemValidator = v.object({
  prompt: GrammarLocalizedTextValidator,
  answer: v.optional(GrammarLocalizedTextValidator),
});

const GrammarSourceMetaValidator = v.object({
  sourceType: v.string(),
  sourcePath: v.optional(v.string()),
  sourceUrl: v.optional(v.string()),
  checksum: v.optional(v.string()),
  parserVersion: v.optional(v.string()),
  sourceLanguage: v.optional(
    v.union(v.literal('zh'), v.literal('en'), v.literal('vi'), v.literal('mn'))
  ),
  grammarKey: v.optional(v.string()),
  categoryStatus: v.optional(v.union(v.literal('AUTO_OK'), v.literal('NEEDS_REVIEW'))),
  categoryConfidence: v.optional(v.number()),
  categoryReason: v.optional(v.string()),
  categoryEvidence: v.optional(v.string()),
  importedAt: v.number(),
});

export default defineSchema({
  ...authTables,
  // Users (Mirrors User model)
  // Users (Merged with Auth)
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    image: v.optional(v.string()), // Added for Auth compatibility
    emailVerificationTime: v.optional(v.number()), // Added for Auth compatibility
    phone: v.optional(v.string()), // Added for Auth compatibility
    phoneVerificationTime: v.optional(v.number()), // Added for Auth compatibility
    isAnonymous: v.optional(v.boolean()), // Added for Auth compatibility

    role: v.optional(v.string()), // "STUDENT" | "ADMIN"
    accountStatus: v.optional(v.string()), // "ACTIVE" | "DISABLED"
    disabledReason: v.optional(v.string()),
    disabledAt: v.optional(v.number()),
    disabledBy: v.optional(v.id('users')),
    tier: v.optional(v.string()),
    subscriptionType: v.optional(v.string()), // "MONTHLY", "ANNUAL", "LIFETIME"
    subscriptionExpiry: v.optional(v.string()), // ISO Date or timestamp string
    avatar: v.optional(v.string()),
    totalStudyMinutes: v.optional(v.number()),
    savedWordsCount: v.optional(v.number()),
    mistakesCount: v.optional(v.number()),

    // Auth
    googleId: v.optional(v.string()),
    token: v.optional(v.string()), // Session token
    isVerified: v.optional(v.boolean()),
    // Legacy auth fields kept as optional for backward compatibility with existing records.
    password: v.optional(v.string()),
    resetToken: v.optional(v.string()),
    resetTokenExpires: v.optional(v.number()),
    verifyCode: v.optional(v.string()),

    // Progress pointers
    lastInstitute: v.optional(v.string()),
    lastLevel: v.optional(v.number()),
    lastUnit: v.optional(v.number()),
    lastModule: v.optional(v.string()), // Added
    lastGrammarId: v.optional(v.string()),
    lastLoginAt: v.optional(v.number()),
    lastActivityAt: v.optional(v.number()),
    lastActivityType: v.optional(v.string()),
    friendCode: v.optional(v.string()),
    postgresId: v.optional(v.string()),

    // Regional promo eligibility (CN/VN/MN phone verification)
    phoneRegion: v.optional(v.string()), // "CN" | "VN" | "MN" | "OTHER"
    isRegionalPromoEligible: v.optional(v.boolean()),
    phoneVerifiedAt: v.optional(v.string()), // ISO date string
    kycStatus: v.optional(v.string()), // "NONE" | "VERIFIED"

    createdAt: v.optional(v.number()),
  })
    .index('email', ['email']) // Renamed from by_email for @convex-dev/auth compatibility
    .index('by_googleId', ['googleId'])
    .index('by_token', ['token']) // Security index
    .index('by_postgresId', ['postgresId'])
    .index('by_lastActivityAt', ['lastActivityAt'])
    .index('by_friendCode', ['friendCode'])
    .searchIndex('search_name', { searchField: 'name' }),

  // Institutes (Courses/Textbooks)
  institutes: defineTable({
    id: v.string(), // Manual ID like "yonsei-1"
    name: v.string(),
    nameZh: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    nameVi: v.optional(v.string()),
    nameMn: v.optional(v.string()),
    levels: v.array(v.union(v.number(), v.object({ level: v.number(), units: v.number() }))),
    coverUrl: v.optional(v.string()),
    themeColor: v.optional(v.string()),
    publisher: v.optional(v.string()),
    displayLevel: v.optional(v.string()),
    totalUnits: v.optional(v.number()),
    estimatedTotalMinutes: v.optional(v.number()),
    volume: v.optional(v.string()),
    isArchived: v.optional(v.boolean()), // Soft delete flag
  })
    .index('by_legacy_id', ['id'])
    .index('by_name', ['name'])
    .index('by_archived', ['isArchived']),

  // Publishers Metadata
  publishers: defineTable({
    name: v.string(),
    nameKo: v.optional(v.string()),
    nameZh: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    nameVi: v.optional(v.string()),
    nameMn: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  }).index('by_name', ['name']),

  // Textbook Units (Reading Content)
  textbook_units: defineTable({
    courseId: v.string(),
    unitIndex: v.number(),
    articleIndex: v.number(),

    title: v.string(),
    readingText: v.string(),

    // Multi-language translations
    translation: v.optional(v.string()), // Chinese (default)
    translationEn: v.optional(v.string()), // English
    translationVi: v.optional(v.string()), // Vietnamese
    translationMn: v.optional(v.string()), // Mongolian

    audioUrl: v.optional(v.string()),

    // Legacy inline transcript payload (new writes use chunk tables)
    transcriptData: v.optional(transcriptArrayValidator),
    transcriptStorage: v.optional(v.union(v.literal('inline'), v.literal('chunked'))),
    transcriptChunkCount: v.optional(v.number()),
    transcriptSegmentCount: v.optional(v.number()),
    analysisData: v.optional(
      v.object({
        vocabulary: v.array(
          v.object({
            word: v.string(),
            root: v.string(),
            meaning: v.string(),
            type: v.string(),
          })
        ),
        grammar: v.array(
          v.object({
            structure: v.string(),
            explanation: v.string(),
          })
        ),
        nuance: v.string(),
        cached: v.optional(v.boolean()),
      })
    ),

    createdAt: v.number(), // timestamp
    postgresId: v.optional(v.string()),
    isArchived: v.optional(v.boolean()), // Soft delete flag
  })
    .index('by_course_unit_article', ['courseId', 'unitIndex', 'articleIndex'])
    .index('by_course', ['courseId'])
    .index('by_postgresId', ['postgresId'])
    .index('by_archived', ['isArchived']),

  textbook_unit_transcript_chunks: defineTable({
    unitId: v.id('textbook_units'),
    chunkIndex: v.number(),
    segments: transcriptArrayValidator,
    segmentCount: v.number(),
    approxBytes: v.number(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_unit', ['unitId'])
    .index('by_unit_chunk', ['unitId', 'chunkIndex']),

  // Words (Master Dictionary)
  daily_phrases: defineTable({
    korean: v.string(),
    romanization: v.string(),
    translation: v.string(), // English/Default
    translationZh: v.optional(v.string()),
    translationVi: v.optional(v.string()),
    translationMn: v.optional(v.string()),
    author: v.optional(v.string()),
    category: v.optional(v.string()),
  }),

  words: defineTable({
    word: v.string(),
    meaning: v.string(), // Chinese meaning (primary)
    partOfSpeech: v.string(),

    // Multi-language meanings
    meaningEn: v.optional(v.string()), // English
    meaningVi: v.optional(v.string()), // Vietnamese
    meaningMn: v.optional(v.string()), // Mongolian

    hanja: v.optional(v.string()),
    lemma: v.optional(v.string()),
    normalized: v.optional(v.string()),
    pronunciation: v.optional(v.string()),
    audioUrl: v.optional(v.string()),
    difficultyLevel: v.optional(v.string()),
    difficultyScore: v.optional(v.number()),
    topikLevel: v.optional(v.number()), // TOPIK level 1-6
    frequencyRank: v.optional(v.number()), // Word frequency rank (lower = more common)
    senses: v.optional(
      v.array(
        v.object({
          meaning: v.string(),
          meaningZh: v.optional(v.string()),
          examples: v.optional(v.array(v.string())),
          domain: v.optional(v.string()), // e.g. "일상", "학문", "비즈니스"
        })
      )
    ),
    displayForm: v.optional(v.string()), // Canonical display form (e.g. conjugated → base)
    romanization: v.optional(v.string()), // Romanized pronunciation
    tags: v.optional(v.array(v.string())), // e.g. ['외래어', '신조어', 'TOPIK필수']
    reviewStatus: v.optional(v.string()), // 'draft' | 'approved' | 'rejected' (AI quality gate)
    source: v.optional(v.string()),
    sourceRefId: v.optional(v.string()),

    tips: v.optional(
      v.object({
        synonyms: v.optional(v.array(v.string())),
        antonyms: v.optional(v.array(v.string())),
        nuance: v.optional(v.string()),
      })
    ),
    postgresId: v.optional(v.string()), // For migration mapping
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index('by_word', ['word'])
    .index('by_lemma', ['lemma'])
    .index('by_normalized', ['normalized'])
    .index('by_postgresId', ['postgresId'])
    .index('by_topikLevel', ['topikLevel'])
    .index('by_frequencyRank', ['frequencyRank']),

  // ───────────────────────────────────────────
  // P1: Word Data Normalization
  // ───────────────────────────────────────────

  /** Independent word senses (multi-meaning support) */
  word_senses: defineTable({
    wordId: v.id('words'),
    senseIndex: v.number(),
    pos: v.string(),
    meaningZh: v.string(),
    meaningEn: v.optional(v.string()),
    meaningVi: v.optional(v.string()),
    meaningMn: v.optional(v.string()),
    usageNote: v.optional(v.string()),
    topikLevel: v.optional(v.number()),
    domain: v.optional(v.string()), // e.g. "일상", "학문", "비즈니스"
    sourceType: v.string(), // "manual" | "ai" | "import"
    reviewStatus: v.string(), // "draft" | "approved" | "rejected"
    createdAt: v.optional(v.number()),
  })
    .index('by_word', ['wordId'])
    .index('by_status', ['reviewStatus']),

  /** Per-sense or per-word example sentences */
  word_examples: defineTable({
    wordId: v.id('words'),
    senseId: v.optional(v.id('word_senses')),
    textKo: v.string(),
    translationZh: v.optional(v.string()),
    translationEn: v.optional(v.string()),
    audioUrl: v.optional(v.string()),
    difficultyLevel: v.optional(v.number()),
    sourceType: v.string(),
    reviewStatus: v.string(),
    createdAt: v.optional(v.number()),
  })
    .index('by_word', ['wordId'])
    .index('by_sense', ['senseId']),

  /** Inflected forms → lemma mapping */
  inflections: defineTable({
    lemma: v.string(),
    surface: v.string(), // The inflected form (e.g. "갔어요")
    type: v.string(), // "past" | "formal" | "honorific" | "negative" etc.
    wordId: v.optional(v.id('words')),
    createdAt: v.optional(v.number()),
  })
    .index('by_lemma', ['lemma'])
    .index('by_surface', ['surface']),

  /** Common collocations / word pairings */
  collocations: defineTable({
    wordId: v.id('words'),
    pattern: v.string(), // e.g. "밥을 먹다", "시간이 걸리다"
    meaningZh: v.string(),
    example: v.optional(v.string()),
    frequency: v.optional(v.number()),
    createdAt: v.optional(v.number()),
  }).index('by_word', ['wordId']),

  /** Scenario-tagged phrases for conversation practice */
  phrases: defineTable({
    textKo: v.string(),
    meaningZh: v.string(),
    meaningEn: v.optional(v.string()),
    scenarioTags: v.optional(v.array(v.string())), // e.g. ["restaurant", "hospital"]
    difficultyLevel: v.optional(v.number()),
    audioUrl: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  }).index('by_text', ['textKo']),

  /** Token-level annotations for content sentences */
  content_tokens: defineTable({
    sentenceId: v.id('content_sentences'),
    tokenIndex: v.number(),
    surfaceForm: v.string(),
    lemma: v.optional(v.string()),
    pos: v.optional(v.string()),
    wordId: v.optional(v.id('words')),
    startOffset: v.number(),
    endOffset: v.number(),
  })
    .index('by_sentence', ['sentenceId', 'tokenIndex'])
    .index('by_word', ['wordId']),

  // Vocabulary Appearances (Linking Words to Courses)
  vocabulary_appearances: defineTable({
    wordId: v.id('words'),
    courseId: v.string(),
    unitId: v.number(),

    // Per-course meanings (allows same word to have different meanings in different courses)
    meaning: v.optional(v.string()), // Chinese meaning (primary)
    meaningEn: v.optional(v.string()), // English
    meaningVi: v.optional(v.string()), // Vietnamese
    meaningMn: v.optional(v.string()), // Mongolian

    exampleSentence: v.optional(v.string()),
    exampleMeaning: v.optional(v.string()), // Chinese (primary)

    // Multi-language example translations
    exampleMeaningEn: v.optional(v.string()), // English
    exampleMeaningVi: v.optional(v.string()), // Vietnamese
    exampleMeaningMn: v.optional(v.string()), // Mongolian

    createdAt: v.number(),
  })
    .index('by_course_unit', ['courseId', 'unitId'])
    .index('by_word_course_unit', ['wordId', 'courseId', 'unitId'])
    .index('by_word_createdAt', ['wordId', 'createdAt'])
    .index('by_unit', ['unitId']),

  // User Vocab Progress (SRS + FSRS)
  user_vocab_progress: defineTable({
    userId: v.id('users'),
    wordId: v.id('words'),

    // Legacy fields (kept for backward compatibility during migration)
    status: v.optional(v.string()), // "NEW", "LEARNING", "REVIEW", "MASTERED"
    interval: v.optional(v.number()),
    streak: v.optional(v.number()),

    // FSRS Core Fields
    state: v.optional(v.number()), // 0=New, 1=Learning, 2=Review, 3=Relearning
    due: v.optional(v.number()), // Next review timestamp
    stability: v.optional(v.number()), // Memory stability (days)
    difficulty: v.optional(v.number()), // Card difficulty (1-10)
    elapsed_days: v.optional(v.number()), // Days since last review
    scheduled_days: v.optional(v.number()), // Days until next review
    learning_steps: v.optional(v.number()), // Current learning step
    reps: v.optional(v.number()), // Total review count
    lapses: v.optional(v.number()), // Forgot count

    // Shared fields
    nextReviewAt: v.optional(v.number()), // Legacy alias for due
    lastReviewedAt: v.optional(v.number()), // Last review timestamp
    last_review: v.optional(v.number()), // FSRS alias for lastReviewedAt

    // Source tracking
    savedByUser: v.optional(v.boolean()), // true = manually added to Vocab Book
    source: v.optional(v.string()),
    sourceRefId: v.optional(v.string()),
    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index('by_user_word', ['userId', 'wordId'])
    .index('by_user_next_review', ['userId', 'nextReviewAt'])
    .index('by_user_due', ['userId', 'due'])
    .index('by_user', ['userId'])
    .index('by_user_saved', ['userId', 'savedByUser'])
    .index('by_user_source', ['userId', 'source'])
    .index('by_user_source_ref', ['userId', 'source', 'sourceRefId']),

  content_sentences: defineTable({
    contentType: v.string(),
    contentRefId: v.string(),
    blockId: v.optional(v.string()),
    sentenceIndex: v.number(),
    text: v.string(),
    normalizedText: v.optional(v.string()),
    textHash: v.string(),
    language: v.string(),
    source: v.optional(v.string()),
    sourceRefId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_content_ref', ['contentType', 'contentRefId'])
    .index('by_content_block_sentence', ['contentType', 'contentRefId', 'blockId', 'sentenceIndex'])
    .index('by_text_hash', ['textHash']),

  sentence_explanations: defineTable({
    sentenceId: v.optional(v.id('content_sentences')),
    userId: v.optional(v.id('users')),
    textHash: v.string(),
    sentence: v.string(),
    targetLanguage: v.string(),
    explanationVersion: v.optional(v.string()),
    provider: v.optional(v.string()),
    model: v.optional(v.string()),
    cacheKey: v.optional(v.string()),
    payload: SentenceExplanationPayloadValidator,
    // AI quality tracking (PRD section 20)
    confidence: v.optional(v.number()), // 0-1, AI output confidence
    reviewStatus: v.optional(v.string()), // "unreviewed" | "auto_checked" | "human_reviewed" | "rejected"
    promptVersion: v.optional(v.string()), // Prompt template version for traceability
    reviewedBy: v.optional(v.id('users')),
    reviewedAt: v.optional(v.number()),
    qualityReviewNote: v.optional(v.string()),
    correctionHistory: v.optional(v.array(SentenceQualityCorrectionHistoryValidator)),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_sentence_language', ['sentenceId', 'targetLanguage'])
    .index('by_text_hash_language', ['textHash', 'targetLanguage'])
    .index('by_cache_key', ['cacheKey'])
    .index('by_user_createdAt', ['userId', 'createdAt']),

  user_saved_sentences: defineTable({
    userId: v.id('users'),
    sentenceId: v.optional(v.id('content_sentences')),
    explanationId: v.optional(v.id('sentence_explanations')),
    text: v.string(),
    normalizedText: v.optional(v.string()),
    translation: v.optional(v.string()),
    notePageId: v.optional(v.id('note_pages')),
    source: v.optional(v.string()),
    sourceRefId: v.optional(v.string()),

    // FSRS Review Fields
    fsrsState: v.optional(v.number()), // 0=New, 1=Learning, 2=Review, 3=Relearning
    fsrsDue: v.optional(v.number()), // Next review timestamp
    fsrsStability: v.optional(v.number()), // Memory stability (days)
    fsrsDifficulty: v.optional(v.number()), // Card difficulty (1-10)
    fsrsElapsedDays: v.optional(v.number()),
    fsrsScheduledDays: v.optional(v.number()),
    fsrsLearningSteps: v.optional(v.number()),
    fsrsReps: v.optional(v.number()),
    fsrsLapses: v.optional(v.number()),
    fsrsLastReview: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_user_createdAt', ['userId', 'createdAt'])
    .index('by_user_sentence', ['userId', 'sentenceId'])
    .index('by_user_source_ref', ['userId', 'source', 'sourceRefId'])
    .index('by_user_due', ['userId', 'fsrsDue']),

  user_grammar_saved: defineTable({
    userId: v.id('users'),
    grammarId: v.optional(v.id('grammar_points')),
    sentenceId: v.optional(v.id('content_sentences')),
    explanationId: v.optional(v.id('sentence_explanations')),
    grammarKey: v.string(),
    pattern: v.string(),
    explanation: v.optional(v.string()),
    notePageId: v.optional(v.id('note_pages')),
    source: v.optional(v.string()),
    sourceRefId: v.optional(v.string()),

    // FSRS Review Fields
    fsrsState: v.optional(v.number()), // 0=New, 1=Learning, 2=Review, 3=Relearning
    fsrsDue: v.optional(v.number()), // Next review timestamp
    fsrsStability: v.optional(v.number()), // Memory stability (days)
    fsrsDifficulty: v.optional(v.number()), // Card difficulty (1-10)
    fsrsElapsedDays: v.optional(v.number()),
    fsrsScheduledDays: v.optional(v.number()),
    fsrsLearningSteps: v.optional(v.number()),
    fsrsReps: v.optional(v.number()),
    fsrsLapses: v.optional(v.number()),
    fsrsLastReview: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_user_createdAt', ['userId', 'createdAt'])
    .index('by_user_grammar', ['userId', 'grammarId'])
    .index('by_user_grammar_key', ['userId', 'grammarKey'])
    .index('by_user_sentence', ['userId', 'sentenceId'])
    .index('by_user_due', ['userId', 'fsrsDue']),

  // Grammar Points (Master Library)
  grammar_points: defineTable({
    title: v.string(),
    titleEn: v.optional(v.string()),
    titleZh: v.optional(v.string()),
    titleVi: v.optional(v.string()),
    titleMn: v.optional(v.string()),
    slug: v.optional(v.string()),
    searchKey: v.optional(v.string()),
    searchPatterns: v.optional(v.array(v.string())),

    level: v.string(),
    type: v.string(),

    // Chinese summary (default)
    summary: v.string(),
    // Multi-language summaries
    summaryEn: v.optional(v.string()),
    summaryVi: v.optional(v.string()),
    summaryMn: v.optional(v.string()),

    // Chinese explanation (default)
    explanation: v.string(),
    // Multi-language explanations
    explanationEn: v.optional(v.string()),
    explanationVi: v.optional(v.string()),
    explanationMn: v.optional(v.string()),

    // Structured sections with multi-language variants
    sections: v.optional(GrammarSectionsValidator),
    quizItems: v.optional(v.array(GrammarQuizItemValidator)),
    sourceMeta: v.optional(GrammarSourceMetaValidator),

    conjugationRules: v.optional(GrammarConjugationRulesValidator),
    // Examples format: [{ kr: string, cn: string, en?: string, vi?: string, mn?: string }]
    examples: v.array(
      v.object({
        kr: v.string(),
        cn: v.string(),
        en: v.optional(v.string()),
        vi: v.optional(v.string()),
        mn: v.optional(v.string()),
        audio: v.optional(v.string()),
      })
    ),
    postgresId: v.optional(v.string()),

    createdAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index('by_title', ['title'])
    .index('by_level', ['level'])
    .index('by_type', ['type'])
    .index('by_postgresId', ['postgresId'])
    .index('by_searchKey', ['searchKey'])
    .searchIndex('search_title', { searchField: 'title' }),

  // Course Grammar (Linking Grammar to Courses)
  course_grammars: defineTable({
    courseId: v.string(),
    unitId: v.number(),
    grammarId: v.id('grammar_points'),

    displayOrder: v.number(),
    customNote: v.optional(v.string()),
    customNoteEn: v.optional(v.string()),
    customNoteVi: v.optional(v.string()),
    customNoteMn: v.optional(v.string()),
  }).index('by_course_unit', ['courseId', 'unitId']),

  // User Grammar Progress
  user_grammar_progress: defineTable({
    userId: v.id('users'),
    grammarId: v.id('grammar_points'),

    status: v.string(), // "NOT_STARTED", "LEARNING", "MASTERED"
    proficiency: v.number(), // 0-100

    lastStudiedAt: v.number(),
  }).index('by_user_grammar', ['userId', 'grammarId']),

  // Annotations (User Notes)
  annotations: defineTable({
    userId: v.id('users'), // Assuming we use Convex ID for user relations

    // Context
    contextKey: v.string(), // "courseId_unitId"
    targetType: v.string(), // "TEXTBOOK"
    scopeType: v.optional(v.string()), // "TOPIK_REVIEW" | "READING_ARTICLE" | ...
    scopeId: v.optional(v.string()), // examId/articleId/courseId_unit
    blockId: v.optional(v.string()), // per-question / paragraph / block
    quote: v.optional(v.string()),
    contextBefore: v.optional(v.string()),
    contextAfter: v.optional(v.string()),

    // Data
    text: v.string(),
    note: v.optional(v.string()),
    color: v.optional(v.string()),

    startOffset: v.optional(v.number()),
    endOffset: v.optional(v.number()),
    sentenceIndex: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_user_context', ['userId', 'contextKey'])
    .index('by_user_scope', ['userId', 'scopeType', 'scopeId'])
    .index('by_user_scope_block', ['userId', 'scopeType', 'scopeId', 'blockId'])
    .index('by_user_scope_anchor', [
      'userId',
      'scopeType',
      'scopeId',
      'blockId',
      'startOffset',
      'endOffset',
    ])
    .index('by_user', ['userId']),

  // Videos
  videos: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    videoUrl: v.string(),
    thumbnailUrl: v.optional(v.string()),

    level: v.string(), // Beginner, Intermediate, Advanced
    accessLevel: v.optional(v.string()), // "FREE" | "PRO"
    duration: v.optional(v.number()),
    views: v.number(),

    // Legacy inline transcript payload (new writes use chunk tables)
    transcriptData: v.optional(transcriptArrayValidator),
    transcriptStorage: v.optional(v.union(v.literal('inline'), v.literal('chunked'))),
    transcriptChunkCount: v.optional(v.number()),
    transcriptSegmentCount: v.optional(v.number()),

    postgresId: v.optional(v.string()),
    youtubeId: v.optional(v.string()),

    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  }).index('by_level', ['level']),

  video_transcript_chunks: defineTable({
    videoId: v.id('videos'),
    chunkIndex: v.number(),
    segments: transcriptArrayValidator,
    segmentCount: v.number(),
    approxBytes: v.number(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_video', ['videoId'])
    .index('by_video_chunk', ['videoId', 'chunkIndex']),

  video_watch_progress: defineTable({
    userId: v.id('users'),
    videoId: v.id('videos'),
    progress: v.number(),
    duration: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index('by_user_video', ['userId', 'videoId'])
    .index('by_user', ['userId']),

  // Podcast Channels
  podcast_channels: defineTable({
    title: v.string(),
    author: v.string(),
    description: v.optional(v.string()),

    feedUrl: v.string(),
    artworkUrl: v.optional(v.string()),
    itunesId: v.optional(v.string()),
    isFeatured: v.boolean(),

    postgresId: v.optional(v.string()),
    sourceBackend: v.optional(v.string()),
    podcastIndexId: v.optional(v.string()),

    // Subtitle management
    subtitleEligibility: v.optional(v.string()),
    subtitleNotes: v.optional(v.string()),
    subtitleSourceKind: v.optional(v.string()),
    subtitleVerifiedAt: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_featured', ['isFeatured'])
    .index('by_feedUrl', ['feedUrl']),

  // Podcast Episodes
  podcast_episodes: defineTable({
    channelId: v.id('podcast_channels'),
    guid: v.string(), // Unique from RSS

    title: v.string(),
    description: v.optional(v.string()),
    audioUrl: v.string(),
    duration: v.optional(v.number()),
    pubDate: v.optional(v.number()),

    views: v.number(),
    likes: v.number(),

    postgresId: v.optional(v.string()),

    createdAt: v.number(),
  })
    .index('by_channel', ['channelId'])
    .index('by_channel_guid', ['channelId', 'guid'])
    .index('by_audioUrl', ['audioUrl'])
    .index('by_pubDate', ['pubDate']),

  podcast_channel_stats: defineTable({
    channelId: v.id('podcast_channels'),
    views: v.number(),
    latestAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_channel', ['channelId'])
    .index('by_views_latest', ['views', 'latestAt']),

  // Podcast Transcripts (server-stored fallback)
  podcast_transcripts: defineTable({
    episodeId: v.string(),
    segments: v.array(
      v.object({
        start: v.number(),
        end: v.number(),
        text: v.string(),
        translation: v.optional(v.string()),
        words: v.optional(
          v.array(
            v.object({
              word: v.string(),
              start: v.number(),
              end: v.number(),
            })
          )
        ),
      })
    ),
    translations: v.optional(
      v.object({
        zh: v.optional(v.array(v.string())),
        en: v.optional(v.array(v.string())),
        vi: v.optional(v.array(v.string())),
        mn: v.optional(v.array(v.string())),
      })
    ),
    translationLeases: v.optional(
      v.object({
        zh: v.optional(v.number()),
        en: v.optional(v.number()),
        vi: v.optional(v.number()),
        mn: v.optional(v.number()),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_episode', ['episodeId']),

  // Podcast Subscriptions
  podcast_subscriptions: defineTable({
    userId: v.id('users'),
    channelId: v.id('podcast_channels'),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_channel', ['userId', 'channelId']),

  // Listening History
  listening_history: defineTable({
    userId: v.id('users'),
    episodeId: v.optional(v.id('podcast_episodes')), // Link to internal episode if exists

    // Denormalized data for display efficiency (and for external episodes not in DB)
    episodeGuid: v.string(),
    episodeTitle: v.string(),
    episodeUrl: v.string(),
    channelName: v.string(),
    channelImage: v.optional(v.string()),

    progress: v.number(), // Seconds played
    duration: v.optional(v.number()), // Total seconds
    playedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_playedAt', ['userId', 'playedAt'])
    .index('by_user_episode', ['userId', 'episodeGuid']),

  // User Course Progress (Completed Units)
  user_course_progress: defineTable({
    userId: v.id('users'),
    courseId: v.string(), // Institute ID
    completedUnits: v.array(v.number()), // Array of completed unit indexes
    lastAccessAt: v.number(),
    lastUnitIndex: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_user_course', ['userId', 'courseId'])
    .index('by_user', ['userId']),

  // User vocab learning sessions (resume support)
  vocab_learning_sessions: defineTable({
    userId: v.id('users'),
    instituteId: v.string(),
    unitId: v.number(), // ALL is represented by -1
    mode: v.union(v.literal('FLASHCARD'), v.literal('LEARN'), v.literal('TEST')),
    status: v.union(v.literal('ACTIVE'), v.literal('COMPLETED'), v.literal('ABANDONED')),
    snapshot: v.optional(LooseJsonDeepValueValidator),
    startedAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index('by_user_status_updatedAt', ['userId', 'status', 'updatedAt'])
    .index('by_user_scope_mode', ['userId', 'instituteId', 'unitId', 'mode']),

  // Notebooks (User Notes)
  notebooks: defineTable({
    userId: v.id('users'),
    type: v.string(), // "WORD", "GRAMMAR", "NOTE", etc.
    title: v.string(),
    content: NotebookContentValidator,
    preview: v.optional(v.string()),
    tags: v.array(v.string()),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_type', ['userId', 'type']),

  // Notebook v2 - page tree metadata
  note_pages: defineTable({
    userId: v.id('users'),
    parentPageId: v.optional(v.id('note_pages')),
    title: v.string(),
    icon: v.optional(v.string()),
    cover: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    sourceModule: v.optional(v.string()),
    noteType: v.optional(v.string()),
    dedupeKey: v.optional(v.string()),
    previewText: v.optional(v.string()),
    searchText: v.optional(v.string()),
    hasNote: v.optional(v.boolean()),
    hasHighlight: v.optional(v.boolean()),
    status: v.optional(v.string()),
    pinned: v.optional(v.boolean()),
    lastReviewedAt: v.optional(v.number()),
    isArchived: v.optional(v.boolean()),
    isTemplate: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
    metadata: v.optional(v.record(v.string(), LooseJsonObjectLeafValidator)),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_parent', ['userId', 'parentPageId'])
    .index('by_user_archived', ['userId', 'isArchived'])
    .index('by_user_template', ['userId', 'isTemplate'])
    .index('by_user_source', ['userId', 'sourceModule'])
    .index('by_user_status', ['userId', 'status'])
    .index('by_user_updatedAt', ['userId', 'updatedAt'])
    .index('by_user_dedupeKey', ['userId', 'dedupeKey'])
    .index('by_user_noteType', ['userId', 'noteType']),

  // Notebook v2 - block editor content
  note_blocks: defineTable({
    userId: v.id('users'),
    pageId: v.id('note_pages'),
    blockKey: v.optional(v.string()),
    blockType: v.string(), // paragraph/heading/todo/callout/code/toggle/quote/list...
    content: LooseJsonDeepValueValidator,
    props: v.optional(v.record(v.string(), LooseJsonObjectLeafValidator)),
    sortOrder: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_page', ['pageId'])
    .index('by_user_page', ['userId', 'pageId']),

  // Notebook v2 - backlinks
  note_links: defineTable({
    userId: v.id('users'),
    sourcePageId: v.id('note_pages'),
    targetPageId: v.id('note_pages'),
    createdAt: v.number(),
  })
    .index('by_user_source', ['userId', 'sourcePageId'])
    .index('by_user_target', ['userId', 'targetPageId']),

  // Notebook v2 - reusable templates
  note_templates: defineTable({
    userId: v.id('users'),
    name: v.string(),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    blocks: v.array(
      v.object({
        blockType: v.string(),
        content: LooseJsonDeepValueValidator,
        props: v.optional(v.record(v.string(), LooseJsonObjectLeafValidator)),
        sortOrder: v.number(),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_user', ['userId']),

  // Notebook v2 - lightweight daily review queue
  note_review_queue: defineTable({
    userId: v.id('users'),
    pageId: v.id('note_pages'),
    status: v.string(), // queued | done
    scheduledFor: v.optional(v.number()),
    reviewedAt: v.optional(v.number()),
    sourceRef: v.optional(v.record(v.string(), LooseJsonObjectLeafValidator)),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_status', ['userId', 'status'])
    .index('by_user_page', ['userId', 'pageId'])
    .index('by_user_scheduled', ['userId', 'scheduledFor']),

  // TOPIK Exams (Metadata)
  topik_exams: defineTable({
    legacyId: v.string(), // Original ID like "exam-1704067200000"
    title: v.string(),
    round: v.number(), // e.g., 35
    level: v.optional(v.union(v.literal(1), v.literal(2))), // TOPIK I or II
    type: v.string(), // "READING" | "LISTENING"
    paperType: v.optional(v.string()), // "A" | "B"
    timeLimit: v.number(), // Minutes
    audioUrl: v.optional(v.string()), // S3 URL for listening exams
    description: v.optional(v.string()),
    isPaid: v.boolean(),
    accessLevel: v.optional(v.string()), // "FREE_SAMPLE" | "PRO"
    scheduledAt: v.optional(v.number()), // Planned exam date for countdown / reminders
    createdAt: v.number(),
  })
    .index('by_legacy_id', ['legacyId'])
    .index('by_round', ['round'])
    .index('by_type', ['type'])
    .index('by_scheduledAt', ['scheduledAt']),

  // TOPIK Questions (Separate table for efficiency)
  topik_questions: defineTable({
    examId: v.id('topik_exams'),
    number: v.number(), // 1-50
    passage: v.optional(v.string()),
    question: v.string(),
    contextBox: v.optional(v.string()), // 보기 content
    options: v.array(v.string()), // 4 options
    correctAnswer: v.number(), // 0-3
    image: v.optional(v.string()), // S3 URL for question image
    optionImages: v.optional(v.array(v.string())), // S3 URLs for image options
    explanation: v.optional(v.string()),
    score: v.number(),
    instruction: v.optional(v.string()),
    layout: v.optional(v.string()),
    groupCount: v.optional(v.number()),
  })
    .index('by_exam', ['examId'])
    .index('by_exam_number', ['examId', 'number']),

  // User Mistakes
  mistakes: defineTable({
    userId: v.id('users'),
    wordId: v.optional(v.id('words')),
    korean: v.string(),
    english: v.string(),
    context: v.optional(v.string()),
    reviewCount: v.number(),
    createdAt: v.number(),
  }).index('by_user', ['userId']),

  // Exam Attempts
  exam_attempts: defineTable({
    userId: v.id('users'),
    examId: v.id('topik_exams'),
    sessionId: v.optional(v.string()),
    score: v.number(),
    totalQuestions: v.number(),
    maxScore: v.optional(v.number()),
    correctCount: v.optional(v.number()),
    sectionScores: v.optional(v.record(v.string(), v.number())),
    duration: v.optional(v.number()),
    accuracy: v.optional(v.number()),
    answers: v.optional(v.record(v.string(), v.number())),
    createdAt: v.number(),
  }).index('by_user', ['userId']),

  // User Saved Words
  saved_words: defineTable({
    userId: v.id('users'),
    korean: v.string(),
    english: v.string(),
    exampleSentence: v.optional(v.string()),
    exampleTranslation: v.optional(v.string()),
    createdAt: v.number(),
  }).index('by_user', ['userId']),

  ai_usage_logs: defineTable({
    userId: v.optional(v.id('users')),
    feature: v.string(),
    model: v.string(),
    promptTokens: v.optional(v.number()),
    completionTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    costUsd: v.optional(v.number()),
    status: v.optional(v.union(v.literal('success'), v.literal('error'))),
    provider: v.optional(v.string()),
    errorCode: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    retries: v.optional(v.number()),
    durationMs: v.optional(v.number()),
    httpStatus: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_createdAt', ['createdAt'])
    .index('by_feature', ['feature'])
    .index('by_user_createdAt', ['userId', 'createdAt'])
    .index('by_user_model_createdAt', ['userId', 'model', 'createdAt']),

  entitlement_usage: defineTable({
    userId: v.id('users'),
    feature: v.string(),
    windowStart: v.number(),
    resourceKey: v.optional(v.string()),
    amount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user_feature_window', ['userId', 'feature', 'windowStart'])
    .index('by_user_feature_window_resource', ['userId', 'feature', 'windowStart', 'resourceKey']),

  // One-time tokens for account recovery and email verification
  auth_email_tokens: defineTable({
    kind: v.union(v.literal('password_reset'), v.literal('email_verify')),
    userId: v.id('users'),
    email: v.string(),
    tokenHash: v.string(),
    expiresAt: v.number(),
    usedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_kind_tokenHash', ['kind', 'tokenHash'])
    .index('by_email_kind_createdAt', ['email', 'kind', 'createdAt'])
    .index('by_user_kind_createdAt', ['userId', 'kind', 'createdAt']),

  learning_events: defineTable({
    userId: v.id('users'),
    sessionId: v.string(),
    module: v.string(),
    surface: v.optional(v.string()),
    courseId: v.optional(v.string()),
    unitId: v.optional(v.number()),
    contentId: v.optional(v.string()),
    eventName: v.string(),
    eventAt: v.number(),
    durationSec: v.optional(v.number()),
    itemCount: v.optional(v.number()),
    score: v.optional(v.number()),
    accuracy: v.optional(v.number()),
    result: v.optional(v.string()),
    source: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.union(v.string(), v.number(), v.boolean()))),
    createdAt: v.number(),
  })
    .index('by_user_eventAt', ['userId', 'eventAt'])
    .index('by_user_session_eventAt', ['userId', 'sessionId', 'eventAt'])
    .index('by_user_module_eventAt', ['userId', 'module', 'eventAt'])
    .index('by_module_eventAt', ['module', 'eventAt'])
    .index('by_eventName_eventAt', ['eventName', 'eventAt']),

  // Activity Logs
  activity_logs: defineTable({
    userId: v.id('users'),
    activityType: v.string(),
    sessionId: v.optional(v.string()),
    module: v.optional(v.string()),
    surface: v.optional(v.string()),
    courseId: v.optional(v.string()),
    unitId: v.optional(v.number()),
    contentId: v.optional(v.string()),
    duration: v.optional(v.number()),
    itemsStudied: v.optional(v.number()),
    score: v.optional(v.number()),
    accuracy: v.optional(v.number()),
    result: v.optional(v.string()),
    source: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.union(v.string(), v.number(), v.boolean()))),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_createdAt', ['userId', 'createdAt'])
    .index('by_user_session_createdAt', ['userId', 'sessionId', 'createdAt']),

  admin_user_notes: defineTable({
    userId: v.id('users'),
    authorUserId: v.id('users'),
    body: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user_createdAt', ['userId', 'createdAt'])
    .index('by_author_createdAt', ['authorUserId', 'createdAt']),

  admin_user_audit_logs: defineTable({
    userId: v.id('users'),
    actorUserId: v.id('users'),
    action: v.string(),
    metadata: v.optional(v.record(v.string(), v.union(v.string(), v.number(), v.boolean()))),
    createdAt: v.number(),
  })
    .index('by_user_createdAt', ['userId', 'createdAt'])
    .index('by_actor_createdAt', ['actorUserId', 'createdAt']),

  // Exam Sessions (Active timer tracking)
  exam_sessions: defineTable({
    userId: v.id('users'),
    examId: v.id('topik_exams'),
    status: v.string(), // "IN_PROGRESS" | "COMPLETED" | "AUTO_SUBMITTED"
    startTime: v.number(), // timestamp
    endTime: v.number(), // calculated: startTime + exam.timeLimit
    answers: v.optional(v.record(v.string(), v.number())),
    score: v.optional(v.number()),
    scheduledJobId: v.optional(v.id('_scheduled_functions')), // For auto-submit scheduler
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    .index('by_user_exam', ['userId', 'examId'])
    .index('by_status', ['status']),

  // Canvas Layers (Drawings/Handwriting)
  canvas_layers: defineTable({
    // userId: v.string(), // Removed duplicate
    // userStats uses Query to get ID. best to use v.string() for flexibility or v.id("users") if confident.
    // annotations uses v.id("users"). Let's use v.string() to match user_vocab_progress flexibility
    // or v.id("users") if we enforce auth. annotations.ts resolves user and uses user._id.
    // Let's use v.id("users") for consistency with annotations.
    userId: v.id('users'),
    targetId: v.string(), // e.g., unitId or examId
    targetType: v.string(), // "TEXTBOOK", "EXAM"
    pageIndex: v.number(),

    data: v.object({
      lines: v.array(
        v.object({
          id: v.string(),
          tool: v.string(),
          points: v.array(v.number()),
          color: v.string(),
          strokeWidth: v.number(),
          opacity: v.number(),
        })
      ),
      version: v.number(),
    }),

    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_user_target', ['userId', 'targetId', 'pageIndex']),

  // Legal Documents
  legal_documents: defineTable({
    identifier: v.string(), // "terms", "privacy", "refund"
    title: v.string(),
    content: v.string(),
    updatedAt: v.number(),
  }).index('by_identifier', ['identifier']),

  // TTS Cache Index
  tts_cache: defineTable({
    key: v.string(),
    url: v.string(),
    updatedAt: v.number(),
  }).index('by_key', ['key']),

  kiwi_tokenize_cache: defineTable({
    textHash: v.string(),
    text: v.string(),
    normalizedText: v.optional(v.string()),
    modelVersion: v.string(),
    tokenCount: v.number(),
    tokens: v.array(SentenceTokenValidator),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_text_hash_model', ['textHash', 'modelVersion'])
    .index('by_text_hash', ['textHash'])
    .index('by_model_updatedAt', ['modelVersion', 'updatedAt']),

  // AI response cache (reading analysis / translation / sentence explanation)
  ai_response_cache: defineTable({
    key: v.string(),
    kind: v.string(), // "reading_analysis" | "reading_translation" | "sentence_explanation"
    language: v.string(),
    contentHash: v.string(),
    payload: v.union(
      ReadingAnalysisPayloadValidator,
      ReadingTranslationPayloadValidator,
      SentenceExplanationPayloadValidator
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_key', ['key'])
    .index('by_kind_language_hash', ['kind', 'language', 'contentHash'])
    .index('by_kind_updatedAt', ['kind', 'updatedAt']),

  user_goal_profile: defineTable({
    userId: v.id('users'),
    status: v.string(),
    onboardingVersion: v.optional(v.string()),
    preferredLanguage: v.optional(v.string()),
    currentLevel: v.optional(v.string()),
    targetLevel: v.optional(v.string()),
    targetExam: v.optional(v.string()),
    dailyMinutes: v.optional(v.number()),
    studyFocus: v.optional(v.array(v.string())),
    diagnosisSummary: v.optional(v.string()),
    diagnosisSnapshot: v.optional(DiagnosisSnapshotValidator),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    .index('by_user_status', ['userId', 'status']),

  daily_task_plan: defineTable({
    userId: v.id('users'),
    date: v.string(),
    status: v.string(),
    goalProfileId: v.optional(v.id('user_goal_profile')),
    taskVersion: v.optional(v.string()),
    source: v.optional(v.string()),
    rationale: v.optional(v.string()),
    tasks: v.array(DailyTaskItemValidator),
    reviewSummary: v.optional(DailyTaskReviewSummaryValidator),
    generatedAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index('by_user_date', ['userId', 'date'])
    .index('by_user_status_date', ['userId', 'status', 'date'])
    .index('by_date_status', ['date', 'status']),

  // Global Site Settings
  site_settings: defineTable({
    key: v.string(), // "logo", "theme", "meta"
    value: SettingValueValidator,
    updatedAt: v.number(),
  }).index('by_key', ['key']),

  // Typing Practice Records
  typing_records: defineTable({
    userId: v.id('users'),

    // Practice details
    practiceMode: v.string(), // "sentence" | "word" | "article"
    categoryId: v.string(), // Category identifier

    // Performance metrics
    wpm: v.number(), // Words/characters per minute
    accuracy: v.number(), // Percentage (0-100)
    errorCount: v.number(), // Total errors made

    // Time tracking
    duration: v.number(), // Total time in seconds
    charactersTyped: v.number(), // Total characters typed
    sentencesCompleted: v.number(), // Number of sentences completed

    // Challenge level
    targetWpm: v.number(), // Target WPM for challenge (e.g., 200)
    isTargetAchieved: v.boolean(), // Did user meet the target?

    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_mode', ['userId', 'practiceMode'])
    .index('by_user_createdAt', ['userId', 'createdAt']),

  // Typing Practice Texts (Admin Managed)
  typing_texts: defineTable({
    title: v.string(),
    content: v.string(), // Full text or line-separated
    type: v.string(), // "WORD" | "SENTENCE" | "ARTICLE"
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    difficulty: v.optional(v.number()),
    isPublic: v.boolean(),

    // Metadata
    author: v.optional(v.string()),
    source: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),

    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index('by_type', ['type'])
    .index('by_category', ['category'])
    .index('by_public', ['isPublic'])
    .index('by_createdAt', ['createdAt']),

  // News Articles (Korean reading feed)
  news_articles: defineTable({
    sourceKey: v.string(), // e.g. "khan", "donga", "naver_news_search"
    sourceType: v.string(), // "rss" | "api"
    sourceGuid: v.optional(v.string()),
    sourceUrl: v.string(),
    canonicalUrl: v.string(),
    urlHash: v.string(),

    title: v.string(),
    summary: v.optional(v.string()),
    bodyText: v.string(),
    bodyHtml: v.optional(v.string()),

    language: v.string(), // "ko"
    section: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    author: v.optional(v.string()),

    publishedAt: v.number(),
    fetchedAt: v.number(),

    difficultyLevel: v.string(), // "L1" | "L2" | "L3"
    difficultyScore: v.number(), // 0-100
    difficultyReason: v.array(v.string()),

    dedupeClusterId: v.string(),
    normalizedTitle: v.optional(v.string()),
    simhash: v.optional(v.string()),
    projectedAt: v.optional(v.number()),
    projectedCourseId: v.optional(v.string()),
    projectedUnitIndex: v.optional(v.number()),
    projectedArticleIndex: v.optional(v.number()),

    status: v.string(), // "active" | "filtered" | "archived"
    licenseTier: v.string(), // "unknown" | "internal_ok" | "restricted"
  })
    .index('by_url_hash', ['urlHash'])
    .index('by_source_published', ['sourceKey', 'publishedAt'])
    .index('by_difficulty_published', ['difficultyLevel', 'publishedAt'])
    .index('by_status_published', ['status', 'publishedAt'])
    .index('by_status_projected', ['status', 'projectedAt'])
    .index('by_dedupe_cluster', ['dedupeClusterId'])
    .index('by_published', ['publishedAt']),

  // News Fetch Run Logs
  news_fetch_logs: defineTable({
    sourceKey: v.string(),
    runAt: v.number(),
    durationMs: v.number(),
    fetched: v.number(),
    inserted: v.number(),
    updated: v.number(),
    deduped: v.number(),
    failed: v.number(),
    status: v.string(), // "ok" | "partial" | "error"
    errorSample: v.optional(v.array(v.string())),
  })
    .index('by_source_runAt', ['sourceKey', 'runAt'])
    .index('by_runAt', ['runAt'])
    .index('by_status_runAt', ['status', 'runAt']),

  // News source runtime health / alert state
  news_source_health: defineTable({
    sourceKey: v.string(),
    totalRuns: v.number(),
    totalFailures: v.number(),
    consecutiveFailures: v.number(),
    lastRunAt: v.number(),
    lastStatus: v.string(), // "ok" | "partial" | "error"
    lastError: v.optional(v.string()),
    lastSuccessAt: v.optional(v.number()),
    degraded: v.boolean(),
    degradedSince: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index('by_sourceKey', ['sourceKey'])
    .index('by_degraded', ['degraded'])
    .index('by_lastRunAt', ['lastRunAt']),

  // Per-user reading feed state (refresh policy / quota)
  reading_user_feeds: defineTable({
    userId: v.id('users'),
    newsArticleIds: v.array(v.id('news_articles')),
    articleIds: v.array(v.id('news_articles')),
    hasReadSinceRefresh: v.boolean(),
    lastReadAt: v.optional(v.number()),
    lastRefreshedAt: v.number(),
    manualRefreshCount: v.number(),
    manualRefreshWindowStart: v.number(),
    updatedAt: v.number(),
  }).index('by_user', ['userId']),

  reading_books: defineTable({
    slug: v.string(),
    title: v.string(),
    pageTitle: v.optional(v.string()),
    levelLabel: v.optional(v.string()),
    coverImageUrl: v.optional(v.string()),
    pageCount: v.number(),
    readingMinutes: v.optional(v.number()),
    sourcePage: v.string(),
    sourceBookId: v.number(),
    catimage: v.optional(v.number()),
    token: v.optional(v.string()),
    isPublished: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_slug', ['slug'])
    .index('by_source_book_id', ['sourceBookId'])
    .index('by_published_source_book_id', ['isPublished', 'sourceBookId']),

  reading_book_pages: defineTable({
    bookId: v.id('reading_books'),
    pageIndex: v.number(),
    imageUrl: v.string(),
    layoutClass: v.optional(v.string()),
    sentenceCount: v.number(),
    createdAt: v.number(),
  })
    .index('by_book', ['bookId'])
    .index('by_book_page', ['bookId', 'pageIndex']),

  reading_book_sentences: defineTable({
    pageId: v.id('reading_book_pages'),
    sentenceIndex: v.number(),
    spanId: v.optional(v.string()),
    text: v.string(),
    audioUrl: v.optional(v.string()),
    clipBeginMs: v.optional(v.number()),
    clipEndMs: v.optional(v.number()),
    durationMs: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_page', ['pageId'])
    .index('by_page_sentence', ['pageId', 'sentenceIndex']),

  user_badges: defineTable({
    userId: v.id('users'),
    category: v.string(), // e.g., "STREAK", "VOCAB", "TYPING", "NIGHT_OWL"
    tier: v.union(
      v.literal('BRONZE'),
      v.literal('SILVER'),
      v.literal('GOLD'),
      v.literal('DIAMOND')
    ),
    milestoneValue: v.number(),
    badgeId: v.optional(v.string()),
    rewardXp: v.optional(v.number()),
    titleKey: v.optional(v.string()),
    descriptionKey: v.optional(v.string()),
    iconKey: v.optional(v.string()),
    progressValue: v.optional(v.number()),
    targetValue: v.optional(v.number()),
    unlockedAt: v.number(),
    isNew: v.boolean(), // Core state machine: controls frontend popup
    metadata: v.optional(v.record(v.string(), v.union(v.string(), v.number(), v.boolean()))),
  })
    .index('by_user', ['userId'])
    .index('by_user_and_new', ['userId', 'isNew'])
    .index('by_user_category_tier', ['userId', 'category', 'tier'])
    .index('by_user_badgeId', ['userId', 'badgeId']),

  daily_challenges: defineTable({
    date: v.string(),
    kind: v.union(
      v.literal('vocab_20'),
      v.literal('grammar_drill'),
      v.literal('listening_10min'),
      v.literal('typing_wpm')
    ),
    titleZh: v.string(),
    titleEn: v.string(),
    titleVi: v.string(),
    titleMn: v.string(),
    subZh: v.string(),
    subEn: v.string(),
    subVi: v.string(),
    subMn: v.string(),
    targetCount: v.number(),
    rewardXp: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_date', ['date']),

  user_daily_progress: defineTable({
    userId: v.id('users'),
    date: v.string(),
    challengeId: v.optional(v.id('daily_challenges')),
    currentCount: v.number(),
    completedAt: v.optional(v.number()),
    claimedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user_date', ['userId', 'date'])
    .index('by_user_claimedAt', ['userId', 'claimedAt']),

  community_activity_likes: defineTable({
    activityId: v.id('learning_events'),
    userId: v.id('users'),
    createdAt: v.number(),
  })
    .index('by_activity', ['activityId'])
    .index('by_user_activity', ['userId', 'activityId']),

  community_posts: defineTable({
    userId: v.id('users'),
    content: v.string(),
    type: v.union(
      v.literal('all'),
      v.literal('following'),
      v.literal('milestones'),
      v.literal('qa'),
      v.literal('resources')
    ),
    attachment: v.optional(
      v.object({
        type: v.string(), // e.g. "study_card"
        id: v.string(),
        title: v.string(),
        description: v.optional(v.string()),
      })
    ),
    images: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user_createdAt', ['userId', 'createdAt'])
    .index('by_type_createdAt', ['type', 'createdAt'])
    .index('by_createdAt', ['createdAt']),

  community_post_likes: defineTable({
    postId: v.id('community_posts'),
    userId: v.id('users'),
    createdAt: v.number(),
  })
    .index('by_post', ['postId'])
    .index('by_user_post', ['userId', 'postId']),

  community_comments: defineTable({
    postId: v.id('community_posts'),
    userId: v.id('users'),
    content: v.string(),
    createdAt: v.number(),
  }).index('by_post_createdAt', ['postId', 'createdAt']),

  qa_topics: defineTable({
    slug: v.string(),
    nameKey: v.string(),
    icon: v.string(),
    order: v.number(),
    isActive: v.boolean(),
  })
    .index('by_slug', ['slug'])
    .index('by_order', ['order']),

  qa_questions: defineTable({
    userId: v.id('users'),
    title: v.string(),
    content: v.string(),
    topicSlug: v.string(),
    answerCount: v.number(),
    voteScore: v.number(),
    viewCount: v.number(),
    acceptedAnswerId: v.optional(v.id('qa_answers')),
    isEdited: v.boolean(),
    editedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_topic_createdAt', ['topicSlug', 'createdAt'])
    .index('by_user_createdAt', ['userId', 'createdAt'])
    .index('by_voteScore', ['voteScore'])
    .index('by_createdAt', ['createdAt'])
    .searchIndex('search_title', { searchField: 'title', filterFields: ['topicSlug'] }),

  qa_answers: defineTable({
    questionId: v.id('qa_questions'),
    userId: v.id('users'),
    content: v.string(),
    voteScore: v.number(),
    isAccepted: v.boolean(),
    isEdited: v.boolean(),
    editedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_question_createdAt', ['questionId', 'createdAt'])
    .index('by_user_createdAt', ['userId', 'createdAt']),

  qa_votes: defineTable({
    userId: v.id('users'),
    target: v.union(v.literal('question'), v.literal('answer')),
    targetId: v.string(),
    value: v.number(),
    createdAt: v.number(),
  })
    .index('by_user_target', ['userId', 'target', 'targetId'])
    .index('by_target', ['target', 'targetId']),

  content_reports: defineTable({
    reporterId: v.id('users'),
    target: v.union(
      v.literal('question'),
      v.literal('answer'),
      v.literal('post'),
      v.literal('comment')
    ),
    targetId: v.string(),
    reason: v.string(),
    details: v.optional(v.string()),
    status: v.union(v.literal('open'), v.literal('resolved'), v.literal('dismissed')),
    createdAt: v.number(),
  }).index('by_status_createdAt', ['status', 'createdAt']),

  xp_logs: defineTable({
    userId: v.id('users'),
    amount: v.number(),
    source: v.union(
      v.literal('FSRS_REVIEW'),
      v.literal('TYPING_TEST'),
      v.literal('PODCAST'),
      v.literal('TOPIK_MOCK'),
      v.literal('DAILY_CHALLENGE'),
      v.literal('ACHIEVEMENT')
    ),
    timestamp: v.number(),
  }).index('by_user_timestamp', ['userId', 'timestamp']),

  user_xp_stats: defineTable({
    userId: v.id('users'),
    weekIdentifier: v.string(), // Format: "YYYY-Wxx" (e.g., "2024-W10")
    currentWeekXp: v.number(),
    totalXp: v.number(),
  })
    .index('by_user_week', ['userId', 'weekIdentifier'])
    .index('by_week_and_xp', ['weekIdentifier', 'currentWeekXp']),

  friendships: defineTable({
    followerId: v.id('users'),
    followingId: v.id('users'),
    createdAt: v.number(),
  })
    .index('by_follower', ['followerId'])
    .index('by_following', ['followingId'])
    .index('by_both', ['followerId', 'followingId']),

  referral_codes: defineTable({
    userId: v.id('users'),
    code: v.string(), // Globally unique
    totalInvites: v.number(),
  })
    .index('by_code', ['code'])
    .index('by_user', ['userId']),

  referral_rewards: defineTable({
    referrerId: v.id('users'),
    referredId: v.id('users'),
    rewardGranted: v.boolean(),
    createdAt: v.number(),
  }).index('by_referrer', ['referrerId']),

  // ───────────────────────────────────────────
  // TOPIK II Writing Exam Tables
  // ───────────────────────────────────────────

  // Writing questions (fill-blank, graph essay, opinion essay)
  topik_writing_questions: defineTable({
    examId: v.id('topik_exams'),
    number: v.number(),
    questionType: WRITING_QUESTION_TYPE_VALIDATOR,
    instruction: v.optional(v.string()),
    contextBox: v.optional(v.string()),
    image: v.optional(v.string()),
    score: v.number(),
    modelAnswer: v.optional(v.string()),
    gradingCriteria: v.optional(WRITING_GRADING_CRITERIA_VALIDATOR),
  })
    .index('by_exam', ['examId'])
    .index('by_exam_number', ['examId', 'number']),

  // User writing sessions (one session per user per exam attempt)
  topik_writing_sessions: defineTable({
    userId: v.id('users'),
    examId: v.id('topik_exams'),
    status: v.string(), // "IN_PROGRESS" | "COMPLETED" | "EVALUATING" | "EVALUATED"
    answers: v.optional(WRITING_ANSWER_MAP_VALIDATOR),
    startTime: v.number(),
    endTime: v.number(),
    completedAt: v.optional(v.number()),
    totalScore: v.optional(v.number()),
  })
    .index('by_user', ['userId'])
    .index('by_user_exam', ['userId', 'examId'])
    .index('by_status', ['status']),

  // AI evaluation results per question per session
  topik_writing_evaluations: defineTable({
    sessionId: v.id('topik_writing_sessions'),
    userId: v.id('users'),
    questionNumber: v.number(),
    score: v.number(),
    dimensions: v.object({
      taskAccomplishment: v.number(),
      developmentStructure: v.number(),
      languageUse: v.number(),
      wongojiRules: v.optional(v.number()),
    }),
    feedbackText: v.string(),
    correctedText: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_session', ['sessionId'])
    .index('by_user', ['userId']),

  // Korean Items (Polyglot feature)
  koreanItems: defineTable({
    korean: v.string(),
    romanization: v.optional(v.string()),
    translations: v.optional(
      v.object({
        zh: v.optional(v.string()),
        en: v.optional(v.string()),
        mn: v.optional(v.string()),
        vi: v.optional(v.string()),
      })
    ),
    category: v.optional(v.string()),
    createdAt: v.optional(v.number()),
  }),

  // User Settings (Global Device Syncing)
  user_settings: defineTable({
    userId: v.id('users'),
    // App level
    displayLanguage: v.optional(
      v.union(v.literal('en'), v.literal('zh'), v.literal('vi'), v.literal('mn'))
    ),

    // Flashcard defaults
    flashcardAutoTTS: v.optional(v.boolean()),
    flashcardFront: v.optional(v.union(v.literal('KOREAN'), v.literal('NATIVE'))),
    flashcardRatingMode: v.optional(v.union(v.literal('PASS_FAIL'), v.literal('FOUR_BUTTONS'))),

    // Listening & Dictation defaults
    listenPlayMeaning: v.optional(v.boolean()),
    listenPlayExampleTranslation: v.optional(v.boolean()),
    audioRepeatCount: v.optional(
      v.union(v.literal(1), v.literal(2), v.literal(3), v.literal('INFINITE'))
    ),
    audioSpeed: v.optional(v.union(v.literal(0.8), v.literal(1), v.literal(1.2), v.literal(1.4))),
    mediaShowTranslation: v.optional(v.boolean()),
    mediaSubtitleMode: v.optional(v.union(v.literal('SOURCE_ONLY'), v.literal('BILINGUAL'))),
    mediaAutoScroll: v.optional(v.boolean()),
    fontScale: v.optional(
      v.union(v.literal('compact'), v.literal('comfortable'), v.literal('relaxed'))
    ),
    dictationPlayCount: v.optional(v.union(v.literal(1), v.literal(2), v.literal(3))),
    dictationGapSeconds: v.optional(
      v.union(v.literal(2), v.literal(4), v.literal(6), v.literal(8))
    ),
    dictationAutoNext: v.optional(v.boolean()),
    dailyGoalMinutes: v.optional(
      v.union(v.literal(15), v.literal(20), v.literal(30), v.literal(45), v.literal(60))
    ),
    topikFilterType: v.optional(
      v.union(v.literal('ALL'), v.literal('READING'), v.literal('LISTENING'))
    ),
    vocabActiveTab: v.optional(v.union(v.literal('courses'), v.literal('my-vocab'))),
    grammarAiPanelOpen: v.optional(v.boolean()),
    routeFavorites: v.optional(v.array(v.string())),
    privacy: v.optional(
      v.object({
        profileVisibility: v.optional(
          v.union(v.literal('public'), v.literal('friends'), v.literal('private'))
        ),
        leaderboardOptOut: v.optional(v.boolean()),
      })
    ),

    updatedAt: v.number(),
  }).index('by_user', ['userId']),

  // Reading Library Tables
  reading_library_books,
  reading_library_chapters,
  reading_library_progress,

  /**
   * In-app notifications (E3).
   *
   * One row per delivered notification. The UI queries `notifications:listUnread`
   * to show the bell badge and `notifications:listRecent` for the panel.
   * Creation happens server-side from scheduled actions (streak reminders,
   * exam countdowns) and from application mutations (partner milestones).
   */
  notifications: defineTable({
    userId: v.id('users'),
    kind: v.union(
      v.literal('streak_reminder'),
      v.literal('exam_countdown'),
      v.literal('partner_milestone'),
      v.literal('achievement_unlocked'),
      v.literal('answer_received'),
      v.literal('answer_accepted'),
      v.literal('mention'),
      v.literal('friend_activity'),
      v.literal('friend_request'),
      v.literal('friend_accepted'),
      v.literal('group_invite'),
      v.literal('group_accepted')
    ),
    category: v.optional(
      v.union(v.literal('learning'), v.literal('exam'), v.literal('social'), v.literal('system'))
    ),
    priority: v.optional(v.union(v.literal('low'), v.literal('normal'), v.literal('high'))),
    title: v.string(),
    body: v.string(),
    /** Optional deep-link the UI should navigate to when tapped. */
    linkPath: v.optional(v.string()),
    /** Free-form metadata (examId, streakDays, partnerId, etc.). */
    metadata: v.optional(v.record(v.string(), v.union(v.string(), v.number(), v.boolean()))),
    readAt: v.optional(v.number()),
    deliveredAt: v.optional(v.number()),
    pushSentAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_user_createdAt', ['userId', 'createdAt'])
    .index('by_user_read', ['userId', 'readAt']),

  notification_preferences: defineTable({
    userId: v.id('users'),
    enabled: v.boolean(),
    inAppEnabled: v.boolean(),
    pwaEnabled: v.boolean(),
    learningEnabled: v.boolean(),
    examEnabled: v.boolean(),
    socialEnabled: v.boolean(),
    systemEnabled: v.boolean(),
    dailyReminderLocalTime: v.string(), // HH:mm
    timezone: v.string(), // IANA timezone (e.g. Asia/Seoul)
    quietHoursEnabled: v.boolean(),
    quietHoursStart: v.string(), // HH:mm
    quietHoursEnd: v.string(), // HH:mm
    updatedAt: v.number(),
    createdAt: v.number(),
  }).index('by_user', ['userId']),

  push_subscriptions: defineTable({
    userId: v.id('users'),
    platform: v.optional(v.union(v.literal('web'), v.literal('android'), v.literal('ios'))),
    endpoint: v.optional(v.string()),
    p256dh: v.optional(v.string()),
    auth: v.optional(v.string()),
    fcmToken: v.optional(v.string()),
    expirationTime: v.optional(v.number()),
    userAgent: v.optional(v.string()),
    lastSeenAt: v.number(),
    revokedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_endpoint', ['userId', 'endpoint'])
    .index('by_endpoint', ['endpoint'])
    .index('by_user_fcmToken', ['userId', 'fcmToken'])
    .index('by_fcmToken', ['fcmToken']),

  /**
   * Study partnerships (D4).
   *
   * A pending / active / ended link between two learners. `userA` is the
   * inviter, `userB` is the invitee. The UI renders the active partnership
   * as a "Study buddy" card showing combined streak + today's shared study
   * minutes.
   */
  studyPartnerships: defineTable({
    userA: v.id('users'),
    userB: v.id('users'),
    status: v.union(v.literal('pending'), v.literal('active'), v.literal('ended')),
    startedAt: v.number(),
    acceptedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
  })
    .index('by_userA_status', ['userA', 'status'])
    .index('by_userB_status', ['userB', 'status']),

  // ───────────────────────────────────────────
  // Study groups MVP (community v2)
  // ───────────────────────────────────────────

  study_groups: defineTable({
    name: v.string(),
    ownerId: v.id('users'),
    description: v.optional(v.string()),
    memberCount: v.number(),
    createdAt: v.number(),
  })
    .index('by_owner', ['ownerId'])
    .index('by_createdAt', ['createdAt']),

  study_group_members: defineTable({
    groupId: v.id('study_groups'),
    userId: v.id('users'),
    role: v.union(v.literal('owner'), v.literal('member')),
    joinedAt: v.number(),
  })
    .index('by_group', ['groupId'])
    .index('by_user', ['userId'])
    .index('by_group_user', ['groupId', 'userId']),

  study_group_invites: defineTable({
    groupId: v.id('study_groups'),
    inviterId: v.id('users'),
    inviteeId: v.id('users'),
    status: v.union(v.literal('pending'), v.literal('accepted'), v.literal('declined')),
    createdAt: v.number(),
    respondedAt: v.optional(v.number()),
  })
    .index('by_invitee_status', ['inviteeId', 'status'])
    .index('by_group', ['groupId'])
    .index('by_group_invitee', ['groupId', 'inviteeId']),

  // ───────────────────────────────────────────
  // League tiers (community v2)
  // ───────────────────────────────────────────

  league_memberships: defineTable({
    weekIdentifier: v.string(),
    userId: v.id('users'),
    tier: v.union(
      v.literal('bronze'),
      v.literal('silver'),
      v.literal('gold'),
      v.literal('diamond')
    ),
    cohortId: v.string(), // "{weekIdentifier}:{tier}:{cohortNum}"
    weeklyXpSnapshot: v.number(), // refreshed at settlement / kept in sync via xp.ts hook
  })
    .index('by_week_user', ['weekIdentifier', 'userId'])
    .index('by_user_week', ['userId', 'weekIdentifier'])
    .index('by_cohort_xp', ['cohortId', 'weeklyXpSnapshot']),

  league_settlements: defineTable({
    weekIdentifier: v.string(),
    settledAt: v.number(),
    nextWeekPrepared: v.boolean(),
    usersProcessed: v.number(),
  }).index('by_week', ['weekIdentifier']),

  // ───────────────────────────────────────────
  // P1: TOPIK Writing Coach MVP
  // ───────────────────────────────────────────

  topik_writing_attempts: defineTable({
    userId: v.id('users'),
    taskType: v.string(), // e.g., "51", "52", "53", "54"
    prompt: v.string(),
    userAnswer: v.string(),
    estimatedScore: v.optional(v.number()),
    scoreBand: v.optional(v.string()), // e.g., "Level 3", "Level 4"
    feedbackSummary: v.optional(v.string()),
    improvedVersion: v.optional(v.string()),
    fullFeedbackJson: v.optional(v.string()), // Stringified JSON for flexibility
    generatedBy: v.optional(v.string()), // AI model name
    promptVersion: v.optional(v.string()),
    confidence: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_user_createdAt', ['userId', 'createdAt'])
    .index('by_user_taskType', ['userId', 'taskType']),

  user_mistakes: defineTable({
    userId: v.id('users'),
    sourceType: v.string(), // "TOPIK_WRITING" | "TEXT_IMPORT" | "TYPING"
    sourceId: v.optional(v.string()), // ID of the attempt or content
    errorType: v.string(), // Legacy: "GRAMMAR" | "VOCAB" | "SPELLING" | "WONG_OJI"
    errorTypeKagas: v.optional(v.string()), // KAGAS fine-grained: "JOSA_ERR" | "EOMI_ERR" | etc.
    originalText: v.string(),
    correctedText: v.string(),
    explanationZh: v.string(),
    severity: v.optional(v.union(v.literal('LOW'), v.literal('MEDIUM'), v.literal('HIGH'))),
    relatedWordId: v.optional(v.id('words')),
    relatedGrammarId: v.optional(v.id('grammar_points')),
    relatedGrammarPattern: v.optional(v.string()),
    status: v.string(), // "ACTIVE" | "REVIEWED" | "FIXED"
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user_status', ['userId', 'status'])
    .index('by_user_source', ['userId', 'sourceType'])
    .index('by_user_errorType', ['userId', 'errorType'])
    .index('by_user_errorTypeKagas', ['userId', 'errorTypeKagas'])
    .index('by_user_createdAt', ['userId', 'createdAt']),

  // ───────────────────────────────────────────
  // P1: TOPIK Coach Deep Modules
  // ───────────────────────────────────────────

  /** TOPIK writing score predictions based on recent evaluations */
  topik_score_predictions: defineTable({
    userId: v.id('users'),
    /** Predicted total writing score (0-100) */
    predictedTotal: v.number(),
    /** Per-dimension breakdown */
    dimensionBreakdown: v.object({
      taskAccomplishment: v.number(),
      developmentStructure: v.number(),
      languageUse: v.number(),
      wongojiRules: v.number(),
    }),
    /** Prediction confidence (0-1) */
    confidence: v.number(),
    /** Which attempt IDs were used to generate this prediction */
    basedOnAttemptIds: v.array(v.string()),
    /** Number of attempts used */
    attemptCount: v.number(),
    generatedAt: v.number(),
  }).index('by_user_generatedAt', ['userId', 'generatedAt']),

  /** Personalized TOPIK improvement plans */
  topik_improvement_plans: defineTable({
    userId: v.id('users'),
    /** Target TOPIK writing level (3-6) */
    targetLevel: v.number(),
    /** Target date (optional) */
    targetDate: v.optional(v.number()),
    /** Top weak KAGAS error codes to focus on */
    weakErrorCodes: v.array(v.string()),
    /** Weekly task recommendations */
    weeklyTasks: v.array(
      v.object({
        week: v.number(),
        focus: v.string(),
        tasks: v.array(
          v.object({
            description: v.string(),
            taskType: v.optional(v.string()),
            targetCount: v.number(),
            priority: v.number(),
          })
        ),
      })
    ),
    /** Current status */
    status: v.string(), // "active" | "completed" | "abandoned"
    generatedAt: v.number(),
    updatedAt: v.number(),
  }).index('by_user_status', ['userId', 'status']),

  // ───────────────────────────────────────────
  // P1: AI Quality Gate (Draft Tables)
  // ───────────────────────────────────────────

  /** AI-generated word enrichment drafts awaiting review */
  ai_word_enrichment_drafts: defineTable({
    wordId: v.optional(v.id('words')),
    candidateLemma: v.string(),
    payload: LooseJsonDeepValueValidator, // Proposed enrichment data (senses, examples, etc.)
    modelVersion: v.string(),
    promptVersion: v.string(),
    confidence: v.number(),
    reviewStatus: v.string(), // "pending" | "approved" | "rejected"
    reviewedBy: v.optional(v.id('users')),
    reviewedAt: v.optional(v.number()),
    generationBatchId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_status', ['reviewStatus'])
    .index('by_word', ['wordId']),

  /** AI-generated grammar explanation drafts awaiting review */
  ai_grammar_explanation_drafts: defineTable({
    grammarPointId: v.optional(v.id('grammar_points')),
    candidatePattern: v.string(),
    payload: LooseJsonDeepValueValidator,
    modelVersion: v.string(),
    promptVersion: v.string(),
    confidence: v.number(),
    reviewStatus: v.string(),
    reviewedBy: v.optional(v.id('users')),
    reviewedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_status', ['reviewStatus'])
    .index('by_grammar', ['grammarPointId']),

  /** AI-generated sentence explanation drafts awaiting review */
  ai_sentence_explanation_drafts: defineTable({
    sentenceId: v.optional(v.id('content_sentences')),
    textHash: v.string(),
    payload: LooseJsonDeepValueValidator,
    modelVersion: v.string(),
    promptVersion: v.string(),
    confidence: v.number(),
    reviewStatus: v.string(),
    reviewedBy: v.optional(v.id('users')),
    reviewedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_status', ['reviewStatus'])
    .index('by_textHash', ['textHash']),

  // ───────────────────────────────────────────
  // P1: Text Import Learning MVP
  // ───────────────────────────────────────────

  imported_contents: defineTable({
    userId: v.id('users'),
    title: v.string(),
    rawText: v.string(),
    cleanedText: v.optional(v.string()), // Cleaned/normalized text
    summaryZh: v.optional(v.string()),
    sourceType: v.string(), // "USER_PASTE" | "URL"
    sourceUrl: v.optional(v.string()), // Original URL for URL imports
    tags: v.optional(v.array(v.string())),
    folderName: v.optional(v.string()),
    difficultyLevel: v.optional(v.string()), // "TOPIK 1" - "TOPIK 6"
    difficultyReason: v.optional(v.array(v.string())), // Explanation of difficulty assessment
    estimatedMinutes: v.optional(v.number()),
    wordCount: v.optional(v.number()),
    sentenceCount: v.optional(v.number()),
    status: v.optional(v.string()), // "pending" | "processed" | "error"
    licenseRisk: v.optional(v.string()), // "low" | "medium" | "high" | "unknown"
    processedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_user_createdAt', ['userId', 'createdAt'])
    .index('by_status', ['status'])
    .searchIndex('search_title', { searchField: 'title', filterFields: ['userId'] }),

  /** Persisted weekly reports (avoid repeated computation) */
  weekly_reports: defineTable({
    userId: v.id('users'),
    weekKey: v.string(), // "YYYY-Www" format (e.g. "2026-W20")
    data: v.object({
      studyMinutes: v.number(),
      wordsLearned: v.number(),
      sentencesSaved: v.number(),
      grammarLearned: v.number(),
      reviewAccuracy: v.number(),
      weakAreas: v.array(v.string()),
      nextWeekFocus: v.array(v.string()),
      topikProgress: v.optional(WeeklyReportTopikProgressValidator),
      kagasErrorSummary: v.optional(WeeklyReportKagasErrorSummaryValidator),
    }),
    generatedAt: v.number(),
  }).index('by_user_week', ['userId', 'weekKey']),

  /** Kiwi user dictionary for custom words (P1 — external/slang coverage) */
  kiwi_user_dictionary: defineTable({
    surface: v.string(),
    pos: v.string(),
    lemma: v.string(),
    meaningHint: v.optional(v.string()),
    source: v.string(), // "admin" | "user_request" | "auto_extracted"
    active: v.boolean(),
    createdAt: v.number(),
  })
    .index('by_surface', ['surface'])
    .index('by_active', ['active']),

  // ───────────────────────────────────────────
  // P2: Recommendation Engine
  // ───────────────────────────────────────────

  /** Tracks recommendation interactions for personalization */
  recommendation_log: defineTable({
    userId: v.id('users'),
    /** The recommendation kind shown (matches NextBestActionKind) */
    actionKind: v.string(),
    /** What module was suggested (VOCAB, READING, GRAMMAR, etc.) */
    module: v.string(),
    /** The reason code from the recommendation engine */
    reasonCode: v.string(),
    /** User's response to the recommendation */
    interaction: v.string(), // "shown" | "clicked" | "skipped" | "completed"
    /** Optional content ID if the recommendation pointed to specific content */
    contentId: v.optional(v.string()),
    /** Client-reported local hour when shown (0-23) */
    localHour: v.optional(v.number()),
    /** Time spent on the recommended activity (ms), if completed */
    engagementMs: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_user_createdAt', ['userId', 'createdAt'])
    .index('by_user_module', ['userId', 'module'])
    .index('by_user_interaction', ['userId', 'interaction']),

  // ───────────────────────────────────────────
  // P2: Ability Profiler
  // ───────────────────────────────────────────

  /** Periodic snapshots of learner ability across dimensions */
  ability_snapshots: defineTable({
    userId: v.id('users'),
    /** Snapshot timestamp */
    takenAt: v.number(),
    /** Overall proficiency estimate (0-100) */
    overallScore: v.number(),
    /** Per-dimension scores for radar chart */
    dimensions: v.object({
      vocabulary: v.number(), // 0-100
      grammar: v.number(), // 0-100
      reading: v.number(), // 0-100
      writing: v.number(), // 0-100
      listening: v.number(), // 0-100
    }),
    /** Estimated TOPIK level (1-6) based on aggregate performance */
    estimatedTopikLevel: v.optional(v.number()),
    /** Raw data counts used to compute this snapshot */
    dataCounts: v.optional(
      v.object({
        vocabItems: v.number(),
        grammarItems: v.number(),
        readingAttempts: v.number(),
        writingAttempts: v.number(),
        listeningAttempts: v.number(),
      })
    ),
    /** Trigger: "manual" | "weekly_auto" | "milestone" */
    trigger: v.string(),
  }).index('by_user_takenAt', ['userId', 'takenAt']),

  // ───────────────────────────────────────────
  // P2: Community Learning Insights
  // ───────────────────────────────────────────

  /** Aggregated anonymous community stats (computed periodically) */
  community_stats: defineTable({
    /** The stat type: "hardest_words" | "common_errors" | "trending_content" | "daily_summary" */
    statType: v.string(),
    /** Time period this stat covers */
    periodStart: v.number(),
    periodEnd: v.number(),
    /** Aggregated data payload (structure varies by statType) */
    data: CommunityStatDataValidator,
    /** Number of unique users in this aggregation */
    sampleSize: v.number(),
    computedAt: v.number(),
  }).index('by_type_period', ['statType', 'periodStart']),

  // ───────────────────────────────────────────
  // P2: Semantic Embeddings (BGE-M3)
  // ───────────────────────────────────────────

  /** Stores dense embedding vectors for semantic search */
  content_embeddings: defineTable({
    /** Source table: "content_sentences" | "user_saved_sentences" | "grammar_points" | "words" */
    sourceTable: v.string(),
    /** ID of the source document */
    sourceId: v.string(),
    /** The text that was embedded */
    text: v.string(),
    /** Hash to avoid duplicate embeddings */
    textHash: v.string(),
    /** BGE-M3 dense embedding vector (384 dimensions) */
    embedding: v.array(v.float64()),
    /** Model identifier */
    model: v.string(),
    createdAt: v.number(),
  })
    .index('by_source', ['sourceTable', 'sourceId'])
    .index('by_textHash', ['textHash'])
    .vectorIndex('by_embedding', {
      vectorField: 'embedding',
      dimensions: 384,
      filterFields: ['sourceTable'],
    }),

  // ───────────────────────────────────────────
  // P2: Speaking Coach
  // ───────────────────────────────────────────

  /** A speaking practice session */
  speaking_sessions: defineTable({
    userId: v.id('users'),
    /** Practice mode: "shadowing" | "read_aloud" | "free_talk" | "pronunciation" */
    mode: v.string(),
    /** Target sentence/text the user is practicing */
    targetText: v.string(),
    /** Source of the target: "manual" | "sentence_saved" | "reading_article" | "grammar_example" */
    source: v.optional(v.string()),
    sourceRefId: v.optional(v.string()),
    /** Number of attempts in this session */
    attemptCount: v.number(),
    /** Best accuracy score across attempts (0-100) */
    bestAccuracy: v.optional(v.number()),
    /** Total session duration in seconds */
    durationSec: v.optional(v.number()),
    /** Session status */
    status: v.string(), // "active" | "completed" | "abandoned"
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user_createdAt', ['userId', 'createdAt'])
    .index('by_user_mode', ['userId', 'mode']),

  /** Individual pronunciation attempt within a session */
  pronunciation_scores: defineTable({
    userId: v.id('users'),
    sessionId: v.id('speaking_sessions'),
    /** The target text for this attempt */
    targetText: v.string(),
    /** What the ASR recognized */
    recognizedText: v.string(),
    /** Character-level accuracy (0-100) */
    accuracy: v.number(),
    /** Detailed per-syllable feedback (optional, from analysis) */
    syllableFeedback: v.optional(
      v.array(
        v.object({
          target: v.string(),
          recognized: v.string(),
          correct: v.boolean(),
          /** Phonological rule that applies: "liaison" | "nasalization" | "aspiration" | "palatalization" | "tensification" | "none" */
          phoneticRule: v.optional(v.string()),
        })
      )
    ),
    /** Common pronunciation issues detected */
    issues: v.optional(v.array(v.string())),
    /** Duration of this attempt in seconds */
    durationSec: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_session', ['sessionId'])
    .index('by_user_createdAt', ['userId', 'createdAt']),

  // ───────────────────────────────────────────
  // P2: Commercialization
  // ───────────────────────────────────────────

  /** Subscription plan definitions (admin-managed) */
  subscription_plans: defineTable({
    planKey: v.string(), // "free" | "basic" | "pro" | "lifetime"
    nameZh: v.string(),
    nameEn: v.optional(v.string()),
    nameVi: v.optional(v.string()),
    nameMn: v.optional(v.string()),
    features: v.array(v.string()),
    monthlyPrice: v.number(), // in KRW (0 for free)
    annualPrice: v.optional(v.number()),
    lifetimePrice: v.optional(v.number()),
    isActive: v.boolean(),
    sortOrder: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_planKey', ['planKey'])
    .index('by_active', ['isActive']),

  /** Feature-level entitlement rules per plan */
  feature_entitlements: defineTable({
    planKey: v.string(),
    featureKey: v.string(), // "ai_explain" | "writing_coach" | "content_import" etc.
    dailyQuota: v.optional(v.number()),
    monthlyQuota: v.optional(v.number()),
    unlimited: v.boolean(),
  })
    .index('by_planKey', ['planKey'])
    .index('by_feature', ['featureKey']),

  /** AI cost attribution per user per feature */
  ai_cost_attributions: defineTable({
    userId: v.id('users'),
    feature: v.string(), // "sentence_explain" | "writing_coach" | "reading_analysis"
    costUsd: v.number(),
    tokensUsed: v.optional(v.number()),
    date: v.string(), // "YYYY-MM-DD"
    createdAt: v.number(),
  })
    .index('by_user_date', ['userId', 'date'])
    .index('by_feature_date', ['feature', 'date']),

  /** Paywall impression and conversion tracking */
  paywall_impressions: defineTable({
    userId: v.id('users'),
    trigger: v.string(), // "quota_exceeded" | "premium_feature" | "manual_upgrade"
    feature: v.string(),
    planSuggested: v.string(),
    converted: v.boolean(),
    convertedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_trigger', ['trigger']),

  // ───────────────────────────────────────────
  // P2: Learning Challenges
  // ───────────────────────────────────────────

  /** Time-limited learning challenges (weekly/monthly) */
  learning_challenges: defineTable({
    challengeKey: v.string(),
    title: v.string(),
    titleZh: v.optional(v.string()),
    description: v.optional(v.string()),
    scope: v.string(), // "global" | "league" | "personal"
    goalType: v.string(), // "study_minutes" | "words_learned" | "reviews_completed" | "writing_score"
    goalTarget: v.number(),
    startAt: v.number(),
    endAt: v.number(),
    rewardType: v.string(), // "badge" | "xp_bonus" | "title"
    rewardPayload: v.optional(LooseJsonValueValidator),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index('by_active', ['isActive'])
    .index('by_scope_startAt', ['scope', 'startAt']),

  /** User participation in learning challenges */
  user_challenge_participation: defineTable({
    userId: v.id('users'),
    challengeId: v.id('learning_challenges'),
    progress: v.number(),
    completedAt: v.optional(v.number()),
    rewardClaimed: v.optional(v.boolean()),
    joinedAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_challenge', ['challengeId']),

  // ───────────────────────────────────────────
  // P0: User Reading Progress (PRD section 19.3)
  // ───────────────────────────────────────────

  /** Tracks per-content reading position and stats for resume support */
  user_reading_progress: defineTable({
    userId: v.id('users'),
    contentType: v.string(), // "textbook_unit" | "news_article" | "imported_content" | "reading_book"
    contentId: v.string(), // Reference to the content document
    lastSentenceId: v.optional(v.string()), // ID or index of last read sentence
    lastSentenceIndex: v.optional(v.number()),
    completedSentenceCount: v.optional(v.number()),
    totalSentenceCount: v.optional(v.number()),
    savedWordCount: v.optional(v.number()),
    savedSentenceCount: v.optional(v.number()),
    readingTimeSeconds: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user_content', ['userId', 'contentType', 'contentId'])
    .index('by_user_updatedAt', ['userId', 'updatedAt']),

  // ───────────────────────────────────────────
  // P0: AI Content Feedback (PRD section 20.2)
  // ───────────────────────────────────────────

  /** User feedback on AI-generated content quality */
  ai_content_feedback: defineTable({
    userId: v.id('users'),
    targetType: v.string(), // "sentence_explanation" | "word_enrichment" | "grammar_explanation" | "writing_feedback"
    targetId: v.string(), // ID of the AI-generated content
    feedbackType: v.string(), // "translation_wrong" | "grammar_wrong" | "word_wrong" | "missing_info" | "other"
    comment: v.optional(v.string()), // Optional user comment
    status: v.optional(v.string()), // "open" | "resolved" | "dismissed"
    resolvedBy: v.optional(v.id('users')),
    resolvedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_target', ['targetType', 'targetId'])
    .index('by_status', ['status']),
});
