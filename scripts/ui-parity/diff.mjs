import fs from 'node:fs/promises';
import path from 'node:path';
import { PNG } from 'pngjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const WEB_DIR = path.join(ROOT, 'docs/reports/ui-parity/web');
const APP_DIR = path.join(ROOT, 'docs/reports/ui-parity/app-android');
const REPORT_DIR = path.join(ROOT, 'docs/reports/ui-parity');
const DIFF_IMG_DIR = path.join(REPORT_DIR, 'diff');
const REPORT_FILE = path.join(REPORT_DIR, 'summary.md');
const JSON_FILE = path.join(REPORT_DIR, 'summary.json');
const CHANNEL_TOLERANCE = Number(process.env.UI_PARITY_CHANNEL_TOLERANCE ?? 2);
const MAX_PIXEL_DIFF_COUNT = Number(process.env.UI_PARITY_MAX_PIXEL_DIFF_COUNT ?? 1);
const MAX_AVG_DELTA_E = Number(process.env.UI_PARITY_MAX_AVG_DELTA_E ?? 1);
const NORMALIZE_IMAGES = process.env.UI_PARITY_NORMALIZE !== '0';
const TARGET_WIDTH = Number(process.env.UI_PARITY_TARGET_WIDTH ?? 1080);
const TARGET_HEIGHT = Number(process.env.UI_PARITY_TARGET_HEIGHT ?? 2400);

async function safeRead(filePath) {
  try {
    return await fs.readFile(filePath);
  } catch {
    return null;
  }
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function srgbToLinear(channel) {
  const c = clamp01(channel / 255);
  if (c <= 0.04045) return c / 12.92;
  return ((c + 0.055) / 1.055) ** 2.4;
}

function rgbToLab(r, g, b) {
  const rl = srgbToLinear(r);
  const gl = srgbToLinear(g);
  const bl = srgbToLinear(b);
  const x = (rl * 0.4124 + gl * 0.3576 + bl * 0.1805) / 0.95047;
  const y = (rl * 0.2126 + gl * 0.7152 + bl * 0.0722) / 1.0;
  const z = (rl * 0.0193 + gl * 0.1192 + bl * 0.9505) / 1.08883;
  const fx = x > 0.008856 ? x ** (1 / 3) : (7.787 * x + 16 / 116);
  const fy = y > 0.008856 ? y ** (1 / 3) : (7.787 * y + 16 / 116);
  const fz = z > 0.008856 ? z ** (1 / 3) : (7.787 * z + 16 / 116);
  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

function deltaE76(rgb1, rgb2) {
  const lab1 = rgbToLab(rgb1[0], rgb1[1], rgb1[2]);
  const lab2 = rgbToLab(rgb2[0], rgb2[1], rgb2[2]);
  return Math.hypot(lab1.l - lab2.l, lab1.a - lab2.a, lab1.b - lab2.b);
}

function compositeOnWhite(r, g, b, a) {
  const alpha = clamp01(a / 255);
  const rw = Math.round(255 * (1 - alpha) + r * alpha);
  const gw = Math.round(255 * (1 - alpha) + g * alpha);
  const bw = Math.round(255 * (1 - alpha) + b * alpha);
  return [rw, gw, bw];
}

function resizePngNearest(source, width, height) {
  if (source.width === width && source.height === height) {
    return source;
  }

  const target = new PNG({ width, height });
  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(source.height - 1, Math.floor((y / height) * source.height));
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(source.width - 1, Math.floor((x / width) * source.width));
      const sourceIdx = (source.width * sourceY + sourceX) * 4;
      const targetIdx = (width * y + x) * 4;

      target.data[targetIdx] = source.data[sourceIdx];
      target.data[targetIdx + 1] = source.data[sourceIdx + 1];
      target.data[targetIdx + 2] = source.data[sourceIdx + 2];
      target.data[targetIdx + 3] = source.data[sourceIdx + 3];
    }
  }
  return target;
}

function comparePng(name, webBuffer, appBuffer) {
  const originalWeb = PNG.sync.read(webBuffer);
  const originalApp = PNG.sync.read(appBuffer);
  const originalResolution = `${originalWeb.width}x${originalWeb.height} vs ${originalApp.width}x${originalApp.height}`;

  if (!NORMALIZE_IMAGES && (originalWeb.width !== originalApp.width || originalWeb.height !== originalApp.height)) {
    return {
      page: name,
      status: 'resolution-mismatch',
      resolution: originalResolution,
      pixelDiffCount: null,
      pixelDiffRatio: null,
      avgDeltaE: null,
      maxDeltaE: null,
      pass: false,
      normalized: false,
    };
  }

  const web = NORMALIZE_IMAGES ? resizePngNearest(originalWeb, TARGET_WIDTH, TARGET_HEIGHT) : originalWeb;
  const app = NORMALIZE_IMAGES ? resizePngNearest(originalApp, TARGET_WIDTH, TARGET_HEIGHT) : originalApp;
  const normalized =
    NORMALIZE_IMAGES && (originalWeb.width !== web.width || originalWeb.height !== web.height || originalApp.width !== app.width || originalApp.height !== app.height);

  const totalPixels = web.width * web.height;
  const diffPng = new PNG({ width: web.width, height: web.height });
  let diffPixels = 0;
  let sumDeltaE = 0;
  let maxDeltaE = 0;

  for (let y = 0; y < web.height; y += 1) {
    for (let x = 0; x < web.width; x += 1) {
      const idx = (web.width * y + x) * 4;
      const wr = web.data[idx];
      const wg = web.data[idx + 1];
      const wb = web.data[idx + 2];
      const wa = web.data[idx + 3];
      const ar = app.data[idx];
      const ag = app.data[idx + 1];
      const ab = app.data[idx + 2];
      const aa = app.data[idx + 3];

      const dr = Math.abs(wr - ar);
      const dg = Math.abs(wg - ag);
      const db = Math.abs(wb - ab);
      const da = Math.abs(wa - aa);
      const changed = dr > CHANNEL_TOLERANCE || dg > CHANNEL_TOLERANCE || db > CHANNEL_TOLERANCE || da > CHANNEL_TOLERANCE;

      const deltaE = deltaE76(
        compositeOnWhite(wr, wg, wb, wa),
        compositeOnWhite(ar, ag, ab, aa)
      );
      sumDeltaE += deltaE;
      if (deltaE > maxDeltaE) {
        maxDeltaE = deltaE;
      }

      if (changed) {
        diffPixels += 1;
        diffPng.data[idx] = 255;
        diffPng.data[idx + 1] = 0;
        diffPng.data[idx + 2] = 0;
        diffPng.data[idx + 3] = 255;
      } else {
        diffPng.data[idx] = wr;
        diffPng.data[idx + 1] = wg;
        diffPng.data[idx + 2] = wb;
        diffPng.data[idx + 3] = 70;
      }
    }
  }

  const avgDeltaE = sumDeltaE / totalPixels;
  const pixelDiffRatio = diffPixels / totalPixels;
  const pass = diffPixels <= MAX_PIXEL_DIFF_COUNT && avgDeltaE <= MAX_AVG_DELTA_E;

  return {
    page: name,
    status: pass ? 'pass' : 'fail',
    resolution: normalized ? `${originalResolution} -> ${web.width}x${web.height}` : `${web.width}x${web.height}`,
    pixelDiffCount: diffPixels,
    pixelDiffRatio,
    avgDeltaE,
    maxDeltaE,
    pass,
    normalized,
    diffImageBuffer: PNG.sync.write(diffPng),
  };
}

await fs.mkdir(REPORT_DIR, { recursive: true });
await fs.mkdir(DIFF_IMG_DIR, { recursive: true });
const webFiles = await fs.readdir(WEB_DIR).catch(() => []);
const appFiles = await fs.readdir(APP_DIR).catch(() => []);
const allNames = [...new Set([...webFiles, ...appFiles])].filter((name) => name.endsWith('.png')).sort();

const metrics = [];
for (const name of allNames) {
  const web = await safeRead(path.join(WEB_DIR, name));
  const app = await safeRead(path.join(APP_DIR, name));

  if (!web || !app) {
    metrics.push({
      page: name,
      status: 'missing',
      resolution: '-',
      pixelDiffCount: null,
      pixelDiffRatio: null,
      avgDeltaE: null,
      maxDeltaE: null,
      pass: false,
    });
    continue;
  }

  const result = comparePng(name, web, app);
  metrics.push(result);
  if (result.diffImageBuffer) {
    await fs.writeFile(path.join(DIFF_IMG_DIR, name), result.diffImageBuffer);
  }
}

const passed = metrics.filter((item) => item.pass).length;
const failed = metrics.length - passed;
const rows = metrics.map((item) => {
  const pixelRatio = item.pixelDiffRatio == null ? '-' : `${(item.pixelDiffRatio * 100).toFixed(4)}%`;
  const avgDeltaE = item.avgDeltaE == null ? '-' : item.avgDeltaE.toFixed(4);
  const maxDeltaE = item.maxDeltaE == null ? '-' : item.maxDeltaE.toFixed(4);
  const pixelDiffCount = item.pixelDiffCount == null ? '-' : String(item.pixelDiffCount);
  return `| ${item.page} | ${item.status} | ${item.resolution} | ${pixelDiffCount} | ${pixelRatio} | ${avgDeltaE} | ${maxDeltaE} |`;
});

await fs.writeFile(
  JSON_FILE,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      thresholds: {
        channelTolerance: CHANNEL_TOLERANCE,
        maxPixelDiffCount: MAX_PIXEL_DIFF_COUNT,
        maxAvgDeltaE: MAX_AVG_DELTA_E,
      },
      normalization: {
        enabled: NORMALIZE_IMAGES,
        targetResolution: `${TARGET_WIDTH}x${TARGET_HEIGHT}`,
      },
      totals: {
        pages: metrics.length,
        passed,
        failed,
      },
      metrics,
    },
    null,
    2
  ),
  'utf8'
);

const markdown = [
  '# UI Parity Summary',
  '',
  `- generatedAt: ${new Date().toISOString()}`,
  `- webDir: ${path.relative(ROOT, WEB_DIR)}`,
  `- appDir: ${path.relative(ROOT, APP_DIR)}`,
  `- diffDir: ${path.relative(ROOT, DIFF_IMG_DIR)}`,
  `- thresholds: pixelDiffCount<=${MAX_PIXEL_DIFF_COUNT}, avgDeltaE<=${MAX_AVG_DELTA_E}, channelTolerance=${CHANNEL_TOLERANCE}`,
  `- normalization: ${NORMALIZE_IMAGES ? `enabled (${TARGET_WIDTH}x${TARGET_HEIGHT})` : 'disabled'}`,
  `- totals: ${passed} passed / ${failed} failed / ${metrics.length} pages`,
  '',
  '| page | status | resolution | pixelDiffCount | pixelDiffRatio | avgDeltaE | maxDeltaE |',
  '| --- | --- | --- | --- | --- | --- | --- |',
  ...(rows.length ? rows : ['| - | missing | - | - | - | - | - |']),
  '',
  '> Note: 红色标记差异图输出在 docs/reports/ui-parity/diff，可用于逐页走查定位。',
  '',
].join('\n');

await fs.writeFile(REPORT_FILE, markdown, 'utf8');
console.info(`[ui-parity:diff] report=${REPORT_FILE}`);
console.info(`[ui-parity:diff] json=${JSON_FILE}`);
