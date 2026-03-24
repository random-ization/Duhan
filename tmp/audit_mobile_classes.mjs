import fs from 'fs';
import path from 'path';

const PAGES_DIR = path.resolve('./src/pages');

function getFiles(dir, filesList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getFiles(filePath, filesList);
    } else if (filePath.endsWith('.tsx')) {
      filesList.push(filePath);
    }
  }
  return filesList;
}

const files = getFiles(PAGES_DIR);

const report = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  const relativePath = path.relative(PAGES_DIR, file);

  let hardcodedWidths = 0;
  let mdPrefixes = 0;
  let lgPrefixes = 0;
  let smPrefixes = 0;
  let flexCols = 0;
  let classNameCount = 0;

  for (const line of lines) {
    if (line.includes('className=')) {
      classNameCount++;
    }
    
    // Check for hardcoded absolute widths that might break mobile
    const hardcodedWidthMatches = line.match(/(?<!md:|lg:|sm:|xl:)(w-\[(?:[3-9]\d{2,}px|\d{3,}rem)\]|w-(?:64|72|80|96))/g);
    if (hardcodedWidthMatches) {
      hardcodedWidths += hardcodedWidthMatches.length;
    }

    const mdMatches = line.match(/\bmd:/g);
    if (mdMatches) mdPrefixes += mdMatches.length;

    const lgMatches = line.match(/\blg:/g);
    if (lgMatches) lgPrefixes += lgMatches.length;

    const smMatches = line.match(/\bsm:/g);
    if (smMatches) smPrefixes += smMatches.length;

    const flexColMatches = line.match(/\bflex-col\b/g);
    if (flexColMatches) flexCols += flexColMatches.length;
  }

  // Calculate a "mobile-friendly score" (rough heuristic)
  // Higher mdPrefix ratio usually means it was designed mobile-first and adjusted for desktop.
  // High hardcoded widths with no md prefixes means it's likely broken on mobile.
  
  report.push({
    file: relativePath,
    size: lines.length,
    classNameCount,
    hardcodedWidths,
    mdPrefixes,
    lgPrefixes,
    smPrefixes,
    flexCols,
    score: mdPrefixes > 0 ? (hardcodedWidths / mdPrefixes).toFixed(2) : (hardcodedWidths > 0 ? 'High Risk' : 'Unknown')
  });
}

report.sort((a, b) => b.hardcodedWidths - a.hardcodedWidths);

console.log('Pages Audit Report (Top 20 Riskiest by Hardcoded Widths without responsive prefix):');
console.table(report.slice(0, 20));

console.log('\nPages with lowest responsive prefix density (High Risk of being desktop-only):');
const densityReport = [...report]
  .filter(r => r.classNameCount > 10)
  .sort((a, b) => (a.mdPrefixes + a.lgPrefixes + a.smPrefixes) / Math.max(1, a.classNameCount) - (b.mdPrefixes + b.lgPrefixes + b.smPrefixes) / Math.max(1, b.classNameCount));
console.table(densityReport.slice(0, 20));

