import { describe, it, expect,   } from 'vitest';
import { convexTest } from 'convex-test';
import { api } from '../../convex/_generated/api';
import schema from '../../convex/schema';

describe('Onboarding Flow', () => {
  it('should return default state for new user', async () => {
    const t = convexTest(schema);
    const userId = await t.db.insert('users', {
      email: 'test@example.com',
      name: 'Test User',
    });
    
    // Mock authentication
    t.withIdentity({ subject: userId });

    const state = await t.query(api.onboarding.getState, {});
    expect(state.profile).toBeNull();
    expect(state.shouldTrigger).toBe(true);
    expect(state.hasCompletedOnboarding).toBe(false);
  });

  it('should transition to goal_set after submitGoals', async () => {
    const t = convexTest(schema);
    const userId = await t.db.insert('users', {
      email: 'test@example.com',
      name: 'Test User',
    });
    t.withIdentity({ subject: userId });

    const result = await t.mutation(api.onboarding.submitGoals, {
      preferredLanguage: 'en',
      targetLevel: 'TOPIK 2',
      dailyMinutes: 30,
    });

    expect(result.status).toBe('created');
    expect(result.profile.status).toBe('goal_set');
    expect(result.profile.targetLevel).toBe('TOPIK 2');

    const state = await t.query(api.onboarding.getState, {});
    expect(state.profile?.id).toBe(result.profile.id);
    expect(state.shouldTrigger).toBe(true);
  });

  it('should transition to completed after submitDiagnosisResult', async () => {
    const t = convexTest(schema);
    const userId = await t.db.insert('users', {
      email: 'test@example.com',
      name: 'Test User',
    });
    t.withIdentity({ subject: userId });

    await t.mutation(api.onboarding.submitGoals, {
      preferredLanguage: 'zh',
    });

    const result = await t.mutation(api.onboarding.submitDiagnosisResult, {
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

    const state = await t.query(api.onboarding.getState, {});
    expect(state.hasCompletedOnboarding).toBe(true);
    expect(state.shouldTrigger).toBe(false);
  });
});
