import { describe, expect, it } from 'vitest';

import {
  HELP_CENTER_CONTENT_BY_LANGUAGE,
  HELP_CENTER_SUPPORTED_LANGUAGES,
  listHelpCenterEntries,
  listHelpCenterSections,
} from '../../src/help/helpContent';

const validRoutePrefixes = [
  '/',
  '/help',
  '/learn',
  '/login',
  '/register',
  '/dashboard',
  '/courses',
  '/course',
  '/vocab-book',
  '/grammar',
  '/typing',
  '/topik',
  '/media',
  '/reading',
  '/podcasts',
  '/videos',
  '/dictionary',
  '/notebook',
  '/review',
  '/community',
  '/profile',
  '/pricing',
  '/speaking',
  '/learning',
] as const;

describe('help center content catalog', () => {
  it('keeps the same section and entry ids across every supported language', () => {
    const [baseLanguage, ...otherLanguages] = HELP_CENTER_SUPPORTED_LANGUAGES;
    const baseSectionIds = listHelpCenterSections(baseLanguage).map(section => section.id);
    const baseEntryIds = listHelpCenterEntries(baseLanguage).map(entry => entry.id);

    for (const language of otherLanguages) {
      expect(listHelpCenterSections(language).map(section => section.id)).toEqual(baseSectionIds);
      expect(listHelpCenterEntries(language).map(entry => entry.id)).toEqual(baseEntryIds);
    }
  });

  it('requires complete searchable copy and valid local CTA targets', () => {
    for (const language of HELP_CENTER_SUPPORTED_LANGUAGES) {
      const content = HELP_CENTER_CONTENT_BY_LANGUAGE[language];
      expect(content.hero.title.trim()).not.toBe('');
      expect(content.hero.description.trim()).not.toBe('');

      for (const section of content.sections) {
        expect(section.title.trim()).not.toBe('');
        expect(section.description.trim()).not.toBe('');
      }

      for (const entry of content.entries) {
        expect(entry.title.trim()).not.toBe('');
        expect(entry.summary.trim()).not.toBe('');
        expect(entry.whenToUse.length).toBeGreaterThan(0);
        expect(entry.quickStart.length).toBeGreaterThan(0);
        expect(entry.keywords.length).toBeGreaterThan(0);
        expect(
          validRoutePrefixes.some(
            prefix => entry.cta.to === prefix || entry.cta.to.startsWith(`${prefix}/`)
          )
        ).toBe(true);
      }

      for (const path of content.learningPaths) {
        expect(path.title.trim()).not.toBe('');
        expect(path.steps.length).toBeGreaterThan(0);
      }

      for (const faq of content.faqs) {
        expect(faq.question.trim()).not.toBe('');
        expect(faq.answer.trim()).not.toBe('');
      }
    }
  });
});
