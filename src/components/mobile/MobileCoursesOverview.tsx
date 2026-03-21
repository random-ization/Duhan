import React, { useState, useMemo, useCallback } from 'react';
import { ArrowLeft, Search, Layers, ChevronRight } from 'lucide-react';
import { useQuery } from 'convex/react';
import { NoArgs, qRef } from '../../utils/convexRefs';
import { useTranslation } from 'react-i18next';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { Button } from '../ui';
import { Input } from '../ui';

type PublisherTheme = {
  gradient: string;
  chipBg: string;
  chipText: string;
  levelBg: string;
  levelText: string;
};

type PublisherKey = 'oer' | 'yonsei' | 'seoulNational' | 'chungAng' | 'topikGrammar' | 'default';
type KnownPublisherKey = Exclude<PublisherKey, 'default'>;
const PRIORITY_COURSE_ID = 'topik-grammar';

const PUBLISHER_THEMES: Record<PublisherKey, PublisherTheme> = {
  oer: {
    gradient: 'from-amber-500 to-amber-600 dark:from-amber-300 dark:to-amber-400',
    chipBg: 'bg-amber-100 dark:bg-amber-400/18',
    chipText: 'text-amber-700 dark:text-amber-200',
    levelBg: 'bg-amber-50 dark:bg-amber-400/14',
    levelText: 'text-amber-700 dark:text-amber-200',
  },
  yonsei: {
    gradient: 'from-indigo-500 to-indigo-600 dark:from-indigo-300 dark:to-indigo-400',
    chipBg: 'bg-indigo-100 dark:bg-indigo-400/18',
    chipText: 'text-indigo-700 dark:text-indigo-200',
    levelBg: 'bg-indigo-50 dark:bg-indigo-400/14',
    levelText: 'text-indigo-700 dark:text-indigo-200',
  },
  seoulNational: {
    gradient: 'from-rose-500 to-rose-600 dark:from-rose-300 dark:to-rose-400',
    chipBg: 'bg-rose-100 dark:bg-rose-400/18',
    chipText: 'text-rose-700 dark:text-rose-200',
    levelBg: 'bg-rose-50 dark:bg-rose-400/14',
    levelText: 'text-rose-700 dark:text-rose-200',
  },
  chungAng: {
    gradient: 'from-emerald-500 to-emerald-600 dark:from-emerald-300 dark:to-emerald-400',
    chipBg: 'bg-emerald-100 dark:bg-emerald-400/18',
    chipText: 'text-emerald-700 dark:text-emerald-200',
    levelBg: 'bg-emerald-50 dark:bg-emerald-400/14',
    levelText: 'text-emerald-700 dark:text-emerald-200',
  },
  topikGrammar: {
    gradient: 'from-cyan-500 to-cyan-600 dark:from-cyan-300 dark:to-cyan-400',
    chipBg: 'bg-cyan-100 dark:bg-cyan-400/18',
    chipText: 'text-cyan-700 dark:text-cyan-200',
    levelBg: 'bg-cyan-50 dark:bg-cyan-400/14',
    levelText: 'text-cyan-700 dark:text-cyan-200',
  },
  default: {
    gradient: 'from-muted-foreground to-foreground',
    chipBg: 'bg-muted',
    chipText: 'text-muted-foreground',
    levelBg: 'bg-muted',
    levelText: 'text-foreground',
  },
};

const PUBLISHER_TRANSLATION_KEYS: Record<KnownPublisherKey, string> = {
  oer: 'coursesLibrary.publishers.oer',
  yonsei: 'coursesLibrary.publishers.yonsei',
  seoulNational: 'coursesLibrary.publishers.seoulNational',
  chungAng: 'coursesLibrary.publishers.chungAng',
  topikGrammar: 'coursesLibrary.publishers.topikGrammarCollection',
};

const PUBLISHER_KO_FALLBACK: Record<KnownPublisherKey, string> = {
  oer: '오픈 교재',
  yonsei: '연세대학교',
  seoulNational: '서울대학교',
  chungAng: '중앙대학교',
  topikGrammar: 'TOPIK 문법 모음집',
};

const PUBLISHER_EN_FALLBACK: Record<KnownPublisherKey, string> = {
  oer: 'Open Educational Resources',
  yonsei: 'Yonsei University',
  seoulNational: 'Seoul National University',
  chungAng: 'Chung-Ang University',
  topikGrammar: 'TOPIK Grammar Collection',
};

const PUBLISHER_MATCHERS: Array<{ key: KnownPublisherKey; pattern: RegExp }> = [
  { key: 'oer', pattern: /\b(oer|open educational resources?)\b/i },
  { key: 'yonsei', pattern: /(yonsei|연세대학교|\u5ef6\u4e16\u5927\u5b66)/i },
  { key: 'seoulNational', pattern: /(seoul national|snu|서울대학교|\u9996\u5c14\u5927\u5b66)/i },
  { key: 'chungAng', pattern: /(chung-?ang|중앙대학교|\u4e2d\u592e\u5927\u5b66)/i },
  {
    key: 'topikGrammar',
    pattern:
      /(hanabira|topik[-\s]?grammar|topik grammar collection|topik语法合集|topik 문법 모음집)/i,
  },
];

function resolvePublisherKey(publisher: string): KnownPublisherKey | undefined {
  const normalizedPublisher = publisher.trim();
  if (!normalizedPublisher) return undefined;
  for (const matcher of PUBLISHER_MATCHERS) {
    if (matcher.pattern.test(normalizedPublisher)) return matcher.key;
  }
  return undefined;
}

function normalizeLanguageTag(language: string): string {
  return (language || 'en').split('-')[0];
}

function getTranslatedPublisherFallback(
  i18nLanguage: string,
  t: (key: string, options?: { defaultValue?: string }) => string,
  key: KnownPublisherKey
): string {
  const normalizedLanguage = normalizeLanguageTag(i18nLanguage);
  if (normalizedLanguage === 'ko') {
    return PUBLISHER_KO_FALLBACK[key];
  }
  return t(PUBLISHER_TRANSLATION_KEYS[key], { defaultValue: PUBLISHER_EN_FALLBACK[key] });
}

function getPublisherLocalizedFromData(
  publisher: Publisher | undefined,
  language: string
): string | undefined {
  switch (language) {
    case 'zh':
      return publisher?.nameZh;
    case 'ko':
      return publisher?.nameKo;
    case 'vi':
      return publisher?.nameVi;
    case 'mn':
      return publisher?.nameMn;
    default:
      return publisher?.nameEn;
  }
}

function getThemeByPublisher(publisher: string): PublisherTheme {
  const publisherKey = resolvePublisherKey(publisher);
  if (!publisherKey) return PUBLISHER_THEMES.default;
  return PUBLISHER_THEMES[publisherKey];
}

const THEME_FALLBACK_ENTRIES: Array<{ pattern: RegExp; theme: PublisherTheme }> = [
  { pattern: /amber/i, theme: PUBLISHER_THEMES.oer },
  { pattern: /indigo/i, theme: PUBLISHER_THEMES.yonsei },
  { pattern: /rose/i, theme: PUBLISHER_THEMES.seoulNational },
  { pattern: /emerald/i, theme: PUBLISHER_THEMES.chungAng },
];

function getThemeByPublisherNameFallback(publisher: string): PublisherTheme {
  const matched = THEME_FALLBACK_ENTRIES.find(entry => entry.pattern.test(publisher));
  return matched?.theme ?? PUBLISHER_THEMES.default;
}

type Course = {
  id: string;
  _id?: string;
  name: string;
  publisher?: string;
  displayLevel?: string;
  totalUnits?: number;
  volume?: string;
};

type Publisher = {
  name: string;
  nameKo?: string;
  nameZh?: string;
  nameEn?: string;
  nameVi?: string;
  nameMn?: string;
};

const MobileCoursesOverview: React.FC = () => {
  const navigate = useLocalizedNavigate();
  const { t, i18n } = useTranslation();
  const currentLang = useMemo(() => (i18n.language || 'en').split('-')[0], [i18n.language]);

  const courses = useQuery(qRef<NoArgs, Course[]>('institutes:getAll'));
  const publishersData = useQuery(qRef<NoArgs, Publisher[]>('publishers:getAll'));
  const isLoading = courses === undefined;

  const [searchQuery, setSearchQuery] = useState('');

  const publishersByName = useMemo(() => {
    const entries = publishersData?.map(p => [p.name, p] as const) || [];
    return new Map(entries);
  }, [publishersData]);

  const getPublisherLabel = useCallback(
    (publisher: string) => {
      const normalizedLang = normalizeLanguageTag(currentLang);
      const data = publishersByName.get(publisher);
      const localizedByData = getPublisherLocalizedFromData(data, normalizedLang);
      if (localizedByData) return localizedByData;

      const publisherKey = resolvePublisherKey(publisher);
      if (publisherKey) {
        return getTranslatedPublisherFallback(i18n.language, t, publisherKey);
      }

      return publisher;
    },
    [currentLang, i18n.language, publishersByName, t]
  );

  const getTheme = useCallback((publisher: string) => {
    const matchedTheme = getThemeByPublisher(publisher);
    if (matchedTheme !== PUBLISHER_THEMES.default) {
      return matchedTheme;
    }
    return getThemeByPublisherNameFallback(publisher);
  }, []);

  const getCourseUiMeta = useCallback((course: Course) => {
    if (course.id === 'ysk-1') {
      return {
        displayLevel: course.displayLevel || '1',
        totalUnits: course.totalUnits || 12,
      };
    }

    return {
      displayLevel: course.displayLevel,
      totalUnits: course.totalUnits,
    };
  }, []);

  const getCourseEntryPath = useCallback((course: Course) => {
    if (course.id === PRIORITY_COURSE_ID) {
      return `/course/${course.id}/grammar`;
    }
    return `/course/${course.id}`;
  }, []);

  const groupedCourses = useMemo(() => {
    if (!courses) return {};
    const groups: Record<string, Course[]> = {};

    const filtered = courses.filter(course => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        course.name.toLowerCase().includes(query) ||
        course.displayLevel?.toLowerCase().includes(query) ||
        course.publisher?.toLowerCase().includes(query)
      );
    });

    for (const course of filtered) {
      const pub = course.publisher || t('coursesLibrary.otherPublisher');
      if (!groups[pub]) groups[pub] = [];
      groups[pub].push(course);
    }

    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => {
        const aPriorityRank = a.id === PRIORITY_COURSE_ID ? 0 : 1;
        const bPriorityRank = b.id === PRIORITY_COURSE_ID ? 0 : 1;
        if (aPriorityRank !== bPriorityRank) return aPriorityRank - bPriorityRank;
        return a.name.localeCompare(b.name);
      });
    }

    return groups;
  }, [courses, searchQuery, t]);

  const groupedPublisherEntries = useMemo(() => {
    return Object.entries(groupedCourses).sort(([publisherA, coursesA], [publisherB, coursesB]) => {
      const aHasPriorityCourse = coursesA.some(course => course.id === PRIORITY_COURSE_ID);
      const bHasPriorityCourse = coursesB.some(course => course.id === PRIORITY_COURSE_ID);
      if (aHasPriorityCourse !== bHasPriorityCourse) {
        return aHasPriorityCourse ? -1 : 1;
      }
      return publisherA.localeCompare(publisherB);
    });
  }, [groupedCourses]);

  const totalCourseCount = courses?.length || 0;

  return (
    <div className="relative min-h-screen bg-background pb-[calc(env(safe-area-inset-bottom)+96px)]">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.42] bg-[radial-gradient(hsl(var(--border))_1px,transparent_1px)] bg-[length:20px_20px]"></div>

      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/90 backdrop-blur-xl px-4 pt-[calc(env(safe-area-inset-top)+10px)] pb-4">
        <div className="flex items-center gap-3 mb-3">
          <Button
            variant="ghost"
            size="auto"
            onClick={() => navigate('/dashboard')}
            className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-foreground leading-tight">
              {t('coursesLibrary.title')}
            </h1>
            <p className="text-xs text-muted-foreground font-semibold">
              {isLoading ? t('loading') : t('coursesLibrary.summary', { count: totalCourseCount })}
            </p>
          </div>
        </div>

        <div className="relative">
          <Input
            type="text"
            placeholder={t('coursesLibrary.searchPlaceholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full h-11 bg-card border border-border rounded-xl pl-10 pr-4 text-sm font-semibold placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
      </header>

      <main className="relative z-10 px-4 py-4 space-y-5">
        {isLoading && (
          <div className="space-y-5">
            {[1, 2].map(i => (
              <section
                key={i}
                className="rounded-2xl border border-border bg-card/70 p-3 animate-pulse"
              >
                <div className="h-5 w-28 bg-muted rounded mb-3" />
                <div className="space-y-3">
                  {[1, 2, 3].map(j => (
                    <div key={j} className="h-20 rounded-xl bg-muted" />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {!isLoading && groupedPublisherEntries.length === 0 && (
          <div className="text-center py-16 text-muted-foreground font-bold">
            {t('coursesLibrary.noResults')}
          </div>
        )}

        {!isLoading &&
          groupedPublisherEntries.map(([publisher, groupCourses]) => {
            const theme = getTheme(publisher);
            const label = getPublisherLabel(publisher);

            return (
              <section
                key={publisher}
                className="rounded-2xl border border-border/80 bg-card/75 backdrop-blur-sm p-3 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3 px-1 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-lg ${theme.chipBg} ${theme.chipText} grid place-items-center text-[10px] font-black shrink-0`}
                    >
                      {label.charAt(0).toUpperCase()}
                    </div>
                    <h2 className="font-black text-sm text-foreground truncate">{label}</h2>
                  </div>
                  <span className={`text-xs font-black ${theme.chipText} shrink-0`}>
                    {groupCourses.length}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {groupCourses.map(course => {
                    const uiMeta = getCourseUiMeta(course);

                    return (
                      <Button
                        variant="ghost"
                        size="auto"
                        key={course._id || course.id}
                        onClick={() => navigate(getCourseEntryPath(course))}
                        className="group relative w-full min-h-[170px] !flex !flex-col !items-start !justify-between !whitespace-normal rounded-2xl border border-border bg-card p-3 text-left shadow-sm transition-all active:scale-[0.99]"
                      >
                        <div
                          className={`absolute left-0 top-0 w-full h-1.5 rounded-t-2xl bg-gradient-to-r ${theme.gradient}`}
                        ></div>

                        <div className="w-full pt-1 flex items-center justify-between gap-2">
                          <div
                            className={`min-w-[2rem] h-8 px-2 rounded-lg ${theme.levelBg} ${theme.levelText} border border-border inline-flex items-center justify-center`}
                          >
                            <span className="text-xl font-black leading-none">
                              {uiMeta.displayLevel || '?'}
                            </span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </div>

                        <div className="w-full min-w-0">
                          <h3 className="mt-2 text-[14px] leading-5 font-extrabold text-foreground break-words line-clamp-3">
                            {course.name}
                          </h3>
                          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
                            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1">
                              <Layers className="w-3 h-3" />
                              {t('coursesLibrary.unitsCount', { count: uiMeta.totalUnits || 10 })}
                            </span>
                            {course.volume && (
                              <span className="inline-flex items-center rounded-full bg-muted px-2 py-1 uppercase">
                                VOL {course.volume}
                              </span>
                            )}
                          </div>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </section>
            );
          })}
      </main>
    </div>
  );
};

export default MobileCoursesOverview;
