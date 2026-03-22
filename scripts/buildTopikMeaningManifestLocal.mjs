#!/usr/bin/env node
/**
 * Build TOPIK manifest with local meaning-based classification (no external API).
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const PROJECT_ROOT = process.cwd();

function parseArgs(argv) {
  const args = {
    enDir: '',
    zhDir: '',
    output: '',
  };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--enDir') args.enDir = argv[++i] || '';
    else if (token === '--zhDir') args.zhDir = argv[++i] || '';
    else if (token === '--output') args.output = argv[++i] || '';
    else if (token === '--help' || token === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  if (!args.enDir || !args.zhDir) {
    printHelp('Missing required --enDir / --zhDir');
    process.exit(1);
  }
  if (!fs.existsSync(args.enDir) || !fs.statSync(args.enDir).isDirectory()) {
    throw new Error(`English directory not found: ${args.enDir}`);
  }
  if (!fs.existsSync(args.zhDir) || !fs.statSync(args.zhDir).isDirectory()) {
    throw new Error(`Chinese directory not found: ${args.zhDir}`);
  }
  return args;
}

function printHelp(errorMessage) {
  if (errorMessage) console.error(`\nError: ${errorMessage}\n`);
  console.log(`Usage:
  node scripts/buildTopikMeaningManifestLocal.mjs --enDir <path> --zhDir <path> [--output <path>]
`);
}

function listMarkdownFiles(dir) {
  return fs
    .readdirSync(dir)
    .filter(name => name.toLowerCase().endsWith('.md'))
    .sort((a, b) => a.localeCompare(b, 'en'))
    .map(name => path.join(dir, name));
}

function cleanMarkdownBody(input) {
  return input
    .replace(/^Processing keyword:.*$/gm, '')
    .replace(/^©.*$/gm, '')
    .replace(/^由\s+\[Hanabira\.org\].*$/gm, '')
    .replace(/^By\s+\[Hanabira\.org\].*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function stripMarkdownInline(input) {
  return input
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function firstParagraph(markdown) {
  const plain = stripMarkdownInline(
    markdown
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^\s*[-*]\s+/gm, '')
      .replace(/^\s*\d+\.\s+/gm, '')
      .replace(/\n{3,}/g, '\n\n')
  );
  const chunks = plain
    .split(/\n\s*\n/g)
    .map(s => s.trim())
    .filter(Boolean);
  return chunks.find(chunk => chunk.length >= 20) || chunks[0] || '';
}

function extractTitle(content, fileName, language) {
  if (language === 'en') {
    const processingKeyword = content.match(/^Processing keyword:\s*(.+)\s*$/m)?.[1]?.trim();
    if (processingKeyword) return processingKeyword;
    const mainHeading = content.match(/^#\s*Korean Grammar Point:\s*(.+)\s*$/m)?.[1]?.trim();
    if (mainHeading) return mainHeading;
  } else {
    const zhHeading = content.match(/^#\s*韩语语法点[:：]\s*(.+)\s*$/m)?.[1]?.trim();
    if (zhHeading) return zhHeading;
  }
  return decodeURIComponent(fileName.replace(/\.md$/i, '').replace(/_/g, ' ').trim());
}

function extractKoreanKernel(input) {
  const matches = input.match(/[~()/\-\sㄱ-ㅎㅏ-ㅣ가-힣?!.]+/g) || [];
  const merged = matches.join(' ');
  return merged
    .replace(/\s+/g, ' ')
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s*-\s*/g, '-')
    .replace(/\s*[()]\s*/g, m => m.trim())
    .replace(/^[-/]+|[-/]+$/g, '')
    .trim();
}

function normalizeGrammarKey(input) {
  const kernel = extractKoreanKernel(input);
  return kernel.replace(/[~\s]/g, '').toLowerCase().trim();
}

const PROFILES = [
  {
    id: 1,
    name: '推测与推断',
    strong: ['推测', '推断', '猜测', '可能', '似乎', '看来', '大概', '恐怕', 'inference', 'speculation', 'probably', 'likely', 'seems', 'guess'],
    medium: ['것 같다', '나 보다', '모양', '듯', '겠'],
  },
  {
    id: 2,
    name: '对比与转折',
    strong: ['转折', '对比', '相反', '然而', '不过', '但是', '却', 'contrast', 'however', 'whereas', 'rather than'],
    medium: ['지만', '는데', '반면', '도리어'],
  },
  {
    id: 3,
    name: '原因与理由',
    strong: ['原因', '理由', '因为', '由于', '既然', '因而', '所以', 'cause', 'reason', 'because', 'since'],
    medium: ['기 때문에', '아서', '어서', '니까', '탓'],
  },
  {
    id: 4,
    name: '目的与意图',
    strong: ['目的', '意图', '打算', '计划', '为了', '以便', 'intend', 'purpose', 'in order to', 'plan'],
    medium: ['려고', '기 위해', '고자'],
  },
  {
    id: 5,
    name: '进展与完成',
    strong: ['完成', '结束', '完了', '终于', '最终', '结果', 'progress', 'completion', 'finish', 'completed', 'end up'],
    medium: ['고 나', '버리', '게 되'],
  },
  {
    id: 6,
    name: '状态与持续',
    strong: ['持续', '状态', '一直', '保持', '习惯', '经常', 'ongoing', 'state', 'continuity', 'habit', 'keep'],
    medium: ['고 있다', '아/어 있다', '곤 하다'],
  },
  {
    id: 7,
    name: '程度与限制',
    strong: ['程度', '限制', '越', '最', '更', '仅', '只', '至少', '至多', 'degree', 'limit', 'extent'],
    medium: ['수록', '만큼', '밖에', '만'],
  },
  {
    id: 8,
    name: '假设与前提',
    strong: ['假设', '前提', '条件', '如果', '假如', '要是', '只要', 'if', 'unless', 'provided that', 'condition'],
    medium: ['(으)면', '다면', '거든'],
  },
  {
    id: 9,
    name: '让步与包含',
    strong: ['让步', '尽管', '虽然', '即使', '哪怕', '就算', '无论', '包括', '连', '甚至', 'concession', 'even if', 'despite', 'including'],
    medium: ['아도', '어도', '더라도', '조차', '마저', '까지'],
  },
  {
    id: 10,
    name: '机会与变化',
    strong: ['机会', '时机', '变化', '转变', '变成', '变得', 'opportunity', 'chance', 'change', 'turn into', 'become'],
    medium: ['다가', '게 되다'],
  },
  {
    id: 11,
    name: '引述与传闻',
    strong: ['引述', '传闻', '据说', '听说', '转述', '间接引语', 'reported', 'quotation', 'reported speech', 'heard that'],
    medium: ['다고 하', '라고 하', '자고 하'],
  },
  {
    id: 12,
    name: '必要与经验',
    strong: ['必要', '必须', '需要', '不得不', '应该', '义务', '经验', '曾经', 'must', 'need to', 'have to', 'experience', 'have ever'],
    medium: ['아/어야', 'ㄴ 적이', '본 적'],
  },
  {
    id: 13,
    name: '列举与顺序',
    strong: ['列举', '顺序', '首先', '然后', '接着', '并且', '以及', 'listing', 'sequence', 'first', 'then', 'next'],
    medium: ['고', '며', '면서'],
  },
  {
    id: 14,
    name: '标准与范围',
    strong: ['标准', '范围', '依据', '按照', '根据', '以...为准', '从...到', 'between', 'scope', 'according to', 'based on'],
    medium: ['기준', '대로', '중에서'],
  },
  {
    id: 15,
    name: '助词与语气',
    strong: ['助词', '语气', '语气词', '终结词尾', '句末', '口气', 'particle', 'nuance', 'sentence ending', 'final ending'],
    medium: ['나요', '네요', '군요', '죠', '지요', '거든요', '잖아요', '을까요', 'ㄹ까요', '습니까'],
  },
];

function scoreRecord(record) {
  const text = `${record.titleRaw}\n${record.koreanTitle}\n${record.summary}\n${record.explanation.slice(0, 1800)}`;
  const lower = text.toLowerCase();
  const scores = new Map(PROFILES.map(p => [p.id, 0]));
  const evidence = new Map(PROFILES.map(p => [p.id, []]));

  for (const profile of PROFILES) {
    for (const kw of profile.strong) {
      if (lower.includes(kw.toLowerCase())) {
        scores.set(profile.id, (scores.get(profile.id) || 0) + 3);
        evidence.get(profile.id).push(kw);
      }
    }
    for (const kw of profile.medium) {
      if (lower.includes(kw.toLowerCase())) {
        scores.set(profile.id, (scores.get(profile.id) || 0) + 1.5);
        evidence.get(profile.id).push(kw);
      }
    }
  }

  // Meaning-based overrides for frequent ambiguity.
  if (/(尽管|虽然|即使|哪怕|就算|despite|even if)/i.test(text)) {
    scores.set(9, (scores.get(9) || 0) + 4);
  }
  if (/(因为|由于|既然|because|since|reason)/i.test(text)) {
    scores.set(3, (scores.get(3) || 0) + 4);
  }
  if (/(为了|以便|目的|打算|in order to|purpose|intend)/i.test(text)) {
    scores.set(4, (scores.get(4) || 0) + 4);
  }
  if (/(如果|假如|要是|前提|条件|if|unless|condition)/i.test(text)) {
    scores.set(8, (scores.get(8) || 0) + 4);
  }
  if (/(据说|听说|reported|reported speech|quote|quotation|다고 하|라고 하)/i.test(text)) {
    scores.set(11, (scores.get(11) || 0) + 5);
  }
  if (/(必须|需要|不得不|义务|经验|曾经|must|need to|have to|have ever|ㄴ 적이)/i.test(text)) {
    scores.set(12, (scores.get(12) || 0) + 4);
  }

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  let [topId, topScore] = ranked[0];
  const secondScore = ranked[1]?.[1] || 0;

  // Category 15 should not be a generic sink.
  const hasParticleSignal = /(助词|语气|语气词|终结词尾|句末|particle|sentence ending|나요|네요|군요|죠|지요|거든요|잖아요|을까요|ㄹ까요|습니까)/i.test(
    text
  );
  if (topId === 15 && !hasParticleSignal) {
    topId = ranked.find(([id]) => id !== 15)?.[0] || 2;
    topScore = scores.get(topId) || 0;
  }
  if (topId === 15 && secondScore >= topScore - 1 && secondScore >= 3) {
    topId = ranked.find(([id]) => id !== 15)?.[0] || topId;
    topScore = scores.get(topId) || topScore;
  }

  const confidence = Math.max(0.2, Math.min(0.95, 0.35 + topScore / 14));
  const status = topScore >= 5 && topScore - secondScore >= 1.5 ? 'AUTO_OK' : 'NEEDS_REVIEW';
  const why = evidence.get(topId)?.slice(0, 4).join(', ') || '语义线索不足，按最接近含义归类';

  return {
    categoryId: topId,
    confidence: Number(confidence.toFixed(3)),
    status,
    reason: `local-semantic: ${why}`,
    evidence: why,
  };
}

function parseRecords(files, language) {
  const records = [];
  for (const filePath of files) {
    const raw = fs.readFileSync(filePath, 'utf8');
    const content = cleanMarkdownBody(raw);
    const fileName = path.basename(filePath);
    const titleRaw = extractTitle(content, fileName, language);
    const koreanTitle = extractKoreanKernel(titleRaw) || titleRaw;
    const grammarKey = normalizeGrammarKey(titleRaw) || normalizeGrammarKey(fileName);
    if (!grammarKey) continue;

    const summary = firstParagraph(content).slice(0, 400);
    const checksum = crypto.createHash('sha256').update(raw).digest('hex');
    const id = `${language}:${grammarKey}:${path.basename(filePath)}`;

    records.push({
      id,
      language,
      grammarKey,
      titleRaw,
      koreanTitle,
      summary,
      explanation: content.slice(0, 50000),
      sourcePath: filePath,
      checksum,
    });
  }
  return records;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath =
    args.output ||
    path.join(PROJECT_ROOT, 'tmp', `topik_semantic_rebuild_manifest_local_${ts}.json`);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const enRecords = parseRecords(listMarkdownFiles(args.enDir), 'en');
  const zhRecords = parseRecords(listMarkdownFiles(args.zhDir), 'zh');
  const all = [...enRecords, ...zhRecords];

  const manifest = all.map(record => {
    const decision = scoreRecord(record);
    return {
      id: record.id,
      language: record.language,
      title: record.titleRaw,
      koreanTitle: record.koreanTitle,
      grammarKey: record.grammarKey,
      categoryId: decision.categoryId,
      confidence: decision.confidence,
      status: decision.status,
      reason: decision.reason,
      evidence: decision.evidence,
      sourcePath: record.sourcePath,
      checksum: record.checksum,
    };
  });

  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`Manifest written: ${outPath}`);
  console.log(`EN=${enRecords.length}, ZH=${zhRecords.length}, TOTAL=${manifest.length}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
