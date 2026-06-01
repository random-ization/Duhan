'use node';

/**
 * Kiwi-based difficulty estimation for Korean text.
 *
 * Uses morphological analysis to estimate text difficulty without
 * needing an LLM call — faster, cheaper, and deterministic.
 */

import { internalAction } from '../_generated/server';
import { v } from 'convex/values';
import { analyzeSentenceTokens, type StructuredTokenAnalysis } from '../kiwi';

/**
 * TOPIK difficulty levels mapped to numeric scores.
 */
export type TopikDifficultyLevel =
  | 'TOPIK 1'
  | 'TOPIK 2'
  | 'TOPIK 3'
  | 'TOPIK 4'
  | 'TOPIK 5'
  | 'TOPIK 6';

export type DifficultyEstimate = {
  level: TopikDifficultyLevel;
  score: number; // 1-6 numeric scale
  confidence: number; // 0-1 how confident the estimate is
  metrics: {
    avgTokensPerSentence: number;
    uniqueLemmaCount: number;
    particleRatio: number; // Higher = more complex syntax
    endingVariety: number; // Number of distinct endings
    estimatedMinutes: number;
    wordCount: number;
  };
};

/**
 * Common basic vocabulary that indicates lower difficulty.
 * Presence of these lemmas alone doesn't raise the difficulty.
 */
const BASIC_LEMMAS = new Set([
  '이다',
  '있다',
  '하다',
  '되다',
  '가다',
  '오다',
  '보다',
  '주다',
  '알다',
  '나',
  '너',
  '우리',
  '그',
  '이',
  '저',
  '것',
  '수',
  '때',
  '안',
  '못',
  '잘',
  '더',
  '많다',
  '좋다',
  '크다',
  '작다',
]);

/**
 * Complex grammatical endings that indicate higher difficulty.
 */
const COMPLEX_ENDINGS = new Set([
  // Connective endings (연결어미) — intermediate+
  '면서',
  '더니',
  '거든',
  '므로',
  '느라',
  // Modifier endings (관형사형 어미) — intermediate
  '는',
  '은',
  '을',
  '던',
  // Formal/literary endings — advanced
  '노라',
  '리라',
  '도다',
  '로다',
]);

/**
 * Estimate the TOPIK difficulty level of Korean text using Kiwi morphological analysis.
 *
 * Scoring heuristics:
 * - Token density (tokens/sentence): more tokens = more complex
 * - Vocabulary diversity: more unique lemmas = harder
 * - Particle ratio: complex syntax uses more particles
 * - Ending variety: formal/literary endings raise difficulty
 * - Sentence length distribution
 */
export async function estimateDifficulty(
  text: string,
  sentenceCount: number
): Promise<DifficultyEstimate> {
  // Analyze a representative sample (up to 1000 chars)
  const sampleText = text.slice(0, 1000);
  let analysis: StructuredTokenAnalysis;

  try {
    analysis = await analyzeSentenceTokens(sampleText);
  } catch {
    // Fallback: return a middle estimate if Kiwi fails
    return {
      level: 'TOPIK 3',
      score: 3,
      confidence: 0.2,
      metrics: {
        avgTokensPerSentence: 0,
        uniqueLemmaCount: 0,
        particleRatio: 0,
        endingVariety: 0,
        estimatedMinutes: Math.ceil(text.length / 200),
        wordCount: text.split(/\s+/).length,
      },
    };
  }

  const effectiveSentenceCount = Math.max(sentenceCount, 1);
  const avgTokensPerSentence = analysis.tokenCount / effectiveSentenceCount;
  const uniqueLemmaCount = analysis.lemmas.length;
  const particleRatio =
    analysis.tokenCount > 0 ? analysis.particles.length / analysis.tokenCount : 0;
  const endingVariety = new Set(analysis.endings).size;

  // Count advanced vocabulary (non-basic lemmas)
  const advancedLemmaCount = analysis.lemmas.filter(lemma => !BASIC_LEMMAS.has(lemma)).length;
  const advancedLemmaRatio = uniqueLemmaCount > 0 ? advancedLemmaCount / uniqueLemmaCount : 0;

  // Count complex endings
  const complexEndingCount = analysis.endings.filter(ending => COMPLEX_ENDINGS.has(ending)).length;

  // Compute composite score (1-6 scale)
  let score = 1;

  // Token density contribution (0-1.5 points)
  if (avgTokensPerSentence > 20) score += 1.5;
  else if (avgTokensPerSentence > 14) score += 1.0;
  else if (avgTokensPerSentence > 8) score += 0.5;

  // Vocabulary complexity contribution (0-1.5 points)
  if (advancedLemmaRatio > 0.7) score += 1.5;
  else if (advancedLemmaRatio > 0.5) score += 1.0;
  else if (advancedLemmaRatio > 0.3) score += 0.5;

  // Particle density contribution (0-1 point)
  if (particleRatio > 0.25) score += 1.0;
  else if (particleRatio > 0.15) score += 0.5;

  // Ending complexity contribution (0-1 point)
  if (complexEndingCount > 5) score += 1.0;
  else if (complexEndingCount > 2) score += 0.5;

  // Ending variety bonus (0-0.5 points)
  if (endingVariety > 8) score += 0.5;

  // Clamp to 1-6
  score = Math.max(1, Math.min(6, Math.round(score)));

  const levelMap: Record<number, TopikDifficultyLevel> = {
    1: 'TOPIK 1',
    2: 'TOPIK 2',
    3: 'TOPIK 3',
    4: 'TOPIK 4',
    5: 'TOPIK 5',
    6: 'TOPIK 6',
  };

  // Estimate reading time: ~100 chars/min for beginners, ~200 for advanced
  const charsPerMinute = 100 + (6 - score) * 20;
  const estimatedMinutes = Math.max(1, Math.ceil(text.length / charsPerMinute));
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  // Confidence based on sample size
  const confidence = Math.min(1, text.length / 500) * 0.8;

  return {
    level: levelMap[score] || 'TOPIK 3',
    score,
    confidence,
    metrics: {
      avgTokensPerSentence: Math.round(avgTokensPerSentence * 10) / 10,
      uniqueLemmaCount,
      particleRatio: Math.round(particleRatio * 100) / 100,
      endingVariety,
      estimatedMinutes,
      wordCount,
    },
  };
}

export const estimateDifficultyFromText = internalAction({
  args: {
    text: v.string(),
    sentenceCount: v.number(),
  },
  handler: async (_ctx, args): Promise<DifficultyEstimate> =>
    estimateDifficulty(args.text, args.sentenceCount),
});
