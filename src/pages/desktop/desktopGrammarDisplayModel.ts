import type { GrammarPointData } from '../../types';
import { sanitizeGrammarDisplayText } from '../../utils/grammarDisplaySanitizer';
import { getLocalizedContent } from '../../utils/languageUtils';

type DisplayLanguage = 'EN' | 'VI' | 'MN';

type GrammarSectionKey =
  | 'introduction'
  | 'core'
  | 'comparative'
  | 'cultural'
  | 'commonMistakes'
  | 'review';

type GrammarSectionValue = NonNullable<
  NonNullable<GrammarPointData['sections']>[GrammarSectionKey]
>;

export interface DesktopGrammarExampleDisplay {
  kr: string;
  cn: string;
  en: string;
  vi: string;
  mn: string;
  hasAudio: boolean;
}

export interface DesktopGrammarLocalizedLine {
  label: DisplayLanguage;
  text: string;
}

export interface DesktopGrammarSectionDisplay {
  zh: string;
  en: string;
  vi: string;
  mn: string;
}

export interface DesktopGrammarQuizDisplay {
  prompt: string;
  answer: string;
}

export interface DesktopGrammarSourceMetaDisplay {
  label: string;
  value: string;
}

export type DesktopGrammarConjugationRules =
  | Record<string, string>
  | Array<Record<string, string> | string>
  | undefined;

export interface DesktopGrammarDisplayModel {
  title: string;
  summary: string;
  altSummaries: DesktopGrammarLocalizedLine[];
  conjugationRules: DesktopGrammarConjugationRules;
  examples: DesktopGrammarExampleDisplay[];
  sections: Record<GrammarSectionKey, DesktopGrammarSectionDisplay>;
  explanation: string;
  explanationEn: string;
  customNote: string;
  quizItems: DesktopGrammarQuizDisplay[];
  sourceMeta: DesktopGrammarSourceMetaDisplay[];
}

function toDisplayString(value: unknown): string {
  return typeof value === 'string' ? sanitizeGrammarDisplayText(value) : '';
}

function buildSectionDisplay(
  section: GrammarSectionValue | undefined
): DesktopGrammarSectionDisplay {
  return {
    zh: toDisplayString(section?.zh),
    en: toDisplayString(section?.en),
    vi: toDisplayString(section?.vi),
    mn: toDisplayString(section?.mn),
  };
}

function buildAltSummaries(grammar: GrammarPointData): DesktopGrammarLocalizedLine[] {
  const entries: DesktopGrammarLocalizedLine[] = [];

  const summaryEn = toDisplayString(grammar.summaryEn);
  if (summaryEn) {
    entries.push({ label: 'EN', text: summaryEn });
  }

  const summaryVi = toDisplayString(grammar.summaryVi);
  if (summaryVi) {
    entries.push({ label: 'VI', text: summaryVi });
  }

  const summaryMn = toDisplayString(grammar.summaryMn);
  if (summaryMn) {
    entries.push({ label: 'MN', text: summaryMn });
  }

  return entries;
}

function buildExamples(grammar: GrammarPointData): DesktopGrammarExampleDisplay[] {
  return grammar.examples.map(example => ({
    kr: toDisplayString(example.kr),
    cn: toDisplayString(example.cn),
    en: toDisplayString(example.en),
    vi: toDisplayString(example.vi),
    mn: toDisplayString(example.mn),
    hasAudio: typeof example.audio === 'string' && example.audio.trim().length > 0,
  }));
}

function buildQuizItems(grammar: GrammarPointData): DesktopGrammarQuizDisplay[] {
  return (grammar.quizItems ?? []).map(item => ({
    prompt: toDisplayString(item.prompt.zh ?? item.prompt.en ?? item.prompt.vi ?? item.prompt.mn),
    answer: toDisplayString(
      item.answer?.zh ?? item.answer?.en ?? item.answer?.vi ?? item.answer?.mn
    ),
  }));
}

function buildSourceMeta(grammar: GrammarPointData): DesktopGrammarSourceMetaDisplay[] {
  const sourceMeta = grammar.sourceMeta;
  if (!sourceMeta) {
    return [];
  }

  const entries: DesktopGrammarSourceMetaDisplay[] = [];
  if (sourceMeta.sourceType) {
    entries.push({ label: '类型', value: sourceMeta.sourceType });
  }
  if (sourceMeta.grammarKey) {
    entries.push({ label: '标识', value: sourceMeta.grammarKey });
  }
  if (sourceMeta.sourceLanguage) {
    entries.push({ label: '源语言', value: sourceMeta.sourceLanguage });
  }
  if (sourceMeta.categoryStatus) {
    entries.push({ label: '分类', value: sourceMeta.categoryStatus });
  }
  if (sourceMeta.categoryConfidence != null) {
    entries.push({
      label: '置信度',
      value: `${Math.round(sourceMeta.categoryConfidence * 100)}%`,
    });
  }
  if (sourceMeta.importedAt) {
    entries.push({
      label: '导入时间',
      value: new Date(sourceMeta.importedAt).toLocaleDateString('zh-CN'),
    });
  }

  return entries;
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every(entry => typeof entry === 'string');
}

function normalizeConjugationRules(value: unknown): DesktopGrammarConjugationRules {
  if (Array.isArray(value)) {
    const normalized: Array<Record<string, string> | string> = [];

    value.forEach(item => {
      if (typeof item === 'string') {
        if (item.trim().length > 0) {
          normalized.push(item);
        }
        return;
      }
      if (isStringRecord(item)) {
        normalized.push(item);
      }
    });

    return normalized.length > 0 ? normalized : undefined;
  }

  if (isStringRecord(value)) {
    return value;
  }

  return undefined;
}

export function buildDesktopGrammarDisplayModel(
  grammar: GrammarPointData | null,
  language: string
): DesktopGrammarDisplayModel {
  if (!grammar) {
    return {
      title: '',
      summary: '',
      altSummaries: [],
      conjugationRules: undefined,
      examples: [],
      sections: {
        introduction: buildSectionDisplay(undefined),
        core: buildSectionDisplay(undefined),
        comparative: buildSectionDisplay(undefined),
        cultural: buildSectionDisplay(undefined),
        commonMistakes: buildSectionDisplay(undefined),
        review: buildSectionDisplay(undefined),
      },
      explanation: '',
      explanationEn: '',
      customNote: '',
      quizItems: [],
      sourceMeta: [],
    };
  }

  return {
    title: sanitizeGrammarDisplayText(
      getLocalizedContent(grammar, 'title', language) || grammar.title
    ),
    summary: sanitizeGrammarDisplayText(
      getLocalizedContent(grammar, 'summary', language) || grammar.summary || ''
    ),
    altSummaries: buildAltSummaries(grammar),
    conjugationRules: normalizeConjugationRules(grammar.conjugationRules),
    examples: buildExamples(grammar),
    sections: {
      introduction: buildSectionDisplay(grammar.sections?.introduction),
      core: buildSectionDisplay(grammar.sections?.core),
      comparative: buildSectionDisplay(grammar.sections?.comparative),
      cultural: buildSectionDisplay(grammar.sections?.cultural),
      commonMistakes: buildSectionDisplay(grammar.sections?.commonMistakes),
      review: buildSectionDisplay(grammar.sections?.review),
    },
    explanation: toDisplayString(grammar.explanation),
    explanationEn: toDisplayString(grammar.explanationEn),
    customNote: toDisplayString(grammar.customNote),
    quizItems: buildQuizItems(grammar),
    sourceMeta: buildSourceMeta(grammar),
  };
}
