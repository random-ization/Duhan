
import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Clapperboard, Headphones, Play, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { qRef, NoArgs } from '../utils/convexRefs';
import { useQuery } from 'convex/react';
import { useIsMobile } from '../hooks/useIsMobile';
import { MobileMediaPage } from '../components/mobile/MobileMediaPage';

type SegmentTab = 'videos' | 'podcasts';

type VideoCard = {
  _id: string;
  title: string;
  thumbnailUrl?: string | null;
  views: number;
};

type PodcastChannel = {
  _id: string;
  title: string;
  artwork?: string;
  artworkUrl?: string;
  author?: string;
};

type TrendingResult = {
  internal: PodcastChannel[];
  external: PodcastChannel[];
};

export default function MediaHubPage() {
  const navigate = useLocalizedNavigate();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab: SegmentTab = searchParams.get('tab') === 'podcasts' ? 'podcasts' : 'videos';
  const isMobile = useIsMobile();

  const videos = useQuery(
    qRef<{ level?: string }, VideoCard[]>('videos:list'),
    activeTab === 'videos' ? {} : 'skip'
  );
  const trending = useQuery(
    qRef<NoArgs, TrendingResult>('podcasts:getTrending'),
    activeTab === 'podcasts' ? {} : 'skip'
  );

  const podcastCards = useMemo(
    () => [...(trending?.internal || []), ...(trending?.external || [])].slice(0, 8),
    [trending]
  );

  if (isMobile) {
    return <MobileMediaPage />;
  }

  return (
    <section className="mx-auto w-full max-w-6xl space-y-4">
      <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'videos' })}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition ${activeTab === 'videos' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
        >
          <Clapperboard size={16} />
          {t('nav.videos', { defaultValue: 'Videos' })}
        </button>
        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'podcasts' })}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition ${activeTab === 'podcasts'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-50'
            }`}
        >
          <Headphones size={16} />
          {t('nav.podcasts', { defaultValue: 'Podcasts' })}
        </button>
      </div>

      {activeTab === 'videos' ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(videos || []).slice(0, 8).map(video => (
            <button
              key={video._id}
              type="button"
              onClick={() => navigate(`/video/${video._id}`)}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-left transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="relative aspect-video bg-slate-100">
                {video.thumbnailUrl ? (
                  <img src={video.thumbnailUrl} alt={video.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Clapperboard className="text-slate-300" />
                  </div>
                )}
                <div className="absolute inset-0 grid place-items-center bg-black/0 transition hover:bg-black/20">
                  <div className="rounded-full bg-white/95 p-2">
                    <Play size={16} className="text-slate-900" />
                  </div>
                </div>
              </div>
              <div className="p-4">
                <h2 className="line-clamp-2 text-sm font-black text-slate-900">{video.title}</h2>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                  {video.views} {t('dashboard.video.views', { defaultValue: 'views' })}
                </p>
              </div>
            </button>
          ))}
          <button
            type="button"
            onClick={() => navigate('/videos')}
            className="col-span-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            {t('common.viewAll', { defaultValue: 'View all videos' })}
            <ChevronRight size={16} />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {podcastCards.map(channel => (
            <button
              key={channel._id}
              type="button"
              onClick={() => navigate('/podcasts/channel', { state: { channel } })}
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="h-14 w-14 overflow-hidden rounded-xl bg-slate-100">
                {channel.artwork || channel.artworkUrl ? (
                  <img
                    src={channel.artwork || channel.artworkUrl}
                    alt={channel.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full w-full place-items-center">
                    <Headphones size={18} className="text-slate-300" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-sm font-black text-slate-900">{channel.title}</h2>
                <p className="truncate text-xs font-semibold text-slate-500">
                  {channel.author || t('dashboard.podcast.community', { defaultValue: 'Trending' })}
                </p>
              </div>
            </button>
          ))}
          <button
            type="button"
            onClick={() => navigate('/podcasts')}
            className="col-span-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
          >
            {t('common.viewAll', { defaultValue: 'View all podcasts' })}
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </section>
  );
}
