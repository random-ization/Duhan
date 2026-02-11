import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const srcRoot = path.join(projectRoot, 'src');
const baselineFile = path.join(projectRoot, 'scripts', 'i18n-baseline.txt');

const excludedPathFragments = [
  `${path.sep}src${path.sep}components${path.sep}admin${path.sep}`,
  `${path.sep}src${path.sep}features${path.sep}admin${path.sep}`,
  `${path.sep}src${path.sep}pages${path.sep}Admin`,
  `${path.sep}src${path.sep}pages${path.sep}admin${path.sep}`,
];

const args = process.argv.slice(2);
const shouldFail = args.includes('--fail');
const shouldFailOnNew = args.includes('--fail-on-new');
const printPathsOnly = args.includes('--paths-only');
const cjkRegex = /[\u4e00-\u9fff]/;

function* walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(fullPath);
      continue;
    }
    yield fullPath;
  }
}

function isExcluded(filePath) {
  return excludedPathFragments.some((fragment) => filePath.includes(fragment));
}

function isCodeFile(filePath) {
  return filePath.endsWith('.ts') || filePath.endsWith('.tsx');
}

function findFirstCjkLineNumber(contents) {
  const lines = contents.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (cjkRegex.test(lines[i])) {
      return { line: i + 1, preview: lines[i].trim().slice(0, 160) };
    }
  }
  return null;
}

const findings = [];

for (const filePath of walk(srcRoot)) {
  if (!isCodeFile(filePath)) continue;
  if (isExcluded(filePath)) continue;
  const contents = fs.readFileSync(filePath, 'utf8');
  if (!cjkRegex.test(contents)) continue;
  const first = findFirstCjkLineNumber(contents);
  findings.push({
    filePath: path.relative(projectRoot, filePath),
    line: first?.line ?? 0,
    preview: first?.preview ?? '',
  });
}

findings.sort((a, b) => a.filePath.localeCompare(b.filePath));

if (printPathsOnly) {
  for (const f of findings) {
    console.log(f.filePath);
  }
  process.exit(0);
}

if (findings.length === 0) {
  console.log('[i18n-scan] No CJK hardcoded text found (excluding admin).');
  process.exit(0);
}

if (!shouldFailOnNew) {
  console.log(`[i18n-scan] Found ${findings.length} file(s) containing CJK characters (excluding admin):`);
  for (const f of findings) {
    console.log(`- ${f.filePath}:${f.line} ${f.preview}`);
  }
} else {
  console.log(
    `[i18n-scan] Baseline check mode: found ${findings.length} file(s) with existing hardcoded CJK text.`
  );
}

if (shouldFail) {
  process.exit(1);
}

if (shouldFailOnNew) {
  if (!fs.existsSync(baselineFile)) {
    console.error(`[i18n-scan] Baseline file not found: ${path.relative(projectRoot, baselineFile)}`);
    process.exit(1);
  }

  const baseline = new Set(
    fs
      .readFileSync(baselineFile, 'utf8')
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
  );
  const newlyIntroduced = findings.filter(f => !baseline.has(f.filePath));

  if (newlyIntroduced.length > 0) {
    console.error('\n[i18n-scan] Newly introduced CJK hardcoded text found:');
    for (const f of newlyIntroduced) {
      console.error(`- ${f.filePath}:${f.line} ${f.preview}`);
    }
    process.exit(1);
  }

  console.log('[i18n-scan] No new hardcoded CJK text compared with baseline.');
}
