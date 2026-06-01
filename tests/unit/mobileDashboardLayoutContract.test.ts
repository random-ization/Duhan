import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readProjectFile = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

describe('mobile dashboard learning path layout contract', () => {
  const source = readProjectFile('src/components/mobile/MobileDashboard.tsx');

  it('uses the daily task cockpit as the only today path surface', () => {
    expect(source).toContain('DAILY TASK COCKPIT');
    expect(source).toContain('今日之路');
    expect(source).toContain('开始今日学习');
    expect(source).toContain('MobileLearningLoopSummary');
    expect(source).toContain('先做');
    expect(source).toContain('已学');
    expect(source).toContain('不足');
    expect(source).not.toContain("TODAY'S PATH hero (Vocab focus)");
    expect(source).not.toContain('copy.pathTitle');
    expect(source).not.toContain('renderVocabPathRow');
  });
});
