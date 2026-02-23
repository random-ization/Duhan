import { v } from 'convex/values';

export type WritingQuestionType = 'FILL_BLANK' | 'GRAPH_ESSAY' | 'OPINION_ESSAY';

export type WritingGradingCriteria = {
  taskAccomplishment?: string;
  developmentStructure?: string;
  languageUse?: string;
  wongojiRules?: string;
};

export type WritingAnswerMap = Record<string, string>;

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
