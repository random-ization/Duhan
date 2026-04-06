import { describe, expect, it, beforeAll } from 'vitest';
import { convexTest } from 'convex-test';
import { api } from '../../convex/_generated/api';

describe('Vocabulary Module Integration Tests', () => {
  let test: ReturnType<typeof convexTest>;

  beforeAll(() => {
    test = convexTest(api);
  });

  describe('Vocabulary Queries', () => {
    it('should get vocabulary stats for a user', async () => {
      await test.run(async (ctx) => {
        // Create a test user
        const user = await ctx.db.insert('users', {
          email: 'test@example.com',
          name: 'Test User',
          role: 'STUDENT',
          accountStatus: 'ACTIVE',
          isVerified: false,
          kycStatus: 'NONE',
          tier: 'FREE',
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
        });
        return user;
      });

      const stats = await test.query(api.vocab.getStats, {
        courseId: 'test-course',
      });

      expect(stats).toEqual({
        total: 0,
        mastered: 0,
      });
    });

    it('should get daily phrase', async () => {
      await test.run(async (ctx) => {
        // Create test data
        const user = await ctx.db.insert('users', {
          email: 'test@example.com',
          name: 'Test User',
          role: 'STUDENT',
          accountStatus: 'ACTIVE',
          isVerified: false,
          kycStatus: 'NONE',
          tier: 'FREE',
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
        });

        // Create a daily phrase
        await ctx.db.insert('daily_phrases', {
          phrase: '안녕하세요',
          meaning: 'Hello',
          meaningZh: '你好',
          meaningVi: 'Xin chào',
          meaningMn: 'Сайн уу',
          date: new Date().toISOString().split('T')[0],
          createdAt: Date.now(),
        });

        return user;
      });

      const dailyPhrase = await test.query(api.vocab.getDailyPhrase);

      expect(dailyPhrase).not.toBeNull();
    });
  });

  describe('Vocabulary Mutations', () => {
    it('should save a new word', async () => {
      await test.run(async (ctx) => {
        // Create a test user
        const user = await ctx.db.insert('users', {
          email: 'test@example.com',
          name: 'Test User',
          role: 'STUDENT',
          accountStatus: 'ACTIVE',
          isVerified: false,
          kycStatus: 'NONE',
          tier: 'FREE',
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
        });
        return user;
      });

      const result = await test.mutation(api.vocab.saveWord, {
        word: '사과',
        meaning: 'Apple',
        meaningZh: '苹果',
        meaningVi: 'Táo',
        meaningMn: 'Алим',
        partOfSpeech: 'noun',
      });

      expect(result.success).toBe(true);
      expect(result.wordId).toBeDefined();
    });

    it('should update vocabulary progress', async () => {
      const resultData = await test.run(async (ctx) => {
        // Create test user and word
        const user = await ctx.db.insert('users', {
          email: 'test@example.com',
          name: 'Test User',
          role: 'STUDENT',
          accountStatus: 'ACTIVE',
          isVerified: false,
          kycStatus: 'NONE',
          tier: 'FREE',
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
        });

        const word = await ctx.db.insert('words', {
          word: '사과',
          meaning: 'Apple',
          meaningEn: 'Apple',
          meaningVi: 'Táo',
          meaningMn: 'Алим',
          partOfSpeech: 'noun',
        });

        return { userId: user, wordId: word };
      });

      const result = await test.mutation(api.vocab.updateProgress, {
        wordId: resultData.wordId,
        status: 'LEARNING',
        proficiency: 30,
      });

      expect(result.success).toBe(true);
    });

    it('should bulk import vocabulary', async () => {
      await test.run(async (ctx) => {
        // Create admin user
        const user = await ctx.db.insert('users', {
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'ADMIN',
          accountStatus: 'ACTIVE',
          isVerified: false,
          kycStatus: 'NONE',
          tier: 'FREE',
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
        });
        return user;
      });

      const items = [
        {
          word: '사과',
          meaning: 'Apple',
          meaningZh: '苹果',
          meaningVi: 'Táo',
          meaningMn: 'Алим',
          partOfSpeech: 'noun',
        },
        {
          word: '바나나',
          meaning: 'Banana',
          meaningZh: '香蕉',
          meaningVi: 'Chuối',
          meaningMn: 'Жимс',
          partOfSpeech: 'noun',
        },
      ];

      const result = await test.mutation(api.vocab.bulkImport, {
        items,
      });

      expect(result.success).toBe(true);
      expect(result.results).toBeDefined();
    });
  });
});
