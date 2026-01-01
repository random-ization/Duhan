import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    // Users (Mirrors User model)
    users: defineTable({
        email: v.string(),
        password: v.string(), // Consider hashed
        name: v.string(),
        role: v.string(), // "STUDENT" | "ADMIN"
        tier: v.string(),
        avatar: v.optional(v.string()),

        // Auth
        googleId: v.optional(v.string()),
        token: v.optional(v.string()), // Session token
        isVerified: v.boolean(),

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

        createdAt: v.number(),
    }).index("by_email", ["email"])
        .index("by_googleId", ["googleId"])
        .index("by_token", ["token"]) // Security index
        .index("by_postgresId", ["postgresId"]),

    // Institutes (Courses/Textbooks)
    institutes: defineTable({
        id: v.string(), // Manual ID like "yonsei-1"
        name: v.string(),
        levels: v.string(),
        coverUrl: v.optional(v.string()),
        themeColor: v.optional(v.string()),
        publisher: v.optional(v.string()),
        displayLevel: v.optional(v.string()),
        totalUnits: v.optional(v.number()),
        volume: v.optional(v.string()),
        isArchived: v.optional(v.boolean()), // Soft delete flag
    }).index("by_legacy_id", ["id"])
        .index("by_archived", ["isArchived"]),

    // Textbook Units (Reading Content)
    textbook_units: defineTable({
        courseId: v.string(),
        unitIndex: v.number(),
        articleIndex: v.number(),

        title: v.string(),
        readingText: v.string(),
        translation: v.optional(v.string()),
        audioUrl: v.optional(v.string()),

        // JSON data
        transcriptData: v.optional(v.any()), // JSON
        analysisData: v.optional(v.any()), // JSON

        createdAt: v.number(), // timestamp
        postgresId: v.optional(v.string()),
        isArchived: v.optional(v.boolean()), // Soft delete flag
    }).index("by_course_unit_article", ["courseId", "unitIndex", "articleIndex"])
        .index("by_course", ["courseId"])
        .index("by_postgresId", ["postgresId"])
        .index("by_archived", ["isArchived"]),

    // Words (Master Dictionary)
    words: defineTable({
        word: v.string(),
        meaning: v.string(),
        partOfSpeech: v.string(),

        hanja: v.optional(v.string()),
        pronunciation: v.optional(v.string()),
        audioUrl: v.optional(v.string()),

        tips: v.optional(v.any()), // JSON
        postgresId: v.optional(v.string()), // For migration mapping
        createdAt: v.optional(v.number()),
        updatedAt: v.optional(v.number()),
    }).index("by_word", ["word"])
        .index("by_postgresId", ["postgresId"]),

    // Vocabulary Appearances (Linking Words to Courses)
    vocabulary_appearances: defineTable({
        wordId: v.id("words"),
        courseId: v.string(),
        unitId: v.number(),

        exampleSentence: v.optional(v.string()),
        exampleMeaning: v.optional(v.string()),

        createdAt: v.number(),
    }).index("by_course_unit", ["courseId", "unitId"])
        .index("by_word_course_unit", ["wordId", "courseId", "unitId"])
        .index("by_unit", ["unitId"]),

    // User Vocab Progress (SRS)
    user_vocab_progress: defineTable({
        userId: v.string(), // or v.id("users") if we migrate users fully
        wordId: v.id("words"),
        status: v.string(), // "NEW", "LEARNING", "REVIEW", "MASTERED"
        nextReviewAt: v.optional(v.number()),
        interval: v.number(),
        streak: v.number(),
        lastReviewedAt: v.number(),
    }).index("by_user_word", ["userId", "wordId"])
        .index("by_user_next_review", ["userId", "nextReviewAt"])
        .index("by_user", ["userId"]),

    // Grammar Points (Master Library)
    grammar_points: defineTable({
        title: v.string(),
        slug: v.optional(v.string()),
        searchKey: v.optional(v.string()),

        level: v.string(),
        type: v.string(),
        summary: v.string(),
        explanation: v.string(),

        conjugationRules: v.any(), // JSON
        examples: v.any(), // JSON
        postgresId: v.optional(v.string()),

        createdAt: v.optional(v.number()),
        updatedAt: v.optional(v.number()),
    }).index("by_title", ["title"])
        .index("by_postgresId", ["postgresId"]),

    // Course Grammar (Linking Grammar to Courses)
    course_grammars: defineTable({
        courseId: v.string(),
        unitId: v.number(),
        grammarId: v.id("grammar_points"),

        displayOrder: v.number(),
        customNote: v.optional(v.string()),
    }).index("by_course_unit", ["courseId", "unitId"]),

    // User Grammar Progress
    user_grammar_progress: defineTable({
        userId: v.string(),
        grammarId: v.id("grammar_points"),

        status: v.string(), // "NOT_STARTED", "LEARNING", "MASTERED"
        proficiency: v.number(), // 0-100

        lastStudiedAt: v.number(),
    }).index("by_user_grammar", ["userId", "grammarId"]),

    // Annotations (User Notes)
    annotations: defineTable({
        userId: v.id("users"), // Assuming we use Convex ID for user relations

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
    }).index("by_user_context", ["userId", "contextKey"]),

    // Videos
    videos: defineTable({
        title: v.string(),
        description: v.optional(v.string()),
        videoUrl: v.string(),
        thumbnailUrl: v.optional(v.string()),

        level: v.string(), // Beginner, Intermediate, Advanced
        duration: v.optional(v.number()),
        views: v.number(),

        transcriptData: v.optional(v.any()), // JSON [{start, end, text, translation}]

        postgresId: v.optional(v.string()),
        youtubeId: v.optional(v.string()),

        createdAt: v.number(),
        updatedAt: v.optional(v.number()),
    }).index("by_level", ["level"]),

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
    }).index("by_featured", ["isFeatured"])
        .index("by_feedUrl", ["feedUrl"]),

    // Podcast Episodes
    podcast_episodes: defineTable({
        channelId: v.id("podcast_channels"),
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
    }).index("by_channel", ["channelId"])
        .index("by_pubDate", ["pubDate"]),

    // Podcast Subscriptions
    podcast_subscriptions: defineTable({
        userId: v.id("users"),
        channelId: v.id("podcast_channels"),
        createdAt: v.number(),
    }).index("by_user", ["userId"])
        .index("by_user_channel", ["userId", "channelId"]),

    // Listening History
    listening_history: defineTable({
        userId: v.id("users"),
        episodeId: v.optional(v.id("podcast_episodes")), // Link to internal episode if exists

        // Denormalized data for display efficiency (and for external episodes not in DB)
        episodeGuid: v.string(),
        episodeTitle: v.string(),
        episodeUrl: v.string(),
        channelName: v.string(),
        channelImage: v.optional(v.string()),

        progress: v.number(), // Seconds played
        playedAt: v.number(),
    }).index("by_user", ["userId"])
        .index("by_user_episode", ["userId", "episodeGuid"]),

    // User Course Progress (Completed Units)
    user_course_progress: defineTable({
        userId: v.string(), // User ID (could be Convex ID or legacy)
        courseId: v.string(), // Institute ID
        completedUnits: v.array(v.number()), // Array of completed unit indexes
        lastAccessAt: v.number(),
        createdAt: v.number(),
    }).index("by_user_course", ["userId", "courseId"])
        .index("by_user", ["userId"]),

    // Notebooks (User Notes)
    notebooks: defineTable({
        userId: v.string(),
        type: v.string(), // "WORD", "GRAMMAR", "NOTE", etc.
        title: v.string(),
        content: v.any(),
        preview: v.optional(v.string()),
        tags: v.array(v.string()),
        createdAt: v.number(),
    }).index("by_user", ["userId"])
        .index("by_user_type", ["userId", "type"]),

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
    }).index("by_legacy_id", ["legacyId"])
        .index("by_round", ["round"])
        .index("by_type", ["type"]),

    // TOPIK Questions (Separate table for efficiency)
    topik_questions: defineTable({
        examId: v.id("topik_exams"),
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
    }).index("by_exam", ["examId"])
        .index("by_exam_number", ["examId", "number"]),

    // User Mistakes
    mistakes: defineTable({
        userId: v.id("users"),
        wordId: v.optional(v.string()),
        korean: v.string(),
        english: v.string(),
        context: v.optional(v.string()),
        reviewCount: v.number(),
        createdAt: v.number(),
    }).index("by_user", ["userId"]),

    // Exam Attempts
    exam_attempts: defineTable({
        userId: v.id("users"),
        examId: v.string(),
        score: v.number(),
        totalQuestions: v.number(),
        sectionScores: v.optional(v.any()), // JSON
        duration: v.optional(v.number()),
        createdAt: v.number(),
    }).index("by_user", ["userId"]),

    // User Saved Words
    saved_words: defineTable({
        userId: v.id("users"),
        korean: v.string(),
        english: v.string(),
        exampleSentence: v.optional(v.string()),
        exampleTranslation: v.optional(v.string()),
        createdAt: v.number(),
    }).index("by_user", ["userId"]),

    // Activity Logs
    activity_logs: defineTable({
        userId: v.id("users"),
        activityType: v.string(),
        duration: v.optional(v.number()),
        itemsStudied: v.optional(v.number()),
        metadata: v.optional(v.any()),
        createdAt: v.number(),
    }).index("by_user", ["userId"]),

    // Exam Sessions (Active timer tracking)
    exam_sessions: defineTable({
        userId: v.id("users"),
        examId: v.id("topik_exams"),
        status: v.string(), // "IN_PROGRESS" | "COMPLETED" | "AUTO_SUBMITTED"
        startTime: v.number(), // timestamp
        endTime: v.number(), // calculated: startTime + exam.timeLimit
        answers: v.optional(v.any()), // JSON: { [questionNumber]: selectedOption }
        score: v.optional(v.number()),
        scheduledJobId: v.optional(v.id("_scheduled_functions")), // For auto-submit scheduler
        createdAt: v.number(),
        completedAt: v.optional(v.number()),
    }).index("by_user", ["userId"])
        .index("by_user_exam", ["userId", "examId"])
        .index("by_status", ["status"]),
});
