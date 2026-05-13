import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { PNG } from 'pngjs';

const execFileAsync = promisify(execFile);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const OUTPUT_DIR = path.join(ROOT, 'docs/reports/ui-parity/app-android');
const APP_SCHEME = process.env.UI_PARITY_APP_SCHEME || '';
const packageName = process.env.UI_PARITY_ANDROID_PACKAGE || '';
const ANDROID_SERIAL = process.env.UI_PARITY_ANDROID_SERIAL || '';
const TARGET_WIDTH = Number(process.env.UI_PARITY_TARGET_WIDTH ?? 1080);
const TARGET_HEIGHT = Number(process.env.UI_PARITY_TARGET_HEIGHT ?? 2400);

const routes = process.env.UI_PARITY_ROUTES
  ? process.env.UI_PARITY_ROUTES.split(',').map((item) => item.trim()).filter(Boolean)
  : ['dashboard', 'courses', 'review', 'topik', 'media', 'profile', 'pricing'];

async function runAdb(args) {
  const finalArgs = ANDROID_SERIAL ? ['-s', ANDROID_SERIAL, ...args] : args;
  return await execFileAsync('adb', finalArgs, {
    maxBuffer: 10 * 1024 * 1024,
    encoding: 'buffer',
  });
}

async function ensureAdbAvailable() {
  try {
    await execFileAsync('adb', ['version'], {
      maxBuffer: 1024 * 1024,
      encoding: 'utf8',
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      throw new Error(
        '[ui-parity:app] adb not found. Install Android platform-tools and ensure `adb` is in PATH.'
      );
    }
    throw error;
  }
}

await fs.mkdir(OUTPUT_DIR, { recursive: true });
await ensureAdbAvailable();
const { stdout: deviceList } = await runAdb(['devices']);
if (!String(deviceList).includes('\tdevice')) {
  throw new Error('[ui-parity:app] no available Android device/emulator');
}

if (packageName) {
  await runAdb(['shell', 'monkey', '-p', packageName, '-c', 'android.intent.category.LAUNCHER', '1']);
}

for (const route of routes) {
  if (APP_SCHEME) {
    const uri = `${APP_SCHEME}://${route.replace(/^\//, '')}`;
    try {
      await runAdb(['shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW', '-d', uri]);
      await new Promise((resolve) => setTimeout(resolve, 1200));
    } catch {
      console.warn(`[ui-parity:app] deeplink failed: ${uri}`);
    }
  } else {
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }

  const name = route.replaceAll('/', '_').replace(/^_/, '') || 'home';
  const { stdout } = await runAdb(['exec-out', 'screencap', '-p']);
  const screenshot = PNG.sync.read(stdout);
  await fs.writeFile(path.join(OUTPUT_DIR, `${name}.png`), stdout);
  if (screenshot.width !== TARGET_WIDTH || screenshot.height !== TARGET_HEIGHT) {
    console.warn(
      `[ui-parity:app] ${name}.png resolution=${screenshot.width}x${screenshot.height}, expected=${TARGET_WIDTH}x${TARGET_HEIGHT}`
    );
  }
  console.info(`[ui-parity:app] captured ${name}.png`);
}

console.info(`[ui-parity:app] done, output=${OUTPUT_DIR}`);
