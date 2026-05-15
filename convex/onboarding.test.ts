import { describe, it, expect } from 'vitest';
import { convexTest } from 'convex-test';
import schema from './schema';

import * as onboardingModule from './onboarding/index';
import * as serverModule from './_generated/server';

describe('Onboarding Flow', () => {
  it('should return default state for new user', async () => {
    const modules = {
      'onboarding/index': onboardingModule,
      '_generated/server': serverModule,
    };
    const t = convexTest(schema, modules);
    const userId = await t.run(async ctx => {
      return await ctx.db.insert('users', {
        email: 'test@example.com',
        name: 'Test User',
      });
    });

    const tAsUser = t.withIdentity({ subject: userId });

    const state = await tAsUser.query(onboardingModule.getState, {});
    expect(state.profile).toBeNull();
    expect(state.shouldTrigger).toBe(true);
    expect(state.hasCompletedOnboarding).toBe(false);
  });

  it('should transition to goal_set after submitGoals', async () => {
    const modules = {
      'onboarding/index': onboardingModule,
      '_generated/server': serverModule,
    };
    const t = convexTest(schema, modules);
    const userId = await t.run(async ctx => {
      return await ctx.db.insert('users', {
        email: 'test@example.com',
        name: 'Test User',
      });
    });
    const tAsUser = t.withIdentity({ subject: userId });

    const result = await tAsUser.mutation(onboardingModule.submitGoals, {
      preferredLanguage: 'en',
      targetLevel: 'TOPIK 2',
      dailyMinutes: 30,
      studyFocus: ['vocabulary'],
    });
    expect(result.profile.status).toBe('goal_set');
    expect(result.profile.targetLevel).toBe('TOPIK 2');

    const state = await tAsUser.query(onboardingModule.getState, {});
    expect(state.profile?.id).toBe(result.profile.id);
    expect(state.shouldTrigger).toBe(true);
  });

  it('should transition to completed after submitDiagnosisResult', async () => {
    const modules = {
      'onboarding/index': onboardingModule,
      '_generated/server': serverModule,
    };
    const t = convexTest(schema, modules);
    const userId = await t.run(async ctx => {
      return await ctx.db.insert('users', {
        email: 'test@example.com',
        name: 'Test User',
      });
    });
    const tAsUser = t.withIdentity({ subject: userId });

    await tAsUser.mutation(onboardingModule.submitGoals, {
      preferredLanguage: 'zh',
    });

    const result = await tAsUser.mutation(onboardingModule.submitDiagnosisResult, {
      answers: [
        { questionId: 'reading_confidence', optionId: 'keyword_only' }, // score 2
        { questionId: 'listening_confidence', optionId: 'word_by_word' }, // score 1
        { questionId: 'study_consistency', optionId: 'five_plus' }, // score 3
      ],
    });

    // Avg score: (2+1+3)/3 = 2.0 -> TOPIK 2
    expect(result.profile.status).toBe('completed');
    expect(result.recommendedCurrentLevel).toBe('TOPIK 2');
    expect(result.profile.diagnosisSummary).toContain('TOPIK 2');

    const state = await tAsUser.query(onboardingModule.getState, {});
    expect(state.hasCompletedOnboarding).toBe(true);
    expect(state.shouldTrigger).toBe(false);
  });
});
