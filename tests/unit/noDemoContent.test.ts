import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const readProjectFile = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), 'utf8');

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
    const content = readProjectFile('src/components/TopikModule.tsx');
    expect(content).not.toContain('12345678');
    expect(content).not.toContain('Hong Gil Dong');
  });
});
