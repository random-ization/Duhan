import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, ChevronRight } from 'lucide-react';
import { useQuery } from 'convex/react';
import { GRAMMARS, NoArgs, VOCAB, qRef } from '../../utils/convexRefs';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { useAuth } from '../../contexts/AuthContext';
import { useLearningActions, useLearningSelection } from '../../contexts/LearningContext';
import { Button, Input } from '../ui';
import { MobilePageIntro } from './MobilePageIntro';
import { VocabIcon, GrammarIcon, ListeningIcon, ReadingIcon } from '../ui/CustomIcons';
import type { Institute } from '../../types';
import {
  buildLearningModulePath,
  buildLearningPickerPath,
  normalizeLearningFlowModule,
  resolveInstituteDefaultLevel,
  type LearningFlowModule,
  type LearningMaterialSelection,
} from '../../utils/learningFlow';

type PublisherTheme = {
  gradient: string;
  chipBg: string;
  chipText: string;
  levelBg: string;
  levelText: string;
};

type PublisherKey = 'oer' | 'yonsei' | 'seoulNational' | 'chungAng' | 'topikGrammar' | 'default';
type KnownPublisherKey = Exclude<PublisherKey, 'default'>;
type Course = Institute & { _id?: string };

type Publisher = {
  name: string;
  nameKo?: string;
  nameZh?: string;
  nameEn?: string;
  nameVi?: string;
  nameMn?: string;
};

type ProgressSummary = {
  completedCount: number;
  totalUnits: number;
  lastUnitIndex?: number;
} | null;

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

const LEARNING_MODULE_META: Record<
  LearningFlowModule,
  {
    badge: string;
    icon: string;
    gradient: string;
    border: string;
    accent: string;
    titleKey: string;
    titleDefault: string;
    descriptionDefault: string;
  }
> = {
  vocabulary: {
    badge: 'vocabulary',
    icon: '🧩',
    gradient: 'from-emerald-400/20 to-transparent',
    border: 'border-emerald-200/50 dark:border-emerald-300/20',
    accent: 'text-emerald-700 dark:text-emerald-200',
    titleKey: 'courseDashboard.modules.vocabulary',
    titleDefault: 'Vocabulary',
    descriptionDefault: 'Flashcards, learn mode, and active recall drills.',
  },
  grammar: {
    badge: 'grammar',
    icon: '⚡️',
    gradient: 'from-violet-400/20 to-transparent',
    border: 'border-violet-200/50 dark:border-violet-300/20',
    accent: 'text-violet-700 dark:text-violet-200',
    titleKey: 'courseDashboard.modules.grammar',
    titleDefault: 'Grammar',
    descriptionDefault: 'Patterns, explanations, and sentence structures.',
  },
  listening: {
    badge: 'listening',
    icon: '🎧',
    gradient: 'from-amber-400/20 to-transparent',
    border: 'border-amber-200/50 dark:border-amber-300/20',
    accent: 'text-amber-700 dark:text-amber-200',
    titleKey: 'courseDashboard.modules.listening',
    titleDefault: 'Listening',
    descriptionDefault: 'Textbook audio, transcript, and comprehension practice.',
  },
  reading: {
    badge: 'reading',
    icon: '📘',
    gradient: 'from-blue-400/20 to-transparent',
    border: 'border-blue-200/50 dark:border-blue-300/20',
    accent: 'text-blue-700 dark:text-blue-200',
    titleKey: 'courseDashboard.modules.reading',
    titleDefault: 'Reading',
    descriptionDefault: 'Textbook passages, article drills, and lookup tools.',
  },
};

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

function getValidUnitNumber(value: number | null | undefined): number | null {
  return typeof value === 'number' && value > 0 ? value : null;
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

function getFilteredCoursesForModule(
  courses: Course[] | undefined,
  module: LearningFlowModule | null
): Course[] {
  if (!courses) return [];
  if (module === 'grammar') return courses;
  return courses.filter(course => course.id !== PRIORITY_COURSE_ID);
}

function resolveMaterialName(
  material: LearningMaterialSelection | null,
  courses: Course[]
): string {
  if (!material?.instituteId) return '';
  return courses.find(course => course.id === material.instituteId)?.name || material.instituteId;
}

function resolveMaterialForModule(
  module: LearningFlowModule,
  recentMaterials: Partial<Record<LearningFlowModule, LearningMaterialSelection>>,
  user: {
    lastInstitute?: string;
    lastLevel?: number;
    lastUnit?: number;
    lastModule?: string;
  } | null
): LearningMaterialSelection | null {
  const recentMaterial = recentMaterials[module];
  if (recentMaterial) return recentMaterial;
  const fallbackModule = normalizeLearningFlowModule(user?.lastModule ?? null);
  if (fallbackModule === module && user?.lastInstitute) {
    return {
      instituteId: user.lastInstitute,
      level: user.lastLevel || 1,
      unit: user.lastUnit,
    };
  }
  return null;
}

function LearningEntryCard({
  module,
  material,
  materialName,
  onOpen,
}: {
  module: LearningFlowModule;
  material: LearningMaterialSelection | null;
  materialName: string;
  onOpen: () => void;
}) {
  const { t, i18n } = useTranslation();
  const language = normalizeLanguageTag(i18n.language);

  const IconMap = {
    vocabulary: VocabIcon,
    grammar: GrammarIcon,
    listening: ListeningIcon,
    reading: ReadingIcon,
  };
  const Icon = IconMap[module];

  const vocabStats = useQuery(
    VOCAB.getStats,
    module === 'vocabulary' && material ? { courseId: material.instituteId } : 'skip'
  );
  const grammarPoints = useQuery(
    GRAMMARS.getByCourse,
    module === 'grammar' && material ? { courseId: material.instituteId, language } : 'skip'
  ) as Array<{ status?: string }> | undefined;
  const progressSummary = useQuery(
    qRef<{ courseId: string }, ProgressSummary>('progress:getCourseProgress'),
    (module === 'listening' || module === 'reading') && material
      ? { courseId: material.instituteId }
      : 'skip'
  );

  let statLine = t('learningFlow.mobileHub.selectMaterialHint', {
    defaultValue: 'Pick a textbook to start this learning path.',
  });
  let detailLine = t('learningFlow.mobileHub.selectMaterialCta', {
    defaultValue: 'Choose textbook',
  });

  if (material) {
    const materialUnit = getValidUnitNumber(material.unit);
    detailLine = materialUnit
      ? t('learningFlow.mobileHub.resumeFromUnit', {
          defaultValue: 'Unit {{unit}}',
          unit: materialUnit,
        })
      : t('dashboard.common.continueLearning', { defaultValue: 'Continue' });

    if (module === 'vocabulary') {
      if (vocabStats) {
        statLine = `${vocabStats.mastered} / ${vocabStats.total}`;
      } else {
        statLine = '...';
      }
    } else if (module === 'grammar') {
      if (grammarPoints) {
        const total = grammarPoints.length;
        const mastered = grammarPoints.filter(point => point.status === 'MASTERED').length;
        statLine = `${mastered} / ${total}`;
      } else {
        statLine = '...';
      }
    } else if (progressSummary) {
      statLine = `${progressSummary.completedCount || 0} / ${progressSummary.totalUnits || 0}`;
    }
  }

  return (
    <Button
      variant="outline"
      size="auto"
      onClick={onOpen}
      className={cn(
        'group relative w-full overflow-hidden rounded-[2.5rem] border border-indigo-100/30 bg-card/70 p-6 text-left shadow-lg backdrop-blur-md active:scale-95 active:rotate-1 transition-all duration-300 !flex !flex-col !items-start !justify-between !whitespace-normal rim-light grain-overlay',
        module === 'vocabulary' && 'hover:shadow-emerald-200/20',
        module === 'grammar' && 'hover:shadow-violet-200/20',
        module === 'listening' && 'hover:shadow-amber-200/20',
        module === 'reading' && 'hover:shadow-blue-200/20'
      )}
    >
      <div className="w-full relative z-10 flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 mb-5">
            <Icon size={24} className="shadow-lg" />
            <div className="inline-flex rounded-full bg-slate-100/50 dark:bg-slate-800/50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80 backdrop-blur-sm">
              {t(`courseDashboard.modules.${module}`, { defaultValue: module })}
            </div>
          </div>
          <h2 className="text-2xl font-black text-foreground tracking-tighter italic leading-tight text-balance">
            {t(`courseDashboard.modules.${module}`, { defaultValue: module })}
          </h2>
          <p className="mt-3 text-[11px] font-bold leading-relaxed text-muted-foreground/90 line-clamp-2 max-w-[220px]">
            {t(`learningFlow.mobileHub.${module}.description`, {
              defaultValue: LEARNING_MODULE_META[module].descriptionDefault,
            })}
          </p>
        </div>
      </div>

      <div className="mt-8 w-full">
        <div className="rounded-3xl bg-slate-50 dark:bg-slate-900 border border-border/50 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground block mb-1">
                {t('dashboard.textbook.default', { defaultValue: 'Textbook' })}
              </span>
              <p className="truncate text-sm font-black text-foreground">
                {material
                  ? materialName
                  : t('learningFlow.mobileHub.noMaterialSelected', {
                      defaultValue: 'Not selected',
                    })}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 block mb-1">
                {t('learningFlow.mobileHub.progressLabel', { defaultValue: 'Progress' })}
              </span>
              <p className="text-sm font-black text-foreground italic">{statLine}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600/60 dark:text-indigo-400/60">
            {material
              ? detailLine
              : t('learningFlow.mobileHub.pickMaterial', { defaultValue: 'Start Path' })}
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 group-active:translate-x-1 transition-transform">
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>
      </div>
    </Button>
  );
}

const MobileCoursesOverview: React.FC = () => {
  const navigate = useLocalizedNavigate();
  const [searchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { recentMaterials } = useLearningSelection();
  const { setRecentMaterial, setSelectedInstitute, setSelectedLevel } = useLearningActions();
  const currentLang = useMemo(() => (i18n.language || 'en').split('-')[0], [i18n.language]);
  const selectedModule = normalizeLearningFlowModule(searchParams.get('module'));

  const courses = useQuery(qRef<NoArgs, Course[]>('institutes:getAll'));
  const publishersData = useQuery(qRef<NoArgs, Publisher[]>('publishers:getAll'));
  const isLoading = courses === undefined;
  const [showLoadingIssue, setShowLoadingIssue] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!isLoading) return;
    const timer = globalThis.setTimeout(() => {
      setShowLoadingIssue(true);
    }, 7000);
    return () => {
      globalThis.clearTimeout(timer);
    };
  }, [isLoading]);

  const retryLoading = useCallback(() => {
    setShowLoadingIssue(false);
    if (typeof window !== 'undefined') window.location.reload();
  }, []);

  const shouldShowLoadingIssue = isLoading && showLoadingIssue;

  const publishersByName = useMemo(() => {
    const entries = publishersData?.map(publisher => [publisher.name, publisher] as const) || [];
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

  const getTheme = useCallback((publisher: string) => getThemeByPublisher(publisher), []);

  const filteredCourses = useMemo(
    () => getFilteredCoursesForModule(courses, selectedModule),
    [courses, selectedModule]
  );

  const groupedCourses = useMemo(() => {
    if (!filteredCourses) return {};
    const groups: Record<string, Course[]> = {};

    const filtered = filteredCourses.filter(course => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        course.name.toLowerCase().includes(query) ||
        course.displayLevel?.toLowerCase().includes(query) ||
        course.publisher?.toLowerCase().includes(query)
      );
    });

    for (const course of filtered) {
      const publisher = course.publisher || t('coursesLibrary.otherPublisher');
      if (!groups[publisher]) groups[publisher] = [];
      groups[publisher].push(course);
    }

    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => a.name.localeCompare(b.name));
    }

    return groups;
  }, [filteredCourses, searchQuery, t]);

  const groupedPublisherEntries = useMemo(
    () => Object.entries(groupedCourses).sort(([a], [b]) => a.localeCompare(b)),
    [groupedCourses]
  );

  const rememberedMaterials = useMemo(() => {
    return {
      vocabulary: resolveMaterialForModule('vocabulary', recentMaterials, user),
      grammar: resolveMaterialForModule('grammar', recentMaterials, user),
      listening: resolveMaterialForModule('listening', recentMaterials, user),
      reading: resolveMaterialForModule('reading', recentMaterials, user),
    };
  }, [recentMaterials, user]);

  const rememberedMaterialNames = useMemo(
    () => ({
      vocabulary: resolveMaterialName(rememberedMaterials.vocabulary, courses || []),
      grammar: resolveMaterialName(rememberedMaterials.grammar, courses || []),
      listening: resolveMaterialName(rememberedMaterials.listening, courses || []),
      reading: resolveMaterialName(rememberedMaterials.reading, courses || []),
    }),
    [courses, rememberedMaterials]
  );

  const openModule = useCallback(
    (module: LearningFlowModule) => {
      const remembered = rememberedMaterials[module];
      if (remembered?.instituteId) {
        setSelectedInstitute(remembered.instituteId);
        setSelectedLevel(remembered.level || 1);
        navigate(buildLearningModulePath(module, remembered.instituteId));
        return;
      }
      navigate(buildLearningPickerPath(module));
    },
    [navigate, rememberedMaterials, setSelectedInstitute, setSelectedLevel]
  );

  const handleCourseSelect = useCallback(
    (course: Course) => {
      if (!selectedModule) {
        navigate('/courses');
        return;
      }

      const level = resolveInstituteDefaultLevel(course);
      setSelectedInstitute(course.id);
      setSelectedLevel(level);
      setRecentMaterial(selectedModule, {
        instituteId: course.id,
        level,
      });
      navigate(buildLearningModulePath(selectedModule, course.id));
    },
    [navigate, selectedModule, setRecentMaterial, setSelectedInstitute, setSelectedLevel]
  );

  if (!selectedModule) {
    return (
      <div className="relative min-h-[calc(100vh-100px)] px-4 pt-6 pb-24 lg:px-8 mesh-gradient grain-overlay">
        <div className="mx-auto w-full max-w-4xl space-y-12">
          <div className="space-y-6">
            <header className="px-1 text-center">
              <h1 className="text-2xl font-black italic tracking-tighter text-foreground text-balance">
                {t('learningFlow.mobileHub.title', { defaultValue: 'What will you master today?' })}
              </h1>
            </header>

            <form className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none transition-colors group-focus-within:text-indigo-500">
                <Search className="h-4 w-4 text-muted-foreground/60" />
              </div>
              <Input
                type="text"
                placeholder={t('coursesLibrary.searchPlaceholder', {
                  defaultValue: 'Search textbooks...',
                })}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="h-12 w-full border-0 bg-transparent pl-11 pr-4 text-sm font-bold placeholder:text-muted-foreground/60 focus-visible:ring-0 shadow-none bg-card/60 rounded-2xl"
              />
            </form>
          </div>

          <main className="relative z-10 space-y-4">
            <LearningEntryCard
              module="vocabulary"
              material={rememberedMaterials.vocabulary}
              materialName={rememberedMaterialNames.vocabulary}
              onOpen={() => openModule('vocabulary')}
            />
            <LearningEntryCard
              module="grammar"
              material={rememberedMaterials.grammar}
              materialName={rememberedMaterialNames.grammar}
              onOpen={() => openModule('grammar')}
            />
            <LearningEntryCard
              module="listening"
              material={rememberedMaterials.listening}
              materialName={rememberedMaterialNames.listening}
              onOpen={() => openModule('listening')}
            />
            <LearningEntryCard
              module="reading"
              material={rememberedMaterials.reading}
              materialName={rememberedMaterialNames.reading}
              onOpen={() => openModule('reading')}
            />
          </main>
        </div>
      </div>
    );
  }

  const totalCourseCount = filteredCourses.length;
  const moduleTitle = t(LEARNING_MODULE_META[selectedModule].titleKey, {
    defaultValue: LEARNING_MODULE_META[selectedModule].titleDefault,
  });

  return (
    <div className="relative min-h-screen bg-background pb-mobile-nav">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.42] bg-[radial-gradient(hsl(var(--border))_1px,transparent_1px)] bg-[length:20px_20px]"></div>

      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/90 backdrop-blur-xl px-4 pt-[calc(env(safe-area-inset-top)+10px)] pb-4">
        <div className="mb-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="auto"
            onClick={() => navigate('/courses')}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card transition-transform active:scale-95"
          >
            <ArrowLeft className="h-4 w-4 text-muted-foreground" />
          </Button>
          <div className="min-w-0 flex-1" />
        </div>

        <div className="relative">
          <div className="mb-3">
            <MobilePageIntro
              eyebrow={t('learningFlow.mobileHub.selectMaterialCta', {
                defaultValue: 'Choose textbook',
              })}
              title={t('learningFlow.mobileHub.materialPickerTitle', {
                defaultValue: 'Select a textbook',
              })}
              description={t('learningFlow.mobileHub.materialPickerSummary', {
                defaultValue: '{{module}} · {{count}} textbooks',
                module: moduleTitle,
                count: totalCourseCount,
              })}
              badge={
                <div className="grid min-w-[88px] rounded-[22px] border border-border bg-card px-3 py-2 text-right shadow-sm">
                  <span className="text-[9px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                    {t('coursesLibrary.results', { defaultValue: 'Results' })}
                  </span>
                  <span className="mt-1 text-lg font-black text-foreground">
                    {totalCourseCount}
                  </span>
                </div>
              }
              className="border-none bg-transparent px-0 py-0 shadow-none"
            />
          </div>
          <div className="relative overflow-hidden rounded-[2rem] border border-border bg-muted/50 shadow-none">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('coursesLibrary.searchPlaceholder', {
                defaultValue: 'Search textbooks...',
              })}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-12 w-full border-0 bg-transparent pl-11 pr-4 text-sm font-bold placeholder:text-muted-foreground/60 focus-visible:ring-0 shadow-none"
            />
          </div>
        </div>
      </header>

      <main className="relative z-10 space-y-5 px-4 py-4">
        {isLoading && !shouldShowLoadingIssue && (
          <div className="space-y-5">
            {[1, 2].map(index => (
              <section
                key={index}
                className="rounded-2xl border border-border bg-card/70 p-3 animate-pulse"
              >
                <div className="mb-3 h-5 w-28 rounded bg-muted" />
                <div className="space-y-3">
                  {[1, 2, 3].map(item => (
                    <div key={item} className="h-20 rounded-xl bg-muted" />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {shouldShowLoadingIssue && (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <p className="text-sm font-bold text-muted-foreground mb-3">
              {t('coursesLibrary.loadError', {
                defaultValue: 'Unable to load textbooks right now.',
              })}
            </p>
            <Button
              variant="ghost"
              size="auto"
              onClick={retryLoading}
              className="h-11 px-4 rounded-xl border border-border bg-background font-bold"
            >
              {t('common.retry', { defaultValue: 'Retry' })}
            </Button>
          </div>
        )}

        {!isLoading && groupedPublisherEntries.length === 0 && (
          <div className="py-16 text-center font-bold text-muted-foreground">
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
                className="rounded-[2.5rem] border border-border bg-card/60 p-4 shadow-sm backdrop-blur-md"
              >
                <div className="mb-4 flex items-center justify-between gap-3 px-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`grid h-9 w-9 shrink-0 place-items-center rounded-2xl text-xs font-black ${theme.chipBg} ${theme.chipText}`}
                    >
                      {label.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-black text-foreground italic">
                        {label}
                      </h2>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                        {moduleTitle}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    {groupCourses.length} {t('coursesLibrary.items', { defaultValue: 'Units' })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {groupCourses.map(course => (
                    <Button
                      variant="outline"
                      size="auto"
                      key={course._id || course.id}
                      onClick={() => handleCourseSelect(course)}
                      className="group relative min-h-[160px] w-full rounded-[2rem] border border-border bg-card p-4 text-left shadow-sm transition-all active:scale-[0.98] !flex !flex-col !items-start !justify-between !whitespace-normal"
                    >
                      <div className="w-full">
                        <div
                          className={`inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-xl border border-border/50 px-2 ${theme.levelBg} ${theme.levelText} mb-3`}
                        >
                          <span className="text-xl font-black leading-none italic">
                            {course.displayLevel || '?'}
                          </span>
                        </div>
                        <h3 className="line-clamp-2 text-sm font-black leading-snug text-foreground">
                          {course.name}
                        </h3>
                      </div>

                      <div className="mt-4 flex w-full items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground line-clamp-1">
                          {course.id === PRIORITY_COURSE_ID
                            ? t('learningFlow.mobileHub.priorityCourse', {
                                defaultValue: 'Official',
                              })
                            : t('coursesLibrary.textbook', { defaultValue: 'Course' })}
                        </span>
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-muted-foreground group-active:translate-x-0.5 transition-transform">
                          <ChevronRight className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </section>
            );
          })}
      </main>
    </div>
  );
};

export default MobileCoursesOverview;
