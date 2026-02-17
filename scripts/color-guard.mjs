import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');
const BASELINE_FILE = path.join(ROOT, 'scripts', 'color-guard-baseline.json');
const WRITE_BASELINE = process.argv.includes('--write-baseline');

const SCANNED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css']);
const EXCLUDED_SEGMENTS = ['admin'];

// Guard for hardcoded neutral colors in non-admin UI paths.
const NEUTRAL_CLASS_RE =
  /\b(?:text|bg|border|from|via|to|ring|shadow|fill|stroke|decoration|outline)-(?:slate|gray|zinc|neutral|stone)-(?:50|100|200|300|400|500|600|700|800|900|950)\b|\b(?:text|bg|border|from|via|to|ring|shadow|fill|stroke|decoration|outline)-(?:black|white)(?:\/[0-9]{1,3})?\b/g;

function shouldScanFile(filePath) {
  const ext = path.extname(filePath);
  if (!SCANNED_EXTENSIONS.has(ext)) return false;
  const normalized = filePath.split(path.sep).join('/');
  return !EXCLUDED_SEGMENTS.some(segment => normalized.includes(`/src/${segment}/`));
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async entry => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(fullPath);
      return [fullPath];
    })
  );
  return files.flat();
}

function countNeutralClasses(source, relPath) {
  const counts = new Map();
  const lines = source.split('\n');
  lines.forEach(line => {
    const matches = line.match(NEUTRAL_CLASS_RE);
    if (!matches) return;
    matches.forEach(match => {
      const key = `${relPath}::${match}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
  });
  return counts;
}

async function scan() {
  const allFiles = await walk(SRC_DIR);
  const targetFiles = allFiles.filter(shouldScanFile);
  const aggregate = new Map();

  await Promise.all(
    targetFiles.map(async filePath => {
      const content = await fs.readFile(filePath, 'utf8');
      const relPath = path.relative(ROOT, filePath).split(path.sep).join('/');
      const fileCounts = countNeutralClasses(content, relPath);
      fileCounts.forEach((count, key) => {
        aggregate.set(key, (aggregate.get(key) ?? 0) + count);
      });
    })
  );

  return Object.fromEntries([...aggregate.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

async function readBaseline() {
  try {
    const raw = await fs.readFile(BASELINE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed.counts ?? {};
  } catch {
    return {};
  }
}

async function writeBaseline(counts) {
  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    scope: 'src/**/*.{ts,tsx,js,jsx,css} (excluding src/admin/**)',
    counts,
  };
  await fs.writeFile(BASELINE_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function printDiff(newViolations) {
  console.error('\n[color-guard] New hardcoded neutral color usages detected:\n');
  newViolations.slice(0, 80).forEach(({ key, prev, next }) => {
    console.error(`- ${key}  (baseline: ${prev}, current: ${next})`);
  });
  if (newViolations.length > 80) {
    console.error(`... and ${newViolations.length - 80} more`);
  }
  console.error(
    '\nUse theme tokens (`foreground`, `muted-foreground`, `card`, `border`, etc.) or update baseline intentionally.'
  );
}

async function main() {
  const counts = await scan();

  if (WRITE_BASELINE) {
    await writeBaseline(counts);
    console.log(
      `[color-guard] Baseline updated: ${Object.keys(counts).length} tracked class tokens.`
    );
    return;
  }

  const baselineCounts = await readBaseline();
  const newViolations = Object.entries(counts)
    .filter(([key, next]) => next > (baselineCounts[key] ?? 0))
    .map(([key, next]) => ({ key, prev: baselineCounts[key] ?? 0, next }))
    .sort((a, b) => a.key.localeCompare(b.key));

  if (newViolations.length > 0) {
    printDiff(newViolations);
    process.exitCode = 1;
    return;
  }

  console.log(
    `[color-guard] OK. No new hardcoded neutral color usages beyond baseline (${Object.keys(counts).length} tracked tokens).`
  );
}

main().catch(error => {
  console.error('[color-guard] Failed:', error);
  process.exitCode = 1;
});
