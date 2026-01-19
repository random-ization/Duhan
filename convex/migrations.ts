import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import type { Doc, TableNames } from './_generated/dataModel';

// Fix institutes missing isArchived field (migration fix)
export const fixInstitutesIsArchived = mutation({
  args: {},
  handler: async ctx => {
    const institutes = await ctx.db.query('institutes').collect();
    let updatedCount = 0;

    for (const inst of institutes) {
      if (inst.isArchived === undefined) {
        await ctx.db.patch(inst._id, { isArchived: false });
        updatedCount++;
      }
    }

    return { updated: updatedCount, total: institutes.length };
  },
});

// Generic mutation to import data
export const importData = mutation({
  args: {
    table: v.string(),
    data: v.any(), // Array of objects
  },
  handler: async (ctx, args) => {
    const { table, data } = args;
    console.log(`Importing ${data.length} records into ${table} `);

    for (const item of data) {
      // Basic insert
      // You might want to strip 'id' if you want Convex to generate IDs,
      // OR keep it as a custom field (schema defines 'id' for institute/unit?)
      // My schema defines 'id' for institute, but checks convex ID for others.
      // For migration, we usually want to preserve relations.

      // Since existing relations use UUIDs (strings), and Convex uses `Id<TableName>`,
      // we have a mismatch.
      // Strategy: Store original ID in a field (e.g. `postgresId`)?
      // OR: For tables with String IDs (User, Institute), we mapped them.
      // For `vocabulary_appearances`, it refers to `wordId` (Convex ID).
      // This is Tricky.

      // MIGRATION STRATEGY:
      // 1. Import Master Words first. Store their `postgresId` -> `convexId` map?
      //    Or add `postgresId` column to `words` table temporarily to look up.

      // For now, simple insert.
      await ctx.db.insert(table as TableNames, item);
    }
  },
});

export const getAllWords = query({
  args: {},
  handler: async ctx => {
    return await ctx.db.query('words').collect();
  },
});

export const getAllGrammarPoints = query({
  args: {},
  handler: async ctx => {
    return await ctx.db.query('grammar_points').collect();
  },
});

export const getAllTextbookUnits = query({
  args: {},
  handler: async ctx => {
    return await ctx.db.query('textbook_units').collect();
  },
});
// Helpers for linking relations
export const getAllPodcastChannels = query({
  args: {},
  handler: async ctx => {
    return await ctx.db.query('podcast_channels').collect();
  },
});

export const getAllPodcastEpisodes = query({
  args: {},
  handler: async ctx => {
    return await ctx.db.query('podcast_episodes').collect();
  },
});

// Debug helper
export const getDBStats = query({
  args: {},
  handler: async ctx => {
    const users = await ctx.db.query('users').collect();
    const institutes = await ctx.db.query('institutes').collect();
    const units = await ctx.db.query('textbook_units').collect();
    const words = await ctx.db.query('words').collect();
    const appearances = await ctx.db.query('vocabulary_appearances').collect();
    const grammarPoints = await ctx.db.query('grammar_points').collect();
    const courseGrammars = await ctx.db.query('course_grammars').collect();
    const videos = await ctx.db.query('videos').collect();
    const channels = await ctx.db.query('podcast_channels').collect();
    const episodes = await ctx.db.query('podcast_episodes').collect();

    return {
      users: users.length,
      institutes: institutes.length,
      units: units.length,
      words: words.length,
      vocabulary_appearances: appearances.length,
      grammar_points: grammarPoints.length,
      course_grammars: courseGrammars.length,
      videos: videos.length,
      podcast_channels: channels.length,
      podcast_episodes: episodes.length,
    };
  },
});

export const listInstitutes = query({
  args: {},
  handler: async ctx => {
    const institutes = await ctx.db.query('institutes').collect();
    return institutes.map(i => ({
      id: i._id,
      legacyId: i.id,
      name: i.name,
      volume: i.volume,
      displayLevel: i.displayLevel,
      totalUnits: i.totalUnits,
      levels: i.levels,
    }));
  },
});

// Debug helper: Analyze duplicates
export const analyzeDuplicates = query({
  args: {},
  handler: async ctx => {
    const grammarPoints = await ctx.db.query('grammar_points').collect();
    const words = await ctx.db.query('words').collect();
    const channels = await ctx.db.query('podcast_channels').collect();
    const courseGrammars = await ctx.db.query('course_grammars').collect();

    const countDuplicates = <T>(items: T[], keyFn: (item: T) => string) => {
      const map = new Map<string, number>();
      items.forEach(item => {
        const key = keyFn(item);
        if (key) map.set(key, (map.get(key) || 0) + 1);
      });
      let duplicates = 0;
      let totalExcess = 0;
      map.forEach(count => {
        if (count > 1) {
          duplicates++;
          totalExcess += count - 1;
        }
      });
      return {
        uniqueItems: map.size,
        duplicateGroups: duplicates,
        totalExcessRecords: totalExcess,
      };
    };

    return {
      grammarPoints: countDuplicates(grammarPoints, g => g.postgresId || g.title),
      words: countDuplicates(words, w => w.postgresId || w.word),
      podcastChannels: countDuplicates(channels, c => c.postgresId || c.title),
      courseGrammars: countDuplicates(
        courseGrammars,
        cg => `${cg.courseId}_${cg.unitId}_${cg.grammarId}`
      ),
      institutes: countDuplicates(await ctx.db.query('institutes').collect(), i => i.id),
      units: countDuplicates(
        await ctx.db.query('textbook_units').collect(),
        u => u.postgresId || u.title
      ),
      videos: countDuplicates(await ctx.db.query('videos').collect(), v => v.postgresId || v.title),
      episodes: countDuplicates(
        await ctx.db.query('podcast_episodes').collect(),
        e => e.postgresId || e.guid
      ),
      appearances: countDuplicates(
        await ctx.db.query('vocabulary_appearances').collect(),
        a => `${a.wordId}_${a.courseId}_${a.unitId}`
      ),
    };
  },
});

export const renameInstituteName = mutation({
  args: {
    from: v.string(),
    to: v.string(),
  },
  handler: async (ctx, args) => {
    const institutes = await ctx.db
      .query('institutes')
      .filter(q => q.eq(q.field('name'), args.from))
      .collect();

    for (const inst of institutes) {
      await ctx.db.patch(inst._id, { name: args.to });
    }

    return { updated: institutes.length };
  },
});

export const analyzeIntegrity = query({
  args: {},
  handler: async ctx => {
    const appearances = await ctx.db.query('vocabulary_appearances').collect();
    const units = await ctx.db.query('textbook_units').collect();
    const words = await ctx.db.query('words').collect();
    const courseGrammars = await ctx.db.query('course_grammars').collect();

    // 1. Check Orphan Appearances (Word not found or Unit not found)
    let orphanAppearances = 0;
    for (const a of appearances) {
      const word = await ctx.db.get(a.wordId);
      if (!word) {
        orphanAppearances++;
      }
    }

    // 2. Check Orphan CourseGrammars
    let orphanCG = 0;
    for (const cg of courseGrammars) {
      const grammar = await ctx.db.get(cg.grammarId);
      if (!grammar) orphanCG++;
    }

    return {
      orphanAppearances,
      orphanCourseGrammars: orphanCG,
      totalAppearances: appearances.length,
      totalUnits: units.length,
      totalWords: words.length,
    };
  },
});

// Deduplication Helper
export const deleteDuplicateData = mutation({
  args: {},
  handler: async ctx => {
    const deleteDuplicates = async <T extends TableNames>(
      tableName: T,
      keyFn: (item: Doc<T>) => string
    ) => {
      const items = await ctx.db.query(tableName).collect();
      const map = new Map<string, Doc<T>[]>();
      items.forEach(item => {
        const key = keyFn(item);
        if (!key) return;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(item);
      });

      let deletedCount = 0;
      for (const [, group] of map.entries()) {
        if (group.length > 1) {
          // Sort by creation time (keep oldest or newest? Migration usually creates new ones later)
          // Let's keep the FIRST one we found (or explicitly Sort) based on ID usually fine if identical
          // Ideally keep the one with relationships, but here they are all fresh migrations.
          // Let's keep the first one in the list and delete the rest.
          const toDelete = group.slice(1);
          for (const item of toDelete) {
            await ctx.db.delete(item._id);
            deletedCount++;
          }
        }
      }
      return deletedCount;
    };

    const deletedGrammar = await deleteDuplicates('grammar_points', g => g.postgresId || g.title);
    const deletedWords = await deleteDuplicates('words', w => w.postgresId || w.word);
    const deletedChannels = await deleteDuplicates(
      'podcast_channels',
      c => c.postgresId || c.title
    );
    const deletedAppearances = await deleteDuplicates(
      'vocabulary_appearances',
      a => `${a.wordId}_${a.courseId}_${a.unitId}`
    );

    // Videos and Episodes might have duplicates too
    const deletedVideos = await deleteDuplicates('videos', v => v.postgresId || v.title);
    const deletedEpisodes = await deleteDuplicates('podcast_episodes', e => e.postgresId || e.guid);

    const deletedInstitutes = await deleteDuplicates('institutes', i => i.id);

    return {
      deletedGrammar,
      deletedWords,
      deletedChannels,
      deletedAppearances,
      deletedVideos,
      deletedEpisodes,
      deletedInstitutes,
    };
  },
});

// ============================================
// TOPIK Migration Functions
// ============================================

// Import TOPIK exams from PostgreSQL data
export const importTopikExam = mutation({
  args: {
    legacyId: v.string(),
    title: v.string(),
    round: v.number(),
    type: v.string(),
    paperType: v.optional(v.string()),
    timeLimit: v.number(),
    audioUrl: v.optional(v.string()),
    description: v.optional(v.string()),
    isPaid: v.boolean(),
    questions: v.array(
      v.object({
        number: v.number(),
        passage: v.optional(v.string()),
        question: v.string(),
        contextBox: v.optional(v.string()),
        options: v.array(v.string()),
        correctAnswer: v.number(),
        image: v.optional(v.string()),
        optionImages: v.optional(v.array(v.string())),
        explanation: v.optional(v.string()),
        score: v.number(),
        instruction: v.optional(v.string()),
        layout: v.optional(v.string()),
        groupCount: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { legacyId, questions, ...examData } = args;

    // Check if already migrated
    const existing = await ctx.db
      .query('topik_exams')
      .withIndex('by_legacy_id', q => q.eq('legacyId', legacyId))
      .first();

    if (existing) {
      console.log(`Exam ${legacyId} already exists, skipping...`);
      return { success: false, reason: 'already_exists' };
    }

    // Insert exam
    const examId = await ctx.db.insert('topik_exams', {
      legacyId,
      ...examData,
      createdAt: Date.now(),
    });

    // Insert questions
    for (const q of questions) {
      await ctx.db.insert('topik_questions', {
        examId,
        ...q,
      });
    }

    console.log(`Migrated exam ${legacyId} with ${questions.length} questions`);
    return { success: true, examId };
  },
});

// Get all TOPIK exams for verification
export const getAllTopikExams = query({
  args: {},
  handler: async ctx => {
    const exams = await ctx.db.query('topik_exams').collect();
    return exams;
  },
});

// Get TOPIK stats for debug
export const getTopikStats = query({
  args: {},
  handler: async ctx => {
    const exams = await ctx.db.query('topik_exams').collect();
    const questions = await ctx.db.query('topik_questions').collect();
    return {
      totalExams: exams.length,
      totalQuestions: questions.length,
      exams: exams.map(e => ({
        legacyId: e.legacyId,
        title: e.title,
        round: e.round,
        type: e.type,
      })),
    };
  },
});

// Migration: Copy question instruction and question text from 91st Listening to 83rd Listening
export const copyListeningQuestions91To83 = mutation({
  args: {},
  handler: async ctx => {
    // 1. Get Source Exam (91 Listening)
    const sourceExam = await ctx.db
      .query('topik_exams')
      .filter(q => q.eq(q.field('round'), 91))
      .filter(q => q.eq(q.field('type'), 'LISTENING'))
      .first();

    if (!sourceExam) {
      return { success: false, error: 'Source exam (Round 91 Listening) not found' };
    }

    // 2. Get Target Exam (83 Listening)
    const targetExam = await ctx.db
      .query('topik_exams')
      .filter(q => q.eq(q.field('round'), 83))
      .filter(q => q.eq(q.field('type'), 'LISTENING'))
      .first();

    if (!targetExam) {
      return { success: false, error: 'Target exam (Round 83 Listening) not found' };
    }

    console.log(
      `Copying from ${sourceExam.title} (${sourceExam.round}) to ${targetExam.title} (${targetExam.round})`
    );

    // 3. Get Questions for both
    const sourceQuestions = await ctx.db
      .query('topik_questions')
      .withIndex('by_exam', q => q.eq('examId', sourceExam._id))
      .collect();

    const targetQuestions = await ctx.db
      .query('topik_questions')
      .withIndex('by_exam', q => q.eq('examId', targetExam._id))
      .collect();

    // 4. Map Source Questions by Number
    const sourceMap = new Map<number, (typeof sourceQuestions)[number]>();
    sourceQuestions.forEach(q => sourceMap.set(q.number, q));

    // 5. Update Target Questions
    let updatedCount = 0;
    for (const targetQ of targetQuestions) {
      const sourceQ = sourceMap.get(targetQ.number);
      if (sourceQ) {
        // Determine if we need to update (simple check if content is different?? or just overwrite)
        // User asked to "copy", so we overwrite.

        // Fields to copy: instruction, question
        await ctx.db.patch(targetQ._id, {
          instruction: sourceQ.instruction,
          question: sourceQ.question,
        });
        updatedCount++;
      }
    }

    return {
      success: true,
      sourceExamId: sourceExam.legacyId,
      targetExamId: targetExam.legacyId,
      totalSourceQuestions: sourceQuestions.length,
      totalTargetQuestions: targetQuestions.length,
      updatedQuestions: updatedCount,
    };
  },
});
