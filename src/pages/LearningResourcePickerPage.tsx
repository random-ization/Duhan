import React, { useMemo, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { ChevronLeft, Search, Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useData } from '../contexts/DataContext';
import { useLearningActions, useLearningSelection } from '../contexts/LearningContext';
import {
  LearningFlowModule,
  buildLearningModulePath,
  resolveInstituteDefaultLevel,
} from '../utils/learningFlow';
import { Institute } from '../types';

type PublisherGroupKey = 'all' | 'yonsei' | 'seoul' | 'chungang' | 'oer' | 'topik' | 'other';

type PublisherTheme = {
  chipClass: string;
  headerClass: string;
  levelClass: string;
  hoverClass: string;
};

type PublisherTab = {
  id: string;
  label: string;
  count: number;
};

function isLearningFlowModule(value: string | undefined): value is LearningFlowModule {
  return (
    value === 'grammar' || value === 'vocabulary' || value === 'listening' || value === 'reading'
  );
}

function resolvePublisherGroup(publisher: string | undefined): Exclude<PublisherGroupKey, 'all'> {
  if (!publisher) return 'other';
  const normalized = publisher.toLowerCase();
  if (/(yonsei|연세)/i.test(normalized)) return 'yonsei';
  if (/(seoul national|snu|서울)/i.test(normalized)) return 'seoul';
  if (/(chung-?ang|중앙)/i.test(normalized)) return 'chungang';
  if (/(oer|open educational)/i.test(normalized)) return 'oer';
  if (/(topik|hanabira)/i.test(normalized)) return 'topik';
  return 'other';
}

function getPublisherGroupLabel(
  key: PublisherGroupKey,
  t: (key: string, options?: Record<string, unknown>) => string
) {
  if (key === 'all') return t('learningFlow.materials.publishers.all', { defaultValue: '全部' });
  if (key === 'yonsei') {
    return t('learningFlow.materials.publishers.yonsei', { defaultValue: '延世大学' });
  }
  if (key === 'seoul') {
    return t('learningFlow.materials.publishers.seoul', { defaultValue: '首尔大学' });
  }
  if (key === 'chungang') {
    return t('learningFlow.materials.publishers.chungang', { defaultValue: '中央大学' });
  }
  if (key === 'oer') {
    return t('learningFlow.materials.publishers.oer', { defaultValue: '开放资源' });
  }
  if (key === 'topik') {
    return t('learningFlow.materials.publishers.topik', { defaultValue: 'TOPIK' });
  }
  return t('learningFlow.materials.publishers.other', { defaultValue: '其他' });
}

function getPublisherLabel(
  course: Institute,
  t: (key: string, options?: Record<string, unknown>) => string
) {
  const publisher = course.publisher?.trim();
  if (publisher) return publisher;
  return getPublisherGroupLabel('other', t);
}

const MODULE_BADGE_THEME: Record<
  LearningFlowModule,
  { badge: string; emoji: string; chipClass: string }
> = {
  grammar: {
    badge: 'Grammar',
    emoji: '⚡️',
    chipClass: 'bg-violet-100 text-violet-700 border-violet-200',
  },
  vocabulary: {
    badge: 'Vocabulary',
    emoji: '🧩',
    chipClass: 'bg-green-100 text-green-700 border-green-200',
  },
  listening: {
    badge: 'Listening',
    emoji: '🎧',
    chipClass: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  reading: { badge: 'Reading', emoji: '📖', chipClass: 'bg-sky-100 text-sky-700 border-sky-200' },
};

const PUBLISHER_THEME: Record<Exclude<PublisherGroupKey, 'all'>, PublisherTheme> = {
  yonsei: {
    chipClass: 'bg-emerald-100 border-emerald-200 text-emerald-700',
    headerClass: 'bg-emerald-50 group-hover:bg-emerald-100',
    levelClass: 'text-emerald-600',
    hoverClass: 'group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-600',
  },
  seoul: {
    chipClass: 'bg-rose-100 border-rose-200 text-rose-700',
    headerClass: 'bg-rose-50 group-hover:bg-rose-100',
    levelClass: 'text-rose-600',
    hoverClass: 'group-hover:bg-rose-500 group-hover:text-white group-hover:border-rose-600',
  },
  chungang: {
    chipClass: 'bg-indigo-100 border-indigo-200 text-indigo-700',
    headerClass: 'bg-indigo-50 group-hover:bg-indigo-100',
    levelClass: 'text-indigo-600',
    hoverClass: 'group-hover:bg-indigo-500 group-hover:text-white group-hover:border-indigo-600',
  },
  oer: {
    chipClass: 'bg-amber-100 border-amber-200 text-amber-700',
    headerClass: 'bg-amber-50 group-hover:bg-amber-100',
    levelClass: 'text-amber-600',
    hoverClass: 'group-hover:bg-amber-500 group-hover:text-white group-hover:border-amber-600',
  },
  topik: {
    chipClass: 'bg-cyan-100 border-cyan-200 text-cyan-700',
    headerClass: 'bg-cyan-50 group-hover:bg-cyan-100',
    levelClass: 'text-cyan-600',
    hoverClass: 'group-hover:bg-cyan-500 group-hover:text-white group-hover:border-cyan-600',
  },
  other: {
    chipClass: 'bg-slate-100 border-slate-200 text-slate-700',
    headerClass: 'bg-slate-50 group-hover:bg-slate-100',
    levelClass: 'text-slate-600',
    hoverClass: 'group-hover:bg-slate-700 group-hover:text-white group-hover:border-slate-800',
  },
};

function parseLevelFromDisplay(course: Institute): number | null {
  const text = `${course.displayLevel || ''} ${course.volume || ''}`.trim();
  if (!text) return null;
  const match = text.match(/\d+/);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function resolveCardLevel(course: Institute): number {
  const fromDisplay = parseLevelFromDisplay(course);
  if (fromDisplay) return fromDisplay;
  return resolveInstituteDefaultLevel(course);
}

function resolveOriginalLevelLabel(
  course: Institute,
  t: (key: string, options?: Record<string, unknown>) => string
) {
  const displayLevel = course.displayLevel?.trim();
  if (displayLevel) return displayLevel;
  const volume = course.volume?.trim();
  if (volume) return volume;
  return t('courseDashboard.defaultDisplayLevel', {
    defaultValue: `Level ${resolveInstituteDefaultLevel(course)}`,
  });
}

export default function LearningResourcePickerPage() {
  const { moduleType } = useParams<{ moduleType: string }>();
  const navigate = useLocalizedNavigate();
  const { t } = useTranslation();
  const { institutes } = useData();
  const { selectedInstitute } = useLearningSelection();
  const { setSelectedInstitute, setSelectedLevel } = useLearningActions();

  if (!isLearningFlowModule(moduleType)) {
    return <Navigate to="/dashboard" replace />;
  }

  const moduleKey = moduleType;
  const moduleBadge = MODULE_BADGE_THEME[moduleKey];
  const sortedCourses = useMemo(() => {
    const list = [...((institutes || []) as Institute[])].sort((a, b) => {
      const aPublisher = getPublisherLabel(a, t);
      const bPublisher = getPublisherLabel(b, t);
      if (aPublisher !== bPublisher) return aPublisher.localeCompare(bPublisher);
      const aLevel = resolveCardLevel(a);
      const bLevel = resolveCardLevel(b);
      if (aLevel !== bLevel) return aLevel - bLevel;
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [institutes, t]);

  const [activePublisher, setActivePublisher] = useState<string>('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCourseId, setActiveCourseId] = useState<string | null>(() => {
    if (selectedInstitute && sortedCourses.some(course => course.id === selectedInstitute)) {
      return selectedInstitute;
    }
    return sortedCourses[0]?.id ?? null;
  });

  const publisherTabs = useMemo<PublisherTab[]>(() => {
    const counts = new Map<string, number>();
    for (const course of sortedCourses) {
      const label = getPublisherLabel(course, t);
      counts.set(label, (counts.get(label) || 0) + 1);
    }

    return [
      { id: 'all', label: getPublisherGroupLabel('all', t), count: sortedCourses.length },
      ...Array.from(counts.entries()).map(([label, count]) => ({ id: label, label, count })),
    ];
  }, [sortedCourses, t]);

  const filteredCourses = useMemo(() => {
    const byPublisher =
      activePublisher === 'all'
        ? sortedCourses
        : sortedCourses.filter(course => getPublisherLabel(course, t) === activePublisher);

    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return byPublisher;

    return byPublisher.filter(course => {
      const fields = [course.name, course.publisher, course.displayLevel, course.volume]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return fields.includes(keyword);
    });
  }, [activePublisher, searchQuery, sortedCourses, t]);

  const displayedCourses = useMemo(() => {
    const current = sortedCourses.find(course => course.id === activeCourseId) || null;
    if (!current) return filteredCourses;
    if (filteredCourses.some(course => course.id === current.id)) {
      return [current, ...filteredCourses.filter(course => course.id !== current.id)];
    }
    return [current, ...filteredCourses];
  }, [sortedCourses, activeCourseId, filteredCourses]);

  const handleSelectCourse = (courseId: string) => {
    const course = sortedCourses.find(item => item.id === courseId);
    if (!course) return;
    const level = resolveInstituteDefaultLevel(course);
    setActiveCourseId(course.id);
    setSelectedInstitute(course.id);
    setSelectedLevel(level);
    navigate(buildLearningModulePath(moduleKey, course.id));
  };

  return (
    <div
      className="min-h-screen w-full bg-[#F0F4F8] p-4 font-sans md:p-8"
      style={{
        backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)',
        backgroundSize: '24px 24px',
        backgroundAttachment: 'fixed',
      }}
    >
      <section className="mx-auto max-w-5xl">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-300 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 active:scale-95"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <div
                className={`mb-0.5 inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-black uppercase ${moduleBadge.chipClass}`}
              >
                <span>{moduleBadge.emoji}</span>
                <span>
                  {t(`courseDashboard.modules.${moduleKey}`, { defaultValue: moduleBadge.badge })}
                </span>
              </div>
              <h1 className="text-2xl font-black leading-none tracking-tight text-slate-900 md:text-3xl">
                {t('learningFlow.materials.title', { defaultValue: '选择教材' })}
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSearchOpen(prev => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-900 bg-white shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] transition-all active:translate-y-[2px] active:shadow-none"
          >
            <Search className="h-4.5 w-4.5" />
          </button>
        </header>

        {searchOpen && (
          <div className="mb-4">
            <input
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              className="w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-slate-900"
              placeholder={t('learningFlow.materials.searchPlaceholder', {
                defaultValue: '搜索教材/出版社...',
              })}
            />
          </div>
        )}

        <div className="mb-2 flex gap-2 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {publisherTabs.map(tab => {
            const isActive = activePublisher === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActivePublisher(tab.id)}
                title={tab.label}
                className={`shrink-0 rounded-full px-5 py-2 text-sm font-bold transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:scale-95'
                    : 'border-2 border-slate-200 bg-white text-slate-500 hover:border-slate-900 hover:text-slate-900'
                }`}
              >
                <span className="inline-block max-w-[9.5rem] truncate align-bottom">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3 pb-12 md:grid-cols-3 md:gap-5 lg:grid-cols-4 xl:grid-cols-5">
          {displayedCourses.map(course => {
            const isActive = activeCourseId === course.id;
            const publisherGroup = resolvePublisherGroup(course.publisher);
            const theme = PUBLISHER_THEME[publisherGroup];
            const level = resolveCardLevel(course);
            const levelLabel = resolveOriginalLevelLabel(course, t);

            return (
              <button
                key={course.id}
                type="button"
                onClick={() => handleSelectCourse(course.id)}
                className={`group relative flex flex-col overflow-hidden rounded-[1.25rem] border-2 bg-white text-left transition-all ${
                  isActive
                    ? 'border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]'
                    : 'border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] hover:-translate-y-1 hover:shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]'
                }`}
              >
                <div
                  className={`h-20 w-full border-b-2 border-slate-100 ${theme.headerClass} flex flex-col items-center justify-center transition-colors`}
                >
                  <span
                    className={`text-4xl md:text-[2.6rem] leading-none font-black ${theme.levelClass}`}
                  >
                    {level}
                  </span>
                  <span className="mt-0.5 text-[8px] md:text-[9px] font-black uppercase tracking-[0.22em] text-slate-500">
                    Level
                  </span>
                </div>

                <div className="flex-1 p-3.5">
                  <h3 className="line-clamp-2 text-sm md:text-[15px] font-black leading-snug text-slate-900">
                    {course.name}
                  </h3>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    {isActive && (
                      <span className="rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-black text-white">
                        {t('learningFlow.materials.current', { defaultValue: '当前' })}
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${theme.chipClass}`}
                    >
                      <Building2 className="h-2.5 w-2.5" />
                      {getPublisherLabel(course, t)}
                    </span>
                  </div>
                  <p className="mt-1 text-[10px] font-bold tracking-wide text-slate-500">
                    {levelLabel}
                  </p>
                  <p className="mt-1 text-[10px] font-bold tracking-wide text-slate-400">
                    {(course.totalUnits || 10).toString()}{' '}
                    {t('learningFlow.materials.units', { defaultValue: '个单元' })}
                  </p>
                </div>

                <div
                  className={`w-full border-t-2 border-slate-100 bg-slate-50 py-2 text-center text-[11px] font-black uppercase tracking-[0.16em] text-slate-400 transition-colors ${theme.hoverClass}`}
                >
                  {t('learningFlow.materials.selectBook', { defaultValue: '选择此书' })}
                </div>
              </button>
            );
          })}

          {displayedCourses.length === 0 && (
            <p className="col-span-full rounded-xl border-2 border-dashed border-slate-300 bg-white p-4 text-center text-sm font-bold text-slate-500">
              {t('learningFlow.materials.emptyPublisher', {
                defaultValue: 'No textbooks in this publisher group yet.',
              })}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
