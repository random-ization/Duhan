#!/usr/bin/env node
/**
 * Upload Kiwi model files to Cloudflare R2.
 *
 * Usage:
 *   node scripts/uploadKiwiToR2.mjs
 *
 * Reads R2 credentials from SPACES_* env vars (same as the rest of the app).
 * Downloads model + WASM from upstream, then uploads to R2 under kiwi/ prefix.
 *
 * After running, set these Convex env vars:
 *   KIWI_MODEL_URL=<CDN_URL>/kiwi/kiwi_model_v0.22.1_base.tgz
 *   KIWI_WASM_URL=<CDN_URL>/kiwi/kiwi-wasm.wasm
 */

import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { createWriteStream } from 'fs';
import { readFile } from 'fs/promises';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { tmpdir } from 'os';
import { join } from 'path';
import 'dotenv/config';

const MODEL_URL =
  'https://github.com/bab2min/Kiwi/releases/download/v0.22.1/kiwi_model_v0.22.1_base.tgz';
const WASM_URL = 'https://unpkg.com/kiwi-nlp@0.22.1/dist/kiwi-wasm.wasm';

const R2_PREFIX = 'kiwi';

const FILES = [
  { url: MODEL_URL, key: `${R2_PREFIX}/kiwi_model_v0.22.1_base.tgz`, contentType: 'application/gzip' },
  { url: WASM_URL, key: `${R2_PREFIX}/kiwi-wasm.wasm`, contentType: 'application/wasm' },
];

function getR2Client() {
  const endpoint = process.env.SPACES_ENDPOINT;
  const accessKeyId = process.env.SPACES_KEY;
  const secretAccessKey = process.env.SPACES_SECRET;
  const region = process.env.SPACES_REGION || 'auto';

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    console.error('Missing SPACES_ENDPOINT, SPACES_KEY, or SPACES_SECRET env vars');
    process.exit(1);
  }

  return new S3Client({
    endpoint,
    region,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: false,
  });
}

async function objectExists(client, bucket, key) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function downloadToTmp(url, filename) {
  const tmpPath = join(tmpdir(), filename);
  console.log(`  Downloading ${url}...`);
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(tmpPath));
  const data = await readFile(tmpPath);
  console.log(`  Downloaded ${(data.length / 1024 / 1024).toFixed(1)} MB`);
  return data;
}

async function main() {
  const bucket = process.env.SPACES_BUCKET;
  const cdnUrl = process.env.SPACES_CDN_URL;

  if (!bucket) {
    console.error('Missing SPACES_BUCKET env var');
    process.exit(1);
  }

  const client = getR2Client();

  console.log(`\nUploading Kiwi files to R2 bucket: ${bucket}\n`);

  for (const file of FILES) {
    console.log(`[${file.key}]`);

    // Check if already uploaded
    const exists = await objectExists(client, bucket, file.key);
    if (exists) {
      console.log('  Already exists, skipping.\n');
      continue;
    }

    // Download
    const filename = file.key.split('/').pop();
    const data = await downloadToTmp(file.url, filename);

    // Upload
    console.log(`  Uploading to R2...`);
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: file.key,
        Body: data,
        ContentType: file.contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );
    console.log('  Uploaded.\n');
  }

  // Print env vars to set
  const base = cdnUrl ? cdnUrl.replace(/\/$/, '') : `https://${bucket}.r2.dev`;
  console.log('=== Set these Convex env vars ===\n');
  console.log(`npx convex env set KIWI_MODEL_URL "${base}/${R2_PREFIX}/kiwi_model_v0.22.1_base.tgz"`);
  console.log(`npx convex env set KIWI_WASM_URL "${base}/${R2_PREFIX}/kiwi-wasm.wasm"`);
  console.log();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
