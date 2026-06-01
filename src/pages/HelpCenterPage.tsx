import React, { useMemo, useState } from 'react';
import { ArrowRight, BookOpen, Search } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { SEO as Seo } from '../seo/SEO';
import { getRouteMeta } from '../seo/publicRoutes';
import { LocalizedLink } from '../components/LocalizedLink';
import { useAuth } from '../contexts/AuthContext';
import { useCurrentLanguage } from '../hooks/useLocalizedNavigate';
import {
  getHelpCenterContent,
  type HelpCenterEntry,
  type HelpSectionId,
} from '../help/helpContent';

const SITE_URL = 'https://koreanstudy.me';

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

function entryMatchesQuery(entry: HelpCenterEntry, query: string): boolean {
  if (!query) return true;
  const searchable = [
    entry.title,
    entry.summary,
    entry.marker,
    ...entry.whenToUse,
    ...entry.quickStart,
    ...entry.keywords,
  ]
    .join(' ')
    .toLowerCase();

  return searchable.includes(query);
}

const HelpCenterPage: React.FC = () => {
  const language = useCurrentLanguage();
  const location = useLocation();
  const { user } = useAuth();
  const content = getHelpCenterContent(language);
  const meta = getRouteMeta(location.pathname);
  const [query, setQuery] = useState('');
  const [activeSection, setActiveSection] = useState<HelpSectionId | 'all'>('all');
  const normalizedQuery = normalizeSearch(query);

  const filteredEntries = useMemo(
    () =>
      content.entries.filter(entry => {
        const sectionMatches = activeSection === 'all' || entry.sectionId === activeSection;
        return sectionMatches && entryMatchesQuery(entry, normalizedQuery);
      }),
    [activeSection, content.entries, normalizedQuery]
  );

  const helpJsonLd = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: content.faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    }),
    [content.faqs]
  );

  const primaryCta = user
    ? content.hero.primaryCta
    : {
        ...content.hero.primaryCta,
        to: '/register' as const,
      };

  return (
    <div className="min-h-screen bg-[#f8f1e7] text-[#1f1b17]">
      <Seo
        title={meta.title}
        description={meta.description}
        keywords={meta.keywords}
        noIndex={meta.noIndex}
      />
      <link rel="canonical" href={`${SITE_URL}${meta.canonicalPath || location.pathname}`} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(helpJsonLd) }}
      />

      <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
        <section className="relative overflow-hidden rounded-[2rem] border border-[#e7d8c2] bg-[#fffaf1] p-6 shadow-[0_24px_70px_rgba(74,52,34,0.12)] sm:p-10 lg:p-12">
          <div className="absolute right-[-4rem] top-[-5rem] h-56 w-56 rounded-full bg-[#d24b3d]/15 blur-3xl" />
          <div className="absolute bottom-[-5rem] left-[20%] h-52 w-52 rounded-full bg-[#d6a84d]/20 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#d8c7ac] bg-white/75 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-[#9a463b]">
                <BookOpen className="h-3.5 w-3.5" />
                {content.hero.eyebrow}
              </div>
              <h1 className="mt-5 max-w-4xl text-4xl font-black leading-[0.98] tracking-[-0.05em] sm:text-5xl lg:text-7xl">
                {content.hero.title}
              </h1>
              <p className="mt-5 max-w-2xl text-base font-medium leading-8 text-[#6f6254] sm:text-lg">
                {content.hero.description}
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <LocalizedLink
                  to={primaryCta.to}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1f1b17] px-5 py-3 text-sm font-black text-[#fffaf1] transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  {primaryCta.label}
                  <ArrowRight className="h-4 w-4" />
                </LocalizedLink>
                <LocalizedLink
                  to={content.hero.secondaryCta.to}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#d8c7ac] bg-white/70 px-5 py-3 text-sm font-black text-[#1f1b17] transition hover:-translate-y-0.5 hover:bg-white"
                >
                  {content.hero.secondaryCta.label}
                </LocalizedLink>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-[#e0cfb5] bg-white/80 p-4 shadow-[0_18px_50px_rgba(55,38,24,0.10)]">
              <label className="flex items-center gap-3 rounded-2xl border border-[#e4d4bd] bg-[#fbf5ea] px-4 py-3">
                <Search className="h-5 w-5 text-[#9a463b]" />
                <input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder={content.hero.searchPlaceholder}
                  className="min-w-0 flex-1 bg-transparent text-sm font-bold text-[#1f1b17] outline-none placeholder:text-[#988a7a]"
                />
              </label>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSection('all')}
                  className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
                    activeSection === 'all'
                      ? 'bg-[#1f1b17] text-[#fffaf1]'
                      : 'bg-[#f1e5d3] text-[#6f6254] hover:bg-[#e7d8c2]'
                  }`}
                >
                  {content.hero.allSectionsLabel}
                </button>
                {content.sections.map(section => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-black transition ${
                      activeSection === section.id
                        ? 'bg-[#1f1b17] text-[#fffaf1]'
                        : 'bg-[#f1e5d3] text-[#6f6254] hover:bg-[#e7d8c2]'
                    }`}
                  >
                    {section.title}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {content.learningPaths.map(path => (
            <article
              key={path.title}
              className="rounded-[1.5rem] border border-[#e1d1ba] bg-[#fffaf1] p-5 shadow-[0_14px_45px_rgba(74,52,34,0.08)]"
            >
              <div className="text-xs font-black uppercase tracking-[0.2em] text-[#9a463b]">
                {content.labels.learningPaths}
              </div>
              <h2 className="mt-2 text-xl font-black tracking-[-0.03em]">{path.title}</h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#776a5d]">
                {path.description}
              </p>
              <ol className="mt-4 space-y-2">
                {path.steps.map((step, index) => (
                  <li key={step} className="flex gap-3 text-sm font-bold leading-6 text-[#3b332c]">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#1f1b17] text-[11px] text-[#fffaf1]">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </article>
          ))}
        </section>

        <section>
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.22em] text-[#9a463b]">
                {content.labels.featureMap}
              </div>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.04em]">
                {filteredEntries.length} {content.labels.resultsCount}
              </h2>
            </div>
          </div>

          {filteredEntries.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-[#cbb99f] bg-[#fffaf1] p-8 text-center">
              <h3 className="text-xl font-black">{content.emptyState.title}</h3>
              <p className="mt-2 text-sm font-semibold text-[#776a5d]">
                {content.emptyState.description}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredEntries.map(entry => (
                <article
                  key={entry.id}
                  className="flex min-h-[420px] flex-col rounded-[1.5rem] border border-[#e1d1ba] bg-[#fffaf1] p-5 shadow-[0_14px_45px_rgba(74,52,34,0.08)]"
                >
                  <div className="flex items-start gap-4">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#9a463b] font-serif text-xl font-medium text-[#fffaf1] shadow-inner">
                      {entry.marker}
                    </div>
                    <div>
                      <h3 className="text-xl font-black tracking-[-0.03em]">{entry.title}</h3>
                      <p className="mt-2 text-sm font-semibold leading-6 text-[#776a5d]">
                        {entry.summary}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-[0.18em] text-[#9a463b]">
                        {content.labels.whenToUse}
                      </h4>
                      <ul className="mt-2 space-y-1.5">
                        {entry.whenToUse.map(item => (
                          <li key={item} className="text-sm font-semibold leading-6 text-[#4d4339]">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-[0.18em] text-[#9a463b]">
                        {content.labels.quickStart}
                      </h4>
                      <ol className="mt-2 space-y-1.5">
                        {entry.quickStart.map((item, index) => (
                          <li key={item} className="text-sm font-semibold leading-6 text-[#4d4339]">
                            {index + 1}. {item}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  <LocalizedLink
                    to={entry.cta.to}
                    className="mt-auto inline-flex items-center justify-between rounded-2xl border border-[#d8c7ac] bg-white/70 px-4 py-3 text-sm font-black text-[#1f1b17] transition hover:bg-white"
                  >
                    {entry.cta.label || content.labels.openFeature}
                    <ArrowRight className="h-4 w-4" />
                  </LocalizedLink>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-[1.75rem] border border-[#e1d1ba] bg-[#fffaf1] p-6 shadow-[0_18px_50px_rgba(74,52,34,0.08)] sm:p-8">
          <div className="text-xs font-black uppercase tracking-[0.22em] text-[#9a463b]">
            {content.labels.faq}
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {content.faqs.map(faq => (
              <article key={faq.question} className="rounded-2xl bg-[#f6ead8] p-5">
                <h3 className="text-base font-black leading-6">{faq.question}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#6f6254]">{faq.answer}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default HelpCenterPage;
