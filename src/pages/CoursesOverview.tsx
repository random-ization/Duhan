import React, { useState, useMemo } from 'react';
// import { useAuth } from '../contexts/AuthContext';
// import { useData } from '../contexts/DataContext';
import { ChevronDown, Search, ChevronRight, Layers } from 'lucide-react';
import BackButton from '../components/ui/BackButton';
import { useQuery } from 'convex/react';
import { NoArgs, qRef } from '../utils/convexRefs';
import { useTranslation } from 'react-i18next';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';

const PUBLISHER_THEMES: Record<
  string,
  { bg: string; text: string; accent: string; border: string; light: string }
> = {
  延世大学: {
    bg: 'bg-indigo-100',
    text: 'text-indigo-600',
    accent: 'bg-indigo-500',
    border: 'border-indigo-900',
    light: 'bg-indigo-50',
  },
  首尔大学: {
    bg: 'bg-rose-100',
    text: 'text-rose-600',
    accent: 'bg-rose-500',
    border: 'border-rose-900',
    light: 'bg-rose-50',
  },
  中央大学: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-600',
    accent: 'bg-emerald-500',
    border: 'border-emerald-900',
    light: 'bg-emerald-50',
  },
  默认: {
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    accent: 'bg-slate-500',
    border: 'border-slate-900',
    light: 'bg-slate-50',
  },
};

const CoursesOverview: React.FC = () => {
  const navigate = useLocalizedNavigate();
  const { t } = useTranslation();

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
  type Publisher = { name: string; imageUrl?: string };
  const courses = useQuery(qRef<NoArgs, Course[]>('institutes:getAll'));
  const publishersData = useQuery(qRef<NoArgs, Publisher[]>('publishers:getAll'));
  const isLoading = courses === undefined;

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedPublisher, setExpandedPublisher] = useState<string | null>(null);

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
        const publisherMatch = course.publisher?.toLowerCase().includes(query);
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
  }, [courses, searchQuery, t]);

  // Auto-expand if searching or if only one group
  React.useEffect(() => {
    const groups = Object.keys(groupedCourses);
    if (groups.length === 1) {
      setExpandedPublisher(groups[0]);
    } else if (searchQuery && groups.length > 0) {
      setExpandedPublisher(groups[0]);
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

  return (
    <div
      className="w-full min-h-screen p-6 md:p-10 relative bg-[#F0F4F8]"
      style={{
        backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)',
        backgroundSize: '24px 24px',
        backgroundAttachment: 'fixed',
      }}
    >
      {/* --- Header --- */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 max-w-5xl mx-auto">
        <div className="flex items-start gap-4">
          <BackButton onClick={() => navigate('/dashboard')} />
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="bg-slate-900 text-white px-3 py-1 rounded text-xs font-black uppercase tracking-wider -rotate-2">
                {t('coursesLibrary.badge')}
              </span>
              <h1 className="font-display text-4xl font-black text-slate-900 tracking-tight">
                {t('coursesLibrary.title')}
              </h1>
            </div>
            <p className="text-slate-500 font-bold">
              {isLoading
                ? t('loading')
                : t('coursesLibrary.summary', { count: courses?.length || 0 })}
            </p>
          </div>
        </div>

        {/* Search Box */}
        <div className="relative w-full md:w-72 group">
          <input
            type="text"
            placeholder={t('coursesLibrary.searchPlaceholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-2xl border-2 border-slate-900 focus:outline-none focus:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] transition-all bg-white placeholder:text-slate-400 font-bold"
          />
          <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 group-focus-within:text-slate-900 transition-colors" />
        </div>
      </div>

      {/* --- Drawers Container --- */}
      <div className="max-w-5xl mx-auto space-y-6">
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="h-24 bg-white border-2 border-slate-200 rounded-2xl animate-pulse"
              />
            ))}
          </div>
        )}

        {!isLoading && Object.keys(groupedCourses).length === 0 && (
          <div className="text-center py-20 text-slate-400 font-bold">
            {t('coursesLibrary.noResults')}
          </div>
        )}

        {Object.entries(groupedCourses).map(([publisher, groupCourses]) => {
          const theme = getTheme(publisher);
          const isOpen = expandedPublisher === publisher;

          return (
            <div key={publisher} className={`group ${isOpen ? 'drawer-open' : ''}`}>
              <button
                onClick={() => toggleDrawer(publisher)}
                className="w-full relative z-20 text-left transition-transform active:scale-[0.99]"
              >
                {/* Publisher Badge Tab */}
                <div
                  className={`absolute -top-7 left-6 ${theme.accent} border-2 border-b-0 border-slate-900 px-6 py-1.5 rounded-t-xl z-0 transition-transform group-hover:-translate-y-1`}
                >
                  <span className="text-white text-xs font-black tracking-widest uppercase">
                    {t('coursesLibrary.publisherBadge')}
                  </span>
                </div>

                {/* Main Drawer Header Card */}
                <div
                  className={`bg-white border-2 border-slate-900 rounded-2xl p-5 md:p-6 shadow-[5px_5px_0px_0px_rgba(15,23,42,1)] hover:shadow-[7px_7px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-0.5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 ${isOpen ? 'rounded-b-none border-b-0 shadow-none hover:shadow-none hover:translate-y-0' : ''}`}
                >
                  <div className="flex items-center gap-5">
                    <div
                      className={`w-16 h-16 ${theme.bg} border-2 border-slate-900 rounded-xl flex items-center justify-center shadow-sm group-hover:rotate-3 transition-transform overflow-hidden relative`}
                    >
                      {publishersData?.find(p => p.name === publisher)?.imageUrl ? (
                        <img
                          src={publishersData.find(p => p.name === publisher)?.imageUrl}
                          alt={publisher}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className={`font-display text-3xl font-black ${theme.text}`}>
                          {publisher.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div>
                      <h2
                        className={`font-display text-2xl md:text-3xl font-black text-slate-900 ${isOpen ? theme.text : 'group-hover:' + theme.text} transition-colors`}
                      >
                        {publisher}
                      </h2>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="bg-slate-100 border border-slate-900 px-2 py-0.5 rounded text-xs font-bold text-slate-600">
                          {t('coursesLibrary.booksCount', { count: groupCourses.length })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                    {/* Progress Placeholder (Optional) */}
                    <div className="hidden md:block w-32 opacity-50">
                      <div className="w-full h-2 bg-slate-100 border border-slate-900 rounded-full overflow-hidden">
                        <div className={`h-full ${theme.accent} w-0`}></div>
                      </div>
                    </div>

                    <div
                      className={`w-10 h-10 border-2 border-slate-900 rounded-full flex items-center justify-center transition-all ${isOpen ? 'bg-slate-900 text-white' : 'bg-white'}`}
                    >
                      <ChevronDown
                        className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </div>
                </div>
              </button>

              {/* Drawer Content */}
              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
              >
                <div className="overflow-hidden bg-white border-2 border-t-0 border-slate-900 rounded-b-2xl shadow-[5px_5px_0px_0px_rgba(15,23,42,1)] -mt-[2px] z-0">
                  <div
                    className={`px-6 pt-6 pb-8 ${theme.light}`}
                    style={{
                      backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)',
                      backgroundSize: '12px 12px',
                    }}
                  >
                    <div className="w-full h-0.5 bg-slate-200 mb-6 border-b-2 border-dashed border-slate-300/50"></div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {groupCourses.map(course => (
                        <div
                          key={course._id || course.id}
                          onClick={() => navigate(`/course/${course.id || course.postgresId}`)}
                          className="flex w-full bg-white border-2 border-slate-900 rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] hover:shadow-[6px_6px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-0.5 transition-all cursor-pointer overflow-hidden group/card h-20"
                        >
                          {/* Left: Level Strip */}
                          <div
                            className={`w-14 ${theme.accent} border-r-2 border-slate-900 flex flex-col items-center justify-center relative overflow-hidden`}
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

                            <span className="text-2xl font-black text-white leading-none italic relative z-10">
                              {course.displayLevel
                                ? t('coursesLibrary.levelTag', { level: course.displayLevel })
                                : '?'}
                            </span>
                          </div>

                          {/* Center: Content */}
                          <div className="flex-1 px-4 flex flex-col justify-center min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-black text-lg text-slate-900 leading-tight group-hover/card:text-blue-600 transition-colors truncate">
                                {course.name}
                              </h3>
                              {course.volume && (
                                <span className="shrink-0 text-[10px] font-black bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-300 uppercase">
                                  VOL.{course.volume}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                              <div className="text-xs font-bold text-slate-500 flex items-center gap-1">
                                <Layers size={14} />
                                {t('coursesLibrary.unitsCount', { count: course.totalUnits || 10 })}
                              </div>
                            </div>
                          </div>

                          {/* Right: Arrow Actions */}
                          <div className="w-12 border-l-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50 group-hover/card:bg-slate-100 transition-colors">
                            <ChevronRight className="w-5 h-5 text-slate-400 group-hover/card:text-slate-900 transition-colors" />
                          </div>
                        </div>
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
