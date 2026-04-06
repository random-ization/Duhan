/**
 * AI Transcript processing utilities.
 *
 * Extracted from convex/ai.ts for readability.
 * Types are imported from the shared transcriptSchema.
 */

import type { TranscriptSegment, TranscriptWord } from '../transcriptSchema';

// ── Deepgram payload types ────────────────────────────────────────────────────

export type DeepgramWord = {
  word: string;
  start: number;
  end: number;
  punctuated_word?: string;
  confidence?: number;
};

export type DeepgramUtterance = {
  start?: number;
  end?: number;
  transcript?: string;
  words?: unknown;
};

export type DeepgramParagraphSentence = {
  start?: number;
  end?: number;
  text?: string;
  words?: unknown;
};

export type DeepgramParagraph = {
  sentences?: DeepgramParagraphSentence[];
};

export type DeepgramAlternative = {
  words?: DeepgramWord[];
  transcript?: string;
  paragraphs?: {
    paragraphs?: DeepgramParagraph[];
  };
  utterances?: DeepgramUtterance[];
};

type SegmentInput = {
  start?: number;
  end?: number;
  text: string;
  translation: string;
  words?: TranscriptWord[];
};

// ── Word normalisation ────────────────────────────────────────────────────────

export function normalizeTranscriptWords(input: unknown): TranscriptWord[] | undefined {
  if (!Array.isArray(input)) return undefined;
  const words = input
    .map(item => {
      if (!item || typeof item !== 'object') return null;
      const candidate = item as Record<string, unknown>;
      const word =
        typeof candidate.word === 'string'
          ? candidate.word.trim()
          : typeof candidate.punctuated_word === 'string'
            ? candidate.punctuated_word.trim()
            : '';
      const start = typeof candidate.start === 'number' ? candidate.start : null;
      const end = typeof candidate.end === 'number' ? candidate.end : null;
      if (!word || start === null || end === null) return null;
      return { word, start, end };
    })
    .filter((item): item is TranscriptWord => item !== null);

  return words.length > 0 ? words : undefined;
}

// ── Segment builders ──────────────────────────────────────────────────────────

export function buildSegmentsFromWords(words: DeepgramWord[]): SegmentInput[] {
  if (words.length === 0) return [];

  const segments: SegmentInput[] = [];
  let buffer: DeepgramWord[] = [];
  let segStart: number | undefined;

  const flush = () => {
    if (buffer.length === 0) return;
    segments.push({
      start: segStart,
      end: buffer[buffer.length - 1].end,
      text: buffer.map(w => w.punctuated_word ?? w.word).join(' '),
      translation: '',
      words: normalizeTranscriptWords(buffer),
    });
    buffer = [];
    segStart = undefined;
  };

  for (const w of words) {
    if (segStart === undefined) segStart = w.start;
    buffer.push(w);

    const duration = w.end - segStart;
    const endsWithPunctuation = /[.!?。！？]$/.test(w.punctuated_word ?? w.word);

    if (duration >= 15 || (endsWithPunctuation && duration >= 2)) {
      flush();
    }
  }

  flush();
  return segments;
}

// ── Main extraction entry point ───────────────────────────────────────────────

export function extractSegmentsFromDeepgramResult(result: unknown): TranscriptSegment[] {
  if (!result || typeof result !== 'object') return [];

  const r = result as Record<string, unknown>;
  const utterances = r.utterances as DeepgramUtterance[] | undefined;
  const paragraphsWrapper = r.paragraphs as { paragraphs?: DeepgramParagraph[] } | undefined;
  const altWords = r.words as DeepgramWord[] | undefined;
  const altTranscript = r.transcript as string | undefined;

  if (Array.isArray(utterances) && utterances.length > 0) {
    const segments = utterances
      .map(
        (u): SegmentInput => ({
          start: typeof u.start === 'number' ? u.start : undefined,
          end: typeof u.end === 'number' ? u.end : undefined,
          text: typeof u.transcript === 'string' ? u.transcript.trim() : '',
          translation: '',
          words: normalizeTranscriptWords(u.words),
        })
      )
      .filter(segment => Boolean(segment.text));
    return mergeShortSegments(segments);
  }

  if (Array.isArray(paragraphsWrapper?.paragraphs)) {
    const allSentences = paragraphsWrapper!.paragraphs!.flatMap(p => p.sentences || []);
    const segments = allSentences
      .map(
        (s): SegmentInput => ({
          start: typeof s.start === 'number' ? s.start : undefined,
          end: typeof s.end === 'number' ? s.end : undefined,
          text: typeof s.text === 'string' ? s.text.trim() : '',
          translation: '',
          words: normalizeTranscriptWords(s.words),
        })
      )
      .filter(segment => Boolean(segment.text));
    return mergeShortSegments(segments);
  }

  if (Array.isArray(altWords) && altWords.length > 0) {
    return mergeShortSegments(buildSegmentsFromWords(altWords));
  }

  if (typeof altTranscript === 'string' && altTranscript.trim().length > 0) {
    return [
      {
        start: 0,
        end: 0,
        text: altTranscript.trim(),
        translation: '',
      },
    ];
  }

  return [];
}

// ── Segment merging ───────────────────────────────────────────────────────────

export function mergeShortSegments(segments: SegmentInput[]): TranscriptSegment[] {
  if (segments.length === 0) return [];
  if (segments.length === 1) {
    const s = segments[0];
    return [{ start: s.start ?? 0, end: s.end ?? 0, text: s.text, translation: s.translation, words: s.words }];
  }

  const MIN_DURATION = 2; // seconds
  const merged: TranscriptSegment[] = [];
  let current = { ...segments[0] };

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    const duration =
      current.start !== undefined && current.end !== undefined ? current.end - current.start : 0;

    if (duration < MIN_DURATION && duration > 0) {
      current.text += ' ' + seg.text;
      current.end = seg.end;
      if (current.words && seg.words) {
        current.words = [...current.words, ...seg.words];
      } else if (seg.words) {
        current.words = seg.words;
      }
    } else {
      merged.push({
        start: current.start ?? 0,
        end: current.end ?? 0,
        text: current.text,
        translation: current.translation,
        words: current.words,
      });
      current = { ...seg };
    }
  }

  merged.push({
    start: current.start ?? 0,
    end: current.end ?? 0,
    text: current.text,
    translation: current.translation,
    words: current.words,
  });

  return merged;
}

// ── Translation mapping ───────────────────────────────────────────────────────

export function applyTranslationsToSegments(
  segments: TranscriptSegment[],
  translations: string[]
): TranscriptSegment[] {
  return segments.map((segment, i) => ({
    ...segment,
    translation: i < translations.length ? translations[i] : segment.translation ?? '',
  }));
}
