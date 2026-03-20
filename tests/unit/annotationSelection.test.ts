import { describe, expect, it } from 'vitest';
import {
  buildAnchorFromRange,
  classifySelectionKind,
} from '../../src/features/annotation-kit/utils/selection';

describe('buildAnchorFromRange', () => {
  it('computes stable offsets and quote from selection range', () => {
    const container = document.createElement('div');
    container.textContent = '안녕하세요. 반갑습니다.';
    document.body.appendChild(container);

    const textNode = container.firstChild as Text;
    const range = document.createRange();
    range.setStart(textNode, 6);
    range.setEnd(textNode, 12);

    const anchor = buildAnchorFromRange(range, container, 'Q1');
    expect(anchor).not.toBeNull();
    expect(anchor?.blockId).toBe('Q1');
    expect(anchor?.quote).toBe('반갑습니다');
    expect(anchor?.start).toBe(6);
    expect(anchor?.end).toBe(12);

    document.body.removeChild(container);
  });
});

describe('classifySelectionKind', () => {
  it('treats a single token as a word', () => {
    expect(classifySelectionKind('안녕하세요')).toBe('word');
  });

  it('treats a short multi-token selection as a phrase', () => {
    expect(classifySelectionKind('정말 좋아요')).toBe('phrase');
  });

  it('treats a punctuated clause as a sentence', () => {
    expect(classifySelectionKind('오늘은 날씨가 정말 좋네요.')).toBe('sentence');
  });
});
