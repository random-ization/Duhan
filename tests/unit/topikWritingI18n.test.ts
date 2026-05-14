import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type LocaleCode = 'zh' | 'en' | 'vi' | 'mn';
type SectionName = 'session' | 'report';

type StringMap = Record<string, string>;

interface TopikWritingLocale {
  session: StringMap;
  report: StringMap;
}

interface AppLocale {
  topikWriting: TopikWritingLocale;
  wongojiEditor: StringMap;
}

const REQUIRED_SESSION_KEYS = [
  'answerArea',
  'answerProgress',
  'collapseImage',
  'desktopQuestionMeta',
  'desktopAnswerSummaryFillCompact',
  'desktopPromptBoardLong',
  'desktopPromptBoardShort',
  'desktopWorkspaceSummaryLong',
  'desktopWorkspaceSummaryShort',
  'desktopWorkspaceTitle',
  'expandImage',
  'promptBoard',
  'quickChecks',
  'responseSlots',
  'shortFormMode',
  'writingSheet',
] as const;

const REQUIRED_REPORT_KEYS = [
  'aiCorrected',
  'aiDone',
  'dimLanguage',
  'dimScores',
  'dimStructure',
  'dimTask',
  'dimWongoji',
  'evaluatingDesc',
  'evaluatingShort',
  'evaluatingTitle',
  'feedback',
  'loading',
  'loadingError',
  'maxScore',
  'noCorrection',
  'notAnswered',
  'originalText',
  'overallAnalysis',
  'passExcellent',
  'passGood',
  'passNeedsWork',
  'questionFeedback',
  'retrigger',
  'retriggerCooldown',
  'retriggering',
  'retryFailed',
  'scoreLabel',
  'status',
  'subtitle',
  'timeElapsed',
  'timeFormat',
  'title',
  'totalScore',
] as const;

const REQUIRED_WONGOJI_KEYS = ['lineStatus', 'row', 'column', 'mobileHint', 'perLine'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringMap(value: unknown): value is StringMap {
  if (!isRecord(value)) return false;
  return Object.values(value).every(entry => typeof entry === 'string');
}

function parseLocale(locale: LocaleCode): AppLocale {
  const filePath = resolve(process.cwd(), `public/locales/${locale}/app.json`);
  const raw = JSON.parse(readFileSync(filePath, 'utf8')) as unknown;

  if (!isRecord(raw)) {
    throw new Error(`Locale ${locale} is not an object`);
  }

  const topikWriting = raw.topikWriting;
  const wongojiEditor = raw.wongojiEditor;
  if (!isRecord(topikWriting)) {
    throw new Error(`Locale ${locale} is missing topikWriting`);
  }

  const session = topikWriting.session;
  const report = topikWriting.report;
  if (!isStringMap(session) || !isStringMap(report) || !isStringMap(wongojiEditor)) {
    throw new Error(`Locale ${locale} has invalid topikWriting sections`);
  }

  return {
    topikWriting: {
      session,
      report,
    },
    wongojiEditor,
  };
}

function expectKeys(locale: LocaleCode, sectionName: SectionName, keys: readonly string[]): void {
  const localeData = parseLocale(locale);
  const section = localeData.topikWriting[sectionName];

  for (const key of keys) {
    expect(section[key], `${locale}.${sectionName}.${key}`).toBeTruthy();
  }
}

describe('topikWriting locale coverage', () => {
  const locales: LocaleCode[] = ['zh', 'en', 'vi', 'mn'];

  for (const locale of locales) {
    it(`includes desktop writing session keys for ${locale}`, () => {
      expectKeys(locale, 'session', REQUIRED_SESSION_KEYS);
    });

    it(`includes writing report keys for ${locale}`, () => {
      expectKeys(locale, 'report', REQUIRED_REPORT_KEYS);
    });

    it(`includes wongoji editor keys for ${locale}`, () => {
      const localeData = parseLocale(locale);
      for (const key of REQUIRED_WONGOJI_KEYS) {
        expect(localeData.wongojiEditor[key], `${locale}.wongojiEditor.${key}`).toBeTruthy();
      }
    });
  }
});
