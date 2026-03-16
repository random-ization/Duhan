import { useTranslation } from 'react-i18next';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { Zap, BookOpen, Trophy, Flame, BookMarked, Headphones } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui';

interface MobileCourseDashboardProps {
  readonly courseName: string;
  readonly instituteId: string;
  readonly overallProgress: number;
  readonly currentUnit: number;
  readonly totalUnits: number;
  readonly publisher?: string;
  readonly displayLevel?: string;
  readonly coverUrl?: string;
}

export function MobileCourseDashboard({
  courseName,
  instituteId,
  overallProgress,
  currentUnit,
  totalUnits,
  publisher,
  displayLevel,
  coverUrl,
}: MobileCourseDashboardProps) {
  const navigate = useLocalizedNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const isCurrentCourse = user?.lastInstitute === instituteId;
  const rawLastModule = isCurrentCourse ? user?.lastModule : undefined;
  const lastUnit =
    isCurrentCourse && typeof user?.lastUnit === 'number' ? user.lastUnit : undefined;

  const normalizedLastModule = (() => {
    const module = (rawLastModule || '').toUpperCase();
    if (module === 'VOCABULARY') return 'VOCAB';
    if (
      module === 'VOCAB' ||
      module === 'READING' ||
      module === 'LISTENING' ||
      module === 'GRAMMAR'
    ) {
      return module;
    }
    return 'READING';
  })();

  const moduleLabel = (() => {
    if (normalizedLastModule === 'VOCAB') {
      return t('courseDashboard.modules.vocabulary', { defaultValue: 'Vocabulary' });
    }
    if (normalizedLastModule === 'GRAMMAR') {
      return t('courseDashboard.modules.grammar', { defaultValue: 'Grammar' });
    }
    if (normalizedLastModule === 'LISTENING') {
      return t('courseDashboard.modules.listening', { defaultValue: 'Listening' });
    }
    return t('courseDashboard.modules.reading', { defaultValue: 'Reading' });
  })();

  const continuePath = (() => {
    if (normalizedLastModule === 'VOCAB') return `/course/${instituteId}/vocab`;
    if (normalizedLastModule === 'GRAMMAR') return `/course/${instituteId}/grammar`;
    if (normalizedLastModule === 'LISTENING') return `/course/${instituteId}/listening`;
    return `/course/${instituteId}/reading`;
  })();

  const resumeUnit = lastUnit ?? currentUnit;
  const resumeUnitLabel = t('dashboard.course.unit', { n: resumeUnit, defaultValue: 'Unit {{n}}' });
  const recentLine = `${t('courseDashboard.recentUnit', { unit: resumeUnit, defaultValue: 'Recently studied: Unit {{unit}}' })} · ${moduleLabel}`;

  return (
    <div className="flex flex-col min-h-screen px-4 pb-32 space-y-4 animate-in fade-in duration-500">
      {/* Top summary card: mobile adaptation of desktop header card */}
      <div className="rounded-3xl border border-border bg-card/70 backdrop-blur-sm p-4 shadow-[0_10px_28px_rgba(2,6,23,0.3)]">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-16 h-20 shrink-0 overflow-hidden rounded-2xl border border-border/80 bg-muted">
            {coverUrl ? (
              <img src={coverUrl} alt={courseName} className="w-full h-full object-cover" />
            ) : instituteId === 'ysk-1' ? (
              <div className="w-full h-full flex items-center justify-center bg-amber-50 dark:bg-amber-400/10">
                <span className="text-xs font-black text-amber-700 dark:text-amber-200">YSK</span>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookMarked className="w-7 h-7 text-muted-foreground" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-2xl font-black text-foreground leading-tight line-clamp-2 text-left">
                {courseName}
              </h2>
              <div className="flex items-center gap-1 bg-orange-50 dark:bg-orange-400/10 text-orange-600 dark:text-orange-200 px-2.5 py-1 rounded-full border border-orange-100 dark:border-orange-300/25 shrink-0">
                <Flame size={14} className="fill-orange-500 dark:fill-orange-300/90" />
                <span className="font-black text-xs">{user?.statistics?.dayStreak ?? 0}</span>
              </div>
            </div>
            <p className="mt-1 text-xs text-muted-foreground text-left line-clamp-2">
              {publisher || t('courseDashboard.defaultPublisher', { defaultValue: 'Publisher' })}
              {' · '}
              {t('courseDashboard.courseMeta', {
                level: displayLevel || t('courseDashboard.defaultDisplayLevel'),
                totalUnits,
              })}
            </p>
            <p className="mt-1 text-xs font-semibold text-muted-foreground text-left">
              {recentLine}
            </p>
          </div>
        </div>

        <div className="mb-3">
          <div className="flex justify-between text-xs font-bold mb-1">
            <span>{t('courseDashboard.overallProgress')}</span>
            <span>{overallProgress}%</span>
          </div>
          <div className="w-full bg-muted h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-primary dark:bg-primary/75 h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        <Button
          variant="ghost"
          size="auto"
          type="button"
          onClick={() => navigate(continuePath)}
          className="w-full rounded-2xl p-3 bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.99] transition-all"
        >
          <div className="flex items-center justify-between w-full gap-3">
            <div className="text-left">
              <p className="text-sm font-black leading-tight">
                {t('dashboard.course.continueLearning', { defaultValue: 'Continue Learning' })}
              </p>
              <p className="text-xs opacity-80 mt-0.5">
                {moduleLabel}
                <span className="opacity-70 mx-1">·</span>
                {resumeUnitLabel}
                <span className="opacity-70 mx-1">/</span>
                <span className="opacity-80">{totalUnits}</span>
              </p>
            </div>
            <BookOpen size={20} />
          </div>
        </Button>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="ghost"
          size="auto"
          type="button"
          onClick={() => navigate(`/course/${instituteId}/vocab`)}
          className="aspect-square bg-card rounded-3xl p-4 border border-border shadow-sm dark:shadow-[0_6px_22px_rgba(2,6,23,0.28)] flex flex-col justify-between items-start group active:scale-95 transition-all"
        >
          <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-400/12 text-indigo-500 dark:text-indigo-200 flex items-center justify-center group-hover:bg-indigo-500 dark:group-hover:bg-indigo-400/65 group-hover:text-white transition-colors">
            <Zap size={24} className="fill-current" />
          </div>
          <span className="font-bold text-sm text-muted-foreground">
            {t('dashboard.course.vocab', { defaultValue: 'Vocab' })}
          </span>
        </Button>

        <Button
          variant="ghost"
          size="auto"
          type="button"
          onClick={() => navigate(`/course/${instituteId}/grammar`)}
          className="aspect-square bg-card rounded-3xl p-4 border border-border shadow-sm dark:shadow-[0_6px_22px_rgba(2,6,23,0.28)] flex flex-col justify-between items-start group active:scale-95 transition-all"
        >
          <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-400/12 text-purple-500 dark:text-purple-200 flex items-center justify-center group-hover:bg-purple-500 dark:group-hover:bg-purple-400/65 group-hover:text-white transition-colors">
            <Trophy size={24} className="fill-current" />
          </div>
          <span className="font-bold text-sm text-muted-foreground">
            {t('dashboard.course.grammar', { defaultValue: 'Grammar' })}
          </span>
        </Button>

        <Button
          variant="ghost"
          size="auto"
          type="button"
          onClick={() => navigate(`/course/${instituteId}/reading`)}
          className="aspect-square bg-card rounded-3xl p-4 border border-border shadow-sm dark:shadow-[0_6px_22px_rgba(2,6,23,0.28)] flex flex-col justify-between items-start group active:scale-95 transition-all"
        >
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-400/12 text-blue-500 dark:text-blue-200 flex items-center justify-center group-hover:bg-blue-500 dark:group-hover:bg-blue-400/65 group-hover:text-white transition-colors">
            <BookOpen size={24} />
          </div>
          <span className="font-bold text-sm text-muted-foreground">
            {t('courseDashboard.modules.reading', { defaultValue: 'Reading' })}
          </span>
        </Button>

        <Button
          variant="ghost"
          size="auto"
          type="button"
          onClick={() => navigate(`/course/${instituteId}/listening`)}
          className="aspect-square bg-card rounded-3xl p-4 border border-border shadow-sm dark:shadow-[0_6px_22px_rgba(2,6,23,0.28)] flex flex-col justify-between items-start group active:scale-95 transition-all"
        >
          <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-400/12 text-amber-500 dark:text-amber-200 flex items-center justify-center group-hover:bg-amber-500 dark:group-hover:bg-amber-400/65 group-hover:text-white transition-colors">
            <Headphones size={24} />
          </div>
          <span className="font-bold text-sm text-muted-foreground">
            {t('courseDashboard.modules.listening', { defaultValue: 'Listening' })}
          </span>
        </Button>
      </div>
    </div>
  );
}
