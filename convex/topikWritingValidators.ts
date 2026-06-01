import { v } from 'convex/values';

export type WritingQuestionType = 'FILL_BLANK' | 'GRAPH_ESSAY' | 'OPINION_ESSAY';

export type WritingGradingCriteria = {
  taskAccomplishment?: string;
  developmentStructure?: string;
  languageUse?: string;
  wongojiRules?: string;
};

export type WritingAnswerMap = Record<string, string>;

/**
 * KAGAS-based Korean GEC error taxonomy (14 types).
 * Reference: Korean Automated Grammatical Error Annotation System
 *
 * Legacy types (GRAMMAR, VOCAB, SPELLING, WONG_OJI) are mapped to KAGAS:
 * - GRAMMAR → JOSA_ERR / EOMI_ERR / SYNTAX_ERR / TENSE_ERR / HONORIFIC_ERR
 * - VOCAB → VOCAB_ERR / COLLOCATION_ERR
 * - SPELLING → SPELLING_ERR / SPACING_ERR / PUNCT_ERR
 * - WONG_OJI → WONGOJI_ERR
 */
export const KAGAS_ERROR_TYPES = {
  // Morphological errors (형태 오류)
  JOSA_ERR: { ko: '조사 오류', zh: '助词错误', category: 'GRAMMAR' },
  EOMI_ERR: { ko: '어미 오류', zh: '语尾错误', category: 'GRAMMAR' },
  VOCAB_ERR: { ko: '어휘 오류', zh: '词汇错误', category: 'VOCAB' },
  SPELLING_ERR: { ko: '맞춤법 오류', zh: '拼写错误', category: 'SPELLING' },
  SPACING_ERR: { ko: '띄어쓰기 오류', zh: '空格错误', category: 'SPELLING' },
  PUNCT_ERR: { ko: '문장 부호 오류', zh: '标点错误', category: 'SPELLING' },

  // Syntactic errors (통사 오류)
  SYNTAX_ERR: { ko: '문장 구조 오류', zh: '句子结构错误', category: 'GRAMMAR' },
  TENSE_ERR: { ko: '시제 오류', zh: '时态错误', category: 'GRAMMAR' },
  HONORIFIC_ERR: { ko: '높임법 오류', zh: '敬语错误', category: 'GRAMMAR' },
  NEGATION_ERR: { ko: '부정 표현 오류', zh: '否定表达错误', category: 'GRAMMAR' },
  COLLOCATION_ERR: { ko: '연어 오류', zh: '搭配错误', category: 'VOCAB' },

  // Discourse errors (담화 오류)
  COHESION_ERR: { ko: '응집성 오류', zh: '衔接错误', category: 'GRAMMAR' },
  REGISTER_ERR: { ko: '문체 오류', zh: '文体错误', category: 'GRAMMAR' },

  // Format errors (형식 오류)
  WONGOJI_ERR: { ko: '원고지 오류', zh: '稿纸格式错误', category: 'WONG_OJI' },
} as const;

export type KagasErrorType = keyof typeof KAGAS_ERROR_TYPES;

/** Legacy error type → maps to a parent category for backward compatibility */
export type LegacyErrorType = 'GRAMMAR' | 'VOCAB' | 'SPELLING' | 'WONG_OJI';

/**
 * Map a KAGAS error type to its legacy parent category.
 */
export function kagasToLegacyType(kagasType: string): LegacyErrorType {
  const entry = KAGAS_ERROR_TYPES[kagasType as KagasErrorType];
  return (entry?.category as LegacyErrorType) || 'GRAMMAR';
}

export const WRITING_QUESTION_TYPE_VALIDATOR = v.union(
  v.literal('FILL_BLANK'),
  v.literal('GRAPH_ESSAY'),
  v.literal('OPINION_ESSAY')
);

export const WRITING_GRADING_CRITERIA_VALIDATOR = v.object({
  taskAccomplishment: v.optional(v.string()),
  developmentStructure: v.optional(v.string()),
  languageUse: v.optional(v.string()),
  wongojiRules: v.optional(v.string()),
});

export const WRITING_ANSWER_MAP_VALIDATOR = v.record(v.string(), v.string());

export const WRITING_ERROR_VALIDATOR = v.object({
  errorType: v.string(), // KAGAS type (e.g. "JOSA_ERR") or legacy ("GRAMMAR")
  errorTypeKagas: v.optional(v.string()), // KAGAS fine-grained type when available
  originalText: v.string(),
  correctedText: v.string(),
  explanationZh: v.string(),
  severity: v.union(v.literal('LOW'), v.literal('MEDIUM'), v.literal('HIGH')),
  relatedGrammarPattern: v.optional(v.string()),
  verified: v.optional(v.boolean()),
  kiwiContext: v.optional(v.string()),
});

export const WRITING_FEEDBACK_RESULT_VALIDATOR = v.object({
  taskType: v.string(),
  estimatedScore: v.number(),
  scoreBand: v.string(),
  overallCommentZh: v.string(),
  strengths: v.array(v.string()),
  weaknesses: v.array(v.string()),
  errors: v.array(WRITING_ERROR_VALIDATOR),
  improvedVersion: v.string(),
  usefulExpressions: v.array(
    v.object({
      kr: v.string(),
      zh: v.string(),
    })
  ),
  recommendedReview: v.array(
    v.object({
      type: v.union(v.literal('GRAMMAR'), v.literal('WORD')),
      refId: v.optional(v.string()), // ID of grammar point or word if known
      pattern: v.string(),
    })
  ),
  nextPracticeSuggestion: v.string(),
  confidence: v.number(),
  generatedBy: v.optional(v.string()),
  promptVersion: v.optional(v.string()),
});
