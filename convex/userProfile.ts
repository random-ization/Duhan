import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { query, type QueryCtx } from './_generated/server';

type CommunityProfileAuthor = {
  _id: Id<'users'>;
  name: string;
  avatar: string | null;
};

type CommunityProfileQuestion = {
  _id: Id<'qa_questions'>;
  title: string;
  topicSlug: string;
  answerCount: number;
  voteScore: number;
  createdAt: number;
};

type CommunityProfileAnswer = {
  _id: Id<'qa_answers'>;
  questionId: Id<'qa_questions'>;
  questionTitle: string;
  voteScore: number;
  isAccepted: boolean;
  createdAt: number;
};

export type CommunityUserProfileDto = {
  user: CommunityProfileAuthor;
  questionCount: number;
  answerCount: number;
  acceptedAnswerCount: number;
  acceptanceRate: number;
  totalVoteScore: number;
  recentQuestions: CommunityProfileQuestion[];
  recentAnswers: CommunityProfileAnswer[];
};

async function resolveAuthor(ctx: QueryCtx, userId: Id<'users'>): Promise<CommunityProfileAuthor | null> {
  const user = await ctx.db.get(userId);
  if (!user) return null;
  return {
    _id: userId,
    name: user.name || 'Learner',
    avatar: user.avatar || user.image || null,
  };
}

export const getUserProfile = query({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args): Promise<CommunityUserProfileDto | null> => {
    const user = await resolveAuthor(ctx, args.userId);
    if (!user) return null;

    const questions = (
      await ctx.db
        .query('qa_questions')
        .withIndex('by_user_createdAt', queryBuilder => queryBuilder.eq('userId', args.userId))
        .order('desc')
        .collect()
    ).filter(question => !question.deletedAt);

    const answers = (
      await ctx.db
        .query('qa_answers')
        .withIndex('by_user_createdAt', queryBuilder => queryBuilder.eq('userId', args.userId))
        .order('desc')
        .collect()
    ).filter(answer => !answer.deletedAt);

    const acceptedAnswerCount = answers.filter(answer => answer.isAccepted).length;
    const totalVoteScore =
      questions.reduce((sum, question) => sum + question.voteScore, 0) +
      answers.reduce((sum, answer) => sum + answer.voteScore, 0);

    const recentQuestions = questions.slice(0, 5).map(question => ({
      _id: question._id,
      title: question.title,
      topicSlug: question.topicSlug,
      answerCount: question.answerCount,
      voteScore: question.voteScore,
      createdAt: question.createdAt,
    }));

    const answerQuestionIds = [...new Set(answers.slice(0, 5).map(answer => answer.questionId))];
    const questionMap = new Map<Id<'qa_questions'>, string>();
    await Promise.all(
      answerQuestionIds.map(async questionId => {
        const question = await ctx.db.get(questionId);
        if (question && !question.deletedAt) {
          questionMap.set(questionId, question.title);
        }
      })
    );

    const recentAnswers = answers.slice(0, 5).map(answer => ({
      _id: answer._id,
      questionId: answer.questionId,
      questionTitle: questionMap.get(answer.questionId) || 'Deleted question',
      voteScore: answer.voteScore,
      isAccepted: answer.isAccepted,
      createdAt: answer.createdAt,
    }));

    return {
      user,
      questionCount: questions.length,
      answerCount: answers.length,
      acceptedAnswerCount,
      acceptanceRate: answers.length > 0 ? acceptedAnswerCount / answers.length : 0,
      totalVoteScore,
      recentQuestions,
      recentAnswers,
    };
  },
});
