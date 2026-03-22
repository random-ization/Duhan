import { describe, expect, it } from 'vitest';

import {
  sanitizeGrammarDisplayText,
  sanitizeGrammarMarkdown,
} from '../../src/utils/grammarDisplaySanitizer';

describe('grammarDisplaySanitizer', () => {
  it('removes romanization brackets from display titles', () => {
    expect(
      sanitizeGrammarDisplayText('(으)ㄴ/는 편이다 [(eu)n/neun pyeonida] （算是、比较、偏向于）')
    ).toBe('(으)ㄴ/는 편이다 （算是、比较、偏向于）');
  });

  it('removes romanization brackets from markdown headings', () => {
    const input = '# (으)ㄴ/는 편이다 [(eu)n/neun pyeonida] （算是、比较、偏向于）\n\n## 1.简介';

    expect(sanitizeGrammarMarkdown(input)).toBe(
      '# (으)ㄴ/는 편이다 （算是、比较、偏向于）\n\n## 1.简介'
    );
  });
});
