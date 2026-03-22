#!/usr/bin/env node
/**
 * Rebuild TOPIK grammar catalog from EN + ZH markdown folders with semantic classification.
 *
 * Default mode is dry-run (no DB mutation). Add --apply to execute.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const PROJECT_ROOT = process.cwd();
const DEFAULT_COURSE_ID = 'topik-grammar';
const DEFAULT_BATCH_SIZE = 24;

function parseArgs(argv) {
  const args = {
    enDir: '',
    zhDir: '',
    courseId: DEFAULT_COURSE_ID,
    identity: '',
    prod: false,
    deleteOrphans: false,
    batchSize: DEFAULT_BATCH_SIZE,
    apply: false,
    dryRunClassifyOnly: false,
    skipViMnSnapshot: false,
    useManifest: '',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--enDir') args.enDir = argv[++i] || '';
    else if (token === '--zhDir') args.zhDir = argv[++i] || '';
    else if (token === '--courseId') args.courseId = (argv[++i] || '').trim() || DEFAULT_COURSE_ID;
    else if (token === '--identity') args.identity = (argv[++i] || '').trim();
    else if (token === '--prod') args.prod = true;
    else if (token === '--deleteOrphans') args.deleteOrphans = true;
    else if (token === '--batchSize')
      args.batchSize = Math.max(1, Math.min(80, Number(argv[++i] || DEFAULT_BATCH_SIZE)));
    else if (token === '--dryRunClassifyOnly') args.dryRunClassifyOnly = true;
    else if (token === '--skipViMnSnapshot') args.skipViMnSnapshot = true;
    else if (token === '--useManifest') args.useManifest = argv[++i] || '';
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
  if (args.useManifest) {
    if (!fs.existsSync(args.useManifest) || !fs.statSync(args.useManifest).isFile()) {
      throw new Error(`Manifest file not found: ${args.useManifest}`);
    }
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
  node scripts/rebuildTopikGrammarSemantic.mjs --enDir <path> --zhDir <path> [options]

Options:
  --courseId <id>      Course legacy id (default: ${DEFAULT_COURSE_ID})
  --identity <json>    Convex identity JSON for admin-only operations
  --prod               Run Convex mutations/queries against prod deployment
  --deleteOrphans      Delete grammar_points that become unlinked after course reset
  --batchSize <n>      Batch size for classify/import calls (default: ${DEFAULT_BATCH_SIZE})
  --dryRunClassifyOnly Run semantic classify + report only (no mutation)
  --skipViMnSnapshot   Do not preserve vi/mn snapshot before reset
  --useManifest <path> Reuse existing manifest decisions and skip classify
  --apply              Execute full rebuild
  --help               Show help
`);
}

function runConvex(functionName, payload, identity, prod = false) {
  const args = ['convex', 'run', functionName, JSON.stringify(payload)];
  if (prod) {
    args.splice(2, 0, '--prod');
  }
  if (identity) {
    args.splice(2, 0, '--identity', identity);
  }
  const raw = execFileSync('npx', args, {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 30,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return JSON.parse(raw.trim());
}

function ensureTmpDir() {
  fs.mkdirSync(path.join(PROJECT_ROOT, 'tmp'), { recursive: true });
}

function listMarkdownFiles(dir) {
  return fs
    .readdirSync(dir)
    .filter(name => name.toLowerCase().endsWith('.md'))
    .sort((a, b) => a.localeCompare(b, 'en'))
    .map(name => path.join(dir, name));
}

function normalizeWhitespace(input) {
  return input.replace(/\s+/g, ' ').trim();
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
    .replace(/^By\s+\[Hanabira\.org\].*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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

function extractTitle(content, fileName, language) {
  if (language === 'en') {
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

function normalizeGrammarKey(input) {
  const kernel = extractKoreanKernel(input);
  return kernel.replace(/[~\s]/g, '').toLowerCase().trim();
}

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function parseRecords(files, language) {
  const records = [];
  for (const filePath of files) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const content = cleanMarkdownBody(raw);
    const fileName = path.basename(filePath);
    const titleRaw = extractTitle(content, fileName, language);
    const koreanTitle = extractKoreanKernel(titleRaw) || normalizeWhitespace(titleRaw);
    const grammarKey = normalizeGrammarKey(titleRaw) || normalizeGrammarKey(fileName);
    if (!grammarKey) continue;

    const summary = firstParagraph(content).slice(0, 400);
    const checksum = crypto.createHash('sha256').update(raw).digest('hex');

    records.push({
      id: `${language}:${grammarKey}:${path.basename(filePath)}`,
      language,
      grammarKey,
      titleRaw,
      koreanTitle: koreanTitle || titleRaw,
      summary,
      explanation: content.slice(0, 50000),
      sourcePath: filePath,
      checksum,
    });
  }
  return records;
}

function toImportItem(record, decision) {
  const shared = {
    title: record.koreanTitle || record.titleRaw,
    grammarKey: record.grammarKey,
    sourcePath: record.sourcePath,
    checksum: record.checksum,
    categoryId: decision?.categoryId || 15,
    categoryConfidence: decision?.confidence,
    categoryStatus: decision?.status || 'NEEDS_REVIEW',
    categoryReason: decision?.reason,
    categoryEvidence: decision?.evidence,
  };
  if (record.language === 'en') {
    return {
      ...shared,
      titleEn: record.titleRaw,
      summaryEn: record.summary,
      explanationEn: record.explanation,
    };
  }
  return {
    ...shared,
    titleZh: record.titleRaw,
    summary: record.summary,
    explanation: record.explanation,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  ensureTmpDir();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(PROJECT_ROOT, 'tmp', `topik_semantic_rebuild_report_${timestamp}.json`);
  const manifestPath = path.join(
    PROJECT_ROOT,
    'tmp',
    `topik_semantic_rebuild_manifest_${timestamp}.json`
  );
  const reviewPath = path.join(PROJECT_ROOT, 'tmp', `topik_semantic_rebuild_review_${timestamp}.json`);
  const viMnSnapshotPath = path.join(
    PROJECT_ROOT,
    'tmp',
    `topik_vimn_snapshot_${timestamp}.json`
  );

  console.log(`\n=== TOPIK Semantic Rebuild (${args.apply ? 'APPLY' : 'DRY-RUN'}) ===`);
  console.log(`courseId: ${args.courseId}`);
  console.log(`enDir:    ${args.enDir}`);
  console.log(`zhDir:    ${args.zhDir}`);
  console.log(`target:   ${args.prod ? 'prod' : 'dev'}`);
  console.log(`orphans:  ${args.deleteOrphans ? 'delete' : 'keep'}`);

  const enRecords = parseRecords(listMarkdownFiles(args.enDir), 'en');
  const zhRecords = parseRecords(listMarkdownFiles(args.zhDir), 'zh');
  const allRecords = [...enRecords, ...zhRecords];
  console.log(`Parsed EN: ${enRecords.length}`);
  console.log(`Parsed ZH: ${zhRecords.length}`);
  console.log(`Parsed Total: ${allRecords.length}`);

  const decisionsById = new Map();
  const classificationErrors = [];
  if (args.useManifest) {
    console.log(`Using existing manifest decisions: ${args.useManifest}`);
    const existingManifest = JSON.parse(fs.readFileSync(args.useManifest, 'utf8'));
    for (const item of existingManifest) {
      if (!item?.id) continue;
      decisionsById.set(item.id, {
        key: item.id,
        categoryId: Number(item.categoryId) || 15,
        confidence: typeof item.confidence === 'number' ? item.confidence : 0.3,
        status: item.status === 'AUTO_OK' ? 'AUTO_OK' : 'NEEDS_REVIEW',
        reason: item.reason || 'Loaded from manifest',
        evidence: item.evidence || '',
      });
    }
  } else {
    const classifyBatches = chunk(allRecords, args.batchSize);
    for (let i = 0; i < classifyBatches.length; i += 1) {
      const batch = classifyBatches[i];
      console.log(`[Classify ${i + 1}/${classifyBatches.length}] ${batch.length} items`);
      const response = runConvex(
        'ai:adminClassifyTopikBySemantics',
        {
          items: batch.map(item => ({
            key: item.id,
            language: item.language,
            title: item.titleRaw,
            summary: item.summary,
            explanation: item.explanation.slice(0, 700),
          })),
        },
        args.identity,
        args.prod
      );

      if (!response?.success) {
        classificationErrors.push(response?.error || 'Unknown classify error');
        for (const item of batch) {
          decisionsById.set(item.id, {
            categoryId: 15,
            confidence: 0.3,
            status: 'NEEDS_REVIEW',
            reason: response?.error || 'Classify call failed',
            evidence: '',
          });
        }
        continue;
      }

      for (const result of response.results || []) {
        decisionsById.set(result.key, result);
      }
    }
  }

  const manifest = allRecords.map(record => {
    const decision = decisionsById.get(record.id) || {
      categoryId: 15,
      confidence: 0.3,
      status: 'NEEDS_REVIEW',
      reason: 'Missing classifier output',
      evidence: '',
    };
    return {
      id: record.id,
      language: record.language,
      title: record.titleRaw,
      koreanTitle: record.koreanTitle,
      grammarKey: record.grammarKey,
      categoryId: decision.categoryId,
      confidence: decision.confidence,
      status: decision.status,
      reason: decision.reason || '',
      evidence: decision.evidence || '',
      sourcePath: record.sourcePath,
    };
  });

  const reviewItems = manifest.filter(item => item.status !== 'AUTO_OK');

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  fs.writeFileSync(reviewPath, JSON.stringify(reviewItems, null, 2), 'utf8');

  const baseReport = {
    timestamp,
    mode: args.apply ? 'apply' : 'dry-run',
    courseId: args.courseId,
    parsed: {
      en: enRecords.length,
      zh: zhRecords.length,
      total: allRecords.length,
    },
    classification: {
      errors: classificationErrors,
      autoOk: manifest.filter(item => item.status === 'AUTO_OK').length,
      needsReview: reviewItems.length,
      byCategory: manifest.reduce((acc, item) => {
        const key = String(item.categoryId || 15);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {}),
    },
    files: {
      manifestPath,
      reviewPath,
      viMnSnapshotPath,
    },
  };

  if (!args.apply || args.dryRunClassifyOnly) {
    fs.writeFileSync(reportPath, JSON.stringify(baseReport, null, 2), 'utf8');
    console.log(`Manifest: ${manifestPath}`);
    console.log(`Review:   ${reviewPath}`);
    console.log(`Report:   ${reportPath}`);
    console.log('Dry-run complete.');
    return;
  }

  let snapshotResult = { count: 0, snapshot: [] };
  if (!args.skipViMnSnapshot) {
    console.log('\n[1/4] Preserving vi/mn snapshot...');
    snapshotResult = runConvex(
      'grammars:adminPreserveTopikViMnSnapshot',
      { courseId: args.courseId },
      args.identity,
      args.prod
    );
    fs.writeFileSync(
      viMnSnapshotPath,
      JSON.stringify(
        { count: snapshotResult.count || 0, snapshot: snapshotResult.snapshot || [] },
        null,
        2
      ),
      'utf8'
    );
  } else {
    console.log('\n[1/4] Skip vi/mn snapshot (requested).');
  }

  console.log('[2/4] Resetting existing course links...');
  const resetResult = runConvex(
    'grammars:adminResetTopikCourseLinks',
    { courseId: args.courseId, deleteOrphanGrammars: args.deleteOrphans },
    args.identity,
    args.prod
  );

  console.log('[3/4] Importing EN...');
  let importedEn = { created: 0, linked: 0, errors: [] };
  for (const batch of chunk(enRecords, args.batchSize)) {
    const payload = batch.map(record => toImportItem(record, decisionsById.get(record.id)));
    const result = runConvex(
      'grammars:adminImportTopikMarkdownByLanguage',
      {
        courseId: args.courseId,
        language: 'en',
        items: payload,
        defaultCategoryId: 15,
      },
      args.identity,
      args.prod
    );
    importedEn.created += result.created || 0;
    importedEn.linked += result.linked || 0;
    if (Array.isArray(result.errors)) importedEn.errors.push(...result.errors);
  }

  console.log('[4/4] Importing ZH...');
  let importedZh = { created: 0, linked: 0, errors: [] };
  for (const batch of chunk(zhRecords, args.batchSize)) {
    const payload = batch.map(record => toImportItem(record, decisionsById.get(record.id)));
    const result = runConvex(
      'grammars:adminImportTopikMarkdownByLanguage',
      {
        courseId: args.courseId,
        language: 'zh',
        items: payload,
        defaultCategoryId: 15,
      },
      args.identity,
      args.prod
    );
    importedZh.created += result.created || 0;
    importedZh.linked += result.linked || 0;
    if (Array.isArray(result.errors)) importedZh.errors.push(...result.errors);
  }

  const report = {
    ...baseReport,
    mode: 'apply',
    snapshot: {
      count: snapshotResult.count || 0,
      output: viMnSnapshotPath,
    },
    reset: resetResult,
    import: {
      en: importedEn,
      zh: importedZh,
    },
  };
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log('\n=== Apply Summary ===');
  console.log(`Snapshot count: ${snapshotResult.count || 0}`);
  console.log(`Reset links:    ${resetResult.deletedLinks || 0}`);
  console.log(`EN imported:    ${importedEn.created}`);
  console.log(`ZH imported:    ${importedZh.created}`);
  console.log(`Manifest:       ${manifestPath}`);
  console.log(`Review:         ${reviewPath}`);
  console.log(`Report:         ${reportPath}`);
}

try {
  main();
} catch (error) {
  console.error('\nRebuild failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
}
