import React, { useState, useMemo, useCallback } from 'react';
import { ArrowLeft, Search, Layers, ChevronRight } from 'lucide-react';
import { useQuery } from 'convex/react';
import { NoArgs, qRef } from '../../utils/convexRefs';
import { useTranslation } from 'react-i18next';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { Button } from '../ui';
import { Input } from '../ui';

const PUBLISHER_THEMES: Record<
  string,
  {
    gradient: string;
    chipBg: string;
    chipText: string;
    levelBg: string;
    levelText: string;
  }
> = {
  OER: {
    gradient: 'from-amber-500 to-amber-600 dark:from-amber-300 dark:to-amber-400',
    chipBg: 'bg-amber-100 dark:bg-amber-400/18',
    chipText: 'text-amber-700 dark:text-amber-200',
    levelBg: 'bg-amber-50 dark:bg-amber-400/14',
    levelText: 'text-amber-700 dark:text-amber-200',
  },
  \u5ef6\u4e16\u5927\u5b66: {
    gradient: 'from-indigo-500 to-indigo-600 dark:from-indigo-300 dark:to-indigo-400',
    chipBg: 'bg-indigo-100 dark:bg-indigo-400/18',
    chipText: 'text-indigo-700 dark:text-indigo-200',
    levelBg: 'bg-indigo-50 dark:bg-indigo-400/14',
    levelText: 'text-indigo-700 dark:text-indigo-200',
  },
  연세대학교: {
    gradient: 'from-indigo-500 to-indigo-600 dark:from-indigo-300 dark:to-indigo-400',
    chipBg: 'bg-indigo-100 dark:bg-indigo-400/18',
    chipText: 'text-indigo-700 dark:text-indigo-200',
    levelBg: 'bg-indigo-50 dark:bg-indigo-400/14',
    levelText: 'text-indigo-700 dark:text-indigo-200',
  },
  \u9996\u5c14\u5927\u5b66: {
    gradient: 'from-rose-500 to-rose-600 dark:from-rose-300 dark:to-rose-400',
    chipBg: 'bg-rose-100 dark:bg-rose-400/18',
    chipText: 'text-rose-700 dark:text-rose-200',
    levelBg: 'bg-rose-50 dark:bg-rose-400/14',
    levelText: 'text-rose-700 dark:text-rose-200',
  },
  서울대학교: {
    gradient: 'from-rose-500 to-rose-600 dark:from-rose-300 dark:to-rose-400',
    chipBg: 'bg-rose-100 dark:bg-rose-400/18',
    chipText: 'text-rose-700 dark:text-rose-200',
    levelBg: 'bg-rose-50 dark:bg-rose-400/14',
    levelText: 'text-rose-700 dark:text-rose-200',
  },
  \u4e2d\u592e\u5927\u5b66: {
    gradient: 'from-emerald-500 to-emerald-600 dark:from-emerald-300 dark:to-emerald-400',
    chipBg: 'bg-emerald-100 dark:bg-emerald-400/18',
    chipText: 'text-emerald-700 dark:text-emerald-200',
    levelBg: 'bg-emerald-50 dark:bg-emerald-400/14',
    levelText: 'text-emerald-700 dark:text-emerald-200',
  },
  중앙대학교: {
    gradient: 'from-emerald-500 to-emerald-600 dark:from-emerald-300 dark:to-emerald-400',
    chipBg: 'bg-emerald-100 dark:bg-emerald-400/18',
    chipText: 'text-emerald-700 dark:text-emerald-200',
    levelBg: 'bg-emerald-50 dark:bg-emerald-400/14',
    levelText: 'text-emerald-700 dark:text-emerald-200',
  },
  default: {
    gradient: 'from-muted-foreground to-foreground',
    chipBg: 'bg-muted',
    chipText: 'text-muted-foreground',
    levelBg: 'bg-muted',
    levelText: 'text-foreground',
  },
};

const PUBLISHER_TRANSLATIONS: Record<string, { ko: string; en: string; zh: string }> = {
  OER: { ko: '오픈 교재', zh: '开放教育资源', en: 'Open Educational Resources' },
  \u5ef6\u4e16\u5927\u5b66: { ko: '연세대학교', zh: '\u5ef6\u4e16\u5927\u5b66', en: 'Yonsei' },
  연세대학교: { ko: '연세대학교', zh: '\u5ef6\u4e16\u5927\u5b66', en: 'Yonsei' },
  \u9996\u5c14\u5927\u5b66: { ko: '서울대학교', zh: '\u9996\u5c14\u5927\u5b66', en: "Seoul Nat'l" },
  서울대학교: { ko: '서울대학교', zh: '\u9996\u5c14\u5927\u5b66', en: "Seoul Nat'l" },
  \u4e2d\u592e\u5927\u5b66: { ko: '중앙대학교', zh: '\u4e2d\u592e\u5927\u5b66', en: 'Ewha' },
  중앙대학교: { ko: '중앙대학교', zh: '\u4e2d\u592e\u5927\u5b66', en: 'Ewha' },
};

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
      const fallback = PUBLISHER_TRANSLATIONS[publisher];
      const data = publishersByName.get(publisher);
      switch (currentLang) {
        case 'zh':
          return data?.nameZh || fallback?.zh || publisher;
        case 'ko':
          return data?.nameKo || fallback?.ko || publisher;
        default:
          return data?.nameEn || fallback?.en || publisher;
      }
    },
    [currentLang, publishersByName]
  );

  const getTheme = useCallback((publisher: string) => {
    for (const key of Object.keys(PUBLISHER_THEMES)) {
      if (publisher.includes(key)) return PUBLISHER_THEMES[key];
    }
    return PUBLISHER_THEMES.default;
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
      groups[key].sort((a, b) => a.name.localeCompare(b.name));
    }

    return groups;
  }, [courses, searchQuery, t]);

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
              <section key={i} className="rounded-2xl border border-border bg-card/70 p-3 animate-pulse">
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

        {!isLoading && Object.keys(groupedCourses).length === 0 && (
          <div className="text-center py-16 text-muted-foreground font-bold">
            {t('coursesLibrary.noResults')}
          </div>
        )}

        {!isLoading &&
          Object.entries(groupedCourses).map(([publisher, groupCourses]) => {
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
                        onClick={() => navigate(`/course/${course.id}`)}
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
