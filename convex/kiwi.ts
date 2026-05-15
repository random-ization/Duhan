'use node';
import { action, internalAction } from './_generated/server';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { v } from 'convex/values';
import { makeFunctionReference } from 'convex/server';
import type { FunctionReference } from 'convex/server';
import { KiwiBuilder } from 'kiwi-nlp';
import type { Kiwi, TokenInfo } from 'kiwi-nlp';
import { createLogger } from './logger';

const log = createLogger('KIWI');

type KiwiModelFiles = Record<string, Uint8Array>;
type PersistedSentenceToken = {
  surface: string;
  lemma?: string;
  partOfSpeech?: string;
  start?: number;
  end?: number;
  length?: number;
  wordPosition?: number;
  sentencePosition?: number;
};

const require = createRequire(import.meta.url);

const DEFAULT_MODEL_URLS = [
  'https://github.com/bab2min/Kiwi/releases/download/v0.22.1/kiwi_model_v0.22.1_base.tgz',
  'https://github.com/bab2min/Kiwi/releases/download/v0.22.2/kiwi_model_v0.22.2_base.tgz',
];

const MODEL_VERSION = 'kiwi-cong-0.22.x';
const MODEL_FETCH_TIMEOUT_MS = 20_000;
const MODEL_URL_ENV_KEYS = ['KIWI_MODEL_URL', 'KIWI_MODEL_URLS'];

const getCachedTokenizationQuery = makeFunctionReference<
  'query',
  { textHash: string; modelVersion?: string },
  {
    tokens: PersistedSentenceToken[];
  } | null
>('kiwiCache:getCachedTokenization') as unknown as FunctionReference<
  'query',
  'internal',
  { textHash: string; modelVersion?: string },
  {
    tokens: PersistedSentenceToken[];
  } | null
>;

const upsertTokenizationCacheMutation = makeFunctionReference<
  'mutation',
  {
    textHash: string;
    text: string;
    normalizedText?: string;
    modelVersion: string;
    tokens: PersistedSentenceToken[];
  },
  string
>('kiwiCache:upsertTokenizationCache') as unknown as FunctionReference<
  'mutation',
  'internal',
  {
    textHash: string;
    text: string;
    normalizedText?: string;
    modelVersion: string;
    tokens: PersistedSentenceToken[];
  },
  string
>;

let kiwiPromise: Promise<Kiwi> | null = null;
let modelFilesPromise: Promise<KiwiModelFiles> | null = null;
let modelWarmupStarted = false;

type CachedTokenize = {
  text: string;
  tokens: TokenInfo[];
};

const tokenizeCache = new Map<string, CachedTokenize>();
const TOKENIZE_CACHE_LIMIT = 64;

function normalizeText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function hashText(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function resolveModelUrls(): string[] {
  const rawValues = MODEL_URL_ENV_KEYS.map(key => process.env[key] || '').filter(Boolean);
  const configured = rawValues
    .flatMap(value => value.split(/[,\n]/))
    .map(value => value.trim())
    .filter(Boolean);
  return configured.length > 0 ? configured : DEFAULT_MODEL_URLS;
}

function persistablePartOfSpeech(tag?: string): string | undefined {
  if (!tag) return undefined;
  return tag;
}

function toPersistedTokens(tokens: TokenInfo[]): PersistedSentenceToken[] {
  return tokens.map((token, index) => ({
    surface: token.str,
    lemma: undefined,
    partOfSpeech: persistablePartOfSpeech(token.tag),
    start: typeof token.position === 'number' ? token.position : undefined,
    end:
      typeof token.position === 'number' && typeof token.length === 'number'
        ? token.position + token.length
        : undefined,
    length: typeof token.length === 'number' ? token.length : undefined,
    wordPosition:
      typeof (token as TokenInfo & { wordPosition?: number }).wordPosition === 'number'
        ? (token as TokenInfo & { wordPosition?: number }).wordPosition
        : index,
    sentencePosition:
      typeof (token as TokenInfo & { sentPosition?: number }).sentPosition === 'number'
        ? (token as TokenInfo & { sentPosition?: number }).sentPosition
        : 0,
  }));
}

function fromPersistedTokens(tokens: PersistedSentenceToken[]): TokenInfo[] {
  return tokens.map(token => ({
    str: token.surface,
    tag: token.partOfSpeech || '',
    position: token.start ?? 0,
    length:
      token.length ??
      (typeof token.start === 'number' && typeof token.end === 'number'
        ? Math.max(0, token.end - token.start)
        : token.surface.length),
    sentPosition: token.sentencePosition ?? 0,
    wordPosition: token.wordPosition ?? 0,
    score: 0,
    typoCost: 0,
    typoFormId: 0,
    pairedToken: -1,
    subSentPosition: 0,
    senseId: 0,
  })) as unknown as TokenInfo[];
}

function touchMemoryCache(text: string, tokens: TokenInfo[]) {
  tokenizeCache.set(text, { text, tokens });
  if (tokenizeCache.size > TOKENIZE_CACHE_LIMIT) {
    const firstKey = tokenizeCache.keys().next().value;
    if (firstKey) tokenizeCache.delete(firstKey);
  }
}

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
    return Number.parseInt(raw, 8);
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
  log.info(`Extracted model files: ${Object.keys(files).join(', ')}`);
  return files;
}

async function fetchFirstOk(urls: string[]): Promise<ArrayBuffer> {
  let lastError: unknown = null;
  for (const url of urls) {
    try {
      log.info(`Downloading model from: ${url}`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), MODEL_FETCH_TIMEOUT_MS);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
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
  log.info('Starting model download...');
  const tarGz = await fetchFirstOk(resolveModelUrls());
  log.info(`Model downloaded, size: ${tarGz.byteLength} bytes`);
  return parseTarGz(tarGz);
}

async function getWasmPath(): Promise<string> {
  // Use a predictable path in /tmp for Lambda environments
  const wasmTmpPath = path.join('/tmp', 'kiwi-wasm-0.22.1.wasm');

  // If it already exists in /tmp, we can reuse it
  if (fs.existsSync(wasmTmpPath)) return wasmTmpPath;

  // Try to find it in node_modules locally (works in local dev server or if node_modules is preserved)
  try {
    const localWasm = require.resolve('kiwi-nlp/dist/kiwi-wasm.wasm');
    if (fs.existsSync(localWasm)) {
      log.info(`Using local Kiwi WASM: ${localWasm}`);
      return localWasm;
    }
  } catch (e) {
    // require.resolve might fail in bundled environments, which is expected
  }

  // Fallback: download from CDN if not found locally
  log.info('Downloading Kiwi WASM from CDN...');
  const wasmUrl = 'https://unpkg.com/kiwi-nlp@0.22.1/dist/kiwi-wasm.wasm';
  const response = await fetch(wasmUrl);
  if (!response.ok) throw new Error(`Failed to download Kiwi WASM from ${wasmUrl}: ${response.statusText}`);

  const buffer = await response.arrayBuffer();
  fs.writeFileSync(wasmTmpPath, Buffer.from(buffer));
  log.info(`Kiwi WASM saved to ${wasmTmpPath}`);

  return wasmTmpPath;
}

export async function getKiwi(): Promise<Kiwi> {
  kiwiPromise ??= (async () => {
    const wasmPath = await getWasmPath();
    const builder = await KiwiBuilder.create(wasmPath);
    modelFilesPromise ??= loadModelFiles();
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
  return kiwiPromise;
}

export function warmKiwiModel() {
  if (modelWarmupStarted) return;
  modelWarmupStarted = true;
  void getKiwi().catch(error => {
    modelWarmupStarted = false;
    log.warn('Kiwi model warmup failed', error);
  });
}

export async function tokenizeWithCache(text: string): Promise<TokenInfo[]> {
  const cached = tokenizeCache.get(text);
  if (cached) return cached.tokens;

  const kiwi = await getKiwi();
  const tokens = kiwi.tokenize(text);
  touchMemoryCache(text, tokens);
  return tokens;
}

export const warmModel = action({
  args: {},
  handler: async () => {
    warmKiwiModel();
    return { success: true, modelVersion: MODEL_VERSION };
  },
});

export const tokenizePersisted = internalAction({
  args: {
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const text = args.text.trim();
    const normalizedText = normalizeText(text);
    const textHash = hashText(normalizedText);
    const cached = await ctx.runQuery(getCachedTokenizationQuery, {
      textHash,
      modelVersion: MODEL_VERSION,
    });
    if (cached?.tokens?.length) {
      const hydrated = fromPersistedTokens(cached.tokens as PersistedSentenceToken[]);
      touchMemoryCache(text, hydrated);
      if (normalizedText !== text) touchMemoryCache(normalizedText, hydrated);
      return {
        text,
        normalizedText,
        textHash,
        modelVersion: MODEL_VERSION,
        tokens: cached.tokens,
        cacheHit: true,
      };
    }

    warmKiwiModel();
    const tokens = await tokenizeWithCache(text);
    const persistedTokens = toPersistedTokens(tokens);
    await ctx.runMutation(upsertTokenizationCacheMutation, {
      textHash,
      text,
      normalizedText,
      modelVersion: MODEL_VERSION,
      tokens: persistedTokens,
    });
    return {
      text,
      normalizedText,
      textHash,
      modelVersion: MODEL_VERSION,
      tokens: persistedTokens,
      cacheHit: false,
    };
  },
});
