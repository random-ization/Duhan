/* eslint-disable @typescript-eslint/no-explicit-any */
import { convexTest } from 'convex-test';
import { expect, test, describe } from 'vitest';
import schema from './schema';
import * as onboardingModule from './onboarding/index';
import * as dailyTaskModule from './dailyTask/index';
import * as aiUsageLogsModule from './aiUsageLogs';
import * as vocabMutationsModule from './vocab/vocabMutations';
import * as learningAssetsModule from './learningAssets';
import * as sentenceExplainerSaveModule from './sentenceExplainer/save';
import * as serverModule from './_generated/server';

const modules = {
  'onboarding/index': async () => onboardingModule,
  'dailyTask/index': async () => dailyTaskModule,
  aiUsageLogs: async () => aiUsageLogsModule,
  'vocab/vocabMutations': async () => vocabMutationsModule,
  learningAssets: async () => learningAssetsModule,
  'sentenceExplainer/save': async () => sentenceExplainerSaveModule,
  '_generated/server': async () => serverModule,
};

/**
 * P0 Beta Gate Minimal Integration Tests
 */
describe('P0 Beta Gate', () => {
  test('Integration Test Suite (P0 Features)', async () => {
    const t = convexTest(schema, modules);

    const userId = await t.run(async ctx => {
      return await ctx.db.insert('users', {
        name: 'Test User',
        email: 'test@example.com',
        role: 'ADMIN',
        createdAt: Date.now(),
        accountStatus: 'ACTIVE',
        tier: 'FREE',
      });
    });
    const tAsUser = t.withIdentity({ subject: userId });

    // 1. AI Usage Tracking Verification
    await tAsUser.mutation(aiUsageLogsModule.logUsage as any, {
      userId,
      feature: 'sentence_explanation',
      model: 'gpt-4o',
      provider: 'openai',
      status: 'success',
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      costUsd: 0.002,
    });

    const logs = await t.run(async ctx => {
      return await ctx.db.query('ai_usage_logs').collect();
    });
    expect(logs.length).toBeGreaterThanOrEqual(1);

    // 2. Learning Assets Aggregation Verification
    await tAsUser.mutation(vocabMutationsModule.addToReview as any, {
      word: '사과',
      meaning: 'apple',
      source: 'reading',
    });

    const summary: any = await tAsUser.query(learningAssetsModule.getReviewAggregate as any, {});
    expect(summary.savedWordCount).toBeGreaterThanOrEqual(1);

    // 3. Save Asset Traceability Verification
    const explanationId = await t.run(async ctx => {
      return await ctx.db.insert('sentence_explanations', {
        userId,
        sentence: '안녕하세요',
        textHash: 'hash123',
        targetLanguage: 'zh',
        payload: {
          sentence: '안녕하세요',
          naturalTranslation: 'Hello',
          vocabulary: [{ surface: '안녕', lemma: '안녕', meaning: 'peace/hello' }],
        },
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    await tAsUser.mutation(sentenceExplainerSaveModule.saveAssets as any, {
      explanationId,
      sentence: '안녕하세요',
      translation: 'Hello',
      source: 'src123',
      sourceRefId: 'ref456',
    });

    const recent: any = await tAsUser.query(learningAssetsModule.getRecentSavedAssets as any, {
      limit: 5,
    });
    const saved = recent.find((r: any) => r.title === '안녕하세요');
    expect(saved).toBeDefined();
  });
});
