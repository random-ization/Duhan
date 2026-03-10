'use node';

import { action } from './_generated/server';
import { v } from 'convex/values';
import { internal } from './_generated/api';
import { createHash } from 'node:crypto';

const DEFAULT_COURSE_ID = 'topik-grammar';
const DEFAULT_TOTAL_UNITS = 6;
const DEFAULT_LIMIT = 120;
const MAX_LIMIT = 240;

const HANABIRA_MARKDOWN_DIR_API =
  'https://api.github.com/repos/tristcoil/hanabira.org-japanese-content/contents/markdown_grammar_korean';

type GitHubContentItem = {
  name: string;
  path: string;
  type: 'file' | 'dir';
  download_url: string | null;
};

type ParsedExample = {
  kr: string;
  cn: string;
  en?: string;
};

type LocalizedText = {
  zh?: string;
  en?: string;
  vi?: string;
  mn?: string;
};

type ParsedSections = {
  introduction?: LocalizedText;
  core?: LocalizedText;
  comparative?: LocalizedText;
  cultural?: LocalizedText;
  commonMistakes?: LocalizedText;
  review?: LocalizedText;
};

type ParsedQuizItem = {
  prompt: LocalizedText;
  answer?: LocalizedText;
};

type ParsedGrammar = {
  title: string;
  summary: string;
  summaryEn?: string;
  explanation: string;
  explanationEn?: string;
  sections?: ParsedSections;
  quizItems?: ParsedQuizItem[];
  examples: ParsedExample[];
};

function clampInt(value: number | undefined, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  const floored = Math.floor(value);
  return Math.min(max, Math.max(min, floored));
}

function stripMarkdownInline(input: string): string {
  // We keep this ONLY for title/summary derivation where plain text is strictly needed
  return input
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// REMOVED `stripMarkdownKeepBreaks` and replaced its usages with raw text 

function sectionText(lines: string[]): string {
  // Preserve tables and internal formatting completely
  const cleaned = lines
    .filter(line => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      if (trimmed === '---') return false; // Only remove horizontal rules separating main sections
      return true;
    })
    .join('\n');
  return cleaned.trim();
}

function toPlainText(markdown: string): string {
  return stripMarkdownInline(
    markdown
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^\s*[-*]\s+/gm, '')
      .replace(/^\s*\d+\.\s+/gm, '')
      .replace(/\n{3,}/g, '\n\n')
  );
}

function toRawMarkdown(markdown: string): string {
  // Returns raw markdown without destructive stripping, just normalizes excessive newlines
  return markdown
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseSections(
  markdown: string
): Array<{ heading: string; rawHeading: string; content: string }> {
  const lines = markdown.replace(/\r/g, '').split('\n');
  const sections: Array<{ heading: string; rawHeading: string; lines: string[] }> = [];
  let currentHeading = '__preamble__';
  let currentRawHeading = '__preamble__';
  let currentLines: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(/^##\s+(.+)$/);
    if (headingMatch) {
      sections.push({ heading: currentHeading, rawHeading: currentRawHeading, lines: currentLines });
      currentRawHeading = headingMatch[1].trim();
      currentHeading = currentRawHeading.toLowerCase();
      currentLines = [];
      continue;
    }
    currentLines.push(line);
  }
  sections.push({ heading: currentHeading, rawHeading: currentRawHeading, lines: currentLines });

  return sections.map(section => ({
    heading: section.heading,
    rawHeading: section.rawHeading,
    content: sectionText(section.lines),
  }));
}

function firstParagraph(input: string): string {
  const paragraphs = toPlainText(input)
    .split(/\n\s*\n/g)
    .map(chunk => chunk.trim())
    .filter(Boolean);
  return paragraphs.find(chunk => chunk.length >= 20) || '';
}

function truncate(input: string, maxLength: number): string {
  if (input.length <= maxLength) return input;
  return `${input.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

function inferTitle(content: string, fileName: string): string {
  const fromProcessingKeyword = content.match(/^Processing keyword:\s*(.+)\s*$/m)?.[1]?.trim();
  if (fromProcessingKeyword) return fromProcessingKeyword;

  const fromMainHeading = content
    .match(/^#\s*Korean Grammar Point:\s*(.+)\s*$/m)?.[1]
    ?.trim();
  if (fromMainHeading) return fromMainHeading;

  const baseName = fileName.replace(/\.md$/i, '').replace(/_/g, ' ').trim();
  return decodeURIComponent(baseName);
}

function extractExamples(markdown: string): ParsedExample[] {
  const lines = markdown.replace(/\r/g, '').split('\n');
  const results: ParsedExample[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const sentenceMatch = line.match(/^(?:\d+\.\s*)?(?:[-*]\s*)?\*\*([^*]+)\*\*\.?$/);
    if (!sentenceMatch) continue;

    const kr = stripMarkdownInline(sentenceMatch[1]);
    if (!/[가-힣]/.test(kr)) continue;
    if (seen.has(kr)) continue;

    let translation = '';
    for (let j = i + 1; j < Math.min(lines.length, i + 5); j++) {
      const candidate = lines[j].trim();
      if (!candidate) continue;

      const italic = candidate.match(/^[-*]\s+\*([^*]+)\*\.?$/)?.[1];
      const plainBullet = candidate.match(/^[-*]\s+(.+)$/)?.[1];
      const normalized = stripMarkdownInline(italic || plainBullet || '');
      if (!normalized) continue;
      if (/[가-힣]/.test(normalized)) continue;
      translation = normalized;
      break;
    }

    if (!translation) {
      translation = 'See explanation for meaning.';
    }

    seen.add(kr);
    results.push({
      kr,
      cn: translation,
      en: translation,
    });

    if (results.length >= 8) break;
  }

  return results;
}

function parseMarkdownGrammar(content: string, fileName: string): ParsedGrammar {
  const title = inferTitle(content, fileName);
  const sections = parseSections(content);

  const intro = sections.find(section => section.heading.includes('introduction'))?.content || '';
  const core =
    sections.find(section => section.heading.includes('core grammar explanation'))?.content || '';
  const comparative =
    sections.find(section => section.heading.includes('comparative analysis'))?.content || '';
  const mistakes =
    sections.find(section => section.heading.includes('common mistakes'))?.content || '';
  const review = sections.find(section => section.heading.includes('summary and review'))?.content || '';

  const summaryCandidate =
    firstParagraph(intro) || firstParagraph(core) || firstParagraph(toPlainText(content));

  const fullSectionBlocks = sections
    .filter(section => section.heading !== '__preamble__')
    .map(section => {
      const headingText = stripMarkdownInline(section.rawHeading).trim();
      const bodyText = toRawMarkdown(section.content);
      if (!bodyText) return '';
      return `### ${headingText}\n${bodyText}`.trim();
    })
    .filter(Boolean);
  const fullDetailedExplanation = fullSectionBlocks.join('\n\n');
  const fallbackFullText = toRawMarkdown(
    content
      .replace(/^Processing keyword:.*$/gm, '')
      .replace(/^©.*$/gm, '')
      .trim()
  );
  const explanationCandidate =
    fullDetailedExplanation || fallbackFullText || truncate(toPlainText(content), 6000) || summaryCandidate;

  const toSectionKey = (
    heading: string
  ): 'introduction' | 'core' | 'comparative' | 'cultural' | 'commonMistakes' | 'review' | null => {
    const normalized = heading.toLowerCase();
    if (normalized.includes('introduction')) return 'introduction';
    if (normalized.includes('core grammar explanation')) return 'core';
    if (normalized.includes('comparative analysis')) return 'comparative';
    if (normalized.includes('cultural notes')) return 'cultural';
    if (normalized.includes('common mistakes')) return 'commonMistakes';
    if (normalized.includes('summary and review')) return 'review';
    return null;
  };

  const sectionsPayload: ParsedSections = {};
  for (const section of sections) {
    const key = toSectionKey(section.rawHeading);
    if (!key) continue;
    const body = toRawMarkdown(section.content);
    if (!body) continue;
    sectionsPayload[key] = {
      en: body,
    };
  }
  if (!sectionsPayload.core && explanationCandidate) {
    sectionsPayload.core = {
      en: truncate(explanationCandidate, 24000),
    };
  }

  const reviewText = sectionsPayload.review?.en || '';
  const quizItems: ParsedQuizItem[] = [];
  if (reviewText) {
    const lines = reviewText.split('\n').map(line => line.trim());
    const quizHeadingIndex = lines.findIndex(line => /quick recap quiz/i.test(line));
    const answersIndex = lines.findIndex(
      (line, idx) => idx > quizHeadingIndex && /^answers\s*:/i.test(line)
    );
    const questionLines =
      quizHeadingIndex >= 0
        ? lines.slice(quizHeadingIndex + 1, answersIndex >= 0 ? answersIndex : lines.length)
        : [];
    const answerLines = answersIndex >= 0 ? lines.slice(answersIndex + 1) : [];
    const answerByNumber = new Map<string, string>();
    for (const line of answerLines) {
      const match = line.match(/^(\d+)\.\s*(.+)$/);
      if (!match) continue;
      const num = match[1].trim();
      const text = match[2].trim();
      if (!num || !text) continue;
      answerByNumber.set(num, text);
    }

    for (const line of questionLines) {
      const questionMatch = line.match(/^(\d+)\.\s*(.+)$/);
      if (!questionMatch) continue;
      const number = questionMatch[1].trim();
      const prompt = questionMatch[2].trim();
      if (!prompt || !number) continue;

      const answer = answerByNumber.get(number) || '';
      quizItems.push({
        prompt: { en: prompt },
        answer: answer ? { en: answer } : undefined,
      });
      if (quizItems.length >= 8) break;
    }
  }

  return {
    title: truncate(stripMarkdownInline(title), 180),
    summary: truncate(summaryCandidate, 320),
    summaryEn: truncate(summaryCandidate, 320),
    explanation: truncate(explanationCandidate, 24000),
    explanationEn: truncate(explanationCandidate, 24000),
    sections: sectionsPayload,
    quizItems: quizItems.length > 0 ? quizItems : undefined,
    examples: extractExamples(content),
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'hangyeol-topik-grammar-importer',
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Failed to fetch JSON (${response.status}) ${url}: ${body.slice(0, 200)}`);
  }
  return (await response.json()) as T;
}

async function fetchTextWithRetry(url: string, retries = 2): Promise<string> {
  let attempt = 0;
  let lastError: unknown = null;
  while (attempt <= retries) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'hangyeol-topik-grammar-importer' },
      });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`HTTP ${response.status}: ${body.slice(0, 160)}`);
      }
      return await response.text();
    } catch (error) {
      lastError = error;
      attempt += 1;
      if (attempt > retries) break;
      await new Promise(resolve => setTimeout(resolve, 200 * attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Failed to fetch markdown file');
}

function normalizeTitleKey(title: string): string {
  return title.toLowerCase().replace(/\s+/g, ' ').replace(/[–—]/g, '-').trim();
}

function buildRawGithubUrl(path: string): string {
  const encodedPath = path
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');
  return `https://raw.githubusercontent.com/tristcoil/hanabira.org-japanese-content/main/${encodedPath}`;
}

export const importHanabiraMarkdown = action({
  args: {
    courseId: v.optional(v.string()),
    totalUnits: v.optional(v.number()),
    offset: v.optional(v.number()),
    limit: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const courseId = (args.courseId || DEFAULT_COURSE_ID).trim() || DEFAULT_COURSE_ID;
    const totalUnits = clampInt(args.totalUnits, 1, 24, DEFAULT_TOTAL_UNITS);
    const dryRun = args.dryRun ?? false;
    const offset = clampInt(args.offset, 0, 100000, 0);
    const limit = clampInt(args.limit, 1, MAX_LIMIT, DEFAULT_LIMIT);

    const directoryItems = await fetchJson<GitHubContentItem[]>(HANABIRA_MARKDOWN_DIR_API);
    const files = directoryItems
      .filter(item => item.type === 'file' && item.name.endsWith('.md'))
      .sort((a, b) => a.name.localeCompare(b.name, 'en'));

    const totalFiles = files.length;
    const endExclusive = Math.min(totalFiles, offset + limit);
    const batch = files.slice(offset, endExclusive);
    const hasMore = endExclusive < totalFiles;
    const nextOffset = hasMore ? endExclusive : null;
    const unitSize = Math.max(1, Math.ceil(totalFiles / totalUnits));

    if (!dryRun) {
      await ctx.runMutation(internal.seedMutations.initInstitute, {
        courseId,
        totalUnits,
      });
    }

    let parsedCount = 0;
    let skippedCount = 0;
    let insertedGrammarCount = 0;
    let insertedLinkCount = 0;
    const dedupeInBatch = new Set<string>();
    const errors: string[] = [];

    for (let i = 0; i < batch.length; i++) {
      const file = batch[i];
      const globalIndex = offset + i;
      const unitId = Math.min(totalUnits, Math.floor(globalIndex / unitSize) + 1);
      const displayOrder = globalIndex - (unitId - 1) * unitSize + 1;

      try {
        const sourceUrl = buildRawGithubUrl(file.path);
        const content = await fetchTextWithRetry(sourceUrl);
        const parsed = parseMarkdownGrammar(content, file.name);
        if (!parsed.title || !parsed.summary || !parsed.explanation) {
          skippedCount += 1;
          errors.push(`${file.name}: missing title/summary/explanation after parsing`);
          continue;
        }

        const titleKey = normalizeTitleKey(parsed.title);
        if (dedupeInBatch.has(titleKey)) {
          skippedCount += 1;
          continue;
        }
        dedupeInBatch.add(titleKey);
        parsedCount += 1;

        if (dryRun) continue;

        const checksum = createHash('sha256').update(content).digest('hex');
        const upsertResult = (await ctx.runMutation(internal.seedMutations.upsertCourseGrammar, {
          courseId,
          unitId,
          title: parsed.title,
          summary: parsed.summary,
          summaryEn: parsed.summaryEn,
          explanation: parsed.explanation,
          explanationEn: parsed.explanationEn,
          sections: parsed.sections,
          quizItems: parsed.quizItems,
          sourceMeta: {
            sourceType: 'hanabira_markdown_korean',
            sourcePath: file.path,
            sourceUrl: sourceUrl,
            checksum,
            parserVersion: 'v2-full-sections',
            importedAt: Date.now(),
          },
          examples: parsed.examples,
          type: 'TOPIK_GRAMMAR',
          level: 'TOPIK',
          displayOrder,
          forceReplaceContent: true,
        })) as { insertedGrammar: boolean; insertedLink: boolean };

        if (upsertResult.insertedGrammar) insertedGrammarCount += 1;
        if (upsertResult.insertedLink) insertedLinkCount += 1;
      } catch (error) {
        skippedCount += 1;
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${file.name}: ${message}`);
      }
    }

    return {
      courseId,
      totalUnits,
      dryRun,
      offset,
      limit,
      totalFiles,
      processedFiles: batch.length,
      parsedCount,
      skippedCount,
      insertedGrammarCount,
      insertedLinkCount,
      nextOffset,
      hasMore,
      errors: errors.slice(0, 80),
    };
  },
});
