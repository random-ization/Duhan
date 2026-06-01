import React from 'react';
import { Play, Search, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { buildPodcastChannelPath } from '../../utils/podcastRoutes';
import { formatSafeDateLabel } from '../../utils/dateLabel';
import { localeFromLanguage } from '../../utils/locale';
import { DesktopCard } from '../../components/desktop/ui/DesktopCard';
import { SectionHead } from '../../components/desktop/ui/SectionHead';
import { DesignChip } from '../../components/desktop/ui/DesignChip';
import { PodcastPlayerModule } from '../../components/podcast/PodcastPlayerModule';
import { Sheet, SheetContent, SheetTitle } from '../../components/ui/sheet';
import type { Language } from '../../types';
import { Labels, getLabel } from '../../utils/i18n';
import { cn } from '../../lib/utils';

interface PodcastChannel {
  _id?: string;
  id?: string;
  title: string;
  author?: string;
  artwork?: string;
  artworkUrl?: string;
  feedUrl?: string;
  itunesId?: string;
  views?: number;
}

interface HistoryItem {
  _id?: string;
  id?: string;
  episodeGuid?: string;
  episodeTitle: string;
  episodeUrl?: string;
  channelName: string;
  channelImage?: string;
  playedAt: number;
  progress?: number;
  duration?: number;
}

type SelectedPodcastEpisode = {
  guid?: string;
  title: string;
  audioUrl: string;
  channelTitle?: string;
  channelArtwork?: string;
};

type SelectedPodcastChannel = {
  title?: string;
  artworkUrl?: string;
};

type PodcastMessages = {
  DASHBOARD_TITLE: string;
  ACTION_SEARCH: string;
  DASHBOARD_COMMUNITY: string;
  DASHBOARD_EDITOR_PICKS: string;
  DASHBOARD_VIEW_ALL: string;
  HISTORY_TITLE: string;
};

type NavigateFn = ReturnType<typeof useLocalizedNavigate>;

const resolveLabel = (
  labels: Labels,
  paths: readonly (readonly string[])[],
  fallback: string
): string => {
  for (const path of paths) {
    const value = getLabel(labels, path);
    if (value) return value;
  }
  return fallback;
};

const channelArtwork = (
  channel?: Partial<PodcastChannel> | null,
  fallback = 'https://placehold.co/220x220'
) => channel?.artworkUrl || channel?.artwork || fallback;

const HorizontalScrollButtons = ({
  canLeft,
  canRight,
  onLeft,
  onRight,
}: {
  canLeft: boolean;
  canRight: boolean;
  onLeft: () => void;
  onRight: () => void;
}) => (
  <>
    {canLeft && (
      <button
        type="button"
        onClick={onLeft}
        className="absolute -left-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-k-card border border-k-line shadow-k-sh-sm flex items-center justify-center text-k-ink hover:bg-k-bg2 transition-all hover:scale-110 active:scale-95"
      >
        <ChevronLeft size={20} />
      </button>
    )}
    {canRight && (
      <button
        type="button"
        onClick={onRight}
        className="absolute -right-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-k-card border border-k-line shadow-k-sh-sm flex items-center justify-center text-k-ink hover:bg-k-bg2 transition-all hover:scale-110 active:scale-95"
      >
        <ChevronRight size={20} />
      </button>
    )}
  </>
);

const SubscriptionChannelCard = ({
  channel,
  navigate,
  currentPath,
}: {
  channel: PodcastChannel;
  navigate: NavigateFn;
  currentPath: string;
}) => {
  return (
    <div
      onClick={() =>
        navigate(buildPodcastChannelPath(channel, currentPath), { state: { channel } })
      }
      className="min-w-[180px] max-w-[180px] group cursor-pointer"
    >
      <div className="relative aspect-square rounded-2xl overflow-hidden mb-3 shadow-k-sh transition-transform duration-500 group-hover:scale-105">
        <img
          src={channelArtwork(channel)}
          alt={channel.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <Play
            size={32}
            className="text-white opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100 fill-current"
          />
        </div>
      </div>
      <h4 className="font-extrabold text-[14px] text-k-ink line-clamp-1 group-hover:text-k-crimson transition-colors">
        {channel.title}
      </h4>
      <p className="text-[11px] font-bold text-k-sub mt-0.5 line-clamp-1">{channel.author}</p>
    </div>
  );
};

export const DesktopPodcastHubPage = ({
  navigate,
  backPath,
  labels,
  podcastMsgs,
  searchTerm,
  setSearchTerm,
  handleSearch,
  lastPlayed,
  featuredChannel,
  user,
  subscriptionsLoading,
  subscriptions,
  subscriptionsRef,
  subscriptionsCanLeft,
  subscriptionsCanRight,
  scrollSubscriptions,
  activeTab,
  setActiveTab,
  displayedTrending,
  activeLoading,
  trendingRef,
  trendingCanLeft,
  trendingCanRight,
  scrollTrending,
  history,
  historyRef,
  historyCanLeft,
  historyCanRight,
  scrollHistory,
  language,
  currentPath,
}: {
  navigate: NavigateFn;
  backPath: string;
  labels: Labels;
  podcastMsgs: PodcastMessages;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  handleSearch: (e: React.FormEvent) => void;
  lastPlayed: HistoryItem | null;
  featuredChannel: PodcastChannel | null;
  user: unknown;
  subscriptionsLoading: boolean;
  subscriptions: PodcastChannel[];
  subscriptionsRef: React.RefObject<HTMLDivElement | null>;
  subscriptionsCanLeft: boolean;
  subscriptionsCanRight: boolean;
  scrollSubscriptions: (direction: 'left' | 'right') => void;
  activeTab: 'community' | 'weekly';
  setActiveTab: (tab: 'community' | 'weekly') => void;
  displayedTrending: PodcastChannel[];
  activeLoading: boolean;
  trendingRef: React.RefObject<HTMLDivElement | null>;
  trendingCanLeft: boolean;
  trendingCanRight: boolean;
  scrollTrending: (direction: 'left' | 'right') => void;
  history: HistoryItem[];
  historyRef: React.RefObject<HTMLDivElement | null>;
  historyCanLeft: boolean;
  historyCanRight: boolean;
  scrollHistory: (direction: 'left' | 'right') => void;
  language: Language;
  currentPath: string;
}) => {
  const [selectedEpisode, setSelectedEpisode] = React.useState<SelectedPodcastEpisode | null>(null);
  const [selectedChannel, setSelectedChannel] = React.useState<SelectedPodcastChannel | null>(null);

  const handleSelectEpisode = (ep: SelectedPodcastEpisode, chan?: SelectedPodcastChannel) => {
    setSelectedEpisode(ep);
    if (chan) setSelectedChannel(chan);
  };

  return (
    <div className="min-h-screen bg-k-bg font-sans pb-32">
      <div className="max-w-7xl mx-auto px-10 py-12 space-y-12">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate(backPath)}
              className="w-11 h-11 rounded-xl bg-k-card border border-k-line flex items-center justify-center text-k-ink shadow-k-sh-sm hover:bg-k-bg2 transition-all hover:scale-105 active:scale-95"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-baseline gap-3">
                <span className="font-k-serif text-[28px] font-medium text-k-crimson">話</span>
                <h1 className="text-[24px] font-extrabold tracking-tight text-k-ink">
                  {podcastMsgs.DASHBOARD_TITLE}
                </h1>
              </div>
              <p className="text-[13px] font-bold text-k-sub mt-0.5">
                {resolveLabel(
                  labels,
                  [['dashboard', 'podcast', 'headerSubtitle']],
                  '韓語播客 · 聽力訓練'
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <form onSubmit={handleSearch} className="relative group">
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder={podcastMsgs.ACTION_SEARCH}
                className="w-[280px] h-11 rounded-xl bg-k-card border border-k-line px-10 text-[13px] font-bold text-k-ink focus:border-k-crimson focus:ring-1 focus:ring-k-crimson outline-none shadow-k-sh-sm transition-all"
              />
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-k-sub group-focus-within:text-k-crimson transition-colors"
              />
            </form>
          </div>
        </div>

        {/* Hero Section */}
        {lastPlayed || featuredChannel ? (
          <section>
            <DesktopCard
              pad={0}
              className="relative min-h-[220px] group overflow-hidden bg-k-card border border-transparent hover:border-k-line transition-all hover:shadow-k-sh-lg cursor-pointer flex flex-col md:flex-row"
              onClick={() => {
                if (lastPlayed) {
                  handleSelectEpisode(
                    {
                      guid: lastPlayed.episodeGuid,
                      title: lastPlayed.episodeTitle,
                      audioUrl: lastPlayed.episodeUrl || '',
                      channelTitle: lastPlayed.channelName,
                      channelArtwork: lastPlayed.channelImage,
                    },
                    {
                      title: lastPlayed.channelName,
                      artworkUrl: lastPlayed.channelImage,
                    }
                  );
                } else if (featuredChannel) {
                  navigate(buildPodcastChannelPath(featuredChannel, currentPath), {
                    state: { channel: featuredChannel },
                  });
                }
              }}
            >
              <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-k-crimson/5 to-transparent pointer-events-none" />
              <div className="relative w-full md:w-[220px] aspect-square overflow-hidden shrink-0">
                <img
                  src={
                    lastPlayed
                      ? lastPlayed.channelImage || 'https://placehold.co/400x400'
                      : channelArtwork(featuredChannel)
                  }
                  className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                  alt="cover"
                />
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
              </div>
              <div className="p-8 flex-1 flex flex-col justify-center relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <DesignChip tone={lastPlayed ? 'crimson' : 'butter'} size="sm">
                    {lastPlayed
                      ? labels.dashboard?.podcast?.continueListening || 'CONTINUE LISTENING'
                      : labels.dashboard?.podcast?.featured || 'FEATURED PODCAST'}
                  </DesignChip>
                </div>
                <h2 className="text-[32px] font-black tracking-tight text-k-ink leading-tight mb-2 line-clamp-1">
                  {lastPlayed ? lastPlayed.episodeTitle : featuredChannel?.title}
                </h2>
                <p className="text-[15px] font-bold text-k-sub mb-6">
                  {lastPlayed ? lastPlayed.channelName : featuredChannel?.author}
                </p>
                {lastPlayed && (
                  <div className="w-full max-w-sm h-1.5 bg-k-bg2 rounded-full overflow-hidden">
                    <div className="h-full bg-k-crimson" style={{ width: '45%' }} />
                  </div>
                )}
              </div>
              <div className="absolute right-10 bottom-10 w-14 h-14 rounded-full bg-k-ink text-k-bg flex items-center justify-center opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all shadow-xl">
                <Play size={24} fill="currentColor" className="ml-1" />
              </div>
            </DesktopCard>
          </section>
        ) : null}

        {/* Subscriptions */}
        {user ? (
          <section className="space-y-4">
            <SectionHead
              kanji="庫"
              title={resolveLabel(labels, [['dashboard', 'podcast', 'mySubs']], 'My Subscriptions')}
              action={subscriptions.length > 5 ? podcastMsgs.DASHBOARD_VIEW_ALL : undefined}
            />
            {subscriptionsLoading ? (
              <div className="flex gap-6 overflow-hidden">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="min-w-[180px] space-y-3">
                    <div className="aspect-square rounded-2xl bg-k-bg2 animate-pulse" />
                    <div className="h-4 w-3/4 bg-k-bg2 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : subscriptions.length === 0 ? (
              <DesktopCard className="text-center py-12 bg-k-bg2/50 border border-dashed border-k-line">
                <p className="text-[14px] font-bold text-k-sub">
                  {resolveLabel(
                    labels,
                    [['dashboard', 'podcast', 'msg', 'EMPTY_SUBSCRIPTIONS']],
                    'No subscriptions yet'
                  )}
                </p>
              </DesktopCard>
            ) : (
              <div className="relative group/scroll">
                <div
                  ref={subscriptionsRef}
                  className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide snap-x"
                >
                  {subscriptions.map(channel => (
                    <SubscriptionChannelCard
                      key={channel.itunesId || channel.id || channel._id || channel.title}
                      channel={channel}
                      navigate={navigate}
                      currentPath={currentPath}
                    />
                  ))}
                </div>
                <HorizontalScrollButtons
                  canLeft={subscriptionsCanLeft}
                  canRight={subscriptionsCanRight}
                  onLeft={() => scrollSubscriptions('left')}
                  onRight={() => scrollSubscriptions('right')}
                />
              </div>
            )}
          </section>
        ) : null}

        {/* Trending / Picks */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <SectionHead
              kanji="熱"
              title={
                activeTab === 'community'
                  ? podcastMsgs.DASHBOARD_COMMUNITY
                  : podcastMsgs.DASHBOARD_EDITOR_PICKS
              }
            />
            <div className="flex gap-1.5 p-1 bg-k-bg2 rounded-xl">
              <button
                onClick={() => setActiveTab('community')}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-[11px] font-extrabold transition-all',
                  activeTab === 'community'
                    ? 'bg-k-card text-k-crimson shadow-sm'
                    : 'text-k-sub hover:text-k-ink'
                )}
              >
                {podcastMsgs.DASHBOARD_COMMUNITY}
              </button>
              <button
                onClick={() => setActiveTab('weekly')}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-[11px] font-extrabold transition-all',
                  activeTab === 'weekly'
                    ? 'bg-k-card text-k-crimson shadow-sm'
                    : 'text-k-sub hover:text-k-ink'
                )}
              >
                {podcastMsgs.DASHBOARD_EDITOR_PICKS}
              </button>
            </div>
          </div>

          <div className="relative group/scroll">
            <div
              ref={trendingRef}
              className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide snap-x"
            >
              {displayedTrending.slice(0, 15).map((pod, idx) => (
                <div
                  key={pod.id || pod.title || idx}
                  onClick={() =>
                    navigate(buildPodcastChannelPath(pod, currentPath), { state: { channel: pod } })
                  }
                  className="min-w-[200px] max-w-[200px] group cursor-pointer"
                >
                  <div className="relative aspect-square rounded-2xl overflow-hidden mb-3 shadow-k-sh transition-all group-hover:shadow-k-sh-lg">
                    <img
                      src={channelArtwork(pod)}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      alt={pod.title}
                    />
                    <div className="absolute top-2 left-2 w-7 h-7 rounded-lg bg-black/40 backdrop-blur-md flex items-center justify-center text-[11px] font-black text-white border border-white/20">
                      {idx + 1}
                    </div>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                      <Play
                        size={36}
                        className="text-white opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 transition-all fill-current"
                      />
                    </div>
                  </div>
                  <h4 className="font-extrabold text-[15px] text-k-ink line-clamp-1 group-hover:text-k-crimson transition-colors">
                    {pod.title}
                  </h4>
                  <p className="text-[12px] font-bold text-k-sub mt-0.5 line-clamp-1">
                    {pod.author}
                  </p>
                </div>
              ))}

              {activeLoading &&
                [1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="min-w-[200px] space-y-3">
                    <div className="aspect-square rounded-2xl bg-k-bg2 animate-pulse" />
                    <div className="h-5 w-3/4 bg-k-bg2 rounded animate-pulse" />
                  </div>
                ))}
            </div>
            <HorizontalScrollButtons
              canLeft={trendingCanLeft}
              canRight={trendingCanRight}
              onLeft={() => scrollTrending('left')}
              onRight={() => scrollTrending('right')}
            />
          </div>
        </section>

        {/* History */}
        {history.length > 0 && (
          <section className="space-y-4">
            <SectionHead kanji="錄" title={podcastMsgs.HISTORY_TITLE} />
            <div className="relative group/scroll">
              <div
                ref={historyRef}
                className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x"
              >
                {history.map(record => (
                  <DesktopCard
                    key={record.id}
                    pad={12}
                    onClick={() =>
                      handleSelectEpisode(
                        {
                          guid: record.episodeGuid,
                          title: record.episodeTitle,
                          audioUrl: record.episodeUrl || '',
                          channelTitle: record.channelName,
                          channelArtwork: record.channelImage,
                        },
                        {
                          title: record.channelName,
                          artworkUrl: record.channelImage,
                        }
                      )
                    }
                    className="min-w-[300px] max-w-[300px] flex items-center gap-4 bg-k-card border border-transparent hover:border-k-line transition-all hover:shadow-k-sh-sm cursor-pointer group"
                  >
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden shrink-0 shadow-sm">
                      <img
                        src={record.channelImage || 'https://placehold.co/100x100'}
                        className="w-full h-full object-cover"
                        alt="cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                        <Play
                          size={16}
                          className="text-white opacity-0 group-hover:opacity-100 transition-all fill-current"
                        />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-[13px] font-extrabold text-k-ink line-clamp-1 mb-0.5 group-hover:text-k-crimson transition-colors">
                        {record.episodeTitle}
                      </h4>
                      <p className="text-[11px] font-bold text-k-sub truncate">
                        {record.channelName} •{' '}
                        {formatSafeDateLabel(
                          record.playedAt,
                          localeFromLanguage(language),
                          resolveLabel(labels, [['common', 'recently']], 'Recently')
                        )}
                      </p>
                    </div>
                  </DesktopCard>
                ))}
              </div>
              <HorizontalScrollButtons
                canLeft={historyCanLeft}
                canRight={historyCanRight}
                onLeft={() => scrollHistory('left')}
                onRight={() => scrollHistory('right')}
              />
            </div>
          </section>
        )}
      </div>

      {/* Global Player Drawer for Dashboard */}
      <Sheet open={!!selectedEpisode} onOpenChange={open => !open && setSelectedEpisode(null)}>
        <SheetContent className="fixed inset-y-0 right-0 w-[500px] xl:w-[600px] p-0 border-l border-k-line shadow-2xl">
          <SheetTitle className="sr-only">Podcast Player</SheetTitle>
          {selectedEpisode && (
            <PodcastPlayerModule
              initialEpisode={selectedEpisode}
              initialChannel={selectedChannel ?? undefined}
              isEmbedded={true}
              onBack={() => setSelectedEpisode(null)}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default DesktopPodcastHubPage;
