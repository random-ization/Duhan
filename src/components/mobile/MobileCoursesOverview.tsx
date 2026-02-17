import React, { useState, useMemo, useCallback } from 'react';
import { ArrowLeft, Search, ChevronRight, Layers } from 'lucide-react';
import { useQuery } from 'convex/react';
import { NoArgs, qRef } from '../../utils/convexRefs';
import { useTranslation } from 'react-i18next';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { Button } from '../ui';
import { Input } from '../ui';

// Publisher theme configuration
const PUBLISHER_THEMES: Record<string, { gradient: string; bgLight: string; text: string }> = {
  延世大学: {
    gradient: 'from-indigo-500 to-indigo-600 dark:from-indigo-400/75 dark:to-indigo-500/75',
    bgLight: 'bg-indigo-100 dark:bg-indigo-400/16',
    text: 'text-indigo-600 dark:text-indigo-300',
  },
  연세대학교: {
    gradient: 'from-indigo-500 to-indigo-600 dark:from-indigo-400/75 dark:to-indigo-500/75',
    bgLight: 'bg-indigo-100 dark:bg-indigo-400/16',
    text: 'text-indigo-600 dark:text-indigo-300',
  },
  首尔大学: {
    gradient: 'from-rose-500 to-rose-600 dark:from-rose-400/75 dark:to-rose-500/75',
    bgLight: 'bg-rose-100 dark:bg-rose-400/16',
    text: 'text-rose-600 dark:text-rose-300',
  },
  서울대학교: {
    gradient: 'from-rose-500 to-rose-600 dark:from-rose-400/75 dark:to-rose-500/75',
    bgLight: 'bg-rose-100 dark:bg-rose-400/16',
    text: 'text-rose-600 dark:text-rose-300',
  },
  中央大学: {
    gradient: 'from-emerald-500 to-emerald-600 dark:from-emerald-400/75 dark:to-emerald-500/75',
    bgLight: 'bg-emerald-100 dark:bg-emerald-400/16',
    text: 'text-emerald-600 dark:text-emerald-300',
  },
  중앙대학교: {
    gradient: 'from-emerald-500 to-emerald-600 dark:from-emerald-400/75 dark:to-emerald-500/75',
    bgLight: 'bg-emerald-100 dark:bg-emerald-400/16',
    text: 'text-emerald-600 dark:text-emerald-300',
  },
  default: {
    gradient: 'from-muted-foreground to-foreground',
    bgLight: 'bg-muted',
    text: 'text-muted-foreground',
  },
};

const PUBLISHER_TRANSLATIONS: Record<string, { ko: string; en: string; zh: string }> = {
  延世大学: { ko: '연세대학교', zh: '延世大学', en: 'Yonsei' },
  연세대학교: { ko: '연세대학교', zh: '延世大学', en: 'Yonsei' },
  首尔大学: { ko: '서울대학교', zh: '首尔大学', en: "Seoul Nat'l" },
  서울대학교: { ko: '서울대학교', zh: '首尔大学', en: "Seoul Nat'l" },
  中央大学: { ko: '중앙대학교', zh: '中央大学', en: 'Ewha' },
  중앙대학교: { ko: '중앙대학교', zh: '中央大学', en: 'Ewha' },
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
  imageUrl?: string;
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

    // Sort courses within each group
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => a.name.localeCompare(b.name));
    }

    return groups;
  }, [courses, searchQuery, t]);

  return (
    <div className="min-h-screen bg-muted pb-20">
      {/* Header */}
      <header className="bg-card px-5 pt-5 pb-4 border-b border-border sticky top-0 z-20">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="auto"
            onClick={() => navigate('/dashboard')}
            className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-extrabold text-foreground">{t('coursesLibrary.title')}</h1>
            <p className="text-xs text-muted-foreground font-medium">
              {isLoading
                ? t('loading')
                : t('coursesLibrary.summary', { count: courses?.length || 0 })}
            </p>
          </div>
        </div>
        {/* Search */}
        <div className="relative">
          <Input
            type="text"
            placeholder={t('coursesLibrary.searchPlaceholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-muted rounded-lg py-2.5 pl-9 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
      </header>

      {/* Loading State */}
      {isLoading && (
        <div className="px-5 py-6 space-y-6">
          {[1, 2].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-5 bg-muted rounded w-32 mb-3" />
              <div className="flex gap-3 overflow-hidden">
                {[1, 2, 3].map(j => (
                  <div key={j} className="min-w-[140px] h-40 bg-muted rounded-xl" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && Object.keys(groupedCourses).length === 0 && (
        <div className="text-center py-20 text-muted-foreground font-bold">
          {t('coursesLibrary.noResults')}
        </div>
      )}

      {/* Publisher Rows (Netflix Style) */}
      {Object.entries(groupedCourses).map(([publisher, groupCourses]) => {
        const theme = getTheme(publisher);
        const label = getPublisherLabel(publisher);

        return (
          <section key={publisher} className="pt-5 pb-2">
            {/* Row Header */}
            <div className="flex items-center justify-between px-5 mb-3">
              <div className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded ${theme.bgLight} flex items-center justify-center`}
                >
                  <span className={`text-[10px] font-black ${theme.text}`}>
                    {label.charAt(0).toUpperCase()}
                  </span>
                </div>
                <h2 className="font-bold text-foreground text-sm">{label}</h2>
              </div>
              <Button
                variant="ghost"
                size="auto"
                className={`text-xs font-bold ${theme.text} flex items-center gap-1`}
              >
                {t('coursesLibrary.viewAll')} <ChevronRight className="w-3 h-3" />
              </Button>
            </div>

            {/* Horizontal Scroll Row */}
            <div
              className="flex gap-3 overflow-x-auto px-5 pb-2"
              style={{
                scrollSnapType: 'x mandatory',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {groupCourses.map(course => {
                return (
                  <Button
                    variant="ghost"
                    size="auto"
                    key={course._id || course.id}
                    onClick={() => navigate(`/course/${course.id}`)}
                    className="min-w-[140px] bg-card rounded-xl border border-border p-3 text-left snap-start active:scale-[0.98] transition-transform"
                  >
                    {/* Level Badge */}
                    <div
                      className={`w-full aspect-[4/3] bg-gradient-to-br ${theme.gradient} rounded-lg flex items-center justify-center text-white font-extrabold text-2xl mb-2 shadow-sm relative`}
                    >
                      {course.displayLevel || '?'}
                    </div>
                    {/* Title */}
                    <h3 className="font-bold text-foreground text-sm truncate">{course.name}</h3>
                    {/* Metadata */}
                    <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground font-medium">
                      <span className="flex items-center gap-0.5">
                        <Layers className="w-3 h-3" />
                        {t('coursesLibrary.unitsCount', { count: course.totalUnits || 10 })}
                      </span>
                      {course.volume && (
                        <>
                          <span className="text-muted-foreground">|</span>
                          <span>VOL.{course.volume}</span>
                        </>
                      )}
                    </div>
                  </Button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default MobileCoursesOverview;
