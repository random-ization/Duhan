import type { Id } from '../_generated/dataModel';
import { v } from 'convex/values';

export type ImportedContentAnalysis = {
  summaryZh?: string;
  difficultyLevel?: string;
  estimatedMinutes?: number;
  wordCount?: number;
  sentenceCount?: number;
};

export type ImportedContentUrlImportResult =
  | {
      success: true;
      contentId: Id<'imported_contents'>;
    }
  | {
      success: false;
      reason: 'insufficient_content';
    };

export const importedContentAnalysisValidator = v.object({
  summaryZh: v.optional(v.string()),
  difficultyLevel: v.optional(v.string()),
  estimatedMinutes: v.optional(v.number()),
  wordCount: v.optional(v.number()),
  sentenceCount: v.optional(v.number()),
});
