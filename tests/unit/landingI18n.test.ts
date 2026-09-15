import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { getLandingDecorations } from '../../src/pages/landingDecorations';

const LANGUAGES = ['en', 'zh', 'vi', 'mn'] as const;
const HAN_CHARACTER = /\p{Script=Han}/u;

function readLocale(language: (typeof LANGUAGES)[number], namespace: 'public' | 'app') {
  const localePath = path.join(process.cwd(), 'public', 'locales', language, `${namespace}.json`);
  return JSON.parse(fs.readFileSync(localePath, 'utf8')) as {
    landing: { v2: Record<string, unknown> };
  };
}

function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).flatMap(collectStrings);
  }
  return [];
}

function collectKeys(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    collectKeys(child, prefix ? `${prefix}.${key}` : key)
  );
}

describe('landing page localization', () => {
  it('keeps the public and legacy app landing resources in sync', () => {
    for (const language of LANGUAGES) {
      expect(readLocale(language, 'app').landing.v2).toEqual(
        readLocale(language, 'public').landing.v2
      );
    }
  });

  it('provides the same landing keys in every supported language', () => {
    const englishKeys = collectKeys(readLocale('en', 'public').landing.v2).sort();
    for (const language of LANGUAGES.slice(1)) {
      expect(collectKeys(readLocale(language, 'public').landing.v2).sort()).toEqual(englishKeys);
    }
  });

  it('does not expose Han characters in English landing copy or decorations', () => {
    const englishCopy = collectStrings(readLocale('en', 'public').landing.v2);
    const englishDecorations = collectStrings(getLandingDecorations('en'));
    expect(
      [...englishCopy, ...englishDecorations].filter(value => HAN_CHARACTER.test(value))
    ).toEqual([]);
  });

  it('retains the original decorative style on the Chinese landing page', () => {
    expect(getLandingDecorations('zh-CN').heroNew).toBe('\u65b0');
  });
});
