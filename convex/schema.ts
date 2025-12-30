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
        isVerified: v.boolean(),

        // Progress pointers
        lastInstitute: v.optional(v.string()),
        lastLevel: v.optional(v.number()),
        lastUnit: v.optional(v.number()),
        postgresId: v.optional(v.string()),
        createdAt: v.number(),
    }).index("by_email", ["email"])
        .index("by_googleId", ["googleId"])
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
    }).index("by_legacy_id", ["id"]), // We might want to use Convex ID instead, but keeping `id` for migration compat

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
    }).index("by_course_unit_article", ["courseId", "unitIndex", "articleIndex"])
        .index("by_course", ["courseId"])
        .index("by_postgresId", ["postgresId"]),

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
        .index("by_word_course_unit", ["wordId", "courseId", "unitId"]),

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
        .index("by_user_next_review", ["userId", "nextReviewAt"]),

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
    }).index("by_featured", ["isFeatured"]),

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
        .index("by_user_episode", ["userId", "episodeGuid"])
});
