'use node';
import { createRequire } from 'module';
import { gunzipSync } from 'node:zlib';
import { KiwiBuilder } from 'kiwi-nlp';
import type { Kiwi, TokenInfo } from 'kiwi-nlp';

type KiwiModelFiles = Record<string, Uint8Array>;

const require = createRequire(import.meta.url);

const DEFAULT_MODEL_URLS = [
  'https://github.com/bab2min/Kiwi/releases/download/v0.22.2/kiwi_model_v0.22.2_cong_base.tgz',
  'https://github.com/bab2min/Kiwi/releases/download/v0.22.1/kiwi_model_v0.22.1_cong_base.tgz',
  'https://github.com/bab2min/Kiwi/releases/download/v0.21.0/kiwi_model_v0.21.0_cong_base.tgz',
];

let kiwiPromise: Promise<Kiwi> | null = null;
let modelFilesPromise: Promise<KiwiModelFiles> | null = null;

type CachedTokenize = {
  text: string;
  tokens: TokenInfo[];
};

const tokenizeCache = new Map<string, CachedTokenize>();
const TOKENIZE_CACHE_LIMIT = 64;

function normalizeTarName(name: string): string {
  return name.replace(/^\.?\//, '');
}

function parseTarGz(buffer: ArrayBuffer): KiwiModelFiles {
  const inflated = gunzipSync(Buffer.from(buffer));
  const data = new Uint8Array(inflated);
  const files: KiwiModelFiles = {};

  const readString = (offset: number, length: number) => {
    const slice = data.subarray(offset, offset + length);
    let end = 0;
    while (end < slice.length && slice[end] !== 0) end += 1;
    return Buffer.from(slice.subarray(0, end)).toString('utf8');
  };

  const readOctal = (offset: number, length: number) => {
    const raw = readString(offset, length).trim();
    if (!raw) return 0;
    return parseInt(raw, 8);
  };

  let offset = 0;
  while (offset + 512 <= data.length) {
    const name = readString(offset, 100);
    if (!name) break;
    const prefix = readString(offset + 345, 155);
    const typeflag = data[offset + 156];
    const size = readOctal(offset + 124, 12);

    const fullName = normalizeTarName(prefix ? `${prefix}/${name}` : name);
    offset += 512;

    const content = data.subarray(offset, offset + size);
    offset += Math.ceil(size / 512) * 512;

    const isDir = typeflag === 53;
    if (isDir) continue;

    if (!fullName) continue; // Skip empty names


    const baseName = fullName.split('/').pop();
    if (!baseName) continue;
    files[baseName] = new Uint8Array(content);
  }

  return files;
}

async function fetchFirstOk(urls: string[]): Promise<ArrayBuffer> {
  let lastError: unknown = null;
  for (const url of urls) {
    try {
      console.log(`[Kiwi] Downloading model from: ${url}`);
      const res = await fetch(url);
      if (!res.ok) {
        lastError = new Error(`Failed to fetch model: ${res.status} ${url}`);
        continue;
      }
      return await res.arrayBuffer();
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Failed to fetch model');
}

async function loadModelFiles(): Promise<KiwiModelFiles> {
  console.log('[Kiwi] Starting model download...');
  const tarGz = await fetchFirstOk(DEFAULT_MODEL_URLS);
  console.log(`[Kiwi] Model downloaded, size: ${tarGz.byteLength} bytes`);
  return parseTarGz(tarGz);
}

export async function getKiwi(): Promise<Kiwi> {
  if (!kiwiPromise) {
    kiwiPromise = (async () => {
      const wasmPath = require.resolve('kiwi-nlp/dist/kiwi-wasm.wasm');
      const builder = await KiwiBuilder.create(wasmPath);
      if (!modelFilesPromise) modelFilesPromise = loadModelFiles();
      const modelFiles = await modelFilesPromise;
      return await builder.build({
        modelFiles,
        modelType: 'cong',
        integrateAllomorph: true,
        loadDefaultDict: true,
        loadMultiDict: true,
        loadTypoDict: true,
        typos: 'none',
      });
    })();
  }
  return kiwiPromise;
}

export async function tokenizeWithCache(text: string): Promise<TokenInfo[]> {
  const cached = tokenizeCache.get(text);
  if (cached) return cached.tokens;

  const kiwi = await getKiwi();
  const tokens = kiwi.tokenize(text);
  tokenizeCache.set(text, { text, tokens });
  if (tokenizeCache.size > TOKENIZE_CACHE_LIMIT) {
    const firstKey = tokenizeCache.keys().next().value;
    if (firstKey) tokenizeCache.delete(firstKey);
  }
  return tokens;
}

