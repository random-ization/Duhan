const ROMANIZATION_BRACKET_RE =
  /\[(?=[^\]]{2,90}\])(?=[^\]]*[A-Za-z])[A-Za-z0-9\s/.,'`~:;!?()-]+\]/g;
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
    .replace(
      /(^|\n)(\s{0,3}#{1,6}[^\n\r]*?)\s*\[(?=[^\]]{2,90}\])(?=[^\]]*[A-Za-z])[A-Za-z0-9\s/.,'`~-]+\](?=\s*(?:\(|（|$))/g,
      '$1$2'
    )
    .replace(PRONUNCIATION_LINE_RE, '$1');
  return stripPronunciationTableColumns(stripPronunciationMetadata(withoutHeadingLabels))
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
