// hooks/useTopikQuestions.ts
// 前端辅助 Hook：按需从 CDN 获取 TOPIK 考试题目数据

import { useState, useEffect, useCallback } from 'react';
import { TopikQuestion, TopikExam } from '../types';

/**
 * 考试数据（扩展类型）
 * - 列表页返回的数据不含 questions，但有 questionsUrl
 * - 详情页/编辑器需要完整的 questions 数据
 */
export interface TopikExamWithUrl extends Omit<TopikExam, 'questions'> {
  questions: TopikQuestion[] | null;
  questionsUrl?: string | null;
  hasQuestions?: boolean;
}

/**
 * 从 CDN URL 获取题目数据
 * @param url - CDN URL
 * @returns 题目数组
 */
export const fetchQuestionsFromCdn = async (url: string): Promise<TopikQuestion[]> => {
  const response = await fetch(url, {
    // 使用 CDN 缓存
    cache: 'default',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch questions: ${response.status}`);
  }

  const data = await response.json();
  return data as TopikQuestion[];
};

/**
 * 判断并获取考试题目
 * - 如果 questions 已经是数组，直接返回
 * - 如果有 questionsUrl，从 CDN 获取
 * @param exam - 考试数据
 * @returns 题目数组
 */
export const resolveQuestions = async (exam: TopikExamWithUrl): Promise<TopikQuestion[]> => {
  // 已经有完整数据
  if (Array.isArray(exam.questions) && exam.questions.length > 0) {
    return exam.questions;
  }

  // 需要从 CDN 获取
  if (exam.questionsUrl) {
    return fetchQuestionsFromCdn(exam.questionsUrl);
  }

  // 无数据
  return [];
};

/**
 * React Hook: 按需加载考试题目
 * @param exam - 考试数据（可能不含 questions）
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

    // 如果已经有完整数据，直接使用
    if (Array.isArray(exam.questions) && exam.questions.length > 0) {
      setQuestions(exam.questions);
      return;
    }

    // 如果有 URL，从 CDN 获取
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

    // 无数据
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
 * 预加载考试题目到缓存
 * 用于在用户即将进入考试时提前加载数据
 * @param url - CDN URL
 */
export const prefetchQuestions = async (url: string): Promise<void> => {
  try {
    // 使用 fetch 预加载到浏览器缓存
    await fetch(url, { cache: 'default' });
  } catch (e) {
    console.warn('[prefetchQuestions] Failed to prefetch:', e);
  }
};

/**
 * 清理过期的本地缓存（如果使用 localStorage 缓存）
 * 这是一个可选的辅助函数
 */
export const clearQuestionsCache = (examId: string): void => {
  const cacheKey = `topik-questions-${examId}`;
  try {
    localStorage.removeItem(cacheKey);
  } catch {
    // localStorage 不可用
  }
};

export default useTopikQuestions;
