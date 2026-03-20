import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');
const BASELINE_FILE = path.join(ROOT, 'scripts', 'color-guard-baseline.json');
const WRITE_BASELINE = process.argv.includes('--write-baseline');

const SCANNED_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css']);
const EXCLUDED_PATH_MATCHERS = ['/admin/'];
const NATIVE_CONTROL_EXTENSIONS = new Set(['.tsx', '.jsx']);
const NATIVE_CONTROL_EXCEPTIONS = new Set([
  'src/components/notebook/OfficialTiptapEditor.tsx',
  'src/components/topik/WongojiEditor.tsx',
]);

// Guard for hardcoded neutral colors / raw hex / raw native controls in non-admin UI paths.
const NEUTRAL_CLASS_RE =
  /\b(?:text|bg|border|from|via|to|ring|shadow|fill|stroke|decoration|outline)-(?:slate|gray|zinc|neutral|stone)-(?:50|100|200|300|400|500|600|700|800|900|950)\b|\b(?:text|bg|border|from|via|to|ring|shadow|fill|stroke|decoration|outline)-(?:black|white)(?:\/[0-9]{1,3})?\b/g;
const HEX_COLOR_RE = /#[0-9a-fA-F]{3,8}\b/g;
const NATIVE_CONTROL_RE = /<(button|input|select|textarea)\b/g;

function normalizePath(filePath) {
  return filePath.split(path.sep).join('/');
}

function shouldScanFile(filePath) {
  const ext = path.extname(filePath);
  if (!SCANNED_EXTENSIONS.has(ext)) return false;
  const normalized = normalizePath(filePath);
  return !EXCLUDED_PATH_MATCHERS.some(matcher => normalized.includes(matcher));
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

function countStyleViolations(source, relPath, ext) {
  const counts = new Map();
  const lines = source.split('\n');
  lines.forEach(line => {
    const neutralMatches = line.match(NEUTRAL_CLASS_RE);
    if (neutralMatches) {
      neutralMatches.forEach(match => {
        const key = `${relPath}::${match}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      });
    }

    const hexMatches = line.match(HEX_COLOR_RE);
    if (hexMatches) {
      hexMatches.forEach(match => {
        const key = `${relPath}::HEX:${match.toLowerCase()}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      });
    }

    const shouldCheckNativeControl =
      NATIVE_CONTROL_EXTENSIONS.has(ext) &&
      !NATIVE_CONTROL_EXCEPTIONS.has(relPath) &&
      !relPath.startsWith('src/components/ui/');

    if (shouldCheckNativeControl) {
      const nativeMatches = [...line.matchAll(NATIVE_CONTROL_RE)];
      nativeMatches.forEach(match => {
        const tag = match[1].toLowerCase();
        const key = `${relPath}::NATIVE:<${tag}>`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      });
    }
  });
  return counts;
}

function formatViolationLabel(key) {
  if (key.includes('::NATIVE:')) {
    return `${key}  (use components/ui primitive instead)`;
  }
  if (key.includes('::HEX:')) {
    return `${key}  (use theme token / brand variable instead)`;
  }
  return key;
}

function printDiff(newViolations) {
  console.error('\n[color-guard] New style violations detected:\n');
  newViolations.slice(0, 80).forEach(({ key, prev, next }) => {
    console.error(`- ${formatViolationLabel(key)}  (baseline: ${prev}, current: ${next})`);
  });
  if (newViolations.length > 80) {
    console.error(`... and ${newViolations.length - 80} more`);
  }
  console.error(
    '\nUse theme tokens (`foreground`, `muted-foreground`, `card`, `border`, etc.), brand variables, and components in `src/components/ui`.'
  );
}

async function scan() {
  const allFiles = await walk(SRC_DIR);
  const targetFiles = allFiles.filter(shouldScanFile);
  const aggregate = new Map();

  await Promise.all(
    targetFiles.map(async filePath => {
      const content = await fs.readFile(filePath, 'utf8');
      const relPath = path.relative(ROOT, filePath).split(path.sep).join('/');
      const ext = path.extname(filePath);
      const fileCounts = countStyleViolations(content, relPath, ext);
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
    scope:
      'src/**/*.{ts,tsx,js,jsx,css} (excluding any /admin/ path). Includes neutral-color classes, hex colors, and native control tags.',
    counts,
  };
  await fs.writeFile(BASELINE_FILE, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
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
    `[color-guard] OK. No new style violations beyond baseline (${Object.keys(counts).length} tracked tokens).`
  );
}

main().catch(error => {
  console.error('[color-guard] Failed:', error);
  process.exitCode = 1;
});
