/**
 * Parses a time string in the format "HH:MM:SS,ms" or "HH:MM:SS.ms" to seconds
 */
const parseTime = (timeStr: string): number => {
  if (!timeStr) return 0;

  const [time, ms] = timeStr.trim().split(/[,.]/);
  const [hours, minutes, seconds] = time.split(':').map(Number);

  return hours * 3600 + minutes * 60 + seconds + (Number(ms) || 0) / 1000;
};

export interface ParsedTranscriptSegment {
  start: number;
  end: number;
  text: string;
}

/**
 * Parses SRT content string into structured transcript segments
 */
export const parseSRT = (content: string): ParsedTranscriptSegment[] => {
  // Normalize line endings
  const normalized = content.replaceAll('\r\n', '\n').replaceAll('\r', '\n');

  // Split by double newlines (blocks)
  const blocks = normalized.trim().split(/\n\n+/);

  const segments: ParsedTranscriptSegment[] = [];

  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length < 2) continue;

    // SRT format:
    // 1 (Index - optional/can be skipped logic-wise if position implies)
    // 00:00:00,000 --> 00:00:00,000 (Timing)
    // Text...

    // Find the timing line (contains "-->")
    const timingIndex = lines.findIndex(line => line.includes('-->'));
    if (timingIndex === -1) continue;

    const timeLine = lines[timingIndex];
    const [startStr, endStr] = timeLine.split('-->');

    if (!startStr || !endStr) continue;

    // Text is everything after the timing line
    const textLines = lines.slice(timingIndex + 1);
    const text = textLines.join(' ').trim();

    if (text) {
      segments.push({
        start: parseTime(startStr),
        end: parseTime(endStr),
        text,
      });
    }
  }

  return segments;
};
