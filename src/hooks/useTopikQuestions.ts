// hooks/useTopikQuestions.ts
// \u524d\u7aef\u8f85\u52a9 Hook：\u6309\u9700\u4ece CDN \u83b7\u53d6 TOPIK \u8003\u8bd5\u9898\u76ee\u6570\u636e

import { useState, useEffect, useCallback } from 'react';
import { TopikQuestion, TopikExam } from '../types';
import { logger } from '../utils/logger';

/**
 * \u8003\u8bd5\u6570\u636e（\u6269\u5c55\u7c7b\u578b）
 * - \u5217\u8868\u9875\u8fd4\u56de\u7684\u6570\u636e\u4e0d\u542b questions，\u4f46\u6709 questionsUrl
 * - \u8be6\u60c5\u9875/\u7f16\u8f91\u5668\u9700\u8981\u5b8c\u6574\u7684 questions \u6570\u636e
 */
export interface TopikExamWithUrl extends Omit<TopikExam, 'questions'> {
  questions: TopikQuestion[] | null;
  questionsUrl?: string | null;
  hasQuestions?: boolean;
}

/**
 * \u4ece CDN URL \u83b7\u53d6\u9898\u76ee\u6570\u636e
 * @param url - CDN URL
 * @returns \u9898\u76ee\u6570\u7ec4
 */
export const fetchQuestionsFromCdn = async (url: string): Promise<TopikQuestion[]> => {
  const response = await fetch(url, {
    // \u4f7f\u7528 CDN \u7f13\u5b58
    cache: 'default',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch questions: ${response.status}`);
  }

  const data = await response.json();
  return data as TopikQuestion[];
};

/**
 * \u5224\u65ad\u5e76\u83b7\u53d6\u8003\u8bd5\u9898\u76ee
 * - \u5982\u679c questions \u5df2\u7ecf\u662f\u6570\u7ec4，\u76f4\u63a5\u8fd4\u56de
 * - \u5982\u679c\u6709 questionsUrl，\u4ece CDN \u83b7\u53d6
 * @param exam - \u8003\u8bd5\u6570\u636e
 * @returns \u9898\u76ee\u6570\u7ec4
 */
export const resolveQuestions = async (exam: TopikExamWithUrl): Promise<TopikQuestion[]> => {
  // \u5df2\u7ecf\u6709\u5b8c\u6574\u6570\u636e
  if (Array.isArray(exam.questions) && exam.questions.length > 0) {
    return exam.questions;
  }

  // \u9700\u8981\u4ece CDN \u83b7\u53d6
  if (exam.questionsUrl) {
    return fetchQuestionsFromCdn(exam.questionsUrl);
  }

  // \u65e0\u6570\u636e
  return [];
};

/**
 * React Hook: \u6309\u9700\u52a0\u8f7d\u8003\u8bd5\u9898\u76ee
 * @param exam - \u8003\u8bd5\u6570\u636e（\u53ef\u80fd\u4e0d\u542b questions）
 * @returns { questions, loading, error, refetch }
 */
export const useTopikQuestions = (exam: TopikExamWithUrl | null) => {
  const [questions, setQuestions] = useState<TopikQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchQuestions = useCallback(async () => {
    if (!exam) {
      setQuestions([]);
      return;
    }

    // \u5982\u679c\u5df2\u7ecf\u6709\u5b8c\u6574\u6570\u636e，\u76f4\u63a5\u4f7f\u7528
    if (Array.isArray(exam.questions) && exam.questions.length > 0) {
      setQuestions(exam.questions);
      return;
    }

    // \u5982\u679c\u6709 URL，\u4ece CDN \u83b7\u53d6
    if (exam.questionsUrl) {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchQuestionsFromCdn(exam.questionsUrl);
        setQuestions(data);
      } catch (err) {
        setError(err as Error);
        setQuestions([]);
      } finally {
        setLoading(false);
      }
      return;
    }

    // \u65e0\u6570\u636e
    setQuestions([]);
  }, [exam]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  return {
    questions,
    loading,
    error,
    refetch: fetchQuestions,
  };
};

/**
 * \u9884\u52a0\u8f7d\u8003\u8bd5\u9898\u76ee\u5230\u7f13\u5b58
 * \u7528\u4e8e\u5728\u7528\u6237\u5373\u5c06\u8fdb\u5165\u8003\u8bd5\u65f6\u63d0\u524d\u52a0\u8f7d\u6570\u636e
 * @param url - CDN URL
 */
export const prefetchQuestions = async (url: string): Promise<void> => {
  try {
    // \u4f7f\u7528 fetch \u9884\u52a0\u8f7d\u5230\u6d4f\u89c8\u5668\u7f13\u5b58
    await fetch(url, { cache: 'default' });
  } catch (e) {
    logger.warn('[prefetchQuestions] Failed to prefetch:', e);
  }
};

/**
 * \u6e05\u7406\u8fc7\u671f\u7684\u672c\u5730\u7f13\u5b58（\u5982\u679c\u4f7f\u7528 localStorage \u7f13\u5b58）
 * \u8fd9\u662f\u4e00\u4e2a\u53ef\u9009\u7684\u8f85\u52a9\u51fd\u6570
 */
export const clearQuestionsCache = (examId: string): void => {
  const cacheKey = `topik-questions-${examId}`;
  try {
    localStorage.removeItem(cacheKey);
  } catch {
    // localStorage \u4e0d\u53ef\u7528
  }
};

export default useTopikQuestions;
