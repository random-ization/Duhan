import { describe, expect, it } from 'vitest';

import {
  buildLearningModulePath,
  buildLearningPickerPath,
  normalizeLearningFlowModule,
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
});
