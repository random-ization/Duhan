import { describe, expect, it } from 'vitest';
import { splitKoreanSentences } from '../../convex/contentImport/splitter';

describe('splitKoreanSentences', () => {
  it('keeps quoted punctuation attached to trailing reporting clauses', () => {
    expect(splitKoreanSentences('그는 "괜찮아요?"라고 물었다. 나는 "네!"라고 답했다.')).toEqual([
      '그는 "괜찮아요?"라고 물었다.',
      '나는 "네!"라고 답했다.',
    ]);
  });

  it('still splits regular punctuation-delimited sentences', () => {
    expect(splitKoreanSentences('오늘은 비가 온다. 내일은 맑을까? 같이 산책하자!')).toEqual([
      '오늘은 비가 온다.',
      '내일은 맑을까?',
      '같이 산책하자!',
    ]);
  });
});
