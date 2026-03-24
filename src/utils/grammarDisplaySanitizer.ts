const ROMANIZATION_BRACKET_RE =
  /\[(?=[^\]]{2,90}\])(?=[^\]]*[A-Za-z])[A-Za-z0-9\s/.,'`~:;!?()-]+\]/g;
const ROMANIZATION_HEADING_BRACKET_RE =
  /(^|\n)(\s{0,3}#{1,6}[^\n\r]*?)\s*\[(?=[^\]]{2,90}\])(?=[^\]]*[A-Za-z])[A-Za-z0-9\s/.,'"`~:;!?()-]+\](?=\s*(?:\(|（|$))/g;
const LABEL_RE =
  /(?:\u97e9\u8bed\u8bed\u6cd5\u70b9|Korean Grammar Point|Korean Grammar)\s*[:：]\s*/gi;
const PROCESSING_KEYWORD_RE =
  /(?:Processing keyword|\u5904\u7406\u5173\u952e\u8bcd)\s*[:：][^\n\r]*/gi;
const PROCESSING_KEYWORD_LINE_RE =
  /(^|\n)\s*(?:[#>*-]\s*)?(?:Processing keyword|\u5904\u7406\u5173\u952e\u8bcd)\s*[:：][^\n\r]*(?=\n|$)/gi;
const MERGED_MARKER_LINE_RE =
  /(^|\n)\s*---\s*ADDITIONAL CONTENT FROM MERGED FILES\s*---\s*(?=\n|$)/gi;
const MERGED_FILE_HEADER_RE = /(^|\n)\s*###\s+Examples from [^\n\r]+(?=\n|$)/gi;
const PRONUNCIATION_PAREN_RE =
  /\s*[（(]\s*(?:pronounced|romanized(?:\s+as)?|romanisation|romanization|\u53d1\u97f3(?:\u4e3a)?|\u8bfb\u4f5c|\u7f57\u9a6c\u5b57(?:\u4e3a)?|\u7f57\u9a6c\u97f3(?:\u4e3a)?|\u7f57\u9a6c\u62fc\u97f3(?:\u4e3a)?)\s*(?:[:：]\s*)?(?:\*{1,2}|`)?(?:\[[^\]\n\r]{1,80}\]|[A-Za-z][A-Za-z0-9\s/.,'"`~:;!?()-]{1,80})(?:\*{1,2}|`)?\s*[)）]/gi;
const PRONUNCIATION_CLAUSE_RE =
  /[，,]?\s*(?:pronounced|romanized(?:\s+as)?|romanisation|romanization|\u53d1\u97f3(?:\u4e3a)?|\u8bfb\u4f5c|\u7f57\u9a6c\u5b57(?:\u4e3a)?|\u7f57\u9a6c\u97f3(?:\u4e3a)?|\u7f57\u9a6c\u62fc\u97f3(?:\u4e3a)?)\s*(?:[:：]\s*)?(?:\*{1,2}|`)?(?:\[[^\]\n\r]{1,80}\]|[A-Za-z][A-Za-z0-9\s/.,'"`~:;!?()-]{1,80})(?:\*{1,2}|`)?(?=\s*[，,。.;；]|$)/gi;
const PRONUNCIATION_LINE_RE =
  /(^|\n)\s*(?:[-*>]\s*)?(?:\u53d1\u97f3|\u8bfb\u4f5c|\u7f57\u9a6c\u5b57|\u7f57\u9a6c\u97f3|\u7f57\u9a6c\u62fc\u97f3)\s*[:：]\s*[A-Za-z][^\n\r]*(?=\n|$)/gi;
const PRONUNCIATION_TABLE_HEADER_RE =
  /(?:\u7f57\u9a6c|pronunciation|romanization|romanisation|\u53d1\u97f3)/i;
const MARKDOWN_TABLE_SEPARATOR_RE = /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/;
const ANSWER_LABEL_CORE_RE =
  /(?:参考答案|测验参考答案|示例答案|答案|改正|修正|reference answers?|answers?|correction|correct answer)/i;
const ANSWER_HEADING_LINE_RE = new RegExp(
  `^\\s{0,3}(?:#{1,6}\\s*)?(?:\\*{1,2})?${ANSWER_LABEL_CORE_RE.source}(?:\\*{1,2})?\\s*[:：]?\\s*$`,
  'i'
);
const ANSWER_INLINE_LINE_RE = new RegExp(
  `^\\s*(?:[-*+]\\s+|\\d+\\.\\s+)?(?:\\*{1,2})?${ANSWER_LABEL_CORE_RE.source}(?:\\*{1,2})?\\s*[:：]\\s*.+$`,
  'i'
);
const NUMBERED_ITEM_RE = /^\s*\d+\.\s+/;
const MARKDOWN_HEADING_RE = /^\s{0,3}#{1,6}\s+/;
const HANGUL_RE = /[\u3131-\u318E\uAC00-\uD7A3]/;
const HAN_RE = /\p{Script=Han}/u;
const LATIN_RE = /[A-Za-z]/;
const QUIZ_SECTION_HEADING_RE =
  /^\s{0,3}#{1,6}\s+(?:\d+\.\s*)?(?:\u5feb\u901f\u590d\u4e60\u6d4b\u9a8c|\u7ec3\u4e60\u6d4b\u9a8c|\u5b9e\u6218\u6f14\u7ec3|quick review quiz(?:zes)?|practice quiz(?:zes)?)\s*$/i;
const EXAMPLE_SECTION_HEADING_RE =
  /^\s{0,3}#{1,6}\s+(?:\d+\.\s*)?(?:\u8bed\u5883\u793a\u4f8b|\u4f8b\u53e5|\u793a\u4f8b|context examples?|usage examples?|example sentences?|examples?)\s*$/i;
const EXPLICIT_EXAMPLE_PREFIX_RE =
  /(?:^|[\s>*-])(?:\*{1,2})?(?:\u4f8b[:：]|\u793a\u4f8b[:：]|example[:：])\s*/i;
const INLINE_TRANSLATION_PAREN_RE =
  /([（(][^()\n\r]*(?:\p{Script=Han}|[A-Za-z])[^()\n\r]*[）)])\s*$/u;
const SIMPLE_LATIN_LABEL_RE = /^[A-Za-z][A-Za-z\s-]{0,18}$/;
const KOREAN_SENTENCE_END_RE =
  /(?:요|다|까|죠|네|나요|습니다|어요|아요|였다|이었다|입니다|인가요|군요|겠어요|려na|을까요|ㄹ까요)[.!?。！？]?\s*$/u;
export const GRAMMAR_MASK_TRANSLATION_TOKEN = '@@GRAMMAR_MASK_TRANSLATION@@';
export const GRAMMAR_MASK_ANSWER_TOKEN = '@@GRAMMAR_MASK_ANSWER@@';
export const GRAMMAR_MASK_TRANSLATION_START_TOKEN = '@@GRAMMAR_MASK_TRANSLATION_START@@';
export const GRAMMAR_MASK_TRANSLATION_END_TOKEN = '@@GRAMMAR_MASK_TRANSLATION_END@@';
export const GRAMMAR_MASK_ANSWER_START_TOKEN = '@@GRAMMAR_MASK_ANSWER_START@@';
export const GRAMMAR_MASK_ANSWER_END_TOKEN = '@@GRAMMAR_MASK_ANSWER_END@@';

function stripMarkdownEmphasis(input: string): string {
  return input.replace(/\*{1,2}/g, '').trim();
}

function isAnswerHeadingLine(line: string): boolean {
  return ANSWER_HEADING_LINE_RE.test(stripMarkdownEmphasis(line));
}

function isSectionBoundaryLine(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed.length === 0 ||
    NUMBERED_ITEM_RE.test(trimmed) ||
    isAnswerHeadingLine(trimmed) ||
    MARKDOWN_HEADING_RE.test(trimmed) ||
    /^---+$/.test(trimmed)
  );
}

function isTranslationOnlyLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return HAN_RE.test(trimmed) && !HANGUL_RE.test(trimmed);
}

function isLikelyTranslationLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return !HANGUL_RE.test(trimmed) && (HAN_RE.test(trimmed) || LATIN_RE.test(trimmed));
}

function isKoreanPromptLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return HANGUL_RE.test(trimmed);
}

function stripMarkdownFormatting(input: string): string {
  return input
    .replace(/\*{1,2}/g, '')
    .replace(/`+/g, '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .trim();
}

function stripListPrefix(input: string): string {
  return input
    .replace(/^\s*\d+\.\s+/, '')
    .replace(/^\s*[-*+]\s+/, '')
    .trim();
}

function stripExampleLead(input: string): string {
  return input
    .replace(EXPLICIT_EXAMPLE_PREFIX_RE, '')
    .replace(/^[A-Za-z]\s*:\s*/i, '')
    .trim();
}

function looksLikeTranslationSegment(input: string): boolean {
  const clean = stripMarkdownFormatting(input)
    .replace(/^[（(]\s*/, '')
    .replace(/\s*[）)]$/, '')
    .trim();
  if (!clean || HANGUL_RE.test(clean)) return false;
  if (!HAN_RE.test(clean) && !LATIN_RE.test(clean)) return false;
  if (HAN_RE.test(clean)) return true;
  if (SIMPLE_LATIN_LABEL_RE.test(clean)) return false;
  return clean.split(/\s+/).filter(Boolean).length >= 2 || /[.!?]/.test(clean);
}

function looksLikeKoreanExampleCore(input: string): boolean {
  const clean = stripExampleLead(stripListPrefix(stripMarkdownFormatting(input)));
  const hangulChars = clean.match(/[\u3131-\u318E\uAC00-\uD7A3]/g) ?? [];
  if (hangulChars.length < 4) return false;
  return KOREAN_SENTENCE_END_RE.test(clean) || /[?!.。！？]$/.test(clean);
}

function maskInlineParentheticalTranslationLine(line: string, shouldMask: boolean): string {
  if (!shouldMask || line.includes(GRAMMAR_MASK_TRANSLATION_START_TOKEN)) return line;
  const match = line.match(INLINE_TRANSLATION_PAREN_RE);
  if (!match || !match[1] || !looksLikeTranslationSegment(match[1])) return line;

  const prefix = line.slice(0, match.index).trimEnd();
  if (!looksLikeKoreanExampleCore(prefix)) return line;

  return (
    line.slice(0, match.index) +
    GRAMMAR_MASK_TRANSLATION_START_TOKEN +
    match[1] +
    GRAMMAR_MASK_TRANSLATION_END_TOKEN +
    line.slice((match.index ?? 0) + match[1].length)
  );
}

function splitTrailingTranslation(input: string): { korean: string; translation: string } | null {
  const clean = stripExampleLead(stripListPrefix(stripMarkdownFormatting(input)));
  const parts = clean.split(/\s+/).filter(Boolean);

  for (let index = 1; index < parts.length; index += 1) {
    const left = parts.slice(0, index).join(' ');
    const right = parts.slice(index).join(' ');
    const hangulChars = left.match(/[\u3131-\u318E\uAC00-\uD7A3]/g) ?? [];
    if (hangulChars.length < 4) continue;
    if (!looksLikeKoreanExampleCore(left)) continue;
    if (!looksLikeTranslationSegment(right)) continue;
    return { korean: left, translation: right };
  }

  return null;
}

function maskSameLineTrailingTranslation(line: string, shouldMask: boolean): string {
  if (!shouldMask || line.includes(GRAMMAR_MASK_TRANSLATION_START_TOKEN)) return line;
  const split = splitTrailingTranslation(line);
  if (!split) return line;

  const translationIndex = line.lastIndexOf(split.translation);
  if (translationIndex < 0) return line;

  return (
    line.slice(0, translationIndex) +
    GRAMMAR_MASK_TRANSLATION_START_TOKEN +
    split.translation +
    GRAMMAR_MASK_TRANSLATION_END_TOKEN +
    line.slice(translationIndex + split.translation.length)
  );
}

function applyMaskTokenToLine(line: string, token: string): string {
  const numberedMatch = line.match(/^(\s*\d+\.\s+)(.*)$/);
  if (numberedMatch) return `${numberedMatch[1]}${token}${numberedMatch[2]}`;

  const bulletMatch = line.match(/^(\s*[-*+]\s+)(.*)$/);
  if (bulletMatch) return `${bulletMatch[1]}${token}${bulletMatch[2]}`;

  const indentMatch = line.match(/^(\s*)(.*)$/);
  if (!indentMatch) return `${token}${line}`;
  return `${indentMatch[1]}${token}${indentMatch[2]}`;
}

function normalizeQuizItemBlock(lines: string[]): string[] {
  if (lines.length < 3) {
    if (lines.length <= 1) return lines;
    return [lines[0], ...normalizeQuizAnswerSubLines(lines.slice(1))];
  }

  const body = [...lines.slice(1)];
  const nonEmptyEntries = body
    .map((line, index) => ({ line, index }))
    .filter(entry => entry.line.trim().length > 0);

  const translationEntry = nonEmptyEntries.find(entry => isTranslationOnlyLine(entry.line));
  const koreanEntry = nonEmptyEntries.find(entry => isKoreanPromptLine(entry.line));

  if (
    !translationEntry ||
    !koreanEntry ||
    translationEntry.index >= koreanEntry.index ||
    koreanEntry.index !== translationEntry.index + 1
  ) {
    return lines;
  }

  const nextBody = [...body];
  nextBody[translationEntry.index] = koreanEntry.line;
  nextBody[koreanEntry.index] = translationEntry.line;

  return [lines[0], ...normalizeQuizAnswerSubLines(nextBody)];
}

function normalizeQuizAnswerSubLines(lines: string[]): string[] {
  return lines.map(line => {
    const trimmed = line.trim();
    if (!ANSWER_INLINE_LINE_RE.test(trimmed)) return line;

    const withoutBullet = trimmed.replace(/^[-*+]\s+/, '');
    return `   - ${GRAMMAR_MASK_ANSWER_TOKEN}${withoutBullet}`;
  });
}

function splitInlineAnswerLine(line: string): string[] | null {
  const prefixMatch = line.match(/^(\s*\d+\.\s+)(.*)$/);
  if (!prefixMatch) return null;

  const [, prefix, remainder] = prefixMatch;
  const labelMatch = remainder.match(
    /(?:\*{1,2})?(?:参考答案|测验参考答案|示例答案|答案|改正|修正|reference answers?|answers?|correction|correct answer)(?:\*{1,2})?\s*[:：]\s*/i
  );
  if (!labelMatch || labelMatch.index === undefined) return null;

  const question = remainder.slice(0, labelMatch.index).trim();
  const answerLabel = labelMatch[0].trim();
  const answerContent = remainder.slice(labelMatch.index + labelMatch[0].length).trim();
  if (!question || !answerContent) return null;

  return [
    `${prefix}${question}`,
    `   - ${GRAMMAR_MASK_ANSWER_TOKEN}${answerLabel} ${answerContent}`,
  ];
}

function normalizeNestedExampleTranslations(input: string): string {
  const lines = input.split('\n');
  const output: string[] = [];
  let previousPrimaryLine = '';
  let inExampleSection = false;

  for (const line of lines) {
    const trimmed = line.trim();

    const headingMatch = trimmed.match(/^(\s{0,3})(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[2].length;
      const headingText = stripMarkdownFormatting(headingMatch[3]).trim();
      if (level <= 2) {
        inExampleSection = EXAMPLE_SECTION_HEADING_RE.test(
          `${headingMatch[1]}${headingMatch[2]} ${headingText}`
        );
      } else if (
        EXAMPLE_SECTION_HEADING_RE.test(`${headingMatch[1]}${headingMatch[2]} ${headingText}`)
      ) {
        inExampleSection = true;
      }
      output.push(line);
      previousPrimaryLine = '';
      continue;
    }

    if (!trimmed) {
      output.push(line);
      continue;
    }

    const isPrimaryExampleLine =
      (NUMBERED_ITEM_RE.test(trimmed) && HANGUL_RE.test(trimmed)) ||
      (/^\s*[-*+]\s+/.test(trimmed) && HANGUL_RE.test(trimmed));

    if (
      inExampleSection &&
      /^\s+/.test(line) &&
      !NUMBERED_ITEM_RE.test(trimmed) &&
      !ANSWER_INLINE_LINE_RE.test(stripMarkdownEmphasis(trimmed)) &&
      isLikelyTranslationLine(trimmed) &&
      HANGUL_RE.test(previousPrimaryLine)
    ) {
      output.push(applyMaskTokenToLine(line, GRAMMAR_MASK_TRANSLATION_TOKEN));
      continue;
    }

    output.push(line);

    if (isPrimaryExampleLine) {
      previousPrimaryLine = trimmed;
    } else if (!/^\s+/.test(line)) {
      previousPrimaryLine = '';
    }
  }

  return output.join('\n');
}

function normalizeInlineExampleTranslations(input: string): string {
  const lines = input.split('\n');
  const output: string[] = [];
  let inExampleSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    const headingMatch = trimmed.match(/^(\s{0,3})(#{1,6})\s+(.*)$/);

    if (headingMatch) {
      const level = headingMatch[2].length;
      stripMarkdownFormatting(headingMatch[3]).trim();
      if (level <= 2) {
        inExampleSection = EXAMPLE_SECTION_HEADING_RE.test(trimmed);
      } else if (EXAMPLE_SECTION_HEADING_RE.test(trimmed)) {
        inExampleSection = true;
      }
      output.push(line);
      continue;
    }

    const shouldMaskExampleLine = inExampleSection || EXPLICIT_EXAMPLE_PREFIX_RE.test(trimmed);
    const withParentheticalMask = maskInlineParentheticalTranslationLine(
      line,
      shouldMaskExampleLine
    );
    output.push(maskSameLineTrailingTranslation(withParentheticalMask, shouldMaskExampleLine));
  }

  return output.join('\n');
}

function normalizeReviewQuizMarkdown(input: string): string {
  const lines = input.split('\n');
  const output: string[] = [];
  let inAnswerSection = false;
  let inQuizSection = false;

  for (let index = 0; index < lines.length; ) {
    const line = lines[index];
    const trimmed = line.trim();

    if (QUIZ_SECTION_HEADING_RE.test(trimmed)) {
      inQuizSection = true;
      inAnswerSection = false;
      output.push(line);
      index += 1;
      continue;
    }

    if (isAnswerHeadingLine(trimmed)) {
      if (output.length > 0 && output[output.length - 1] !== '') output.push('');
      output.push('#### 参考答案');
      if (index + 1 < lines.length && lines[index + 1].trim() !== '') output.push('');
      inAnswerSection = true;
      index += 1;
      continue;
    }

    if (inAnswerSection && MARKDOWN_HEADING_RE.test(trimmed) && !isAnswerHeadingLine(trimmed)) {
      inAnswerSection = false;
    }
    if (
      inQuizSection &&
      MARKDOWN_HEADING_RE.test(trimmed) &&
      !QUIZ_SECTION_HEADING_RE.test(trimmed)
    ) {
      inQuizSection = false;
      inAnswerSection = false;
    }

    if (NUMBERED_ITEM_RE.test(trimmed)) {
      if (inQuizSection) {
        const splitInline = splitInlineAnswerLine(line);
        if (splitInline) {
          output.push(...splitInline);
          index += 1;
          continue;
        }
      }

      const block = [line];
      index += 1;
      while (index < lines.length && !isSectionBoundaryLine(lines[index])) {
        block.push(lines[index]);
        index += 1;
      }
      const normalizedBlock = normalizeQuizItemBlock(block);
      if (inAnswerSection) {
        output.push(
          ...normalizedBlock.map((blockLine, blockIndex) =>
            blockIndex === 0
              ? applyMaskTokenToLine(blockLine, GRAMMAR_MASK_ANSWER_TOKEN)
              : blockLine
          )
        );
      } else {
        output.push(...normalizeQuizAnswerSubLines(normalizedBlock));
      }
      continue;
    }

    if (inQuizSection && ANSWER_INLINE_LINE_RE.test(trimmed)) {
      output.push(applyMaskTokenToLine(line, GRAMMAR_MASK_ANSWER_TOKEN));
      index += 1;
      continue;
    }

    output.push(line);
    index += 1;
  }

  return output.join('\n');
}

export function getGrammarMaskKind(input?: string | null): 'translation' | 'answer' | null {
  if (!input) return null;
  if (
    input.includes(GRAMMAR_MASK_ANSWER_TOKEN) ||
    input.includes(GRAMMAR_MASK_ANSWER_START_TOKEN)
  ) {
    return 'answer';
  }
  if (
    input.includes(GRAMMAR_MASK_TRANSLATION_TOKEN) ||
    input.includes(GRAMMAR_MASK_TRANSLATION_START_TOKEN)
  ) {
    return 'translation';
  }
  return null;
}

export function stripGrammarMaskTokens(input?: string | null): string {
  if (!input) return '';
  return input
    .replaceAll(GRAMMAR_MASK_TRANSLATION_TOKEN, '')
    .replaceAll(GRAMMAR_MASK_ANSWER_TOKEN, '')
    .replaceAll(GRAMMAR_MASK_TRANSLATION_START_TOKEN, '')
    .replaceAll(GRAMMAR_MASK_TRANSLATION_END_TOKEN, '')
    .replaceAll(GRAMMAR_MASK_ANSWER_START_TOKEN, '')
    .replaceAll(GRAMMAR_MASK_ANSWER_END_TOKEN, '');
}

function collapseInlineWhitespace(input: string): string {
  return input
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ +([,.;!?])/g, '$1')
    .trim();
}

function stripPronunciationMetadata(input: string): string {
  return input
    .replace(PRONUNCIATION_PAREN_RE, '')
    .replace(PRONUNCIATION_CLAUSE_RE, '')
    .replace(/[，,]\s*[，,]+/g, '，')
    .replace(/\(\s*\)/g, '')
    .replace(/（\s*）/g, '');
}

function splitMarkdownTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map(cell => cell.trim());
}

function joinMarkdownTableRow(cells: string[]): string {
  return `| ${cells.join(' | ')} |`;
}

function stripPronunciationTableColumns(input: string): string {
  const lines = input.split('\n');
  const output: string[] = [];

  for (let index = 0; index < lines.length; ) {
    const headerLine = lines[index];
    const separatorLine = lines[index + 1];
    if (
      headerLine?.trim().startsWith('|') &&
      separatorLine &&
      MARKDOWN_TABLE_SEPARATOR_RE.test(separatorLine)
    ) {
      const headerCells = splitMarkdownTableRow(headerLine);
      const separatorCells = splitMarkdownTableRow(separatorLine);
      const keepIndices = headerCells
        .map((cell, cellIndex) => (PRONUNCIATION_TABLE_HEADER_RE.test(cell) ? null : cellIndex))
        .filter((cellIndex): cellIndex is number => cellIndex !== null);

      if (keepIndices.length > 0 && keepIndices.length < headerCells.length) {
        output.push(joinMarkdownTableRow(keepIndices.map(cellIndex => headerCells[cellIndex])));
        output.push(
          joinMarkdownTableRow(keepIndices.map(cellIndex => separatorCells[cellIndex] || '---'))
        );
        index += 2;

        while (index < lines.length && lines[index].trim().startsWith('|')) {
          const rowCells = splitMarkdownTableRow(lines[index]);
          output.push(
            joinMarkdownTableRow(keepIndices.map(cellIndex => rowCells[cellIndex] || ''))
          );
          index += 1;
        }
        continue;
      }
    }

    output.push(headerLine);
    index += 1;
  }

  return output.join('\n');
}

export function sanitizeGrammarDisplayText(input?: string | null): string {
  if (!input) return '';
  const cleaned = input
    .replace(PROCESSING_KEYWORD_RE, '')
    .replace(LABEL_RE, '')
    .replace(ROMANIZATION_BRACKET_RE, '');
  return collapseInlineWhitespace(stripPronunciationMetadata(cleaned));
}

export function sanitizeGrammarMarkdown(input?: string | null): string {
  if (!input) return '';
  const withoutHeadingLabels = input
    .replace(PROCESSING_KEYWORD_LINE_RE, '$1')
    .replace(PROCESSING_KEYWORD_RE, '')
    .replace(MERGED_MARKER_LINE_RE, '$1')
    .replace(MERGED_FILE_HEADER_RE, '$1')
    .replace(
      /(^|\n)(\s{0,3}#{1,6}\s*)(?:\u97e9\u8bed\u8bed\u6cd5\u70b9|Korean Grammar Point|Korean Grammar)\s*[:：]\s*/gi,
      '$1$2'
    )
    .replace(
      /(^|\n)\s*(?:\u97e9\u8bed\u8bed\u6cd5\u70b9|Korean Grammar Point|Korean Grammar)\s*[:：]\s*/gi,
      '$1'
    )
    .replace(ROMANIZATION_HEADING_BRACKET_RE, '$1$2')
    .replace(PRONUNCIATION_LINE_RE, '$1');
  return normalizeNestedExampleTranslations(
    normalizeInlineExampleTranslations(
      normalizeReviewQuizMarkdown(
        stripPronunciationTableColumns(stripPronunciationMetadata(withoutHeadingLabels))
      )
    )
  )
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function normalizeHeadingComparison(input: string): string {
  return sanitizeGrammarDisplayText(input)
    .toLowerCase()
    .replace(/^[~\-–—]+/, '')
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

export function stripLeadingDuplicateHeading(markdown: string, title: string): string {
  if (!markdown) return '';
  const trimmed = markdown.trimStart();
  const match = trimmed.match(/^#\s+(.+?)(?:\r?\n|$)/);
  if (!match) return markdown;

  const heading = match[1]?.trim() || '';
  const normalizedHeading = normalizeHeadingComparison(heading);
  const normalizedTitle = normalizeHeadingComparison(title);

  if (!normalizedHeading || !normalizedTitle) return markdown;

  const isEquivalent =
    normalizedHeading === normalizedTitle ||
    normalizedHeading.startsWith(normalizedTitle) ||
    normalizedTitle.startsWith(normalizedHeading);

  if (!isEquivalent) return markdown;

  return trimmed
    .slice(match[0].length)
    .replace(/^\s*\n+/, '')
    .trim();
}
