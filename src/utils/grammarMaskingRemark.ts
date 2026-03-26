import {
  GRAMMAR_MASK_ANSWER_TOKEN,
  GRAMMAR_MASK_TRANSLATION_END_TOKEN,
  GRAMMAR_MASK_TRANSLATION_START_TOKEN,
  GRAMMAR_MASK_TRANSLATION_TOKEN,
} from './grammarDisplaySanitizer';

type MarkdownNode = {
  type: string;
  depth?: number;
  value?: string;
  ordered?: boolean;
  data?: {
    hProperties?: Record<string, unknown>;
  };
  children?: MarkdownNode[];
};

type SectionMode = 'default' | 'example' | 'quiz';

const HANGUL_RE = /[\u3131-\u318E\uAC00-\uD7A3]/;
const HAN_RE = /\p{Script=Han}/u;
const LATIN_RE = /[A-Za-z]/;
const KOREAN_SENTENCE_END_RE =
  /(?:요|다|까|죠|네|나요|습니다|어요|아요|였다|이었다|입니다|인가요|군요|겠어요|려나|을까요|ㄹ까요)[.!?。！？]?\s*$/u;
const EXAMPLE_SECTION_HEADING_RE =
  /^(?:\d+\.\s*)?(?:语境示例|例句|示例|context examples?|usage examples?|example sentences?|examples?)\s*$/i;
const QUIZ_SECTION_HEADING_RE =
  /^(?:\d+\.\s*)?(?:快速复习测验|练习测验|实战演练|quick review quiz(?:zes)?|practice quiz(?:zes)?)\s*$/i;
const EXPLICIT_EXAMPLE_PREFIX_RE = /(?:^|[\s>*-])(?:例[:：]|示例[:：]|example[:：])\s*/i;
const DIALOGUE_RE = /^\s*[A-Za-z가-힣ㄱ-ㅎㅏ-ㅣ]\s*:\s*/;
const INLINE_TRANSLATION_PAREN_RE =
  /([（(][^()\n\r]*(?:\p{Script=Han}|[A-Za-z])[^()\n\r]*[）)])\s*$/u;
const ANSWER_LABEL_RE =
  /^(?:参考答案|测验参考答案|示例答案|答案|改正|修正|reference answers?|answers?|correction|correct answer)\s*[:：]?/i;

function getNodeText(node?: MarkdownNode | null): string {
  if (!node) return '';
  if (node.type === 'text') return node.value || '';
  return (node.children || []).map(child => getNodeText(child)).join('');
}

function stripFormatting(input: string): string {
  return input
    .replace(/\*{1,2}/g, '')
    .replace(/`+/g, '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .trim();
}

function stripExampleLead(input: string): string {
  return stripFormatting(input)
    .replace(EXPLICIT_EXAMPLE_PREFIX_RE, '')
    .replace(/^[A-Za-z]\s*:\s*/i, '')
    .trim();
}

function isTranslationOnlyText(input: string): boolean {
  const clean = stripFormatting(input)
    .replace(/^[（(]\s*/, '')
    .replace(/\s*[）)]$/, '')
    .trim();
  if (!clean || HANGUL_RE.test(clean)) return false;
  return HAN_RE.test(clean) || LATIN_RE.test(clean);
}

function isKoreanExampleText(input: string): boolean {
  const clean = stripExampleLead(input);
  const hangulChars = clean.match(/[\u3131-\u318E\uAC00-\uD7A3]/g) ?? [];
  if (hangulChars.length < 4) return false;
  return (
    DIALOGUE_RE.test(clean) || KOREAN_SENTENCE_END_RE.test(clean) || /[?!.。！？]$/.test(clean)
  );
}

function hasMaskToken(input: string): boolean {
  return (
    input.includes(GRAMMAR_MASK_TRANSLATION_TOKEN) ||
    input.includes(GRAMMAR_MASK_TRANSLATION_START_TOKEN) ||
    input.includes(GRAMMAR_MASK_ANSWER_TOKEN)
  );
}

function markNodeMask(node: MarkdownNode, kind: 'translation' | 'answer'): void {
  node.data = node.data || {};
  node.data.hProperties = node.data.hProperties || {};
  node.data.hProperties['data-grammar-mask'] = kind;
}

function splitTrailingTranslationInValue(
  value: string
): { leading: string; translation: string } | null {
  const punctuationMatch = value.match(/^(.*?[?!.。！？])(\s+)(.+)$/u);
  if (
    punctuationMatch &&
    isKoreanExampleText(punctuationMatch[1]) &&
    isTranslationOnlyText(punctuationMatch[3])
  ) {
    return {
      leading: `${punctuationMatch[1]}${punctuationMatch[2]}`,
      translation: punctuationMatch[3],
    };
  }

  const endingMatch = value.match(
    /^(.*?(?:요|다|까|죠|네|나요|습니다|어요|아요|려나|입니다|인가요))(\s+)(.+)$/u
  );
  if (endingMatch && isKoreanExampleText(endingMatch[1]) && isTranslationOnlyText(endingMatch[3])) {
    return {
      leading: `${endingMatch[1]}${endingMatch[2]}`,
      translation: endingMatch[3],
    };
  }

  return null;
}

function maskInlineTranslationInParagraph(paragraph: MarkdownNode): void {
  const children = paragraph.children || [];
  let seenExampleLead = false;

  for (const child of children) {
    const childText = getNodeText(child);
    if (!childText || hasMaskToken(childText)) {
      if (isKoreanExampleText(childText)) seenExampleLead = true;
      continue;
    }

    if (child.type === 'text') {
      const raw = child.value || '';

      if (seenExampleLead && isTranslationOnlyText(raw)) {
        child.value = `${GRAMMAR_MASK_TRANSLATION_START_TOKEN}${raw}${GRAMMAR_MASK_TRANSLATION_END_TOKEN}`;
        continue;
      }

      const parentheticalMatch = raw.match(INLINE_TRANSLATION_PAREN_RE);
      if (
        parentheticalMatch &&
        parentheticalMatch[1] &&
        seenExampleLead &&
        isTranslationOnlyText(parentheticalMatch[1])
      ) {
        const translation = parentheticalMatch[1];
        const startIndex = raw.lastIndexOf(translation);
        if (startIndex >= 0) {
          child.value =
            raw.slice(0, startIndex) +
            GRAMMAR_MASK_TRANSLATION_START_TOKEN +
            translation +
            GRAMMAR_MASK_TRANSLATION_END_TOKEN +
            raw.slice(startIndex + translation.length);
          continue;
        }
      }

      const split = splitTrailingTranslationInValue(raw);
      if (split) {
        child.value =
          split.leading +
          GRAMMAR_MASK_TRANSLATION_START_TOKEN +
          split.translation +
          GRAMMAR_MASK_TRANSLATION_END_TOKEN;
        seenExampleLead = true;
        continue;
      }
    }

    if (isKoreanExampleText(childText)) {
      seenExampleLead = true;
    }
  }
}

function classifyHeading(text: string, depth: number, current: SectionMode): SectionMode {
  const clean = stripFormatting(text).trim();
  if (EXAMPLE_SECTION_HEADING_RE.test(clean)) return 'example';
  if (QUIZ_SECTION_HEADING_RE.test(clean)) return 'quiz';
  if (depth <= 2) return 'default';
  return current;
}

function processListItem(item: MarkdownNode, section: SectionMode): void {
  const children = item.children || [];
  const firstParagraph = children.find(child => child.type === 'paragraph');
  const firstParagraphText = getNodeText(firstParagraph);
  const exampleContext =
    section === 'example' || EXPLICIT_EXAMPLE_PREFIX_RE.test(stripFormatting(firstParagraphText));
  const exampleLead = exampleContext && isKoreanExampleText(firstParagraphText);

  if (firstParagraph && exampleContext) {
    maskInlineTranslationInParagraph(firstParagraph);
  }

  for (const child of children) {
    if (child === firstParagraph) continue;

    if (child.type === 'paragraph') {
      const text = getNodeText(child);
      if (exampleLead && isTranslationOnlyText(text) && !hasMaskToken(text)) {
        markNodeMask(child, 'translation');
      }
      continue;
    }

    if (child.type === 'list') {
      for (const nestedItem of child.children || []) {
        const nestedText = getNodeText(nestedItem);
        if (exampleLead && isTranslationOnlyText(nestedText) && !hasMaskToken(nestedText)) {
          markNodeMask(nestedItem, 'translation');
          continue;
        }
        processListItem(nestedItem, section);
      }
      continue;
    }

    if (child.children) {
      processContainer(child.children, section);
    }
  }
}

function processList(listNode: MarkdownNode, section: SectionMode): void {
  const items = listNode.children || [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    processListItem(item, section);

    if (section !== 'example') continue;

    const currentText = getNodeText(item);
    if (!isKoreanExampleText(currentText)) continue;

    const nextItem = items[index + 1];
    if (!nextItem) continue;
    const nextText = getNodeText(nextItem);
    if (!isTranslationOnlyText(nextText) || hasMaskToken(nextText)) continue;

    markNodeMask(nextItem, 'translation');
  }
}

function processContainer(children: MarkdownNode[], inheritedSection: SectionMode): void {
  let currentSection = inheritedSection;

  for (const child of children) {
    if (child.type === 'heading') {
      currentSection = classifyHeading(getNodeText(child), child.depth || 6, currentSection);
      continue;
    }

    if (child.type === 'paragraph') {
      const text = getNodeText(child);
      if (
        (currentSection === 'example' || EXPLICIT_EXAMPLE_PREFIX_RE.test(stripFormatting(text))) &&
        !ANSWER_LABEL_RE.test(stripFormatting(text))
      ) {
        maskInlineTranslationInParagraph(child);
      }
      continue;
    }

    if (child.type === 'list') {
      processList(child, currentSection);
      continue;
    }

    if (child.children) {
      processContainer(child.children, currentSection);
    }
  }
}

export function remarkGrammarMasking() {
  return (tree: MarkdownNode) => {
    processContainer(tree.children || [], 'default');
  };
}
