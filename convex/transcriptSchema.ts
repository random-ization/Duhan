import { v } from 'convex/values';

export const transcriptWordValidator = v.object({
  word: v.string(),
  start: v.number(),
  end: v.number(),
});

export const transcriptSegmentValidator = v.object({
  start: v.number(),
  end: v.number(),
  text: v.string(),
  translation: v.optional(v.string()),
  words: v.optional(v.array(transcriptWordValidator)),
});

export const transcriptArrayValidator = v.array(transcriptSegmentValidator);
export const transcriptInputValidator = v.union(v.null(), transcriptArrayValidator);

export type TranscriptWord = {
  word: string;
  start: number;
  end: number;
};

export type TranscriptSegment = {
  start: number;
  end: number;
  text: string;
  translation?: string;
  words?: TranscriptWord[];
};
