import { describe, expect, it } from 'vitest';

import {
  buildLearningModulePath,
  buildLearningPickerPath,
  buildMobileCourseDefaultPath,
  normalizeLearningFlowModule,
  recommendVocabStage,
} from '../../src/utils/learningFlow';

describe('learningFlow helpers', () => {
  it('normalizes supported module names', () => {
    expect(normalizeLearningFlowModule('vocabulary')).toBe('vocabulary');
    expect(normalizeLearningFlowModule('vocab')).toBe('vocabulary');
    expect(normalizeLearningFlowModule('GRAMMAR')).toBe('grammar');
    expect(normalizeLearningFlowModule('reading')).toBe('reading');
    expect(normalizeLearningFlowModule('unknown')).toBeNull();
  });

  it('builds module routes from module and course id', () => {
    expect(buildLearningModulePath('vocabulary', 'ysk-1')).toBe('/course/ysk-1/vocab');
    expect(buildLearningModulePath('grammar', 'ysk-1')).toBe('/course/ysk-1/grammar');
    expect(buildLearningModulePath('listening', 'ysk-1')).toBe('/course/ysk-1/listening');
    expect(buildLearningModulePath('reading', 'ysk-1')).toBe('/course/ysk-1/reading');
  });

  it('builds module-aware picker routes', () => {
    expect(buildLearningPickerPath('vocabulary')).toBe('/courses?module=vocabulary');
    expect(buildLearningPickerPath('grammar')).toBe('/courses?module=grammar');
  });

  it('defaults mobile topik grammar courses to grammar and ordinary courses to vocab', () => {
    expect(buildMobileCourseDefaultPath('topik-grammar')).toBe('/course/topik-grammar/grammar');
    expect(buildMobileCourseDefaultPath('ysk-1')).toBe('/course/ysk-1/vocab');
  });
});

describe('recommendVocabStage', () => {
  it('returns learn for empty input', () => {
    expect(recommendVocabStage([])).toBe('learn');
  });

  it('returns learn when 40%+ words are NEW', () => {
    const words = [
      { state: 0 },
      { state: 0 },
      { state: 1, stability: 0.5 },
      { state: 1, stability: 1 },
      { state: undefined },
    ];
    expect(recommendVocabStage(words)).toBe('learn');
  });

  it('returns flashcard when most words are learning/young review', () => {
    const words = [
      { state: 1, stability: 0.5 },
      { state: 1, stability: 1 },
      { state: 2, stability: 2 },
      { state: 2, stability: 3 },
      { state: 2, stability: 4 },
    ];
    expect(recommendVocabStage(words)).toBe('flashcard');
  });

  it('returns test when 60%+ of reviewable words are mature', () => {
    const words = [
      { state: 2, stability: 30 },
      { state: 2, stability: 14 },
      { state: 2, stability: 21 },
      { state: 2, stability: 8 },
      { state: 1, stability: 1 },
    ];
    expect(recommendVocabStage(words)).toBe('test');
  });

  it('treats mastered words as out-of-pool and returns test when only mastered remain', () => {
    const words = [{ mastered: true }, { mastered: true }];
    expect(recommendVocabStage(words)).toBe('test');
  });

  it('still returns learn when many NEW even if some mastered', () => {
    const words = [
      { mastered: true },
      { state: 0 },
      { state: 0 },
      { state: 0 },
      { state: 1, stability: 1 },
    ];
    expect(recommendVocabStage(words)).toBe('learn');
  });
});
