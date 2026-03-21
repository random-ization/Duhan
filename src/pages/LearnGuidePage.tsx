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

const PAGE_COPY = {
  en: {
    guideNotFoundTitle: 'Guide Not Found | DuHan',
    guideNotFoundDesc: 'The requested guide does not exist.',
    guideNotFoundHeading: 'Guide Not Found',
    guideNotFoundBody: 'This guide URL is invalid or has been moved.',
    backToLearnHub: 'Back to Learn Hub',
    publishedPrefix: 'Published',
    updatedPrefix: 'Updated',
    faqTitle: 'FAQ',
    relatedTitle: 'Related Guides',
    readRelated: 'Read related guide',
    readyTitle: 'Ready to apply this guide?',
    readyBody: 'Open the corresponding module and start with a timed practice block.',
    relatedListName: 'Related Korean Learning Guides',
  },
  zh: {
    guideNotFoundTitle: 'Guide Not Found | DuHan',
    guideNotFoundDesc: 'The requested guide does not exist.',
    guideNotFoundHeading: 'Guide Not Found',
    guideNotFoundBody: 'This guide URL is invalid or has been moved.',
    backToLearnHub: 'Back to Learn Hub',
    publishedPrefix: 'Published',
    updatedPrefix: 'Updated',
    faqTitle: 'FAQ',
    relatedTitle: 'Related Guides',
    readRelated: 'Read related guide',
    readyTitle: 'Ready to apply this guide?',
    readyBody: 'Open the corresponding module and start with a timed practice block.',
    relatedListName: 'Related Korean Learning Guides',
  },
  vi: {
    guideNotFoundTitle: 'Khong tim thay huong dan | DuHan',
    guideNotFoundDesc: 'Khong ton tai bai huong dan ban yeu cau.',
    guideNotFoundHeading: 'Khong tim thay huong dan',
    guideNotFoundBody: 'Lien ket huong dan nay khong hop le hoac da duoc di chuyen.',
    backToLearnHub: 'Quay lai trung tam huong dan',
    publishedPrefix: 'Dang',
    updatedPrefix: 'Cap nhat',
    faqTitle: 'FAQ',
    relatedTitle: 'Huong dan lien quan',
    readRelated: 'Doc huong dan lien quan',
    readyTitle: 'San sang ap dung huong dan nay?',
    readyBody: 'Mo module tuong ung va bat dau voi mot buoi luyen tap tinh gio.',
    relatedListName: 'Huong dan hoc tieng Han lien quan',
  },
  mn: {
    guideNotFoundTitle: 'Гарын авлага олдсонгүй | DuHan',
    guideNotFoundDesc: 'Хүссэн гарын авлага байхгүй байна.',
    guideNotFoundHeading: 'Гарын авлага олдсонгүй',
    guideNotFoundBody: 'Энэ гарын авлагын холбоос хүчингүй эсвэл шилжсэн байна.',
    backToLearnHub: 'Сургалтын төв рүү буцах',
    publishedPrefix: 'Нийтэлсэн',
    updatedPrefix: 'Шинэчилсэн',
    faqTitle: 'FAQ',
    relatedTitle: 'Холбоотой гарын авлага',
    readRelated: 'Холбоотой гарын авлага унших',
    readyTitle: 'Энэ гарын авлагыг хэрэгжүүлэхэд бэлэн үү?',
    readyBody: 'Тохирох модулийг нээгээд хугацаатай дасгалаас эхлээрэй.',
    relatedListName: 'Холбоотой солонгос хэлний гарын авлага',
  },
} as const;

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
  const pageCopy = PAGE_COPY[language as keyof typeof PAGE_COPY] ?? PAGE_COPY.en;
  const guideKey = getLearnGuideKeyBySlug(guideSlug);

  if (!guideKey) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <Seo
          title={pageCopy.guideNotFoundTitle}
          description={pageCopy.guideNotFoundDesc}
          noIndex={true}
        />
        <div className="mx-auto flex max-w-2xl flex-col items-center px-6 py-24 text-center">
          <h1 className="text-3xl font-black">{pageCopy.guideNotFoundHeading}</h1>
          <p className="mt-3 text-slate-600">{pageCopy.guideNotFoundBody}</p>
          <Button
            asChild
            variant="ghost"
            size="auto"
            className="mt-6 rounded-xl border border-slate-200 bg-white px-4 py-2"
          >
            <LocalizedLink to="/learn">{pageCopy.backToLearnHub}</LocalizedLink>
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
        name: pageCopy.relatedListName,
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
    <div className="min-h-screen bg-slate-50 text-slate-900">
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
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
        >
          <LocalizedLink to="/learn">
            <ArrowLeft className="h-4 w-4" />
            {hub.title}
          </LocalizedLink>
        </Button>

        <header className="mt-6 border-b border-slate-200 pb-8">
          <h1 className="text-3xl font-black leading-tight md:text-5xl">{guide.title}</h1>
          {publishedDateLabel || updatedDateLabel ? (
            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {publishedDateLabel ? `${pageCopy.publishedPrefix} ${publishedDateLabel}` : ''}
              {publishedDateLabel && updatedDateLabel ? ' · ' : ''}
              {updatedDateLabel ? `${pageCopy.updatedPrefix} ${updatedDateLabel}` : ''}
            </p>
          ) : null}
          <p className="mt-4 text-base leading-relaxed text-slate-600 md:text-lg">
            {guide.description}
          </p>
          <p className="mt-5 rounded-xl bg-slate-100 p-4 text-sm leading-relaxed text-slate-600">
            {guide.intro}
          </p>
        </header>

        <div className="mt-9 space-y-8">
          {guide.sections.map(section => (
            <section
              key={section.heading}
              className="rounded-2xl border border-slate-200 bg-white p-6"
            >
              <h2 className="text-xl font-extrabold">{section.heading}</h2>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-600 md:text-base">
                {section.paragraphs.map(paragraph => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              {section.bullets && section.bullets.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {section.bullets.map(bullet => (
                    <li
                      key={bullet}
                      className="flex items-start gap-2 text-sm text-slate-600 md:text-base"
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

        <section className="mt-10 rounded-2xl border border-slate-200 bg-slate-100 p-6">
          <h2 className="text-2xl font-black">{pageCopy.faqTitle}</h2>
          <div className="mt-4 space-y-4">
            {guide.faqs.map(faq => (
              <details
                key={faq.question}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <summary className="cursor-pointer text-sm font-bold md:text-base">
                  {faq.question}
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 md:text-base">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>

        {relatedGuides.length > 0 ? (
          <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-2xl font-black">{pageCopy.relatedTitle}</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {relatedGuides.map(related => (
                <a
                  key={related.key}
                  href={related.href}
                  className="group rounded-xl border border-slate-200 p-4 transition hover:-translate-y-0.5 hover:bg-slate-50"
                >
                  <h3 className="text-base font-extrabold">{related.content.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {related.content.description}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-indigo-600 group-hover:text-indigo-700">
                    {pageCopy.readRelated}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </a>
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 md:flex md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black">{pageCopy.readyTitle}</h2>
            <p className="mt-2 text-sm text-slate-600 md:text-base">{pageCopy.readyBody}</p>
          </div>
          <Button
            asChild
            variant="ghost"
            size="auto"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 font-bold text-white md:mt-0"
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
