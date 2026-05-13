#!/usr/bin/env node
/**
 * Backfill Android mobile backend defaults and persisted course estimates.
 *
 * Usage:
 *   node scripts/backfillAndroidMobileData.mjs --dry-run
 *   node scripts/backfillAndroidMobileData.mjs --apply --identity '{"tokenIdentifier":"...","subject":"..."}'
 *   node scripts/backfillAndroidMobileData.mjs --apply --force --minutesPerUnit 35 --weeklyGoal 6
 *   node scripts/backfillAndroidMobileData.mjs --apply --suggestions "안녕하세요,TOPIK,문법,읽기,쓰기"
 */

import { execFileSync } from 'node:child_process';

function parseArgs(argv) {
  const args = {
    apply: false,
    force: false,
    identity: '',
    minutesPerUnit: undefined,
    weeklyGoal: undefined,
    suggestions: undefined,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--apply') args.apply = true;
    else if (token === '--dry-run') args.apply = false;
    else if (token === '--force') args.force = true;
    else if (token === '--identity') args.identity = (argv[index + 1] || '').trim(), (index += 1);
    else if (token === '--minutesPerUnit') {
      const value = Number(argv[index + 1]);
      if (Number.isFinite(value) && value > 0) args.minutesPerUnit = Math.floor(value);
      index += 1;
    } else if (token === '--weeklyGoal') {
      const value = Number(argv[index + 1]);
      if (Number.isFinite(value) && value > 0) args.weeklyGoal = Math.floor(value);
      index += 1;
    } else if (token === '--suggestions') {
      const raw = (argv[index + 1] || '').trim();
      args.suggestions =
        raw.length > 0
          ? raw
              .split(',')
              .map(item => item.trim())
              .filter(Boolean)
          : undefined;
      index += 1;
    } else if (token === '--help' || token === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  return args;
}

function printHelp() {
  console.log(`Usage:
  node scripts/backfillAndroidMobileData.mjs [options]

Options:
  --apply                     Apply changes. Omit to run dry-run.
  --dry-run                   Force dry-run (default).
  --identity <json>           Convex identity JSON for admin mutation.
  --force                     Overwrite existing values.
  --minutesPerUnit <n>        Estimated minutes per course unit (default: 30).
  --weeklyGoal <n>            writingWeeklyGoalTarget (default: 5).
  --suggestions "a,b,c"       Dictionary suggestion list.
  --help                      Show help.
`);
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
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 25,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return parseConvexJson(raw);
}

function formatPreviewRow(row) {
  const previous = row.previous == null ? '--' : `${row.previous}`;
  return `- ${row.legacyId}: ${previous} -> ${row.next} mins (units=${row.unitCount}, textbookRows=${row.articleCount})`;
}

function main() {
  const cli = parseArgs(process.argv.slice(2));
  const payload = {
    dryRun: !cli.apply,
    force: cli.force,
  };

  if (typeof cli.minutesPerUnit === 'number') payload.minutesPerUnit = cli.minutesPerUnit;
  if (typeof cli.weeklyGoal === 'number') payload.writingWeeklyGoalTarget = cli.weeklyGoal;
  if (Array.isArray(cli.suggestions) && cli.suggestions.length > 0) {
    payload.dictionarySuggestions = cli.suggestions;
  }

  console.log(`[android-backfill] mode=${payload.dryRun ? 'dry-run' : 'apply'} force=${payload.force}`);
  let result;
  try {
    result = runConvex('admin:backfillAndroidMobileData', payload, cli.identity);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('UNAUTHORIZED')) {
      console.error('[android-backfill] Unauthorized. Provide an admin identity via --identity \'{...json...}\'.');
      process.exit(1);
    }
    console.error(`[android-backfill] Failed: ${message}`);
    process.exit(1);
  }

  console.log(
    `[android-backfill] institutes scanned=${result.institutesScanned}, patched=${result.institutesPatched}`
  );
  console.log(
    `[android-backfill] dictionary suggestions=${result.dictionarySuggestionsCount}, weeklyGoal=${result.writingWeeklyGoalTarget}`
  );
  if (Array.isArray(result.settingsPatchResults)) {
    for (const item of result.settingsPatchResults) {
      console.log(
        `[android-backfill] setting ${item.key}: existed=${item.existed} changed=${item.changed}`
      );
    }
  }
  if (Array.isArray(result.instituteUpdates) && result.instituteUpdates.length > 0) {
    console.log('[android-backfill] institute updates preview:');
    for (const row of result.instituteUpdates.slice(0, 20)) {
      console.log(formatPreviewRow(row));
    }
  }
}

main();
