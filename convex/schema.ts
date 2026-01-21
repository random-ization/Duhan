import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';
import { authTables } from '@convex-dev/auth/server';

export default defineSchema({
  ...authTables,
  // Users (Mirrors User model)
  // Users (Merged with Auth)
  users: defineTable({
    email: v.string(),
    password: v.optional(v.string()), // Made optional for OAuth users
    name: v.optional(v.string()),
    image: v.optional(v.string()), // Added for Auth compatibility
    emailVerificationTime: v.optional(v.number()), // Added for Auth compatibility
    phone: v.optional(v.string()), // Added for Auth compatibility
    phoneVerificationTime: v.optional(v.number()), // Added for Auth compatibility
    isAnonymous: v.optional(v.boolean()), // Added for Auth compatibility

    role: v.optional(v.string()), // "STUDENT" | "ADMIN"
    tier: v.optional(v.string()),
    subscriptionType: v.optional(v.string()), // "MONTHLY", "ANNUAL", "LIFETIME"
    subscriptionExpiry: v.optional(v.string()), // ISO Date or timestamp string
    avatar: v.optional(v.string()),

    // Auth
    googleId: v.optional(v.string()),
    token: v.optional(v.string()), // Session token
    isVerified: v.optional(v.boolean()),

    // Progress pointers
    lastInstitute: v.optional(v.string()),
    lastLevel: v.optional(v.number()),
    lastUnit: v.optional(v.number()),
    lastModule: v.optional(v.string()), // Added
    postgresId: v.optional(v.string()),

    // Password Reset
    resetToken: v.optional(v.string()),
    resetTokenExpires: v.optional(v.number()),

    // Email Verification
    verifyCode: v.optional(v.string()),

    createdAt: v.optional(v.number()),
  })
    .index('email', ['email']) // Renamed from by_email for @convex-dev/auth compatibility
    .index('by_googleId', ['googleId'])
    .index('by_token', ['token']) // Security index
    .index('by_postgresId', ['postgresId']),

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

    // JSON data
    transcriptData: v.optional(
      v.array(
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
      )
    ),
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

  // Words (Master Dictionary)
  words: defineTable({
    word: v.string(),
    meaning: v.string(), // Chinese meaning (primary)
    partOfSpeech: v.string(),

    // Multi-language meanings
    meaningEn: v.optional(v.string()), // English
    meaningVi: v.optional(v.string()), // Vietnamese
    meaningMn: v.optional(v.string()), // Mongolian

    hanja: v.optional(v.string()),
    pronunciation: v.optional(v.string()),
    audioUrl: v.optional(v.string()),

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
    .index('by_postgresId', ['postgresId']),

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
  })
    .index('by_user_word', ['userId', 'wordId'])
    .index('by_user_next_review', ['userId', 'nextReviewAt'])
    .index('by_user_due', ['userId', 'due'])
    .index('by_user', ['userId']),

  // Grammar Points (Master Library)
  grammar_points: defineTable({
    title: v.string(),
    slug: v.optional(v.string()),
    searchKey: v.optional(v.string()),

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

    conjugationRules: v.optional(v.any()), // Map<string, string> - keeping any as Convex lacks v.record
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
    .index('by_postgresId', ['postgresId'])
    .searchIndex('search_title', { searchField: 'title' }),

  // Course Grammar (Linking Grammar to Courses)
  course_grammars: defineTable({
    courseId: v.string(),
    unitId: v.number(),
    grammarId: v.id('grammar_points'),

    displayOrder: v.number(),
    customNote: v.optional(v.string()),
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

    // Data
    text: v.string(),
    note: v.optional(v.string()),
    color: v.optional(v.string()),

    startOffset: v.optional(v.number()),
    endOffset: v.optional(v.number()),
    sentenceIndex: v.optional(v.number()),

    createdAt: v.number(),
  })
    .index('by_user_context', ['userId', 'contextKey'])
    .index('by_user', ['userId']),

  // Videos
  videos: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    videoUrl: v.string(),
    thumbnailUrl: v.optional(v.string()),

    level: v.string(), // Beginner, Intermediate, Advanced
    duration: v.optional(v.number()),
    views: v.number(),

    transcriptData: v.optional(
      v.array(
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
      )
    ),

    postgresId: v.optional(v.string()),
    youtubeId: v.optional(v.string()),

    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  }).index('by_level', ['level']),

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
    .index('by_pubDate', ['pubDate']),

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
    .index('by_user_episode', ['userId', 'episodeGuid']),

  // User Course Progress (Completed Units)
  user_course_progress: defineTable({
    userId: v.id('users'),
    courseId: v.string(), // Institute ID
    completedUnits: v.array(v.number()), // Array of completed unit indexes
    lastAccessAt: v.number(),
    createdAt: v.number(),
  })
    .index('by_user_course', ['userId', 'courseId'])
    .index('by_user', ['userId']),

  // Notebooks (User Notes)
  notebooks: defineTable({
    userId: v.id('users'),
    type: v.string(), // "WORD", "GRAMMAR", "NOTE", etc.
    title: v.string(),
    content: v.any(), // Rich text content (likely JSON)
    preview: v.optional(v.string()),
    tags: v.array(v.string()),
    createdAt: v.number(),
  })
    .index('by_user', ['userId'])
    .index('by_user_type', ['userId', 'type']),

  // TOPIK Exams (Metadata)
  topik_exams: defineTable({
    legacyId: v.string(), // Original ID like "exam-1704067200000"
    title: v.string(),
    round: v.number(), // e.g., 35
    type: v.string(), // "READING" | "LISTENING"
    paperType: v.optional(v.string()), // "A" | "B"
    timeLimit: v.number(), // Minutes
    audioUrl: v.optional(v.string()), // S3 URL for listening exams
    description: v.optional(v.string()),
    isPaid: v.boolean(),
    createdAt: v.number(),
  })
    .index('by_legacy_id', ['legacyId'])
    .index('by_round', ['round'])
    .index('by_type', ['type']),

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
    score: v.number(),
    totalQuestions: v.number(),
    sectionScores: v.optional(v.any()), // Map<string, number>
    duration: v.optional(v.number()),
    answers: v.optional(v.any()), // Map<string, number>
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
    createdAt: v.number(),
  })
    .index('by_createdAt', ['createdAt'])
    .index('by_feature', ['feature']),

  // Activity Logs
  activity_logs: defineTable({
    userId: v.id('users'),
    activityType: v.string(),
    duration: v.optional(v.number()),
    itemsStudied: v.optional(v.number()),
    metadata: v.optional(v.any()), // Dynamic metadata
    createdAt: v.number(),
  }).index('by_user', ['userId']),

  // Exam Sessions (Active timer tracking)
  exam_sessions: defineTable({
    userId: v.id('users'),
    examId: v.id('topik_exams'),
    status: v.string(), // "IN_PROGRESS" | "COMPLETED" | "AUTO_SUBMITTED"
    startTime: v.number(), // timestamp
    endTime: v.number(), // calculated: startTime + exam.timeLimit
    answers: v.optional(v.any()), // Map<string, number>
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

  // Global Site Settings
  site_settings: defineTable({
    key: v.string(), // "logo", "theme", "meta"
    value: v.any(),
    updatedAt: v.number(),
  }).index('by_key', ['key']),
});
