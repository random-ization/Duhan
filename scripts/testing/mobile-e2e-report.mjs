import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const OUTPUT_MD = path.join(ROOT, 'docs/reports/automation-regression.md');
const OUTPUT_JSON = path.join(ROOT, 'docs/reports/testing/mobile-e2e-summary.json');

function parseArgs(argv) {
  const requireMin = argv
    .map(arg => arg.trim())
    .find(arg => arg.startsWith('--require-min='));
  if (!requireMin) {
    return { requireMin: 0 };
  }
  const value = Number(requireMin.split('=').at(1) ?? 0);
  return { requireMin: Number.isFinite(value) ? value : 0 };
}

function classifyDomain(line) {
  const l = line.toLowerCase();
  if (/auth|login|register|forgot|checkout|pricing cta/.test(l)) return 'Auth';
  if (/dashboard|courses|course|grammar|vocab/.test(l)) return 'TodayPath';
  if (/review|typing|topik|notebook|vocab-book/.test(l)) return 'Drill';
  if (/media|podcast|video|reading/.test(l)) return 'Media';
  if (/profile|pricing|achievements|community/.test(l)) return 'Me';
  return 'Misc';
}

function toRelative(filePath) {
  return path.relative(ROOT, filePath).replaceAll(path.sep, '/');
}

async function listMobileTests() {
  const { stdout } = await execFileAsync(
    'npx',
    ['playwright', 'test', '--project', 'Mobile Chrome', '--list'],
    { cwd: ROOT, maxBuffer: 1024 * 1024 * 20 }
  );

  const lines = stdout
    .split('\n')
    .map(line => line.trimEnd())
    .filter(line => line.includes('›') && /\.spec\.(t|j)sx?:\d+:\d+/.test(line));

  const tests = lines.map(line => {
    const normalized = line.trim();
    const testPathMatch = normalized.match(/›\s+([^:]+):\d+:\d+\s+›\s+(.*)$/);
    const fileName = testPathMatch?.[1] ?? 'unknown.spec.ts';
    const file = fileName.startsWith('tests/e2e/')
      ? fileName
      : `tests/e2e/${fileName}`;
    const name = testPathMatch?.[2] ?? normalized;
    return {
      raw: normalized,
      file,
      name,
      domain: classifyDomain(normalized),
    };
  });

  return tests;
}

function buildSummary(tests) {
  const byDomain = new Map();
  const byFile = new Map();

  for (const testCase of tests) {
    byDomain.set(testCase.domain, (byDomain.get(testCase.domain) ?? 0) + 1);
    byFile.set(testCase.file, (byFile.get(testCase.file) ?? 0) + 1);
  }

  return {
    total: tests.length,
    byDomain: Object.fromEntries([...byDomain.entries()].sort((a, b) => b[1] - a[1])),
    byFile: Object.fromEntries([...byFile.entries()].sort((a, b) => b[1] - a[1])),
  };
}

function toMarkdown(summary, tests) {
  const domainRows = Object.entries(summary.byDomain).map(
    ([domain, count]) => `| ${domain} | ${count} |`
  );
  const fileRows = Object.entries(summary.byFile).map(
    ([file, count]) => `| ${file} | ${count} |`
  );
  const testRows = tests.map(testCase => `| ${testCase.domain} | ${testCase.file} | ${testCase.name} |`);

  return [
    '# Mobile E2E Automation Report',
    '',
    `- generatedAt: ${new Date().toISOString()}`,
    '- project: Mobile Chrome',
    `- totalTests: ${summary.total}`,
    '',
    '## Domain Coverage',
    '| domain | count |',
    '| --- | ---: |',
    ...(domainRows.length ? domainRows : ['| - | 0 |']),
    '',
    '## File Coverage',
    '| file | count |',
    '| --- | ---: |',
    ...(fileRows.length ? fileRows : ['| - | 0 |']),
    '',
    '## Test Cases',
    '| domain | file | name |',
    '| --- | --- | --- |',
    ...(testRows.length ? testRows : ['| - | - | - |']),
    '',
  ].join('\n');
}

async function main() {
  const { requireMin } = parseArgs(process.argv.slice(2));
  const tests = await listMobileTests();
  const summary = buildSummary(tests);

  await fs.mkdir(path.dirname(OUTPUT_MD), { recursive: true });
  await fs.mkdir(path.dirname(OUTPUT_JSON), { recursive: true });
  await fs.writeFile(OUTPUT_MD, toMarkdown(summary, tests), 'utf8');
  await fs.writeFile(
    OUTPUT_JSON,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        total: summary.total,
        byDomain: summary.byDomain,
        byFile: summary.byFile,
        tests,
      },
      null,
      2
    ),
    'utf8'
  );

  if (requireMin > 0 && summary.total < requireMin) {
    throw new Error(`[mobile-e2e-report] totalTests=${summary.total}, requireMin=${requireMin}`);
  }

  console.info(`[mobile-e2e-report] total=${summary.total}`);
  console.info(`[mobile-e2e-report] markdown=${toRelative(OUTPUT_MD)}`);
  console.info(`[mobile-e2e-report] json=${toRelative(OUTPUT_JSON)}`);
}

main().catch(error => {
  console.error(String(error?.message ?? error));
  process.exit(1);
});
