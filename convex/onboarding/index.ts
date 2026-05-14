import { ConvexError, v } from 'convex/values';
import { mutation, query } from '../_generated/server';
import { getAuthUserId } from '../utils';
import {
  assertDiagnosisQuestionExists,
  buildDiagnosisSummary,
  getDiagnosisQuestions as buildDiagnosisQuestions,
  getLatestGoalProfile,
  inferCurrentLevelFromScore,
  inferSuggestedDailyMinutes,
  normalizeOnboardingLanguage,
  ONBOARDING_VERSION,
  toGoalProfileStatus,
  type DiagnosisQuestionDto,
  type GoalProfileStatus,
} from './shared';

export type GoalProfileDto = {
  id: string;
  status: GoalProfileStatus;
  onboardingVersion?: string;
  preferredLanguage?: string;
  currentLevel?: string;
  targetLevel?: string;
  targetExam?: string;
  dailyMinutes?: number;
  studyFocus: string[];
  diagnosisSummary?: string;
  diagnosisSnapshot?: unknown;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
};

export type OnboardingStateDto = {
  profile: GoalProfileDto | null;
  shouldTrigger: boolean;
  hasCompletedOnboarding: boolean;
  diagnosisCompleted: boolean;
};

export type SubmitGoalsResult = {
  status: 'created' | 'updated';
  profile: GoalProfileDto;
};

export type SubmitDiagnosisResult = {
  profile: GoalProfileDto;
  recommendedCurrentLevel: string;
  suggestedDailyMinutes: number;
};

function toGoalProfileDto(profile: {
  _id: string;
  status: string;
  onboardingVersion?: string;
  preferredLanguage?: string;
  currentLevel?: string;
  targetLevel?: string;
  targetExam?: string;
  dailyMinutes?: number;
  studyFocus?: string[];
  diagnosisSummary?: string;
  diagnosisSnapshot?: unknown;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}): GoalProfileDto {
  return {
    id: profile._id,
    status: toGoalProfileStatus(profile.status),
    onboardingVersion: profile.onboardingVersion,
    preferredLanguage: profile.preferredLanguage,
    currentLevel: profile.currentLevel,
    targetLevel: profile.targetLevel,
    targetExam: profile.targetExam,
    dailyMinutes: profile.dailyMinutes,
    studyFocus: profile.studyFocus ?? [],
    diagnosisSummary: profile.diagnosisSummary,
    diagnosisSnapshot: profile.diagnosisSnapshot,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    completedAt: profile.completedAt,
  };
}

export const getState = query({
  args: {},
  handler: async (ctx): Promise<OnboardingStateDto> => {
    const userId = await getAuthUserId(ctx);
    const profile = await getLatestGoalProfile(ctx, userId);

    const profileDto = profile ? toGoalProfileDto(profile) : null;
    const completed = profileDto?.status === 'completed';
    return {
      profile: profileDto,
      shouldTrigger: !completed,
      hasCompletedOnboarding: !!completed,
      diagnosisCompleted: !!profileDto?.diagnosisSnapshot,
    };
  },
});

export const getDiagnosisQuestions = query({
  args: {
    language: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<DiagnosisQuestionDto[]> => {
    await getAuthUserId(ctx);
    return buildDiagnosisQuestions(args.language);
  },
});

export const submitGoals = mutation({
  args: {
    preferredLanguage: v.optional(v.string()),
    currentLevel: v.optional(v.string()),
    targetLevel: v.optional(v.string()),
    targetExam: v.optional(v.string()),
    dailyMinutes: v.optional(v.number()),
    studyFocus: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<SubmitGoalsResult> => {
    const userId = await getAuthUserId(ctx);
    const now = Date.now();
    const existing = await getLatestGoalProfile(ctx, userId);
    const normalizedFocus = Array.from(
      new Set((args.studyFocus ?? []).map(item => item.trim()).filter(Boolean))
    ).slice(0, 6);
    const normalizedDailyMinutes =
      typeof args.dailyMinutes === 'number' && Number.isFinite(args.dailyMinutes)
        ? Math.max(10, Math.min(180, Math.round(args.dailyMinutes)))
        : undefined;

    if (existing) {
      await ctx.db.patch(existing._id, {
        onboardingVersion: ONBOARDING_VERSION,
        status: existing.diagnosisSnapshot ? 'completed' : 'goal_set',
        preferredLanguage: args.preferredLanguage ?? existing.preferredLanguage,
        currentLevel: args.currentLevel ?? existing.currentLevel,
        targetLevel: args.targetLevel ?? existing.targetLevel,
        targetExam: args.targetExam ?? existing.targetExam,
        dailyMinutes: normalizedDailyMinutes ?? existing.dailyMinutes,
        studyFocus: normalizedFocus.length > 0 ? normalizedFocus : existing.studyFocus,
        updatedAt: now,
      });
      const updated = await ctx.db.get(existing._id);
      if (!updated) {
        throw new ConvexError({ code: 'GOAL_PROFILE_NOT_FOUND' });
      }
      return {
        status: 'updated',
        profile: toGoalProfileDto(updated),
      };
    }

    const insertedId = await ctx.db.insert('user_goal_profile', {
      userId,
      status: 'goal_set',
      onboardingVersion: ONBOARDING_VERSION,
      preferredLanguage: args.preferredLanguage,
      currentLevel: args.currentLevel,
      targetLevel: args.targetLevel,
      targetExam: args.targetExam,
      dailyMinutes: normalizedDailyMinutes,
      studyFocus: normalizedFocus,
      createdAt: now,
      updatedAt: now,
    });
    const inserted = await ctx.db.get(insertedId);
    if (!inserted) {
      throw new ConvexError({ code: 'GOAL_PROFILE_CREATE_FAILED' });
    }
    return {
      status: 'created',
      profile: toGoalProfileDto(inserted),
    };
  },
});

export const submitDiagnosisResult = mutation({
  args: {
    language: v.optional(v.string()),
    answers: v.array(
      v.object({
        questionId: v.string(),
        optionId: v.string(),
      })
    ),
  },
  handler: async (ctx, args): Promise<SubmitDiagnosisResult> => {
    const userId = await getAuthUserId(ctx);
    const now = Date.now();
    const existing = await getLatestGoalProfile(ctx, userId);
    if (!existing) {
      throw new ConvexError({
        code: 'GOAL_PROFILE_REQUIRED',
        message: 'Submit learner goals before diagnosis results.',
      });
    }

    if (args.answers.length === 0) {
      throw new ConvexError({ code: 'DIAGNOSIS_ANSWERS_REQUIRED' });
    }

    const normalizedLanguage = normalizeOnboardingLanguage(
      args.language ?? existing.preferredLanguage
    );

    const answers = args.answers.map(answer => {
      const question = assertDiagnosisQuestionExists(answer.questionId);
      const option = question.options.find(item => item.id === answer.optionId);
      if (!option) {
        throw new ConvexError({
          code: 'INVALID_DIAGNOSIS_OPTION',
          message: `Unknown option "${answer.optionId}" for question "${answer.questionId}"`,
        });
      }
      return {
        questionId: question.id,
        optionId: option.id,
        score: option.score,
      };
    });

    const totalScore = answers.reduce((sum, answer) => sum + answer.score, 0);
    const averageScore = totalScore / answers.length;
    const recommendedCurrentLevel = inferCurrentLevelFromScore(averageScore);
    const suggestedDailyMinutes = existing.dailyMinutes ?? inferSuggestedDailyMinutes(averageScore);
    const focusAreas =
      existing.studyFocus && existing.studyFocus.length > 0
        ? existing.studyFocus
        : normalizedLanguage === 'zh'
          ? ['词汇复习', '输入沉浸']
          : normalizedLanguage === 'vi'
            ? ['ôn từ vựng', 'nghe đọc đầu vào']
            : normalizedLanguage === 'mn'
              ? ['үгийн давтлага', 'оролтын дасгал']
              : ['vocabulary review', 'comprehension input'];
    const diagnosisSummary = buildDiagnosisSummary({
      averageScore,
      language: normalizedLanguage,
      recommendedCurrentLevel,
      suggestedDailyMinutes,
      focusAreas,
    });

    await ctx.db.patch(existing._id, {
      status: 'completed',
      onboardingVersion: ONBOARDING_VERSION,
      preferredLanguage: existing.preferredLanguage ?? normalizedLanguage,
      currentLevel: existing.currentLevel ?? recommendedCurrentLevel,
      dailyMinutes: suggestedDailyMinutes,
      diagnosisSummary,
      diagnosisSnapshot: {
        averageScore,
        submittedAt: now,
        answers,
        recommendedCurrentLevel,
        suggestedDailyMinutes,
      },
      updatedAt: now,
      completedAt: now,
    });

    const updated = await ctx.db.get(existing._id);
    if (!updated) {
      throw new ConvexError({ code: 'GOAL_PROFILE_NOT_FOUND' });
    }

    return {
      profile: toGoalProfileDto(updated),
      recommendedCurrentLevel,
      suggestedDailyMinutes,
    };
  },
});
