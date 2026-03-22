#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const PROJECT_ROOT = process.cwd();
const DEFAULT_COURSE_ID = 'topik-grammar';
const DEFAULT_BATCH_SIZE = 80;

function parseArgs(argv) {
  const args = {
    courseId: DEFAULT_COURSE_ID,
    batchSize: DEFAULT_BATCH_SIZE,
    identity: '',
    apply: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--courseId') args.courseId = (argv[++i] || '').trim() || DEFAULT_COURSE_ID;
    else if (token === '--batchSize') {
      args.batchSize = Math.max(1, Math.min(200, Number(argv[++i] || DEFAULT_BATCH_SIZE)));
    } else if (token === '--identity') args.identity = (argv[++i] || '').trim();
    else if (token === '--apply') args.apply = true;
    else if (token === '--help' || token === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
  node scripts/auditTopikQualityAndRepair.mjs [options]

Options:
  --courseId <id>    Course id (default: ${DEFAULT_COURSE_ID})
  --batchSize <n>    Batch size (default: ${DEFAULT_BATCH_SIZE})
  --identity <json>  Convex identity for admin functions
  --apply            Apply fixes after dry-run audit
`);
}

function runConvex(functionName, payload, identity) {
  const args = ['convex', 'run'];
  args.push(functionName, JSON.stringify(payload));
  if (identity) {
    args.splice(2, 0, '--identity', identity);
  }
  const raw = execFileSync('npx', args, {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 20,
    env: { ...process.env, CI: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return JSON.parse(raw.trim());
}

function aggregateBatchResults(results) {
  const summary = {
    batches: results.length,
    total: 0,
    scanned: 0,
    changed: 0,
    summariesRegenerated: 0,
    issueCounts: {
      processingKeyword: 0,
      labelPrefix: 0,
      romanization: 0,
      mergedMarker: 0,
      noisyTitleSuffix: 0,
    },
    samples: [],
    errors: [],
  };

  for (const result of results) {
    summary.total = Math.max(summary.total, result.total || 0);
    summary.scanned += result.scanned || 0;
    summary.changed += result.changed || 0;
    summary.summariesRegenerated += result.summariesRegenerated || 0;
    for (const key of Object.keys(summary.issueCounts)) {
      summary.issueCounts[key] += result.issueCounts?.[key] || 0;
    }
    for (const sample of result.samples || []) {
      if (summary.samples.length >= 40) break;
      summary.samples.push(sample);
    }
    for (const error of result.errors || []) {
      if (summary.errors.length >= 80) break;
      summary.errors.push(error);
    }
  }

  return summary;
}

function runPass({ courseId, batchSize, identity, dryRun }) {
  const results = [];
  let offset = 0;

  while (true) {
    const result = runConvex('grammars:adminSanitizeTopikCourseBatch', {
      courseId,
      offset,
      limit: batchSize,
      dryRun,
    }, identity);
    results.push(result);
    const total = Number(result.total || 0);
    const scanned = Number(result.scanned || 0);
    offset += scanned;
    if (offset >= total || scanned === 0) break;
  }

  return aggregateBatchResults(results);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(
    PROJECT_ROOT,
    'tmp',
    `topik_quality_audit_${timestamp}${args.apply ? '_apply' : '_dryrun'}.json`
  );

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });

  console.log(`Audit course: ${args.courseId}`);
  console.log(`Batch size:   ${args.batchSize}`);
  console.log(`Mode:         ${args.apply ? 'apply' : 'dry-run'}`);

  const dryRunSummary = runPass({
    courseId: args.courseId,
    batchSize: args.batchSize,
    identity: args.identity,
    dryRun: true,
  });

  const report = {
    timestamp,
    courseId: args.courseId,
    batchSize: args.batchSize,
    dryRunSummary,
  };

  if (args.apply) {
    const applySummary = runPass({
      courseId: args.courseId,
      batchSize: args.batchSize,
      identity: args.identity,
      dryRun: false,
    });
    const verifySummary = runPass({
      courseId: args.courseId,
      batchSize: args.batchSize,
      identity: args.identity,
      dryRun: true,
    });
    report.applySummary = applySummary;
    report.verifySummary = verifySummary;
  }

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log(`Report: ${reportPath}`);
  console.log(`Scanned: ${dryRunSummary.scanned}`);
  console.log(`Potential changes: ${dryRunSummary.changed}`);
  console.log(`Issue counts: ${JSON.stringify(dryRunSummary.issueCounts)}`);
  if (args.apply && report.applySummary) {
    console.log(`Applied changes: ${report.applySummary.changed}`);
    console.log(`Post-verify changes remaining: ${report.verifySummary.changed}`);
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
