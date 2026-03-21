import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { BookOpen, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SEO as Seo } from '../seo/SEO';
import { getRouteMeta } from '../seo/publicRoutes';
import { LocalizedLink } from '../components/LocalizedLink';
import { Button } from '../components/ui';
import {
  getLearnHubContent,
  getLocalizedLearnGuide,
  hasLocalizedLearnGuide,
  listLearnGuides,
} from '../seo/learnGuides';
import { useCurrentLanguage } from '../hooks/useLocalizedNavigate';

const SITE_URL = 'https://koreanstudy.me';

const LearnHubPage: React.FC = () => {
  const { t } = useTranslation();
  const language = useCurrentLanguage();
  const location = useLocation();
  const meta = getRouteMeta(location.pathname);

  const hub = getLearnHubContent(language);
  const guides = listLearnGuides().map(guide => ({
    key: guide.key,
    path: guide.path,
    linkLanguage: hasLocalizedLearnGuide(guide.key, language) ? language : 'en',
    isLocalized: hasLocalizedLearnGuide(guide.key, language),
    content: getLocalizedLearnGuide(guide.key, language),
  }));

  const collectionJsonLd = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'CollectionPage',
          name: meta.title,
          description: meta.description,
          url: `${SITE_URL}${location.pathname}`,
          inLanguage: language,
          hasPart: guides.map(guide => ({
            '@type': 'Article',
            name: guide.content.title,
            description: guide.content.description,
            url: `${SITE_URL}/${guide.linkLanguage}${guide.path}`,
          })),
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            {
              '@type': 'ListItem',
              position: 1,
              name: t('home', { defaultValue: 'Home' }),
              item: `${SITE_URL}/${language}`,
            },
            {
              '@type': 'ListItem',
              position: 2,
              name: meta.title,
              item: `${SITE_URL}${location.pathname}`,
            },
          ],
        },
        {
          '@type': 'ItemList',
          name: t('learnHub.collectionName', { defaultValue: 'Korean Learning Guides' }),
          itemListElement: guides.map((guide, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: `${SITE_URL}/${guide.linkLanguage}${guide.path}`,
            name: guide.content.title,
          })),
        },
      ],
    }),
    [guides, language, location.pathname, meta.description, meta.title, t]
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Seo
        title={meta.title}
        description={meta.description}
        keywords={meta.keywords}
        noIndex={meta.noIndex}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />

      <section className="mx-auto max-w-6xl px-6 py-16 md:py-20">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
            <BookOpen className="h-3.5 w-3.5" />
            {t('learnHub.badge', { defaultValue: 'DuHan Learn Hub' })}
          </div>
          <h1 className="mt-4 text-3xl font-black leading-tight md:text-5xl">{hub.title}</h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600 md:text-lg">
            {hub.description}
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {guides.map((guide, index) => (
            <article
              key={guide.key}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {hub.cardPrefix} {String(index + 1).padStart(2, '0')}
              </div>
              <h2 className="mt-2 text-xl font-extrabold leading-snug">{guide.content.title}</h2>
              {!guide.isLocalized ? (
                <div className="mt-2 inline-flex rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500">
                  {t('learnHub.englishContent', { defaultValue: 'English content' })}
                </div>
              ) : null}
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {guide.content.description}
              </p>
              <Button
                asChild
                variant="ghost"
                size="auto"
                className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700"
              >
                <a href={`/${guide.linkLanguage}${guide.path}`}>
                  {t('learnHub.readGuide', { defaultValue: 'Read guide' })}
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </article>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-slate-200 bg-slate-100 p-6 md:flex md:items-center md:justify-between">
          <p className="text-sm font-medium text-slate-600 md:text-base">
            {t('learnHub.roadmap', {
              defaultValue:
                'Build your own study roadmap with TOPIK practice, vocab review, and grammar drills.',
            })}
          </p>
          <Button
            asChild
            variant="ghost"
            size="auto"
            className="mt-4 rounded-xl bg-slate-900 px-5 py-3 font-bold text-white md:mt-0"
          >
            <LocalizedLink to="/register">{hub.ctaLabel}</LocalizedLink>
          </Button>
        </div>
      </section>
    </div>
  );
};

export default LearnHubPage;
