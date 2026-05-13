import { ConvexError, v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { enqueueNotificationFromMutation } from './notifications';
import { getAuthUserId, getOptionalAuthUserId } from './utils';

export type QAQuestionDto = {
  _id: Id<'qa_questions'>;
  title: string;
  content: string;
  topicSlug: string;
  answerCount: number;
  voteScore: number;
  viewCount: number;
  hasAcceptedAnswer: boolean;
  isEdited: boolean;
  createdAt: number;
  author: {
    _id: Id<'users'>;
    name: string;
    avatar: string | null;
  };
};

export type QAAnswerDto = {
  _id: Id<'qa_answers'>;
  content: string;
  voteScore: number;
  isAccepted: boolean;
  isEdited: boolean;
  createdAt: number;
  author: {
    _id: Id<'users'>;
    name: string;
    avatar: string | null;
  };
};

export type QAQuestionDetailDto = QAQuestionDto & {
  answers: QAAnswerDto[];
};

type DbReader = Pick<QueryCtx, 'db'> | Pick<MutationCtx, 'db'>;

async function resolveAuthor(ctx: DbReader, userId: Id<'users'>) {
  const user = await ctx.db.get(userId);
  return {
    _id: userId,
    name: user?.name || 'Learner',
    avatar: user ? (user.avatar || user.image || null) : null,
  };
}

function normalizeLimit(limit?: number): number {
  if (typeof limit !== 'number' || !Number.isFinite(limit)) return 20;
  const normalized = Math.floor(limit);
  if (normalized < 1) return 1;
  if (normalized > 50) return 50;
  return normalized;
}

function normalizeTitle(title: string): string {
  return title.trim();
}

function normalizeContent(content: string): string {
  return content.trim();
}

function extractMentionsFromText(text: string): string[] {
  const matches = text.matchAll(/@([\p{L}\p{N}_.-]{2,40})/gu);
  const mentions = new Set<string>();
  for (const match of matches) {
    const mention = match[1]?.trim().toLowerCase();
    if (mention) mentions.add(mention);
  }
  return [...mentions];
}

async function ensureTopicSlug(ctx: MutationCtx, topicSlug: string) {
  const topic = await ctx.db
    .query('qa_topics')
    .withIndex('by_slug', queryBuilder => queryBuilder.eq('slug', topicSlug))
    .first();

  if (!topic || !topic.isActive) {
    throw new ConvexError({ code: 'INVALID_ARGUMENT', message: 'Topic not found' });
  }
}

async function resolveMentionedUserIds(
  ctx: MutationCtx,
  text: string,
  excludedUserIds: ReadonlyArray<Id<'users'>>
): Promise<Id<'users'>[]> {
  const excluded = new Set(excludedUserIds);
  const userIds = new Set<Id<'users'>>();

  for (const mention of extractMentionsFromText(text).slice(0, 5)) {
    const users = await ctx.db
      .query('users')
      .withSearchIndex('search_name', searchBuilder => searchBuilder.search('name', mention))
      .take(10);

    for (const user of users) {
      const normalizedName = (user.name || '').trim().toLowerCase();
      if (normalizedName === mention && !excluded.has(user._id)) {
        userIds.add(user._id);
      }
    }
  }

  return [...userIds];
}

async function notifyMentions(
  ctx: MutationCtx,
  mentionedUserIds: ReadonlyArray<Id<'users'>>,
  actorId: Id<'users'>,
  linkPath: string
) {
  if (mentionedUserIds.length === 0) return;
  const actor = await resolveAuthor(ctx, actorId);

  await Promise.all(
    mentionedUserIds.map(userId =>
      enqueueNotificationFromMutation(ctx, {
        userId,
        kind: 'mention',
        title: `${actor.name} mentioned you`,
        body: 'Someone referenced you in the Q&A community.',
        linkPath,
      })
    )
  );
}

async function mapQuestionDtos(ctx: QueryCtx, rows: Array<{ userId: Id<'users'> } & Record<string, unknown>>) {
  const authorIds = [...new Set(rows.map(row => row.userId))];
  const authorMap = new Map<string, Awaited<ReturnType<typeof resolveAuthor>>>();

  await Promise.all(
    authorIds.map(async authorId => {
      authorMap.set(authorId, await resolveAuthor(ctx, authorId));
    })
  );

  return rows.map(row => ({
    _id: row._id as Id<'qa_questions'>,
    title: row.title as string,
    content: row.content as string,
    topicSlug: row.topicSlug as string,
    answerCount: row.answerCount as number,
    voteScore: row.voteScore as number,
    viewCount: row.viewCount as number,
    hasAcceptedAnswer: Boolean(row.acceptedAnswerId),
    isEdited: row.isEdited as boolean,
    createdAt: row.createdAt as number,
    author: authorMap.get(row.userId)!,
  })) as QAQuestionDto[];
}

export const listQuestions = query({
  args: {
    topicSlug: v.optional(v.string()),
    sort: v.optional(v.union(v.literal('recent'), v.literal('unanswered'), v.literal('top'))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = normalizeLimit(args.limit);
    const sort = args.sort || 'recent';

    const rows = args.topicSlug
      ? await ctx.db
          .query('qa_questions')
          .withIndex('by_topic_createdAt', queryBuilder => queryBuilder.eq('topicSlug', args.topicSlug!))
          .order('desc')
          .take(limit * 3)
      : await ctx.db.query('qa_questions').withIndex('by_createdAt').order('desc').take(limit * 3);

    let filtered = rows.filter(row => !row.deletedAt);
    if (sort === 'unanswered') {
      filtered = filtered.filter(row => row.answerCount === 0);
    }
    if (sort === 'top') {
      filtered = [...filtered].sort((left, right) => right.voteScore - left.voteScore);
    }

    return mapQuestionDtos(ctx, filtered.slice(0, limit));
  },
});

export const getQuestion = query({
  args: {
    questionId: v.id('qa_questions'),
  },
  handler: async (ctx, args) => {
    const question = await ctx.db.get(args.questionId);
    if (!question || question.deletedAt) return null;

    const answers = (
      await ctx.db
        .query('qa_answers')
        .withIndex('by_question_createdAt', queryBuilder => queryBuilder.eq('questionId', args.questionId))
        .collect()
    ).filter(answer => !answer.deletedAt);

    const authorIds = [...new Set([question.userId, ...answers.map(answer => answer.userId)])];
    const authorMap = new Map<string, Awaited<ReturnType<typeof resolveAuthor>>>();
    await Promise.all(
      authorIds.map(async authorId => {
        authorMap.set(authorId, await resolveAuthor(ctx, authorId));
      })
    );

    const sortedAnswers = [...answers].sort((left, right) => {
      if (left.isAccepted !== right.isAccepted) return left.isAccepted ? -1 : 1;
      if (left.voteScore !== right.voteScore) return right.voteScore - left.voteScore;
      return right.createdAt - left.createdAt;
    });

    return {
      _id: question._id,
      title: question.title,
      content: question.content,
      topicSlug: question.topicSlug,
      answerCount: question.answerCount,
      voteScore: question.voteScore,
      viewCount: question.viewCount,
      hasAcceptedAnswer: Boolean(question.acceptedAnswerId),
      isEdited: question.isEdited,
      createdAt: question.createdAt,
      author: authorMap.get(question.userId)!,
      answers: sortedAnswers.map(answer => ({
        _id: answer._id,
        content: answer.content,
        voteScore: answer.voteScore,
        isAccepted: answer.isAccepted,
        isEdited: answer.isEdited,
        createdAt: answer.createdAt,
        author: authorMap.get(answer.userId)!,
      })),
    } as QAQuestionDetailDto;
  },
});

export const createQuestion = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    topicSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const title = normalizeTitle(args.title);
    const content = normalizeContent(args.content);
    if (!title || !content) {
      throw new ConvexError({ code: 'INVALID_ARGUMENT', message: 'Title and content are required' });
    }

    await ensureTopicSlug(ctx, args.topicSlug);
    const now = Date.now();
    const questionId = await ctx.db.insert('qa_questions', {
      userId,
      title,
      content,
      topicSlug: args.topicSlug,
      answerCount: 0,
      voteScore: 0,
      viewCount: 0,
      isEdited: false,
      createdAt: now,
      updatedAt: now,
    });

    const mentionedUserIds = await resolveMentionedUserIds(ctx, `${title}\n${content}`, [userId]);
    await notifyMentions(ctx, mentionedUserIds, userId, `/community/qa/${questionId}`);

    return questionId;
  },
});

export const createAnswer = mutation({
  args: {
    questionId: v.id('qa_questions'),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const question = await ctx.db.get(args.questionId);
    if (!question || question.deletedAt) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Question not found' });
    }

    const content = normalizeContent(args.content);
    if (!content) {
      throw new ConvexError({ code: 'INVALID_ARGUMENT', message: 'Content is required' });
    }

    const now = Date.now();
    const answerId = await ctx.db.insert('qa_answers', {
      questionId: args.questionId,
      userId,
      content,
      voteScore: 0,
      isAccepted: false,
      isEdited: false,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(question._id, {
      answerCount: question.answerCount + 1,
      updatedAt: now,
    });

    if (question.userId !== userId) {
      const answerAuthor = await resolveAuthor(ctx, userId);
      await enqueueNotificationFromMutation(ctx, {
        userId: question.userId,
        kind: 'answer_received',
        title: `${answerAuthor.name} answered your question`,
        body: question.title,
        linkPath: `/community/qa/${question._id}`,
      });
    }

    const mentionedUserIds = await resolveMentionedUserIds(ctx, content, [userId, question.userId]);
    await notifyMentions(ctx, mentionedUserIds, userId, `/community/qa/${question._id}`);

    return answerId;
  },
});

export const incrementViewCount = mutation({
  args: {
    questionId: v.id('qa_questions'),
  },
  handler: async (ctx, args) => {
    const question = await ctx.db.get(args.questionId);
    if (!question || question.deletedAt) return;
    await ctx.db.patch(question._id, { viewCount: question.viewCount + 1 });
  },
});

export const voteOnTarget = mutation({
  args: {
    target: v.union(v.literal('question'), v.literal('answer')),
    targetId: v.string(),
    value: v.union(v.literal(1), v.literal(-1)),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const existing = await ctx.db
      .query('qa_votes')
      .withIndex('by_user_target', queryBuilder =>
        queryBuilder.eq('userId', userId).eq('target', args.target).eq('targetId', args.targetId)
      )
      .first();

    let scoreDelta = 0;
    if (existing) {
      if (existing.value === args.value) {
        await ctx.db.delete(existing._id);
        scoreDelta = -args.value;
      } else {
        await ctx.db.patch(existing._id, { value: args.value, createdAt: Date.now() });
        scoreDelta = args.value * 2;
      }
    } else {
      await ctx.db.insert('qa_votes', {
        userId,
        target: args.target,
        targetId: args.targetId,
        value: args.value,
        createdAt: Date.now(),
      });
      scoreDelta = args.value;
    }

    if (args.target === 'question') {
      const question = await ctx.db.get(args.targetId as Id<'qa_questions'>);
      if (question && !question.deletedAt) {
        await ctx.db.patch(question._id, { voteScore: question.voteScore + scoreDelta });
      }
    } else {
      const answer = await ctx.db.get(args.targetId as Id<'qa_answers'>);
      if (answer && !answer.deletedAt) {
        await ctx.db.patch(answer._id, { voteScore: answer.voteScore + scoreDelta });
      }
    }

    return { ok: true as const };
  },
});

export const acceptAnswer = mutation({
  args: {
    answerId: v.id('qa_answers'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const answer = await ctx.db.get(args.answerId);
    if (!answer || answer.deletedAt) throw new ConvexError({ code: 'NOT_FOUND' });

    const question = await ctx.db.get(answer.questionId);
    if (!question || question.deletedAt) throw new ConvexError({ code: 'NOT_FOUND' });

    if (question.userId !== userId) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'Only the question author can accept answers',
      });
    }

    const now = Date.now();
    if (question.acceptedAnswerId && question.acceptedAnswerId !== args.answerId) {
      const previousAnswer = await ctx.db.get(question.acceptedAnswerId);
      if (previousAnswer && !previousAnswer.deletedAt) {
        await ctx.db.patch(previousAnswer._id, { isAccepted: false, updatedAt: now });
      }
    }

    if (question.acceptedAnswerId === args.answerId) {
      await ctx.db.patch(answer._id, { isAccepted: false, updatedAt: now });
      await ctx.db.patch(question._id, { acceptedAnswerId: undefined, updatedAt: now });
      return { accepted: false };
    }

    await ctx.db.patch(answer._id, { isAccepted: true, updatedAt: now });
    await ctx.db.patch(question._id, { acceptedAnswerId: args.answerId, updatedAt: now });

    if (answer.userId !== userId) {
      await enqueueNotificationFromMutation(ctx, {
        userId: answer.userId,
        kind: 'answer_accepted',
        title: 'Your answer was accepted',
        body: question.title,
        linkPath: `/community/qa/${question._id}`,
      });
    }

    return { accepted: true };
  },
});

export const editQuestion = mutation({
  args: {
    questionId: v.id('qa_questions'),
    title: v.string(),
    content: v.string(),
    topicSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const question = await ctx.db.get(args.questionId);
    if (!question || question.deletedAt) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Question not found' });
    }
    if (question.userId !== userId) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'Only the author can edit this question',
      });
    }

    const title = normalizeTitle(args.title);
    const content = normalizeContent(args.content);
    if (!title || !content) {
      throw new ConvexError({ code: 'INVALID_ARGUMENT', message: 'Title and content are required' });
    }

    await ensureTopicSlug(ctx, args.topicSlug);
    const now = Date.now();
    await ctx.db.patch(question._id, {
      title,
      content,
      topicSlug: args.topicSlug,
      isEdited: true,
      editedAt: now,
      updatedAt: now,
    });

    return { ok: true as const };
  },
});

export const editAnswer = mutation({
  args: {
    answerId: v.id('qa_answers'),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const answer = await ctx.db.get(args.answerId);
    if (!answer || answer.deletedAt) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Answer not found' });
    }
    if (answer.userId !== userId) {
      throw new ConvexError({ code: 'FORBIDDEN', message: 'Only the author can edit this answer' });
    }

    const content = normalizeContent(args.content);
    if (!content) {
      throw new ConvexError({ code: 'INVALID_ARGUMENT', message: 'Content is required' });
    }

    const now = Date.now();
    await ctx.db.patch(answer._id, {
      content,
      isEdited: true,
      editedAt: now,
      updatedAt: now,
    });

    return { ok: true as const };
  },
});

export const deleteQuestion = mutation({
  args: {
    questionId: v.id('qa_questions'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const question = await ctx.db.get(args.questionId);
    if (!question || question.deletedAt) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Question not found' });
    }
    if (question.userId !== userId) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'Only the author can delete this question',
      });
    }

    const now = Date.now();
    const answers = await ctx.db
      .query('qa_answers')
      .withIndex('by_question_createdAt', queryBuilder => queryBuilder.eq('questionId', args.questionId))
      .collect();

    await Promise.all(
      answers
        .filter(answer => !answer.deletedAt)
        .map(answer =>
          ctx.db.patch(answer._id, {
            deletedAt: now,
            isAccepted: false,
            updatedAt: now,
          })
        )
    );

    await ctx.db.patch(question._id, {
      deletedAt: now,
      acceptedAnswerId: undefined,
      answerCount: 0,
      updatedAt: now,
    });

    return { ok: true as const };
  },
});

export const deleteAnswer = mutation({
  args: {
    answerId: v.id('qa_answers'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const answer = await ctx.db.get(args.answerId);
    if (!answer || answer.deletedAt) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Answer not found' });
    }
    if (answer.userId !== userId) {
      throw new ConvexError({ code: 'FORBIDDEN', message: 'Only the author can delete this answer' });
    }

    const question = await ctx.db.get(answer.questionId);
    if (!question || question.deletedAt) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Question not found' });
    }

    const now = Date.now();
    await ctx.db.patch(answer._id, {
      deletedAt: now,
      isAccepted: false,
      updatedAt: now,
    });
    await ctx.db.patch(question._id, {
      answerCount: Math.max(0, question.answerCount - 1),
      acceptedAnswerId:
        question.acceptedAnswerId === answer._id ? undefined : question.acceptedAnswerId,
      updatedAt: now,
    });

    return { ok: true as const };
  },
});

export const searchQuestions = query({
  args: {
    searchQuery: v.string(),
    topicSlug: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = normalizeLimit(args.limit);
    const searchQuery = args.searchQuery.trim();
    if (searchQuery.length < 2) return [];

    const rows = args.topicSlug
      ? await ctx.db
          .query('qa_questions')
          .withSearchIndex('search_title', searchBuilder =>
            searchBuilder.search('title', searchQuery).eq('topicSlug', args.topicSlug!)
          )
          .take(limit)
      : await ctx.db
          .query('qa_questions')
          .withSearchIndex('search_title', searchBuilder => searchBuilder.search('title', searchQuery))
          .take(limit);

    return mapQuestionDtos(ctx, rows.filter(row => !row.deletedAt));
  },
});

export const getMyVotes = query({
  args: {
    targetIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId || args.targetIds.length === 0) return {};

    const votes: Record<string, number> = {};
    await Promise.all(
      args.targetIds.map(async targetId => {
        const questionVote = await ctx.db
          .query('qa_votes')
          .withIndex('by_user_target', queryBuilder =>
            queryBuilder.eq('userId', userId).eq('target', 'question').eq('targetId', targetId)
          )
          .first();
        if (questionVote) {
          votes[targetId] = questionVote.value;
          return;
        }

        const answerVote = await ctx.db
          .query('qa_votes')
          .withIndex('by_user_target', queryBuilder =>
            queryBuilder.eq('userId', userId).eq('target', 'answer').eq('targetId', targetId)
          )
          .first();
        if (answerVote) {
          votes[targetId] = answerVote.value;
        }
      })
    );

    return votes;
  },
});
