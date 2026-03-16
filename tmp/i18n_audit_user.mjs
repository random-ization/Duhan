import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = process.cwd();
const srcRoot = path.join(root, 'src');
const ex = [
  `${path.sep}src${path.sep}components${path.sep}admin${path.sep}`,
  `${path.sep}src${path.sep}features${path.sep}admin${path.sep}`,
  `${path.sep}src${path.sep}pages${path.sep}Admin`,
  `${path.sep}src${path.sep}pages${path.sep}admin${path.sep}`,
];
const attrNames = new Set(['aria-label','alt','title','placeholder','label','description','btnText','subtext']);
const ignoreExact = new Set([
  'x','Q','H','K','D','F','XP','TAB','ESC','TOPIK','TOPIK II','TOPIK Ⅱ','YSK','VOL','VOL.','Vol','A-','A+','px','Aa','--:--',
  '&copy;','&quot;',': &quot;','...&quot;','www.koreanstudy.me','Duhan','DuHan','Duhan App','AI','AI Analysis','RECOMMENDED','Premium'
]);
const ignoreRe = [
  /^\d+[smhd]$/, /^\d+\s?(mins?|days?)$/i, /^\d+\s+Due$/i, /^\d+\s+Days$/i,
  /^[()+\-–—:•./\s\d]+$/, /^[A-Z][A-Z\s:+/\-&.0-9]+$/, /^[\uac00-\ud7a3]+$/,
  /^\(Level\s*\d+[A-Z]?\)$/i
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && full.endsWith('.tsx')) out.push(full);
  }
  return out;
}
function excluded(file) { return ex.some(x => file.includes(x)); }
function norm(s) { return s.replace(/\s+/g, ' ').trim(); }
function maybeText(s) {
  if (!s) return false;
  const t = norm(s);
  if (!t) return false;
  if (ignoreExact.has(t)) return false;
  if (!/[A-Za-z\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(t)) return false;
  if (ignoreRe.some(r => r.test(t))) return false;
  return true;
}

const findings = [];
for (const file of walk(srcRoot)) {
  if (excluded(file)) continue;
  const rel = path.relative(root, file);
  const code = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  const visit = (node) => {
    if (ts.isJsxText(node)) {
      const text = norm(node.getText(sf));
      if (maybeText(text)) {
        const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
        findings.push({ file: rel, line: line + 1, kind: 'jsx-text', text });
      }
    }
    if (ts.isJsxAttribute(node) && attrNames.has(node.name.text)) {
      const init = node.initializer;
      if (init && ts.isStringLiteral(init)) {
        const text = norm(init.text);
        if (maybeText(text)) {
          const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
          findings.push({ file: rel, line: line + 1, kind: 'jsx-attr', key: node.name.text, text });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

findings.sort((a,b)=> a.file.localeCompare(b.file) || a.line-b.line || a.text.localeCompare(b.text));
console.log(JSON.stringify(findings, null, 2));
