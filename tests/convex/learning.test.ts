import { describe, expect, it, beforeAll } from 'vitest';
import { convexTest } from 'convex-test';
import { api } from '../../convex/_generated/api';

describe('Learning Progress Integration Tests', () => {
  let test: ReturnType<typeof convexTest>;

  beforeAll(() => {
    test = convexTest(api);
  });

  describe('Learning Analytics', () => {
    it('should track learning events', async () => {
      await test.run(async (ctx) => {
        // Create a test user
        const user = await ctx.db.insert('users', {
          email: 'learning@example.com',
          name: 'Learning User',
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

      // @ts-expect-error - API might not be fully generated in test environment
      const result = await test.mutation(api.learning.trackEvent, {
        sessionId: 'session-123',
        module: 'VOCAB',
        eventName: 'word_learned',
        source: 'flashcard',
        metadata: {
          wordId: 'word-123',
          difficulty: 'easy',
          timeSpent: 30,
        },
      });

      expect(result.success).toBe(true);
    });

    it('should get learning analytics', async () => {
      await test.run(async (ctx) => {
        // Create a test user
        const user = await ctx.db.insert('users', {
          email: 'analytics@example.com',
          name: 'Analytics User',
          role: 'STUDENT',
          accountStatus: 'ACTIVE',
          isVerified: false,
          kycStatus: 'NONE',
          tier: 'FREE',
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
        });

        // Create some learning events
        await ctx.db.insert('learning_analytics', {
          userId: user,
          sessionId: 'session-1',
          module: 'VOCAB',
          eventName: 'word_learned',
          source: 'flashcard',
          metadata: {
            wordId: 'word-1',
          },
          timestamp: Date.now() - 3600000, // 1 hour ago
        });

        await ctx.db.insert('learning_analytics', {
          userId: user,
          sessionId: 'session-2',
          module: 'GRAMMAR',
          eventName: 'lesson_completed',
          source: 'tutorial',
          metadata: {
            lessonId: 'lesson-1',
          },
          timestamp: Date.now() - 1800000, // 30 minutes ago
        });

        return user;
      });

      // @ts-expect-error - API module might not be fully generated
      const result = await test.query(api.learning.getAnalytics, {
        timeframe: '24h',
      });

      expect(result.totalEvents).toBe(2);
      expect(result.moduleStats).toBeDefined();
    });

    it('should persist learning snapshot', async () => {
      await test.run(async (ctx) => {
        // Create a test user
        const user = await ctx.db.insert('users', {
          email: 'snapshot@example.com',
          name: 'Snapshot User',
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

      const snapshot = {
        sessionId: 'session-123',
        module: 'VOCAB',
        startTime: Date.now() - 300000, // 5 minutes ago
        endTime: Date.now(),
        wordsStudied: 10,
        correctAnswers: 8,
        totalAnswers: 10,
        difficulty: 'medium',
      };

      // @ts-expect-error - API module might not be fully generated
      const result = await test.mutation(api.learning.persistSnapshot, {
        mode: 'FLASHCARD',
        snapshot,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Exam Attempts', () => {
    it('should save exam attempt', async () => {
      const resultData = await test.run(async (ctx) => {
        // Create a test user
        const user = await ctx.db.insert('users', {
          email: 'exam@example.com',
          name: 'Exam User',
          role: 'STUDENT',
          accountStatus: 'ACTIVE',
          isVerified: false,
          kycStatus: 'NONE',
          tier: 'FREE',
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
        });

        // Create an exam
        const exam = await ctx.db.insert('exams', {
          title: 'TOPIK Level 1 Practice',
          type: 'READING',
          instituteId: 'institute-1',
          level: 1,
          unitId: 1,
          questions: [
            {
              id: 1,
              type: 'multiple_choice',
              question: 'Test question',
              options: ['A', 'B', 'C', 'D'],
              correctAnswer: 0,
              explanation: 'Test explanation',
            },
          ],
          createdAt: Date.now(),
        });

        return { userId: user, examId: exam };
      });

      // @ts-expect-error - API module might not be fully generated
      const result = await test.mutation(api.exams.saveAttempt, {
        examId: resultData.examId,
        score: 8,
        totalQuestions: 10,
        duration: 1800, // 30 minutes
        accuracy: 80,
        sessionId: 'exam-session-123',
        userAnswers: { '1': 0 },
      });

      expect(result.success).toBe(true);
    });

    it('should get exam history', async () => {
      await test.run(async (ctx) => {
        // Create a test user
        const user = await ctx.db.insert('users', {
          email: 'history@example.com',
          name: 'History User',
          role: 'STUDENT',
          accountStatus: 'ACTIVE',
          isVerified: false,
          kycStatus: 'NONE',
          tier: 'FREE',
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
        });

        // Create an exam
        const exam = await ctx.db.insert('exams', {
          title: 'TOPIK Level 2 Practice',
          type: 'LISTENING',
          instituteId: 'institute-1',
          level: 2,
          unitId: 1,
          questions: [
            {
              id: 1,
              type: 'multiple_choice',
              question: 'Test question',
              options: ['A', 'B', 'C', 'D'],
              correctAnswer: 0,
              explanation: 'Test explanation',
            },
          ],
          createdAt: Date.now(),
        });

        // Create exam attempts
        await ctx.db.insert('exam_attempts', {
          userId: user,
          examId: exam,
          score: 75,
          totalQuestions: 10,
          duration: 1500,
          accuracy: 75,
          sessionId: 'session-1',
          userAnswers: { '1': 0 },
          createdAt: Date.now() - 86400000, // 1 day ago
        });

        await ctx.db.insert('exam_attempts', {
          userId: user,
          examId: exam,
          score: 85,
          totalQuestions: 10,
          duration: 1400,
          accuracy: 85,
          sessionId: 'session-2',
          userAnswers: { '1': 0 },
          createdAt: Date.now() - 3600000, // 1 hour ago
        });

        return user;
      });

      // @ts-expect-error - API module might not be fully generated
      const result = await test.query(api.exams.getHistory, {
        limit: 10,
      });

      expect(result).toHaveLength(2);
    });

    it('should delete exam attempt', async () => {
      const attemptId = await test.run(async (ctx) => {
        // Create a test user
        const user = await ctx.db.insert('users', {
          email: 'delete@example.com',
          name: 'Delete User',
          role: 'STUDENT',
          accountStatus: 'ACTIVE',
          isVerified: false,
          kycStatus: 'NONE',
          tier: 'FREE',
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
        });

        // Create an exam
        const exam = await ctx.db.insert('exams', {
          title: 'TOPIK Level 3 Practice',
          type: 'READING',
          instituteId: 'institute-1',
          level: 3,
          unitId: 1,
          questions: [
            {
              id: 1,
              type: 'multiple_choice',
              question: 'Test question',
              options: ['A', 'B', 'C', 'D'],
              correctAnswer: 0,
              explanation: 'Test explanation',
            },
          ],
          createdAt: Date.now(),
        });

        // Create exam attempt
        const attempt = await ctx.db.insert('exam_attempts', {
          userId: user,
          examId: exam,
          score: 90,
          totalQuestions: 10,
          duration: 1200,
          accuracy: 90,
          sessionId: 'session-delete',
          userAnswers: { '1': 0 },
          createdAt: Date.now(),
        });

        return attempt;
      });

      // @ts-expect-error - API module might not be fully generated
      const result = await test.mutation(api.exams.deleteAttempt, {
        attemptId,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Mistake Tracking', () => {
    it('should save mistake', async () => {
      await test.run(async (ctx) => {
        // Create a test user
        const user = await ctx.db.insert('users', {
          email: 'mistake@example.com',
          name: 'Mistake User',
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

      // @ts-expect-error - API module might not be fully generated
      const result = await test.mutation(api.mistakes.save, {
        word: '어려워',
        meaning: 'Difficult',
        mistakeType: 'pronunciation',
        context: 'I thought it was pronounced differently',
        correction: 'The correct pronunciation is...',
      });

      expect(result.success).toBe(true);
    });

    it('should get user mistakes', async () => {
      await test.run(async (ctx) => {
        // Create a test user
        const user = await ctx.db.insert('users', {
          email: 'mistakes@example.com',
          name: 'Mistakes User',
          role: 'STUDENT',
          accountStatus: 'ACTIVE',
          isVerified: false,
          kycStatus: 'NONE',
          tier: 'FREE',
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
        });

        // Create some mistakes
        await ctx.db.insert('mistakes', {
          userId: user,
          word: '어려워',
          meaning: 'Difficult',
          mistakeType: 'pronunciation',
          context: 'Practice session',
          correction: 'Correct pronunciation',
          createdAt: Date.now() - 3600000,
        });

        await ctx.db.insert('mistakes', {
          userId: user,
          word: '감사합니다',
          meaning: 'Thank you',
          mistakeType: 'usage',
          context: 'Writing exercise',
          correction: 'Better usage',
          createdAt: Date.now() - 1800000,
        });

        return user;
      });

      // @ts-expect-error - API module might not be fully generated
      const result = await test.query(api.mistakes.list, {
        limit: 10,
      });

      expect(result).toHaveLength(2);
    });

    it('should clear all mistakes', async () => {
      await test.run(async (ctx) => {
        // Create a test user
        const user = await ctx.db.insert('users', {
          email: 'clear@example.com',
          name: 'Clear User',
          role: 'STUDENT',
          accountStatus: 'ACTIVE',
          isVerified: false,
          kycStatus: 'NONE',
          tier: 'FREE',
          createdAt: Date.now(),
          lastActivityAt: Date.now(),
        });

        // Create some mistakes
        await ctx.db.insert('mistakes', {
          userId: user,
          word: '어려워',
          meaning: 'Difficult',
          mistakeType: 'pronunciation',
          context: 'Practice session',
          correction: 'Correct pronunciation',
          createdAt: Date.now(),
        });

        await ctx.db.insert('mistakes', {
          userId: user,
          word: '감사합니다',
          meaning: 'Thank you',
          mistakeType: 'usage',
          context: 'Writing exercise',
          correction: 'Better usage',
          createdAt: Date.now(),
        });

        return user;
      });

      // @ts-expect-error - API module might not be fully generated
      const result = await test.mutation(api.mistakes.clear);

      expect(result.success).toBe(true);
    });
  });
});
