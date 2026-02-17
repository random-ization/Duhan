import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { PlayCircle, Zap, BookOpen, Trophy, Flame, ChevronRight } from 'lucide-react';
import { useQuery } from 'convex/react';
import { qRef, NoArgs } from '../../utils/convexRefs';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui';

interface MobileCourseDashboardProps {
  readonly courseName: string;
  readonly instituteId: string;
  readonly overallProgress: number;
  readonly currentUnit: number;
  readonly totalUnits: number;
}

export function MobileCourseDashboard({
  courseName,
  instituteId,
  overallProgress,
  currentUnit,
  totalUnits,
}: MobileCourseDashboardProps) {
  const navigate = useLocalizedNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();

  // Podcast Data
  const historyData = useQuery(qRef<NoArgs, any[]>('podcasts:getHistory'), user ? {} : 'skip');

  const latestPodcast = useMemo(() => {
    if (historyData && historyData.length > 0) {
      return historyData[0];
    }
    return null;
  }, [historyData]);

  // If no history, maybe show a generic "Explore Podcasts" or modify the card

  return (
    <div className="flex flex-col min-h-screen px-4 pb-32 space-y-4 animate-in fade-in duration-500">
      {/* 1. Header */}
      <div className="flex justify-between items-end py-2">
        <div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
            {t('common.currentFocus', { defaultValue: 'Current Focus' })}
          </p>
          <h2 className="text-2xl font-black text-foreground leading-none">{courseName}</h2>
        </div>
        {/* Streak badge */}
        <div className="flex items-center gap-1 bg-orange-50 dark:bg-orange-400/10 text-orange-600 dark:text-orange-200 px-3 py-1.5 rounded-full border border-orange-100 dark:border-orange-300/25">
          <Flame size={16} className="fill-orange-500 dark:fill-orange-300/90" />
          <span className="font-black text-sm">{user?.statistics?.dayStreak ?? 0}</span>
        </div>
      </div>

      {/* 2. Bento Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Main Action Block - Unit Review */}
        <Button
          variant="ghost"
          size="auto"
          type="button"
          onClick={() => navigate(`/course/${instituteId}/reading`)}
          className="col-span-2 aspect-[2/1] bg-primary dark:bg-primary/70 rounded-3xl p-6 text-white relative overflow-hidden group active:scale-[0.98] transition-all shadow-xl dark:shadow-[0_16px_36px_rgba(2,6,23,0.45)]"
        >
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <BookOpen size={120} strokeWidth={1} />
          </div>
          <div className="relative z-10 h-full flex flex-col justify-between items-start">
            <span className="bg-card/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold border border-white/10">
              {t('dashboard.course.unit', { n: currentUnit, defaultValue: 'UNIT {{n}}' })}
              <span className="opacity-70 mx-1">/</span>
              <span className="opacity-70">{totalUnits}</span>
            </span>
            <div>
              <h3 className="text-3xl font-black mb-1">
                {t('dashboard.course.continueLearning', { defaultValue: 'Continue Learning' })}
              </h3>
              <p className="text-primary-foreground/80 text-sm font-medium">
                {t('dashboard.textbook.inProgress', { defaultValue: 'In Progress' })}
              </p>
            </div>
          </div>
        </Button>

        {/* Vocab */}
        <Button
          variant="ghost"
          size="auto"
          type="button"
          onClick={() => navigate(`/course/${instituteId}/vocab`)}
          className="aspect-square bg-card rounded-3xl p-4 border border-border shadow-sm dark:shadow-[0_6px_22px_rgba(2,6,23,0.28)] flex flex-col justify-between items-center group active:scale-95 transition-all"
        >
          <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-400/12 text-indigo-500 dark:text-indigo-200 flex items-center justify-center group-hover:bg-indigo-500 dark:group-hover:bg-indigo-400/65 group-hover:text-white transition-colors">
            <Zap size={24} className="fill-current" />
          </div>
          <span className="font-bold text-sm text-muted-foreground mb-1">
            {t('dashboard.course.vocab', { defaultValue: 'Vocab' })}
          </span>
        </Button>

        {/* Grammar */}
        <Button
          variant="ghost"
          size="auto"
          type="button"
          onClick={() => navigate(`/course/${instituteId}/grammar`)}
          className="aspect-square bg-card rounded-3xl p-4 border border-border shadow-sm dark:shadow-[0_6px_22px_rgba(2,6,23,0.28)] flex flex-col justify-between items-center group active:scale-95 transition-all"
        >
          <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-400/12 text-purple-500 dark:text-purple-200 flex items-center justify-center group-hover:bg-purple-500 dark:group-hover:bg-purple-400/65 group-hover:text-white transition-colors">
            <Trophy size={24} className="fill-current" />
          </div>
          <span className="font-bold text-sm text-muted-foreground mb-1">
            {t('dashboard.course.grammar', { defaultValue: 'Grammar' })}
          </span>
        </Button>

        {/* Podcast / Media (Wide) */}
        <Button
          variant="ghost"
          size="auto"
          type="button"
          onClick={() => {
            if (latestPodcast) {
              // Navigate to specific episode if possible
              // Use standard player navigation logic
              navigate('/podcasts/player', {
                state: {
                  episode: {
                    guid: latestPodcast.episodeGuid,
                    title: latestPodcast.episodeTitle,
                    audioUrl: latestPodcast.episodeUrl,
                    channel: {
                      title: latestPodcast.channelName,
                      artworkUrl: latestPodcast.channelImage,
                    },
                  },
                },
              });
            } else {
              navigate('/podcasts');
            }
          }}
          className="col-span-2 bg-card rounded-3xl p-4 border border-border shadow-sm dark:shadow-[0_6px_22px_rgba(2,6,23,0.28)] flex items-center gap-4 active:scale-[0.98] transition-all"
        >
          <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-400/14 flex-shrink-0 flex items-center justify-center relative overflow-hidden">
            {latestPodcast?.channelImage ? (
              <img
                src={latestPodcast.channelImage}
                alt="cover"
                className="w-full h-full object-cover"
              />
            ) : (
              <PlayCircle
                size={32}
                className="text-indigo-500 dark:text-indigo-200 relative z-10"
              />
            )}
            {!latestPodcast?.channelImage && (
              <div className="absolute inset-0 bg-indigo-500/10 dark:bg-indigo-400/16"></div>
            )}
          </div>
          <div className="flex-1 text-left">
            <div className="flex items-center gap-2 mb-1">
              {latestPodcast ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                    {t('common.continue', { defaultValue: 'Continue' })}
                  </span>
                </>
              ) : (
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                  {t('dashboard.course.newEpisode', { defaultValue: 'Podcasts' })}
                </span>
              )}
            </div>
            <h4 className="font-bold text-foreground leading-tight line-clamp-1">
              {latestPodcast
                ? latestPodcast.channelName
                : t('dashboard.podcast.explore', { defaultValue: 'Explore Podcasts' })}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {latestPodcast
                ? latestPodcast.episodeTitle
                : t('dashboard.podcast.desc', { defaultValue: 'Listen to Korean content' })}
            </p>
          </div>
          <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center">
            <ChevronRight size={20} className="text-muted-foreground" />
          </div>
        </Button>
      </div>

      {/* 3. Stats / Progress (Pill) */}
      <div className="bg-card rounded-3xl p-5 border border-border shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <span className="font-bold text-muted-foreground text-sm">
            {t('dashboard.course.overallProgress', { defaultValue: 'Overall Progress' })}
          </span>
          <span className="font-black text-foreground">{overallProgress}%</span>
        </div>
        <div className="w-full bg-muted h-3 rounded-full overflow-hidden">
          <div
            className="bg-primary dark:bg-primary/75 h-full rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
