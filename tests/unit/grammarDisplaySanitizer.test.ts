import { describe, expect, it } from 'vitest';

import {
  GRAMMAR_MASK_ANSWER_TOKEN,
  GRAMMAR_MASK_TRANSLATION_TOKEN,
  GRAMMAR_MASK_TRANSLATION_END_TOKEN,
  GRAMMAR_MASK_TRANSLATION_START_TOKEN,
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

  it('keeps quiz answers separated and moves Chinese translation after the Korean prompt', () => {
    const input = `### 快速复习测验
1. **填空：**
   "你知道明天会不会下雨吗？"
   **내일 비가 _____ 알아요?**
2. **选择正确的句子：**
   a) **그 사람이 누구인지 몰라요.**
   b) **그 사람이 누구는지 몰라요.**
**参考答案：**
1. **내일 비가** 오는지 **알아요?**
2. a) **그 사람이 누구인지 몰라요.**`;

    expect(sanitizeGrammarMarkdown(input)).toBe(`### 快速复习测验
1. **填空：**
   **내일 비가 _____ 알아요?**
   "你知道明天会不会下雨吗？"
2. **选择正确的句子：**
   a) **그 사람이 누구인지 몰라요.**
   b) **그 사람이 누구는지 몰라요.**

#### 参考答案

1. ${GRAMMAR_MASK_ANSWER_TOKEN}**내일 비가** 오는지 **알아요?**
2. ${GRAMMAR_MASK_ANSWER_TOKEN}a) **그 사람이 누구인지 몰라요.**`);
  });

  it('does not inject inline translation tokens into ordinary example lines', () => {
    const input = '- **하늘을 보니 곧 눈이 올 것 같아요.** (看天色，好像马上要下雪了。)';

    expect(sanitizeGrammarMarkdown(input)).toBe(input);
  });

  it('masks same-line translations inside example sections', () => {
    const input = `## 4. 语境示例

1. **친구가 아직 집에 있으려나?** 不知道朋友还在不在家。`;

    expect(sanitizeGrammarMarkdown(input)).toBe(`## 4. 语境示例

1. **친구가 아직 집에 있으려나?** ${GRAMMAR_MASK_TRANSLATION_START_TOKEN}不知道朋友还在不在家。${GRAMMAR_MASK_TRANSLATION_END_TOKEN}`);
  });

  it('masks explicit example-prefix parenthetical translations outside dedicated example sections', () => {
    const input = `### 含义与用法
- *例：비가 올 것 같아요.* (好像要下雨了。)`;

    expect(sanitizeGrammarMarkdown(input)).toBe(`### 含义与用法
- *例：비가 올 것 같아요.* ${GRAMMAR_MASK_TRANSLATION_START_TOKEN}(好像要下雨了。)${GRAMMAR_MASK_TRANSLATION_END_TOKEN}`);
  });

  it('does not mask explanatory grammar bullets that are not examples', () => {
    const input = `## 3. 对比分析
- **~나 보다**：侧重于基于**直接看到的证据**进行推理（如：看到外面的人打伞 -> 好像下雨了）。`;

    expect(sanitizeGrammarMarkdown(input)).toBe(input);
  });

  it('splits inline quiz answers onto a new masked line', () => {
    const input = `### 快速复习测验
1. 给动词 마시다（喝）构成 ~는지 结构。 答案：마시는지`;

    expect(sanitizeGrammarMarkdown(input)).toBe(`### 快速复习测验
1. 给动词 마시다（喝）构成 ~는지 结构。
   - ${GRAMMAR_MASK_ANSWER_TOKEN}答案： 마시는지`);
  });

  it('marks nested example translation bullets without affecting the korean prompt line', () => {
    const input = `## 4. 语境示例

1. **저 건물이 정말 높아 보입니다.**
   - 那座建筑看起来真的很高。`;

    expect(sanitizeGrammarMarkdown(input)).toBe(`## 4. 语境示例

1. **저 건물이 정말 높아 보입니다.**
   - ${GRAMMAR_MASK_TRANSLATION_TOKEN}那座建筑看起来真的很高。`);
  });

  it('marks indented italic translation lines beneath numbered examples', () => {
    const input = `## 4. 语境示例

1. **친구가 아직 집에 있으려나?**
   *不知道朋友还在不在家。*`;

    expect(sanitizeGrammarMarkdown(input)).toBe(`## 4. 语境示例

1. **친구가 아직 집에 있으려나?**
   ${GRAMMAR_MASK_TRANSLATION_TOKEN}*不知道朋友还在不在家。*`);
  });

  it('normalizes indented quiz answer lines into masked nested bullets', () => {
    const input = `### 快速复习测验
1. **构成 보다（看）的敬语将来时。**
   **答案**：보**실 거예요**`;

    expect(sanitizeGrammarMarkdown(input)).toBe(`### 快速复习测验
1. **构成 보다（看）的敬语将来时。**
   - ${GRAMMAR_MASK_ANSWER_TOKEN}**答案**：보**실 거예요**`);
  });

  it('does not mask nested explanatory lines outside example sections', () => {
    const input = `## 6. 常见错误与技巧

### 错误分析

1. **动词词干接法错误**
   - **错误：** 먹다 + 은지 -> 먹은지 ❌
   - 应该用 ${'`'}먹는지${'`'}，因为动词现在时要接 ${'`'}-는지${'`'}。`;

    expect(sanitizeGrammarMarkdown(input)).toBe(input);
  });
});
