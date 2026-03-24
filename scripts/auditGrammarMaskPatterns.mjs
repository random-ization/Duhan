import fs from 'fs';
import path from 'path';

const ROOT = '/Users/ryan/Documents/GitHub/语法/hanabira.org-japanese-content';
const SOURCES = [
  { key: 'en', dir: path.join(ROOT, 'markdown_grammar_korean') },
  { key: 'zh', dir: path.join(ROOT, 'markdown_grammar_korean_chinese') },
];
const OUTPUT_JSON = path.join(process.cwd(), 'tmp/grammar_mask_pattern_audit.json');
const OUTPUT_MD = path.join(process.cwd(), 'tmp/grammar_mask_pattern_audit.md');

const HANGUL_RE = /[\u3131-\u318E\uAC00-\uD7A3]/;
const HAN_RE = /\p{Script=Han}/u;
const LATIN_RE = /[A-Za-z]/;
const ANSWER_LABEL_RE = /(?:参考答案|测验参考答案|示例答案|答案|改正|修正|reference answers?|answers?|correction|correct answer)/i;
const QUIZ_HEADING_RE = /^(?:#+\s+)?(?:快速复习测验|练习测验|实战演练|quick review quiz(?:zes)?|practice quiz(?:zes)?)\s*$/i;
const MARKDOWN_HEADING_RE = /^\s{0,3}#{1,6}\s+/;
const NUMBERED_RE = /^\s*\d+\.\s+/;
const BULLET_RE = /^\s*[-*+]\s+/;
const INDENTED_BULLET_RE = /^\s+[-*+]\s+/;
const DIALOGUE_RE = /^\s*[A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ]\s*:\s*/;
const PAREN_TRANSLATION_RE = /[（(][^()\n\r]*(?:\p{Script=Han}|[A-Za-z])[^()\n\r]*[）)]\s*$/u;
const KOREAN_SENTENCE_END_RE = /(?:요|다|까|죠|네|나요|습니다|어요|아요|인가요|군요|겠어요|ㄹ까요|을까요)[.!?。！？]?\s*$/u;

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && full.endsWith('.md')) out.push(full);
  }
  return out;
}

function normalize(line) {
  return line.replace(/\*{1,2}/g, '').replace(/`+/g, '').trim();
}

function stripListPrefix(line) {
  return normalize(line).replace(/^\d+\.\s+/, '').replace(/^[-*+]\s+/, '').trim();
}

function looksLikeTranslationOnly(line) {
  const text = stripListPrefix(line);
  return !HANGUL_RE.test(text) && (HAN_RE.test(text) || LATIN_RE.test(text));
}

function looksLikeKoreanExample(line) {
  const text = stripListPrefix(line);
  return HANGUL_RE.test(text) && (KOREAN_SENTENCE_END_RE.test(text) || /[?!.。！？]$/.test(text));
}

function detectTrailingTranslation(line) {
  const text = stripListPrefix(line);
  if (!HANGUL_RE.test(text) || (!HAN_RE.test(text) && !LATIN_RE.test(text))) return false;
  const parts = text.split(/\s+/).filter(Boolean);
  for (let i = 1; i < parts.length; i += 1) {
    const left = parts.slice(0, i).join(' ');
    const right = parts.slice(i).join(' ');
    if (!HANGUL_RE.test(left)) continue;
    if (HANGUL_RE.test(right)) continue;
    if (!HAN_RE.test(right) && !LATIN_RE.test(right)) continue;
    if (KOREAN_SENTENCE_END_RE.test(left) || /[?!.。！？]$/.test(left)) return true;
  }
  return false;
}

function addHit(map, type, sourceKey, file, lineNumber, excerpt) {
  if (!map[type]) {
    map[type] = { total: 0, bySource: {}, samples: [] };
  }
  map[type].total += 1;
  map[type].bySource[sourceKey] = (map[type].bySource[sourceKey] || 0) + 1;
  if (map[type].samples.length < 8) {
    map[type].samples.push({ file, line: lineNumber, excerpt });
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  roots: SOURCES,
  totals: {},
  patterns: {},
};

for (const source of SOURCES) {
  const files = walk(source.dir);
  report.totals[source.key] = { files: files.length };

  for (const file of files) {
    const rel = path.relative(ROOT, file);
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    let inQuizSection = false;

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const trimmed = line.trim();
      const next = lines[i + 1] || '';
      const nextTrimmed = next.trim();

      if (QUIZ_HEADING_RE.test(trimmed.replace(/^#+\s+/, ''))) {
        inQuizSection = true;
      } else if (MARKDOWN_HEADING_RE.test(trimmed) && !QUIZ_HEADING_RE.test(trimmed.replace(/^#+\s+/, ''))) {
        inQuizSection = false;
      }

      if (looksLikeKoreanExample(line) && PAREN_TRANSLATION_RE.test(trimmed)) {
        addHit(report.patterns, 'example.inline_parenthetical_translation', source.key, rel, i + 1, trimmed);
      }

      if (NUMBERED_RE.test(line) && detectTrailingTranslation(line)) {
        addHit(report.patterns, 'example.numbered_same_line_translation', source.key, rel, i + 1, trimmed);
      }

      if (BULLET_RE.test(line) && detectTrailingTranslation(line)) {
        addHit(report.patterns, 'example.bullet_same_line_translation', source.key, rel, i + 1, trimmed);
      }

      if (looksLikeKoreanExample(line) && INDENTED_BULLET_RE.test(next) && looksLikeTranslationOnly(next)) {
        addHit(report.patterns, 'example.numbered_then_nested_translation_bullet', source.key, rel, i + 2, nextTrimmed);
      }

      if (DIALOGUE_RE.test(line) && INDENTED_BULLET_RE.test(next) && looksLikeTranslationOnly(next)) {
        addHit(report.patterns, 'example.dialogue_then_nested_translation_bullet', source.key, rel, i + 2, nextTrimmed);
      }

      if (inQuizSection && NUMBERED_RE.test(line) && ANSWER_LABEL_RE.test(line)) {
        addHit(report.patterns, 'quiz.numbered_same_line_answer', source.key, rel, i + 1, trimmed);
      }

      if (inQuizSection && NUMBERED_RE.test(line) && nextTrimmed && ANSWER_LABEL_RE.test(nextTrimmed)) {
        addHit(report.patterns, 'quiz.numbered_then_indented_answer_line', source.key, rel, i + 2, nextTrimmed);
      }

      if (inQuizSection && ANSWER_LABEL_RE.test(trimmed) && !NUMBERED_RE.test(line) && !INDENTED_BULLET_RE.test(line)) {
        addHit(report.patterns, 'quiz.answer_heading_or_standalone_answer_line', source.key, rel, i + 1, trimmed);
      }

      if (inQuizSection && INDENTED_BULLET_RE.test(line) && ANSWER_LABEL_RE.test(trimmed)) {
        addHit(report.patterns, 'quiz.nested_bullet_answer_line', source.key, rel, i + 1, trimmed);
      }
    }
  }
}

const orderedPatterns = Object.entries(report.patterns)
  .sort((a, b) => b[1].total - a[1].total)
  .map(([name, data]) => ({ name, ...data }));

const md = [
  '# Grammar Mask Pattern Audit',
  '',
  `Generated: ${report.generatedAt}`,
  '',
  `Sources: EN ${report.totals.en.files} files, ZH ${report.totals.zh.files} files`,
  '',
  '## Pattern Counts',
  '',
  ...orderedPatterns.flatMap(pattern => [
    `- ${pattern.name}: total ${pattern.total} (en ${pattern.bySource.en || 0}, zh ${pattern.bySource.zh || 0})`,
  ]),
  '',
  '## Samples',
  '',
  ...orderedPatterns.flatMap(pattern => [
    `### ${pattern.name}`,
    ...pattern.samples.map(sample => `- ${sample.file}:${sample.line} ${sample.excerpt}`),
    '',
  ]),
];

fs.mkdirSync(path.dirname(OUTPUT_JSON), { recursive: true });
fs.writeFileSync(OUTPUT_JSON, JSON.stringify({ ...report, orderedPatterns }, null, 2));
fs.writeFileSync(OUTPUT_MD, md.join('\n'));

console.log(`Wrote ${OUTPUT_JSON}`);
console.log(`Wrote ${OUTPUT_MD}`);
for (const pattern of orderedPatterns) {
  console.log(`${pattern.name}: total ${pattern.total} (en ${pattern.bySource.en || 0}, zh ${pattern.bySource.zh || 0})`);
}
