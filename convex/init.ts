import { query } from './_generated/server';

// Bootstrap data query - fetches all initial user data in one call
export const getBootstrapData = query({
  args: {},
  handler: async ctx => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return {
        user: null,
        stats: null,
        settings: null,
        isAuthenticated: false,
      };
    }

    // Find user by identity subject
    let user = await ctx.db
      .query('users')
      .withIndex('by_token', q => q.eq('token', identity.subject))
      .first();

    user ??= await ctx.db
      .query('users')
      .withIndex('by_postgresId', q => q.eq('postgresId', identity.subject))
      .first();

    if (!user) {
      return {
        user: null,
        stats: null,
        settings: null,
        isAuthenticated: true,
        needsProfile: true,
      };
    }

    // Fetch all user data in parallel
    // OPTIMIZATION: Limit collections to prevent excessive queries
    const MAX_BOOTSTRAP_ITEMS = 200;
    const [courseProgress, vocabProgress, grammarProgress, savedWords, mistakes] =
      await Promise.all([
        // Course progress
        ctx.db
          .query('user_course_progress')
          .withIndex('by_user', q => q.eq('userId', user._id))
          .take(MAX_BOOTSTRAP_ITEMS),

        // Vocab progress stats
        ctx.db
          .query('user_vocab_progress')
          .withIndex('by_user', q => q.eq('userId', user._id))
          .take(MAX_BOOTSTRAP_ITEMS),

        // Grammar progress
        ctx.db
          .query('user_grammar_progress')
          .withIndex('by_user_grammar', q => q.eq('userId', user._id))
          .take(MAX_BOOTSTRAP_ITEMS),

        // Saved words
        ctx.db
          .query('saved_words')
          .withIndex('by_user', q => q.eq('userId', user._id))
          .take(MAX_BOOTSTRAP_ITEMS),

        // Mistakes
        ctx.db
          .query('mistakes')
          .withIndex('by_user', q => q.eq('userId', user._id))
          .take(MAX_BOOTSTRAP_ITEMS),
      ]);

    const now = Date.now();
    const dueReviews = vocabProgress.filter(v => v.nextReviewAt && v.nextReviewAt <= now).length;
    const masteredWords = vocabProgress.filter(v => v.status === 'MASTERED').length;
    const masteredGrammar = grammarProgress.filter(g => g.status === 'MASTERED').length;

    return {
      isAuthenticated: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        tier: user.tier,
        avatar: user.avatar,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        lastInstitute: user.lastInstitute,
        lastLevel: user.lastLevel,
        lastUnit: user.lastUnit,
        lastModule: user.lastModule,
      },
      stats: {
        vocabTotal: vocabProgress.length,
        vocabMastered: masteredWords,
        vocabDueReviews: dueReviews,
        grammarTotal: grammarProgress.length,
        grammarMastered: masteredGrammar,
        coursesInProgress: courseProgress.length,
        savedWordsCount: savedWords.length,
        mistakesCount: mistakes.length,
      },
      settings: {
        // Placeholder for user settings - can be extended
        language: 'en',
        dailyGoal: 30,
      },
      savedWords: savedWords.map(w => ({
        id: w._id,
        korean: w.korean,
        english: w.english,
      })),
      mistakes: mistakes.map(m => ({
        id: m._id,
        korean: m.korean,
        english: m.english,
      })),
    };
  },
});
