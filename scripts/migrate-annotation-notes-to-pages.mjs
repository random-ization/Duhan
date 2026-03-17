#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const prod = args.includes('--prod');

const limitArg = args.find(item => item.startsWith('--limit='));
const limit = limitArg ? Number.parseInt(limitArg.split('=')[1] || '', 10) : undefined;

const payload = {
  dryRun,
  ...(Number.isFinite(limit) ? { limit } : {}),
};

const convexArgs = [
  'convex',
  'run',
  ...(prod ? ['--prod'] : []),
  'notePages:migrateLegacyAllNotes',
  JSON.stringify(payload),
];

console.log(`[migration] Running: npx ${convexArgs.join(' ')}`);
const result = spawnSync('npx', convexArgs, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
