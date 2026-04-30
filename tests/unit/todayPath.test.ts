import { describe, expect, it } from 'vitest';

import { buildVocabTodayPath } from '../../src/utils/todayPath';

describe('buildVocabTodayPath', () => {
  it('returns no steps when there is no signal', () => {
    const path = buildVocabTodayPath({});
    expect(path.steps).toHaveLength(0);
    expect(path.estimatedMinutes).toBe(0);
  });

  it('includes review step when dueNow > 0', () => {
    const path = buildVocabTodayPath({
      reviewSummary: {
        total: 100,
        dueTotal: 30,
        dueNow: 18,
        unlearned: 0,
        mastered: 50,
        learning: 30,
        recommendedToday: 20,
      },
    });
    expect(path.steps).toHaveLength(1);
    expect(path.steps[0]).toMatchObject({
      kind: 'review',
      count: 18,
      target: '/review',
    });
    expect(path.steps[0].estimatedMinutes).toBeGreaterThan(0);
  });

  it('includes new step when there is a current course', () => {
    const path = buildVocabTodayPath({
      recentVocab: { instituteId: 'ysk-1', level: 1, unit: 5 },
      recentInstituteName: 'Yonsei 1',
    });
    expect(path.steps).toHaveLength(1);
    const step = path.steps[0];
    expect(step.kind).toBe('new');
    if (step.kind === 'new') {
      expect(step.instituteId).toBe('ysk-1');
      expect(step.courseLabel).toBe('Yonsei 1');
      expect(step.target).toBe('/course/ysk-1/vocab?unit=5');
    }
  });

  it('omits new step when no recent vocab institute', () => {
    const path = buildVocabTodayPath({
      reviewSummary: {
        total: 0,
        dueTotal: 0,
        dueNow: 5,
        unlearned: 0,
        mastered: 0,
        learning: 0,
        recommendedToday: 5,
      },
    });
    expect(path.steps.find(s => s.kind === 'new')).toBeUndefined();
  });

  it('appends weak step only when there is also a course context', () => {
    const path = buildVocabTodayPath({
      recentVocab: { instituteId: 'ysk-1', level: 1, unit: 5 },
      weakCategories: [
        {
          partOfSpeech: '형용사',
          totalLapses: 12,
          wordCount: 8,
          samples: [],
        },
      ],
    });
    const weak = path.steps.find(s => s.kind === 'weak');
    expect(weak).toBeDefined();
    if (weak && weak.kind === 'weak') {
      expect(weak.categoryLabel).toBe('형용사');
      expect(weak.target).toContain('focusCategory=');
      expect(weak.target).toContain('%ED%98%95%EC%9A%A9%EC%82%AC');
    }
  });

  it('omits weak step when no recent course (cannot drill)', () => {
    const path = buildVocabTodayPath({
      weakCategories: [
        {
          partOfSpeech: '명사',
          totalLapses: 5,
          wordCount: 4,
          samples: [],
        },
      ],
    });
    expect(path.steps.find(s => s.kind === 'weak')).toBeUndefined();
  });

  it('aggregates estimated minutes across steps', () => {
    const path = buildVocabTodayPath({
      reviewSummary: {
        total: 50,
        dueTotal: 20,
        dueNow: 18,
        unlearned: 0,
        mastered: 20,
        learning: 30,
        recommendedToday: 25,
      },
      recentVocab: { instituteId: 'ysk-1', level: 1, unit: 5 },
      recentInstituteName: 'Yonsei 1',
      weakCategories: [
        { partOfSpeech: '동사', totalLapses: 8, wordCount: 6, samples: [] },
      ],
    });
    expect(path.steps).toHaveLength(3);
    const sumOfSteps = path.steps.reduce((s, x) => s + x.estimatedMinutes, 0);
    expect(path.estimatedMinutes).toBe(sumOfSteps);
    expect(path.estimatedMinutes).toBeGreaterThan(0);
  });

  it('respects custom newWordTarget', () => {
    const path = buildVocabTodayPath({
      recentVocab: { instituteId: 'ysk-1', level: 1 },
      newWordTarget: 5,
    });
    const step = path.steps[0];
    expect(step.kind).toBe('new');
    if (step.kind === 'new') {
      expect(step.count).toBe(5);
    }
  });
});
