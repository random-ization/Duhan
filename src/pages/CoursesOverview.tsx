import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { ChevronDown, Search, ChevronRight, Layers, BookMarked } from 'lucide-react';
import BackButton from '../components/ui/BackButton';
import { useQuery } from 'convex/react';
import { NoArgs, qRef } from '../utils/convexRefs';
import { useTranslation } from 'react-i18next';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useIsMobile } from '../hooks/useIsMobile';
import MobileCoursesOverview from '../components/mobile/MobileCoursesOverview';
import { getCourseCoverTransitionName } from '../utils/viewTransitions';
import { Button, Input } from '../components/ui';

const PUBLISHER_THEMES: Record<
  string,
  { bg: string; text: string; accent: string; border: string; light: string }
> = {
  延世大学: {
    bg: 'bg-indigo-100 dark:bg-indigo-400/16',
    text: 'text-indigo-600 dark:text-indigo-300',
    accent: 'bg-indigo-500 dark:bg-indigo-400/70',
    border: 'border-indigo-900 dark:border-indigo-300/50',
    light: 'bg-indigo-50 dark:bg-indigo-400/10',
  },
  연세대학교: {
    bg: 'bg-indigo-100 dark:bg-indigo-400/16',
    text: 'text-indigo-600 dark:text-indigo-300',
    accent: 'bg-indigo-500 dark:bg-indigo-400/70',
    border: 'border-indigo-900 dark:border-indigo-300/50',
    light: 'bg-indigo-50 dark:bg-indigo-400/10',
  },
  首尔大学: {
    bg: 'bg-rose-100 dark:bg-rose-400/16',
    text: 'text-rose-600 dark:text-rose-300',
    accent: 'bg-rose-500 dark:bg-rose-400/70',
    border: 'border-rose-900 dark:border-rose-300/50',
    light: 'bg-rose-50 dark:bg-rose-400/10',
  },
  서울대학교: {
    bg: 'bg-rose-100 dark:bg-rose-400/16',
    text: 'text-rose-600 dark:text-rose-300',
    accent: 'bg-rose-500 dark:bg-rose-400/70',
    border: 'border-rose-900 dark:border-rose-300/50',
    light: 'bg-rose-50 dark:bg-rose-400/10',
  },
  中央大学: {
    bg: 'bg-emerald-100 dark:bg-emerald-400/16',
    text: 'text-emerald-600 dark:text-emerald-300',
    accent: 'bg-emerald-500 dark:bg-emerald-400/70',
    border: 'border-emerald-900 dark:border-emerald-300/50',
    light: 'bg-emerald-50 dark:bg-emerald-400/10',
  },
  중앙대학교: {
    bg: 'bg-emerald-100 dark:bg-emerald-400/16',
    text: 'text-emerald-600 dark:text-emerald-300',
    accent: 'bg-emerald-500 dark:bg-emerald-400/70',
    border: 'border-emerald-900 dark:border-emerald-300/50',
    light: 'bg-emerald-50 dark:bg-emerald-400/10',
  },
  默认: {
    bg: 'bg-muted',
    text: 'text-muted-foreground',
    accent: 'bg-primary',
    border: 'border-foreground',
    light: 'bg-muted',
  },
};

const PUBLISHER_TRANSLATIONS: Record<
  string,
  { ko: string; zh: string; en: string; vi: string; mn: string }
> = {
  延世大学: {
    ko: '연세대학교',
    zh: '延世大学',
    en: 'Yonsei University',
    vi: 'Đại học Yonsei',
    mn: 'Ёнсэ их сургууль',
  },
  연세대학교: {
    ko: '연세대학교',
    zh: '延世大学',
    en: 'Yonsei University',
    vi: 'Đại học Yonsei',
    mn: 'Ёнсэ их сургууль',
  },
  首尔大学: {
    ko: '서울대학교',
    zh: '首尔大学',
    en: 'Seoul National University',
    vi: 'Đại học Quốc gia Seoul',
    mn: 'Сөүлийн үндэсний их сургууль',
  },
  서울대학교: {
    ko: '서울대학교',
    zh: '首尔大学',
    en: 'Seoul National University',
    vi: 'Đại học Quốc gia Seoul',
    mn: 'Сөүлийн үндэсний их сургууль',
  },
  中央大学: {
    ko: '중앙대학교',
    zh: '中央大学',
    en: 'Chung-Ang University',
    vi: 'Đại học Chung-Ang',
    mn: 'Чүнган их сургууль',
  },
  중앙대학교: {
    ko: '중앙대학교',
    zh: '中央大学',
    en: 'Chung-Ang University',
    vi: 'Đại học Chung-Ang',
    mn: 'Чүнган их сургууль',
  },
};

const CoursesOverview: React.FC = () => {
  const navigate = useLocalizedNavigate();
  const { t, i18n } = useTranslation();
  const isMobile = useIsMobile();
  const currentLang = useMemo(() => (i18n.language || 'en').split('-')[0], [i18n.language]);

  // 1. Fetch Data
  type Course = {
    id: string;
    _id?: string;
    postgresId?: string;
    name: string;
    publisher?: string;
    displayLevel?: string;
    coverUrl?: string;
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
    imageUrl?: string;
  };
  const courses = useQuery(qRef<NoArgs, Course[]>('institutes:getAll'));
  const publishersData = useQuery(qRef<NoArgs, Publisher[]>('publishers:getAll'));
  const isLoading = courses === undefined;

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPublisher, setExpandedPublisher] = useState<string | null>(null);

  const publishersByName = useMemo(() => {
    const entries = publishersData?.map(p => [p.name, p] as const) || [];
    return new Map(entries);
  }, [publishersData]);

  const getPublisherNames = useCallback(
    (publisher: string) => {
      const data = publishersByName.get(publisher);
      const fallback = PUBLISHER_TRANSLATIONS[publisher];
      const primary = data?.nameKo || fallback?.ko || publisher;
      let localized: string | undefined;
      switch (currentLang) {
        case 'zh':
          localized = data?.nameZh || fallback?.zh;
          break;
        case 'en':
          localized = data?.nameEn || fallback?.en;
          break;
        case 'vi':
          localized = data?.nameVi || fallback?.vi;
          break;
        case 'mn':
          localized = data?.nameMn || fallback?.mn;
          break;
        default:
          localized = undefined;
          break;
      }
      return {
        primary,
        localized: localized && localized !== primary ? localized : undefined,
      };
    },
    [currentLang, publishersByName]
  );

  const getPublisherSearchValues = useCallback(
    (publisher: string) => {
      const data = publishersByName.get(publisher);
      const fallback = PUBLISHER_TRANSLATIONS[publisher];
      return [
        publisher,
        data?.nameKo,
        data?.nameZh,
        data?.nameEn,
        data?.nameVi,
        data?.nameMn,
        fallback?.ko,
        fallback?.zh,
        fallback?.en,
        fallback?.vi,
        fallback?.mn,
      ].filter(Boolean) as string[];
    },
    [publishersByName]
  );

  // 2. Group Data by Publisher
  const groupedCourses = useMemo(() => {
    if (!courses) return {};

    const groups: Record<string, Course[]> = {};

    // Filter first
    const filtered = courses.filter(course => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const titleMatch = course.name.toLowerCase().includes(query);
        const levelMatch = course.displayLevel?.toLowerCase().includes(query);
        const publisherMatch = getPublisherSearchValues(course.publisher || '').some(value =>
          value.toLowerCase().includes(query)
        );
        if (!titleMatch && !levelMatch && !publisherMatch) return false;
      }
      return true;
    });

    // Then Group
    filtered.forEach(course => {
      const pub = course.publisher || t('coursesLibrary.otherPublisher');
      if (!groups[pub]) groups[pub] = [];
      groups[pub].push(course);
    });

    // Sort groups? Maybe predefined order or alphabetical
    // Sort courses within group?
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        // Try to sort by volume/level if possible
        return a.name.localeCompare(b.name);
      });
    });

    return groups;
  }, [courses, searchQuery, t, getPublisherSearchValues]);

  // Auto-expand if searching or if only one group
  useEffect(() => {
    const groups = Object.keys(groupedCourses);
    if (groups.length === 1 || (searchQuery && groups.length > 0)) {
      const target = groups[0];
      // Use a small timeout to avoid synchronous setState during effect which can trigger cascading render warnings
      const timer = setTimeout(() => {
        setExpandedPublisher(prev => (prev === target ? prev : target));
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [groupedCourses, searchQuery]);

  const toggleDrawer = (publisher: string) => {
    if (expandedPublisher === publisher) {
      setExpandedPublisher(null);
    } else {
      setExpandedPublisher(publisher);
    }
  };

  const getTheme = (publisher: string) => {
    for (const key in PUBLISHER_THEMES) {
      if (publisher.includes(key)) return PUBLISHER_THEMES[key];
    }
    return PUBLISHER_THEMES['默认'];
  };

  // Return mobile version on small screens (after all hooks)
  if (isMobile) {
    return <MobileCoursesOverview />;
  }

  return (
    <div
      className="w-full min-h-screen p-6 md:p-10 relative bg-background"
      style={{
        backgroundImage: 'radial-gradient(hsl(var(--border)) 1.5px, transparent 1.5px)',
        backgroundSize: '24px 24px',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* --- Header --- */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 max-w-6xl mx-auto">
        <div className="flex items-start gap-4">
          <BackButton onClick={() => navigate('/dashboard')} />
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-primary text-primary-foreground px-3 py-1 rounded text-xs font-black uppercase tracking-wider -rotate-2">
                {t('coursesLibrary.badge')}
              </span>
              <h1 className="font-display text-4xl font-black text-foreground tracking-tight">
                {t('coursesLibrary.title')}
              </h1>
            </div>
            <p className="text-muted-foreground font-bold">
              {isLoading
                ? t('loading')
                : t('coursesLibrary.summary', { count: courses?.length || 0 })}
            </p>
          </div>
        </div>

        {/* Search Box */}
        <div className="relative w-full md:w-[30rem] group">
          <Input
            type="text"
            placeholder={t('coursesLibrary.searchPlaceholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full !h-auto !pl-10 !pr-4 !py-3 !rounded-2xl !border-2 !border-foreground focus-visible:!shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition-all !bg-card placeholder:text-muted-foreground font-bold !shadow-none"
          />
          <Search className="w-5 h-5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-foreground transition-colors" />
        </div>
      </div>

      {/* --- Drawers Container --- */}
      <div className="max-w-6xl mx-auto space-y-6">
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="h-24 bg-card border-2 border-border rounded-2xl animate-pulse"
              />
            ))}
          </div>
        )}

        {!isLoading && Object.keys(groupedCourses).length === 0 && (
          <div className="text-center py-20 text-muted-foreground font-bold">
            {t('coursesLibrary.noResults')}
          </div>
        )}

        {Object.entries(groupedCourses).map(([publisher, groupCourses]) => {
          const theme = getTheme(publisher);
          const isOpen = expandedPublisher === publisher;
          const publisherData = publishersByName.get(publisher);
          const displayNames = getPublisherNames(publisher);

          return (
            <div key={publisher} className={`group ${isOpen ? 'drawer-open' : ''}`}>
              <Button
                onClick={() => toggleDrawer(publisher)}
                variant="ghost"
                size="auto"
                className="w-full relative z-20 text-left transition-transform active:scale-[0.99] !flex !whitespace-normal !justify-start !items-stretch !shadow-none !border-0"
              >
                {/* Publisher Badge Tab */}
                <div
                  className={`absolute -top-7 left-6 ${theme.accent} border-2 border-b-0 border-foreground px-6 py-1.5 rounded-t-xl z-0 transition-transform group-hover:-translate-y-1`}
                >
                  <span className="text-primary-foreground text-xs font-black tracking-widest uppercase">
                    {t('coursesLibrary.publisherBadge')}
                  </span>
                </div>

                {/* Main Drawer Header Card */}
                <div
                  className={`w-full bg-card border-2 border-foreground rounded-2xl p-5 md:p-6 shadow-[5px_5px_0px_0px_rgba(15,23,42,1)] hover:shadow-[7px_7px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-0.5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 ${isOpen ? 'rounded-b-none border-b-0 shadow-none hover:shadow-none hover:translate-y-0' : ''}`}
                >
                  <div className="flex items-center gap-5">
                    <div
                      className={`w-16 h-16 ${theme.bg} border-2 border-foreground rounded-xl flex items-center justify-center shadow-sm group-hover:rotate-3 transition-transform overflow-hidden relative`}
                    >
                      {publisherData?.imageUrl ? (
                        <img
                          src={publisherData.imageUrl}
                          alt={displayNames.primary}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className={`font-display text-3xl font-black ${theme.text}`}>
                          {displayNames.primary.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div>
                      <h2
                        className={`font-display text-2xl md:text-3xl font-black text-foreground ${isOpen ? theme.text : 'group-hover:' + theme.text} transition-colors`}
                      >
                        {displayNames.primary}
                      </h2>
                      {displayNames.localized && (
                        <div className="text-xs font-bold text-muted-foreground mt-1">
                          {displayNames.localized}
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        <span className="bg-muted border border-foreground px-2 py-0.5 rounded text-xs font-bold text-muted-foreground">
                          {t('coursesLibrary.booksCount', { count: groupCourses.length })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 w-full md:w-auto justify-end">
                    <div
                      className={`w-10 h-10 border-2 border-foreground rounded-full flex items-center justify-center transition-all ${isOpen ? 'bg-primary text-primary-foreground' : 'bg-card'}`}
                    >
                      <ChevronDown
                        className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </div>
                </div>
              </Button>

              {/* Drawer Content */}
              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
              >
                <div
                  className={`overflow-hidden rounded-b-2xl -mt-[2px] z-0 transition-all ${isOpen ? 'bg-card border-2 border-t-0 border-foreground shadow-[5px_5px_0px_0px_rgba(15,23,42,1)]' : 'border-0 shadow-none bg-transparent'}`}
                >
                  <div
                    className={`px-6 pt-6 pb-8 ${theme.light}`}
                    style={{
                      backgroundImage:
                        'radial-gradient(hsl(var(--border)) 1.5px, transparent 1.5px)',
                      backgroundSize: '12px 12px',
                    }}
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-[minmax(104px,auto)]">
                      {groupCourses.map(course => (
                        <Button
                          key={course._id || course.id}
                          onClick={() => navigate(`/course/${course.id}`)}
                          variant="ghost"
                          size="auto"
                          className="flex w-full bg-card border-2 border-foreground rounded-2xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-0.5 transition-all overflow-hidden group/card min-h-[104px] text-left !justify-start !items-stretch !whitespace-normal"
                        >
                          {/* Left: Level Strip */}
                          <div
                            className={`w-16 ${theme.accent} border-r-2 border-foreground flex flex-col items-center justify-center relative overflow-hidden px-1 self-stretch`}
                          >
                            {/* Diagonal stripes pattern overlay */}
                            <div
                              className="absolute inset-0 opacity-10"
                              style={{
                                backgroundImage:
                                  'linear-gradient(45deg, #000 25%, transparent 25%, transparent 50%, #000 50%, #000 75%, transparent 75%, transparent)',
                                backgroundSize: '4px 4px',
                              }}
                            ></div>

                            <span className="text-base font-black text-primary-foreground leading-none relative z-10 whitespace-nowrap">
                              {course.displayLevel
                                ? t('coursesLibrary.levelTag', { level: course.displayLevel })
                                : '?'}
                            </span>
                          </div>

                          {/* Center: Content */}
                          <div className="flex-1 px-4 py-3 flex flex-col justify-center min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-black text-lg text-foreground leading-snug group-hover/card:text-primary transition-colors line-clamp-2 break-words">
                                {course.name}
                              </h3>
                              {course.volume && (
                                <span className="shrink-0 text-[10px] font-black bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border uppercase">
                                  VOL.{course.volume}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <div className="text-xs font-bold text-muted-foreground flex items-center gap-1">
                                <Layers size={14} />
                                {t('coursesLibrary.unitsCount', { count: course.totalUnits || 10 })}
                              </div>
                            </div>
                          </div>

                          {/* Right: Shared Cover + Arrow */}
                          <div className="w-[76px] border-l-2 border-dashed border-border flex flex-col items-center justify-center gap-2 bg-muted group-hover/card:bg-accent transition-colors self-stretch p-2">
                            <div
                              className="w-10 h-14 rounded-lg border border-border bg-card overflow-hidden shadow-sm"
                              style={
                                {
                                  viewTransitionName: getCourseCoverTransitionName(course.id),
                                } as React.CSSProperties
                              }
                            >
                              {course.coverUrl ? (
                                <img
                                  src={course.coverUrl}
                                  alt={course.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full grid place-items-center bg-indigo-50 dark:bg-indigo-400/12">
                                  <BookMarked className="w-4 h-4 text-indigo-300 dark:text-indigo-200/75" />
                                </div>
                              )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover/card:text-foreground transition-colors" />
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CoursesOverview;
