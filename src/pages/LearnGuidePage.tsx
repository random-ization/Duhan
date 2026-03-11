import React from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { SEO as Seo } from '../seo/SEO';
import { getRouteMeta } from '../seo/publicRoutes';
import { LocalizedLink } from '../components/LocalizedLink';
import { Button } from '../components/ui';
import {
  getLearnGuideKeyBySlug,
  getLearnGuideMeta,
  getLocalizedLearnGuide,
  getLearnHubContent,
  hasLocalizedLearnGuide,
  listRelatedLearnGuides,
} from '../seo/learnGuides';
import { useCurrentLanguage } from '../hooks/useLocalizedNavigate';

const SITE_URL = 'https://koreanstudy.me';

function formatIsoDate(isoDate: string | undefined): string | null {
  if (!isoDate) return null;
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

const LearnGuidePage: React.FC = () => {
  const location = useLocation();
  const { guideSlug } = useParams<{ guideSlug: string }>();
  const language = useCurrentLanguage();
  const guideKey = getLearnGuideKeyBySlug(guideSlug);

  if (!guideKey) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Seo
          title="Guide Not Found | DuHan"
          description="The requested guide does not exist."
          noIndex={true}
        />
        <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-24 text-center">
          <h1 className="text-3xl font-black">Guide Not Found</h1>
          <p className="mt-3 text-muted-foreground">This guide URL is invalid or has been moved.</p>
          <Button
            asChild
            variant="ghost"
            size="auto"
            className="mt-6 rounded-xl border border-border px-4 py-2"
          >
            <LocalizedLink to="/learn">Back to Learn Hub</LocalizedLink>
          </Button>
        </div>
      </div>
    );
  }

  const guideMeta = getLearnGuideMeta(guideKey);
  const guide = getLocalizedLearnGuide(guideKey, language);
  const hub = getLearnHubContent(language);
  const meta = getRouteMeta(location.pathname);
  const canonicalPath = meta.canonicalPath || location.pathname;
  const canonicalUrl = `${SITE_URL}${canonicalPath}`;
  const publishedDateLabel = formatIsoDate(guideMeta?.publishedAt);
  const updatedDateLabel = formatIsoDate(guideMeta?.updatedAt);
  const articleLanguage = hasLocalizedLearnGuide(guideKey, language) ? language : 'en';
  const relatedGuides = listRelatedLearnGuides(guideKey)
    .map(related => {
      const linkLanguage = hasLocalizedLearnGuide(related.key, language) ? language : 'en';
      return {
        ...related,
        content: getLocalizedLearnGuide(related.key, language),
        href: `/${linkLanguage}${related.path}`,
      };
    })
    .filter(related => related.key !== guideKey);

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: guide.title,
        description: guide.description,
        inLanguage: articleLanguage,
        datePublished: guideMeta?.publishedAt,
        dateModified: guideMeta?.updatedAt,
        mainEntityOfPage: canonicalUrl,
        isPartOf: {
          '@type': 'CollectionPage',
          '@id': `${SITE_URL}/${language}/learn`,
        },
        author: {
          '@type': 'Organization',
          name: 'DuHan',
        },
        publisher: {
          '@type': 'Organization',
          name: 'DuHan',
          url: SITE_URL,
        },
      },
      {
        '@type': 'HowTo',
        name: guide.title,
        description: guide.description,
        inLanguage: articleLanguage,
        totalTime: 'P4W',
        step: guide.sections.map((section, index) => ({
          '@type': 'HowToStep',
          position: index + 1,
          name: section.heading,
          text: section.paragraphs.join(' '),
          url: canonicalUrl,
        })),
      },
      {
        '@type': 'Course',
        name: guide.title,
        description: guide.description,
        inLanguage: articleLanguage,
        provider: {
          '@type': 'Organization',
          name: 'DuHan',
          sameAs: SITE_URL,
        },
        hasCourseInstance: {
          '@type': 'CourseInstance',
          courseMode: 'online',
          url: canonicalUrl,
        },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: `${SITE_URL}/${language}`,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: hub.title,
            item: `${SITE_URL}/${language}/learn`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: guide.title,
            item: canonicalUrl,
          },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: guide.faqs.map(faq => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      },
      {
        '@type': 'ItemList',
        name: 'Related Korean Learning Guides',
        itemListElement: relatedGuides.map((related, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: `${SITE_URL}${related.href}`,
          name: related.content.title,
        })),
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Seo
        title={meta.title}
        description={meta.description}
        keywords={meta.keywords}
        noIndex={meta.noIndex}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <article className="mx-auto max-w-4xl px-6 py-14 md:py-18">
        <Button
          asChild
          variant="ghost"
          size="auto"
          className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm"
        >
          <LocalizedLink to="/learn">
            <ArrowLeft className="h-4 w-4" />
            {hub.title}
          </LocalizedLink>
        </Button>

        <header className="mt-6 border-b border-border pb-8">
          <h1 className="text-3xl font-black leading-tight md:text-5xl">{guide.title}</h1>
          {publishedDateLabel || updatedDateLabel ? (
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {publishedDateLabel ? `Published ${publishedDateLabel}` : ''}
              {publishedDateLabel && updatedDateLabel ? ' · ' : ''}
              {updatedDateLabel ? `Updated ${updatedDateLabel}` : ''}
            </p>
          ) : null}
          <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
            {guide.description}
          </p>
          <p className="mt-5 rounded-xl bg-muted p-4 text-sm leading-relaxed text-muted-foreground">
            {guide.intro}
          </p>
        </header>

        <div className="mt-9 space-y-8">
          {guide.sections.map(section => (
            <section key={section.heading} className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-xl font-extrabold">{section.heading}</h2>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground md:text-base">
                {section.paragraphs.map(paragraph => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              {section.bullets && section.bullets.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {section.bullets.map(bullet => (
                    <li
                      key={bullet}
                      className="flex items-start gap-2 text-sm text-muted-foreground md:text-base"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>

        <section className="mt-10 rounded-2xl border border-border bg-muted p-6">
          <h2 className="text-2xl font-black">FAQ</h2>
          <div className="mt-4 space-y-4">
            {guide.faqs.map(faq => (
              <details key={faq.question} className="rounded-xl border border-border bg-card p-4">
                <summary className="cursor-pointer text-sm font-bold md:text-base">
                  {faq.question}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        {relatedGuides.length > 0 ? (
          <section className="mt-10 rounded-2xl border border-border bg-card p-6">
            <h2 className="text-2xl font-black">Related Guides</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {relatedGuides.map(related => (
                <a
                  key={related.key}
                  href={related.href}
                  className="group rounded-xl border border-border p-4 transition hover:-translate-y-0.5 hover:bg-muted"
                >
                  <h3 className="text-base font-extrabold">{related.content.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {related.content.description}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-indigo-600 group-hover:text-indigo-700">
                    Read related guide
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </a>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-10 rounded-2xl border border-border bg-card p-6 md:flex md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black">Ready to apply this guide?</h2>
            <p className="mt-2 text-sm text-muted-foreground md:text-base">
              Open the corresponding module and start with a timed practice block.
            </p>
          </div>
          <Button
            asChild
            variant="ghost"
            size="auto"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground md:mt-0"
          >
            <LocalizedLink to={guide.ctaTo}>
              {guide.ctaLabel}
              <ArrowRight className="h-4 w-4" />
            </LocalizedLink>
          </Button>
        </section>
      </article>
    </div>
  );
};

export default LearnGuidePage;
