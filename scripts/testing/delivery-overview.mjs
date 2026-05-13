import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const E2E_JSON = path.join(ROOT, 'docs/reports/testing/mobile-e2e-summary.json');
const UI_PARITY_JSON = path.join(ROOT, 'docs/reports/ui-parity/summary.json');
const OUTPUT_MD = path.join(ROOT, 'docs/reports/mobile-delivery-overview.md');

function toRelative(filePath) {
  return path.relative(ROOT, filePath).replaceAll(path.sep, '/');
}

async function readJsonOrNull(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function renderE2ESummary(e2e) {
  if (!e2e) {
    return [
      '## E2E Regression',
      '- status: missing report',
      `- expected file: ${toRelative(E2E_JSON)}`,
      '',
    ];
  }

  const domainRows = Object.entries(e2e.byDomain ?? {}).map(
    ([domain, count]) => `| ${domain} | ${count} |`
  );
  const fileRows = Object.entries(e2e.byFile ?? {}).map(
    ([file, count]) => `| ${file} | ${count} |`
  );

  return [
    '## E2E Regression',
    `- generatedAt: ${e2e.generatedAt ?? '-'}`,
    `- totalTests: ${e2e.total ?? 0}`,
    '',
    '### Domain Matrix',
    '| domain | tests |',
    '| --- | ---: |',
    ...(domainRows.length ? domainRows : ['| - | 0 |']),
    '',
    '### File Matrix',
    '| file | tests |',
    '| --- | ---: |',
    ...(fileRows.length ? fileRows : ['| - | 0 |']),
    '',
  ];
}

function renderUiParitySummary(uiParity) {
  if (!uiParity) {
    return [
      '## UI Parity',
      '- status: missing report',
      `- expected file: ${toRelative(UI_PARITY_JSON)}`,
      '',
    ];
  }

  const totals = uiParity.totals ?? { pages: 0, passed: 0, failed: 0 };
  const thresholds = uiParity.thresholds ?? {};
  const metrics = Array.isArray(uiParity.metrics) ? uiParity.metrics : [];
  const sampleRows = metrics.slice(0, 20).map(item => {
    const ratio = item.pixelDiffRatio == null ? '-' : `${(item.pixelDiffRatio * 100).toFixed(4)}%`;
    const de = item.avgDeltaE == null ? '-' : Number(item.avgDeltaE).toFixed(4);
    return `| ${item.page ?? '-'} | ${item.status ?? '-'} | ${ratio} | ${de} |`;
  });

  const status = totals.pages > 0
    ? (totals.failed === 0 ? 'ready' : 'needs-fix')
    : 'pending-capture';

  return [
    '## UI Parity',
    `- generatedAt: ${uiParity.generatedAt ?? '-'}`,
    `- status: ${status}`,
    `- totals: ${totals.passed ?? 0} passed / ${totals.failed ?? 0} failed / ${totals.pages ?? 0} pages`,
    `- thresholds: pixelDiffCount<=${thresholds.maxPixelDiffCount ?? '-'}, avgDeltaE<=${thresholds.maxAvgDeltaE ?? '-'}, channelTolerance=${thresholds.channelTolerance ?? '-'}`,
    '',
    '### Sample Metrics',
    '| page | status | pixelDiffRatio | avgDeltaE |',
    '| --- | --- | ---: | ---: |',
    ...(sampleRows.length ? sampleRows : ['| - | pending-capture | - | - |']),
    '',
  ];
}

function renderTopSummary(e2e, uiParity) {
  const totalTests = e2e?.total ?? 0;
  const uiPages = uiParity?.totals?.pages ?? 0;
  const uiFailed = uiParity?.totals?.failed ?? 0;
  const e2eReady = totalTests >= 80 ? 'pass' : 'needs-more';
  const uiReady = uiPages > 0 && uiFailed === 0 ? 'pass' : 'pending';

  return [
    '# Mobile Delivery Overview',
    '',
    `- generatedAt: ${new Date().toISOString()}`,
    `- e2eGate: ${e2eReady} (total=${totalTests}, required>=80)`,
    `- uiParityGate: ${uiReady} (pages=${uiPages}, failed=${uiFailed})`,
    `- source: ${toRelative(E2E_JSON)} + ${toRelative(UI_PARITY_JSON)}`,
    '',
  ];
}

async function main() {
  const [e2e, uiParity] = await Promise.all([readJsonOrNull(E2E_JSON), readJsonOrNull(UI_PARITY_JSON)]);
  const sections = [
    ...renderTopSummary(e2e, uiParity),
    ...renderE2ESummary(e2e),
    ...renderUiParitySummary(uiParity),
  ];

  await fs.mkdir(path.dirname(OUTPUT_MD), { recursive: true });
  await fs.writeFile(OUTPUT_MD, sections.join('\n'), 'utf8');
  console.info(`[delivery-overview] output=${toRelative(OUTPUT_MD)}`);
}

main().catch(error => {
  console.error(String(error?.message ?? error));
  process.exit(1);
});
