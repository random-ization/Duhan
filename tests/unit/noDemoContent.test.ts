import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const readProjectFile = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

const listFilesRecursively = (dirRelativeToRepo: string): string[] => {
  const root = resolve(process.cwd(), dirRelativeToRepo);
  const result: string[] = [];
  const walk = (absDir: string) => {
    for (const entry of readdirSync(absDir)) {
      const absPath = resolve(absDir, entry);
      const st = statSync(absPath);
      if (st.isDirectory()) {
        walk(absPath);
      } else {
        result.push(absPath);
      }
    }
  };
  walk(root);
  return result;
};

describe('no demo content in production paths', () => {
  it('should not ship demo podcast episode defaults', () => {
    const content = readProjectFile('src/pages/PodcastPlayerPage.tsx');
    expect(content).not.toContain('Demo Episode');
    expect(content).not.toContain('SoundHelix-Song-1');
  });

  it('should not ship stub transcript generation', () => {
    const content = readProjectFile('convex/ai.ts');
    expect(content).not.toMatch(/Stub implementation/i);
    expect(content).not.toMatch(/Fake delay/i);
    expect(content).not.toMatch(/mockSegments/i);
  });

  it('should not ship hardcoded TOPIK identity values', () => {
    const files = listFilesRecursively('src').filter(f => /\.(ts|tsx|js|jsx)$/.test(f));
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      expect(content).not.toContain('12345678');
      expect(content).not.toContain('Hong Gil Dong');
    }
  });
});
