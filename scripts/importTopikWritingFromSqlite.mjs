#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { execFileSync, spawnSync } from 'node:child_process';

import dotenv from 'dotenv';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

dotenv.config({ path: '.env.local' });

const DEFAULT_SQLITE_PATH =
  '/Users/ryan/Library/Application Support/TRAE SOLO/ModularData/ai-agent/work-mode-projects/6a044ddc90f94fe11f2ea6e6/topik2_writing.sqlite';
const DEFAULT_ASSETS_DIR =
  '/Users/ryan/Library/Application Support/TRAE SOLO/ModularData/ai-agent/work-mode-projects/6a044ddc90f94fe11f2ea6e6/topik2_writing_assets';
const DEFAULT_CROPPED_ASSETS_DIR =
  '/Users/ryan/Library/Application Support/TRAE SOLO/ModularData/ai-agent/work-mode-projects/6a044ddc90f94fe11f2ea6e6/topik2_writing_assets_cropped';
const DEFAULT_TIME_LIMIT_MINUTES = 50;
const VALID_ACCESS_LEVELS = new Set(['PRO', 'FREE_SAMPLE']);
const QUESTION_SCORES = new Map([
  [51, 10],
  [52, 10],
  [53, 30],
  [54, 50],
]);

const QUESTION_TEMPLATES = new Map([
  [
    51,
    {
      questionType: 'FILL_BLANK',
      instruction: '다음을 보고 ㉠과 ㉡에 들어갈 내용을 쓰십시오.',
    },
  ],
  [
    52,
    {
      questionType: 'FILL_BLANK',
      instruction: '다음을 읽고 ㉠과 ㉡에 들어갈 말을 쓰십시오.',
    },
  ],
  [
    53,
    {
      questionType: 'GRAPH_ESSAY',
      instruction: '다음 자료를 바탕으로 200~300자로 글을 쓰십시오.',
    },
  ],
  [
    54,
    {
      questionType: 'OPINION_ESSAY',
      instruction: '다음 주제에 대해 자신의 생각을 600~700자로 쓰십시오.',
    },
  ],
]);

const VISION_OCR_SWIFT_SOURCE = `
import Foundation
import Vision
import AppKit

let path = CommandLine.arguments[1]
let url = URL(fileURLWithPath: path)
guard let image = NSImage(contentsOf: url) else {
  fputs("Unable to load image at \\(path)\\n", stderr)
  exit(1)
}
var rect = NSRect(origin: .zero, size: image.size)
guard let cgImage = image.cgImage(forProposedRect: &rect, context: nil, hints: nil) else {
  fputs("Unable to create CGImage for \\(path)\\n", stderr)
  exit(1)
}

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = true
request.recognitionLanguages = ["ko-KR", "en-US"]

let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
try handler.perform([request])

for observation in request.results ?? [] {
  if let candidate = observation.topCandidates(1).first {
    print(candidate.string)
  }
}
`;

let cachedVisionOcrScriptPath = '';

function printUsage() {
  console.log(`TOPIK writing sqlite importer

Usage:
  node scripts/importTopikWritingFromSqlite.mjs [options]

Options:
  --sqlite <path>          Path to sqlite file
  --assets <dir>           Path to topik2_writing_assets directory
  --cropped-assets <dir>   Path to topik2_writing_assets_cropped directory
  --exam-nos <list>        Comma-separated exam numbers to import, e.g. 60,64,83
  --access-level <level>   PRO or FREE_SAMPLE (default: PRO)
  --deployment <target>    Convex deployment passed to \`npx convex run\` (e.g. dev, prod, local)
  --prod                   Shortcut for --deployment prod
  --dry-run                Parse and upload-check only; do not write to Convex
  --purge-existing         Delete matching existing writing exams before import
  --inline-images          Store image files as data URLs instead of uploading to Spaces
  --replace-prefix <text>  Legacy id prefix (default: writing-exam-)
`);
}

function parseArgs(argv) {
  const args = {
    sqlitePath: DEFAULT_SQLITE_PATH,
    assetsDir: DEFAULT_ASSETS_DIR,
    croppedAssetsDir: DEFAULT_CROPPED_ASSETS_DIR,
    accessLevel: 'PRO',
    deployment: null,
    dryRun: false,
    purgeExisting: false,
    inlineImages: false,
    replacePrefix: 'writing-exam-',
    examNos: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
    if (arg === '--dry-run') {
      args.dryRun = true;
      continue;
    }
    if (arg === '--purge-existing') {
      args.purgeExisting = true;
      continue;
    }
    if (arg === '--inline-images') {
      args.inlineImages = true;
      continue;
    }
    if (arg === '--prod') {
      args.deployment = 'prod';
      continue;
    }
    if (arg === '--sqlite') {
      args.sqlitePath = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (arg === '--assets') {
      args.assetsDir = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (arg === '--cropped-assets') {
      args.croppedAssetsDir = argv[index + 1] || '';
      index += 1;
      continue;
    }
    if (arg === '--access-level') {
      args.accessLevel = (argv[index + 1] || '').trim().toUpperCase();
      index += 1;
      continue;
    }
    if (arg === '--deployment') {
      args.deployment = (argv[index + 1] || '').trim() || null;
      index += 1;
      continue;
    }
    if (arg === '--replace-prefix') {
      args.replacePrefix = (argv[index + 1] || '').trim() || 'writing-exam-';
      index += 1;
      continue;
    }
    if (arg === '--exam-nos') {
      const raw = argv[index + 1] || '';
      args.examNos = raw
        .split(',')
        .map(item => Number.parseInt(item.trim(), 10))
        .filter(value => Number.isFinite(value));
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!VALID_ACCESS_LEVELS.has(args.accessLevel)) {
    throw new Error(`Invalid access level: ${args.accessLevel}`);
  }

  return args;
}

function ensureExists(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} not found: ${filePath}`);
  }
}

function getVisionOcrScriptPath() {
  if (cachedVisionOcrScriptPath && fs.existsSync(cachedVisionOcrScriptPath)) {
    return cachedVisionOcrScriptPath;
  }

  const scriptPath = path.join(
    os.tmpdir(),
    `topik-writing-vision-ocr-${process.pid}-${Date.now()}.swift`
  );
  fs.writeFileSync(scriptPath, VISION_OCR_SWIFT_SOURCE, 'utf8');
  cachedVisionOcrScriptPath = scriptPath;
  return scriptPath;
}

function listImageFiles(directoryPath) {
  if (!fs.existsSync(directoryPath)) {
    return [];
  }

  return fs
    .readdirSync(directoryPath, { withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => path.join(directoryPath, entry.name))
    .filter(filePath => /\.(png|jpe?g|webp|gif|bmp)$/i.test(filePath))
    .sort((left, right) => left.localeCompare(right));
}

function findAssetByRelativePath(relativeAssetPath, directories) {
  for (const directoryPath of directories) {
    if (!directoryPath) {
      continue;
    }
    const candidatePath = path.join(directoryPath, relativeAssetPath);
    if (fs.existsSync(candidatePath)) {
      return candidatePath;
    }
  }
  return '';
}

function findFallbackAssetPath(assetsDir, examNo, questionNo) {
  const questionDirectory = path.join(assetsDir, String(examNo), `q${questionNo}`);
  const questionImages = listImageFiles(questionDirectory);
  if (questionImages[0]) {
    return questionImages[0];
  }

  if (questionNo === 51) {
    const siblingQuestionNumbers = [52, 53, 54];
    for (const siblingQuestionNo of siblingQuestionNumbers) {
      const siblingDirectory = path.join(assetsDir, String(examNo), `q${siblingQuestionNo}`);
      const siblingImages = listImageFiles(siblingDirectory);
      if (siblingImages[0]) {
        return siblingImages[0];
      }
    }
  }

  const examDirectory = path.join(assetsDir, String(examNo));
  const nestedFiles = fs
    .readdirSync(examDirectory, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .flatMap(entry => listImageFiles(path.join(examDirectory, entry.name)))
    .sort((left, right) => left.localeCompare(right));

  return nestedFiles[0] || '';
}

function readSqliteJson(sqlitePath, sql) {
  const tempSqlitePath = path.join(
    os.tmpdir(),
    `topik-writing-import-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`
  );
  fs.copyFileSync(sqlitePath, tempSqlitePath);

  try {
    const raw = execFileSync('sqlite3', [tempSqlitePath, '-json', sql], {
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
    }).trim();
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('SQLite JSON output was not an array.');
    }
    return parsed;
  } finally {
    if (fs.existsSync(tempSqlitePath)) {
      fs.unlinkSync(tempSqlitePath);
    }
  }
}

function normalizeText(value) {
  if (typeof value !== 'string') return '';
  return value
    .replaceAll('\r\n', '\n')
    .replaceAll(/\u00a0/g, ' ')
    .replaceAll(/\u200b/g, '')
    .replaceAll(/\n{3,}/g, '\n\n')
    .replaceAll(/[ \t]{2,}/g, ' ')
    .replaceAll(/^TOPIKⅡ쓰기\($/gm, '')
    .trim();
}

function normalizeMultilineText(value) {
  return normalizeText(value)
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .replaceAll(/\n{3,}/g, '\n\n')
    .trim();
}

function runVisionOcr(assetPath) {
  const scriptPath = getVisionOcrScriptPath();
  return execFileSync('swift', [scriptPath, assetPath], {
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  }).trim();
}

function parseJsonArrayString(value) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return [];
  }
  const parsed = JSON.parse(value);
  return Array.isArray(parsed) ? parsed.filter(item => typeof item === 'string') : [];
}

function getQuestionTemplate(questionNo) {
  const template = QUESTION_TEMPLATES.get(questionNo);
  if (!template) {
    throw new Error(`Unsupported writing question number: ${questionNo}`);
  }
  return template;
}

function getQuestionScore(questionNo) {
  const score = QUESTION_SCORES.get(questionNo);
  if (typeof score !== 'number') {
    throw new Error(`Missing score mapping for question ${questionNo}`);
  }
  return score;
}

function stripStandaloneQuestionLabel(questionNo, text) {
  return text
    .replace(new RegExp(`^${questionNo}\\.(\\s+)?\\n`), '')
    .replace(new RegExp(`^${questionNo}\\.(\\s+)?`), '')
    .trim();
}

function replaceBlankSlot(text, label, fromIndex) {
  const slot = `(      ${label}      )`;
  const openIndex = text.indexOf('(', fromIndex);
  if (openIndex === -1) {
    return { text, nextIndex: fromIndex, replaced: false };
  }

  const closeIndex = text.indexOf(')', openIndex + 1);
  if (closeIndex !== -1 && closeIndex - openIndex <= 32) {
    return {
      text: `${text.slice(0, openIndex)}${slot}${text.slice(closeIndex + 1)}`,
      nextIndex: openIndex + slot.length,
      replaced: true,
    };
  }

  const remainder = text.slice(openIndex + 1);
  const newlineIndex = remainder.indexOf('\n');
  const periodIndex = remainder.indexOf('.');
  let endOffset = newlineIndex;
  if (endOffset === -1 || (periodIndex !== -1 && periodIndex < endOffset)) {
    endOffset = periodIndex;
  }
  if (endOffset === -1) {
    endOffset = remainder.length;
  }

  const endIndex = openIndex + 1 + endOffset;
  return {
    text: `${text.slice(0, openIndex)}${slot}${text.slice(endIndex)}`,
    nextIndex: openIndex + slot.length,
    replaced: true,
  };
}

function cleanQ52ContextFromOcr(rawText) {
  let text = stripStandaloneQuestionLabel(52, normalizeMultilineText(rawText));
  let replacement = replaceBlankSlot(text, '㉠', 0);
  text = replacement.text;
  replacement = replaceBlankSlot(text, '㉡', replacement.nextIndex);
  text = replacement.text;
  return text.trim();
}

function cleanQ54ContextFromOcr(rawText) {
  const normalized = normalizeMultilineText(rawText);
  const lines = normalized
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  if (lines[0]?.startsWith('54.')) {
    lines.shift();
  }
  while (
    lines[0] &&
    (/^그대로 옮겨 쓰지 마시오/u.test(lines[0]) ||
      /^단, 문제를/u.test(lines[0]) ||
      /^\(50점\)/u.test(lines[0]) ||
      /50점/u.test(lines[0]))
  ) {
    lines.shift();
  }

  const keptLines = [];
  let bulletCount = 0;
  for (const line of lines) {
    if (line.startsWith('* 원고지 쓰기의') || line.startsWith('제1교시')) {
      break;
    }
    keptLines.push(line);
    if (/^[•ㆍ]/u.test(line)) {
      bulletCount += 1;
      if (bulletCount >= 3) {
        break;
      }
    }
  }

  return keptLines.join('\n').trim();
}

function buildQuestionContext(questionNo, promptText, assetPath) {
  if (questionNo === 51 || questionNo === 53) {
    return '';
  }

  const fallbackText = stripStandaloneQuestionLabel(questionNo, normalizeMultilineText(promptText));
  if (!assetPath) {
    return fallbackText;
  }

  try {
    const ocrText = runVisionOcr(assetPath);
    if (questionNo === 52) {
      return cleanQ52ContextFromOcr(ocrText) || fallbackText;
    }
    if (questionNo === 54) {
      return cleanQ54ContextFromOcr(ocrText) || fallbackText;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Vision OCR failed for Q${questionNo} asset ${assetPath}: ${message}`);
  }

  return fallbackText;
}

function getMimeTypeForFile(assetPath) {
  const extension = path.extname(assetPath).toLowerCase();
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
  if (extension === '.webp') return 'image/webp';
  if (extension === '.gif') return 'image/gif';
  if (extension === '.bmp') return 'image/bmp';
  return 'image/png';
}

function sanitizeSegment(segment) {
  return segment
    .trim()
    .replaceAll(/[^A-Za-z0-9._/-]+/g, '-')
    .replaceAll(/-+/g, '-')
    .replaceAll(/^-+|-+$/g, '');
}

function createSpacesUploadClient() {
  const endpoint = process.env.SPACES_ENDPOINT;
  const bucket = process.env.SPACES_BUCKET;
  const accessKeyId = process.env.SPACES_KEY;
  const secretAccessKey = process.env.SPACES_SECRET;
  const region = process.env.SPACES_REGION || 'us-east-1';

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }

  const client = new S3Client({
    endpoint,
    region,
    forcePathStyle: false,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return {
    client,
    bucket,
    endpoint,
    cdnUrl: process.env.SPACES_CDN_URL || '',
  };
}

function buildPublicObjectUrl(spacesConfig, objectKey) {
  if (spacesConfig.cdnUrl) {
    const base = spacesConfig.cdnUrl.endsWith('/')
      ? spacesConfig.cdnUrl.slice(0, -1)
      : spacesConfig.cdnUrl;
    return `${base}/${objectKey.split('/').map(encodeURIComponent).join('/')}`;
  }

  const host = new URL(spacesConfig.endpoint).host.replace(
    'digitaloceanspaces.com',
    'cdn.digitaloceanspaces.com'
  );
  return `https://${spacesConfig.bucket}.${host}/${objectKey
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`;
}

async function uploadImageAsset(assetPath, objectKey, inlineImages, spacesConfig) {
  const bytes = fs.readFileSync(assetPath);
  const mimeType = getMimeTypeForFile(assetPath);

  if (inlineImages) {
    return `data:${mimeType};base64,${bytes.toString('base64')}`;
  }

  if (!spacesConfig) {
    throw new Error(
      'SPACES_* env vars are missing. Use --inline-images or configure Spaces credentials in .env.local.'
    );
  }

  await spacesConfig.client.send(
    new PutObjectCommand({
      Bucket: spacesConfig.bucket,
      Key: objectKey,
      Body: bytes,
      ContentType: mimeType,
      ACL: 'public-read',
      CacheControl: 'public, max-age=31536000, immutable',
    })
  );

  return buildPublicObjectUrl(spacesConfig, objectKey);
}

function runConvexMutation(functionName, payload, deployment) {
  const args = ['convex', 'run', functionName, JSON.stringify(payload), '--typecheck', 'disable'];

  const shouldPush = deployment !== 'prod';
  if (shouldPush) {
    args.push('--push');
  }
  if (deployment) {
    if (deployment === 'prod') {
      args.push('--prod');
    } else {
      args.push('--deployment', deployment);
    }
  }

  const result = spawnSync('npx', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  });

  if (result.status !== 0) {
    const message = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    throw new Error(message || `convex run failed for ${functionName}`);
  }

  return result.stdout.trim();
}

function groupRowsByExam(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const examNo = Number.parseInt(String(row.exam_no), 10);
    const questionNo = Number.parseInt(String(row.question_no), 10);
    if (!Number.isFinite(examNo) || !Number.isFinite(questionNo)) {
      throw new Error(`Invalid exam/question number in sqlite row: ${JSON.stringify(row)}`);
    }

    const existing = grouped.get(examNo) || {
      examNo,
      paperUrl: typeof row.paper_url === 'string' ? row.paper_url : '',
      answerUrl: typeof row.ans_w_url === 'string' ? row.ans_w_url : '',
      questions: [],
    };

    existing.questions.push({
      questionNo,
      promptText: typeof row.prompt_text === 'string' ? row.prompt_text : '',
      answerText: typeof row.answer_text === 'string' ? row.answer_text : '',
      promptPages: typeof row.prompt_pages === 'string' ? row.prompt_pages : '[]',
      answerPages: typeof row.answer_pages === 'string' ? row.answer_pages : '[]',
      assetsJson: typeof row.assets_json === 'string' ? row.assets_json : '[]',
    });

    grouped.set(examNo, existing);
  }

  return [...grouped.values()].sort((left, right) => left.examNo - right.examNo);
}

async function buildExamPayload(examRecord, args, spacesConfig) {
  const orderedQuestions = [...examRecord.questions].sort(
    (left, right) => left.questionNo - right.questionNo
  );

  const questions = [];

  for (const questionRecord of orderedQuestions) {
    const template = getQuestionTemplate(questionRecord.questionNo);
    const assetRelativePaths = parseJsonArrayString(questionRecord.assetsJson);
    const primaryAsset = assetRelativePaths[0] || '';
    let imageUrl = '';
    const assetLookupDirectories = [args.croppedAssetsDir, args.assetsDir];
    const fallbackAssetsDir = args.croppedAssetsDir || args.assetsDir;
    let absoluteAssetPath = '';

    if (primaryAsset) {
      const preferredAssetPath = findAssetByRelativePath(primaryAsset, assetLookupDirectories);
      const fallbackAssetPath = findFallbackAssetPath(
        fallbackAssetsDir,
        examRecord.examNo,
        questionRecord.questionNo
      );
      absoluteAssetPath = preferredAssetPath || fallbackAssetPath;

      ensureExists(
        absoluteAssetPath,
        `Asset for exam ${examRecord.examNo} Q${questionRecord.questionNo}`
      );
    } else if (
      questionRecord.questionNo === 51 ||
      questionRecord.questionNo === 52 ||
      questionRecord.questionNo === 53 ||
      questionRecord.questionNo === 54
    ) {
      absoluteAssetPath = findFallbackAssetPath(
        fallbackAssetsDir,
        examRecord.examNo,
        questionRecord.questionNo
      );
      ensureExists(
        absoluteAssetPath,
        `Fallback asset for exam ${examRecord.examNo} Q${questionRecord.questionNo}`
      );
    }

    if (absoluteAssetPath && (questionRecord.questionNo === 51 || questionRecord.questionNo === 53)) {
      const objectKey = [
        'topik-writing',
        'imported',
        String(examRecord.examNo),
        `q${questionRecord.questionNo}-${sanitizeSegment(path.basename(absoluteAssetPath))}`,
      ].join('/');
      imageUrl = await uploadImageAsset(
        absoluteAssetPath,
        objectKey,
        args.inlineImages,
        spacesConfig
      );
    }

    questions.push({
      number: questionRecord.questionNo,
      questionType: template.questionType,
      instruction: template.instruction,
      contextBox:
        buildQuestionContext(
          questionRecord.questionNo,
          questionRecord.promptText,
          absoluteAssetPath
        ) || undefined,
      image: imageUrl || undefined,
      score: getQuestionScore(questionRecord.questionNo),
      modelAnswer: normalizeText(questionRecord.answerText) || undefined,
    });
  }

  return {
    id: `${args.replacePrefix}${examRecord.examNo}`,
    title: `第${examRecord.examNo}届 TOPIK II 写作`,
    round: examRecord.examNo,
    timeLimit: DEFAULT_TIME_LIMIT_MINUTES,
    description: [
      `TOPIK II 写作真题（第${examRecord.examNo}届）`,
      `paper: ${examRecord.paperUrl}`,
      `answers: ${examRecord.answerUrl}`,
      'imported from sqlite',
    ].join(' · '),
    isPaid: args.accessLevel === 'PRO',
    accessLevel: args.accessLevel,
    questions,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  ensureExists(args.sqlitePath, 'SQLite file');
  ensureExists(args.assetsDir, 'Assets directory');
  if (args.croppedAssetsDir) {
    ensureExists(args.croppedAssetsDir, 'Cropped assets directory');
  }

  const spacesConfig = createSpacesUploadClient();
  if (!spacesConfig && !args.inlineImages) {
    throw new Error(
      'Spaces upload config is missing. Either configure SPACES_* vars in .env.local or use --inline-images.'
    );
  }

  const rows = readSqliteJson(
    args.sqlitePath,
    `select e.exam_no, e.paper_url, e.ans_w_url, q.question_no, q.prompt_text, q.answer_text, q.prompt_pages, q.answer_pages, q.assets_json
     from exams e
     join writing_questions q on q.exam_no = e.exam_no
     order by e.exam_no, q.question_no`
  );

  const examRecords = groupRowsByExam(rows).filter(record =>
    args.examNos ? args.examNos.includes(record.examNo) : true
  );

  if (examRecords.length === 0) {
    throw new Error('No exams matched the provided filters.');
  }

  console.log(
    `Preparing ${examRecords.length} TOPIK writing exams from ${path.basename(args.sqlitePath)}`
  );

  if (args.purgeExisting && !args.dryRun) {
    const legacyIds = examRecords.map(record => `${args.replacePrefix}${record.examNo}`);
    console.log(`Purging ${legacyIds.length} existing writing exams before import...`);
    const purgeResult = runConvexMutation(
      'topikWriting:purgeWritingExams',
      { legacyIds },
      args.deployment
    );
    console.log(`Purge completed -> ${purgeResult}`);
  }

  for (const examRecord of examRecords) {
    console.log(`\n[Exam ${examRecord.examNo}] building payload...`);
    const payload = await buildExamPayload(examRecord, args, spacesConfig);
    console.log(
      `[Exam ${examRecord.examNo}] questions=${payload.questions.length} access=${payload.accessLevel} ${args.dryRun ? '(dry-run)' : ''}`
    );

    if (args.dryRun) {
      continue;
    }

    const result = runConvexMutation('topikWriting:importWritingExam', payload, args.deployment);
    console.log(`[Exam ${examRecord.examNo}] imported -> ${result}`);
  }

  console.log('\nTOPIK writing sqlite import completed.');
}

main().catch(error => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nImport failed: ${message}`);
  process.exit(1);
});
