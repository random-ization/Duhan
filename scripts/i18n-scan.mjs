import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const srcRoot = path.join(projectRoot, 'src');

const excludedPathFragments = [
  `${path.sep}src${path.sep}components${path.sep}admin${path.sep}`,
  `${path.sep}src${path.sep}features${path.sep}admin${path.sep}`,
  `${path.sep}src${path.sep}pages${path.sep}Admin`,
  `${path.sep}src${path.sep}pages${path.sep}admin${path.sep}`,
];

const shouldFail = process.argv.includes('--fail');
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

if (findings.length === 0) {
  console.log('[i18n-scan] No CJK hardcoded text found (excluding admin).');
  process.exit(0);
}

console.log(`[i18n-scan] Found ${findings.length} file(s) containing CJK characters (excluding admin):`);
for (const f of findings) {
  console.log(`- ${f.filePath}:${f.line} ${f.preview}`);
}

if (shouldFail) {
  process.exit(1);
}
