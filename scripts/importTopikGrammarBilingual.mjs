#!/usr/bin/env node
/**
 * Import bilingual TOPIK grammar markdown (EN + ZH) into `topik-grammar`.
 *
 * Strategy:
 * 1) Parse English + Chinese markdown folders.
 * 2) Match parsed items to existing topik-grammar records by normalized Korean kernel.
 * 3) Dry-run by default and write a report to tmp/.
 * 4) Apply mode updates summary/explanation in zh/en in safe batches.
 *
 * Usage:
 *   node scripts/importTopikGrammarBilingual.mjs \
 *     --enDir "/path/to/markdown_grammar_korean" \
 *     --zhDir "/path/to/markdown_grammar_korean_chinese"
 *
 *   node scripts/importTopikGrammarBilingual.mjs \
 *     --enDir "/path/to/markdown_grammar_korean" \
 *     --zhDir "/path/to/markdown_grammar_korean_chinese" \
 *     --apply
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const PROJECT_ROOT = process.cwd();
const DEFAULT_COURSE_ID = 'topik-grammar';
const DEFAULT_BATCH_SIZE = 4;
const REPORT_PATH = path.join(PROJECT_ROOT, 'tmp', 'topik_grammar_bilingual_import_report.json');
const MANIFEST_PATH = path.join(PROJECT_ROOT, 'tmp', 'topik_grammar_bilingual_import_manifest.json');

function parseArgs(argv) {
  const args = {
    enDir: '',
    zhDir: '',
    courseId: DEFAULT_COURSE_ID,
    identity: '',
    fullReplace: false,
    fallbackUnitId: 15,
    apply: false,
    batchSize: DEFAULT_BATCH_SIZE,
    limit: undefined,
    offset: 0,
  };

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === '--enDir') args.enDir = argv[++i] || '';
    else if (token === '--zhDir') args.zhDir = argv[++i] || '';
    else if (token === '--courseId') args.courseId = (argv[++i] || '').trim() || DEFAULT_COURSE_ID;
    else if (token === '--identity') args.identity = (argv[++i] || '').trim();
    else if (token === '--fullReplace') args.fullReplace = true;
    else if (token === '--fallbackUnitId')
      args.fallbackUnitId = Math.max(1, Number(argv[++i] || 15));
    else if (token === '--batchSize') args.batchSize = Math.max(1, Number(argv[++i] || DEFAULT_BATCH_SIZE));
    else if (token === '--offset') args.offset = Math.max(0, Number(argv[++i] || 0));
    else if (token === '--limit') args.limit = Math.max(1, Number(argv[++i] || 0));
    else if (token === '--apply') args.apply = true;
    else if (token === '--help' || token === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  if (!args.enDir || !args.zhDir) {
    printHelp('Missing required --enDir / --zhDir');
    process.exit(1);
  }
  if (!fs.existsSync(args.enDir) || !fs.statSync(args.enDir).isDirectory()) {
    throw new Error(`English directory not found: ${args.enDir}`);
  }
  if (!fs.existsSync(args.zhDir) || !fs.statSync(args.zhDir).isDirectory()) {
    throw new Error(`Chinese directory not found: ${args.zhDir}`);
  }

  return args;
}

function printHelp(errorMessage) {
  if (errorMessage) console.error(`\nError: ${errorMessage}\n`);
  console.log(`Usage:
  node scripts/importTopikGrammarBilingual.mjs --enDir <path> --zhDir <path> [options]

Options:
  --courseId <id>      Course legacy id (default: ${DEFAULT_COURSE_ID})
  --identity <json>    Convex run identity JSON for admin mutations
  --fullReplace        Replace course links with full merged import set
  --fallbackUnitId <n> Unit ID for unmatched new keys in fullReplace (default: 15)
  --batchSize <n>      Upsert batch size (default: ${DEFAULT_BATCH_SIZE})
  --offset <n>         Start offset after matching
  --limit <n>          Limit number of matched items
  --apply              Apply changes (default is dry-run)
  --help               Show help
`);
}

function listMarkdownFiles(dir) {
  return fs
    .readdirSync(dir)
    .filter(name => name.toLowerCase().endsWith('.md'))
    .sort((a, b) => a.localeCompare(b, 'en'))
    .map(name => path.join(dir, name));
}

function stripMarkdownInline(input) {
  return input
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanMarkdownBody(input) {
  return input
    .replace(/^Processing keyword:.*$/gm, '')
    .replace(/^©.*$/gm, '')
    .replace(/^由\s+\[Hanabira\.org\].*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseH2Sections(markdown) {
  const lines = markdown.replace(/\r/g, '').split('\n');
  const sections = [];
  let heading = '__preamble__';
  let rawHeading = '__preamble__';
  let buffer = [];

  for (const line of lines) {
    const m = line.match(/^##\s+(.+)$/);
    if (m) {
      sections.push({ heading, rawHeading, content: buffer.join('\n').trim() });
      rawHeading = m[1].trim();
      heading = rawHeading.toLowerCase();
      buffer = [];
      continue;
    }
    buffer.push(line);
  }
  sections.push({ heading, rawHeading, content: buffer.join('\n').trim() });
  return sections;
}

function mapSectionKey(heading, lang) {
  const normalized = heading.toLowerCase();
  if (lang === 'en') {
    if (normalized.includes('introduction')) return 'introduction';
    if (normalized.includes('core')) return 'core';
    if (normalized.includes('comparative')) return 'comparative';
    if (normalized.includes('cultural')) return 'cultural';
    if (normalized.includes('common mistakes')) return 'commonMistakes';
    if (normalized.includes('summary') || normalized.includes('review')) return 'review';
    return null;
  }
  if (normalized.includes('简介') || normalized.includes('介绍')) return 'introduction';
  if (normalized.includes('核心')) return 'core';
  if (normalized.includes('对比')) return 'comparative';
  if (normalized.includes('文化')) return 'cultural';
  if (normalized.includes('常见错误') || normalized.includes('技巧')) return 'commonMistakes';
  if (normalized.includes('总结') || normalized.includes('复习')) return 'review';
  return null;
}

function firstParagraph(markdown) {
  const plain = stripMarkdownInline(
    markdown
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^\s*[-*]\s+/gm, '')
      .replace(/^\s*\d+\.\s+/gm, '')
      .replace(/\n{3,}/g, '\n\n')
  );
  const chunks = plain
    .split(/\n\s*\n/g)
    .map(s => s.trim())
    .filter(Boolean);
  return chunks.find(chunk => chunk.length >= 20) || chunks[0] || '';
}

function extractTitle(content, fileName, lang) {
  if (lang === 'en') {
    const processingKeyword = content.match(/^Processing keyword:\s*(.+)\s*$/m)?.[1]?.trim();
    if (processingKeyword) return processingKeyword;
    const mainHeading = content.match(/^#\s*Korean Grammar Point:\s*(.+)\s*$/m)?.[1]?.trim();
    if (mainHeading) return mainHeading;
  } else {
    const zhHeading = content.match(/^#\s*韩语语法点[:：]\s*(.+)\s*$/m)?.[1]?.trim();
    if (zhHeading) return zhHeading;
  }
  return decodeURIComponent(fileName.replace(/\.md$/i, '').replace(/_/g, ' ').trim());
}

function extractKoreanKernel(input) {
  const matches = input.match(/[~()/\-\sㄱ-ㅎㅏ-ㅣ가-힣]+/g) || [];
  const merged = matches.join(' ');
  return merged
    .replace(/\s+/g, ' ')
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s*[()]\s*/g, m => m.trim())
    .replace(/^[-/]+|[-/]+$/g, '')
    .trim();
}

function normalizeKernelKey(input) {
  return extractKoreanKernel(input).replace(/[~\s]/g, '').toLowerCase().trim();
}

function parseMarkdownRecord(filePath, lang) {
  const fileName = path.basename(filePath);
  const raw = fs.readFileSync(filePath, 'utf8');
  const content = cleanMarkdownBody(raw);
  const titleRaw = extractTitle(content, fileName, lang);
  const kernelTitle = extractKoreanKernel(titleRaw);
  const key = normalizeKernelKey(titleRaw);
  if (!key) return null;

  const sections = {};
  for (const section of parseH2Sections(content)) {
    const sectionKey = mapSectionKey(section.rawHeading, lang);
    if (!sectionKey || !section.content) continue;
    sections[sectionKey] = section.content;
  }

  const summaryCandidate =
    firstParagraph(sections.introduction || '') ||
    firstParagraph(sections.core || '') ||
    firstParagraph(content);

  const explanation = content.slice(0, 24000);
  const checksum = crypto.createHash('sha256').update(raw).digest('hex');

  return {
    key,
    kernelTitle,
    titleRaw,
    summary: summaryCandidate.slice(0, 320),
    explanation,
    sections,
    path: filePath,
    checksum,
    lang,
  };
}

function selectBestRecord(records) {
  if (!records || records.length === 0) return null;
  return [...records].sort((a, b) => b.explanation.length - a.explanation.length)[0];
}

function parseConvexJson(stdout) {
  const trimmed = stdout.trim();
  return JSON.parse(trimmed);
}

function runConvex(functionName, args, identity) {
  const commandArgs = ['convex', 'run'];
  if (identity) {
    commandArgs.push('--identity', identity);
  }
  commandArgs.push(functionName, JSON.stringify(args));
  const raw = execFileSync('npx', commandArgs, {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 25,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return parseConvexJson(raw);
}

function buildExistingMaps(courseItems) {
  const byKey = new Map();
  for (const item of courseItems) {
    const key = normalizeKernelKey(item.title || '');
    if (!key) continue;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(item);
  }
  return { byKey };
}

function findBestMatch(targetKey, byKey) {
  const exact = byKey.get(targetKey);
  if (exact?.length === 1) return { match: exact[0], reason: 'exact' };
  if (exact && exact.length > 1) return { match: exact[0], reason: 'exact_collision_pick_first' };

  const includeCandidates = [];
  for (const [key, items] of byKey.entries()) {
    if (key.includes(targetKey) || targetKey.includes(key)) {
      for (const item of items) includeCandidates.push(item);
    }
  }
  if (includeCandidates.length === 1) return { match: includeCandidates[0], reason: 'substring' };
  if (includeCandidates.length > 1) return { match: null, reason: 'ambiguous_substring' };

  const existingEntries = [];
  for (const [key, items] of byKey.entries()) {
    for (const item of items) existingEntries.push({ key, item });
  }
  const scored = existingEntries
    .map(entry => ({
      ...entry,
      score: diceCoefficient(targetKey, entry.key),
    }))
    .sort((a, b) => b.score - a.score);

  const best = scored[0];
  const second = scored[1];
  if (!best) return { match: null, reason: 'not_found' };
  const delta = best.score - (second?.score ?? 0);
  if (best.score >= 0.82 && delta >= 0.05) {
    return { match: best.item, reason: 'dice' };
  }
  return { match: null, reason: 'not_found' };
}

function findClosestExisting(targetKey, byKey) {
  const exact = byKey.get(targetKey);
  if (exact?.length) return exact[0];

  let bestItem = null;
  let bestScore = 0;
  for (const [key, items] of byKey.entries()) {
    const score = diceCoefficient(targetKey, key);
    if (score > bestScore && items.length > 0) {
      bestScore = score;
      bestItem = items[0];
    }
  }
  return bestScore >= 0.45 ? bestItem : null;
}

function mergeLocalizedSections(enRecord, zhRecord) {
  const sectionKeys = [
    'introduction',
    'core',
    'comparative',
    'cultural',
    'commonMistakes',
    'review',
  ];
  const sections = {};
  for (const key of sectionKeys) {
    const zh = zhRecord?.sections?.[key];
    const en = enRecord?.sections?.[key];
    if (!zh && !en) continue;
    sections[key] = {
      zh: zh || undefined,
      en: en || undefined,
    };
  }
  return Object.keys(sections).length > 0 ? sections : undefined;
}

function toBigramSet(input) {
  const set = new Set();
  const text = input || '';
  if (text.length < 2) {
    if (text) set.add(text);
    return set;
  }
  for (let i = 0; i < text.length - 1; i++) {
    set.add(text.slice(i, i + 2));
  }
  return set;
}

function diceCoefficient(a, b) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const aSet = toBigramSet(a);
  const bSet = toBigramSet(b);
  if (aSet.size === 0 || bSet.size === 0) return 0;

  let overlap = 0;
  for (const token of aSet) {
    if (bSet.has(token)) overlap += 1;
  }
  return (2 * overlap) / (aSet.size + bSet.size);
}

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function makeSourceMeta(enRecord, zhRecord) {
  const sourcePath = [enRecord?.path, zhRecord?.path].filter(Boolean).join(' | ');
  const checksum = crypto
    .createHash('sha256')
    .update(`${enRecord?.checksum || ''}::${zhRecord?.checksum || ''}`)
    .digest('hex');
  return {
    sourceType: 'local_bilingual_markdown',
    sourcePath,
    checksum,
    parserVersion: 'v1-bilingual-import',
    importedAt: Date.now(),
  };
}

function ensureTmpDir() {
  fs.mkdirSync(path.join(PROJECT_ROOT, 'tmp'), { recursive: true });
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const modeLabel = args.apply ? 'APPLY' : 'DRY-RUN';
  console.log(`\n=== TOPIK Grammar Bilingual Import (${modeLabel}) ===`);
  console.log(`courseId: ${args.courseId}`);
  console.log(`enDir:    ${args.enDir}`);
  console.log(`zhDir:    ${args.zhDir}`);
  if (args.identity) {
    console.log('identity: provided');
  }

  const enFiles = listMarkdownFiles(args.enDir);
  const zhFiles = listMarkdownFiles(args.zhDir);
  console.log(`English files: ${enFiles.length}`);
  console.log(`Chinese files: ${zhFiles.length}`);

  const enMap = new Map();
  for (const filePath of enFiles) {
    const record = parseMarkdownRecord(filePath, 'en');
    if (!record) continue;
    if (!enMap.has(record.key)) enMap.set(record.key, []);
    enMap.get(record.key).push(record);
  }

  const zhMap = new Map();
  for (const filePath of zhFiles) {
    const record = parseMarkdownRecord(filePath, 'zh');
    if (!record) continue;
    if (!zhMap.has(record.key)) zhMap.set(record.key, []);
    zhMap.get(record.key).push(record);
  }

  const allKeys = new Set([...enMap.keys(), ...zhMap.keys()]);
  const merged = [];
  for (const key of allKeys) {
    const enRecord = selectBestRecord(enMap.get(key));
    const zhRecord = selectBestRecord(zhMap.get(key));
    if (!enRecord && !zhRecord) continue;
    merged.push({
      key,
      kernelTitle: enRecord?.kernelTitle || zhRecord?.kernelTitle || '',
      enRecord: enRecord || null,
      zhRecord: zhRecord || null,
    });
  }

  console.log(`Merged keys: ${merged.length}`);
  const courseItems = runConvex('grammars:getByCourse', { courseId: args.courseId }, args.identity);
  console.log(`Existing course grammars: ${courseItems.length}`);
  const { byKey } = buildExistingMaps(courseItems);

  const matched = [];
  const unmatched = [];
  const ambiguous = [];

  for (const item of merged) {
    const found = findBestMatch(item.key, byKey);
    if (!found.match) {
      if (found.reason.startsWith('ambiguous')) ambiguous.push(item);
      else unmatched.push(item);
      continue;
    }
    matched.push({
      ...item,
      match: found.match,
      matchReason: found.reason,
    });
  }

  const bestByGrammarId = new Map();
  for (const item of matched) {
    const grammarId = item.match.id;
    const qualityScore =
      (item.enRecord ? 2 : 0) +
      (item.zhRecord ? 2 : 0) +
      Math.min(1, (item.enRecord?.explanation?.length || 0) / 12000) +
      Math.min(1, (item.zhRecord?.explanation?.length || 0) / 12000);
    const existing = bestByGrammarId.get(grammarId);
    if (!existing || qualityScore > existing.qualityScore) {
      bestByGrammarId.set(grammarId, { item, qualityScore });
    }
  }
  const dedupedMatched = [...bestByGrammarId.values()].map(entry => entry.item);
  const sliced = dedupedMatched.slice(args.offset, args.limit ? args.offset + args.limit : undefined);

  let baseItems;
  if (args.fullReplace) {
    baseItems = merged.map(item => {
      const strict = matched.find(entry => entry.key === item.key);
      const template = strict?.match || findClosestExisting(item.key, byKey);
      const fallbackKernel =
        item.kernelTitle ||
        extractKoreanKernel(item.zhRecord?.titleRaw || item.enRecord?.titleRaw || '') ||
        item.key;
      const titleSource =
        (template ? template.title : undefined) ||
        fallbackKernel ||
        item.zhRecord?.titleRaw ||
        item.enRecord?.titleRaw ||
        '';
      const title = titleSource.replace(/\s+/g, ' ').trim();
      const unitId = template?.unitId ?? args.fallbackUnitId;
      return {
        title,
        titleEn: item.enRecord?.titleRaw || undefined,
        titleZh: item.zhRecord?.titleRaw || undefined,
        unitId,
        summary: item.zhRecord?.summary,
        summaryEn: item.enRecord?.summary,
        explanation: item.zhRecord?.explanation,
        explanationEn: item.enRecord?.explanation,
        sections: mergeLocalizedSections(item.enRecord, item.zhRecord),
        sourceMeta: makeSourceMeta(item.enRecord, item.zhRecord),
      };
    });

    const sorted = baseItems
      .filter(item => Boolean(item.title))
      .sort((a, b) => a.unitId - b.unitId || a.title.localeCompare(b.title, 'ko'));
    const orderByUnit = new Map();
    baseItems = sorted.map(item => {
      const nextOrder = (orderByUnit.get(item.unitId) || 0) + 1;
      orderByUnit.set(item.unitId, nextOrder);
      return { ...item, displayOrder: nextOrder };
    });
  } else {
    baseItems = sliced.map(item => ({
      title: item.match.title,
      unitId: item.match.unitId,
      summary: item.zhRecord?.summary,
      summaryEn: item.enRecord?.summary,
      explanation: item.zhRecord?.explanation,
      explanationEn: item.enRecord?.explanation,
      sourceMeta: makeSourceMeta(item.enRecord, item.zhRecord),
    }));
  }

  const upsertItems = baseItems;
  const unitDistribution = upsertItems.reduce((acc, item) => {
    const key = String(item.unitId);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const report = {
    timestamp: new Date().toISOString(),
    mode: args.apply ? 'apply' : 'dry-run',
    importMode: args.fullReplace ? 'fullReplace' : 'matchedOnly',
    courseId: args.courseId,
    totalEnglishFiles: enFiles.length,
    totalChineseFiles: zhFiles.length,
    mergedKeys: merged.length,
    matched: matched.length,
    matchedDeduped: dedupedMatched.length,
    unmatched: unmatched.length,
    ambiguous: ambiguous.length,
    selectedForRun: upsertItems.length,
    fallbackUnitId: args.fallbackUnitId,
    unitDistribution,
    offset: args.offset,
    limit: args.limit ?? null,
    sampleUnmatched: unmatched.slice(0, 40).map(item => ({
      key: item.key,
      kernelTitle: item.kernelTitle,
      enPath: item.enRecord?.path || null,
      zhPath: item.zhRecord?.path || null,
    })),
    sampleAmbiguous: ambiguous.slice(0, 40).map(item => ({
      key: item.key,
      kernelTitle: item.kernelTitle,
      enPath: item.enRecord?.path || null,
      zhPath: item.zhRecord?.path || null,
    })),
  };

  ensureTmpDir();
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf8');
  fs.writeFileSync(
    MANIFEST_PATH,
    JSON.stringify(
      upsertItems.map(item => ({
        title: item.title,
        titleEn: item.titleEn || null,
        titleZh: item.titleZh || null,
        unitId: item.unitId,
        displayOrder: item.displayOrder || null,
        sourcePath: item.sourceMeta?.sourcePath || null,
      })),
      null,
      2
    ),
    'utf8'
  );

  console.log(`Matched:   ${matched.length} (deduped: ${dedupedMatched.length})`);
  console.log(`Unmatched: ${unmatched.length}`);
  console.log(`Ambiguous: ${ambiguous.length}`);
  if (args.fullReplace) {
    console.log(`Mode:      fullReplace (fallbackUnitId=${args.fallbackUnitId})`);
  }
  console.log(`Selected:  ${upsertItems.length}`);
  console.log(`Report:    ${REPORT_PATH}`);
  console.log(`Manifest:  ${MANIFEST_PATH}`);

  if (!args.apply) {
    console.log('\nDry-run complete. Add --apply to perform updates.');
    return;
  }

  const batches = chunk(upsertItems, args.batchSize);
  let totalUpdated = 0;
  let totalCreated = 0;
  let totalLinked = 0;
  let totalSkipped = 0;
  let clearedLinks = 0;
  const allErrors = [];

  if (args.fullReplace) {
    const clearResult = runConvex(
      'grammars:adminClearCourseGrammarLinks',
      { courseId: args.courseId },
      args.identity
    );
    clearedLinks = clearResult.deleted || 0;
    console.log(`\nCleared existing course links: ${clearedLinks}`);
  }

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`\n[${i + 1}/${batches.length}] Upserting ${batch.length} items...`);
    const result = runConvex(
      'grammars:adminBulkUpsertContent',
      {
        courseId: args.courseId,
        createIfMissing: args.fullReplace,
        items: batch,
      },
      args.identity
    );
    totalUpdated += result.updated || 0;
    totalCreated += result.created || 0;
    totalLinked += result.linked || 0;
    totalSkipped += result.skipped || 0;
    if (Array.isArray(result.errors)) {
      allErrors.push(...result.errors);
    }
    console.log(
      `  updated=${result.updated || 0}, created=${result.created || 0}, linked=${result.linked || 0}, skipped=${result.skipped || 0}`
    );
  }

  const applySummary = {
    ...report,
    mode: 'apply',
    result: {
      updated: totalUpdated,
      created: totalCreated,
      linked: totalLinked,
      skipped: totalSkipped,
      clearedLinks,
      errors: allErrors.slice(0, 120),
    },
  };
  fs.writeFileSync(REPORT_PATH, JSON.stringify(applySummary, null, 2), 'utf8');

  console.log('\n=== Apply Summary ===');
  console.log(`updated: ${totalUpdated}`);
  console.log(`created: ${totalCreated}`);
  console.log(`linked:  ${totalLinked}`);
  console.log(`skipped: ${totalSkipped}`);
  if (args.fullReplace) {
    console.log(`cleared: ${clearedLinks}`);
  }
  if (allErrors.length > 0) {
    console.log(`errors:  ${allErrors.length} (see report)`);
  }
  console.log(`Report:  ${REPORT_PATH}`);
}

try {
  main();
} catch (error) {
  console.error('\nImport failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
}
