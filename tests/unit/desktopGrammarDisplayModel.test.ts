import { describe, expect, it } from 'vitest';

import { buildDesktopGrammarDisplayModel } from '../../src/pages/desktop/desktopGrammarDisplayModel';
import type { GrammarPointData } from '../../src/types';

describe('buildDesktopGrammarDisplayModel', () => {
  it('returns safe defaults when grammar is missing', () => {
    const display = buildDesktopGrammarDisplayModel(null, 'en');

    expect(display.title).toBe('');
    expect(display.summary).toBe('');
    expect(display.altSummaries).toEqual([]);
    expect(display.examples).toEqual([]);
    expect(display.quizItems).toEqual([]);
    expect(display.sourceMeta).toEqual([]);
    expect(display.conjugationRules).toBeUndefined();
  });

  it('normalizes desktop grammar content into render-safe values', () => {
    const importedAt = Date.UTC(2026, 4, 19);
    const grammar: GrammarPointData = {
      id: 'g1',
      title: '~하기에',
      titleEn: 'because / due to',
      summary: '因为',
      summaryEn: 'for that reason',
      summaryVi: 'vi summary',
      type: 'CONNECTIVE',
      explanation: '表示原因。',
      explanationEn: 'Used to express a reason.',
      examples: [
        {
          kr: '늦었기에 바로 택시를 탔어요.',
          cn: '因为迟到了，所以马上打车了。',
          en: 'Because I was late, I took a taxi right away.',
          audio: 'https://example.com/audio.mp3',
        },
      ],
      sections: {
        core: {
          zh: '核心要点',
          en: 'Core usage',
        },
      },
      quizItems: [
        {
          prompt: { en: 'Fill in the connector.' },
          answer: { en: '-기에' },
        },
      ],
      sourceMeta: {
        sourceType: 'import',
        grammarKey: 'g-key',
        sourceLanguage: 'en',
        categoryStatus: 'AUTO_OK',
        categoryConfidence: 0.87,
        importedAt,
      },
      conjugationRules: [
        'Noun + 이기에',
        {
          'Verb stem': '-기에',
        },
      ],
      customNote: '更常见于书面语。',
      customNoteEn: 'More common in formal or written usage.',
    };

    const display = buildDesktopGrammarDisplayModel(grammar, 'en');

    expect(display.title).toBe('because / due to');
    expect(display.summary).toBe('for that reason');
    expect(display.altSummaries).toEqual([
      { label: 'EN', text: 'for that reason' },
      { label: 'VI', text: 'vi summary' },
    ]);
    expect(display.examples).toEqual([
      {
        kr: '늦었기에 바로 택시를 탔어요.',
        cn: '因为迟到了，所以马上打车了。',
        en: 'Because I was late, I took a taxi right away.',
        vi: '',
        mn: '',
        hasAudio: true,
      },
    ]);
    expect(display.sections.core).toEqual({
      zh: '核心要点',
      en: 'Core usage',
      vi: '',
      mn: '',
    });
    expect(display.quizItems).toEqual([
      {
        prompt: 'Fill in the connector.',
        answer: '-기에',
      },
    ]);
    expect(display.sourceMeta).toEqual([
      { label: '类型', value: 'import' },
      { label: '标识', value: 'g-key' },
      { label: '源语言', value: 'en' },
      { label: '分类', value: 'AUTO_OK' },
      { label: '置信度', value: '87%' },
      { label: '导入时间', value: new Date(importedAt).toLocaleDateString('zh-CN') },
    ]);
    expect(display.conjugationRules).toEqual([
      'Noun + 이기에',
      {
        'Verb stem': '-기에',
      },
    ]);
    expect(display.customNote).toBe('更常见于书面语。');
    expect(display.explanationEn).toBe('Used to express a reason.');
  });
});
