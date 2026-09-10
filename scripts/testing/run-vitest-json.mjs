import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const reportDir = path.join(root, 'docs', 'reports', 'testing');
await fs.mkdir(reportDir, { recursive: true });

const vitestCli = path.join(root, 'node_modules', 'vitest', 'vitest.mjs');
const child = spawn(
  process.execPath,
  [vitestCli, 'run', '--reporter=json', '--outputFile=docs/reports/testing/vitest-report.json'],
  { cwd: root, stdio: 'inherit' }
);

child.once('error', error => {
  console.error(error);
  process.exitCode = 1;
});
child.once('exit', code => {
  process.exitCode = code ?? 1;
});
