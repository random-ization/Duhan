import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const VITEST_REPORT = path.join(ROOT, 'docs/reports/testing/vitest-report.json');
const UI_PARITY_REPORT = path.join(ROOT, 'docs/reports/ui-parity/summary.json');

const MIN_TOTAL_TESTS = Number(process.env.MIN_REGRESSION_TESTS ?? 80);
const REQUIRE_PASS_RATE = Number(process.env.REGRESSION_PASS_RATE ?? 100);
const REQUIRE_UI_PARITY = process.env.REQUIRE_UI_PARITY === '1';

async function readJson(filePath) {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
}

function readVitestCounters(payload) {
  const total =
    payload.numTotalTests ??
    payload.totalTests ??
    payload.stats?.tests ??
    payload.testResults?.reduce((sum, suite) => {
      const list = suite.assertionResults ?? [];
      return sum + list.length;
    }, 0) ??
    0;

  const passed =
    payload.numPassedTests ??
    payload.passedTests ??
    payload.stats?.passed ??
    payload.testResults?.reduce((sum, suite) => {
      const list = suite.assertionResults ?? [];
      return sum + list.filter((item) => item.status === 'passed').length;
    }, 0) ??
    0;

  const failed =
    payload.numFailedTests ??
    payload.failedTests ??
    payload.stats?.failed ??
    payload.testResults?.reduce((sum, suite) => {
      const list = suite.assertionResults ?? [];
      return sum + list.filter((item) => item.status === 'failed').length;
    }, 0) ??
    0;

  const pending =
    payload.numPendingTests ??
    payload.pendingTests ??
    payload.stats?.pending ??
    payload.testResults?.reduce((sum, suite) => {
      const list = suite.assertionResults ?? [];
      return sum + list.filter((item) => item.status === 'pending' || item.status === 'skipped').length;
    }, 0) ??
    0;

  const todo =
    payload.numTodoTests ??
    payload.todoTests ??
    payload.stats?.todo ??
    payload.testResults?.reduce((sum, suite) => {
      const list = suite.assertionResults ?? [];
      return sum + list.filter((item) => item.status === 'todo').length;
    }, 0) ??
    0;

  return { total, passed, failed, pending, todo };
}

async function ensureUiParityIfRequired() {
  if (!REQUIRE_UI_PARITY) {
    return;
  }

  const payload = await readJson(UI_PARITY_REPORT);
  const pages = Number(payload?.totals?.pages ?? 0);
  const failed = Number(payload?.totals?.failed ?? pages);

  if (pages <= 0) {
    throw new Error('[regression-gate] REQUIRE_UI_PARITY=1 but no UI parity pages found');
  }
  if (failed > 0) {
    throw new Error(`[regression-gate] UI parity failed pages=${failed}/${pages}`);
  }
}

async function main() {
  const vitestPayload = await readJson(VITEST_REPORT);
  const counters = readVitestCounters(vitestPayload);
  const executableTotal = Math.max(counters.total - counters.pending - counters.todo, 0);
  const passRate = executableTotal > 0 ? (counters.passed / executableTotal) * 100 : 0;

  const checks = [
    {
      ok: counters.total >= MIN_TOTAL_TESTS,
      message: `totalTests=${counters.total}, required>=${MIN_TOTAL_TESTS}`,
    },
    {
      ok: passRate >= REQUIRE_PASS_RATE && counters.failed === 0,
      message: `passRate=${passRate.toFixed(2)}%, failed=${counters.failed}, executable=${executableTotal}, skipped=${counters.pending}, required>=${REQUIRE_PASS_RATE}%`,
    },
  ];

  for (const check of checks) {
    if (!check.ok) {
      throw new Error(`[regression-gate] ${check.message}`);
    }
  }

  await ensureUiParityIfRequired();

  console.info(
    `[regression-gate] pass total=${counters.total} executable=${executableTotal} passed=${counters.passed} failed=${counters.failed} skipped=${counters.pending} passRate=${passRate.toFixed(2)}%`
  );
}

main().catch((error) => {
  console.error(String(error?.message ?? error));
  process.exit(1);
});
