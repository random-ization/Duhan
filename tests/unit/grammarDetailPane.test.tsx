import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';

import GrammarDetailPane from '../../src/components/grammar/GrammarDetailPane';
import type { GrammarPointData } from '../../src/types';
import { sanitizeGrammarMarkdown } from '../../src/utils/grammarDisplaySanitizer';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
    i18n: { language: 'en' },
  }),
}));

describe('GrammarDetailPane reader rendering', () => {
  const markdownGrammar: GrammarPointData = {
    id: 'g1',
    title: '~하는 것 같다',
    titleEn: '~(it) seems',
    summary: 'summary',
    summaryEn: '(guessing / supposition)',
    type: 'ENDING',
    level: 'TOPIK 2',
    explanation: `
# Korean Grammar Point: ~(it) seems [it seems] (guessing / supposition)

This is a quoted learning tip.

## Core
> This is a quoted learning tip.

### Structure

\`\`\`
[stem] + -기에
\`\`\`

| Form | Meaning |
| --- | --- |
| -기에 | because |

### Context examples
- **하늘을 보니 곧 눈이 올 것 같아요.** (看天色，好像马上要下雪了。)

### Quick review quiz
1. Translate: "That person seems to be a teacher."
   - **Answer:** 그 사람은 선생님인 것 같아요.
2. 给动词 마시다（喝）构成 ~는지 结构。 答案：마시는지
3. **构成 보다（看）的敬语将来时。**
   **答案**：보**실 거예요**

## Intro
것 (thing / fact) and 같다 (similar) stay visible in explanations.

## Comparison
- **~나 보다**: leans on visible evidence (often used for direct observation).

## Formal
1. **저 건물이 정말 높아 보입니다.**
   - 那座建筑看起来真的很高。

## Example
1. **친구가 아직 집에 있으려나?** 不知道朋友还在不在家。
- **나는 주말에 집에 있는 편이에요.**
- *我周末一般主观倾向于待在家里。*

## Nested Example
1. **친구가 아직 집에 있으려나?**
   *不知道朋友还在不在家。*
`,
    explanationEn: `
# Korean Grammar Point: ~(it) seems [it seems] (guessing / supposition)

This is a quoted learning tip.

## Core
> This is a quoted learning tip.

### Structure

\`\`\`
[stem] + -기에
\`\`\`

| Form | Meaning |
| --- | --- |
| -기에 | because |

### Context examples
- **하늘을 보니 곧 눈이 올 것 같아요.** (看天色，好像马上要下雪了。)

### Quick review quiz
1. Translate: "That person seems to be a teacher."
   - **Answer:** 그 사람은 선생님인 것 같아요.
2. 给动词 마시다（喝）构成 ~는지 结构。 答案：마시는지
3. **构成 보다（看）的敬语将来时。**
   **答案**：보**실 거예요**

## Intro
것 (thing / fact) and 같다 (similar) stay visible in explanations.

## Comparison
- **~나 보다**: leans on visible evidence (often used for direct observation).

## Formal
1. **저 건물이 정말 높아 보입니다.**
   - 那座建筑看起来真的很高。

## Example
1. **친구가 아직 집에 있으려나?** 不知道朋友还在不在家。
- **나는 주말에 집에 있는 편이에요.**
- *我周末一般主观倾向于待在家里。*

## Nested Example
1. **친구가 아직 집에 있으려나?**
   *不知道朋友还在不在家。*
`,
    examples: [],
    construction: {},
    conjugationRules: {},
    sections: undefined,
    quizItems: [],
    status: 'LEARNING',
    proficiency: 50,
  };

  const fallbackGrammar: GrammarPointData = {
    id: 'g2',
    title: '~하기에',
    titleEn: '~because of',
    summary: '因为',
    summaryEn: 'because / due to',
    type: 'CONNECTIVE',
    level: 'TOPIK 3',
    explanation: '',
    explanationEn: '',
    examples: [
      {
        kr: '늦었기에 바로 택시를 탔어요.',
        cn: '因为迟到了，所以马上打车了。',
        en: 'Because I was late, I took a taxi right away.',
      },
    ],
    construction: {
      'Verb stem': '-기에',
    },
    conjugationRules: {},
    sections: undefined,
    quizItems: [
      {
        prompt: { en: 'Fill in the connector.' },
        answer: { en: '-기에' },
      },
    ],
    customNoteEn: 'Use this more often in written or formal speech.',
    status: 'LEARNING',
    proficiency: 50,
  };

  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders a standardized hero, de-duplicates the first markdown h1, and styles markdown blocks', () => {
    render(<GrammarDetailPane grammar={markdownGrammar} hasNext={false} hasPrev={false} />);

    expect(screen.getByTestId('grammar-reader-hero')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1, name: '~(it) seems' })).toHaveLength(1);

    const quote = screen
      .getAllByText('This is a quoted learning tip.')
      .find(node => node.closest('blockquote'))
      ?.closest('blockquote');
    expect(quote).toBeInTheDocument();
    expect(quote?.className).toContain('border-l-4');

    const tableCell = screen.getByText('-기에');
    const tableContainer = tableCell.closest('table')?.parentElement;
    expect(tableContainer).toBeInTheDocument();
    expect(tableContainer?.className).toContain('rounded-2xl');

    const codeBlock = screen.getByText('[stem] + -기에').closest('pre');
    expect(codeBlock).toBeInTheDocument();
    expect(codeBlock?.className).toContain('bg-gradient-to-br');
  });

  it('supports four reader font scales and persists the selected scale locally', () => {
    render(<GrammarDetailPane grammar={markdownGrammar} hasNext={false} hasPrev={false} />);

    const readerShell = screen.getByTestId('grammar-reader-shell');
    expect(readerShell).toHaveAttribute('data-font-scale', 'compact');

    fireEvent.click(screen.getByRole('button', { name: 'Font size' }));
    const largeScaleButton = screen.getByRole('button', { name: 'Font size: Large' });
    fireEvent.click(largeScaleButton);

    expect(readerShell).toHaveAttribute('data-font-scale', 'large');
    expect(window.localStorage.getItem('grammar_reader_font_scale')).toBe('large');
  });

  it('toggles red eye mode to mask example translations and quiz answers', () => {
    render(<GrammarDetailPane grammar={fallbackGrammar} hasNext hasPrev />);

    const redEyeButton = screen.getByRole('button', { name: 'Red eye mode' });
    fireEvent.click(redEyeButton);

    expect(screen.getByTestId('grammar-reader-shell')).toHaveAttribute('data-red-eye', 'on');
    expect(screen.getByTestId('grammar-example-translation-0').className).toContain('blur-sm');
    expect(screen.getByTestId('grammar-quiz-answer-0').className).toContain('blur-sm');
    expect(window.localStorage.getItem('grammar_reader_red_eye')).toBe('1');
  });

  it('masks markdown quiz answers in red eye mode and opens font controls from the T trigger', () => {
    render(<GrammarDetailPane grammar={markdownGrammar} hasNext={false} hasPrev={false} />);

    fireEvent.click(screen.getByRole('button', { name: 'Font size' }));
    fireEvent.click(screen.getByRole('button', { name: 'Font size: Large' }));
    expect(screen.getByTestId('grammar-reader-shell')).toHaveAttribute('data-font-scale', 'large');

    fireEvent.click(screen.getByRole('button', { name: 'Red eye mode' }));
    const answerMask = Array.from(
      document.querySelectorAll<HTMLElement>('[data-grammar-mask="answer"]')
    ).find(
      node =>
        node.className.includes('blur-sm') &&
        node.textContent?.includes('그 사람은 선생님인 것 같아요')
    );
    expect(answerMask).toBeInTheDocument();
    expect(answerMask?.className).toContain('blur-sm');
  });

  it('masks only the parenthetical translation in inline Korean example bullets', () => {
    render(<GrammarDetailPane grammar={markdownGrammar} hasNext={false} hasPrev={false} />);

    fireEvent.click(screen.getByRole('button', { name: 'Red eye mode' }));

    const koreanSentence = screen.getByText('하늘을 보니 곧 눈이 올 것 같아요.');
    expect(koreanSentence.className).not.toContain('blur-sm');

    const translationMask = Array.from(
      document.querySelectorAll<HTMLElement>('[data-grammar-mask="translation"]')
    ).find(
      node =>
        node.className.includes('blur-sm') &&
        node.textContent?.includes('(看天色，好像马上要下雪了。)')
    );
    expect(translationMask).toBeInTheDocument();
    expect(translationMask?.className).toContain('blur-sm');
  });

  it('does not mask quiz prompts, intro glosses, or comparison notes', () => {
    render(<GrammarDetailPane grammar={markdownGrammar} hasNext={false} hasPrev={false} />);

    fireEvent.click(screen.getByRole('button', { name: 'Red eye mode' }));

    const quizPromptNode = screen.getByText('Translate: "That person seems to be a teacher."');
    expect(quizPromptNode).toBeInTheDocument();
    expect(screen.getByText(/thing \/ fact/).className).not.toContain('blur-sm');
    expect(screen.getByText(/\(often used for direct observation\)\./).className).not.toContain(
      'blur-sm'
    );
    expect(screen.queryByText(/@@GRAMMAR_MASK_/)).not.toBeInTheDocument();
  });

  it('does not blur parent explanation list items when nested example translations are masked', () => {
    render(<GrammarDetailPane grammar={markdownGrammar} hasNext={false} hasPrev={false} />);

    fireEvent.click(screen.getByRole('button', { name: 'Red eye mode' }));

    const blurredMasks = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[data-grammar-mask="translation"], [data-grammar-mask="answer"]'
      )
    ).filter(node => node.className.includes('blur-sm'));

    expect(
      blurredMasks.some(
        node =>
          node.textContent?.includes('基于已有的信息或感觉') ||
          node.textContent?.includes('为了避免语气太武断')
      )
    ).toBe(false);
  });

  it('moves inline quiz answers onto their own masked line and masks nested translation bullets', () => {
    render(<GrammarDetailPane grammar={markdownGrammar} hasNext={false} hasPrev={false} />);

    fireEvent.click(screen.getByRole('button', { name: 'Red eye mode' }));

    expect(screen.getByText(/给动词 마시다/)).toBeInTheDocument();

    const splitAnswerMask = Array.from(
      document.querySelectorAll<HTMLElement>('[data-grammar-mask="answer"]')
    ).find(node => node.className.includes('blur-sm') && node.textContent?.includes('마시는지'));
    expect(splitAnswerMask).toBeInTheDocument();
    expect(splitAnswerMask?.className).toContain('blur-sm');

    const indentedAnswerMask = Array.from(
      document.querySelectorAll<HTMLElement>('[data-grammar-mask="answer"]')
    ).find(node => node.className.includes('blur-sm') && node.textContent?.includes('보실 거예요'));
    expect(indentedAnswerMask).toBeInTheDocument();
    expect(indentedAnswerMask?.className).toContain('blur-sm');
  });

  it('does not blur common mistakes and tips explanations in red eye mode', () => {
    const commonMistakesGrammar: GrammarPointData = {
      ...markdownGrammar,
      id: 'common-mistakes',
      explanation: `## 6. 常见错误与技巧

### 错误分析

1. **动词词干接法错误**
   - **错误：** 먹다 + 은지 -> 먹은지 ❌
   - 应该用 \`먹는지\`，因为动词现在时要接 \`-는지\`。`,
      explanationEn: `## 6. Common mistakes and tips

### Error analysis

1. **Verb stem attachment error**
   - **Wrong:** 먹다 + 은지 -> 먹은지 ❌
   - Use \`먹는지\` because present-tense verbs attach \`-는지\`.`,
    };

    render(<GrammarDetailPane grammar={commonMistakesGrammar} hasNext={false} hasPrev={false} />);

    fireEvent.click(screen.getByRole('button', { name: 'Red eye mode' }));

    const visibleExplanation = Array.from(
      document.querySelectorAll<HTMLElement>('li, p, div')
    ).find(node => node.textContent?.includes('present-tense verbs attach'));

    expect(visibleExplanation).toBeInTheDocument();
    expect(visibleExplanation?.className).not.toContain('blur-sm');
    expect(screen.queryByText(/@@GRAMMAR_MASK_/)).not.toBeInTheDocument();
  });

  it('masks trailing same-line example translations without hiding the korean sentence', () => {
    render(<GrammarDetailPane grammar={markdownGrammar} hasNext={false} hasPrev={false} />);

    fireEvent.click(screen.getByRole('button', { name: 'Red eye mode' }));

    screen.getAllByText('친구가 아직 집에 있으려나?').forEach(node => {
      expect(node.className).not.toContain('blur-sm');
    });

    const trailingTranslationMask = Array.from(
      document.querySelectorAll<HTMLElement>('[data-grammar-mask="translation"]')
    ).find(
      node =>
        node.className.includes('blur-sm') && node.textContent?.includes('不知道朋友还在不在家。')
    );
    expect(trailingTranslationMask).toBeInTheDocument();
    expect(trailingTranslationMask?.className).toContain('blur-sm');
  });

  it('masks indented italic translations beneath numbered examples without hiding the korean sentence', () => {
    render(<GrammarDetailPane grammar={markdownGrammar} hasNext={false} hasPrev={false} />);

    fireEvent.click(screen.getByRole('button', { name: 'Red eye mode' }));

    const italicTranslationMask = Array.from(
      document.querySelectorAll<HTMLElement>('[data-grammar-mask="translation"]')
    ).find(
      node =>
        node.className.includes('blur-sm') && node.textContent?.includes('不知道朋友还在不在家。')
    );

    expect(italicTranslationMask).toBeInTheDocument();
    expect(italicTranslationMask?.className).toContain('blur-sm');
  });

  it('masks sibling bullet translations inside example sections', () => {
    render(<GrammarDetailPane grammar={markdownGrammar} hasNext={false} hasPrev={false} />);

    fireEvent.click(screen.getByRole('button', { name: 'Red eye mode' }));

    const siblingTranslationMask = Array.from(
      document.querySelectorAll<HTMLElement>('[data-grammar-mask="translation"]')
    ).find(
      node =>
        node.className.includes('blur-sm') &&
        node.textContent?.includes('我周末一般主观倾向于待在家里。')
    );

    expect(siblingTranslationMask).toBeInTheDocument();
    expect(siblingTranslationMask?.className).toContain('blur-sm');
  });

  it('masks translations from the real ~(으)려나 markdown file in context examples', () => {
    const explanation = fs.readFileSync(
      '/Users/ryan/Documents/GitHub/语法/hanabira.org-japanese-content/markdown_grammar_korean_chinese/~(으)려나_(不知道会不会).md',
      'utf8'
    );

    const realFileGrammar: GrammarPointData = {
      ...markdownGrammar,
      id: 'real-ryeona',
      title: '~(으)려나',
      titleEn: '~(eu)ryeona',
      explanation,
      explanationEn: explanation,
    };

    const sanitized = sanitizeGrammarMarkdown(explanation);
    expect(sanitized).toContain('不知道朋友还在不在家。');

    render(<GrammarDetailPane grammar={realFileGrammar} hasNext={false} hasPrev={false} />);

    fireEvent.click(screen.getByRole('button', { name: 'Red eye mode' }));

    const translationMasks = Array.from(
      document.querySelectorAll<HTMLElement>('[data-grammar-mask="translation"]')
    );

    expect(translationMasks.length).toBeGreaterThan(0);
    expect(
      translationMasks.some(
        node =>
          node.className.includes('blur-sm') && /[\p{Script=Han}]/u.test(node.textContent || '')
      )
    ).toBe(true);
  });

  it('keeps legacy structured sections but renders them in the new reader shell', () => {
    render(<GrammarDetailPane grammar={fallbackGrammar} hasNext hasPrev />);

    expect(screen.getByTestId('grammar-reader-hero')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Conjugation rules' })
    ).toBeInTheDocument();
    expect(screen.getByText('Usage examples')).toBeInTheDocument();
    expect(screen.getByText('Practice quizzes')).toBeInTheDocument();
    expect(screen.getByText('Instructor note')).toBeInTheDocument();
    expect(screen.getByText('Because I was late, I took a taxi right away.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
  });
});
